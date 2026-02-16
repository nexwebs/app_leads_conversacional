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
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleOverlayClick}
      />
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/98 backdrop-blur-xl shadow-lg border-b border-slate-200' 
          : 'bg-white/95 backdrop-blur-lg border-b border-slate-200'
      }`}>
        <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 flex justify-between items-center h-14 md:h-16">
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src="/favicon.svg"
              alt="NexWebs logo"
              className="w-7 h-7 md:w-8 md:h-8"
              width={32}
              height={32}
            />
            <h1 className="text-lg md:text-xl font-bold text-slate-800">{brandName}</h1>
          </div>

          <button 
            className="flex flex-col justify-center items-center gap-1.5 bg-transparent border-none cursor-pointer p-2 z-50 md:hidden"
            aria-label={isActive ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <span className={`w-6 h-0.5 bg-slate-800 transition-all duration-300 ${isActive ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-slate-800 transition-all duration-300 ${isActive ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-slate-800 transition-all duration-300 ${isActive ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>

          <ul className={`fixed md:relative top-0 right-0 md:right-auto h-full md:h-auto w-72 md:w-auto bg-white md:bg-transparent flex flex-col md:flex-row items-start md:items-center gap-0 md:gap-6 list-none m-0 p-0 md:p-0 pt-20 md:pt-0 pr-6 md:pr-0 shadow-2xl md:shadow-none transition-transform duration-300 z-50 ${
            isActive ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}>
            {links.map(({ label, href }) => (
              <li key={href} className="w-full md:w-auto border-b md:border-b-0 border-slate-100">
                <a 
                  href={href} 
                  className="text-base md:text-sm font-medium text-slate-700 hover:text-blue-600 no-underline block py-4 md:py-2 px-4 md:px-0 transition-colors"
                  onClick={handleLinkClick}
                >
                  {label}
                </a>
              </li>
            ))}
            <li className="w-full md:w-auto px-4 md:px-0 pt-4 md:pt-0 md:hidden">
              <a 
                href="#contacto" 
                className="inline-block w-full md:w-auto text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleLinkClick}
              >
                ¡Empezar Ahora!
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
