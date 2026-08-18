import React, { useState, useMemo } from 'react';
import { Printer, Download, Share2, TrendingUp, DollarSign, Banknote, Building2, Calendar } from 'lucide-react';
import { CashMovement } from '../App';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatARS = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
const formatUSD = (n: number) => `U$S ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

interface FinancialReportProps {
  cashMovements: CashMovement[];
}

interface MonthRow {
  year: number;
  monthIndex: number;
  label: string;
  ars: number;
  usd: number;
  paymentCount: number;
  details: { efectivo: number; transferencia: number; dolares: number };
}

const FinancialReport: React.FC<FinancialReportProps> = ({ cashMovements }) => {
  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  const years = useMemo(() => {
    const ys = new Set<number>();
    cashMovements.forEach(m => { if (m.date) ys.add(Number(m.date.slice(0, 4))); });
    ys.add(now.getFullYear());
    return Array.from(ys).sort((a, b) => a - b);
  }, [cashMovements]);

  const rangeStart = useMemo(() => new Date(fromYear, fromMonth, 1), [fromYear, fromMonth]);
  const rangeEnd = useMemo(() => new Date(toYear, toMonth + 1, 0, 23, 59, 59), [toYear, toMonth]);

  const data: MonthRow[] = useMemo(() => {
    const valid = cashMovements.filter(m => {
      if (m.type !== 'income' || !m.date || m.amount <= 0) return false;
      const d = new Date(`${m.date}T12:00:00`);
      return d >= rangeStart && d <= rangeEnd;
    });

    const map = new Map<string, MonthRow>();

    valid.forEach(movement => {
      const d = new Date(`${movement.date}T12:00:00`);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      if (!map.has(key)) {
        map.set(key, {
          year: y,
          monthIndex: m,
          label: `${months[m]} ${y}`,
          ars: 0,
          usd: 0,
          paymentCount: 0,
          details: { efectivo: 0, transferencia: 0, dolares: 0 },
        });
      }
      const row = map.get(key)!;
      row.paymentCount++;

      if (movement.paymentMethod === 'dolares' || movement.currency === 'USD') {
        row.usd += movement.amount;
        row.details.dolares += movement.amount;
      } else {
        row.ars += movement.amount;
        if (movement.paymentMethod === 'efectivo') row.details.efectivo += movement.amount;
        else row.details.transferencia += movement.amount;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex
    );
  }, [cashMovements, rangeStart, rangeEnd]);

  const totals = useMemo(() => {
    const ars = data.reduce((s, r) => s + r.ars, 0);
    const usd = data.reduce((s, r) => s + r.usd, 0);
    const count = data.reduce((s, r) => s + r.paymentCount, 0);
    const efectivo = data.reduce((s, r) => s + r.details.efectivo, 0);
    const transferencia = data.reduce((s, r) => s + r.details.transferencia, 0);
    const dolares = data.reduce((s, r) => s + r.details.dolares, 0);
    return { ars, usd, count, efectivo, transferencia, dolares };
  }, [data]);

  const maxBar = Math.max(...data.map(d => d.ars), 1);

  const rangeLabel = () => {
    if (fromYear === toYear && fromMonth === toMonth) {
      return `${months[fromMonth]} ${fromYear}`;
    }
    return `${monthsShort[fromMonth]} ${fromYear} — ${monthsShort[toMonth]} ${toYear}`;
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const header = 'Mes,Cobrado ARS,Efectivo,Transferencia,Dolares,Cantidad Pagos\n';
    const rows = data.map(d =>
      `${d.label},${d.ars.toFixed(0)},${d.details.efectivo.toFixed(0)},${d.details.transferencia.toFixed(0)},${d.details.dolares.toFixed(0)},${d.paymentCount}`
    ).join('\n');
    const totalRow = `\nTOTAL,${totals.ars.toFixed(0)},${totals.efectivo.toFixed(0)},${totals.transferencia.toFixed(0)},${totals.dolares.toFixed(0)},${totals.count}`;
    const csv = header + rows + totalRow;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_financiero_${rangeLabel().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    let text = `Resumen Financiero — ${rangeLabel()}\n\n`;
    data.forEach(d => {
      text += `${d.label}: ${formatARS(d.ars)}${d.usd > 0 ? ` / ${formatUSD(d.usd)}` : ''} (${d.paymentCount} pagos)\n`;
    });
    text += `\nTOTAL: ${formatARS(totals.ars)}`;
    if (totals.usd > 0) text += ` + ${formatUSD(totals.usd)}`;
    text += `\nEfectivo: ${formatARS(totals.efectivo)} | Transferencia: ${formatARS(totals.transferencia)} | Dolares: ${formatUSD(totals.dolares)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Resumen Financiero', text });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Resumen copiado al portapapeles. Pega donde quieras compartirlo.');
      } catch {
        alert('No se pudo copiar. Tu navegador no soporta compartir.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="print:hidden">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Resumen Financiero</h1>
            <p className="text-sm text-slate-500">Cobranzas recibidas en el periodo seleccionado</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-semibold">Periodo</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
            <div className="flex gap-2">
              <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="text-slate-300 text-lg">—</div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
            <div className="flex gap-2">
              <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={toYear} onChange={e => setToYear(Number(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Share2 className="h-4 w-4" /> Compartir
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-5 sm:grid-cols-3 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">ARS</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{formatARS(totals.ars)}</p>
          <p className="mt-1 text-sm text-slate-500">Efectivo + Transferencia</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">USD</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{formatUSD(totals.usd)}</p>
          <p className="mt-1 text-sm text-slate-500">Dolares</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-violet-50 p-2.5 text-violet-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-950">{totals.count}</p>
          <p className="mt-1 text-sm text-slate-500">Pagos recibidos en el periodo</p>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-2xl font-bold">Resumen Financiero</h1>
        <p className="text-sm">{rangeLabel()}</p>
      </div>

      {/* Results table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Detalle por mes — {rangeLabel()}</h2>
        </div>

        {data.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-400 text-lg">No hay cobranzas registradas en este periodo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-sm">
                  <th className="px-6 py-3 text-left font-semibold">Mes</th>
                  <th className="px-6 py-3 text-right font-semibold">Efectivo</th>
                  <th className="px-6 py-3 text-right font-semibold">Transferencia</th>
                  <th className="px-6 py-3 text-right font-semibold">Cobrado ARS</th>
                  <th className="px-6 py-3 text-right font-semibold">Dolares (U$S)</th>
                  <th className="px-6 py-3 text-right font-semibold">Pagos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{formatARS(row.details.efectivo)}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{formatARS(row.details.transferencia)}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-700">{formatARS(row.ars)}</td>
                    <td className="px-6 py-3 text-right font-bold text-blue-700">{row.usd > 0 ? formatUSD(row.usd) : '—'}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{row.paymentCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-6 py-4">TOTAL</td>
                  <td className="px-6 py-4 text-right">{formatARS(totals.efectivo)}</td>
                  <td className="px-6 py-4 text-right">{formatARS(totals.transferencia)}</td>
                  <td className="px-6 py-4 text-right text-emerald-300">{formatARS(totals.ars)}</td>
                  <td className="px-6 py-4 text-right text-blue-300">{totals.usd > 0 ? formatUSD(totals.usd) : '—'}</td>
                  <td className="px-6 py-4 text-right">{totals.count}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bar chart */}
      {data.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm print:hidden">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Grafico de cobranzas ARS</h2>
          <div className="flex items-end gap-3 h-48">
            {data.map((row, i) => {
              const h = row.ars ? Math.max((row.ars / maxBar) * 100, 3) : 2;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <span className="text-xs font-bold text-slate-700 mb-1">{formatARS(row.ars)}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 hover:from-blue-700" style={{ height: `${h}%` }} />
                  <span className="text-xs text-slate-500 mt-2 text-center">{monthsShort[row.monthIndex]} {String(row.year).slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default FinancialReport;