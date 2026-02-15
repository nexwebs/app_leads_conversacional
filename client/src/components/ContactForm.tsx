import { useState } from 'react';
import type { FormEvent } from 'react';
import { API_URL } from '../config/env';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState('Por favor intenta de nuevo');

  const showMessage = (type: 'success' | 'error', msg?: string) => {
    setShowSuccess(false);
    setShowError(false);

    if (type === 'success') {
      setShowSuccess(true);
    } else {
      setErrorText(msg || 'Intenta nuevamente');
      setShowError(true);
    }

    setTimeout(() => {
      setShowSuccess(false);
      setShowError(false);
    }, 6000);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nombre_completo = formData.get('nombre_completo')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const telefono = formData.get('telefono')?.toString().trim() || null;
    const message = formData.get('message')?.toString().trim();

    if (!nombre_completo || !email || !message) {
      showMessage('error', 'Completa los campos obligatorios');
      return;
    }

    if (!isValidEmail(email)) {
      showMessage('error', 'Email inválido');
      return;
    }

    const leadData = {
      nombre_completo,
      email,
      telefono,
      empresa: null,
      origen: 'api',
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || 'directo',
      utm_campaign: 'contacto'
    };

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/leads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Error al enviar');

      showMessage('success');
      form.reset();

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openChatWithLead', {
          detail: { leadId: data.id, nombre: nombre_completo, mensaje: message }
        }));
      }, 1200);

    } catch (err: unknown) {
      const error = err as Error;
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="contact-section">
      <div className="container">
        <div className="section-header">
          <h2>¿Listo para dar el siguiente paso?</h2>
          <p className="section-subtitle">Déjanos tus datos y un asesor te contactará en menos de 24 horas</p>
        </div>

        <div id="successMessage" className={`message success ${showSuccess ? 'show' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <strong>¡Enviado con éxito!</strong>
            <p>Te contactaremos muy pronto.</p>
          </div>
        </div>

        <div id="errorMessage" className={`message error ${showError ? 'show' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div>
            <strong>Error al enviar</strong>
            <p id="errorText">{errorText}</p>
          </div>
        </div>

        <form id="contactForm" className="contact-form" onSubmit={handleSubmit}>
          <div className="form-flex">
            <div className="form-group">
              <label htmlFor="name">Nombre completo <span className="required">*</span></label>
              <div className="input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="name" name="nombre_completo" placeholder="John Doe" required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email <span className="required">*</span></label>
              <div className="input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" id="email" name="email" placeholder="jon@empresa.com" required />
              </div>
            </div>

            <div className="form-group full">
              <label htmlFor="telefono">Teléfono</label>
              <div className="input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input type="tel" id="telefono" name="telefono" placeholder="+51 999 999 999" />
              </div>
            </div>

            <div className="form-group full">
              <label htmlFor="message">Mensaje <span className="required">*</span></label>
              <div className="input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ top: '1rem' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <textarea id="message" name="message" rows={5} placeholder="Cuéntanos cómo podemos ayudarte..." required></textarea>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            <span className="btn-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Enviar mensaje
            </span>
            <span className="btn-loader" style={{ display: loading ? 'flex' : 'none' }}>
              <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
              </svg>
              Enviando...
            </span>
          </button>
        </form>
      </div>

      <style>{`
        .contact-section {
          padding: 4rem 1rem;
          background: var(--bg-primary);
        }

        .container {
          max-width: 720px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .section-header h2 {
          font-size: 2.125rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .section-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .message {
          display: none;
          flex-align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .message.show {
          display: flex;
        }

        .success { 
          background: rgba(16,185,129,0.1); 
          border: 1px solid var(--success); 
          color: var(--success); 
        }
        
        .error { 
          background: rgba(239,68,68,0.1); 
          border: 1px solid var(--error); 
          color: var(--error); 
        }

        .message svg {
          flex-shrink: 0;
        }

        .message strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .message p {
          margin: 0;
          font-size: 0.95rem;
          opacity: 0.9;
        }

        .contact-form {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 2rem 1.5rem;
          border: 1px solid var(--border);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .form-flex {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full { 
          flex: 1 1 100%; 
        }

        label {
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .required { 
          color: var(--error); 
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        input, textarea {
          width: 100%;
          padding: 0.9rem 1rem 0.9rem 3rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-primary);
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          color: var(--text-primary);
        }

        textarea {
          padding-top: 1rem;
          min-height: 130px;
          resize: vertical;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        ::placeholder { 
          color: var(--text-muted); 
          opacity: 0.7; 
        }

        .btn-submit {
          width: 100%;
          margin-top: 1rem;
          padding: 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.25s ease;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--primary-dark);
          transform: translateY(-2px);
        }

        .btn-submit:disabled { 
          opacity: 0.65; 
          cursor: not-allowed; 
        }

        .btn-content,
        .btn-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }

        .spinner { 
          animation: spin 1s linear infinite; 
        }

        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        @media (min-width: 640px) {
          .form-flex { 
            flex-direction: row; 
            flex-wrap: wrap; 
          }
          .form-group:not(.full) { 
            flex: 1 1 45%; 
          }
          .contact-form { 
            padding: 2.5rem; 
          }
        }

        @media (min-width: 768px) {
          .contact-section { 
            padding: 6rem 2rem; 
          }
        }

        @media (max-width: 639px) {
          .section-header h2 {
            font-size: 1.75rem;
          }
          
          .contact-form {
            padding: 1.5rem;
          }
        }
      `}</style>
    </section>
  );
}
