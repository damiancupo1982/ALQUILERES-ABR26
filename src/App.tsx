import React, { useState, useEffect, useRef } from 'react';
import { Building2, Users, Receipt, Calendar, BarChart3, Plus, Bell, Wallet, Download, Upload } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PropertiesManager from './components/PropertiesManager';
import TenantsManager from './components/TenantsManager';
import ReceiptsManager from './components/ReceiptsManager';
import PaymentsHistory from './components/PaymentsHistory';
import CashRegister from './components/CashRegister';
import { buildingsService } from './services/buildings.service';
import { supabase } from './lib/supabase';

type TabType = 'dashboard' | 'properties' | 'tenants' | 'receipts' | 'history' | 'cash';

// Interfaces globales
export interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  propertyId: number | null;
  property: string; // Mantenemos para compatibilidad
  contractStart: string;
  contractEnd: string;
  deposit: number;
  guarantor: {
    name: string;
    email: string;
    phone: string;
  };
  balance: number;
  status: 'activo' | 'vencido' | 'pendiente';
}

export interface Property {
  id: number;
  name: string;
  type: 'departamento' | 'galpon' | 'local' | 'oficina' | 'otro';
  building: string;
  address: string;
  rent: number;
  rentCurrency: 'ARS' | 'USD';
  expenses: number;
  expensesCurrency: 'ARS' | 'USD';
  nextUpdateDate: string;
  tenant: string | null;
  status: 'ocupado' | 'disponible' | 'mantenimiento';
  contractStart: string;
  contractEnd: string;
  lastUpdated: string;
  notes: string;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  tenant: string;
  property: string;
  building: string;
  month: string;
  year: number;
  rent: number;
  expenses: number;
  otherCharges: { description: string; amount: number }[];
  previousBalance: number;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  currency: 'ARS' | 'USD';
  paymentMethod: 'efectivo' | 'transferencia' | 'dolares';
  status: 'pagado' | 'pendiente' | 'vencido' | 'borrador';
  dueDate: string;
  createdDate: string;
}

export interface CashMovement {
  id: number;
  type: 'income' | 'delivery';
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  date: string;
  tenant?: string;
  property?: string;
  paymentMethod?: 'efectivo' | 'transferencia' | 'dolares';
  deliveryType?: 'propietario' | 'comision' | 'gasto';
}

export interface TenantAdjustment {
  id: number;
  tenant: string;
  date: string;
  amount: number;
  reason: string;
  dbId?: string;
  tenantDbId?: string | null;
}

// Funciones para localStorage
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const buildings = await buildingsService.getAll();
      const dataToExport = {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        buildings,
        properties,
        tenants,
        receipts,
        cashMovements,
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alquileres_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', `Backup exportado: ${buildings.length} edificios, ${properties.length} propiedades, ${tenants.length} inquilinos, ${receipts.length} recibos, ${cashMovements.length} movimientos.`);
    } catch {
      showNotification('error', 'Error al exportar los datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsImporting(true);
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (!importedData.version || !importedData.properties || !importedData.tenants) {
          throw new Error('Archivo invalido: faltan datos requeridos');
        }
        const currentBuildings = await buildingsService.getAll();
        const hasData = properties.length > 0 || tenants.length > 0 || receipts.length > 0 || cashMovements.length > 0 || currentBuildings.length > 0;
        if (hasData) {
          const ok = confirm(
            'ADVERTENCIA: Esta accion reemplazara TODOS los datos actuales.\n\n' +
            `Actuales: ${currentBuildings.length} edificios, ${properties.length} propiedades, ${tenants.length} inquilinos, ${receipts.length} recibos, ${cashMovements.length} movimientos.\n\n` +
            `A importar: ${importedData.buildings?.length || 0} edificios, ${importedData.properties?.length || 0} propiedades, ${importedData.tenants?.length || 0} inquilinos, ${importedData.receipts?.length || 0} recibos, ${importedData.cashMovements?.length || 0} movimientos.\n\n` +
            '¿Desea continuar?'
          );
          if (!ok) { event.target.value = ''; setIsImporting(false); return; }
        }
        if (importedData.buildings?.length > 0) {
          await supabase.from('buildings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          for (const b of importedData.buildings) {
            const { error } = await supabase.from('buildings').insert({ id: b.id, name: b.name, address: b.address, notes: b.notes, created_at: b.created_at, updated_at: b.updated_at });
            if (error) await supabase.from('buildings').insert({ name: b.name, address: b.address, notes: b.notes });
          }
        }
        setProperties(importedData.properties || []);
        setTenants(importedData.tenants || []);
        setReceipts(importedData.receipts || []);
        setCashMovements(importedData.cashMovements || []);
        showNotification('success', `Restaurado: ${importedData.buildings?.length || 0} edificios, ${importedData.properties?.length || 0} propiedades, ${importedData.tenants?.length || 0} inquilinos, ${importedData.receipts?.length || 0} recibos, ${importedData.cashMovements?.length || 0} movimientos.`);
        event.target.value = '';
      } catch (err) {
        showNotification('error', err instanceof Error ? err.message : 'Error al procesar el archivo.');
        event.target.value = '';
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => { showNotification('error', 'Error al leer el archivo.'); event.target.value = ''; setIsImporting(false); };
    reader.readAsText(file);
  };
  
  // Estados globales con persistencia
  const [properties, setProperties] = useState<Property[]>(() => 
    loadFromLocalStorage('properties', [
    {
      id: 1,
      name: 'Departamento A-101',
      type: 'departamento',
      building: 'Edificio Central',
      address: 'Av. Corrientes 1234, CABA',
      rent: 25000,
      expenses: 3000,
      tenant: 'Juan Pérez',
      status: 'ocupado',
      contractStart: '2024-01-15',
      contractEnd: '2025-01-15',
      lastUpdated: '2025-01-15',
      notes: 'Contrato renovado automáticamente'
    },
    {
      id: 2,
      name: 'Galpón B-205',
      type: 'galpon',
      building: 'Complejo Industrial',
      address: 'Parque Industrial Sur, Lote 15',
      rent: 45000,
      expenses: 5000,
      tenant: 'María García',
      status: 'ocupado',
      contractStart: '2023-06-01',
      contractEnd: '2025-06-01',
      lastUpdated: '2024-12-01',
      notes: 'Inquilino de confianza, siempre paga puntual'
    },
    {
      id: 3,
      name: 'Local C-303',
      type: 'local',
      building: 'Centro Comercial',
      address: 'Av. Santa Fe 2567, CABA',
      rent: 35000,
      expenses: 4000,
      tenant: null,
      status: 'disponible',
      contractStart: '',
      contractEnd: '',
      lastUpdated: '2025-01-10',
      notes: 'Disponible para alquiler inmediato'
    },
    {
      id: 4,
      name: 'Oficina D-401',
      type: 'oficina',
      building: 'Torre Empresarial',
      address: 'Av. Libertador 5678, CABA',
      rent: 28000,
      expenses: 3500,
      tenant: null,
      status: 'disponible',
      contractStart: '',
      contractEnd: '',
      lastUpdated: '2025-01-12',
      notes: 'Oficina con vista panorámica'
    }
  ])
  );

  const [tenants, setTenants] = useState<Tenant[]>(() =>
    loadFromLocalStorage('tenants', [
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      phone: '+54 11 1234-5678',
      propertyId: 1,
      property: 'Departamento A-101',
      contractStart: '2024-01-15',
      contractEnd: '2025-01-15',
      deposit: 50000,
      guarantor: {
        name: 'María Pérez',
        email: 'maria.perez@email.com',
        phone: '+54 11 1234-5679'
      },
      balance: 0,
      status: 'activo'
    },
    {
      id: 2,
      name: 'María García',
      email: 'maria.garcia@email.com',
      phone: '+54 11 8765-4321',
      propertyId: 2,
      property: 'Galpón B-205',
      contractStart: '2023-06-01',
      contractEnd: '2025-06-01',
      deposit: 90000,
      guarantor: {
        name: 'Carlos García',
        email: 'carlos.garcia@email.com',
        phone: '+54 11 8765-4322'
      },
      balance: 15000,
      status: 'activo'
    },
    {
      id: 3,
      name: 'Carlos López',
      email: 'carlos.lopez@email.com',
      phone: '+54 11 5555-0000',
      propertyId: null,
      property: 'Local C-303',
      contractStart: '2024-11-01',
      contractEnd: '2025-01-20',
      deposit: 70000,
      guarantor: {
        name: 'Ana López',
        email: 'ana.lopez@email.com',
        phone: '+54 11 5555-0001'
      },
      balance: 22000,
      status: 'vencido'
    }
  ])
  );

  const [receipts, setReceipts] = useState<Receipt[]>(() =>
    loadFromLocalStorage('receipts', [
    {
      id: 1,
      receiptNumber: 'REC-2025-001',
      tenant: 'Juan Pérez',
      property: 'Departamento A-101',
      building: 'Edificio Central',
      month: 'Enero',
      year: 2025,
      rent: 25000,
      expenses: 3000,
      otherCharges: [
        { description: 'Limpieza adicional', amount: 1500 }
      ],
      previousBalance: 0,
      total: 29500,
      paidAmount: 29500,
      remainingBalance: 0,
      currency: 'ARS',
      paymentMethod: 'transferencia',
      status: 'pagado',
      dueDate: '2025-01-10',
      createdDate: '2025-01-01'
    }
  ])
  );

  const [tenantAdjustments, setTenantAdjustments] = useState<TenantAdjustment[]>(() =>
    loadFromLocalStorage('tenantAdjustments', [])
  );

  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() =>
    loadFromLocalStorage('cashMovements', [
    {
      id: 1,
      type: 'income',
      description: 'Pago alquiler - Juan Pérez',
      amount: 29500,
      currency: 'ARS',
      date: '2025-01-15',
      tenant: 'Juan Pérez',
      property: 'Departamento A-101'
    },
    {
      id: 2,
      type: 'delivery',
      description: 'Entrega al propietario',
      amount: 15000,
      currency: 'ARS',
      date: '2025-01-10'
    },
    {
      id: 3,
      type: 'income',
      description: 'Pago alquiler - Carlos López',
      amount: 800,
      currency: 'USD',
      date: '2025-01-08',
      tenant: 'Carlos López',
      property: 'Local C-303'
    }
  ])
  );

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    saveToLocalStorage('properties', properties);
  }, [properties]);

  useEffect(() => {
    saveToLocalStorage('tenants', tenants);
  }, [tenants]);

  useEffect(() => {
    saveToLocalStorage('receipts', receipts);
  }, [receipts]);

  useEffect(() => {
    saveToLocalStorage('cashMovements', cashMovements);
  }, [cashMovements]);

  useEffect(() => {
    saveToLocalStorage('tenantAdjustments', tenantAdjustments);
  }, [tenantAdjustments]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'properties', label: 'Propiedades', icon: Building2 },
    { id: 'tenants', label: 'Inquilinos', icon: Users },
    { id: 'receipts', label: 'Recibos', icon: Receipt },
    { id: 'history', label: 'Historial', icon: Calendar },
    { id: 'cash', label: 'Arqueo', icon: Wallet },
  ] as const;

  // Función para agregar movimiento de caja
  const addCashMovement = (movement: Omit<CashMovement, 'id'>) => {
    const newMovement: CashMovement = {
      ...movement,
      id: Date.now()
    };
    setCashMovements(prev => [newMovement, ...prev]);
  };

  // Función para actualizar saldo de inquilino
  const updateTenantBalance = (tenantName: string, newBalance: number) => {
    setTenants(prev => prev.map(tenant => 
      tenant.name === tenantName 
        ? { ...tenant, balance: newBalance }
        : tenant
    ));
  };

  // Función para actualizar propiedad cuando se asigna/cambia inquilino
  const updatePropertyTenant = (propertyId: number | null, tenantName: string | null, oldPropertyId?: number | null) => {
    setProperties(prev => prev.map(property => {
      // Liberar propiedad anterior
      if (oldPropertyId && property.id === oldPropertyId) {
        return { ...property, tenant: null, status: 'disponible' as const };
      }
      // Asignar nueva propiedad
      if (property.id === propertyId) {
        return { ...property, tenant: tenantName, status: 'ocupado' as const };
      }
      return property;
    }));
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          tenants={tenants}
          receipts={receipts}
          properties={properties}
          setActiveTab={setActiveTab}
        />;
      case 'properties':
        return <PropertiesManager properties={properties} setProperties={setProperties} />;
      case 'tenants':
        return <TenantsManager
          tenants={tenants}
          setTenants={setTenants}
          properties={properties}
          receipts={receipts}
          updatePropertyTenant={updatePropertyTenant}
          adjustments={tenantAdjustments}
          setAdjustments={setTenantAdjustments}
        />;
      case 'receipts':
        return <ReceiptsManager
          tenants={tenants}
          properties={properties}
          receipts={receipts}
          setReceipts={setReceipts}
          addCashMovement={addCashMovement}
          updateTenantBalance={updateTenantBalance}
        />;
      case 'history':
        return <PaymentsHistory receipts={receipts} />;
      case 'cash':
        return <CashRegister
          cashMovements={cashMovements}
          setCashMovements={setCashMovements}
        />;
      default:
        return <Dashboard tenants={tenants} receipts={receipts} properties={properties} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Sistema de Alquileres</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                title="Exportar backup completo"
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
              </button>
              <label
                title="Restaurar desde backup"
                className={`flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer ${isImporting ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <Upload className="h-4 w-4" />
                <span>{isImporting ? 'Restaurando...' : 'Restaurar'}</span>
                <input ref={importInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" disabled={isImporting} />
              </label>
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {notification && (
        <div className={`fixed top-20 right-6 z-50 max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${notification.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {notification.type === 'success' ? 'Operacion exitosa' : 'Error'}
          </p>
          <p className={`text-sm mt-1 ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {notification.message}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;