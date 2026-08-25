import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        
        // Check existing subscription in database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: dbSub } = await supabase
              .from('push_subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .limit(1)
              .single();
            
            if (dbSub) {
              setIsSubscribed(true);
            }
          }
          
          const registration = await navigator.serviceWorker.ready;
          const existingSub = await (registration as any).pushManager?.getSubscription();
          if (existingSub) {
            setSubscription(existingSub.toJSON());
            setIsSubscribed(true);
          }
        } catch (error) {
        }
      }
    };

    checkSupport();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // Gerar VAPID key (em produção, usar chave gerada no servidor)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const pushSubscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subJson = pushSubscription.toJSON();
      setSubscription(subJson);
      setIsSubscribed(true);

      // Salvar inscrição no banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      if (user && subJson.endpoint && subJson.keys) {
        // Buscar funcionario_id do usuário
        const { data: funcionario } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        // Salvar no banco de dados
        const { error: insertError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            funcionario_id: funcionario?.id || null,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh || '',
            auth: subJson.keys.auth || ''
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (insertError) {
        } else {
        }
      }

      return true;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isSubscribed) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await (registration as any).pushManager?.getSubscription();

      if (existingSub) {
        const endpoint = existingSub.endpoint;
        await existingSub.unsubscribe();
        
        // Remover do banco de dados
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint);
        }
        
        setSubscription(null);
        setIsSubscribed(false);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, isSubscribed]);

  const showLocalNotification = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/FluxPay_logo_m.png',
        badge: payload.badge || '/FluxPay_logo_p.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: true
      });

      return true;
    } catch (error) {
      return false;
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification
  };
};

// Utility function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Função utilitária para enviar notificação de novo holerite
export async function notifyNewHolerite(funcionarioIds: string[], mes: number, ano: number): Promise<boolean> {
  try {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        funcionarioIds,
        title: '📄 Novo Holerite Disponível!',
        body: `Seu holerite de ${meses[mes - 1]}/${ano} já está disponível para consulta.`,
        type: 'holerite',
        data: {
          type: 'holerite',
          mes,
          ano,
          url: '/#/portal/holerites'
        }
      }
    });

    if (response.error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

export default usePushNotifications;
