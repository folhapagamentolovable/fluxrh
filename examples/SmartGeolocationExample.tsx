/**
 * Exemplo de uso inteligente de geolocalização
 * Funciona tanto no navegador quanto no app nativo
 */

import React, { useState } from 'react';
import { useCapacitor, useSmartGeolocation } from '../hooks/useCapacitor';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { MapPin, Smartphone, Globe, Loader2, AlertCircle } from 'lucide-react';

export default function SmartGeolocationExample() {
  const { isNative, platform, isIOS, isAndroid, isWeb } = useCapacitor();
  const { getPosition } = useSmartGeolocation();
  
  const [position, setPosition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const pos = await getPosition();
      setPosition(pos);
    } catch (err: any) {
      setError(err.message || 'Erro ao obter localização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Geolocalização Inteligente</h1>

      {/* Info do Ambiente */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {isNative ? (
              <Smartphone className="w-6 h-6 text-green-600" />
            ) : (
              <Globe className="w-6 h-6 text-blue-600" />
            )}
            <h2 className="text-xl font-semibold">Ambiente Detectado</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Plataforma:</span>
              <span className={`px-2 py-1 rounded ${
                isNative ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {platform.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Tipo:</span>
              <span>{isNative ? '📱 App Nativo' : '🌐 Navegador Web'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">API Usada:</span>
              <span>{isNative ? 'Capacitor Geolocation (Alta Precisão)' : 'Navigator Geolocation (Web)'}</span>
            </div>
          </div>

          {isWeb && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="text-blue-800">
                💡 <strong>Dica:</strong> Você está no navegador. Para testar a API nativa com melhor precisão, 
                execute o app em um dispositivo Android ou iOS.
              </p>
            </div>
          )}

          {isNative && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800">
                ✅ <strong>App Nativo Detectado!</strong> Usando API nativa do {isIOS ? 'iOS' : 'Android'} 
                para máxima precisão de GPS.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Botão de Ação */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">Obter Localização</h2>
          </div>

          <Button
            onClick={handleGetLocation}
            disabled={loading}
            variant="primary"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Obtendo localização...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Obter Minha Localização
              </>
            )}
          </Button>

          {/* Erro */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resultado */}
          {position && (
            <div className="mt-4 bg-gray-50 p-4 rounded space-y-3">
              <h3 className="font-semibold">📍 Localização Obtida:</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Latitude:</span>
                  <p className="text-lg font-mono">{position.coords.latitude.toFixed(6)}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Longitude:</span>
                  <p className="text-lg font-mono">{position.coords.longitude.toFixed(6)}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Precisão:</span>
                  <p className="text-lg">
                    {position.coords.accuracy.toFixed(2)} metros
                    {position.coords.accuracy < 10 && (
                      <span className="ml-2 text-green-600">✓ Excelente</span>
                    )}
                    {position.coords.accuracy >= 10 && position.coords.accuracy < 50 && (
                      <span className="ml-2 text-blue-600">✓ Boa</span>
                    )}
                    {position.coords.accuracy >= 50 && (
                      <span className="ml-2 text-orange-600">⚠ Baixa</span>
                    )}
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Timestamp:</span>
                  <p className="text-sm">{new Date(position.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {position.coords.altitude !== null && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Altitude:</span>
                  <p className="text-lg">{position.coords.altitude.toFixed(2)} metros</p>
                </div>
              )}

              {position.coords.speed !== null && position.coords.speed > 0 && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="font-medium text-gray-600">Velocidade:</span>
                  <p className="text-lg">{(position.coords.speed * 3.6).toFixed(2)} km/h</p>
                </div>
              )}

              <a
                href={`https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                📍 Ver no Google Maps
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Comparação de APIs */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Comparação de APIs</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Característica</th>
                  <th className="text-left p-2">Web (Navegador)</th>
                  <th className="text-left p-2">Nativo (App)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Precisão</td>
                  <td className="p-2">±10-50m</td>
                  <td className="p-2 text-green-600">±5-10m ✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Velocidade</td>
                  <td className="p-2">Moderada</td>
                  <td className="p-2 text-green-600">Rápida ✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Bateria</td>
                  <td className="p-2">Consumo médio</td>
                  <td className="p-2 text-green-600">Otimizado ✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Funciona Offline</td>
                  <td className="p-2">Limitado</td>
                  <td className="p-2 text-green-600">Sim ✓</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Permissões</td>
                  <td className="p-2">Navegador</td>
                  <td className="p-2 text-green-600">Sistema ✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
