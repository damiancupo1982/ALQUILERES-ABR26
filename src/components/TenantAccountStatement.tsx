import React, { useMemo, useState } from 'react';
import { X, Printer, FileText, Calendar, Plus } from 'lucide-react';
import { Tenant, Receipt, TenantAdjustment } from '../App';

interface TenantAccountStatementProps {
  tenant: Tenant;
  receipts: Receipt[];
  adjustments?: TenantAdjustment[];
  onAddAdjustment?: (adjustment: Omit<TenantAdjustment, 'id'>) => Promise<void>;
  onClose: () => void;
}

interface Movement {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'receipt' | 'payment' | 'adjustment';
  receiptNumber?: string;
}

const TenantAccountStatement: React.FC<TenantAccountStatementProps> = ({
  tenant,
  receipts,
  adjustments = [],
  onAddAdjustment,
  onClose,
}) => {
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
  });

  const movements = useMemo(() => {
    const tenantReceipts = receipts.filter(r =>
      r.tenant.toLowerCase() === tenant.name.toLowerCase()
    );
    const tenantAdjustments = adjustments.filter(a =>
      a.tenant.toLowerCase() === tenant.name.toLowerCase()
    );

    const allMovements: Movement[] = [];
    let runningBalance = 0;

    type RawEvent =
      | { kind: 'receipt-debit'; date: string; receipt: Receipt }
      | { kind: 'receipt-credit'; date: string; receipt: Receipt }
      | { kind: 'adjustment'; date: string; adjustment: TenantAdjustment };

    const rawEvents: RawEvent[] = [];

    tenantReceipts.forEach(receipt => {
      rawEvents.push({ kind: 'receipt-debit', date: receipt.createdDate, receipt });
      if (receipt.paidAmount > 0) {
        rawEvents.push({ kind: 'receipt-credit', date: receipt.createdDate, receipt });
      }
    });

    tenantAdjustments.forEach(adjustment => {
      rawEvents.push({ kind: 'adjustment', date: adjustment.date, adjustment });
    });

    rawEvents.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return diff;
      if (a.kind === 'adjustment' && b.kind !== 'adjustment') return 1;
      if (a.kind !== 'adjustment' && b.kind === 'adjustment') return -1;
      return 0;
    });

    rawEvents.forEach(event => {
      if (event.kind === 'receipt-debit') {
        const { receipt } = event;
        runningBalance += receipt.total;
        allMovements.push({
          id: `${receipt.id}-debit`,
          date: receipt.createdDate,
          description: `Recibo ${receipt.receiptNumber} - ${receipt.month} ${receipt.year}`,
          debit: receipt.total,
          credit: 0,
          balance: runningBalance,
          type: 'receipt',
          receiptNumber: receipt.receiptNumber,
        });
      } else if (event.kind === 'receipt-credit') {
        const { receipt } = event;
        runningBalance -= receipt.paidAmount;
        allMovements.push({
          id: `${receipt.id}-credit`,
          date: receipt.createdDate,
          description: `Pago ${receipt.paymentMethod} - Recibo ${receipt.receiptNumber}`,
          debit: 0,
          credit: receipt.paidAmount,
          balance: runningBalance,
          type: 'payment',
          receiptNumber: receipt.receiptNumber,
        });
      } else {
        const { adjustment } = event;
        if (adjustment.amount > 0) {
          runningBalance += adjustment.amount;
          allMovements.push({
            id: `adj-${adjustment.id}`,
            date: adjustment.date,
            description: `Ajuste: ${adjustment.reason}`,
            debit: adjustment.amount,
            credit: 0,
            balance: runningBalance,
            type: 'adjustment',
          });
        } else {
          runningBalance += adjustment.amount;
          allMovements.push({
            id: `adj-${adjustment.id}`,
            date: adjustment.date,
            description: `Ajuste: ${adjustment.reason}`,
            debit: 0,
            credit: Math.abs(adjustment.amount),
            balance: runningBalance,
            type: 'adjustment',
          });
        }
      }
    });

    return allMovements;
  }, [tenant, receipts, adjustments]);

  const handleSaveAdjustment = async () => {
    if (!onAddAdjustment) return;
    const amount = parseFloat(adjustmentForm.amount);
    if (isNaN(amount) || amount === 0) return;
    if (!adjustmentForm.reason.trim()) return;

    setSavingAdjustment(true);
    try {
      await onAddAdjustment({
        tenant: tenant.name,
        date: adjustmentForm.date,
        amount,
        reason: adjustmentForm.reason.trim(),
      });
      setAdjustmentForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        reason: '',
      });
      setShowAdjustmentModal(false);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statementHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cuenta Corriente - ${tenant.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .tenant-info {
              margin-bottom: 20px;
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #333;
              color: white;
              font-weight: bold;
              text-align: center;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .debit { color: #dc2626; font-weight: bold; }
            .credit { color: #16a34a; font-weight: bold; }
            .balance { font-weight: bold; }
            .final-balance {
              margin-top: 20px;
              padding: 15px;
              background-color: ${finalBalance > 0 ? '#fee2e2' : '#dcfce7'};
              border-radius: 5px;
              text-align: right;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CUENTA CORRIENTE</h1>
            <h2>${tenant.name}</h2>
          </div>

          <div class="tenant-info">
            <div class="info-row">
              <span><strong>Propiedad:</strong> ${tenant.property}</span>
              <span><strong>Contrato:</strong> ${tenant.contractStart} al ${tenant.contractEnd}</span>
            </div>
            <div class="info-row">
              <span><strong>Email:</strong> ${tenant.email}</span>
              <span><strong>Teléfono:</strong> ${tenant.phone}</span>
            </div>
            <div class="info-row">
              <span><strong>Depósito:</strong> $${tenant.deposit.toLocaleString()}</span>
              <span><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-AR')}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Fecha</th>
                <th style="width: 40%;">Descripción</th>
                <th style="width: 15%;">Debe</th>
                <th style="width: 15%;">Haber</th>
                <th style="width: 20%;">Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${movements.map(mov => `
                <tr>
                  <td class="text-center">${new Date(mov.date).toLocaleDateString('es-AR')}</td>
                  <td>${mov.description}</td>
                  <td class="text-right ${mov.debit > 0 ? 'debit' : ''}">
                    ${mov.debit > 0 ? '$' + mov.debit.toLocaleString() : '-'}
                  </td>
                  <td class="text-right ${mov.credit > 0 ? 'credit' : ''}">
                    ${mov.credit > 0 ? '$' + mov.credit.toLocaleString() : '-'}
                  </td>
                  <td class="text-right balance" style="color: ${mov.balance > 0 ? '#dc2626' : '#16a34a'}">
                    $${mov.balance.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="final-balance">
            <h3 style="margin: 0;">
              Saldo Final:
              <span style="color: ${finalBalance > 0 ? '#dc2626' : '#16a34a'}; font-size: 24px;">
                $${finalBalance.toLocaleString()}
              </span>
            </h3>
            <p style="margin: 5px 0 0 0; font-size: 14px;">
              ${finalBalance > 0 ? 'Debe' : finalBalance < 0 ? 'A favor' : 'Al día'}
            </p>
          </div>

          <div class="footer">
            <p>Este resumen de cuenta corriente fue generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
            <p>Sistema de Alquileres</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(statementHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cuenta Corriente</h2>
            <p className="text-gray-600">{tenant.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            {onAddAdjustment && (
              <button
                onClick={() => setShowAdjustmentModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Crear ajuste</span>
              </button>
            )}
            <button
              onClick={printStatement}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Propiedad</p>
              <p className="font-semibold text-gray-900">{tenant.property}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contrato</p>
              <p className="font-semibold text-gray-900">
                {new Date(tenant.contractStart).toLocaleDateString('es-AR')} - {new Date(tenant.contractEnd).toLocaleDateString('es-AR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Depósito</p>
              <p className="font-semibold text-gray-900">${tenant.deposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contacto</p>
              <p className="font-semibold text-gray-900">{tenant.phone}</p>
            </div>
          </div>
        </div>

        {/* Movements Table */}
        <div className="flex-1 overflow-auto p-6">
          {movements.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Debe
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Haber
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement, index) => (
                  <tr key={movement.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {new Date(movement.date).toLocaleDateString('es-AR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        {movement.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {movement.debit > 0 ? (
                        <span className="font-bold text-red-600">
                          ${movement.debit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {movement.credit > 0 ? (
                        <span className="font-bold text-green-600">
                          ${movement.credit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className={`font-bold ${movement.balance > 0 ? 'text-red-600' : movement.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        ${movement.balance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos</h3>
              <p className="text-gray-500">Este inquilino no tiene movimientos registrados aún.</p>
            </div>
          )}
        </div>

        {/* Footer with Final Balance */}
        {movements.length > 0 && (
          <div className={`p-6 border-t border-gray-200 ${finalBalance > 0 ? 'bg-red-50' : finalBalance < 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total de movimientos</p>
                <p className="text-lg font-semibold text-gray-900">{movements.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Saldo Final</p>
                <p className={`text-3xl font-bold ${finalBalance > 0 ? 'text-red-600' : finalBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  ${finalBalance.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-gray-600 mt-1">
                  {finalBalance > 0 ? 'Debe' : finalBalance < 0 ? 'A favor' : 'Al día'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Crear Ajuste</h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={adjustmentForm.date}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importe (positivo = aumenta deuda; negativo = a favor)
                </label>
                <input
                  type="number"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  placeholder="Ej: 1500 o -500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descripción *</label>
                <input
                  type="text"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  placeholder="Ingrese el motivo del ajuste"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={savingAdjustment || !adjustmentForm.reason.trim() || !adjustmentForm.amount || parseFloat(adjustmentForm.amount) === 0}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingAdjustment ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantAccountStatement;
