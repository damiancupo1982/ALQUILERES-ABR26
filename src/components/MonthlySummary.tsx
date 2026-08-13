import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, CheckSquare, Square, TrendingUp, DollarSign, BarChart3, FileText, AlertTriangle } from 'lucide-react';
import { Property, Tenant, Receipt } from '../App';

interface MonthlySummaryProps {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  onClose?: () => void;
  embedded?: boolean;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  properties,
  tenants,
  receipts,
  onClose,
  embedded = false,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>(() => properties.map(p => p.id));

  useEffect(() => {
    setSelectedPropertyIds(current => {
      const availableIds = properties.map(p => p.id);
      if (current.length === 0 || current.every(id => !availableIds.includes(id))) return availableIds;
      return current.filter(id => availableIds.includes(id));
    });
  }, [properties]);

  const allPropertiesSelected = selectedPropertyIds.length === properties.length && properties.length > 0;

  const toggleAllProperties = () => {
    setSelectedPropertyIds(allPropertiesSelected ? [] : properties.map(p => p.id));
  };

  const toggleProperty = (propertyId: number) => {
    setSelectedPropertyIds(current =>
      current.includes(propertyId) ? current.filter(id => id !== propertyId) : [...current, propertyId]
    );
  };

  const buildingColors = [
    { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
    { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
    { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
    { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
    { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-300' },
    { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300' },
    { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
  ];

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const selectedProperties = useMemo(
    () => properties.filter(p => selectedPropertyIds.includes(p.id)),
    [properties, selectedPropertyIds]
  );

  const selectedPropertyNames = useMemo(
    () => new Set(selectedProperties.map(p => p.name)),
    [selectedProperties]
  );

  const yearReceipts = useMemo(
    () => receipts.filter(r => r.year === selectedYear && selectedPropertyNames.has(r.property)),
    [receipts, selectedYear, selectedPropertyNames]
  );

  const dashboardData = useMemo(() => {
    const arsReceipts = yearReceipts.filter(r => r.currency !== 'USD');
    const usdReceipts = yearReceipts.filter(r => r.currency === 'USD');
    const arsTotal = arsReceipts.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
    const usdTotal = usdReceipts.reduce((sum, r) => sum + (r.paidAmount || 0), 0);

    const monthly = months.map(month => {
      const monthReceipts = yearReceipts.filter(r => r.month === month);
      const ars = monthReceipts.filter(r => r.currency !== 'USD').reduce((sum, r) => sum + (r.paidAmount || 0), 0);
      const usd = monthReceipts.filter(r => r.currency === 'USD').reduce((sum, r) => sum + (r.paidAmount || 0), 0);
      return { month: month.slice(0, 3), ars, usd };
    });

    const pendingReceipts = yearReceipts.filter(r => r.status === 'pendiente' || r.status === 'vencido');
    const pendingTotal = pendingReceipts.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

    return {
      arsTotal,
      usdTotal,
      paymentCount: yearReceipts.length,
      pendingCount: pendingReceipts.length,
      pendingTotal,
      arsAverage: arsReceipts.length ? arsTotal / arsReceipts.length : 0,
      usdAverage: usdReceipts.length ? usdTotal / usdReceipts.length : 0,
      monthly,
      maxMonthly: Math.max(...monthly.map(m => m.ars), 1),
    };
  }, [yearReceipts, months]);

  const summaryData = useMemo(() => {
    const sortedProperties = [...selectedProperties].sort((a, b) => {
      const buildingCompare = a.building.localeCompare(b.building);
      if (buildingCompare !== 0) return buildingCompare;
      return a.name.localeCompare(b.name);
    });

    const buildingColorMap = new Map<string, typeof buildingColors[0]>();
    const uniqueBuildings = Array.from(new Set(sortedProperties.map(p => p.building))).sort();
    uniqueBuildings.forEach((building, index) => {
      buildingColorMap.set(building, buildingColors[index % buildingColors.length]);
    });

    const rows = sortedProperties.map(property => {
      const tenant = tenants.find(t => t.propertyId === property.id);
      const tenantName = tenant?.name || 'DESOCUPADA';
      const isVacant = !tenant;

      const monthlyPayments = receipts.filter(r => {
        const receiptMonth = months.indexOf(r.month);
        return r.property === property.name && receiptMonth === selectedMonth && r.year === selectedYear;
      });

      const monthlyTotal = monthlyPayments.reduce((sum, r) => sum + (r.paidAmount || 0), 0);

      const allTenantReceipts = receipts.filter(r => {
        if (tenant) return r.tenant === tenant.name;
        return r.property === property.name;
      });

      const totalDebt = allTenantReceipts.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

      return {
        building: property.building,
        propertyName: property.name,
        tenant: tenantName,
        monthlyPayment: monthlyTotal,
        totalDebt,
        color: buildingColorMap.get(property.building),
        isVacant,
      };
    });

    const totalMonthlyPayments = rows.reduce((sum, row) => sum + row.monthlyPayment, 0);
    const totalDebt = rows.reduce((sum, row) => sum + row.totalDebt, 0);

    return { rows, totalMonthlyPayments, totalDebt };
  }, [selectedProperties, tenants, receipts, selectedMonth, selectedYear, months]);

  const formatARS = (amount: number) => `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
  const formatUSD = (amount: number) => `U$S ${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

  const handlePrint = () => window.print();

  return (
    <div className={embedded ? 'space-y-6' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'}>
      <div className={embedded ? 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' : 'bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col'}>
        <div className="flex justify-between items-center p-6 border-b print:hidden">
          <h2 className="text-2xl font-bold text-gray-800">Resumen Mensual de Pagos</h2>
          {!embedded && onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="p-6 print:hidden border-b">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[260px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Propiedades</label>
              <div className="border border-gray-300 rounded-lg p-2 max-h-36 overflow-y-auto bg-white">
                <button
                  type="button"
                  onClick={toggleAllProperties}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded"
                >
                  {allPropertiesSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {allPropertiesSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  {properties.map(property => (
                    <label key={property.id} className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPropertyIds.includes(property.id)}
                        onChange={() => toggleProperty(property.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{property.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </button>
          </div>
        </div>

        <div className={embedded ? 'overflow-auto p-6' : 'flex-1 overflow-auto p-6'}>
          <div className="print:p-8">

            {/* ===== Dashboard cards ===== */}
            <section className="space-y-6 mb-8 print:hidden">
              {/* Summary cards row */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total ARS */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">ARS</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{formatARS(dashboardData.arsTotal)}</p>
                  <p className="mt-1 text-sm text-slate-500">Total cobrado en {selectedYear}</p>
                </div>

                {/* Total USD */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">USD</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{formatUSD(dashboardData.usdTotal)}</p>
                  <p className="mt-1 text-sm text-slate-500">Total cobrado en {selectedYear}</p>
                </div>

                {/* Payments count */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-violet-50 p-2.5 text-violet-600">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{dashboardData.paymentCount}</p>
                  <p className="mt-1 text-sm text-slate-500">Pagos registrados</p>
                </div>

                {/* Pending */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="rounded-full bg-amber-50 p-2.5 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Pendiente</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{formatARS(dashboardData.pendingTotal)}</p>
                  <p className="mt-1 text-sm text-slate-500">{dashboardData.pendingCount} recibos pendientes / vencidos</p>
                </div>
              </div>

              {/* Monthly income bar chart */}
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Ingresos Mensuales {selectedYear}</h2>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-slate-500">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-blue-500" />Cobrado ARS</span>
                    <span className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-orange-500" />Cobrado USD</span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-12 sm:gap-3">
                  {dashboardData.monthly.map(item => {
                    const height = item.ars ? Math.max((item.ars / dashboardData.maxMonthly) * 100, 4) : 2;
                    return (
                      <div key={item.month} className="min-w-0 text-center">
                        <div className="mb-2 flex h-32 items-end justify-center border-b border-slate-100">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
                            style={{ height: `${height}%` }}
                            title={formatARS(item.ars)}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-500">{item.month}</p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-900">{formatARS(item.ars)}</p>
                        {item.usd > 0 && (
                          <p className="truncate text-xs font-medium text-orange-600">{formatUSD(item.usd)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Average row */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Promedio por recibo ARS</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{formatARS(dashboardData.arsAverage)}</p>
                  </div>
                  <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Promedio por recibo USD</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{formatUSD(dashboardData.usdAverage)}</p>
                  </div>
                  <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Monthly table ===== */}
            <div className="text-center mb-6 print:block">
              <h1 className="text-3xl font-bold text-gray-900 uppercase">
                {months[selectedMonth]} {selectedYear}
              </h1>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border-2 border-gray-900 px-4 py-3 text-left font-bold">EDIFICIO</th>
                    <th className="border-2 border-gray-900 px-4 py-3 text-left font-bold">PROPIEDAD</th>
                    <th className="border-2 border-gray-900 px-4 py-3 text-left font-bold">INQUILINO</th>
                    <th className="border-2 border-gray-900 px-4 py-3 text-right font-bold">PAGOS DEL MES</th>
                    <th className="border-2 border-gray-900 px-4 py-3 text-right font-bold">DEUDA TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.rows.map((row, index) => {
                    const rowBg = row.isVacant ? 'bg-red-100' : row.color?.bg;
                    const rowText = row.isVacant ? 'text-red-900' : row.color?.text;
                    const rowBorder = row.isVacant ? 'border-red-300' : row.color?.border;

                    return (
                      <tr key={index} className={`${rowBg} ${rowText}`}>
                        <td className={`border-2 ${rowBorder} px-4 py-2 font-bold`}>
                          {index === 0 || row.building !== summaryData.rows[index - 1].building ? row.building : ''}
                        </td>
                        <td className={`border-2 ${rowBorder} px-4 py-2`}>{row.propertyName}</td>
                        <td className={`border-2 ${rowBorder} px-4 py-2 font-semibold`}>{row.tenant}</td>
                        <td className={`border-2 ${rowBorder} px-4 py-2 text-right font-semibold`}>
                          {row.monthlyPayment.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`border-2 ${rowBorder} px-4 py-2 text-right font-semibold`}>
                          {row.totalDebt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-yellow-300 text-gray-900 font-bold text-lg">
                    <td colSpan={3} className="border-2 border-gray-900 px-4 py-3">TOTAL</td>
                    <td className="border-2 border-gray-900 px-4 py-3 text-right">
                      {summaryData.totalMonthlyPayments.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="border-2 border-gray-900 px-4 py-3 text-right">
                      {summaryData.totalDebt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {!embedded && onClose && (
          <div className="p-4 border-t bg-gray-50 print:hidden">
            <button
              onClick={onClose}
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {!embedded && <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0 { position: static; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:p-8 { padding: 2rem !important; }
          .bg-white { background-color: white !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>}
    </div>
  );
};

export default MonthlySummary;
