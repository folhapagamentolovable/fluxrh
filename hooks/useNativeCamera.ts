import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo, ImageOptions } from '@capacitor/camera';

interface CameraState {
  photo: Photo | null;
  loading: boolean;
  error: string | null;
}

interface UseNativeCameraReturn extends CameraState {
  takePhoto: (options?: Partial<ImageOptions>) => Promise<Photo | null>;
  pickFromGallery: (options?: Partial<ImageOptions>) => Promise<Photo | null>;
  checkPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
}

export function useNativeCamera(): UseNativeCameraReturn {
  const [state, setState] = useState<CameraState>({
    photo: null,
    loading: false,
    error: null,
  });

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const status = await Camera.checkPermissions();
      return status.camera === 'granted' && status.photos === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const status = await Camera.requestPermissions();
      return status.camera === 'granted' || status.photos === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  const takePhoto = useCallback(async (options?: Partial<ImageOptions>): Promise<Photo | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hasPermission = await checkPermissions();
      
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('Permissão de câmera negada');
        }
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        ...options,
      });

      setState({ photo, loading: false, error: null });
      return photo;
    } catch (error: any) {
      // Usuário cancelou - não é um erro
      if (error?.message?.includes('User cancelled')) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      const errorMessage = error?.message || 'Erro ao tirar foto';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, [checkPermissions, requestPermissions]);

  const pickFromGallery = useCallback(async (options?: Partial<ImageOptions>): Promise<Photo | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hasPermission = await checkPermissions();
      
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('Permissão de galeria negada');
        }
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
        ...options,
      });

      setState({ photo, loading: false, error: null });
      return photo;
    } catch (error: any) {
      // Usuário cancelou - não é um erro
      if (error?.message?.includes('User cancelled')) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      const errorMessage = error?.message || 'Erro ao selecionar foto';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, [checkPermissions, requestPermissions]);

  return {
    ...state,
    takePhoto,
    pickFromGallery,
    checkPermissions,
    requestPermissions,
  };
}
