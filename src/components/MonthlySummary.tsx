import React, { useState, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { Property, Tenant, Receipt } from '../App';

interface MonthlySummaryProps {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  onClose: () => void;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  properties,
  tenants,
  receipts,
  onClose,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

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

  const summaryData = useMemo(() => {
    const sortedProperties = [...properties].sort((a, b) => {
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
        return r.property === property.name &&
               receiptMonth === selectedMonth &&
               r.year === selectedYear;
      });

      const monthlyTotal = monthlyPayments.reduce((sum, r) => sum + (r.paidAmount || 0), 0);

      const allTenantReceipts = receipts.filter(r => {
        if (tenant) {
          return r.tenant === tenant.name;
        }
        return r.property === property.name;
      });

      const totalDebt = allTenantReceipts.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

      return {
        building: property.building,
        address: property.address,
        tenant: tenantName,
        monthlyPayment: monthlyTotal,
        totalDebt: totalDebt,
        color: buildingColorMap.get(property.building),
        isVacant: isVacant,
      };
    });

    const totalMonthlyPayments = rows.reduce((sum, row) => sum + row.monthlyPayment, 0);
    const totalDebt = rows.reduce((sum, row) => sum + row.totalDebt, 0);

    return { rows, totalMonthlyPayments, totalDebt };
  }, [properties, tenants, receipts, selectedMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b print:hidden">
          <h2 className="text-2xl font-bold text-gray-800">Resumen Mensual de Pagos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 print:hidden border-b">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
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
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handlePrint}
              className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="print:p-8">
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
                          {index === 0 || row.building !== summaryData.rows[index - 1].building
                            ? row.building
                            : ''}
                        </td>
                        <td className={`border-2 ${rowBorder} px-4 py-2`}>
                          {row.address}
                        </td>
                        <td className={`border-2 ${rowBorder} px-4 py-2 font-semibold`}>
                          {row.tenant}
                        </td>
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
                    <td colSpan={3} className="border-2 border-gray-900 px-4 py-3">
                      TOTAL
                    </td>
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

        <div className="p-4 border-t bg-gray-50 print:hidden">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0 {
            position: static;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:p-8 {
            padding: 2rem !important;
          }
          .bg-white {
            background-color: white !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default MonthlySummary;
