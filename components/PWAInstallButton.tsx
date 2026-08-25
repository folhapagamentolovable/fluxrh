import React, { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_INSTALLED_KEY = 'fluxpay-pwa-installed';

const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<'none' | 'available'>('none');

  useEffect(() => {
    // Verificar se já foi instalado anteriormente (persistido)
    const wasInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
    
    // Verificar se está rodando em modo standalone (já instalado)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as any).standalone ||
                            document.referrer.includes('android-app://');
    
    if (wasInstalled || isStandaloneMode) {
      setIsInstalled(true);
      // Atualizar localStorage caso detecte standalone
      if (isStandaloneMode) {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      }
      return; // Não precisa configurar listeners
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallStatus('available');
    };

    // Listener para quando o app é instalado
    const installedHandler = () => {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', installedHandler);

    // Monitorar mudança para standalone (caso o usuário instale manualmente)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const standaloneHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', standaloneHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('appinstalled', installedHandler);
      mediaQuery.removeEventListener('change', standaloneHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } else {
      // Instruções manuais
      const instructions = `🚀 Como instalar o FluxPay como aplicativo:

📱 CHROME (PC/Mobile):
• Procure o ícone ⊕ na barra de endereço
• Ou Menu (⋮) → "Instalar FluxPay"
• Ou "Adicionar à tela inicial"

🌐 EDGE:
• Menu (⋯) → "Aplicativos" → "Instalar este site"

🍎 SAFARI (iOS):
• Botão Compartilhar → "Adicionar à Tela de Início"

💡 DICA: Após instalar, o FluxPay aparecerá como um app nativo na sua área de trabalho!`;
      
      alert(instructions);
    }
  };

  // Não mostrar nada se já está instalado
  if (isInstalled) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className={`fixed bottom-20 right-4 text-white px-4 py-3 rounded-full shadow-xl transition-all duration-300 hover:scale-105 z-50 flex items-center gap-2 ${
        installStatus === 'available' 
          ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      title="Instalar FluxPay como aplicativo"
    >
      {installStatus === 'available' ? (
        <>
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline font-semibold">Instalar App!</span>
        </>
      ) : (
        <>
          <Smartphone className="w-5 h-5" />
          <span className="hidden sm:inline">Instalar App</span>
        </>
      )}
    </button>
  );
};

export default PWAInstallButton;