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
    <section id="contacto" className="py-16 md:py-24 px-6 bg-slate-50 relative overflow-hidden">
      {/* Elementos decorativos con animación */}
      <div className="absolute left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-cyan-400/20 rounded-full animate-ping" />
      <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-blue-400/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      
      <div className="w-full max-w-[700px] mx-auto relative">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">¿Listo para dar el siguiente paso?</h2>
          <p className="text-slate-600 text-lg">Déjanos tus datos y un asesor te contactará en menos de 24 horas</p>
          <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full mx-auto mt-4" />
        </div>

        <div className={`flex items-start gap-4 p-5 rounded-xl mb-8 ${showSuccess ? 'bg-green-50 border border-green-500 text-green-600' : 'hidden'}`}>
          <svg className="flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <strong className="block mb-0.5">¡Enviado con éxito!</strong>
            <p className="text-sm opacity-90 m-0">Te contactaremos muy pronto.</p>
          </div>
        </div>

        <div className={`flex items-start gap-4 p-5 rounded-xl mb-8 ${showError ? 'bg-red-50 border border-red-500 text-red-600' : 'hidden'}`}>
          <svg className="flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div>
            <strong className="block mb-0.5">Error al enviar</strong>
            <p className="text-sm opacity-90 m-0">{errorText}</p>
          </div>
        </div>

        <form className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-xl shadow-blue-500/10 relative overflow-hidden" onSubmit={handleSubmit}>
          {/* Decoración superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label htmlFor="name" className="block font-semibold text-sm mb-2">Nombre completo <span className="text-red-500">*</span></label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input 
                    type="text" 
                    id="name" 
                    name="nombre_completo" 
                    placeholder="John Doe" 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl bg-white text-base font-sans transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label htmlFor="email" className="block font-semibold text-sm mb-2">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="jon@empresa.com" 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl bg-white text-base font-sans transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className="block font-semibold text-sm mb-2">Teléfono</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input 
                  type="tel" 
                  id="telefono" 
                  name="telefono" 
                  placeholder="+51 999 999 999" 
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl bg-white text-base font-sans transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block font-semibold text-sm mb-2">Mensaje <span className="text-red-500">*</span></label>
              <div className="relative">
                <svg className="absolute left-4 top-4 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <textarea 
                  id="message" 
                  name="message" 
                  rows={5} 
                  placeholder="Cuéntanos cómo podemos ayudarte..." 
                  required
                  className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl bg-white text-base font-sans transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 resize-vertical min-h-[130px]"
                ></textarea>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 py-4 bg-blue-600 text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-65 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className={`flex items-center gap-2 ${loading ? 'hidden' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Enviar mensaje
            </span>
            <span className={`flex items-center gap-2 ${loading ? '' : 'hidden'}`}>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
              </svg>
              Enviando...
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
