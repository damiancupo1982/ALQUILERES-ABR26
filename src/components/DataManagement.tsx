import React, { useRef, useState } from 'react';

interface DataManagementProps {
  onImport?: (data: any) => void;
  onExport?: () => any;
}

export const DataManagement: React.FC<DataManagementProps> = ({ 
  onImport, 
  onExport 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  React.useEffect(() => {
    const properties = JSON.parse(localStorage.getItem('properties') || '[]');
    const tenants = JSON.parse(localStorage.getItem('tenants') || '[]');
    const receipts = JSON.parse(localStorage.getItem('receipts') || '[]');
    const cashMovements = JSON.parse(localStorage.getItem('cashMovements') || '[]');
    
    const total = properties.length + tenants.length + receipts.length + cashMovements.length;
    setTotalRecords(total);
  }, []);

  const handleExport = () => {
    try {
      const properties = JSON.parse(localStorage.getItem('properties') || '[]');
      const tenants = JSON.parse(localStorage.getItem('tenants') || '[]');
      const receipts = JSON.parse(localStorage.getItem('receipts') || '[]');
      const cashMovements = JSON.parse(localStorage.getItem('cashMovements') || '[]');

      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        properties,
        tenants,
        receipts,
        cashMovements
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `alquileres_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `✅ Exportado: ${totalRecords} registros` });
      setTimeout(() => setMessage(null), 3000);

      if (onExport) onExport();
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error al exportar: ${error.message}` });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (!data.version || !data.properties) {
        throw new Error('Formato de archivo inválido');
      }

      localStorage.setItem('properties', JSON.stringify(data.properties || []));
      localStorage.setItem('tenants', JSON.stringify(data.tenants || []));
      localStorage.setItem('receipts', JSON.stringify(data.receipts || []));
      localStorage.setItem('cashMovements', JSON.stringify(data.cashMovements || []));

      const total = 
        (data.properties?.length || 0) + 
        (data.tenants?.length || 0) + 
        (data.receipts?.length || 0) + 
        (data.cashMovements?.length || 0);

      setTotalRecords(total);
      setMessage({ type: 'success', text: `✅ Importado: ${total} registros` });

      if (onImport) onImport(data);

      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="text-blue-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm8-1a1 1 0 00-1 1v6a1 1 0 001 1h4a1 1 0 001-1v-6a1 1 0 00-1-1h-4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Gestión de Datos</h2>
      </div>

      <div className="space-y-3 mb-6">
        <button
          onClick={handleExport}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Todo
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {isLoading ? 'Importando...' : 'Importar Datos'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="text-center text-gray-600 text-sm">
        <p className="font-semibold text-gray-700">{totalRecords} registros totales</p>
      </div>
    </div>
  );
};