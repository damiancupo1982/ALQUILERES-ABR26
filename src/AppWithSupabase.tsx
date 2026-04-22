import React, { useState, useEffect, useRef } from 'react';
import { Building2, Users, Receipt, Calendar, BarChart3, Search, Bell, Wallet, RefreshCw, Database, AlertCircle, Download, Upload } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PropertiesManager from './components/PropertiesManager';
import TenantsManager from './components/TenantsManager';
import ReceiptsManager from './components/ReceiptsManager';
import PaymentsHistory from './components/PaymentsHistory';
import CashRegister from './components/CashRegister';
import { useSupabaseData } from './hooks/useSupabaseData';
import { propertiesService } from './services/properties.service';
import { tenantsService } from './services/tenants.service';
import { receiptsService } from './services/receipts.service';
import { cashMovementsService } from './services/cashMovements.service';
import { autoReceiptsService } from './services/autoReceipts.service';
import { buildingsService } from './services/buildings.service';
import { supabase } from './lib/supabase';
import { tenantAdjustmentsService } from './services/tenantAdjustments.service';
import { Property, Tenant, Receipt as ReceiptType, CashMovement, TenantAdjustment } from './App';

type TabType = 'dashboard' | 'properties' | 'tenants' | 'receipts' | 'history' | 'cash';

function AppWithSupabase() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { properties, tenants, receipts, cashMovements, adjustments, loading, error, refetch, syncFromLocalStorage } = useSupabaseData();
  const [syncing, setSyncing] = useState(false);
  const [showSyncButton, setShowSyncButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleAddAdjustment = async (adjustment: Omit<TenantAdjustment, 'id'>) => {
    await tenantAdjustmentsService.create({
      tenant_name: adjustment.tenant,
      date: adjustment.date,
      amount: adjustment.amount,
      reason: adjustment.reason,
    });
    await refetch();
  };

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
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
      showNotif('success', `Exportado: ${buildings.length} edificios, ${properties.length} propiedades, ${tenants.length} inquilinos, ${receipts.length} recibos, ${cashMovements.length} movimientos.`);
    } catch {
      showNotif('error', 'Error al exportar los datos.');
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
        await refetch();
        showNotif('success', `Restaurado: ${importedData.buildings?.length || 0} edificios, ${importedData.properties?.length || 0} propiedades, ${importedData.tenants?.length || 0} inquilinos, ${importedData.receipts?.length || 0} recibos, ${importedData.cashMovements?.length || 0} movimientos.`);
        event.target.value = '';
      } catch (err) {
        showNotif('error', err instanceof Error ? err.message : 'Error al procesar el archivo.');
        event.target.value = '';
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => { showNotif('error', 'Error al leer el archivo.'); event.target.value = ''; setIsImporting(false); };
    reader.readAsText(file);
  };

  useEffect(() => {
    const hasLocalData =
      localStorage.getItem('properties') ||
      localStorage.getItem('tenants') ||
      localStorage.getItem('receipts') ||
      localStorage.getItem('cashMovements');

    setShowSyncButton(!!hasLocalData);
  }, []);

  useEffect(() => {
    const checkAndGenerateReceipts = async () => {
      if (!loading && tenants.length > 0) {
        try {
          const generated = await autoReceiptsService.generateMonthlyReceipts();
          if (generated > 0) {
            await refetch();
          }
        } catch (error) {
          console.error('Error auto-generating receipts:', error);
        }
      }
    };

    checkAndGenerateReceipts();
  }, [loading, tenants.length, refetch]);

  const handleSyncFromLocal = async () => {
    if (confirm('¿Deseas sincronizar los datos de localStorage con Supabase? Esto agregará todos los datos locales a la base de datos.')) {
      setSyncing(true);
      await syncFromLocalStorage();
      setSyncing(false);
      setShowSyncButton(false);
    }
  };

  const setProperties = async (updater: React.SetStateAction<Property[]>) => {
    const newProperties = typeof updater === 'function' ? updater(properties) : updater;

    const oldProperties = properties;

    for (const prop of newProperties) {
      const oldProp = oldProperties.find(p => p.id === prop.id);

      if (!oldProp) {
        await propertiesService.create({
          name: prop.name,
          type: prop.type,
          building: prop.building,
          address: prop.address,
          rent: prop.rent,
          rent_currency: prop.rentCurrency,
          expenses: prop.expenses,
          expenses_currency: prop.expensesCurrency,
          next_update_date: prop.nextUpdateDate || null,
          tenant_name: prop.tenant || null,
          status: prop.status,
          contract_start: prop.contractStart || null,
          contract_end: prop.contractEnd || null,
          last_updated: prop.lastUpdated,
          notes: prop.notes
        });
      } else if (JSON.stringify(oldProp) !== JSON.stringify(prop)) {
        const dbProperties = await propertiesService.getAll();
        const dbProp = dbProperties.find(p =>
          p.name === oldProp.name &&
          p.building === oldProp.building
        );

        if (dbProp) {
          await propertiesService.update(dbProp.id, {
            name: prop.name,
            type: prop.type,
            building: prop.building,
            address: prop.address,
            rent: prop.rent,
            rent_currency: prop.rentCurrency,
            expenses: prop.expenses,
            expenses_currency: prop.expensesCurrency,
            next_update_date: prop.nextUpdateDate || null,
            tenant_name: prop.tenant || null,
            status: prop.status,
            contract_start: prop.contractStart || null,
            contract_end: prop.contractEnd || null,
            last_updated: prop.lastUpdated,
            notes: prop.notes
          });
        }
      }
    }

    for (const oldProp of oldProperties) {
      const stillExists = newProperties.find(p => p.id === oldProp.id);
      if (!stillExists) {
        const dbProperties = await propertiesService.getAll();
        const dbProp = dbProperties.find(p =>
          p.name === oldProp.name &&
          p.building === oldProp.building
        );

        if (dbProp) {
          await propertiesService.delete(dbProp.id);
        }
      }
    }

    await refetch();
  };

  const setTenants = async (updater: React.SetStateAction<Tenant[]>) => {
    const newTenants = typeof updater === 'function' ? updater(tenants) : updater;

    const oldTenants = tenants;

    for (const tenant of newTenants) {
      const oldTenant = oldTenants.find(t => t.id === tenant.id);

      if (!oldTenant) {
        const dbProperties = await propertiesService.getAll();
        let dbPropertyId = null;

        if (tenant.propertyId) {
          const property = properties.find(p => p.id === tenant.propertyId);
          if (property) {
            const dbProperty = dbProperties.find(p =>
              p.name === property.name &&
              p.building === property.building
            );
            if (dbProperty) {
              dbPropertyId = dbProperty.id;
            }
          }
        }

        const newTenant = await tenantsService.create({
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          property_id: dbPropertyId,
          contract_start: tenant.contractStart,
          contract_end: tenant.contractEnd,
          deposit: tenant.deposit,
          guarantor_name: tenant.guarantor.name,
          guarantor_email: tenant.guarantor.email,
          guarantor_phone: tenant.guarantor.phone,
          balance: tenant.balance,
          status: tenant.status
        });

        if (newTenant?.id) {
          await autoReceiptsService.generateReceiptForNewTenant(newTenant.id);
        }
      } else if (JSON.stringify(oldTenant) !== JSON.stringify(tenant)) {
        const dbTenants = await tenantsService.getAll();
        const dbTenant = dbTenants.find(t =>
          t.name === oldTenant.name &&
          t.email === oldTenant.email
        );

        if (dbTenant) {
          const dbProperties = await propertiesService.getAll();
          let dbPropertyId = null;

          if (tenant.propertyId) {
            const property = properties.find(p => p.id === tenant.propertyId);
            if (property) {
              const dbProperty = dbProperties.find(p =>
                p.name === property.name &&
                p.building === property.building
              );
              if (dbProperty) {
                dbPropertyId = dbProperty.id;
              }
            }
          }

          await tenantsService.update(dbTenant.id, {
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            property_id: dbPropertyId,
            contract_start: tenant.contractStart,
            contract_end: tenant.contractEnd,
            deposit: tenant.deposit,
            guarantor_name: tenant.guarantor.name,
            guarantor_email: tenant.guarantor.email,
            guarantor_phone: tenant.guarantor.phone,
            balance: tenant.balance,
            status: tenant.status
          });
        }
      }
    }

    for (const oldTenant of oldTenants) {
      const stillExists = newTenants.find(t => t.id === oldTenant.id);
      if (!stillExists) {
        const dbTenants = await tenantsService.getAll();
        const dbTenant = dbTenants.find(t =>
          t.name === oldTenant.name &&
          t.email === oldTenant.email
        );

        if (dbTenant) {
          await tenantsService.delete(dbTenant.id);
        }
      }
    }

    await refetch();
  };

  const setReceipts = async (updater: React.SetStateAction<ReceiptType[]>) => {
    const newReceipts = typeof updater === 'function' ? updater(receipts) : updater;

    const oldReceipts = receipts;

    for (const receipt of newReceipts) {
      const oldReceipt = oldReceipts.find(r => r.id === receipt.id);

      if (!oldReceipt) {
        await receiptsService.create({
          receipt_number: receipt.receiptNumber,
          tenant_name: receipt.tenant,
          property_name: receipt.property,
          building: receipt.building,
          month: receipt.month,
          year: receipt.year,
          rent: receipt.rent,
          expenses: receipt.expenses,
          other_charges: receipt.otherCharges,
          previous_balance: receipt.previousBalance,
          total: receipt.total,
          paid_amount: receipt.paidAmount,
          remaining_balance: receipt.remainingBalance,
          currency: receipt.currency,
          payment_method: receipt.paymentMethod,
          status: receipt.status,
          due_date: receipt.dueDate,
          created_date: receipt.createdDate
        });
      } else if (JSON.stringify(oldReceipt) !== JSON.stringify(receipt)) {
        const dbReceipts = await receiptsService.getAll();
        const dbReceipt = dbReceipts.find(r => r.receipt_number === receipt.receiptNumber);

        if (dbReceipt) {
          await receiptsService.update(dbReceipt.id, {
            tenant_name: receipt.tenant,
            property_name: receipt.property,
            building: receipt.building,
            month: receipt.month,
            year: receipt.year,
            rent: receipt.rent,
            expenses: receipt.expenses,
            other_charges: receipt.otherCharges,
            previous_balance: receipt.previousBalance,
            total: receipt.total,
            paid_amount: receipt.paidAmount,
            remaining_balance: receipt.remainingBalance,
            currency: receipt.currency,
            payment_method: receipt.paymentMethod,
            status: receipt.status,
            due_date: receipt.dueDate,
            created_date: receipt.createdDate
          });
        }
      }
    }

    for (const oldReceipt of oldReceipts) {
      const stillExists = newReceipts.find(r => r.id === oldReceipt.id);
      if (!stillExists) {
        const dbReceipts = await receiptsService.getAll();
        const dbReceipt = dbReceipts.find(r => r.receipt_number === oldReceipt.receiptNumber);

        if (dbReceipt) {
          await receiptsService.delete(dbReceipt.id);
        }
      }
    }

    await refetch();
  };

  const setCashMovements = async (updater: React.SetStateAction<CashMovement[]>) => {
    const newMovements = typeof updater === 'function' ? updater(cashMovements) : updater;

    const oldMovements = cashMovements;

    for (const movement of newMovements) {
      const oldMovement = oldMovements.find(m => m.id === movement.id);

      if (!oldMovement) {
        await cashMovementsService.create({
          type: movement.type,
          description: movement.description,
          amount: movement.amount,
          currency: movement.currency,
          date: movement.date,
          tenant_name: movement.tenant || null,
          property_name: movement.property || null,
          payment_method: movement.paymentMethod || null,
          delivery_type: movement.deliveryType || null
        });
      }
    }

    for (const oldMovement of oldMovements) {
      const stillExists = newMovements.find(m => m.id === oldMovement.id);
      if (!stillExists) {
        const dbMovements = await cashMovementsService.getAll();
        const dbMovement = dbMovements.find(m =>
          m.description === oldMovement.description &&
          m.date === oldMovement.date &&
          m.amount === oldMovement.amount
        );

        if (dbMovement) {
          await cashMovementsService.delete(dbMovement.id);
        }
      }
    }

    await refetch();
  };

  const addCashMovement = async (movement: Omit<CashMovement, 'id'>) => {
    await cashMovementsService.create({
      type: movement.type,
      description: movement.description,
      amount: movement.amount,
      currency: movement.currency,
      date: movement.date,
      tenant_name: movement.tenant || null,
      property_name: movement.property || null,
      payment_method: movement.paymentMethod || null,
      delivery_type: movement.deliveryType || null
    });
    await refetch();
  };

  const updateTenantBalance = async (tenantName: string, newBalance: number) => {
    const dbTenants = await tenantsService.getAll();
    const dbTenant = dbTenants.find(t => t.name === tenantName);

    if (dbTenant) {
      await tenantsService.updateBalance(dbTenant.id, newBalance);
      await refetch();
    }
  };

  const updatePropertyTenant = async (propertyId: number | null, tenantName: string | null, oldPropertyId?: number | null) => {
    const dbProperties = await propertiesService.getAll();

    if (oldPropertyId) {
      const oldProp = properties.find(p => p.id === oldPropertyId);
      if (oldProp) {
        const dbOldProp = dbProperties.find(p =>
          p.name === oldProp.name &&
          p.building === oldProp.building
        );
        if (dbOldProp) {
          await propertiesService.updateTenantAssignment(dbOldProp.id, null);
        }
      }
    }

    if (propertyId) {
      const newProp = properties.find(p => p.id === propertyId);
      if (newProp) {
        const dbNewProp = dbProperties.find(p =>
          p.name === newProp.name &&
          p.building === newProp.building
        );
        if (dbNewProp) {
          await propertiesService.updateTenantAssignment(dbNewProp.id, tenantName);
        }
      }
    }

    await refetch();
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'properties', label: 'Propiedades', icon: Building2 },
    { id: 'tenants', label: 'Inquilinos', icon: Users },
    { id: 'receipts', label: 'Recibos', icon: Receipt },
    { id: 'history', label: 'Historial', icon: Calendar },
    { id: 'cash', label: 'Arqueo', icon: Wallet },
  ] as const;

  const filterData = <T extends Record<string, any>>(data: T[], searchFields: (keyof T)[]): T[] => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  };

  const getFilteredData = () => {
    switch (activeTab) {
      case 'properties':
        return {
          properties: filterData(properties, ['name', 'building', 'address', 'type', 'tenant', 'status'])
        };
      case 'tenants':
        return {
          tenants: filterData(tenants, ['name', 'email', 'phone', 'status'])
        };
      case 'receipts':
        return {
          receipts: filterData(receipts, ['tenant', 'property', 'building', 'receiptNumber', 'status', 'month'])
        };
      case 'history':
        return {
          receipts: filterData(receipts, ['tenant', 'property', 'building', 'receiptNumber', 'status', 'month'])
        };
      case 'cash':
        return {
          cashMovements: filterData(cashMovements, ['description', 'type', 'tenant', 'property', 'paymentMethod'])
        };
      default:
        return { properties, tenants, receipts, cashMovements };
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando datos desde Supabase...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Error al cargar los datos</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }

    const filtered = getFilteredData();

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          tenants={tenants}
          receipts={receipts}
          properties={properties}
          setActiveTab={setActiveTab}
        />;
      case 'properties':
        return <PropertiesManager properties={filtered.properties || properties} setProperties={setProperties} />;
      case 'tenants':
        return <TenantsManager
          tenants={filtered.tenants || tenants}
          setTenants={setTenants}
          properties={properties}
          receipts={receipts}
          updatePropertyTenant={updatePropertyTenant}
          adjustments={adjustments}
          onAddAdjustment={handleAddAdjustment}
        />;
      case 'receipts':
        return <ReceiptsManager
          tenants={tenants}
          properties={properties}
          receipts={filtered.receipts || receipts}
          setReceipts={setReceipts}
          addCashMovement={addCashMovement}
          updateTenantBalance={updateTenantBalance}
        />;
      case 'history':
        return <PaymentsHistory receipts={filtered.receipts || receipts} properties={properties} tenants={tenants} />;
      case 'cash':
        return <CashRegister
          cashMovements={filtered.cashMovements || cashMovements}
          setCashMovements={setCashMovements}
        />;
      default:
        return <Dashboard tenants={tenants} receipts={receipts} properties={properties} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Alquileres</h1>
                <p className="text-xs text-green-600">DC1 - FIRESTONE DC SISTEMA DE ALQUILERES</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {showSyncButton && (
                <button
                  onClick={handleSyncFromLocal}
                  disabled={syncing}
                  className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">{syncing ? 'Sincronizando...' : 'Sincronizar datos locales'}</span>
                </button>
              )}
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
              <button
                onClick={refetch}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Recargar datos"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {notification && (
        <div className={`fixed top-20 right-6 z-50 max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${notification.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
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

export default AppWithSupabase;
