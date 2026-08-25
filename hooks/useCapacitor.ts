/**
 * Hook para detectar se o app está rodando em ambiente nativo (Capacitor)
 * ou no navegador web
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface CapacitorInfo {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}

export function useCapacitor(): CapacitorInfo {
  const [info] = useState<CapacitorInfo>(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    return {
      isNative,
      platform: platform as 'ios' | 'android' | 'web',
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: platform === 'web',
    };
  });

  return info;
}

/**
 * Hook para usar geolocalização com fallback automático
 * Usa API nativa se disponível, senão usa API web
 */
export function useSmartGeolocation() {
  const { isNative } = useCapacitor();
  
  // Importação dinâmica para evitar erros no build
  const getPosition = async (options?: PositionOptions) => {
    if (isNative) {
      // Usar API nativa do Capacitor
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          ...options,
        });
        return position;
      } catch (error) {
        throw error;
      }
    } else {
      // Usar API web padrão
      return new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalização não suportada neste navegador'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
            ...options,
          }
        );
      });
    }
  };

  return { getPosition, isNative };
}
