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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.navbar') && isActive) {
        setIsActive(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isActive]);

  const handleLinkClick = () => {
    setIsActive(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo-container">
          <img
            src="/favicon.svg"
            alt="NexWebs logo"
            className="logo-icon"
            width={32}
            height={32}
          />
          <h1 className="logo">{brandName}</h1>
        </div>

        <button 
          className={`menu-toggle ${isActive ? 'active' : ''}`} 
          aria-label="Abrir menú"
          onClick={() => setIsActive(!isActive)}
        >
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
        </button>

        <ul className={`nav-links ${isActive ? 'active' : ''}`}>
          {links.map(({ label, href }) => (
            <li key={href}>
              <a href={href} className="nav-link" onClick={handleLinkClick}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
        }

        .navbar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-container svg {
          color: var(--primary);
        }

        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .menu-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          z-index: 115;
        }

        .menu-icon {
          width: 24px;
          height: 2px;
          background: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 2px;
        }

        .menu-toggle.active .menu-icon:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .menu-toggle.active .menu-icon:nth-child(2) {
          opacity: 0;
          transform: translateX(-10px);
        }

        .menu-toggle.active .menu-icon:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }

        .nav-link {
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          position: relative;
          transition: color 0.3s ease;
          text-decoration: none;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--primary);
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          color: var(--primary);
        }

        .nav-link:hover::after {
          width: 100%;
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 1rem;
          }

          .menu-toggle {
            display: flex;
          }

          .nav-links {
            position: fixed;
            top: 0;
            right: -100%;
            width: 280px;
            height: 100vh;
            background: var(--bg-primary);
            flex-direction: column;
            gap: 0;
            padding: 5rem 2rem 2rem;
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 110;
          }

          .nav-links.active {
            right: 0;
          }

          .nav-links li {
            width: 100%;
            border-bottom: 1px solid var(--border-light);
          }

          .nav-link {
            display: block;
            padding: 1.25rem 0;
            font-size: 1.0625rem;
          }

          .nav-link::after {
            bottom: 0;
            height: 2px;
          }
        }
      `}</style>
    </nav>
  );
}
