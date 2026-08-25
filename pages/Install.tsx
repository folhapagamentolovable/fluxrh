import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Share, Plus, MoreVertical, ArrowDown, QrCode, Apple, Chrome } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userAgent, setUserAgent] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect device type
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setUserAgent('ios');
    } else if (/android/.test(ua)) {
      setUserAgent('android');
    } else {
      setUserAgent('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-2xl mb-6">
            <img 
              src="/FluxPay_logo.png" 
              alt="FluxPay Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Instale o FluxPay
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Tenha acesso rápido ao sistema de folha de pagamento direto da sua tela inicial
          </p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <div className="bg-green-500 rounded-2xl p-8 text-center mb-8 shadow-xl">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">App Instalado!</h2>
            <p className="text-green-100">
              O FluxPay já está instalado no seu dispositivo. Acesse-o pela tela inicial.
            </p>
          </div>
        )}

        {/* Quick Install Button (if available) */}
        {deferredPrompt && !isInstalled && (
          <div className="bg-white rounded-2xl p-8 text-center mb-8 shadow-xl">
            <Download className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Instalação Rápida</h2>
            <p className="text-gray-600 mb-6">
              Clique no botão abaixo para instalar o FluxPay no seu dispositivo
            </p>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition-colors shadow-lg disabled:opacity-50"
            >
              {isInstalling ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Instalar Agora
                </>
              )}
            </button>
          </div>
        )}

        {/* Instructions Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* iOS Instructions */}
          <div className={`bg-white rounded-2xl p-6 shadow-xl ${userAgent === 'ios' ? 'ring-4 ring-blue-400' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Apple className="w-7 h-7 text-gray-800" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">iPhone / iPad</h3>
                <p className="text-sm text-gray-500">Safari</p>
              </div>
              {userAgent === 'ios' && (
                <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  Seu dispositivo
                </span>
              )}
            </div>
            
            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-800">Toque no botão Compartilhar</p>
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <Share className="w-5 h-5" />
                    <span className="text-sm">Ícone de compartilhamento na barra inferior</span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-800">Role para baixo e toque em</p>
                  <div className="flex items-center gap-2 mt-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <Plus className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Adicionar à Tela de Início</span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-800">Confirme tocando em "Adicionar"</p>
                  <p className="text-sm text-gray-500 mt-1">O FluxPay aparecerá na sua tela inicial</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Android Instructions */}
          <div className={`bg-white rounded-2xl p-6 shadow-xl ${userAgent === 'android' ? 'ring-4 ring-blue-400' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Android</h3>
                <p className="text-sm text-gray-500">Chrome</p>
              </div>
              {userAgent === 'android' && (
                <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  Seu dispositivo
                </span>
              )}
            </div>
            
            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-800">Toque no menu do Chrome</p>
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <MoreVertical className="w-5 h-5" />
                    <span className="text-sm">Três pontos no canto superior direito</span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-800">Selecione a opção</p>
                  <div className="flex items-center gap-2 mt-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <Download className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Instalar aplicativo</span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-800">Confirme a instalação</p>
                  <p className="text-sm text-gray-500 mt-1">O app será adicionado à sua tela inicial</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Desktop Instructions */}
          <div className={`bg-white rounded-2xl p-6 shadow-xl md:col-span-2 ${userAgent === 'desktop' ? 'ring-4 ring-blue-400' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Desktop</h3>
                <p className="text-sm text-gray-500">Chrome, Edge, Brave</p>
              </div>
              {userAgent === 'desktop' && (
                <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  Seu dispositivo
                </span>
              )}
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-800">Clique no ícone de instalação</p>
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <Download className="w-5 h-5" />
                    <span className="text-sm">Na barra de endereço (à direita)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-800">Clique em "Instalar"</p>
                  <p className="text-sm text-gray-500 mt-1">Na janela de confirmação</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-800">Pronto!</p>
                  <p className="text-sm text-gray-500 mt-1">O app abrirá em sua própria janela</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Compartilhe com seu celular</h2>
          </div>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Escaneie o QR Code abaixo com a câmera do seu celular para abrir o FluxPay no navegador móvel
          </p>
          <div className="inline-block p-4 bg-white border-4 border-gray-200 rounded-2xl shadow-inner">
            <img 
              src={qrCodeUrl} 
              alt="QR Code para instalar o FluxPay"
              className="w-48 h-48"
            />
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {currentUrl}
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Acesso Rápido</h3>
            <p className="text-blue-200 text-sm">
              Abra o FluxPay diretamente da tela inicial, sem precisar digitar a URL
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Funciona Offline</h3>
            <p className="text-blue-200 text-sm">
              Acesse dados salvos mesmo sem conexão com a internet
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Atualizações Automáticas</h3>
            <p className="text-blue-200 text-sm">
              O app atualiza automaticamente quando há novas versões disponíveis
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-blue-300">
          <p className="text-sm">
            FluxPay - Sistema de Folha de Pagamento © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Install;
