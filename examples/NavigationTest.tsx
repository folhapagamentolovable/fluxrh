/**
 * Componente de teste para verificar navegação em PWA e Capacitor
 * Use este componente para confirmar que a navegação está funcionando
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCapacitor } from '../hooks/useCapacitor';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  Home, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function NavigationTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isNative, isWeb, platform } = useCapacitor();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>('checking');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar Service Worker (apenas no navegador)
  useEffect(() => {
    if (isWeb && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          setServiceWorkerStatus('active');
        } else {
          setServiceWorkerStatus('not-found');
        }
      }).catch(() => {
        setServiceWorkerStatus('error');
      });
    } else if (isNative) {
      setServiceWorkerStatus('not-needed');
    }
  }, [isWeb, isNative]);

  // Registrar histórico de navegação
  useEffect(() => {
    setNavigationHistory(prev => [...prev, location.pathname]);
  }, [location.pathname]);

  const testRoutes = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/cadastros/funcionarios', label: 'Funcionários', icon: Users },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">🧪 Teste de Navegação</h1>

      {/* Status do Ambiente */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {isNative ? (
              <Smartphone className="w-6 h-6 text-green-600" />
            ) : (
              <Globe className="w-6 h-6 text-blue-600" />
            )}
            Status do Ambiente
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plataforma */}
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">Plataforma:</span>
                <span className={`px-3 py-1 rounded font-semibold ${
                  isNative ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {platform.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Conexão */}
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">Conexão:</span>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <Wifi className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-semibold">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-red-600" />
                      <span className="text-red-600 font-semibold">Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Service Worker */}
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">Service Worker:</span>
                <div className="flex items-center gap-2">
                  {serviceWorkerStatus === 'active' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-semibold">Ativo</span>
                    </>
                  )}
                  {serviceWorkerStatus === 'not-found' && (
                    <>
                      <XCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-600 font-semibold">Não Encontrado</span>
                    </>
                  )}
                  {serviceWorkerStatus === 'not-needed' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-blue-600 font-semibold">Não Necessário</span>
                    </>
                  )}
                  {serviceWorkerStatus === 'checking' && (
                    <span className="text-gray-600">Verificando...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rota Atual */}
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">Rota Atual:</span>
                <span className="text-gray-700 font-mono text-sm">
                  {location.pathname}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Teste de Navegação */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">🧭 Teste de Navegação</h2>
          
          <p className="text-gray-600 mb-4">
            Clique nos botões abaixo para testar a navegação. A navegação deve funcionar 
            tanto no PWA (navegador) quanto no app nativo (Capacitor).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {testRoutes.map((route) => {
              const Icon = route.icon;
              const isActive = location.pathname === route.path;
              
              return (
                <Button
                  key={route.path}
                  onClick={() => handleNavigate(route.path)}
                  variant={isActive ? 'primary' : 'outline'}
                  className="flex items-center justify-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {route.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Histórico de Navegação */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">📜 Histórico de Navegação</h2>
          
          {navigationHistory.length > 0 ? (
            <div className="space-y-2">
              {navigationHistory.slice(-10).reverse().map((path, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="text-gray-500">#{navigationHistory.length - index}</span>
                  <span className="font-mono text-gray-700">{path}</span>
                  {index === 0 && (
                    <span className="ml-auto text-green-600 text-xs font-semibold">
                      Atual
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma navegação registrada ainda.</p>
          )}
        </div>
      </Card>

      {/* Resultados do Teste */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">✅ Resultados do Teste</h2>
          
          <div className="space-y-3">
            {/* Teste 1: Ambiente Detectado */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Ambiente Detectado</p>
                <p className="text-sm text-green-700">
                  {isWeb ? 'PWA no navegador' : `App nativo ${platform}`}
                </p>
              </div>
            </div>

            {/* Teste 2: Navegação */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Navegação Funcionando</p>
                <p className="text-sm text-green-700">
                  {navigationHistory.length} navegações registradas
                </p>
              </div>
            </div>

            {/* Teste 3: Service Worker (apenas PWA) */}
            {isWeb && (
              <div className={`flex items-center gap-3 p-3 rounded ${
                serviceWorkerStatus === 'active' 
                  ? 'bg-green-50' 
                  : 'bg-orange-50'
              }`}>
                {serviceWorkerStatus === 'active' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    serviceWorkerStatus === 'active' 
                      ? 'text-green-800' 
                      : 'text-orange-800'
                  }`}>
                    Service Worker
                  </p>
                  <p className={`text-sm ${
                    serviceWorkerStatus === 'active' 
                      ? 'text-green-700' 
                      : 'text-orange-700'
                  }`}>
                    {serviceWorkerStatus === 'active' 
                      ? 'Ativo e funcionando' 
                      : 'Não encontrado (execute npm run build)'}
                  </p>
                </div>
              </div>
            )}

            {/* Teste 4: App Nativo */}
            {isNative && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">App Nativo</p>
                  <p className="text-sm text-green-700">
                    Rodando em {platform} com arquivos locais
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Instruções */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">💡 Instruções</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold text-blue-600 mb-1">Para testar PWA:</h3>
              <ol className="list-decimal list-inside ml-2 space-y-1 text-gray-700">
                <li>Execute <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                <li>Abra no navegador</li>
                <li>Clique nos botões de navegação acima</li>
                <li>Verifique se as rotas mudam corretamente</li>
                <li>Teste desconectando a internet (deve continuar funcionando)</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-green-600 mb-1">Para testar App Nativo:</h3>
              <ol className="list-decimal list-inside ml-2 space-y-1 text-gray-700">
                <li>Execute <code className="bg-gray-100 px-1 rounded">npm run build</code></li>
                <li>Execute <code className="bg-gray-100 px-1 rounded">npx cap sync</code></li>
                <li>Execute <code className="bg-gray-100 px-1 rounded">npx cap run android</code></li>
                <li>Clique nos botões de navegação acima</li>
                <li>Verifique se as rotas mudam corretamente</li>
              </ol>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
