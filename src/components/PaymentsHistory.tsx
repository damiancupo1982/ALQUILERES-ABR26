import React, { useState, useRef, useEffect } from 'react';
import { Calendar, DollarSign, Filter, Download, TrendingUp, Search, Eye, Printer, X, FileText, ChevronUp, ChevronDown, ChevronsUpDown, Check } from 'lucide-react';
import { Receipt, Property, Tenant } from '../App';
import MonthlySummary from './MonthlySummary';

interface PaymentsHistoryProps {
  receipts: Receipt[];
  properties?: Property[];
  tenants?: Tenant[];
}

const PaymentsHistory: React.FC<PaymentsHistoryProps> = ({ receipts, properties = [], tenants = [] }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [sortField, setSortField] = useState<'paymentDate' | 'receiptNumber' | 'tenant' | 'property' | 'building' | 'amount' | 'paymentMethod' | 'status' | 'month'>('paymentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(e.target as Node)) {
        setPropertyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convertir receipts a formato de payments para compatibilidad
  // IMPORTANTE: Solo incluir recibos con paidAmount > 0 (realmente cobrados)
  const payments = receipts
    .filter((receipt) => receipt.paidAmount > 0)
    .map(receipt => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      tenant: receipt.tenant,
      property: receipt.property,
      building: receipt.building,
      amount: receipt.paidAmount,
      paymentDate: receipt.createdDate,
      month: receipt.month,
      year: receipt.year,
      paymentMethod: receipt.paymentMethod,
      status: receipt.status === 'pagado' ? 'confirmado' as const : 'pendiente_confirmacion' as const,
      receipt: receipt // Mantener referencia al recibo completo
    }));

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Get unique values for filters
  const uniqueTenants = [...new Set(payments.map(p => p.tenant))].sort();
  const uniqueProperties = [...new Set(payments.map(p => p.property))].sort();
  const uniqueBuildings = [...new Set(payments.map(p => p.building))].sort();

  const filteredPayments = payments.filter(payment => {
    // Filtrar por fecha real de cobro (createdDate), no por período del recibo
    const payDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
    const payYear = payDate ? payDate.getFullYear() : null;
    const payMonthName = payDate ? months[payDate.getMonth()] : null;

    const yearMatch = payYear === selectedYear;
    const monthMatch = !selectedMonth || payMonthName === selectedMonth;
    const statusMatch = !selectedStatus || payment.status === selectedStatus;
    const tenantMatch = !selectedTenant || payment.tenant === selectedTenant;
    const propertyMatch = selectedProperties.length === 0 || selectedProperties.includes(payment.property);
    const buildingMatch = !selectedBuilding || payment.building === selectedBuilding;

    const searchMatch = !searchTerm ||
      payment.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());

    return yearMatch && monthMatch && statusMatch && tenantMatch && propertyMatch && buildingMatch && searchMatch;
  });

  // Separar totales por moneda
  const totalARS = filteredPayments
    .filter(p => p.receipt?.currency === 'ARS')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalUSD = filteredPayments
    .filter(p => p.receipt?.currency === 'USD')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const monthlyStats = months.map((month, monthIdx) => {
    // Agrupar por fecha real de cobro dentro del año seleccionado
    const monthPayments = payments.filter(p => {
      const d = p.paymentDate ? new Date(p.paymentDate) : null;
      return d && d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
    });
    const monthARS = monthPayments
      .filter(p => p.receipt?.currency === 'ARS')
      .reduce((sum, p) => sum + p.amount, 0);
    const monthUSD = monthPayments
      .filter(p => p.receipt?.currency === 'USD')
      .reduce((sum, p) => sum + p.amount, 0);

    // Monto esperado: suma de rent+expenses de recibos emitidos ese mes/año
    // (recibo emitido = propiedad ocupada ese mes), deduplicando por propiedad
    const monthReceipts = receipts.filter(r => r.month === month && r.year === selectedYear && r.status !== 'borrador');
    const seenProperties = new Set<string>();
    let expectedMonthARS = 0;
    let expectedMonthUSD = 0;
    for (const r of monthReceipts) {
      if (seenProperties.has(r.property)) continue;
      seenProperties.add(r.property);
      if (r.currency === 'ARS') {
        expectedMonthARS += (r.rent || 0) + (r.expenses || 0);
      } else if (r.currency === 'USD') {
        expectedMonthUSD += (r.rent || 0) + (r.expenses || 0);
      }
    }

    return {
      month,
      count: monthPayments.length,
      totalARS: monthARS,
      totalUSD: monthUSD,
      expectedARS: expectedMonthARS,
      expectedUSD: expectedMonthUSD,
    };
  });

  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedStatus('');
    setSelectedTenant('');
    setSelectedProperties([]);
    setSelectedBuilding('');
    setSearchTerm('');
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      dolares: 'Dólares'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'pendiente_confirmacion': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const monthOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'paymentDate') {
      cmp = (a.paymentDate || '').localeCompare(b.paymentDate || '');
    } else if (sortField === 'receiptNumber') {
      cmp = a.receiptNumber.localeCompare(b.receiptNumber);
    } else if (sortField === 'tenant') {
      cmp = a.tenant.localeCompare(b.tenant);
    } else if (sortField === 'property') {
      cmp = a.property.localeCompare(b.property);
    } else if (sortField === 'building') {
      cmp = (a.building || '').localeCompare(b.building || '');
    } else if (sortField === 'amount') {
      cmp = a.amount - b.amount;
    } else if (sortField === 'paymentMethod') {
      cmp = a.paymentMethod.localeCompare(b.paymentMethod);
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    } else if (sortField === 'month') {
      const aIdx = (a.receipt?.year ?? 0) * 12 + monthOrder.indexOf(a.month);
      const bIdx = (b.receipt?.year ?? 0) * 12 + monthOrder.indexOf(b.month);
      cmp = aIdx - bIdx;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-blue-600" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-blue-600" />;
  };

  const viewReceipt = (payment: any) => {
    if (payment.receipt) {
      setSelectedReceipt(payment.receipt);
      setShowReceiptModal(true);
    }
  };

  const printReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo ${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .receipt-info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .charges { border-collapse: collapse; width: 100%; margin: 20px 0; }
            .charges th, .charges td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .charges th { background-color: #f2f2f2; font-weight: bold; }
            .total-row { background-color: #f9f9f9; font-weight: bold; }
            .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; }
            .building { color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RECIBO DE ALQUILER</h1>
            <h2>${receipt.receiptNumber}</h2>
          </div>
          
          <div class="receipt-info">
            <div class="info-row">
              <span><strong>Inquilino:</strong> ${receipt.tenant}</span>
              <span><strong>Fecha de emisión:</strong> ${receipt.createdDate}</span>
            </div>
            <div class="info-row">
              <span><strong>Propiedad:</strong> ${receipt.property}</span>
              <span><strong>Fecha de vencimiento:</strong> ${receipt.dueDate}</span>
            </div>
            <div class="info-row">
              <span class="building"><strong>Edificio:</strong> ${receipt.building}</span>
              <span><strong>Período:</strong> ${receipt.month} ${receipt.year}</span>
            </div>
          </div>

          <table class="charges">
            <thead>
              <tr>
                <th>Concepto</th>
                <th style="text-align: right;">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alquiler</td>
                <td style="text-align: right;">$${receipt.rent.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Expensas</td>
                <td style="text-align: right;">$${receipt.expenses.toLocaleString()}</td>
              </tr>
              ${receipt.previousBalance > 0 ? `
                <tr>
                  <td>Saldo anterior</td>
                  <td style="text-align: right;">$${receipt.previousBalance.toLocaleString()}</td>
                </tr>
              ` : ''}
              ${receipt.otherCharges.map(charge => `
                <tr>
                  <td>${charge.description}</td>
                  <td style="text-align: right;">$${charge.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>TOTAL A PAGAR</strong></td>
                <td style="text-align: right;"><strong>${receipt.currency} $${receipt.total.toLocaleString()}</strong></td>
              </tr>
              ${receipt.paidAmount > 0 ? `
                <tr>
                  <td><strong>PAGADO</strong></td>
                  <td style="text-align: right;"><strong>$${receipt.paidAmount.toLocaleString()}</strong></td>
                </tr>
              ` : ''}
              ${receipt.remainingBalance > 0 ? `
                <tr style="background-color: #fee2e2;">
                  <td><strong>SALDO PENDIENTE</strong></td>
                  <td style="text-align: right;"><strong>$${receipt.remainingBalance.toLocaleString()}</strong></td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="footer">
            <p>Este recibo debe ser abonado antes del ${receipt.dueDate}</p>
            <p>Gracias por su puntualidad en el pago</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
  };
  const exportToCSV = () => {
    const headers = ['Fecha', 'Recibo', 'Inquilino', 'Propiedad', 'Edificio', 'Monto', 'Método', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(payment => [
        payment.paymentDate,
        payment.receiptNumber,
        payment.tenant,
        payment.property,
        payment.building,
        payment.amount,
        getPaymentMethodLabel(payment.paymentMethod),
        payment.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_pagos_${selectedYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Pagos</h2>
          <p className="text-gray-600">Consulta y analiza todos los pagos recibidos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMonthlySummary(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span>Resumen Mensual</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros Personalizados</h3>
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por inquilino, propiedad, edificio o número de recibo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los meses</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inquilino</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los inquilinos</option>
              {uniqueTenants.map((tenant) => (
                <option key={tenant} value={tenant}>{tenant}</option>
              ))}
            </select>
          </div>

          <div ref={propertyDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Propiedad</label>
            <button
              type="button"
              onClick={() => setPropertyDropdownOpen(o => !o)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className="text-sm truncate text-gray-700">
                {selectedProperties.length === 0
                  ? 'Todas las propiedades'
                  : selectedProperties.length === 1
                  ? selectedProperties[0]
                  : `${selectedProperties.length} propiedades`}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-1 transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {propertyDropdownOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  onClick={() => setSelectedProperties([])}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${selectedProperties.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {selectedProperties.length === 0 && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">Todas las propiedades</span>
                </div>
                {uniqueProperties.map((property) => {
                  const checked = selectedProperties.includes(property);
                  return (
                    <div
                      key={property}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedProperties(prev =>
                          prev.includes(property)
                            ? prev.filter(p => p !== property)
                            : [...prev, property]
                        );
                      }}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700">{property}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edificio</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los edificios</option>
              {uniqueBuildings.map((building) => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendiente_confirmacion">Pendiente confirmación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Resumen de Filtros</h3>
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">${totalARS.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total ARS</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">U$S {totalUSD.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total USD</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{filteredPayments.length}</p>
            <p className="text-sm text-gray-500">Pagos registrados</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              ${filteredPayments.filter(p => p.receipt?.currency === 'ARS').length > 0 ? Math.round(totalARS / filteredPayments.filter(p => p.receipt?.currency === 'ARS').length).toLocaleString() : '0'}
            </p>
            <p className="text-xs text-gray-500 mb-1">Promedio ARS</p>
            <p className="text-xl font-bold text-gray-900">
              U$S {filteredPayments.filter(p => p.receipt?.currency === 'USD').length > 0 ? Math.round(totalUSD / filteredPayments.filter(p => p.receipt?.currency === 'USD').length).toLocaleString() : '0'}
            </p>
            <p className="text-xs text-gray-500">Promedio USD</p>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Ingresos Mensuales {selectedYear}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span>
              Cobrado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-gray-200 border border-dashed border-gray-400"></span>
              Esperado (por mes)
            </span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 mt-4">
          {monthlyStats.map((stat) => {
            const maxTotal = Math.max(...monthlyStats.map(s => Math.max(s.totalARS, s.expectedARS)), 1);
            const barHeight = Math.max((stat.totalARS / maxTotal) * 90, 4);
            return (
              <div key={stat.month} className="text-center">
                {stat.expectedARS > 0 && (
                  <p className="text-gray-400 leading-tight" style={{ fontSize: '9px' }}>
                    ${(stat.expectedARS / 1000).toFixed(0)}k
                  </p>
                )}
                {stat.expectedUSD > 0 && (
                  <p className="text-amber-500 leading-tight" style={{ fontSize: '9px' }}>
                    U$S {(stat.expectedUSD / 1000).toFixed(1)}k
                  </p>
                )}
                {stat.expectedARS === 0 && stat.expectedUSD === 0 && (
                  <p className="text-gray-300 leading-tight" style={{ fontSize: '9px' }}>—</p>
                )}
                <div className="relative flex flex-col justify-end mt-1" style={{ height: '90px' }}>
                  <div
                    className="bg-blue-500 rounded-t w-full transition-all"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{stat.month.slice(0, 3)}</p>
                <p className="text-xs font-semibold text-gray-900">${(stat.totalARS / 1000).toFixed(0)}k</p>
                {stat.totalUSD > 0 && (
                  <p className="text-xs text-amber-600 font-medium">U$S {(stat.totalUSD / 1000).toFixed(1)}k</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('paymentDate')}>
                  Fecha <SortIcon field="paymentDate" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('month')}>
                  Período <SortIcon field="month" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('receiptNumber')}>
                  Recibo <SortIcon field="receiptNumber" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('tenant')}>
                  Inquilino <SortIcon field="tenant" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('property')}>
                  Propiedad <SortIcon field="property" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('building')}>
                  Edificio <SortIcon field="building" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('amount')}>
                  Monto <SortIcon field="amount" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('paymentMethod')}>
                  Método <SortIcon field="paymentMethod" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('status')}>
                  Estado <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => viewReceipt(payment)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                      <span className="text-xs text-gray-900">{payment.paymentDate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-700">{payment.month} {payment.year}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-900">{payment.receiptNumber}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-900">{payment.tenant}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-900">{payment.property}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-600">{payment.building}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-semibold text-gray-900">
                      {payment.receipt?.currency === 'USD' ? 'U$S ' : '$'}{payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-900">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewReceipt(payment);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Ver recibo"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {payment.receipt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printReceipt(payment.receipt);
                          }}
                          className="text-gray-400 hover:text-green-600 transition-colors"
                          title="Imprimir recibo"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt View Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recibo {selectedReceipt.receiptNumber}</h3>
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
              <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">RECIBO DE ALQUILER</h1>
                <h2 className="text-xl font-semibold text-gray-700">{selectedReceipt.receiptNumber}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p><strong>Inquilino:</strong> {selectedReceipt.tenant}</p>
                  <p><strong>Propiedad:</strong> {selectedReceipt.property}</p>
                  <p className="text-gray-600"><strong>Edificio:</strong> {selectedReceipt.building}</p>
                </div>
                <div>
                  <p><strong>Fecha de emisión:</strong> {selectedReceipt.createdDate}</p>
                  <p><strong>Fecha de vencimiento:</strong> {selectedReceipt.dueDate}</p>
                  <p><strong>Período:</strong> {selectedReceipt.month} {selectedReceipt.year}</p>
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
                    <td className="border border-gray-300 px-4 py-2 text-right">${selectedReceipt.rent.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Expensas</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">${selectedReceipt.expenses.toLocaleString()}</td>
                  </tr>
                  {selectedReceipt.previousBalance > 0 && (
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Saldo anterior</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">${selectedReceipt.previousBalance.toLocaleString()}</td>
                    </tr>
                  )}
                  {selectedReceipt.otherCharges.map((charge, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{charge.description}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">${charge.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-4 py-2">TOTAL A PAGAR</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {selectedReceipt.currency} ${selectedReceipt.total.toLocaleString()}
                    </td>
                  </tr>
                  {selectedReceipt.paidAmount > 0 && (
                    <tr className="bg-green-50">
                      <td className="border border-gray-300 px-4 py-2 font-semibold">PAGADO</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-green-600">
                        ${selectedReceipt.paidAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {selectedReceipt.remainingBalance > 0 && (
                    <tr className="bg-red-50">
                      <td className="border border-gray-300 px-4 py-2 font-semibold">SALDO PENDIENTE</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-red-600">
                        ${selectedReceipt.remainingBalance.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
                <p>Este recibo debe ser abonado antes del {selectedReceipt.dueDate}</p>
                <p>Gracias por su puntualidad en el pago</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
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
                onClick={() => printReceipt(selectedReceipt)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {filteredPayments.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
          <p className="text-gray-500">No se encontraron pagos para los filtros seleccionados.</p>
        </div>
      )}

      {showMonthlySummary && (
        <MonthlySummary
          properties={properties}
          tenants={tenants}
          receipts={receipts}
          onClose={() => setShowMonthlySummary(false)}
        />
      )}
    </div>
  );
};

export default PaymentsHistory;
