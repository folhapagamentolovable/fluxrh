// FluxPay - Sistema de Folha de Pagamento Automática
// Build timestamp: 2026-02-17
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isLovablePreviewHost =
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.includes('id-preview') ||
  window.location.hostname.includes('lovable.app') && window.location.hostname !== 'fluxpay.lovable.app';

const clearServiceWorkersAndCaches = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

  } catch (error) {
  }
};

if (isInIframe || isLovablePreviewHost) {
  void clearServiceWorkersAndCaches();
} else if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegistered(r) {
    },
    onRegisterError(error) {
    }
  });
} else {
  void clearServiceWorkersAndCaches();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
