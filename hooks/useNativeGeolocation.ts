import { useState, useCallback } from 'react';
import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';

interface GeolocationState {
  position: Position | null;
  loading: boolean;
  error: string | null;
}

interface UseNativeGeolocationReturn extends GeolocationState {
  getCurrentPosition: (options?: PositionOptions) => Promise<Position | null>;
  watchPosition: (options?: PositionOptions) => Promise<string | null>;
  clearWatch: (watchId: string) => Promise<void>;
  checkPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
}

export function useNativeGeolocation(): UseNativeGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
  });

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const status = await Geolocation.checkPermissions();
      return status.location === 'granted' || status.coarseLocation === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const status = await Geolocation.requestPermissions();
      return status.location === 'granted' || status.coarseLocation === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (options?: PositionOptions): Promise<Position | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Verifica se tem permissão
      const hasPermission = await checkPermissions();
      
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('Permissão de localização negada');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options,
      });

      setState({ position, loading: false, error: null });
      return position;
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao obter localização';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, [checkPermissions, requestPermissions]);

  const watchPosition = useCallback(async (options?: PositionOptions): Promise<string | null> => {
    try {
      const hasPermission = await checkPermissions();
      
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('Permissão de localização negada');
        }
      }

      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          ...options,
        },
        (position, err) => {
          if (err) {
            setState(prev => ({ ...prev, error: err.message }));
          } else if (position) {
            setState({ position, loading: false, error: null });
          }
        }
      );

      return watchId;
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao iniciar monitoramento de localização';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [checkPermissions, requestPermissions]);

  const clearWatch = useCallback(async (watchId: string): Promise<void> => {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (error) {
    }
  }, []);

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    checkPermissions,
    requestPermissions,
  };
}
