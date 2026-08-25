import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from './ui/Button';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  compact?: boolean;
  autoStart?: boolean;
}

export default function QRCodeScanner({ onScan, onError, onClose, compact, autoStart = false }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          html5QrCode.stop().catch(console.error);
          setIsScanning(false);
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignorar erros de leitura contínua (normais durante scan)
        }
      );

      setIsScanning(true);
      setCameraPermission('granted');
    } catch (err: any) {
      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
        setCameraPermission('denied');
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else {
        setError('Erro ao iniciar câmera: ' + err.message);
      }
      onError?.(err.message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
      }
    }
  };

  useEffect(() => {
    if (autoStart) {
      // Pequeno delay para garantir que o container DOM esteja montado
      const t = setTimeout(() => { startScanner(); }, 50);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    }
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 justify-center">
          <Camera className="w-5 h-5" />
          Scanner de QR Code
        </h3>
        <p className="text-sm text-muted-foreground">
          Aponte a câmera para o QR Code do posto de trabalho
        </p>
      </div>

      {cameraPermission === 'denied' && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {error && cameraPermission !== 'denied' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-md">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div 
        id="qr-reader"
        ref={containerRef}
        className={`w-full bg-muted rounded-lg overflow-hidden ${
          isScanning ? 'border-2 border-primary' : ''
        }`}
        style={{ width: '100%', maxWidth: '260px', height: '260px', minHeight: '260px' }}
      />

      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScanner} className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Iniciar Câmera
          </Button>
        ) : (
          <Button 
            onClick={stopScanner} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Parar
          </Button>
        )}
        
        {onClose && (
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
        )}
      </div>

      {isScanning && (
        <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
          <CheckCircle2 className="w-4 h-4" />
          Procurando QR Code...
        </div>
      )}
    </div>
  );
}
