import React, { useState } from 'react';
import { Wallet, DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft, Download, Calendar, Filter, CreditCard, Banknote, X } from 'lucide-react';
import { CashMovement } from '../App';

interface CashRegisterProps {
  cashMovements: CashMovement[];
  setCashMovements: React.Dispatch<React.SetStateAction<CashMovement[]>>;
}

const CashRegister: React.FC<CashRegisterProps> = ({ cashMovements, setCashMovements }) => {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [deliveryType, setDeliveryType] = useState<'propietario' | 'comision' | 'gasto'>('propietario');
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState<'all' | 'income' | 'delivery'>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'all' | 'efectivo' | 'transferencia' | 'dolares'>('all');

  // Calculate current balances - Caja Pesos only includes 'efectivo' payments
  const balanceARS = cashMovements.reduce((sum, movement) => {
    if (movement.currency === 'ARS' && movement.paymentMethod === 'efectivo') {
      return movement.type === 'income' ? sum + movement.amount : sum - movement.amount;
    }
    return sum;
  }, 0);

  const balanceUSD = cashMovements.reduce((sum, movement) => {
    if (movement.currency === 'USD') {
      return movement.type === 'income' ? sum + movement.amount : sum - movement.amount;
    }
    return sum;
  }, 0);

  // Calculate transfer balances
  const transferBalanceARS = cashMovements.reduce((sum, movement) => {
    if (movement.currency === 'ARS' && movement.paymentMethod === 'transferencia') {
      return movement.type === 'income' ? sum + movement.amount : sum - movement.amount;
    }
    return sum;
  }, 0);

  // Filter movements
  const filteredMovements = cashMovements.filter(movement => {
    const dateMatch = (!dateFrom || movement.date >= dateFrom) && (!dateTo || movement.date <= dateTo);
    const typeMatch = selectedMovementType === 'all' || movement.type === selectedMovementType;
    const methodMatch = selectedPaymentMethod === 'all' || movement.paymentMethod === selectedPaymentMethod;

    return dateMatch && typeMatch && methodMatch;
  });

  const handleDelivery = () => {
    const amount = parseFloat(deliveryAmount);
    if (!amount || amount <= 0) return;

    const currentBalance = selectedCurrency === 'ARS' ? balanceARS : balanceUSD;
    if (amount > currentBalance) {
      alert('No hay suficiente dinero en caja para esta entrega');
      return;
    }

    const getDeliveryDescription = () => {
      if (deliveryDescription.trim()) return deliveryDescription.trim();
      
      switch (deliveryType) {
        case 'propietario': return 'Entrega al propietario';
        case 'comision': return 'Pago de comisión';
        case 'gasto': return 'Pago de gasto';
        default: return 'Entrega';
      }
    };

    const newMovement: CashMovement = {
      id: Date.now(),
      type: 'delivery',
      description: getDeliveryDescription(),
      amount,
      currency: selectedCurrency,
      date: new Date().toISOString().split('T')[0],
      deliveryType,
      paymentMethod: selectedCurrency === 'USD' ? 'dolares' : 'efectivo'
    };

    setCashMovements([newMovement, ...cashMovements]);
    setDeliveryAmount('');
    setDeliveryDescription('');
    setShowDeliveryModal(false);
  };

  const resetCash = (currency: 'ARS' | 'USD') => {
    const currentBalance = currency === 'ARS' ? balanceARS : balanceUSD;
    if (currentBalance <= 0) return;

    const currencySymbol = currency === 'USD' ? 'U$S' : '$';
    if (confirm(`¿Está seguro de entregar todo el dinero en ${currency}? (${currencySymbol} ${currentBalance.toLocaleString()})`)) {
      const newMovement: CashMovement = {
        id: Date.now(),
        type: 'delivery',
        description: `Entrega total al propietario - ${currency}`,
        amount: currentBalance,
        currency,
        date: new Date().toISOString().split('T')[0],
        deliveryType: 'propietario',
        paymentMethod: currency === 'USD' ? 'dolares' : 'efectivo'
      };

      setCashMovements([newMovement, ...cashMovements]);
    }
  };

  const resetTransfers = () => {
    if (transferBalanceARS <= 0) return;

    if (confirm(`¿Está seguro de entregar todas las transferencias? (ARS $${transferBalanceARS.toLocaleString()})`)) {
      const newMovement: CashMovement = {
        id: Date.now(),
        type: 'delivery',
        description: `Entrega total al propietario - Transferencias ARS`,
        amount: transferBalanceARS,
        currency: 'ARS',
        date: new Date().toISOString().split('T')[0],
        deliveryType: 'propietario',
        paymentMethod: 'transferencia'
      };

      setCashMovements([newMovement, ...cashMovements]);
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedMovementType('all');
    setSelectedPaymentMethod('all');
  };

  const exportMovements = () => {
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Moneda', 'Método Pago', 'Tipo Entrega', 'Inquilino', 'Propiedad'];
    const csvContent = [
      headers.join(','),
      ...filteredMovements.map(movement => [
        movement.date,
        movement.type === 'income' ? 'Ingreso' : 'Entrega',
        movement.description,
        movement.amount,
        movement.currency,
        movement.paymentMethod || '',
        movement.deliveryType || '',
        movement.tenant || '',
        movement.property || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateRange = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : `_${new Date().toISOString().split('T')[0]}`;
    link.download = `arqueo_caja${dateRange}.csv`;
    link.click();
  };

  const todayMovements = cashMovements.filter(m => m.date === new Date().toISOString().split('T')[0]);
  const todayIncomeEfectivo = todayMovements
    .filter(m => m.type === 'income' && m.currency === 'ARS' && m.paymentMethod === 'efectivo')
    .reduce((sum, m) => sum + m.amount, 0);
  const todayIncomeTransferencia = todayMovements
    .filter(m => m.type === 'income' && m.currency === 'ARS' && m.paymentMethod === 'transferencia')
    .reduce((sum, m) => sum + m.amount, 0);
  const todayIncomeUSD = todayMovements
    .filter(m => m.type === 'income' && m.currency === 'USD')
    .reduce((sum, m) => sum + m.amount, 0);

  const getDeliveryTypeLabel = (type?: string) => {
    switch (type) {
      case 'propietario': return 'Propietario';
      case 'comision': return 'Comisión';
      case 'gasto': return 'Gasto';
      default: return 'N/A';
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'efectivo': return <Banknote className="h-4 w-4 text-green-500" />;
      case 'transferencia': return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'dolares': return <DollarSign className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Arqueo de Caja</h2>
          <p className="text-gray-600">Control de ingresos y entregas de dinero</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </button>
          <button
            onClick={exportMovements}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setShowDeliveryModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowUpRight className="h-5 w-5" />
            <span>Entregar Dinero</span>
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Caja Pesos</p>
              <p className="text-3xl font-bold text-gray-900">ARS ${balanceARS.toLocaleString()}</p>
              <button
                onClick={() => resetCash('ARS')}
                className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                disabled={balanceARS <= 0}
              >
                Entregar todo
              </button>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Caja Dólares</p>
              <p className="text-3xl font-bold text-gray-900">U$S {balanceUSD.toLocaleString()}</p>
              <button
                onClick={() => resetCash('USD')}
                className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                disabled={balanceUSD <= 0}
              >
                Entregar todo
              </button>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transferencias ARS</p>
              <p className="text-3xl font-bold text-gray-900">ARS ${transferBalanceARS.toLocaleString()}</p>
              <button
                onClick={resetTransfers}
                className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                disabled={transferBalanceARS <= 0}
              >
                Entregar todo
              </button>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Efectivo Hoy</p>
              <p className="text-3xl font-bold text-green-600">${todayIncomeEfectivo.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Cobros en efectivo</p>
            </div>
            <div className="bg-emerald-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transferencias Hoy</p>
              <p className="text-3xl font-bold text-green-600">${todayIncomeTransferencia.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Cobros por transferencia</p>
            </div>
            <div className="bg-emerald-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dólares Hoy</p>
              <p className="text-3xl font-bold text-green-600">U$S {todayIncomeUSD.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Cobros en USD</p>
            </div>
            <div className="bg-emerald-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Movimientos</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento</label>
              <select
                value={selectedMovementType}
                onChange={(e) => setSelectedMovementType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="delivery">Entregas</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="dolares">Dólares</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${filteredMovements.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total ingresos filtrados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${filteredMovements.filter(m => m.type === 'delivery').reduce((sum, m) => sum + m.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total entregas filtradas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{filteredMovements.length}</p>
                <p className="text-sm text-gray-500">Movimientos encontrados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Movimientos de Caja {filteredMovements.length !== cashMovements.length && `(${filteredMovements.length} de ${cashMovements.length})`}
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Descripción
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Método
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Inquilino
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-900">{movement.date}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      {movement.type === 'income' ? (
                        <ArrowDownLeft className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={`text-xs font-medium ${
                        movement.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.type === 'income' ? 'Ingreso' : 'Entrega'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-xs text-gray-900 line-clamp-2">{movement.description}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getPaymentMethodIcon(movement.paymentMethod)}
                      <div>
                        {movement.paymentMethod && (
                          <div className="text-xs text-gray-900 capitalize">{movement.paymentMethod}</div>
                        )}
                        {movement.deliveryType && (
                          <div className="text-xs text-gray-500">{getDeliveryTypeLabel(movement.deliveryType)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {movement.tenant && (
                      <div>
                        <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={movement.tenant}>{movement.tenant}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]" title={movement.property}>{movement.property}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <span className={`text-xs font-semibold ${
                      movement.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.type === 'income' ? '+' : '-'}{movement.currency === 'USD' ? 'U$S' : '$'} {movement.amount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Entregar Dinero al Propietario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => {
                    setSelectedCurrency(e.target.value as 'ARS' | 'USD');
                    const maxAmount = e.target.value === 'ARS' ? balanceARS : balanceUSD;
                    setDeliveryAmount(maxAmount.toString());
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ARS">Pesos Argentinos</option>
                  <option value="USD">Dólares</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de entrega</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="propietario">Al Propietario</option>
                  <option value="comision">Comisión</option>
                  <option value="gasto">Gasto</option>
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Disponible en caja:</p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedCurrency === 'USD' ? 'U$S' : '$'} {(selectedCurrency === 'ARS' ? balanceARS : balanceUSD).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a entregar</label>
                <input
                  type="number"
                  value={deliveryAmount}
                  onChange={(e) => setDeliveryAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  max={selectedCurrency === 'ARS' ? balanceARS : balanceUSD}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={deliveryDescription}
                  onChange={(e) => setDeliveryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Entrega ${deliveryType === 'propietario' ? 'al propietario' : deliveryType === 'comision' ? 'de comisión' : 'de gasto'}`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setDeliveryAmount('');
                  setDeliveryDescription('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelivery}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!deliveryAmount || parseFloat(deliveryAmount) <= 0}
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegister;