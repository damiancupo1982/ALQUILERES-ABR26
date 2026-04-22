import React, { useState } from 'react';
import { Calendar, DollarSign, Filter, Download, TrendingUp, Search, Eye, Printer, X, FileText } from 'lucide-react';
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
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);

  // Convertir receipts a formato de payments para compatibilidad
  const payments = receipts.map(receipt => ({
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
    const yearMatch = payment.year === selectedYear;
    const monthMatch = !selectedMonth || payment.month === selectedMonth;
    const statusMatch = !selectedStatus || payment.status === selectedStatus;
    const tenantMatch = !selectedTenant || payment.tenant === selectedTenant;
    const propertyMatch = !selectedProperty || payment.property === selectedProperty;
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

  const monthlyStats = months.map(month => {
    const monthPayments = filteredPayments.filter(p => p.month === month);
    const monthARS = monthPayments
      .filter(p => p.receipt?.currency === 'ARS')
      .reduce((sum, p) => sum + p.amount, 0);
    const monthUSD = monthPayments
      .filter(p => p.receipt?.currency === 'USD')
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      month,
      count: monthPayments.length,
      totalARS: monthARS,
      totalUSD: monthUSD,
    };
  });

  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedStatus('');
    setSelectedTenant('');
    setSelectedProperty('');
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propiedad</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las propiedades</option>
              {uniqueProperties.map((property) => (
                <option key={property} value={property}>{property}</option>
              ))}
            </select>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos Mensuales {selectedYear}</h3>
        <div className="grid grid-cols-12 gap-2">
          {monthlyStats.map((stat, index) => {
            const maxTotal = Math.max(...monthlyStats.map(s => s.totalARS));
            return (
              <div key={stat.month} className="text-center">
                <div className="mb-2">
                  <div
                    className="bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.max((stat.totalARS / (maxTotal || 1)) * 100, 5)}px`,
                      minHeight: '20px'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mb-1">{stat.month.slice(0, 3)}</p>
                <p className="text-xs font-semibold text-gray-900">${(stat.totalARS / 1000).toFixed(0)}k</p>
                {stat.totalUSD > 0 && (
                  <p className="text-xs text-gray-500">U$S {(stat.totalUSD / 1000).toFixed(1)}k</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recibo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inquilino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Edificio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => viewReceipt(payment)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{payment.paymentDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{payment.receiptNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{payment.tenant}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{payment.property}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{payment.building}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {payment.receipt?.currency === 'USD' ? 'U$S ' : '$'}{payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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