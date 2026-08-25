import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fluxpay.app',
  appName: 'FluxPay',
  webDir: 'dist',
  // IMPORTANTE: Remova a configuração 'server' para produção
  // A configuração abaixo é apenas para desenvolvimento com live reload
  // Para build de produção, comente ou remova a seção 'server'
  /* 
  server: {
    url: 'http://SEU_IP_LOCAL:8080', // Use apenas para desenvolvimento
    cleartext: true
  },
  */
  plugins: {
    Geolocation: {
      // Solicita permissão de localização em alta precisão
    },
    Camera: {
      // Configurações padrão para câmera
    }
  }
};

export default config;
