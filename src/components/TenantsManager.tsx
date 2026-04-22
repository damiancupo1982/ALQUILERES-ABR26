import React, { useState } from 'react';
import { Plus, User, Phone, Mail, Calendar, CreditCard as Edit, Trash2 } from 'lucide-react';
import { Tenant, Property, Receipt, TenantAdjustment } from '../App';
import TenantAccountStatement from './TenantAccountStatement';

interface TenantsManagerProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  properties: Property[];
  receipts: Receipt[];
  updatePropertyTenant: (propertyId: number | null, tenantName: string | null, oldPropertyId?: number | null) => void;
  adjustments: TenantAdjustment[];
  onAddAdjustment: (adjustment: Omit<TenantAdjustment, 'id'>) => Promise<void>;
}

const TenantsManager: React.FC<TenantsManagerProps> = ({ tenants, setTenants, properties, receipts, updatePropertyTenant, adjustments, onAddAdjustment }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    contractStart: '',
    contractEnd: '',
    deposit: '',
    guarantorName: '',
    guarantorEmail: '',
    guarantorPhone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProperty = properties.find(p => p.id.toString() === formData.propertyId);
    const oldPropertyId = editingTenant?.propertyId;

    const newTenant: Tenant = {
      id: editingTenant ? editingTenant.id : Date.now(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      propertyId: formData.propertyId ? parseInt(formData.propertyId) : null,
      property: selectedProperty?.name || '',
      contractStart: formData.contractStart,
      contractEnd: formData.contractEnd,
      deposit: parseFloat(formData.deposit),
      guarantor: {
        name: formData.guarantorName,
        email: formData.guarantorEmail,
        phone: formData.guarantorPhone
      },
      balance: editingTenant?.balance || 0,
      status: 'activo'
    };

    if (editingTenant) {
      setTenants(tenants.map(t => t.id === editingTenant.id ? newTenant : t));
      if (oldPropertyId !== newTenant.propertyId) {
        updatePropertyTenant(newTenant.propertyId, newTenant.name, oldPropertyId);
      }
    } else {
      setTenants([...tenants, newTenant]);
      if (newTenant.propertyId) {
        updatePropertyTenant(newTenant.propertyId, newTenant.name);
      }
    }

    setFormData({
      name: '', email: '', phone: '', propertyId: '', contractStart: '', contractEnd: '', deposit: '',
      guarantorName: '', guarantorEmail: '', guarantorPhone: ''
    });
    setShowModal(false);
    setEditingTenant(null);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId?.toString() || '',
      contractStart: tenant.contractStart,
      contractEnd: tenant.contractEnd,
      deposit: tenant.deposit.toString(),
      guarantorName: tenant.guarantor.name,
      guarantorEmail: tenant.guarantor.email,
      guarantorPhone: tenant.guarantor.phone
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar este inquilino?')) {
      const tenant = tenants.find(t => t.id === id);
      if (tenant?.propertyId) {
        updatePropertyTenant(null, null, tenant.propertyId);
      }
      setTenants(tenants.filter(t => t.id !== id));
    }
  };

  const getStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'vencido': return 'bg-red-100 text-red-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailableProperties = () => {
    return properties.filter(property =>
      property.status === 'disponible' ||
      (editingTenant && property.id === editingTenant.propertyId)
    );
  };

  const getTenantDebt = (tenantName: string): number => {
    const tenantReceipts = receipts.filter(r =>
      r.tenant.toLowerCase() === tenantName.toLowerCase()
    );
    const receiptsBalance = tenantReceipts.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);
    const adjustmentsTotal = adjustments
      .filter(a => a.tenant.toLowerCase() === tenantName.toLowerCase())
      .reduce((sum, a) => sum + a.amount, 0);
    return receiptsBalance + adjustmentsTotal;
  };

  const handleViewAccount = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowAccountStatement(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inquilinos</h2>
          <p className="text-gray-600">Gestiona todos los inquilinos y sus contratos</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', email: '', phone: '', propertyId: '', contractStart: '', contractEnd: '', deposit: '', guarantorName: '', guarantorEmail: '', guarantorPhone: '' });
            setEditingTenant(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar Inquilino</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propiedad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewAccount(tenant)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">Depósito: ${tenant.deposit.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Garante: {tenant.guarantor.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {tenant.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {tenant.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tenant.property}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        Inicio: {tenant.contractStart}
                      </div>
                      <div className="text-sm text-gray-500">Vence: {tenant.contractEnd}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const debt = getTenantDebt(tenant.name);
                      return (
                        <>
                          <div className={`text-sm font-semibold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${debt.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{debt > 0 ? 'Debe' : 'Al día'}</div>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar inquilino"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tenant.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar inquilino"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTenant ? 'Editar Inquilino' : 'Agregar Nuevo Inquilino'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propiedad Asignada</label>
                  <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sin propiedad asignada</option>
                    {getAvailableProperties().map((property) => (
                      <option key={property.id} value={property.id.toString()}>{property.name} - {property.building} (${property.rent.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio de contrato</label>
                  <input type="date" value={formData.contractStart} onChange={(e) => setFormData({ ...formData, contractStart: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin de contrato</label>
                  <input type="date" value={formData.contractEnd} onChange={(e) => setFormData({ ...formData, contractEnd: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depósito ($)</label>
                <input type="number" value={formData.deposit} onChange={(e) => setFormData({ ...formData, deposit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div className="md:col-span-2">
                <h4 className="text-md font-medium text-gray-900 mb-3">Datos del Garante</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del garante</label>
                    <input type="text" value={formData.guarantorName} onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email del garante</label>
                    <input type="email" value={formData.guarantorEmail} onChange={(e) => setFormData({ ...formData, guarantorEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del garante</label>
                    <input type="tel" value={formData.guarantorPhone} onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingTenant(null); }} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{editingTenant ? 'Actualizar' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccountStatement && selectedTenant && (
        <TenantAccountStatement
          tenant={selectedTenant}
          receipts={receipts}
          adjustments={adjustments}
          onAddAdjustment={onAddAdjustment}
          onClose={() => {
            setShowAccountStatement(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
};

export default TenantsManager;
