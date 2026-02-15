interface HeroProps {
  badge?: string;
  title?: string;
  highlight?: string;
  description: string;
  primaryCTA?: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  indicators?: Array<{
    value: string;
    label: string;
  }>;
}

export default function Hero({
  badge = "Automatización Inteligente",
  title = "Potencia tu Negocio con",
  highlight = "Inteligencia Artificial",
  description,
  primaryCTA = { text: "Explorar Productos", href: "#productos" },
  secondaryCTA = { text: "Contáctanos", href: "#contacto" },
  indicators = [
    { value: "24/7", label: "Atención Automática" },
    { value: "+300%", label: "Más Conversiones" },
    { value: "0", label: "Costos Ocultos" }
  ]
}: HeroProps) {
  return (
    <header id="inicio" className="hero">
      <div className="hero-background"></div>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <span className="hero-badge">{badge}</span>
        <h1>{title} <span className="highlight">{highlight}</span></h1>
        <p>{description}</p>
        <div className="cta-group">
          <a href={primaryCTA.href} className="cta-button primary">{primaryCTA.text}</a>
          <a href={secondaryCTA.href} className="cta-button secondary">{secondaryCTA.text}</a>
        </div>
        {indicators && indicators.length > 0 && (
          <div className="trust-indicators">
            {indicators.map(({ value, label }) => (
              <div className="indicator" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .hero {
          position: relative;
          text-align: center;
          padding: 6rem 2rem 5rem;
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          inset: 0;
          background-image: url('/image2.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(15, 23, 42, 0.85) 0%,
            rgba(15, 23, 42, 0.7) 50%,
            rgba(15, 23, 42, 0.85) 100%
          );
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-block;
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          color: var(--primary);
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .hero-content h1 {
          font-size: clamp(2.5rem, 6vw, 4rem);
          margin-bottom: 1.5rem;
          line-height: 1.15;
          color: white;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
        }

        .highlight {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-content p {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 2.5rem;
          line-height: 1.7;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        }

        .cta-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3.5rem;
        }

        .cta-button {
          padding: 1rem 2.5rem;
          border-radius: var(--radius);
          font-weight: 600;
          font-size: 1rem;
          transition: var(--transition);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          text-decoration: none;
        }

        .cta-button.primary {
          background: var(--primary);
          color: white;
        }

        .cta-button.primary:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
        }

        .cta-button.secondary {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .cta-button.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: var(--primary);
        }

        .trust-indicators {
          display: flex;
          justify-content: center;
          gap: 3.5rem;
          flex-wrap: wrap;
          padding-top: 2.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .indicator strong {
          font-size: 2.25rem;
          font-weight: 700;
          color: var(--primary);
          text-shadow: 0 2px 16px rgba(37, 99, 235, 0.5);
        }

        .indicator span {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        @media (max-width: 768px) {
          .hero {
            padding: 4rem 1.5rem 3rem;
            min-height: 85vh;
          }

          .hero-content h1 {
            font-size: 2rem;
          }

          .hero-content p {
            font-size: 1.1rem;
          }

          .trust-indicators {
            gap: 2rem;
          }

          .cta-button {
            padding: 0.875rem 2rem;
          }

          .indicator strong {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </header>
  );
}
