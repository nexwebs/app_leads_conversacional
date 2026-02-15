import { useState, useEffect, useRef } from 'react';
import { WS_URL } from '../config/env';
import './ChatWidget.css';

interface Message {
  text: string;
  role: 'user' | 'assistant' | 'system';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateSessionId = () => {
    return 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const renderMessage = (text: string, role: Message['role']) => {
    setMessages(prev => [...prev, { text, role }]);

    if (role === 'assistant' && !isOpen) {
      setShowNotification(true);
    }
  };

  const connectWebSocket = () => {
    if (isClosed) {
      renderMessage('Esta conversación ha finalizado. Recarga la página para iniciar una nueva.', 'system');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = new WebSocket(`${WS_URL}/api/v1/chat/ws/${sessionIdRef.current}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (!isClosed && reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isClosed) connectWebSocket();
          }, delay);
        } else if (!isClosed) {
          setConnectionError('Conexión perdida');
        }
        
        if (isClosed) {
          setInputValue('Conversación finalizada');
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError('Error de conexión');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') return;

          if (data.type === 'greeting') {
            renderMessage(data.data?.response || '¡Hola! ¿En qué puedo ayudarte?', 'assistant');
            return;
          }

          if (data.type === 'message') {
            renderMessage(data.data?.response || 'Mensaje recibido', 'assistant');
            
            if (data.data?.cerrada) {
              setIsClosed(true);
              terminateConnection();
            }
            return;
          }

          if (data.type === 'close') {
            setIsClosed(true);
            if (data.data?.message) {
              renderMessage(data.data.message, 'system');
            }
            terminateConnection();
            return;
          }

          if (data.type === 'error') {
            renderMessage(data.message || 'Ha ocurrido un error', 'system');
            return;
          }

          if (data.type === 'proactive') {
            renderMessage(data.data?.response || '¿Hay algo en lo que pueda ayudarte?', 'assistant');
            return;
          }
        } catch {
          renderMessage(event.data, 'assistant');
        }
      };
    } catch {
      setConnectionError('No se pudo conectar');
      setIsConnecting(false);
    }
  };

  const terminateConnection = () => {
    setIsConnected(false);
    setInputValue('Conversación finalizada');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const transmitMessage = (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      renderMessage('Error: No conectado', 'system');
      return;
    }

    if (isClosed) {
      renderMessage('La conversación ha finalizado', 'system');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({ message }));
      renderMessage(message, 'user');
      setInputValue('');
    } catch {
      renderMessage('Error al enviar mensaje', 'system');
    }
  };

  const handleToggle = () => {
    if (isClosed) {
      if (confirm('La conversación anterior ha finalizado. ¿Deseas iniciar una nueva?')) {
        sessionIdRef.current = null;
        setIsClosed(false);
        setMessages([]);
        setInputValue('');
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      } else {
        return;
      }
    }

    setIsOpen(!isOpen);
    setShowNotification(false);

    if (!isClosed && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      connectWebSocket();
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      transmitMessage(inputValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const handleOpenChatWithProduct = (e: CustomEvent) => {
      const { producto, paquete } = e.detail;
      setIsOpen(true);
      reconnectAttemptsRef.current = 0;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }

      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const msg = paquete
            ? `Estoy interesado en ${producto} - Plan ${paquete}`
            : `Estoy interesado en ${producto}`;
          transmitMessage(msg);
        }
      }, 1500);
    };

    window.addEventListener('openChatWithProduct', handleOpenChatWithProduct as EventListener);
    return () => window.removeEventListener('openChatWithProduct', handleOpenChatWithProduct as EventListener);
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div id="chatWidget">
      <button
        id="chatToggle"
        className={`chat-toggle ${showNotification ? 'has-notification' : ''}`}
        onClick={handleToggle}
        aria-label="Abrir chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {showNotification && <span className="notification-badge">1</span>}
      </button>

      <div id="chatWindow" className={`chat-window ${isOpen ? '' : 'hidden'}`}>
        <div className="chat-header">
          <div className="header-info">
            <div className="avatar-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <h3>Asistente de Ventas</h3>
              <div className="chat-status">
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                <span className="status-text">
                  {isConnecting ? 'Conectando...' : isConnected ? 'En línea' : isClosed ? 'Finalizado' : connectionError || 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
          <button id="chatClose" className="close-btn" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">×</button>
        </div>

        <div id="chatMessages" className="chat-messages">
          {!isConnected && messages.length === 0 && !isConnecting && (
            <div className="welcome-message">
              <div className="welcome-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h4>¡Hola! 👋</h4>
              <p>¿En qué puedo ayudarte hoy?</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role === 'assistant' ? 'assistant-wrapper' : msg.role === 'user' ? 'user-wrapper' : ''}`}>
              {(msg.role === 'assistant' || msg.role === 'user') && (
                <div className="message-avatar">
                  {msg.role === 'assistant' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
              )}
              <div className={`message ${msg.role}-message`}>{msg.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div id="chatInputArea" className="chat-form">
          <input
            type="text"
            id="chatInput"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isClosed ? 'Conversación finalizada' : isConnecting ? 'Conectando...' : 'Escribe tu mensaje...'}
            disabled={!isConnected || isClosed}
            aria-label="Mensaje de chat"
          />
          <button type="button" id="sendButton" onClick={handleSend} disabled={!isConnected || isClosed || !inputValue.trim()} aria-label="Enviar mensaje">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
