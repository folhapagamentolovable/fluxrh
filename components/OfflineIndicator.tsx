import React from 'react';
import { WifiOff, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingChanges, syncData } = useOfflineSync();

  // Se online e sem mudanças pendentes, não mostrar nada
  if (isOnline && pendingChanges === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 rounded-2xl shadow-xl p-4 z-40 transition-all duration-300 ${
      isOnline ? 'bg-blue-600' : 'bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          {!isOnline ? (
            <>
              <div className="p-2 bg-white/20 rounded-xl">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Você está offline</p>
                <p className="text-sm text-white/80">
                  {pendingChanges > 0 
                    ? `${pendingChanges} alteração(ões) salvas localmente` 
                    : 'Suas alterações serão salvas localmente'}
                </p>
              </div>
            </>
          ) : isSyncing ? (
            <>
              <div className="p-2 bg-white/20 rounded-xl">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="font-semibold">Sincronizando...</p>
                <p className="text-sm text-white/80">
                  Enviando alterações para o servidor
                </p>
              </div>
            </>
          ) : pendingChanges > 0 ? (
            <>
              <div className="p-2 bg-white/20 rounded-xl">
                <CloudOff className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{pendingChanges} pendente(s)</p>
                <p className="text-sm text-white/80">
                  Clique para sincronizar
                </p>
              </div>
            </>
          ) : null}
        </div>

        {isOnline && pendingChanges > 0 && !isSyncing && (
          <button
            onClick={syncData}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <Cloud className="w-4 h-4" />
            Sincronizar
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
