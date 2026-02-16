import { useState, useEffect } from 'react';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  brandName?: string;
  links?: NavLink[];
}

export default function Navbar({
  brandName = "NexWebs",
  links = [
    { label: "Productos", href: "#productos" },
    { label: "Contacto", href: "#contacto" }
  ]
}: NavbarProps) {
  const [isActive, setIsActive] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  const handleLinkClick = () => {
    setIsActive(false);
  };

  const handleOverlayClick = () => {
    setIsActive(false);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 md:hidden ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleOverlayClick}
      />
      
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white'}`}>
        <div className="w-full max-w-7xl mx-auto px-4 flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/favicon.svg"
              alt="NexWebs"
              className="w-7 h-7"
            />
            <span className="text-lg font-bold text-slate-800">{brandName}</span>
          </div>

          {/* Botón menú hamburguesa más grande */}
          <button 
            className="flex flex-col justify-center items-center gap-1.5 bg-transparent border-none cursor-pointer p-3 -mr-2 md:hidden"
            aria-label={isActive ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <span className={`w-7 h-0.5 bg-slate-800 rounded-full transition-all duration-300 ${isActive ? 'rotate-45 translate-y-2.5' : ''}`}></span>
            <span className={`w-7 h-0.5 bg-slate-800 rounded-full transition-all duration-300 ${isActive ? 'opacity-0' : ''}`}></span>
            <span className={`w-7 h-0.5 bg-slate-800 rounded-full transition-all duration-300 ${isActive ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
          </button>

          {/* Links desktop */}
          <ul className="hidden md:flex gap-6 list-none m-0 p-0">
            {links.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className="text-sm font-medium text-slate-600 hover:text-blue-600 no-underline transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Menú móvil - pantalla completa */}
      <div className={`fixed inset-y-0 right-0 left-0 bg-white z-50 transform transition-transform duration-300 ease-out md:hidden ${
        isActive ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full pt-6 px-6 pb-8">
          {/* Header con botón cerrar */}
          <div className="flex justify-between items-center mb-8">
            <span className="text-xl font-bold text-slate-800">Navegación</span>
            <button 
              onClick={() => setIsActive(false)}
              className="p-3 -mr-3"
              aria-label="Cerrar menú"
            >
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Links - área scrollable */}
          <ul className="flex flex-col gap-1 list-none m-0 p-0 overflow-y-auto flex-1">
            <li>
              <a 
                href="#inicio" 
                className="block py-4 px-4 text-lg font-medium text-slate-700 hover:bg-slate-100 rounded-xl no-underline"
                onClick={handleLinkClick}
              >
                Inicio
              </a>
            </li>
            <li>
              <a 
                href="#beneficios" 
                className="block py-4 px-4 text-lg font-medium text-slate-700 hover:bg-slate-100 rounded-xl no-underline"
                onClick={handleLinkClick}
              >
                Beneficios
              </a>
            </li>
            {links.map(({ label, href }) => (
              <li key={href}>
                <a 
                  href={href} 
                  className="block py-4 px-4 text-lg font-medium text-slate-700 hover:bg-slate-100 rounded-xl no-underline"
                  onClick={handleLinkClick}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
