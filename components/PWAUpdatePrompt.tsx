import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Download, Smartphone, Share2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PWAUpdatePrompt: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        const checkForUpdates = () => {
          reg.update().catch(console.error);
        };
        
        const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Preservar a rota atual ao recarregar após atualização
        // Salvar a rota no sessionStorage para recuperar após o reload
        const currentHash = window.location.hash;
        if (currentHash) {
          sessionStorage.setItem('pwa-redirect-after-update', currentHash);
        }
        window.location.reload();
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_UPDATED') {
          setShowUpdatePrompt(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (registration) {
      if (registration.waiting) {
        setShowUpdatePrompt(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdatePrompt(true);
            }
          });
        }
      });
    }
  }, [registration]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-2xl shadow-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold">Nova versão disponível!</h4>
            <p className="text-sm text-blue-100">
              Clique para atualizar o aplicativo.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-3 flex space-x-2">
        <button
          onClick={handleUpdate}
          className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-xl font-medium hover:bg-blue-50 transition-colors"
        >
          Atualizar agora
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-blue-200 hover:text-white transition-colors"
        >
          Depois
        </button>
      </div>
    </div>
  );
};

// Componente para promover instalação do PWA
export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    
    // Verificar se já está instalado
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone ||
                              document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Capturar evento de instalação do navegador
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Verificar se o usuário já recusou recentemente
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      if (lastDismissed) {
        const dismissedTime = parseInt(lastDismissed, 10);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }
      
      // Mostrar prompt após pequeno delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Para iOS, mostrar prompt após delay se não estiver instalado
    if (iOS && !isStandalone) {
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      if (lastDismissed) {
        const dismissedTime = parseInt(lastDismissed, 10);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }
      
      setTimeout(() => {
        if (!isStandalone) {
          setShowInstallPrompt(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowInstallPrompt(false);
  };

  // Não mostrar se já está instalado
  if (isStandalone) {
    return null;
  }

  if (!showInstallPrompt) return null;

  // Para iOS, mostrar instruções específicas
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Instalar FluxPay</h4>
              <p className="text-sm text-gray-600 mt-1">
                Toque em <Share2 className="inline w-4 h-4 text-blue-600" /> e depois em "Adicionar à Tela de Início"
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Para Android/Desktop com suporte a instalação nativa
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Instalar FluxPay</h4>
              <p className="text-sm text-gray-600">
                Acesse mais rápido direto da sua tela inicial.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAUpdatePrompt;