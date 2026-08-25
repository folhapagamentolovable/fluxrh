// FluxPay Custom Service Worker Extension
// Este arquivo adiciona funcionalidades ao SW gerado pelo Vite PWA

const NOTIFICATION_CACHE = 'fluxpay-notifications-v1';
const OFFLINE_FALLBACK_PAGE = '/index.html';

// Gerenciar notificações push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let notification = {
    title: 'FluxPay',
    body: 'Você tem uma nova notificação',
    icon: '/FluxPay_logo_m.png',
    badge: '/FluxPay_logo_p.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        ...data
      };
    } catch (e) {
      notification.body = event.data.text();
    }
  }

  const options = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: notification.tag,
    data: notification.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver detalhes' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Gerenciar cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clique em notificação:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Navegar para URL específica baseada nos dados da notificação
  let targetUrl = '/';
  
  if (event.notification.data?.url) {
    targetUrl = event.notification.data.url;
  } else if (event.notification.data?.type === 'holerite') {
    targetUrl = '/#/portal/holerites';
  } else if (event.notification.data?.type === 'escala') {
    targetUrl = '/#/portal/escalas';
  } else if (event.notification.data?.type === 'ferias') {
    targetUrl = '/#/portal/ferias';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verificar se já existe uma janela aberta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Se não houver janela aberta, abrir uma nova
        return clients.openWindow(targetUrl);
      })
  );
});

// Gerenciar fechamento de notificações
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

// Gerenciar mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CONNECTION_STATUS') {
    // Atualizar estratégia de cache baseado na conexão
    const isOnline = event.data.isOnline;
    console.log('[SW] Status de conexão:', isOnline ? 'Online' : 'Offline');
  }

  if (event.data?.type === 'SYNC_REQUEST') {
    // Solicitar sincronização em background
    if ('sync' in self.registration) {
      self.registration.sync.register('sync-data').catch(console.error);
    }
  }

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, data } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: icon || '/FluxPay_logo_m.png',
      badge: '/FluxPay_logo_p.png',
      data,
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
});

// Background Sync para sincronizar quando voltar online
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Função para sincronizar dados offline
async function syncOfflineData() {
  console.log('[SW] Sincronizando dados offline...');

  try {
    // Notificar clientes sobre sincronização
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED'
      });
    });

    // A sincronização real é feita pelo cliente
    // Aqui apenas notificamos que está disponível

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_AVAILABLE'
      });
    });

  } catch (error) {
    console.error('[SW] Erro ao sincronizar:', error);
    throw error; // Vai tentar novamente mais tarde
  }
}

// Periodic Sync para verificar novos holerites
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-new-holerites') {
    event.waitUntil(checkForNewHolerites());
  }
});

// Função para verificar novos holerites
async function checkForNewHolerites() {
  console.log('[SW] Verificando novos holerites...');

  try {
    // Em produção, fazer chamada real à API
    // Por enquanto, simular verificação
    const lastCheck = await getLastCheckTime();
    const now = Date.now();

    // Só verificar a cada hora
    if (lastCheck && now - lastCheck < 60 * 60 * 1000) {
      console.log('[SW] Última verificação recente, pulando...');
      return;
    }

    // Salvar tempo da última verificação
    await saveLastCheckTime(now);

    // Notificar clientes para fazer a verificação real
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_NEW_HOLERITES'
      });
    });

  } catch (error) {
    console.error('[SW] Erro ao verificar holerites:', error);
  }
}

// Helpers para IndexedDB
async function getLastCheckTime() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const response = await cache.match('last-check-time');
    if (response) {
      return parseInt(await response.text(), 10);
    }
  } catch (e) {
    console.error('[SW] Erro ao obter último check:', e);
  }
  return null;
}

async function saveLastCheckTime(time) {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    await cache.put('last-check-time', new Response(time.toString()));
  } catch (e) {
    console.error('[SW] Erro ao salvar último check:', e);
  }
}

// Registrar para periodic sync se disponível
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando service worker customizado...');

  event.waitUntil(
    (async () => {
      // Registrar periodic sync
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.register('check-new-holerites', {
            minInterval: 60 * 60 * 1000 // 1 hora
          });
          console.log('[SW] Periodic sync registrado');
        } catch (error) {
          console.log('[SW] Periodic sync não suportado:', error);
        }
      }

      // Claim all clients
      await self.clients.claim();
    })()
  );
});

console.log('[SW] Service Worker customizado carregado');
