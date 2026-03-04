import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsService } from '../services/api';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface Lead {
  id: string;
  email: string | null;
  telefono: string | null;
  nombre_completo: string | null;
  empresa: string | null;
  origen: string;
  score_total: number;
  estado: string;
  vendedor_asignado_id: string | null;
  created_at: string;
  ultima_interaccion: string | null;
}

interface Vendedor {
  id: string;
  nombre_completo: string;
  email: string;
  rol: string;
}

interface LeadFormData {
  nombre_completo: string;
  email: string;
  telefono: string;
  empresa: string;
  origen: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    estado: '',
    origen: '',
    score_minimo: 0,
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'single' | 'bulk'; ids: string[] } | null>(null);
  const [editModal, setEditModal] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<LeadFormData>({
    nombre_completo: '',
    email: '',
    telefono: '',
    empresa: '',
    origen: 'web_chat',
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      };
      if (filters.estado) params.estado = filters.estado;
      if (filters.origen) params.origen = filters.origen;
      if (filters.score_minimo > 0) {
        console.log('Score filter:', filters.score_minimo);
        params.score_minimo = filters.score_minimo;
      }
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
      
      const data = await leadsService.getLeads(params);
      setLeads(data.leads || data);
      setTotal(data.total || data.length);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await leadsService.getVendedores();
      setVendedores(data.vendedores);
    } catch (error) {
      console.error('Error fetching vendedores:', error);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchLeads();
      return;
    }
    setLoading(true);
    try {
      const data = await leadsService.searchLeads(searchTerm);
      setLeads(data.leads);
      setTotal(data.total_resultados);
    } catch (error) {
      console.error('Error searching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    console.log('Deleting leads:', ids);
    try {
      if (ids.length === 1) {
        await leadsService.deleteLead(ids[0]);
      } else {
        await leadsService.deleteMultipleLeads(ids);
      }
      setLeads(leads.filter(l => !ids.includes(l.id)));
      setSelectedLeads(new Set());
      setConfirmModal(null);
      showToast(ids.length === 1 ? 'Lead eliminado correctamente' : `${ids.length} leads eliminados`, 'success');
    } catch (error) {
      console.error('Error deleting lead:', error);
      showToast('Error al eliminar los leads', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedLeads.size === 0) return;
    setConfirmModal({ type: 'bulk', ids: Array.from(selectedLeads) });
  };

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    try {
      await leadsService.updateLead(id, { estado: nuevoEstado });
      setLeads(leads.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l));
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleAssignVendedor = async (leadId: string, vendedorId: string) => {
    try {
      await leadsService.assignLeadToVendedor(leadId, vendedorId);
      setAssignModal(null);
      fetchLeads();
    } catch (error) {
      console.error('Error assigning lead:', error);
    }
  };

  const handleEditLead = async () => {
    if (!editModal) return;
    try {
      await leadsService.updateLead(editModal.id, editForm);
      setLeads(leads.map(l => l.id === editModal.id ? { ...l, ...editForm } : l));
      setEditModal(null);
      showToast('Lead actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error updating lead:', error);
      showToast('Error al actualizar el lead', 'error');
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditForm({
      nombre_completo: lead.nombre_completo || '',
      email: lead.email || '',
      telefono: lead.telefono || '',
      empresa: lead.empresa || '',
      origen: lead.origen,
    });
    setEditModal(lead);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const totalPages = Math.ceil(total / pagination.limit);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      nuevo: 'bg-blue-100 text-blue-700',
      asignado: 'bg-amber-100 text-amber-700',
      calificado: 'bg-purple-100 text-purple-700',
      vendido: 'bg-emerald-100 text-emerald-700',
      descartado: 'bg-red-100 text-red-700',
    };
    return styles[estado] || 'bg-slate-100 text-slate-700';
  };

  const getVendedorName = (vendedorId: string | null) => {
    if (!vendedorId) return null;
    const vendedor = vendedores.find(v => v.id === vendedorId);
    return vendedor?.nombre_completo || 'Desconocido';
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Confirm Delete Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 text-center mb-1">
              {confirmModal.type === 'bulk' ? 'Eliminar leads seleccionados' : 'Eliminar lead'}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              {confirmModal.type === 'bulk' 
                ? `¿Estás seguro de eliminar ${confirmModal.ids.length} leads? Esta acción no se puede deshacer.`
                : 'Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este lead?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmModal.ids)}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Asignar Lead a Vendedor</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {vendedores.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleAssignVendedor(assignModal, v.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {v.nombre_completo.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{v.nombre_completo}</p>
                    <p className="text-sm text-slate-500 capitalize">{v.rol}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setAssignModal(null)}
              className="mt-4 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Editar Lead</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={editForm.nombre_completo}
                  onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input
                  type="text"
                  value={editForm.empresa}
                  onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Origen</label>
                <select
                  value={editForm.origen}
                  onChange={(e) => setEditForm({ ...editForm, origen: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="web_chat">Web Chat</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="api">API</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditLead}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Leads</h1>
          <p className="text-slate-500 mt-1">Gestiona tus prospectos ({total} total)</p>
        </div>
        <div className="flex gap-2">
          {selectedLeads.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar ({selectedLeads.size})
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <div className={`lg:flex gap-3 ${showFilters ? 'flex flex-col' : 'hidden'}`}>
            <div className="flex gap-3 flex-wrap">
              <select
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="nuevo">Nuevo</option>
                <option value="asignado">Asignado</option>
                <option value="calificado">Calificado</option>
                <option value="vendido">Vendido</option>
                <option value="descartado">Descartado</option>
              </select>

              <select
                value={filters.origen}
                onChange={(e) => setFilters({ ...filters, origen: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los orígenes</option>
                <option value="web_chat">Web Chat</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="api">API</option>
              </select>

              <select
                value={filters.score_minimo}
                onChange={(e) => setFilters({ ...filters, score_minimo: Number(e.target.value) })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Cualquier score</option>
                <option value={70}>Score ≥ 70</option>
                <option value={40}>Score ≥ 40</option>
              </select>
            </div>
            <div className="flex gap-3 flex-wrap">
              <input
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fecha desde"
              />
              <input
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fecha hasta"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Contacto</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Score</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendedor</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Fecha</th>
                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 lg:px-6 py-8 text-center text-slate-400">
                      No se encontraron leads
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="font-medium text-slate-800">{lead.nombre_completo || 'Sin nombre'}</div>
                        <div className="text-sm text-slate-500 md:hidden">{lead.email || lead.telefono || '-'}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                        <div className="text-sm text-slate-600">{lead.email || '-'}</div>
                        <div className="text-sm text-slate-500">{lead.telefono || '-'}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-sm ${getScoreColor(lead.score_total)}`}>
                          {lead.score_total}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <select
                          value={lead.estado}
                          onChange={(e) => handleEstadoChange(lead.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-0 ${getEstadoBadge(lead.estado)}`}
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="asignado">Asignado</option>
                          <option value="calificado">Calificado</option>
                          <option value="vendido">Vendido</option>
                          <option value="descartado">Descartado</option>
                        </select>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {lead.vendedor_asignado_id ? (
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {getVendedorName(lead.vendedor_asignado_id)}
                          </span>
                        ) : (
                          <button
                            onClick={() => setAssignModal(lead.id)}
                            className="text-sm text-blue-500 hover:text-blue-700"
                          >
                            + Asignar
                          </button>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <Link
                            to={`/dashboard/leads/${lead.id}`}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => setConfirmModal({ type: 'single', ids: [lead.id] })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 lg:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, total)} de {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  Página {pagination.page} de {totalPages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
