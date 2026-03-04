import { useEffect, useState } from 'react';
import { leadsService } from '../services/api';

interface Vendedor {
  id: string;
  nombre_completo: string;
  email: string;
  rol: string;
  activo: boolean;
}

export default function Vendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendedores = async () => {
    setLoading(true);
    try {
      const data = await leadsService.getVendedores();
      setVendedores(data.vendedores);
    } catch (error) {
      console.error('Error fetching vendedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendedores();
  }, []);

  const getRolBadge = (rol: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      vendedor: 'bg-emerald-100 text-emerald-700',
      viewer: 'bg-slate-100 text-slate-700',
    };
    return styles[rol] || styles.viewer;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Vendedores</h1>
          <p className="text-slate-500 mt-1">Equipo de ventas</p>
        </div>
      </div>

        {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendedores.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-500">No hay vendedores registrados</p>
            </div>
          ) : (
            vendedores.map((vendedor) => (
              <div key={vendedor.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/25">
                    {vendedor.nombre_completo?.charAt(0) || 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{vendedor.nombre_completo}</h3>
                    <p className="text-sm text-slate-500 truncate">{vendedor.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRolBadge(vendedor.rol)}`}>
                        {vendedor.rol}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${vendedor.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {vendedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
