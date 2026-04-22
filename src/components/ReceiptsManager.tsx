import React, { useState } from 'react';
import {
  Plus,
  Receipt as ReceiptIcon,
  CreditCard as Edit,
  Trash2,
  Eye,
  Printer,
  DollarSign,
  Calendar,
  User,
  X,
  Check,
  AlertCircle,
  Share2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { Tenant, Property, Receipt } from '../App';

interface ReceiptsManagerProps {
  tenants: Tenant[];
  properties: Property[];
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  addCashMovement: (movement: any) => void;
  updateTenantBalance: (tenantName: string, newBalance: number) => void;
}

const currencyFormatter = (amount: number, currency: 'ARS' | 'USD' | undefined | null) => {
  const safeAmount = isFinite(amount) ? amount : 0;
  const formattedNumber = safeAmount.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  return currency === 'USD' ? `U$S ${formattedNumber}` : `$${formattedNumber}`;
};

const safeCharges = (charges: Receipt['otherCharges'] | undefined | null) =>
  Array.isArray(charges) ? charges : [];

const safeNumber = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
};

const ReceiptsManager: React.FC<ReceiptsManagerProps> = ({
  tenants,
  properties,
  receipts,
  setReceipts,
  addCashMovement,
  updateTenantBalance,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [payingReceipt, setPayingReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateAlertMessage, setUpdateAlertMessage] = useState('');
  const [sortField, setSortField] = useState<'id' | 'month' | 'tenant' | 'property' | 'status' | 'total' | 'dueDate'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [formData, setFormData] = useState({
    tenant: '',
    property: '',
    month: '',
    year: new Date().getFullYear(),
    rent: '',
    expenses: '',
    otherCharges: [{ description: '', amount: '' }],
    previousBalance: '',
    currency: 'ARS' as 'ARS' | 'USD',
    dueDate: '',
  });

  const [paymentData, setPaymentData] = useState({
    efectivoARS: '',
    transferenciaARS: '',
    dolares: '',
    totalPaying: 0,
  });

  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProperty = properties.find((p) => p.name === formData.property);

    const otherChargesTotal = formData.otherCharges
      .filter((charge) => charge.description && charge.amount !== '')
      .reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);

    const total =
      (parseFloat(formData.rent) || 0) +
      (parseFloat(formData.expenses) || 0) +
      (parseFloat(formData.previousBalance) || 0) +
      otherChargesTotal;

    const createdDate =
      editingReceipt?.createdDate || new Date().toISOString().split('T')[0];

    const newReceipt: Receipt = {
      id: editingReceipt ? editingReceipt.id : Date.now(),
      receiptNumber: editingReceipt
        ? editingReceipt.receiptNumber
        : `REC-${new Date().getFullYear()}-${String((receipts?.length || 0) + 1).padStart(3, '0')}`,
      tenant: formData.tenant,
      property: formData.property,
      building: selectedProperty?.building || '',
      month: formData.month,
      year: formData.year,
      rent: parseFloat(formData.rent) || 0,
      expenses: parseFloat(formData.expenses) || 0,
      otherCharges: formData.otherCharges
        .filter((charge) => charge.description && charge.amount !== '')
        .map((charge) => ({
          description: charge.description,
          amount: parseFloat(charge.amount) || 0,
        })),
      previousBalance: parseFloat(formData.previousBalance) || 0,
      total,
      paidAmount: editingReceipt?.paidAmount || 0,
      remainingBalance: total - (editingReceipt?.paidAmount || 0),
      currency: formData.currency,
      paymentMethod: editingReceipt?.paymentMethod || 'efectivo',
      status: editingReceipt?.status || 'borrador',
      dueDate: formData.dueDate || '',
      createdDate,
    };

    if (editingReceipt) {
      setReceipts((prev) => prev.map((r) => (r.id === editingReceipt.id ? newReceipt : r)));
    } else {
      setReceipts((prev) => [...prev, newReceipt]);
    }

    resetForm();
    setShowModal(false);
    setEditingReceipt(null);
  };

  const resetForm = () => {
    setFormData({
      tenant: '',
      property: '',
      month: '',
      year: new Date().getFullYear(),
      rent: '',
      expenses: '',
      otherCharges: [{ description: '', amount: '' }],
      previousBalance: '',
      currency: 'ARS',
      dueDate: '',
    });
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setFormData({
      tenant: receipt.tenant || '',
      property: receipt.property || '',
      month: receipt.month || '',
      year: receipt.year || new Date().getFullYear(),
      rent: String(safeNumber(receipt.rent)),
      expenses: String(safeNumber(receipt.expenses)),
      otherCharges:
        safeCharges(receipt.otherCharges).length > 0
          ? safeCharges(receipt.otherCharges).map((c) => ({
              description: c.description || '',
              amount: String(safeNumber(c.amount)),
            }))
          : [{ description: '', amount: '' }],
      previousBalance: String(safeNumber(receipt.previousBalance)),
      currency: (receipt.currency as 'ARS' | 'USD') || 'ARS',
      dueDate: receipt.dueDate || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar este recibo?')) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handlePayment = () => {
    if (!payingReceipt) return;

    const efectivoAmount = parseFloat(paymentData.efectivoARS) || 0;
    const transferenciaAmount = parseFloat(paymentData.transferenciaARS) || 0;
    const dolaresAmount = parseFloat(paymentData.dolares) || 0;

    const totalPaying = efectivoAmount + transferenciaAmount + dolaresAmount;

    if (totalPaying <= 0) {
      alert('Debe ingresar al menos un monto de pago');
      return;
    }

    const newPaidAmount = payingReceipt.paidAmount + totalPaying;
    const newRemainingBalance = payingReceipt.total - newPaidAmount;

    let paymentMethod: 'efectivo' | 'transferencia' | 'dolares' = 'efectivo';
    if (transferenciaAmount > efectivoAmount && transferenciaAmount > dolaresAmount) {
      paymentMethod = 'transferencia';
    } else if (dolaresAmount > efectivoAmount && dolaresAmount > transferenciaAmount) {
      paymentMethod = 'dolares';
    }

    const updatedReceipt: Receipt = {
      ...payingReceipt,
      paidAmount: newPaidAmount,
      remainingBalance: newRemainingBalance,
      paymentMethod,
      status: newRemainingBalance > 0 ? 'pendiente' : 'pagado',
    };

    setReceipts((prev) => prev.map((r) => (r.id === payingReceipt.id ? updatedReceipt : r)));

    if (efectivoAmount > 0) {
      addCashMovement({
        type: 'income',
        description: `Pago alquiler - ${payingReceipt.tenant} (Efectivo)`,
        amount: efectivoAmount,
        currency: 'ARS',
        date: new Date().toISOString().split('T')[0],
        tenant: payingReceipt.tenant,
        property: payingReceipt.property,
        paymentMethod: 'efectivo',
      });
    }

    if (transferenciaAmount > 0) {
      addCashMovement({
        type: 'income',
        description: `Pago alquiler - ${payingReceipt.tenant} (Transferencia)`,
        amount: transferenciaAmount,
        currency: 'ARS',
        date: new Date().toISOString().split('T')[0],
        tenant: payingReceipt.tenant,
        property: payingReceipt.property,
        paymentMethod: 'transferencia',
      });
    }

    if (dolaresAmount > 0) {
      addCashMovement({
        type: 'income',
        description: `Pago alquiler - ${payingReceipt.tenant} (Dólares)`,
        amount: dolaresAmount,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        tenant: payingReceipt.tenant,
        property: payingReceipt.property,
        paymentMethod: 'dolares',
      });
    }

    const tenant = tenants.find((t) => t.name === payingReceipt.tenant);
    if (tenant) {
      const newBalance = Math.max(0, (tenant.balance || 0) - totalPaying);
      updateTenantBalance(tenant.name, newBalance);
    }

    setPaymentData({
      efectivoARS: '',
      transferenciaARS: '',
      dolares: '',
      totalPaying: 0,
    });

    setShowPaymentModal(false);
    setPayingReceipt(null);
  };

  const openPaymentModal = (receipt: Receipt) => {
    setPayingReceipt(receipt);
    setPaymentData({
      efectivoARS: '',
      transferenciaARS: '',
      dolares: '',
      totalPaying: 0,
    });
    setShowPaymentModal(true);
  };

  const addOtherCharge = () => {
    setFormData((prev) => ({
      ...prev,
      otherCharges: [...prev.otherCharges, { description: '', amount: '' }],
    }));
  };

  const removeOtherCharge = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      otherCharges: prev.otherCharges.filter((_, i) => i !== index),
    }));
  };

  const updateOtherCharge = (
    index: number,
    field: 'description' | 'amount',
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.otherCharges];
      const target = { ...updated[index], [field]: value };
      updated[index] = target;
      return { ...prev, otherCharges: updated };
    });
  };

  const printReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isDraft = receipt.status === 'borrador';
    const watermark = isDraft
      ? `
      <div style="position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index:0; pointer-events:none;">
        <div style="transform: rotate(-45deg); font-size:72px; color: rgba(255,0,0,0.08); font-weight:700;">
          BORRADOR
        </div>
      </div>
    `
      : '';

    const chargesRows = [
      { label: 'Alquiler', amount: safeNumber(receipt.rent) },
      { label: 'Expensas', amount: safeNumber(receipt.expenses) },
      ...(receipt.previousBalance > 0
        ? [{ label: 'Saldo anterior', amount: safeNumber(receipt.previousBalance) }]
        : []),
      ...safeCharges(receipt.otherCharges).map((c) => ({
        label: c.description || 'Otro cargo',
        amount: safeNumber(c.amount),
      })),
    ]
      .map(
        (row) => `
        <tr>
          <td>${row.label}</td>
          <td style="text-align:right;">${currencyFormatter(
            row.amount,
            receipt.currency
          )}</td>
        </tr>
      `
      )
      .join('');

    const paidRow =
      receipt.paidAmount > 0
        ? `
      <tr>
        <td><strong>PAGADO</strong></td>
        <td style="text-align:right;"><strong>${currencyFormatter(
          safeNumber(receipt.paidAmount),
          receipt.currency
        )}</strong></td>
      </tr>`
        : '';

    const remainingRow =
      receipt.remainingBalance > 0
        ? `
      <tr style="background-color:#fee2e2;">
        <td><strong>SALDO PENDIENTE</strong></td>
        <td style="text-align:right;"><strong>${currencyFormatter(
          safeNumber(receipt.remainingBalance),
          receipt.currency
        )}</strong></td>
      </tr>`
        : '';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Recibo ${receipt.receiptNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 24px; position: relative; }
            .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
            .receipt-info { margin-bottom: 12px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; }
            th { background: #f3f4f6; text-align: left; }
            .total-row { background: #f9fafb; font-weight: 700; }
            .footer { margin-top: 24px; text-align: center; color: #4b5563; }
            .draft-status { color: #dc2626; font-weight: 700; text-align: center; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          ${watermark}
          ${isDraft ? '<div class="draft-status">*** RECIBO BORRADOR - NO VÁLIDO PARA PAGO ***</div>' : ''}

          <div class="header">
            <h1>RECIBO DE ALQUILER</h1>
            <h2>${receipt.receiptNumber}</h2>
          </div>

          <div class="receipt-info">
            <div class="info-row">
              <span><strong>Inquilino:</strong> ${receipt.tenant || '-'}</span>
              <span><strong>Fecha de emisión:</strong> ${receipt.createdDate || '-'}</span>
            </div>
            <div class="info-row">
              <span><strong>Propiedad:</strong> ${receipt.property || '-'}</span>
              <span><strong>Fecha de vencimiento:</strong> ${receipt.dueDate || '-'}</span>
            </div>
            <div class="info-row">
              <span style="color:#6b7280;"><strong>Edificio:</strong> ${receipt.building || '-'}</span>
              <span><strong>Período:</strong> ${receipt.month || '-'} ${receipt.year || '-'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th style="text-align:right;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${chargesRows}
              <tr class="total-row">
                <td><strong>TOTAL A PAGAR</strong></td>
                <td style="text-align:right;"><strong>${currencyFormatter(
                  safeNumber(receipt.total),
                  receipt.currency
                )}</strong></td>
              </tr>
              ${paidRow}
              ${remainingRow}
            </tbody>
          </table>

          <div class="footer">
            <p>Este recibo debe ser abonado antes del ${receipt.dueDate || '-'}</p>
            <p>Gracias por su puntualidad en el pago</p>
            ${isDraft ? '<p style="color:#dc2626; font-weight:700;">*** ESTE ES UN RECIBO BORRADOR ***</p>' : ''}
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const viewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const shareReceipt = async (receipt: Receipt) => {
    const text = [
      `RECIBO DE ALQUILER`,
      `Nro: ${receipt.receiptNumber}`,
      `Inquilino: ${receipt.tenant}`,
      `Propiedad: ${receipt.property}`,
      `Período: ${receipt.month} ${receipt.year}`,
      `Total: ${currencyFormatter(safeNumber(receipt.total), receipt.currency)}`,
      receipt.paidAmount > 0 ? `Pagado: ${currencyFormatter(safeNumber(receipt.paidAmount), receipt.currency)}` : null,
      receipt.remainingBalance > 0 ? `Saldo pendiente: ${currencyFormatter(safeNumber(receipt.remainingBalance), receipt.currency)}` : null,
      `Vencimiento: ${receipt.dueDate || '-'}`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `Recibo ${receipt.receiptNumber}`, text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Datos del recibo copiados al portapapeles');
    }
  };

  const getStatusColor = (status: Receipt['status']) => {
    switch (status) {
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      case 'borrador':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Receipt['status']) => {
    switch (status) {
      case 'pagado':
        return 'Pagado';
      case 'pendiente':
        return 'Pendiente';
      case 'vencido':
        return 'Vencido';
      case 'borrador':
      default:
        return 'Borrador';
    }
  };

  // Calcular total de pagos en tiempo real
  React.useEffect(() => {
    const efectivo = parseFloat(paymentData.efectivoARS) || 0;
    const transferencia = parseFloat(paymentData.transferenciaARS) || 0;
    const dolares = parseFloat(paymentData.dolares) || 0;
    const newTotal = efectivo + transferencia + dolares;
    if (newTotal !== paymentData.totalPaying) {
      setPaymentData((prev) => ({ ...prev, totalPaying: newTotal }));
    }
  }, [paymentData.efectivoARS, paymentData.transferenciaARS, paymentData.dolares]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper para alerta de actualización de valores
  const maybeShowUpdateAlert = (p?: Property) => {
    if (!p?.nextUpdateDate) return;
    const updateDate =
      p.nextUpdateDate instanceof Date
        ? p.nextUpdateDate
        : new Date(p.nextUpdateDate);
    const today = new Date();
    if (today >= updateDate) {
      setUpdateAlertMessage(
        `CHEQUEAR ACTUALIZACIÓN DE VALOR - Fecha de actualización: ${
          p.nextUpdateDate instanceof Date
            ? p.nextUpdateDate.toISOString().slice(0, 10)
            : p.nextUpdateDate
        }`
      );
      setShowUpdateAlert(true);
    }
  };

  const monthOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const sortedReceipts = [...(receipts || [])].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'id') {
      cmp = a.id - b.id;
    } else if (sortField === 'month') {
      const aIdx = a.year * 12 + monthOrder.indexOf(a.month);
      const bIdx = b.year * 12 + monthOrder.indexOf(b.month);
      cmp = aIdx - bIdx;
    } else if (sortField === 'tenant') {
      cmp = a.tenant.localeCompare(b.tenant);
    } else if (sortField === 'property') {
      cmp = a.property.localeCompare(b.property);
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    } else if (sortField === 'total') {
      cmp = safeNumber(a.total) - safeNumber(b.total);
    } else if (sortField === 'dueDate') {
      cmp = (a.dueDate || '').localeCompare(b.dueDate || '');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-blue-600" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recibos de Alquiler</h2>
          <p className="text-gray-600">Genera y gestiona recibos de alquiler</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingReceipt(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Recibo</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('id')}>
                  Recibo <SortIcon field="id" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('tenant')}>
                  Inquilino <SortIcon field="tenant" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('property')}>
                  Propiedad <SortIcon field="property" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('month')}>
                  Período <SortIcon field="month" />
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('total')}>
                  Total <SortIcon field="total" />
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Pagado
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('status')}>
                  Estado <SortIcon field="status" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('dueDate')}>
                  Vence <SortIcon field="dueDate" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedReceipts.map((receipt) => (
                <tr
                  key={receipt.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => viewReceipt(receipt)}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <ReceiptIcon className="h-3 w-3 text-gray-400 mr-1" />
                      <div className="text-xs font-medium text-gray-900">
                        {receipt.receiptNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center">
                      <User className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-900 truncate max-w-[120px]" title={receipt.tenant}>{receipt.tenant}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div>
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]" title={receipt.property}>
                        {receipt.property}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={receipt.building}>{receipt.building}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-900">
                        {receipt.month.substring(0, 3)} {receipt.year}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <span className="text-xs font-semibold text-gray-900">
                      {currencyFormatter(safeNumber(receipt.total), receipt.currency)}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <div>
                      <span className="text-xs font-semibold text-green-600">
                        {currencyFormatter(safeNumber(receipt.paidAmount), receipt.currency)}
                      </span>
                      {safeNumber(receipt.remainingBalance) > 0 && (
                        <div className="text-xs text-red-600">
                          {currencyFormatter(
                            safeNumber(receipt.remainingBalance),
                            receipt.currency
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        receipt.status
                      )}`}
                    >
                      {getStatusLabel(receipt.status)}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-700">{receipt.dueDate || '—'}</div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewReceipt(receipt);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Ver recibo"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printReceipt(receipt);
                        }}
                        className="text-gray-400 hover:text-green-600 transition-colors"
                        title="Imprimir recibo"
                      >
                        <Printer className="h-3 w-3" />
                      </button>
                      {(receipt.status === 'borrador' || receipt.status === 'pendiente') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(receipt);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar recibo"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      )}
                      {safeNumber(receipt.remainingBalance) > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(receipt);
                          }}
                          className="text-gray-400 hover:text-green-600 transition-colors"
                          title="Registrar pago"
                        >
                          <DollarSign className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(receipt.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar recibo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(receipts || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8">
                    <div className="text-center text-gray-500">
                      No hay recibos cargados.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingReceipt ? 'Editar Recibo' : 'Nuevo Recibo de Alquiler'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inquilino
                  </label>
                  <select
                    value={formData.tenant}
                    onChange={(e) => {
                      const selectedTenant = tenants.find(
                        (t) => t.name === e.target.value
                      );
                      const selectedProperty = properties.find(
                        (p) => p.name === selectedTenant?.property
                      );
                      setFormData((prev) => ({
                        ...prev,
                        tenant: e.target.value,
                        property: selectedTenant?.property || '',
                        rent:
                          selectedProperty?.rent !== undefined
                            ? String(selectedProperty.rent)
                            : '',
                        expenses:
                          selectedProperty?.expenses !== undefined
                            ? String(selectedProperty.expenses)
                            : '',
                        currency: selectedProperty?.rentCurrency || 'ARS',
                        previousBalance: (selectedTenant?.balance ?? 0).toString(),
                      }));
                      // Alerta si corresponde
                      maybeShowUpdateAlert(selectedProperty);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar inquilino</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.name}>
                        {tenant.name} - {tenant.property}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Propiedad
                  </label>
                  <select
                    value={formData.property}
                    onChange={(e) => {
                      const selectedProperty = properties.find(
                        (p) => p.name === e.target.value
                      );
                      setFormData((prev) => ({
                        ...prev,
                        property: e.target.value,
                        rent:
                          selectedProperty?.rent !== undefined
                            ? String(selectedProperty.rent)
                            : '',
                        expenses:
                          selectedProperty?.expenses !== undefined
                            ? String(selectedProperty.expenses)
                            : '',
                        currency: selectedProperty?.rentCurrency || 'ARS',
                      }));
                      // Alerta si corresponde
                      maybeShowUpdateAlert(selectedProperty);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar propiedad</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.name}>
                        {property.name} - {property.building}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mes
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, month: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar mes</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        year:
                          parseInt(e.target.value || '0', 10) ||
                          new Date().getFullYear(),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alquiler ($)
                  </label>
                  <input
                    type="number"
                    value={formData.rent}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, rent: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expensas ($)
                  </label>
                  <input
                    type="number"
                    value={formData.expenses}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expenses: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo anterior ($)
                  </label>
                  <input
                    type="number"
                    value={formData.previousBalance}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        previousBalance: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: (e.target.value as 'ARS' | 'USD') || 'ARS',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ARS">Pesos Argentinos</option>
                    <option value="USD">Dólares</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Other Charges */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Otros cargos
                  </label>
                  <button
                    type="button"
                    onClick={addOtherCharge}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Agregar cargo
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.otherCharges.map((charge, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Descripción del cargo"
                        value={charge.description}
                        onChange={(e) =>
                          updateOtherCharge(index, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Monto"
                        value={charge.amount}
                        onChange={(e) =>
                          updateOtherCharge(index, 'amount', e.target.value)
                        }
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {formData.otherCharges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOtherCharge(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingReceipt(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingReceipt ? 'Actualizar Recibo' : 'Crear Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && payingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Registrar Pago
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Recibo: {payingReceipt.receiptNumber}
              </div>
              <div className="text-sm text-gray-600">
                Inquilino: {payingReceipt.tenant}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                Saldo pendiente:{' '}
                {currencyFormatter(
                  safeNumber(payingReceipt.remainingBalance),
                  payingReceipt.currency
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo (ARS)
                </label>
                <input
                  type="number"
                  value={paymentData.efectivoARS}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      efectivoARS: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transferencia (ARS)
                </label>
                <input
                  type="number"
                  value={paymentData.transferenciaARS}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      transferenciaARS: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dólares (USD)
                </label>
                <input
                  type="number"
                  value={paymentData.dolares}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      dolares: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Total a pagar:</div>
                <div className="text-xl font-bold text-blue-600">
                  {currencyFormatter(paymentData.totalPaying, 'ARS')}
                </div>
                {paymentData.totalPaying > safeNumber(payingReceipt.remainingBalance) && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    El pago supera el saldo pendiente. El sobrante de{' '}
                    <strong>{currencyFormatter(paymentData.totalPaying - safeNumber(payingReceipt.remainingBalance), 'ARS')}</strong>{' '}
                    quedará a favor del inquilino.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPayingReceipt(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={paymentData.totalPaying <= 0}
              >
                <Check className="h-4 w-4" />
                <span>Confirmar Pago</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Alert Modal */}
      {showUpdateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 border-l-4 border-yellow-500">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Alerta de Actualización</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">{updateAlertMessage}</p>
              <p className="text-sm text-gray-500 mt-2">
                Verifica si los valores de alquiler y expensas están actualizados antes de generar el recibo.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUpdateAlert(false);
                  setUpdateAlertMessage('');
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt View Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recibo {selectedReceipt.receiptNumber}
              </h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Receipt Preview */}
            <div className="border border-gray-300 rounded-lg p-6 mb-4 bg-gray-50">
              {selectedReceipt.status === 'borrador' && (
                <div className="text-center text-red-600 font-bold mb-4 p-2 bg-red-50 rounded">
                  *** RECIBO BORRADOR - NO VÁLIDO PARA PAGO ***
                </div>
              )}

              <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">RECIBO DE ALQUILER</h1>
                <h2 className="text-xl font-semibold text-gray-700">
                  {selectedReceipt.receiptNumber}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p>
                    <strong>Inquilino:</strong> {selectedReceipt.tenant}
                  </p>
                  <p>
                    <strong>Propiedad:</strong> {selectedReceipt.property}
                  </p>
                  <p className="text-gray-600">
                    <strong>Edificio:</strong> {selectedReceipt.building || '-'}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Fecha de emisión:</strong>{' '}
                    {selectedReceipt.createdDate || '-'}
                  </p>
                  <p>
                    <strong>Fecha de vencimiento:</strong>{' '}
                    {selectedReceipt.dueDate || '-'}
                  </p>
                  <p>
                    <strong>Período:</strong> {selectedReceipt.month} {selectedReceipt.year}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-300 mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Concepto</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Alquiler</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {currencyFormatter(safeNumber(selectedReceipt.rent), selectedReceipt.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Expensas</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {currencyFormatter(
                        safeNumber(selectedReceipt.expenses),
                        selectedReceipt.currency
                      )}
                    </td>
                  </tr>
                  {safeNumber(selectedReceipt.previousBalance) > 0 && (
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Saldo anterior</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {currencyFormatter(
                          safeNumber(selectedReceipt.previousBalance),
                          selectedReceipt.currency
                        )}
                      </td>
                    </tr>
                  )}
                  {safeCharges(selectedReceipt.otherCharges).map((charge, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        {charge.description || 'Otro cargo'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {currencyFormatter(safeNumber(charge.amount), selectedReceipt.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-4 py-2">TOTAL A PAGAR</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {currencyFormatter(
                        safeNumber(selectedReceipt.total),
                        selectedReceipt.currency
                      )}
                    </td>
                  </tr>
                  {safeNumber(selectedReceipt.paidAmount) > 0 && (
                    <tr className="bg-green-50">
                      <td className="border border-gray-300 px-4 py-2 font-semibold">PAGADO</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-green-600">
                        {currencyFormatter(
                          safeNumber(selectedReceipt.paidAmount),
                          selectedReceipt.currency
                        )}
                      </td>
                    </tr>
                  )}
                  {safeNumber(selectedReceipt.remainingBalance) > 0 && (
                    <tr className="bg-red-50">
                      <td className="border border-gray-300 px-4 py-2 font-semibold">
                        SALDO PENDIENTE
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-red-600">
                        {currencyFormatter(
                          safeNumber(selectedReceipt.remainingBalance),
                          selectedReceipt.currency
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
                <p>Este recibo debe ser abonado antes del {selectedReceipt.dueDate || '-'}</p>
                <p>Gracias por su puntualidad en el pago</p>
                {selectedReceipt.status === 'borrador' && (
                  <p className="text-red-600 font-bold mt-2">*** ESTE ES UN RECIBO BORRADOR ***</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => shareReceipt(selectedReceipt)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Compartir</span>
              </button>
              <button
                onClick={() => printReceipt(selectedReceipt)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir</span>
              </button>
              {safeNumber(selectedReceipt.remainingBalance) > 0 && (
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    openPaymentModal(selectedReceipt);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Registrar Pago</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(!receipts || receipts.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ReceiptIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay recibos</h3>
          <p className="text-gray-500">Comienza creando tu primer recibo de alquiler.</p>
        </div>
      )}
    </div>
  );
};

export default ReceiptsManager;
