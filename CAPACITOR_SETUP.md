# Configuração do Capacitor - FluxPay

## ✅ Status da Configuração

O Capacitor foi configurado com sucesso! O projeto agora suporta aplicativos nativos com plugins otimizados de GPS e câmera.

### Plataformas Adicionadas
- ✅ Android
- ✅ iOS

### Plugins Instalados
- ✅ @capacitor/camera@8.0.0
- ✅ @capacitor/geolocation@8.0.0

## 📱 Como Testar no Dispositivo Físico

### Pré-requisitos

#### Para Android:
- Android Studio instalado
- SDK do Android configurado
- Dispositivo Android com modo desenvolvedor ativado OU emulador Android

#### Para iOS:
- macOS com Xcode instalado
- Conta de desenvolvedor Apple (para testar em dispositivo físico)
- Dispositivo iOS OU simulador iOS

### Comandos de Build e Execução

#### 1. Build do Projeto
```bash
npm run build
```

#### 2. Sincronizar com Capacitor
```bash
npx cap sync
```

#### 3. Executar no Android
```bash
# Abrir no Android Studio
npx cap open android

# OU executar diretamente (requer dispositivo conectado)
npx cap run android
```

#### 4. Executar no iOS
```bash
# Abrir no Xcode
npx cap open ios

# OU executar diretamente (requer dispositivo conectado)
npx cap run ios
```

## 🔧 Hooks Nativos Disponíveis

### useNativeGeolocation

Hook para acessar a localização GPS nativa do dispositivo com alta precisão.

```typescript
import { useNativeGeolocation } from './hooks/useNativeGeolocation';

function MyComponent() {
  const { 
    position, 
    loading, 
    error,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    checkPermissions,
    requestPermissions
  } = useNativeGeolocation();

  const handleGetLocation = async () => {
    const pos = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
    
    if (pos) {
      console.log('Latitude:', pos.coords.latitude);
      console.log('Longitude:', pos.coords.longitude);
      console.log('Precisão:', pos.coords.accuracy, 'metros');
    }
  };

  return (
    <button onClick={handleGetLocation} disabled={loading}>
      {loading ? 'Obtendo localização...' : 'Obter Localização'}
    </button>
  );
}
```

**Recursos:**
- ✅ Solicita permissões automaticamente
- ✅ Alta precisão (enableHighAccuracy)
- ✅ Monitoramento contínuo (watchPosition)
- ✅ Tratamento de erros
- ✅ Verificação de permissões

### useNativeCamera

Hook para acessar a câmera nativa e galeria de fotos do dispositivo.

```typescript
import { useNativeCamera } from './hooks/useNativeCamera';

function MyComponent() {
  const { 
    photo, 
    loading, 
    error,
    takePhoto,
    pickFromGallery,
    checkPermissions,
    requestPermissions
  } = useNativeCamera();

  const handleTakePhoto = async () => {
    const result = await takePhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl
    });
    
    if (result) {
      console.log('Foto capturada:', result.dataUrl);
      // Use result.dataUrl para exibir ou enviar a imagem
    }
  };

  const handlePickPhoto = async () => {
    const result = await pickFromGallery({
      quality: 90,
      allowEditing: true
    });
    
    if (result) {
      console.log('Foto selecionada:', result.dataUrl);
    }
  };

  return (
    <div>
      <button onClick={handleTakePhoto} disabled={loading}>
        {loading ? 'Abrindo câmera...' : 'Tirar Foto'}
      </button>
      <button onClick={handlePickPhoto} disabled={loading}>
        {loading ? 'Abrindo galeria...' : 'Escolher da Galeria'}
      </button>
      {photo && <img src={photo.dataUrl} alt="Foto capturada" />}
    </div>
  );
}
```

**Recursos:**
- ✅ Captura de foto pela câmera
- ✅ Seleção de foto da galeria
- ✅ Edição de imagem (crop, rotate)
- ✅ Correção automática de orientação
- ✅ Qualidade configurável
- ✅ Tratamento de cancelamento pelo usuário

## 🔄 Workflow de Desenvolvimento

### Desenvolvimento Web (Modo Padrão)
```bash
npm run dev
```
Acesse: http://localhost:8081

### Desenvolvimento Nativo

1. **Fazer alterações no código**
2. **Build do projeto:**
   ```bash
   npm run build
   ```
3. **Sincronizar com plataformas nativas:**
   ```bash
   npx cap sync
   ```
4. **Testar no dispositivo/emulador:**
   ```bash
   npx cap run android
   # ou
   npx cap run ios
   ```

### Live Reload (Desenvolvimento Nativo)

Para testar mudanças rapidamente sem rebuild:

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Atualize o capacitor.config.ts temporariamente:**
   ```typescript
   server: {
     url: 'http://SEU_IP_LOCAL:8081',
     cleartext: true
   }
   ```

3. **Sincronize:**
   ```bash
   npx cap sync
   ```

4. **Execute no dispositivo:**
   ```bash
   npx cap run android
   ```

⚠️ **Importante:** Remova a configuração `server.url` antes de fazer o build de produção!

## 📋 Permissões Configuradas

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (ios/App/App/Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>O app precisa acessar a câmera para capturar fotos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>O app precisa acessar a galeria para selecionar fotos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>O app precisa acessar sua localização para registrar o ponto</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>O app precisa acessar sua localização para registrar o ponto</string>
```

## 🚀 Build de Produção

### Android (APK/AAB)

1. **Build do projeto web:**
   ```bash
   npm run build
   npx cap sync
   ```

2. **Abrir no Android Studio:**
   ```bash
   npx cap open android
   ```

3. **No Android Studio:**
   - Build > Generate Signed Bundle / APK
   - Siga o assistente para criar o APK/AAB assinado

### iOS (IPA)

1. **Build do projeto web:**
   ```bash
   npm run build
   npx cap sync
   ```

2. **Abrir no Xcode:**
   ```bash
   npx cap open ios
   ```

3. **No Xcode:**
   - Product > Archive
   - Siga o assistente para distribuir o app

## 🐛 Troubleshooting

### Erro: "dist directory not found"
```bash
npm run build
npx cap sync
```

### Erro de permissões no Android
Verifique se as permissões estão declaradas no `AndroidManifest.xml`

### Erro de permissões no iOS
Verifique se as descrições de uso estão no `Info.plist`

### Plugin não encontrado
```bash
npm install
npx cap sync
```

### Mudanças não aparecem no app
```bash
npm run build
npx cap sync
npx cap run android  # ou ios
```

## 📚 Recursos Adicionais

- [Documentação do Capacitor](https://capacitorjs.com/docs)
- [Plugin de Geolocalização](https://capacitorjs.com/docs/apis/geolocation)
- [Plugin de Câmera](https://capacitorjs.com/docs/apis/camera)
- [Workflow de Desenvolvimento](https://capacitorjs.com/docs/basics/workflow)

## 🎯 Próximos Passos

1. ✅ Plataformas adicionadas (Android e iOS)
2. ✅ Plugins instalados e configurados
3. ✅ Hooks nativos implementados
4. 🔄 Testar no dispositivo físico
5. 🔄 Configurar assinatura de código
6. 🔄 Publicar nas lojas (Google Play / App Store)

---

**Configuração concluída em:** 24/01/2026
**Versão do Capacitor:** 8.0.1
**App ID:** com.fluxpay.app
**App Name:** FluxPay
