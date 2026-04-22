import { DataManagement } from './DataManagement';
import React, { useMemo, useState } from 'react';
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, Calendar, X } from 'lucide-react';
import { Tenant, Receipt, Property } from '../App';
import TenantAccountStatement from './TenantAccountStatement';

type TabType = 'dashboard' | 'properties' | 'tenants' | 'receipts' | 'history' | 'cash';

interface DashboardProps {
  tenants: Tenant[];
  receipts: Receipt[];
  properties: Property[];
  setActiveTab: (tab: TabType) => void;
}

/**
 * Convierte cualquier cosa a número seguro.
 * - undefined/null/"" => 0
 * - "12345" => 12345
 * - NaN/Infinity => 0
 */
const toNumberSafe = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return 0;
    const n = Number(trimmed.replace(/\./g, '').replace(',', '.')); // por si viene con separadores raros
    return Number.isFinite(n) ? n : 0;
  }
  if (v == null) return 0;
  const n = Number(v as any);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v: unknown): string => {
  const n = toNumberSafe(v);
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
};

const safeDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateShort = (v: unknown): string => {
  const d = safeDate(v);
  if (!d) return '-';
  // formato simple y claro
  return d.toLocaleDateString('es-AR');
};

const Dashboard: React.FC<DashboardProps> = ({ tenants, receipts, properties, setActiveTab }) => {
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Calcular pagos pendientes basado en datos reales (blindado)
  const pendingPayments = useMemo(() => {
    const today = new Date();

    return (tenants ?? [])
      .filter((tenant: any) => tenant?.status === 'activo')
      .map((tenant: any) => {
        const allTenantReceipts = (receipts ?? []).filter((r: any) => r?.tenant === tenant?.name);
        const totalDebt = allTenantReceipts.reduce((sum: number, r: any) => sum + toNumberSafe(r?.remainingBalance), 0);

        const contractEndDate = safeDate(tenant?.contractEnd);
        const daysOverdue =
          contractEndDate
            ? Math.max(
                0,
                Math.floor((today.getTime() - contractEndDate.getTime()) / (1000 * 60 * 60 * 24))
              )
            : 0;

        return {
          id: tenant?.id ?? `${tenant?.name ?? 'tenant'}-${Math.random()}`,
          tenant: tenant?.name ?? 'Sin nombre',
          property: tenant?.property ?? 'Sin propiedad',
          amount: totalDebt,
          dueDate: tenant?.contractEnd ?? '',
          daysOverdue,
        };
      })
      .filter((payment) => payment.amount > 0);
  }, [tenants, receipts]);

  const totalPendingAmount = useMemo(
    () => pendingPayments.reduce((sum, payment) => sum + toNumberSafe(payment.amount), 0),
    [pendingPayments]
  );

  // Estadísticas
  const totalProperties = (properties ?? []).length;
  const activeTenants = (tenants ?? []).filter((t: any) => t?.status === 'activo').length;
  const occupancyRate =
    totalProperties > 0 ? ((activeTenants / totalProperties) * 100).toFixed(1) : '0';

  // Ingresos del mes actual separados por moneda
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const paidReceipts = (receipts ?? []).filter((receipt: any) => {
      const receiptDate = safeDate(receipt?.createdDate);
      if (!receiptDate) return false;

      return (
        receiptDate.getMonth() === currentMonth &&
        receiptDate.getFullYear() === currentYear &&
        receipt?.status === 'pagado'
      );
    });

    const ars = paidReceipts
      .filter((r: any) => r?.currency === 'ARS')
      .reduce((sum: number, r: any) => sum + toNumberSafe(r?.paidAmount), 0);

    const usd = paidReceipts
      .filter((r: any) => r?.currency === 'USD')
      .reduce((sum: number, r: any) => sum + toNumberSafe(r?.paidAmount), 0);

    return { ars, usd };
  }, [receipts]);

  const stats = useMemo(
    () => [
      {
        title: 'Propiedades Totales',
        value: totalProperties.toString(),
        icon: Building2,
        color: 'bg-blue-500',
        change: '+2 este mes',
      },
      {
        title: 'Inquilinos Activos',
        value: activeTenants.toString(),
        icon: Users,
        color: 'bg-green-500',
        change: `${occupancyRate}% ocupación`,
      },
      {
        title: 'Ingresos del Mes',
        value: `$${formatMoney(monthlyIncome.ars)}`,
        icon: DollarSign,
        color: 'bg-emerald-500',
        change: `U$S ${formatMoney(monthlyIncome.usd)}`,
      },
      {
        title: 'Pagos Pendientes',
        value: `${pendingPayments.length}`,
        icon: AlertTriangle,
        color: 'bg-red-500',
        change: `$${formatMoney(totalPendingAmount)} total`,
        clickable: true,
      },
    ],
    [totalProperties, activeTenants, occupancyRate, monthlyIncome, pendingPayments.length, totalPendingAmount]
  );

  // Pagos recientes (solo pagados)
  const recentPayments = useMemo(() => {
    return (receipts ?? [])
      .filter((receipt: any) => receipt?.status === 'pagado')
      .slice()
      .sort((a: any, b: any) => {
        const da = safeDate(a?.createdDate)?.getTime() ?? 0;
        const db = safeDate(b?.createdDate)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 4)
      .map((receipt: any) => {
        return {
          id: receipt?.id ?? `${receipt?.tenant ?? 'receipt'}-${Math.random()}`,
          tenant: receipt?.tenant ?? 'Sin inquilino',
          property: receipt?.property ?? 'Sin propiedad',
          amount: toNumberSafe(receipt?.paidAmount),
          currency: receipt?.currency ?? 'ARS',
          date: receipt?.createdDate ?? '',
          status: 'paid',
        };
      });
  }, [receipts]);

  // Lista de inquilinos activos con su deuda separada por moneda
  const tenantDebts = useMemo(() => {
    return (tenants ?? [])
      .filter((tenant: any) => tenant?.status === 'activo')
      .map((tenant: any) => {
        const allTenantReceipts = (receipts ?? []).filter((r: any) => r?.tenant === tenant?.name);

        const debtARS = allTenantReceipts
          .filter((r: any) => r?.currency === 'ARS')
          .reduce((sum: number, r: any) => sum + toNumberSafe(r?.remainingBalance), 0);

        const debtUSD = allTenantReceipts
          .filter((r: any) => r?.currency === 'USD')
          .reduce((sum: number, r: any) => sum + toNumberSafe(r?.remainingBalance), 0);

        // Debug para verificar el cálculo
        if (tenant?.name?.toLowerCase().includes('pazzi')) {
          console.log('DEBUG PAZZI:', {
            name: tenant?.name,
            receiptsFound: allTenantReceipts.length,
            debtARS,
            debtUSD,
            receipts: allTenantReceipts.map((r: any) => ({
              receiptNumber: r?.receiptNumber,
              currency: r?.currency,
              total: r?.total,
              paidAmount: r?.paidAmount,
              remainingBalance: r?.remainingBalance,
            }))
          });
        }

        return {
          id: tenant?.id ?? `${tenant?.name ?? 'tenant'}-${Math.random()}`,
          tenant: tenant?.name ?? 'Sin nombre',
          property: tenant?.property ?? 'Sin propiedad',
          debtARS,
          debtUSD,
          hasDebt: debtARS > 0 || debtUSD > 0,
        };
      })
      .sort((a, b) => (b.debtARS + b.debtUSD * 1000) - (a.debtARS + a.debtUSD * 1000));
  }, [tenants, receipts]);

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                stat.clickable ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={stat.clickable ? () => setShowPendingDetails(true) : undefined}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pagos Recientes</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentPayments.map((payment) => {
                const tenant = tenants.find(t => t.name === payment.tenant);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    onClick={() => tenant && setSelectedTenant(tenant)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{payment.tenant}</p>
                      <p className="text-sm text-gray-500">{payment.property}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${payment.status === 'paid' ? 'text-gray-900' : 'text-red-600'}`}>
                        {payment.currency === 'USD' ? 'U$S ' : '$'}{formatMoney(payment.amount)}
                      </p>
                      <div className="flex items-center space-x-2 justify-end">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                        <span className="text-xs text-gray-500">{formatDateShort(payment.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentPayments.length === 0 && (
                <div className="text-sm text-gray-500">No hay pagos recientes para mostrar.</div>
              )}
            </div>
          </div>
        </div>

        {/* Deudas por Inquilino */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Deudas por Inquilino</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {tenantDebts.map((item) => {
                const tenant = tenants.find(t => t.name === item.tenant);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    onClick={() => tenant && setSelectedTenant(tenant)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.tenant}</p>
                      <p className="text-sm text-gray-500 truncate">{item.property}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="space-y-1">
                        {item.debtARS > 0 && (
                          <p className="font-semibold text-red-600">
                            ${formatMoney(item.debtARS)}
                          </p>
                        )}
                        {item.debtUSD > 0 && (
                          <p className="font-semibold text-red-600">
                            U$S {formatMoney(item.debtUSD)}
                          </p>
                        )}
                        {!item.hasDebt && (
                          <p className="font-semibold text-green-600">$0</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.hasDebt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.hasDebt ? 'Debe' : 'Al día'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {tenantDebts.length === 0 && (
                <div className="text-sm text-gray-500">No hay inquilinos activos para mostrar.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('properties')}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Building2 className="h-5 w-5" />
            <span>Agregar Propiedad</span>
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span>Nuevo Inquilino</span>
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <DollarSign className="h-5 w-5" />
            <span>Generar Recibo</span>
          </button>
        </div>
      </div>

      {/* Pending Payments Modal */}
      {showPendingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de Pagos Pendientes</h3>
              <button
                onClick={() => setShowPendingDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{payment.tenant}</h4>
                      <p className="text-sm text-gray-600">{payment.property}</p>
                      <p className="text-xs text-gray-500">
                        Vencimiento: {formatDateShort(payment.dueDate)}
                      </p>
                      {payment.daysOverdue > 0 && (
                        <p className="text-xs text-red-600 font-medium">
                          {payment.daysOverdue} días de atraso
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${formatMoney(payment.amount)}</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.daysOverdue > 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payment.daysOverdue > 0 ? 'Vencido' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {pendingPayments.length === 0 && (
                <div className="text-sm text-gray-500">No hay pagos pendientes.</div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Pendiente:</span>
                <span className="text-xl font-bold text-red-600">
                  ${formatMoney(totalPendingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Account Statement Modal */}
      {selectedTenant && (
        <TenantAccountStatement
          tenant={selectedTenant}
          receipts={receipts}
          onClose={() => setSelectedTenant(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;