import { supabase } from '../lib/supabase';
import { tenantsService } from './tenants.service';
import { receiptsService } from './receipts.service';
import { propertiesService } from './properties.service';

const LAST_GENERATION_KEY = 'lastReceiptGeneration';

const getMonthName = (monthIndex: number): string => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[monthIndex];
};

const isContractActive = (contractStart: string, contractEnd: string, currentDate: Date): boolean => {
  const start = new Date(contractStart);
  const end = new Date(contractEnd);
  return currentDate >= start && currentDate <= end;
};

const generateReceiptNumber = (year: number, month: number, sequence: number): string => {
  const monthStr = (month + 1).toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(3, '0');
  return `REC-${year}-${monthStr}${seqStr}`;
};

export const autoReceiptsService = {
  async generateMonthlyReceipts(): Promise<number> {
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (today !== 1) {
      return 0;
    }

    const lastGeneration = localStorage.getItem(LAST_GENERATION_KEY);
    const currentMonthKey = `${currentYear}-${currentMonth}`;

    if (lastGeneration === currentMonthKey) {
      return 0;
    }

    try {
      const [tenants, properties, existingReceipts] = await Promise.all([
        tenantsService.getAll(),
        propertiesService.getAll(),
        receiptsService.getAll()
      ]);

      let generatedCount = 0;
      const monthName = getMonthName(currentMonth);

      const existingReceiptsThisMonth = existingReceipts.filter(r =>
        r.year === currentYear && r.month === monthName
      );
      let sequenceNumber = existingReceiptsThisMonth.length + 1;

      for (const tenant of tenants) {
        if (!tenant.contract_start || !tenant.contract_end) {
          continue;
        }

        if (!isContractActive(tenant.contract_start, tenant.contract_end, now)) {
          continue;
        }

        const alreadyHasReceipt = existingReceiptsThisMonth.some(r =>
          r.tenant_name === tenant.name
        );

        if (alreadyHasReceipt) {
          continue;
        }

        let propertyData = null;
        if (tenant.property_id) {
          propertyData = properties.find(p => p.id === tenant.property_id);
        }

        if (!propertyData) {
          continue;
        }

        const rent = Number(propertyData.rent) || 0;
        const expenses = Number(propertyData.expenses) || 0;
        const previousBalance = Number(tenant.balance) || 0;
        const total = rent + expenses + previousBalance;

        const receiptNumber = generateReceiptNumber(currentYear, currentMonth, sequenceNumber);
        sequenceNumber++;

        const dueDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`;
        const createdDate = now.toISOString().split('T')[0];

        await receiptsService.create({
          receipt_number: receiptNumber,
          tenant_name: tenant.name,
          property_name: propertyData.name,
          building: propertyData.building || '',
          month: monthName,
          year: currentYear,
          rent: rent,
          expenses: expenses,
          other_charges: [],
          previous_balance: previousBalance,
          total: total,
          paid_amount: 0,
          remaining_balance: total,
          currency: propertyData.rent_currency || 'ARS',
          payment_method: 'efectivo',
          status: 'borrador',
          due_date: dueDate,
          created_date: createdDate
        });

        generatedCount++;
      }

      if (generatedCount > 0) {
        localStorage.setItem(LAST_GENERATION_KEY, currentMonthKey);
      }

      return generatedCount;
    } catch (error) {
      console.error('Error generating monthly receipts:', error);
      throw error;
    }
  },

  async forceGenerateForCurrentMonth(): Promise<number> {
    localStorage.removeItem(LAST_GENERATION_KEY);
    return this.generateMonthlyReceipts();
  },

  async generateReceiptForNewTenant(tenantId: string): Promise<boolean> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const [tenants, properties, existingReceipts] = await Promise.all([
        tenantsService.getAll(),
        propertiesService.getAll(),
        receiptsService.getAll()
      ]);

      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant || !tenant.contract_start || !tenant.contract_end) {
        return false;
      }

      if (!isContractActive(tenant.contract_start, tenant.contract_end, now)) {
        return false;
      }

      const monthName = getMonthName(currentMonth);
      const existingReceiptsThisMonth = existingReceipts.filter(r =>
        r.year === currentYear && r.month === monthName
      );

      const alreadyHasReceipt = existingReceiptsThisMonth.some(r =>
        r.tenant_name === tenant.name
      );

      if (alreadyHasReceipt) {
        return false;
      }

      let propertyData = null;
      if (tenant.property_id) {
        propertyData = properties.find(p => p.id === tenant.property_id);
      }

      if (!propertyData) {
        return false;
      }

      const rent = Number(propertyData.rent) || 0;
      const expenses = Number(propertyData.expenses) || 0;
      const previousBalance = Number(tenant.balance) || 0;
      const total = rent + expenses + previousBalance;

      const sequenceNumber = existingReceiptsThisMonth.length + 1;
      const receiptNumber = generateReceiptNumber(currentYear, currentMonth, sequenceNumber);
      const dueDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-10`;
      const createdDate = now.toISOString().split('T')[0];

      await receiptsService.create({
        receipt_number: receiptNumber,
        tenant_name: tenant.name,
        property_name: propertyData.name,
        building: propertyData.building || '',
        month: monthName,
        year: currentYear,
        rent: rent,
        expenses: expenses,
        other_charges: [],
        previous_balance: previousBalance,
        total: total,
        paid_amount: 0,
        remaining_balance: total,
        currency: propertyData.rent_currency || 'ARS',
        payment_method: 'efectivo',
        status: 'borrador',
        due_date: dueDate,
        created_date: createdDate
      });

      return true;
    } catch (error) {
      console.error('Error generating receipt for new tenant:', error);
      return false;
    }
  }
};
