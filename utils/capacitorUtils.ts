import { Capacitor } from '@capacitor/core';

/**
 * Verifica se o app está rodando em um dispositivo nativo (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Retorna a plataforma atual: 'ios', 'android' ou 'web'
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Verifica se um plugin específico está disponível
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Verifica se a geolocalização nativa está disponível
 */
export function isNativeGeolocationAvailable(): boolean {
  return isNativePlatform() && isPluginAvailable('Geolocation');
}

/**
 * Verifica se a câmera nativa está disponível
 */
export function isNativeCameraAvailable(): boolean {
  return isNativePlatform() && isPluginAvailable('Camera');
}

/**
 * Converte coordenadas para o formato usado pelo app
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Calcula a distância entre duas coordenadas em metros usando a fórmula de Haversine
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formata a distância para exibição
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}
