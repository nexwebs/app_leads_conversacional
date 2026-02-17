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
    <section id="beneficios" className="py-16 md:py-20 px-4 md:px-6 bg-slate-50 relative overflow-hidden">
      {/* Elementos decorativos con animación */}
      <div className="absolute left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-cyan-400/20 rounded-full animate-ping" />
      <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-blue-400/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      
      <header className="text-center mb-12 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800">{title}</h2>
        <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full mx-auto mt-4" />
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {benefits.map(({ icon, title, description }) => (
          <article key={title} className="p-8 bg-white rounded-2xl border border-slate-200 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-300 group relative overflow-hidden">
            {/* Gradiente decorativo en hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
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
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
              <p className="text-slate-600 leading-relaxed">{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
