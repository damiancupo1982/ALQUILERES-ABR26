import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const firebaseConfig = {
  apiKey: "AIzaSyDUDEQM1srj8pU2pIvgD0d-VFBEXLkilhA",
  authDomain: "sistema-de-alquileres-364a5.firebaseapp.com",
  projectId: "sistema-de-alquileres-364a5",
  storageBucket: "sistema-de-alquileres-364a5.firebasestorage.app",
  appId: "1:344893816322:web:5851116bb5b7c88970711b"
};

const SUPABASE_URL = 'https://yxwgbixphxicbbiuieep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4d2diaXhwaHhpY2JiaXVpZWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Mzc3MDUsImV4cCI6MjA5MjIxMzcwNX0.JGQN06adHGWoqRRP6ERFnIyZYnZLBNGVjK4Se5UcDv0';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function toUUID(firestoreId) {
  const hash = createHash('md5').update(String(firestoreId)).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

function toISODate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.split('T')[0];
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return null;
  }
  if (val && typeof val === 'object') {
    if (val.seconds) return new Date(val.seconds * 1000).toISOString().split('T')[0];
    if (val.toDate) return val.toDate().toISOString().split('T')[0];
  }
  return null;
}

function toISO(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    if (!val.trim()) return new Date().toISOString();
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString();
    return new Date().toISOString();
  }
  if (val && typeof val === 'object') {
    if (val.seconds) return new Date(val.seconds * 1000).toISOString();
    if (val.toDate) return val.toDate().toISOString();
  }
  return new Date().toISOString();
}

async function readCollection(name) {
  const snap = await getDocs(collection(db, name));
  const docs = [];
  snap.forEach(doc => docs.push({ _firestoreId: doc.id, id: doc.id, ...doc.data() }));
  console.log(`[Firestore] ${name}: ${docs.length} documentos`);
  return docs;
}

async function migrateProperties(docs) {
  const validTypes = ['departamento', 'galpon', 'local', 'oficina', 'otro'];
  const validStatuses = ['ocupado', 'disponible', 'mantenimiento'];
  const validCurrencies = ['ARS', 'USD'];

  const rows = docs.map(d => ({
    id: toUUID(d._firestoreId),
    name: d.name || d.nombre || 'Sin nombre',
    type: validTypes.includes(d.type) ? d.type : 'otro',
    building: d.building || d.edificio || '',
    address: d.address || d.direccion || '',
    rent: Number(d.rent || d.alquiler || 0),
    rent_currency: validCurrencies.includes(d.rentCurrency || d.rent_currency) ? (d.rentCurrency || d.rent_currency) : 'ARS',
    expenses: Number(d.expenses || d.expensas || 0),
    expenses_currency: validCurrencies.includes(d.expensesCurrency || d.expenses_currency) ? (d.expensesCurrency || d.expenses_currency) : 'ARS',
    next_update_date: toISODate(d.nextUpdateDate || d.next_update_date),
    tenant_name: d.tenantName || d.tenant_name || d.tenant || null,
    status: validStatuses.includes(d.status) ? d.status : 'disponible',
    contract_start: toISODate(d.contractStart || d.contract_start),
    contract_end: toISODate(d.contractEnd || d.contract_end),
    last_updated: toISO(d.lastUpdated || d.last_updated),
    notes: d.notes || d.notas || '',
    created_at: toISO(d.createdAt || d.created_at),
    updated_at: toISO(d.updatedAt || d.updated_at),
  }));

  const idMap = {};
  docs.forEach(d => { idMap[String(d._firestoreId)] = toUUID(d._firestoreId); });

  const { error } = await supabase.from('properties').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Error properties:', error.message);
  else console.log(`[Supabase] properties: ${rows.length} insertadas/actualizadas`);
  return { rows, idMap };
}

async function migrateTenants(docs, propertyIdMap) {
  const validStatuses = ['activo', 'vencido', 'pendiente'];

  const rows = docs.map(d => {
    const rawPropId = d.propertyId || d.property_id || null;
    const propId = rawPropId ? (propertyIdMap[String(rawPropId)] || null) : null;

    return {
      id: toUUID(d._firestoreId),
      name: d.name || d.nombre || 'Sin nombre',
      email: d.email || '',
      phone: d.phone || d.telefono || '',
      property_id: propId,
      contract_start: toISODate(d.contractStart || d.contract_start) || new Date().toISOString().split('T')[0],
      contract_end: toISODate(d.contractEnd || d.contract_end) || new Date().toISOString().split('T')[0],
      deposit: Number(d.deposit || d.deposito || 0),
      guarantor_name: (d.guarantor && d.guarantor.name) || d.guarantorName || d.guarantor_name || d.garante || '',
      guarantor_email: (d.guarantor && d.guarantor.email) || d.guarantorEmail || d.guarantor_email || '',
      guarantor_phone: (d.guarantor && d.guarantor.phone) || d.guarantorPhone || d.guarantor_phone || '',
      balance: Number(d.balance || d.saldo || 0),
      status: validStatuses.includes(d.status) ? d.status : 'activo',
      created_at: toISO(d.createdAt || d.created_at),
      updated_at: toISO(d.updatedAt || d.updated_at),
    };
  });

  const idMap = {};
  docs.forEach(d => { idMap[String(d._firestoreId)] = toUUID(d._firestoreId); });

  const { error } = await supabase.from('tenants').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Error tenants:', error.message);
  else console.log(`[Supabase] tenants: ${rows.length} insertadas/actualizadas`);
  return idMap;
}

async function migrateReceipts(docs, tenantIdMap) {
  const validCurrencies = ['ARS', 'USD'];
  const validPaymentMethods = ['efectivo', 'transferencia', 'dolares'];
  const validStatuses = ['pagado', 'pendiente', 'vencido', 'borrador'];

  const rows = docs.map(d => {
    const rawTenantId = d.tenantId || d.tenant_id || null;
    const tenantId = rawTenantId ? (tenantIdMap[String(rawTenantId)] || null) : null;

    return {
      id: toUUID(d._firestoreId),
      receipt_number: d.receiptNumber || d.receipt_number || d.numero || String(d._firestoreId),
      tenant_id: tenantId,
      tenant_name: d.tenantName || d.tenant_name || d.tenant || '',
      property_name: d.propertyName || d.property_name || d.property || '',
      building: d.building || d.edificio || '',
      month: d.month || d.mes || 'Enero',
      year: Number(d.year || d.anio || new Date().getFullYear()),
      rent: Number(d.rent || d.alquiler || 0),
      expenses: Number(d.expenses || d.expensas || 0),
      other_charges: Array.isArray(d.otherCharges || d.other_charges) ? (d.otherCharges || d.other_charges) : [],
      previous_balance: Number(d.previousBalance || d.previous_balance || 0),
      total: Number(d.total || 0),
      paid_amount: Number(d.paidAmount || d.paid_amount || 0),
      remaining_balance: Number(d.remainingBalance || d.remaining_balance || 0),
      currency: validCurrencies.includes(d.currency || d.moneda) ? (d.currency || d.moneda) : 'ARS',
      payment_method: validPaymentMethods.includes(d.paymentMethod || d.payment_method) ? (d.paymentMethod || d.payment_method) : 'efectivo',
      status: validStatuses.includes(d.status) ? d.status : 'pendiente',
      due_date: toISODate(d.dueDate || d.due_date) || new Date().toISOString().split('T')[0],
      created_date: toISODate(d.createdDate || d.created_date) || new Date().toISOString().split('T')[0],
      created_at: toISO(d.createdAt || d.created_at),
      updated_at: toISO(d.updatedAt || d.updated_at),
    };
  });

  const { error } = await supabase.from('receipts').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Error receipts:', error.message);
  else console.log(`[Supabase] receipts: ${rows.length} insertadas/actualizadas`);
}

async function migrateCashMovements(docs) {
  const validTypes = ['income', 'delivery'];
  const validCurrencies = ['ARS', 'USD'];
  const validPaymentMethods = ['efectivo', 'transferencia', 'dolares'];
  const validDeliveryTypes = ['propietario', 'comision', 'gasto'];

  const rows = docs.map(d => ({
    id: toUUID(d._firestoreId),
    type: validTypes.includes(d.type) ? d.type : 'income',
    description: d.description || d.descripcion || '',
    amount: Number(d.amount || d.monto || 0),
    currency: validCurrencies.includes(d.currency || d.moneda) ? (d.currency || d.moneda) : 'ARS',
    date: toISODate(d.date || d.fecha) || new Date().toISOString().split('T')[0],
    tenant_name: d.tenantName || d.tenant_name || d.tenant || null,
    property_name: d.propertyName || d.property_name || d.property || null,
    payment_method: validPaymentMethods.includes(d.paymentMethod || d.payment_method) ? (d.paymentMethod || d.payment_method) : null,
    delivery_type: validDeliveryTypes.includes(d.deliveryType || d.delivery_type) ? (d.deliveryType || d.delivery_type) : null,
    created_at: toISO(d.createdAt || d.created_at),
  }));

  const { error } = await supabase.from('cash_movements').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Error cash_movements:', error.message);
  else console.log(`[Supabase] cash_movements: ${rows.length} insertadas/actualizadas`);
}

async function main() {
  console.log('=== INICIO MIGRACION FIRESTORE -> SUPABASE ===\n');

  const [propDocs, tenantDocs, receiptDocs, cashDocs] = await Promise.all([
    readCollection('properties'),
    readCollection('tenants'),
    readCollection('receipts'),
    readCollection('cashMovements'),
  ]);

  console.log('\n--- Migrando properties ---');
  const { rows: propertyRows, idMap: propertyIdMap } = await migrateProperties(propDocs);

  console.log('\n--- Migrando tenants ---');
  const tenantIdMap = await migrateTenants(tenantDocs, propertyIdMap);

  console.log('\n--- Migrando receipts ---');
  await migrateReceipts(receiptDocs, tenantIdMap);

  console.log('\n--- Migrando cash_movements ---');
  await migrateCashMovements(cashDocs);

  console.log('\n=== MIGRACION COMPLETADA ===');
  process.exit(0);
}

main().catch(e => { console.error('ERROR FATAL:', e); process.exit(1); });
