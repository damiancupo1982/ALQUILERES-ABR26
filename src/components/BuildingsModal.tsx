import React, { useState, useEffect } from 'react';
import { X, Plus, CreditCard as Edit2, Trash2, Building2, Save } from 'lucide-react';
import { buildingsService, Building } from '../services/buildings.service';

interface BuildingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingsUpdate: () => void;
}

export default function BuildingsModal({ isOpen, onClose, onBuildingsUpdate }: BuildingsModalProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadBuildings();
    }
  }, [isOpen]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      const data = await buildingsService.getAll();
      setBuildings(data);
    } catch (error) {
      console.error('Error loading buildings:', error);
      alert('Error al cargar los edificios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre del edificio es obligatorio');
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        await buildingsService.update(editingId, formData);
      } else {
        await buildingsService.create(formData);
      }

      setFormData({ name: '', address: '', notes: '' });
      setEditingId(null);
      await loadBuildings();
      onBuildingsUpdate();
    } catch (error: any) {
      console.error('Error saving building:', error);
      if (error.message.includes('duplicate')) {
        alert('Ya existe un edificio con ese nombre');
      } else {
        alert('Error al guardar el edificio');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (building: Building) => {
    setEditingId(building.id);
    setFormData({
      name: building.name,
      address: building.address,
      notes: building.notes
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el edificio "${name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await buildingsService.delete(id);
      await loadBuildings();
      onBuildingsUpdate();
    } catch (error) {
      console.error('Error deleting building:', error);
      alert('Error al eliminar el edificio. Puede que tenga propiedades asignadas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', address: '', notes: '' });
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">Gestión de Edificios</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Edificio *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Torre Central"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Av. Principal 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas adicionales"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {editingId ? (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Actualizar</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Agregar Edificio</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {loading && buildings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Cargando edificios...</div>
          ) : buildings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay edificios registrados. Agrega el primero usando el formulario de arriba.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Dirección
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Notas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buildings.map((building) => (
                    <tr
                      key={building.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        editingId === building.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{building.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {building.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {building.notes || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(building)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(building.id, building.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
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
          )}
        </div>
      </div>
    </div>
  );
}
