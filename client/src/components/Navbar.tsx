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
        className={`fixed inset-0 bg-black/50 z-40 ${isActive ? 'block' : 'hidden'}`}
        onClick={handleOverlayClick}
      />
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200">
        <div className="w-full max-w-[1200px] mx-auto px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="NexWebs logo"
              width={32}
              height={32}
            />
            <h1 className="text-xl font-bold text-slate-800">{brandName}</h1>
          </div>

          <button 
            className={`flex flex-col gap-1.5 bg-transparent border-none cursor-pointer p-2 z-50 md:hidden`}
            aria-label={isActive ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <span className={`w-6 h-0.5 bg-slate-800 transition-all ${isActive ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-slate-800 transition-all ${isActive ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-slate-800 transition-all ${isActive ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>

          <ul className={`flex gap-8 list-none m-0 p-0 md:flex ${isActive ? 'fixed top-0 right-0 w-[280px] h-full bg-white flex-col gap-0 p-5 pt-20 shadow-lg' : 'hidden'}`}>
            {links.map(({ label, href }) => (
              <li key={href} className={isActive ? 'border-b border-slate-100' : ''}>
                <a href={href} className="text-sm font-medium text-slate-600 hover:text-blue-600 relative no-underline block py-5 md:py-0" onClick={handleLinkClick}>
                  {label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all hover:w-full md:block hidden"></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
