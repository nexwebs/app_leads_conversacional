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
    <header id="inicio" className="relative min-h-[90vh] flex items-center justify-center text-center overflow-hidden py-24 px-6">
      {/* Background con efectos */}
      <div className="absolute inset-0 bg-[url('/image2.png')] bg-cover bg-center bg-no-repeat z-0 scale-105" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-900/40 to-slate-900 z-0" />
      
      {/* Overlay de luz */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent z-0" />
      
      {/* Elementos decorativos varoniles */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-blue-600/30 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-5 h-5 bg-cyan-400/60 rounded-full animate-ping" />
      <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-blue-400/60 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-indigo-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
      
      {/* Grid decorativo */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034h-v-2h2v2zm0-4h-2v2h2v-2zm-4%204h2v2h-2v-2zm0-4h2v2h-2v-2zm4%204h-2v2h2v-2zm0-4h-2v2h2v-2zm-4%204h2v2h-2v-2zm0-4h2v2h-2v-2zm4%204h-2v2h2v-2zm0-4h-2v2h2v-2zm-4%204h2v2h-2v-2zm0-4h2v2h-2v-2zm4%204h-2v2h2v-2zm0-4h-2v2h2v-2zm-4%204h2v2h-2v-2zm0-4h2v2h-2v-2z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50 z-0" />
      
      <div className="relative z-10 px-8">
        <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full text-sm font-bold mb-8 shadow-xl shadow-blue-500/40 border border-blue-400/30 uppercase tracking-wider">
          {badge}
        </span>
        
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 leading-tight">
          {title} <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">{highlight}</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          <a href={primaryCTA.href} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold shadow-2xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/50 hover:-translate-y-1 transition-all">
            {primaryCTA.text}
          </a>
          <a href={secondaryCTA.href} className="px-10 py-4 bg-slate-800/50 backdrop-blur-md text-white rounded-xl font-semibold border border-slate-600 hover:bg-slate-700 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
            {secondaryCTA.text}
          </a>
        </div>

        {indicators && indicators.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 pt-10 border-t border-slate-700/50">
            {indicators.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <strong className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{value}</strong>
                <span className="text-sm text-slate-400 font-medium uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
