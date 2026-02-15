interface FooterProps {
  brandName?: string;
}

export default function Footer({ brandName = "NexWebs" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-[#11162e] via-[#0f1430] to-[#0a0f1e] text-gray-400 border-t border-white/5">
      <div className="w-full max-w-[1200px] mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-[1.5fr_2fr] gap-16">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="NexWebs logo"
              width={32}
              height={32}
            />
            <h1 className="text-2xl font-bold text-white">{brandName}</h1>
          </div>
          
          <p className="text-sm leading-7 text-gray-500 max-w-[320px]">
            Automatización inteligente de ventas con IA. Transforma tu negocio con soluciones que escalan.
          </p>
          <div className="flex gap-4">
            <a href="https://www.linkedin.com/in/claudio-quispe/" aria-label="LinkedIn" className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all hover:-translate-y-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://x.com/claudiodevs" aria-label="Twitter" className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all hover:-translate-y-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all hover:-translate-y-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-10">
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5">Productos</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#productos" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">CRM + Facturación</a></li>
              <li><a href="#productos" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Agente IA</a></li>
              <li><a href="#productos" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">WhatsApp Bot</a></li>
              <li><a href="#productos" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Automatización</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5">Empresa</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#beneficios" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Beneficios</a></li>
              <li><a href="#contacto" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Contáctanos</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Términos</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Privacidad</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5">Soporte</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#contacto" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Centro de Ayuda</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Documentación</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">API</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-cyan-400 transition-all hover:translate-x-1 inline-block">Estado</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 py-8 bg-[#060b16]">
        <div className="w-full max-w-[1200px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">&copy; {currentYear} {brandName}. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-500 font-medium">Hecho con IA para potenciar tu negocio</p>
        </div>
      </div>
    </footer>
  );
}
