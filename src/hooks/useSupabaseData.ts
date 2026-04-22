import { useState, useEffect, useCallback } from 'react';
import { propertiesService } from '../services/properties.service';
import { tenantsService } from '../services/tenants.service';
import { receiptsService } from '../services/receipts.service';
import { cashMovementsService } from '../services/cashMovements.service';
import { Property, Tenant, Receipt, CashMovement } from '../App';

interface SupabaseData {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  cashMovements: CashMovement[];
  loading: boolean;
  error: string | null;
}

const convertPropertyFromDB = (dbProperty: any): Property => {
  return {
    id: parseInt(dbProperty.id.replace(/-/g, '').substring(0, 13), 16),
    name: dbProperty.name || '',
    type: dbProperty.type || 'departamento',
    building: dbProperty.building || '',
    address: dbProperty.address || '',
    rent: Number(dbProperty.rent) || 0,
    rentCurrency: dbProperty.rent_currency || 'ARS',
    expenses: Number(dbProperty.expenses) || 0,
    expensesCurrency: dbProperty.expenses_currency || 'ARS',
    nextUpdateDate: dbProperty.next_update_date || '',
    tenant: dbProperty.tenant_name || null,
    status: dbProperty.status || 'disponible',
    contractStart: dbProperty.contract_start || '',
    contractEnd: dbProperty.contract_end || '',
    lastUpdated: dbProperty.last_updated || '',
    notes: dbProperty.notes || ''
  };
};

const convertTenantFromDB = (dbTenant: any): Tenant => {
  return {
    id: parseInt(dbTenant.id.replace(/-/g, '').substring(0, 13), 16),
    name: dbTenant.name || '',
    email: dbTenant.email || '',
    phone: dbTenant.phone || '',
    propertyId: dbTenant.property_id ? parseInt(dbTenant.property_id.replace(/-/g, '').substring(0, 13), 16) : null,
    property: dbTenant.properties?.name || '',
    contractStart: dbTenant.contract_start || '',
    contractEnd: dbTenant.contract_end || '',
    deposit: Number(dbTenant.deposit) || 0,
    guarantor: {
      name: dbTenant.guarantor_name || '',
      email: dbTenant.guarantor_email || '',
      phone: dbTenant.guarantor_phone || ''
    },
    balance: Number(dbTenant.balance) || 0,
    status: dbTenant.status || 'activo'
  };
};

const convertReceiptFromDB = (dbReceipt: any): Receipt => {
  return {
    id: parseInt(dbReceipt.id.replace(/-/g, '').substring(0, 13), 16),
    receiptNumber: dbReceipt.receipt_number || '',
    tenant: dbReceipt.tenant_name || '',
    property: dbReceipt.property_name || '',
    building: dbReceipt.building || '',
    month: dbReceipt.month || '',
    year: dbReceipt.year || new Date().getFullYear(),
    rent: Number(dbReceipt.rent) || 0,
    expenses: Number(dbReceipt.expenses) || 0,
    otherCharges: dbReceipt.other_charges || [],
    previousBalance: Number(dbReceipt.previous_balance) || 0,
    total: Number(dbReceipt.total) || 0,
    paidAmount: Number(dbReceipt.paid_amount) || 0,
    remainingBalance: Number(dbReceipt.remaining_balance) || 0,
    currency: dbReceipt.currency || 'ARS',
    paymentMethod: dbReceipt.payment_method || 'efectivo',
    status: dbReceipt.status || 'borrador',
    dueDate: dbReceipt.due_date || '',
    createdDate: dbReceipt.created_date || ''
  };
};

const convertCashMovementFromDB = (dbMovement: any): CashMovement => {
  return {
    id: parseInt(dbMovement.id.replace(/-/g, '').substring(0, 13), 16),
    type: dbMovement.type || 'income',
    description: dbMovement.description || '',
    amount: Number(dbMovement.amount) || 0,
    currency: dbMovement.currency || 'ARS',
    date: dbMovement.date || '',
    tenant: dbMovement.tenant_name || undefined,
    property: dbMovement.property_name || undefined,
    paymentMethod: dbMovement.payment_method || undefined,
    deliveryType: dbMovement.delivery_type || undefined
  };
};

export const useSupabaseData = (): SupabaseData & {
  refetch: () => Promise<void>;
  syncFromLocalStorage: () => Promise<void>;
} => {
  const [data, setData] = useState<SupabaseData>({
    properties: [],
    tenants: [],
    receipts: [],
    cashMovements: [],
    loading: true,
    error: null
  });

  const fetchAllData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [propertiesData, tenantsData, receiptsData, cashMovementsData] = await Promise.all([
        propertiesService.getAll(),
        tenantsService.getAll(),
        receiptsService.getAll(),
        cashMovementsService.getAll()
      ]);

      setData({
        properties: propertiesData.map(convertPropertyFromDB),
        tenants: tenantsData.map(convertTenantFromDB),
        receipts: receiptsData.map(convertReceiptFromDB),
        cashMovements: cashMovementsData.map(convertCashMovementFromDB),
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Error desconocido'
      }));
    }
  }, []);

  const syncFromLocalStorage = useCallback(async () => {
    try {
      const localProperties = JSON.parse(localStorage.getItem('properties') || '[]');
      const localTenants = JSON.parse(localStorage.getItem('tenants') || '[]');
      const localReceipts = JSON.parse(localStorage.getItem('receipts') || '[]');
      const localCashMovements = JSON.parse(localStorage.getItem('cashMovements') || '[]');

      if (localProperties.length === 0 && localTenants.length === 0 &&
          localReceipts.length === 0 && localCashMovements.length === 0) {
        return;
      }

      for (const prop of localProperties) {
        await propertiesService.create({
          name: prop.name,
          type: prop.type,
          building: prop.building,
          address: prop.address,
          rent: prop.rent,
          rent_currency: prop.rentCurrency || 'ARS',
          expenses: prop.expenses,
          expenses_currency: prop.expensesCurrency || 'ARS',
          next_update_date: prop.nextUpdateDate || null,
          tenant_name: prop.tenant || null,
          status: prop.status,
          contract_start: prop.contractStart || null,
          contract_end: prop.contractEnd || null,
          last_updated: prop.lastUpdated,
          notes: prop.notes
        });
      }

      for (const tenant of localTenants) {
        await tenantsService.create({
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          property_id: null,
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

      for (const receipt of localReceipts) {
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
      }

      for (const movement of localCashMovements) {
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

      localStorage.removeItem('properties');
      localStorage.removeItem('tenants');
      localStorage.removeItem('receipts');
      localStorage.removeItem('cashMovements');

      await fetchAllData();
    } catch (err) {
      console.error('Error syncing from localStorage:', err);
    }
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    ...data,
    refetch: fetchAllData,
    syncFromLocalStorage
  };
};
