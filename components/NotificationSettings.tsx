import React from 'react';
import { Bell, BellOff, Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useOfflineSync } from '../hooks/useOfflineSync';

export const NotificationSettings: React.FC = () => {
  const {
    isSupported: pushSupported,
    isSubscribed,
    permission,
    loading: pushLoading,
    subscribe,
    unsubscribe,
    showLocalNotification
  } = usePushNotifications();

  const {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    syncData
  } = useOfflineSync();

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const success = await subscribe();
      if (success) {
        await showLocalNotification({
          title: 'Notificações Ativadas!',
          body: 'Você receberá alertas sobre novos holerites e atualizações.',
          tag: 'welcome'
        });
      }
    }
  };

  const handleTestNotification = async () => {
    await showLocalNotification({
      title: 'Teste de Notificação',
      body: 'Esta é uma notificação de teste do FluxPay.',
      tag: 'test',
      data: { type: 'test' }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Bell className="w-5 h-5 text-blue-600" />
        Configurações de Notificações
      </h3>

      {/* Status da Conexão */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p className="font-medium text-gray-800">
              {isOnline ? 'Conectado' : 'Offline'}
            </p>
            <p className="text-sm text-gray-500">
              {pendingChanges > 0 
                ? `${pendingChanges} alterações pendentes` 
                : 'Tudo sincronizado'}
            </p>
          </div>
        </div>
        
        {pendingChanges > 0 && isOnline && (
          <button
            onClick={syncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        )}
      </div>

      {/* Notificações Push */}
      <div className="space-y-4">
        {!pushSupported ? (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Seu navegador não suporta notificações push.
            </p>
          </div>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <BellOff className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Notificações Bloqueadas</p>
              <p className="text-sm text-red-600">
                Você bloqueou as notificações. Altere nas configurações do navegador.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-800">
                    Notificações Push
                  </p>
                  <p className="text-sm text-gray-500">
                    {isSubscribed 
                      ? 'Receba alertas de novos holerites'
                      : 'Ative para receber notificações'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleToggleNotifications}
                disabled={pushLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isSubscribed ? 'bg-green-500' : 'bg-gray-300'
                } ${pushLoading ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSubscribed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isSubscribed && (
              <button
                onClick={handleTestNotification}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Bell className="w-4 h-4" />
                Enviar Notificação de Teste
              </button>
            )}
          </>
        )}
      </div>

      {/* Última Sincronização */}
      {lastSyncTime && (
        <div className="text-center text-sm text-gray-500">
          Última sincronização: {lastSyncTime.toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
