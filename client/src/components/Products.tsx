import { useState, useEffect } from 'react';
import { API_URL } from '../config/env';

interface Paquete {
  id?: string;
  nombre: string;
  slug?: string;
  precio_mensual: number;
  precio_anual: number | null;
  ideal_para: string[];
  limites?: {
    docs?: number;
    usuarios?: number;
  };
  destacado: boolean;
}

interface Producto {
  id?: string;
  nombre: string;
  slug?: string;
  descripcion_corta: string;
  precio_base: number;
  sectores?: string[];
  features: string[];
  paquetes: Paquete[];
}

export default function Products() {
  const [products, setProducts] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/productos/?activo=true`);
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        setProducts(data.productos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    fetchProducts();
  }, []);

  const formatPrice = (price: number): string => {
    return price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const openModal = (product: Producto) => {
    setSelectedProduct(product);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedProduct(null);
    document.body.style.overflow = '';
  };

  const handleSelectPlan = (productName: string, planName: string) => {
    window.dispatchEvent(new CustomEvent('openChatWithProduct', {
      detail: { producto: productName, paquete: planName }
    }));
    closeModal();
  };

  const handleDirectChat = (productName: string, price: number) => {
    window.dispatchEvent(new CustomEvent('openChatWithProduct', { 
      detail: { 
        producto: productName, 
        paquete: null,
        precio: price
      }
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProduct) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct]);

  return (
    <>
      <section id="productos" className="products-section">
        <div className="products-background"></div>
        <div className="products-overlay"></div>
        
        <div className="container">
          <header className="section-header">
            <h2>Nuestros Productos</h2>
            <p className="section-subtitle">Soluciones profesionales adaptadas a tu negocio</p>
          </header>

          {error && (
            <div className="error-notice">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>No se pudieron cargar los productos. {error}</p>
            </div>
          )}

          <div className="products-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id || product.nombre}>
                <div className="card-content">
                  <div className="product-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  
                  <h3>{product.nombre}</h3>
                  <p className="description">{product.descripcion_corta}</p>

                  {product.features?.length > 0 && (
                    <ul className="features-list">
                      {product.features.slice(0, 4).map((feature, index) => (
                        <li key={index}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card-footer">
                  <div className="price-info">
                    <span className="price-label">Desde</span>
                    <span className="price-value">S/ {formatPrice(product.precio_base)}</span>
                  </div>
                  {product.paquetes?.length > 0 ? (
                    <button 
                      className="btn-view-plans" 
                      onClick={() => openModal(product)}
                    >
                      Ver Planes
                    </button>
                  ) : (
                    <button 
                      className="btn-direct-chat" 
                      onClick={() => handleDirectChat(product.nombre, product.precio_base)}
                    >
                      Comenzar Ahora
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {selectedProduct && (
        <div id="plansModal" className="modal active">
          <div className="modal-overlay" onClick={closeModal}></div>
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal} aria-label="Cerrar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="modal-header">
              <div className="modal-product-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>{selectedProduct.nombre}</h3>
              <p>{selectedProduct.descripcion_corta}</p>
            </div>

            <div className="plans-container">
              <div className="plans-grid">
                {selectedProduct.paquetes.map((paquete, index) => (
                  <div className={`plan-card ${paquete.destacado ? 'destacado' : ''}`} key={index}>
                    {paquete.destacado && (
                      <div className="plan-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Popular
                      </div>
                    )}
                    
                    <div className="plan-content-wrapper">
                      <div className="plan-name">{paquete.nombre}</div>
                      
                      <div className="plan-pricing">
                        <div className="price-main">
                          S/ {paquete.precio_mensual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          <span className="price-period">/mes</span>
                        </div>
                        {paquete.precio_anual && (
                          <div className="price-annual">
                            <span>S/ {paquete.precio_anual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}/año</span>
                            <span className="save-badge">Ahorra 20%</span>
                          </div>
                        )}
                      </div>

                      {paquete.ideal_para?.length && (
                        <div className="ideal-for">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span><strong>Ideal para:</strong> {paquete.ideal_para.map(item => item.replace(/_/g, ' ')).join(' · ')}</span>
                        </div>
                      )}

                      <button 
                        className="btn-select-plan" 
                        onClick={() => handleSelectPlan(selectedProduct.nombre, paquete.nombre)}
                      >
                        Seleccionar Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .products-section {
          position: relative;
          padding: 5rem 2rem;
          width: 100%;
          overflow: hidden;
          min-height: auto;
        }

        .products-background {
          position: absolute;
          inset: 0;
          background-image: url('/image3.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
        }

        .products-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(15, 23, 42, 0.92) 0%,
            rgba(15, 23, 42, 0.88) 50%,
            rgba(15, 23, 42, 0.92) 100%
          );
          z-index: 1;
        }

        .container {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          font-weight: 700;
          color: white;
          margin-bottom: 0.75rem;
        }

        .section-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.8);
          max-width: 600px;
          margin: 0 auto;
        }

        .error-notice {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--error);
          border-radius: var(--radius);
          color: var(--error);
          margin-bottom: 2rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .product-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: var(--transition);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .product-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border-color: var(--primary-light);
        }

        .product-card:hover .btn-view-plans,
        .product-card:hover .btn-direct-chat {
          transform: scale(1.05);
        }

        .card-content {
          padding: 2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .product-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .product-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          word-break: break-word;
          hyphens: auto;
        }

        .description {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          word-break: break-word;
        }

        .features-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: auto;
        }

        .features-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
          word-break: break-word;
        }

        .features-list svg {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .card-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border-light);
          background: var(--bg-secondary);
        }

        .price-info {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .price-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .price-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--primary);
          word-break: break-word;
        }

        .btn-view-plans,
        .btn-direct-chat {
          width: 100%;
          padding: 0.875rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .btn-view-plans:hover,
        .btn-direct-chat:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .modal {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 1000;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal.active {
          display: flex;
        }

        .modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }

        .modal-content {
          position: relative;
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          max-width: 900px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 36px;
          height: 36px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
          z-index: 10;
        }

        .modal-close:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
          transform: rotate(90deg);
        }

        .modal-header {
          padding: 2rem 1.5rem 1.5rem;
          border-bottom: 2px solid var(--border-light);
          text-align: center;
          background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
        }

        .modal-product-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: var(--shadow-md);
        }

        .modal-header h3 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          word-break: break-word;
          hyphens: auto;
        }

        .modal-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
          word-break: break-word;
        }

        .plans-container {
          padding: 1.5rem;
          background: var(--bg-secondary);
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
          align-items: stretch;
        }

        .plan-card {
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .plan-card.destacado {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.03), rgba(168, 85, 247, 0.03));
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          border-color: var(--primary);
        }

        .plan-badge {
          position: absolute;
          top: -12px;
          right: 1rem;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .plan-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 1rem;
          line-height: 1.3;
          word-break: break-word;
          hyphens: auto;
        }

        .plan-pricing {
          margin-bottom: 1.25rem;
          padding-bottom: 1.25rem;
          border-bottom: 2px solid var(--border-light);
        }

        .price-main {
          font-size: 2rem;
          font-weight: 900;
          color: var(--primary);
          line-height: 1;
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .price-period {
          font-size: 0.95rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .price-annual {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          background: var(--bg-secondary);
          border-radius: var(--radius);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .save-badge {
          background: var(--success);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.3rem 0.625rem;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .plan-content-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .ideal-for {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius);
          font-size: 0.85rem;
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
          line-height: 1.5;
          margin-bottom: auto;
          word-break: break-word;
        }

        .plan-card.destacado .ideal-for {
          background: var(--bg-primary);
          border-color: var(--primary);
          border-width: 2px;
        }

        .ideal-for svg {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 2px;
          width: 16px;
          height: 16px;
        }

        .btn-select-plan {
          width: 100%;
          padding: 0.875rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: var(--radius);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 1.25rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-select-plan:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-select-plan:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .products-section {
            padding: 3rem 1.5rem;
          }

          .section-header h2 {
            font-size: 1.75rem;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .card-content {
            padding: 1.5rem;
          }

          .card-footer {
            padding: 1.25rem 1.5rem;
          }

          .price-value {
            font-size: 1.5rem;
          }

          .plans-container {
            padding: 1rem;
          }

          .plans-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .modal-header {
            padding: 1.5rem 1rem 1rem;
          }

          .modal-header h3 {
            font-size: 1.25rem;
          }

          .plan-card {
            padding: 1.25rem;
          }

          .price-main {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </>
  );
}
