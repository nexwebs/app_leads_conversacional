interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface BeneficiosProps {
  title?: string;
  benefits?: Benefit[];
}

export default function Beneficios({
  title = "¿Por qué elegirnos?",
  benefits = [
    {
      icon: `<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>`,
      title: "Automatización Completa",
      description: "Elimina tareas repetitivas y enfócate en cerrar ventas. Nuestro sistema trabaja por ti."
    },
    {
      icon: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
      title: "Respuesta Inmediata",
      description: "Atiende leads al instante, 24/7. Nunca pierdas una oportunidad de venta."
    },
    {
      icon: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
      title: "Escalabilidad Total",
      description: "Crece sin límites. Nuestra tecnología se adapta al tamaño de tu negocio."
    }
  ]
}: BeneficiosProps) {
  return (
    <section id="beneficios" className="benefits">
      <div className="container">
        <h2>{title}</h2>
        <div className="benefits-grid">
          {benefits.map(({ icon, title, description }) => (
            <article className="benefit-card" key={title}>
              <div className="benefit-icon">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  dangerouslySetInnerHTML={{ __html: icon }}
                />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .benefits {
          padding: 5rem 2rem;
          background: var(--bg-primary);
          width: 100%;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .benefits h2 {
          text-align: center;
          font-size: clamp(2rem, 4vw, 2.5rem);
          font-weight: 700;
          margin-bottom: 3rem;
          color: var(--text-primary);
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .benefit-card {
          padding: 2rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          transition: var(--transition);
        }

        .benefit-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary-light);
        }

        .benefit-icon {
          width: 48px;
          height: 48px;
          background: var(--primary);
          color: white;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .benefit-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }

        .benefit-card p {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .benefits {
            padding: 3rem 1.5rem;
          }

          .benefits-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
