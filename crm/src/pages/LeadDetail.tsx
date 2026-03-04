import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { leadsService } from '../services/api';

interface LeadInfo {
  nombre: string | null;
  email: string | null;
  empresa: string | null;
  estado: string;
  score: number;
}

interface Mensaje {
  id: string;
  rol: string;
  contenido: string;
  created_at: string;
}

interface Conversacion {
  id: string;
  session_id: string;
  canal: string;
  estado: string;
  probabilidad_compra: number;
  inicio: string | null;
  fin: string | null;
  total_mensajes: number;
  senales_interes: unknown[];
  senales_rechazo: unknown[];
  mensajes: Mensaje[];
}

interface LeadDetailData {
  lead_id: string;
  lead_info: LeadInfo;
  total_conversaciones: number;
  conversaciones: Conversacion[];
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<LeadDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const result = await leadsService.getLeadConversations(id);
        setData(result);
        if (result.conversaciones.length > 0) {
          setSelectedConversation(result.conversaciones[0].id);
        }
      } catch (error) {
        console.error('Error fetching lead:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Lead no encontrado</p>
        <Link to="/dashboard/leads" className="text-blue-500 hover:underline mt-2 inline-block">
          Volver a Leads
        </Link>
      </div>
    );
  }

  const currentConv = data.conversaciones.find(c => c.id === selectedConversation);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      nuevo: 'bg-blue-100 text-blue-700',
      calificando: 'bg-amber-100 text-amber-700',
      calificado: 'bg-purple-100 text-purple-700',
      vendido: 'bg-emerald-100 text-emerald-700',
      descartado: 'bg-red-100 text-red-700',
    };
    return styles[estado] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/dashboard/leads" 
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
            {data.lead_info.nombre || 'Lead sin nombre'}
          </h1>
          <p className="text-slate-500 text-sm">Detalle del lead</p>
        </div>
      </div>

      {/* Mobile Tabs */}
            <div className="lg:hidden flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'bg-emerald-500 text-white' 
              : 'text-slate-600'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'info' 
              ? 'bg-emerald-500 text-white' 
              : 'text-slate-600'
          }`}
        >
          Info
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Chat Section - Full width on mobile, 2 cols on desktop */}
        <div className={`lg:col-span-2 ${activeTab === 'info' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Conversación</p>
                  <p className="text-sm text-slate-500">
                    {currentConv?.total_mensajes || 0} mensajes
                  </p>
                </div>
              </div>
              {currentConv && (
                <div className="text-right">
                  <p className="text-sm text-slate-500">Probabilidad</p>
                  <p className={`font-bold ${currentConv.probabilidad_compra >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {currentConv.probabilidad_compra}%
                  </p>
                </div>
              )}
            </div>

            {/* Conversation Selector */}
            {data.conversaciones.length > 1 && (
              <div className="p-3 border-b border-slate-100 overflow-x-auto flex gap-2">
                {data.conversaciones.map((conv, i) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedConversation === conv.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Chat {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="h-[400px] lg:h-[500px] overflow-y-auto p-4 space-y-4 bg-slate-50">
              {currentConv ? (
                currentConv.mensajes.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.rol === 'user' ? 'justify-start' : msg.rol === 'assistant' ? 'justify-end' : 'justify-center'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.rol === 'user'
                          ? 'bg-white border border-slate-200 text-slate-800'
                          : msg.rol === 'assistant'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                          : 'bg-amber-100 text-amber-800 text-xs'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.rol === 'user' ? 'Lead' : msg.rol === 'assistant' ? 'Agente IA' : 'Sistema'}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.contenido}</p>
                      <p className="text-xs mt-2 opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>Selecciona una conversación</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Info Section - Hidden on mobile when chat is active */}
        <div className={`${activeTab === 'chat' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">Información del Lead</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Nombre</p>
                  <p className="text-slate-800">{data.lead_info.nombre || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-slate-800">{data.lead_info.email || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Empresa</p>
                  <p className="text-slate-800">{data.lead_info.empresa || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium capitalize ${getEstadoBadge(data.lead_info.estado)}`}>
                    {data.lead_info.estado}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${data.lead_info.score >= 70 ? 'bg-emerald-500' : data.lead_info.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${data.lead_info.score}%` }}
                      />
                    </div>
                    <span className={`font-bold ${getScoreColor(data.lead_info.score)}`}>
                      {data.lead_info.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {currentConv && (
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">Métricas de Conversación</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">Señales de Interés</p>
                    <p className="text-xl font-bold text-emerald-500">
                      {currentConv.senales_interes?.length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">Señales de Rechazo</p>
                    <p className="text-xl font-bold text-red-500">
                      {currentConv.senales_rechazo?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
