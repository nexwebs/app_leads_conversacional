import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          background: #080c10;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .login-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }

        .orb-1 {
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, #10b981, transparent 70%);
          top: -120px;
          right: -80px;
          animation: drift1 14s ease-in-out infinite alternate;
        }

        .orb-2 {
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, #0d9488, transparent 70%);
          bottom: -80px;
          left: -60px;
          animation: drift2 18s ease-in-out infinite alternate;
        }

        .orb-3 {
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, #064e3b, transparent 70%);
          top: 40%;
          left: 30%;
          opacity: 0.12;
          animation: drift3 22s ease-in-out infinite alternate;
        }

        @keyframes drift1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-40px, 40px) scale(1.08); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, -30px) scale(1.05); }
        }
        @keyframes drift3 {
          from { transform: translate(0, 0); }
          to   { transform: translate(-20px, 20px); }
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .login-panel {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .login-panel.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 20px;
          padding: 48px 44px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(16, 185, 129, 0.06),
            0 40px 80px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .brand {
          margin-bottom: 40px;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .brand-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #10b981, #0d9488);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
          flex-shrink: 0;
        }

        .brand-name {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: #f0fdf4;
          letter-spacing: -0.3px;
          line-height: 1;
        }

        .brand-divider {
          width: 32px;
          height: 1px;
          background: linear-gradient(to right, #10b981, transparent);
          margin-bottom: 20px;
        }

        .brand-headline {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          font-weight: 400;
          color: #ecfdf5;
          line-height: 1.25;
          letter-spacing: -0.5px;
          margin: 0 0 8px;
        }

        .brand-headline em {
          font-style: italic;
          color: #34d399;
        }

        .brand-sub {
          font-size: 13.5px;
          color: rgba(167, 243, 208, 0.45);
          font-weight: 300;
          letter-spacing: 0.1px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .field {
          position: relative;
        }

        .field-label {
          display: block;
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(167, 243, 208, 0.5);
          margin-bottom: 8px;
          transition: color 0.2s;
        }

        .field.is-focused .field-label {
          color: #34d399;
        }

        .field-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #f0fdf4;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input::placeholder {
          color: rgba(167, 243, 208, 0.2);
        }

        .field-input:focus {
          border-color: rgba(52, 211, 153, 0.4);
          background: rgba(52, 211, 153, 0.04);
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.08);
        }

        .field-input.has-toggle {
          padding-right: 44px;
        }

        .toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: rgba(167, 243, 208, 0.35);
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .toggle-btn:hover {
          color: rgba(167, 243, 208, 0.7);
        }

        .error-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 20px;
          animation: shake 0.35s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }

        .error-dot {
          width: 6px;
          height: 6px;
          background: #f87171;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .error-text {
          font-size: 13px;
          color: #fca5a5;
          font-weight: 400;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          letter-spacing: 0.2px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0);
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled)::before {
          background: rgba(255, 255, 255, 0.07);
        }

        .submit-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .hint {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .hint-label {
          font-size: 11.5px;
          letter-spacing: 0.5px;
          color: rgba(167, 243, 208, 0.25);
          text-transform: uppercase;
          font-weight: 500;
        }

        .hint-code {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px;
          color: rgba(52, 211, 153, 0.55);
          background: rgba(52, 211, 153, 0.06);
          padding: 3px 9px;
          border-radius: 5px;
          border: 1px solid rgba(52, 211, 153, 0.1);
        }
      `}</style>

      <div className="login-root">
        <div className="login-canvas">
          <div className="grid-overlay" />
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <div className={`login-panel ${mounted ? 'visible' : ''}`}>
          <div className="card">
            <div className="brand">
              <div className="brand-mark">
                <div className="brand-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="brand-name">NexWebs</span>
              </div>
              <div className="brand-divider" />
              <h1 className="brand-headline">
                Bienvenido <em>de vuelta</em>
              </h1>
              <p className="brand-sub">CRM de Gestión de Leads</p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-bar">
                  <div className="error-dot" />
                  <span className="error-text">{error}</span>
                </div>
              )}

              <div className="field-group">
                <div className={`field ${focused === 'email' ? 'is-focused' : ''}`}>
                  <label className="field-label">Correo electrónico</label>
                  <div className="field-wrap">
                    <input
                      ref={emailRef}
                      type="email"
                      className="field-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@empresa.com"
                      required
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>

                <div className={`field ${focused === 'password' ? 'is-focused' : ''}`}>
                  <label className="field-label">Contraseña</label>
                  <div className="field-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="field-input has-toggle"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => setShowPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                <span className="btn-content">
                  {loading && <span className="spinner" />}
                  {loading ? 'Verificando...' : 'Iniciar sesión'}
                </span>
              </button>
            </form>

            <div className="hint">
              <span className="hint-label">Demo</span>
              <span className="hint-code">admin@empresa.com / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}