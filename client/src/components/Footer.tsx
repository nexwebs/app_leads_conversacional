interface FooterProps {
  brandName?: string;
}

export default function Footer({ brandName = "NexWebs" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="brand-logo">
            <img
              src="/favicon.svg"
              alt="NexWebs logo"
              className="logo-icon"
              width={32}
              height={32}
            />
            <h1 className="logo">{brandName}</h1>
          </div>
          
          <p className="brand-description">
            Automatización inteligente de ventas con IA. Transforma tu negocio con soluciones que escalan.
          </p>
          <div className="social-links">
            <a href="https://www.linkedin.com/in/claudio-quispe/" aria-label="LinkedIn" className="social-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://x.com/claudiodevs" aria-label="Twitter" className="social-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="social-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Productos</h4>
            <ul>
              <li><a href="#productos">CRM + Facturación</a></li>
              <li><a href="#productos">Agente IA</a></li>
              <li><a href="#productos">WhatsApp Bot</a></li>
              <li><a href="#productos">Automatización</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#beneficios">Beneficios</a></li>
              <li><a href="#contacto">Contáctanos</a></li>
              <li><a href="#">Términos</a></li>
              <li><a href="#">Privacidad</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Soporte</h4>
            <ul>
              <li><a href="#contacto">Centro de Ayuda</a></li>
              <li><a href="#">Documentación</a></li>
              <li><a href="#">API</a></li>
              <li><a href="#">Estado</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container">
          <p>&copy; {currentYear} {brandName}. Todos los derechos reservados.</p>
          <p className="footer-tagline">Hecho con IA para potenciar tu negocio</p>
        </div>
      </div>

      <style>{`
        .footer {
          background: linear-gradient(
            180deg,
            #11162e 0%,
            #0f1430 40%,
            #0c1126 70%,
            #0a0f1e 100%
          );
          color: var(--text-secondary);
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem 2rem;
          display: grid;
          grid-template-columns: 1.5fr 2fr;
          gap: 4rem;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .brand-logo svg {
          color: var(--primary);
        }

        .brand-logo h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .brand-description {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-muted);
          max-width: 320px;
        }

        .social-links {
          display: flex;
          gap: 1rem;
        }

        .social-link {
          width: 40px;
          height: 40px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: var(--transition);
          text-decoration: none;
        }

        .social-link:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          transform: translateY(-2px);
        }

        .footer-links {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }

        .footer-column h4 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .footer-column ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .footer-column a {
          color: var(--text-muted);
          font-size: 0.9375rem;
          transition: var(--transition);
          display: inline-block;
          text-decoration: none;
        }

        .footer-column a:hover {
          color: var(--primary);
          transform: translateX(4px);
        }

        .footer-bottom {
          border-top: 1px solid var(--border);
          padding: 2rem 0;
          background: #060b16;
        }

        .footer-bottom .footer-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          gap: 1rem;
        }

        .footer-bottom p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .footer-tagline {
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 3rem;
            padding: 3rem 1.5rem 2rem;
          }

          .footer-links {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .footer-bottom .footer-container {
            flex-direction: column;
            text-align: center;
            padding: 1.5rem;
          }

          .brand-description {
            max-width: 100%;
          }
        }
      `}</style>
    </footer>
  );
}
