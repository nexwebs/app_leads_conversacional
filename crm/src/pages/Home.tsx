import { useEffect, useState } from 'react';
import { leadsService } from '../services/api';
import WorkflowCanvas from './WorkflowCanvas';

interface Stats {
  total_leads: number;
  por_estado: Record<string, number>;
  por_origen: Record<string, number>;
  score_promedio: number;
  alta_prioridad: number;
  tasa_conversion: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await leadsService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const estadoColours: Record<string, string> = {
    nuevo: '#3b82f6',
    calificando: '#f59e0b',
    calificado: '#8b5cf6',
    vendido: '#10b981',
    descartado: '#ef4444',
  };

  const statCards = [
    { label: 'Total Leads', value: stats?.total_leads || 0, color: 'from-emerald-500 to-teal-500', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Alta Prioridad', value: stats?.alta_prioridad || 0, color: 'from-amber-500 to-orange-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Score Promedio', value: stats?.score_promedio || 0, color: 'from-emerald-500 to-teal-500', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Tasa Conversión', value: `${stats?.tasa_conversion || 0}%`, color: 'from-teal-500 to-cyan-500', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen de tu gestión de leads</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Leads por Estado</h3>
          <div className="space-y-3">
            {stats?.por_estado && Object.entries(stats.por_estado).map(([estado, count]) => (
              <div key={estado} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: estadoColours[estado] || '#64748b' }}></span>
                <span className="flex-1 text-slate-600 capitalize">{estado}</span>
                <span className="font-semibold text-slate-800">{count}</span>
              </div>
            ))}
            {(!stats?.por_estado || Object.keys(stats.por_estado).length === 0) && (
              <p className="text-slate-400 text-center py-4">Sin datos</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Leads por Origen</h3>
          <div className="space-y-3">
            {stats?.por_origen && Object.entries(stats.por_origen).map(([origen, count]) => (
              <div key={origen} className="flex items-center gap-3">
                <span className="flex-1 text-slate-600 capitalize">{origen.replace('_', ' ')}</span>
                <span className="font-semibold text-slate-800">{count}</span>
              </div>
            ))}
            {(!stats?.por_origen || Object.keys(stats.por_origen).length === 0) && (
              <p className="text-slate-400 text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Canvas */}
      {stats?.por_estado && (
        <WorkflowCanvas 
          stats={{
            nuevo: stats.por_estado.nuevo || 0,
            calificando: stats.por_estado.calificando || 0,
            calificado: stats.por_estado.calificado || 0,
            vendido: stats.por_estado.vendido || 0,
            descartado: stats.por_estado.descartado || 0,
          }} 
        />
      )}
    </div>
  );
}
