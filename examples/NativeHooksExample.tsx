/**
 * Exemplo de uso dos hooks nativos do Capacitor
 * 
 * Este arquivo demonstra como usar os hooks useNativeGeolocation e useNativeCamera
 * para acessar recursos nativos do dispositivo com melhor precisão.
 */

import React, { useState } from 'react';
import { useNativeGeolocation } from '../hooks/useNativeGeolocation';
import { useNativeCamera } from '../hooks/useNativeCamera';
import { CameraResultType } from '@capacitor/camera';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { MapPin, Camera, Image, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function NativeHooksExample() {
  // Hook de Geolocalização
  const {
    position,
    loading: geoLoading,
    error: geoError,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  } = useNativeGeolocation();

  // Hook de Câmera
  const {
    photo,
    loading: cameraLoading,
    error: cameraError,
    takePhoto,
    pickFromGallery,
  } = useNativeCamera();

  const [watchId, setWatchId] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  // Handlers de Geolocalização
  const handleGetLocation = async () => {
    const pos = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    if (pos) {
    }
  };

  const handleStartWatching = async () => {
    const id = await watchPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    if (id) {
      setWatchId(id);
      setIsWatching(true);
    }
  };

  const handleStopWatching = async () => {
    if (watchId) {
      await clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  };

  // Handlers de Câmera
  const handleTakePhoto = async () => {
    const result = await takePhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      correctOrientation: true,
    });

    if (result) {
      // A foto está disponível em result.dataUrl
      // Você pode enviá-la para o servidor ou exibi-la
    }
  };

  const handlePickPhoto = async () => {
    const result = await pickFromGallery({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
    });

    if (result) {
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Exemplos de Hooks Nativos</h1>

      {/* Seção de Geolocalização */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Geolocalização Nativa</h2>
          </div>

          <div className="space-y-4">
            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGetLocation}
                disabled={geoLoading}
                variant="primary"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Obtendo...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Obter Localização
                  </>
                )}
              </Button>

              {!isWatching ? (
                <Button
                  onClick={handleStartWatching}
                  disabled={geoLoading}
                  variant="secondary"
                >
                  Iniciar Monitoramento
                </Button>
              ) : (
                <Button
                  onClick={handleStopWatching}
                  variant="outline"
                >
                  Parar Monitoramento
                </Button>
              )}
            </div>

            {/* Status */}
            {isWatching && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                <CheckCircle className="w-5 h-5" />
                <span>Monitoramento ativo - Localização sendo atualizada em tempo real</span>
              </div>
            )}

            {/* Erro */}
            {geoError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="w-5 h-5" />
                <span>{geoError}</span>
              </div>
            )}

            {/* Dados da Localização */}
            {position && (
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <h3 className="font-semibold mb-2">Dados da Localização:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Latitude:</span>
                    <span className="ml-2">{position.coords.latitude.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span>
                    <span className="ml-2">{position.coords.longitude.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Precisão:</span>
                    <span className="ml-2">{position.coords.accuracy.toFixed(2)} metros</span>
                  </div>
                  {position.coords.altitude !== null && (
                    <div>
                      <span className="font-medium">Altitude:</span>
                      <span className="ml-2">{position.coords.altitude.toFixed(2)} m</span>
                    </div>
                  )}
                  {position.coords.speed !== null && (
                    <div>
                      <span className="font-medium">Velocidade:</span>
                      <span className="ml-2">{(position.coords.speed * 3.6).toFixed(2)} km/h</span>
                    </div>
                  )}
                  {position.coords.heading !== null && (
                    <div>
                      <span className="font-medium">Direção:</span>
                      <span className="ml-2">{position.coords.heading.toFixed(0)}°</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="font-medium">Timestamp:</span>
                    <span className="ml-2">{new Date(position.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Link para Google Maps */}
                <a
                  href={`https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  Ver no Google Maps →
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Seção de Câmera */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">Câmera Nativa</h2>
          </div>

          <div className="space-y-4">
            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTakePhoto}
                disabled={cameraLoading}
                variant="primary"
              >
                {cameraLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Abrindo...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Tirar Foto
                  </>
                )}
              </Button>

              <Button
                onClick={handlePickPhoto}
                disabled={cameraLoading}
                variant="secondary"
              >
                {cameraLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Abrindo...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Escolher da Galeria
                  </>
                )}
              </Button>
            </div>

            {/* Erro */}
            {cameraError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="w-5 h-5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Preview da Foto */}
            {photo && photo.dataUrl && (
              <div className="space-y-2">
                <h3 className="font-semibold">Foto Capturada:</h3>
                <div className="relative">
                  <img
                    src={photo.dataUrl}
                    alt="Foto capturada"
                    className="w-full max-w-md rounded-lg shadow-lg"
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Formato: {photo.format}</p>
                    {photo.exif && (
                      <p>EXIF disponível: Sim</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Dicas de Uso */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">💡 Dicas de Uso</h2>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold text-blue-600">Geolocalização:</h3>
              <ul className="list-disc list-inside ml-2 space-y-1 text-gray-700">
                <li>Use <code>getCurrentPosition()</code> para obter a localização uma vez</li>
                <li>Use <code>watchPosition()</code> para monitoramento contínuo (ex: rastreamento)</li>
                <li>Sempre chame <code>clearWatch()</code> quando não precisar mais do monitoramento</li>
                <li>A precisão depende do GPS, Wi-Fi e torres de celular disponíveis</li>
                <li>Em ambientes fechados, a precisão pode ser menor</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-600">Câmera:</h3>
              <ul className="list-disc list-inside ml-2 space-y-1 text-gray-700">
                <li>Use <code>takePhoto()</code> para capturar uma nova foto</li>
                <li>Use <code>pickFromGallery()</code> para selecionar foto existente</li>
                <li>Configure <code>quality</code> entre 0-100 para controlar o tamanho do arquivo</li>
                <li>Use <code>allowEditing: true</code> para permitir crop/edição</li>
                <li>O resultado em <code>DataUrl</code> pode ser usado diretamente em <code>&lt;img&gt;</code></li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
