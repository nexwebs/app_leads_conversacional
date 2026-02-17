import { useState, useEffect } from 'react';
import type { Language } from '../i18n';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  brandName?: string;
  links?: NavLink[];
  language: Language;
  onLanguageChange: (lang: Language) => void;
  menuTitle?: string;
}

export default function Navbar({
  brandName = "NexWebs",
  links = [
    { label: "Productos", href: "#productos" },
    { label: "Contacto", href: "#contacto" }
  ],
  language,
  onLanguageChange,
  menuTitle = "Navegación"
}: NavbarProps) {
  const [isActive, setIsActive] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

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

  const toggleLanguage = () => {
    onLanguageChange(language === 'es' ? 'en' : 'es');
    setShowLangMenu(false);
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
            <a href="#inicio" className="flex items-center gap-2">
              <img
                src="/favicon.svg"
                alt="NexWebs"
                className="w-7 h-7"
              />
              <span className="text-lg font-bold text-slate-800">{brandName}</span>
            </a>
          </div>

          {/* Right side: Language + Menu */}
          <div className="flex items-center gap-2">
            {/* Language Selector - Diseño mejorado */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold uppercase text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
                aria-label="Cambiar idioma"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03 3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="min-w-[1.5rem]">{language}</span>
              </button>

            {/* Dropdown idioma */}
            {showLangMenu && (
              <div className="absolute top-14 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 min-w-[120px]">
                <button 
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors"
                >
                  <span className={`font-bold text-base ${language === 'es' ? 'text-blue-600' : 'text-slate-400'}`}>ES</span>
                  <span className="text-slate-300">|</span>
                  <span className={`font-bold text-base ${language === 'en' ? 'text-cyan-600' : 'text-slate-400'}`}>EN</span>
                </button>
              </div>
            )}
            </div>

            {/* Botón menú hamburguesa */}
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
        </div>
      </nav>

      {/* Menú móvil */}
      <div className={`fixed inset-y-0 right-0 left-0 bg-white z-50 transform transition-transform duration-300 ease-out md:hidden ${
        isActive ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full pt-6 px-6 pb-8">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xl font-bold text-slate-800">{menuTitle}</span>
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
          
          <ul className="flex flex-col gap-1 list-none m-0 p-0 overflow-y-auto flex-1">
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

          {/* Selector idioma en menú móvil */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 w-full py-3 px-4 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className={`font-bold ${language === 'es' ? 'text-blue-600' : ''}`}>Español</span>
              <span className="text-slate-400">|</span>
              <span className={`font-bold ${language === 'en' ? 'text-blue-600' : ''}`}>English</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
