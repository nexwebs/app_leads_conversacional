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
      <section id="productos" className="relative py-20 px-6 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/image3.png')] bg-cover bg-center bg-no-repeat z-0 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/40 to-slate-950 z-0" />
        
        {/* Overlay de luz */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent z-0" />
        
        {/* Elementos decorativos varoniles con animación */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-cyan-400/30 rounded-full animate-ping" />
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-blue-400/30 rounded-full animate-ping" style={{ animationDelay: '0.7s' }} />
        
        <div className="relative z-10">
          <header className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Nuestros Productos</h2>
            <p className="text-lg text-slate-300 max-w-[600px] mx-auto">Soluciones profesionales adaptadas a tu negocio</p>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full mx-auto mt-4" />
          </header>

          {error && (
            <div className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500 mb-8 max-w-[1200px] mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>No se pudieron cargar los productos. {error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <article key={product.id || product.nombre} className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300 group">
                <div className="p-8 flex-1 flex flex-col">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-3 break-words">{product.nombre}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 break-words">{product.descripcion_corta}</p>

                  {product.features?.length > 0 && (
                    <ul className="flex flex-col gap-3 mt-auto">
                      {product.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-slate-600 text-sm break-words">
                          <svg className="text-blue-600 flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-sm text-slate-500">Desde</span>
                    <span className="text-2xl font-extrabold text-blue-600 break-words">S/ {formatPrice(product.precio_base)}</span>
                  </div>
                  {product.paquetes?.length > 0 ? (
                    <button 
                      className="w-full py-3.5 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                      onClick={() => openModal(product)}
                    >
                      Ver Planes
                    </button>
                  ) : (
                    <button 
                      className="w-full py-3.5 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl max-w-[900px] w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-modal">
            <button className="absolute top-4 right-4 w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white hover:border-red-500 transition-all z-10" onClick={closeModal} aria-label="Cerrar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="p-8 border-b-2 border-slate-100 text-center bg-gradient-to-b from-slate-50 to-white">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-2 break-words">{selectedProduct.nombre}</h3>
              <p className="text-slate-600 text-sm max-w-[600px] mx-auto leading-relaxed break-words">{selectedProduct.descripcion_corta}</p>
            </div>

            <div className="p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {selectedProduct.paquetes.map((paquete, index) => (
                  <div key={index} className={`relative bg-white border-2 rounded-xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${paquete.destacado ? 'border-blue-600 bg-gradient-to-br from-blue-50/50 to-purple-50/50 shadow-md' : 'border-slate-200'}`}>
                    {paquete.destacado && (
                      <div className="absolute -top-3 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg tracking-wide uppercase">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Popular
                      </div>
                    )}
                    
                    <div>
                      <div className="text-xl font-extrabold text-slate-800 mb-4 leading-tight break-words">{paquete.nombre}</div>
                      
                      <div className="mb-5 pb-5 border-b-2 border-slate-100">
                        <div className="flex items-baseline flex-wrap gap-1 mb-2">
                          <span className="text-3xl font-black text-blue-600 leading-none">S/ {paquete.precio_mensual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                          <span className="text-sm text-slate-500 font-medium">/mes</span>
                        </div>
                        {paquete.precio_anual && (
                          <div className="flex items-center gap-2 py-2.5 px-3.5 bg-slate-50 rounded-lg text-sm text-slate-600">
                            <span>S/ {paquete.precio_anual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}/año</span>
                            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Ahorra 20%</span>
                          </div>
                        )}
                      </div>

                      {paquete.ideal_para?.length && (
                        <div className="flex items-start gap-2.5 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100 leading-relaxed mb-4 break-words">
                          <svg className="text-blue-600 flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span><strong className="font-semibold">Ideal para:</strong> {paquete.ideal_para.map(item => item.replace(/_/g, ' ')).join(' · ')}</span>
                        </div>
                      )}

                      <button 
                        className="w-full py-3.5 bg-blue-600 text-white border-none rounded-lg text-sm font-bold cursor-pointer hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-md"
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
        .animate-modal {
          animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
