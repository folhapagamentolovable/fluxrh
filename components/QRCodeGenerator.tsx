import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Building2 } from 'lucide-react';
import Button from './ui/Button';

interface PostoQRData {
  id: string;
  nome_posto: string;
  cnpj: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

interface QRCodeGeneratorProps {
  posto: PostoQRData;
  size?: number;
}

export default function QRCodeGenerator({ posto, size = 200 }: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Dados que serão codificados no QR Code
  const qrData = JSON.stringify({
    type: 'FLUXPAY_POSTO',
    id: posto.id,
    nome: posto.nome_posto,
    cnpj: posto.cnpj
  });

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Criar canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar tamanho (maior para qualidade de impressão)
    const printSize = 400;
    canvas.width = printSize;
    canvas.height = printSize + 80; // Espaço extra para texto

    // Fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Converter SVG para imagem
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, printSize, printSize);
      
      // Adicionar texto do posto
      ctx.fillStyle = 'black';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(posto.nome_posto, canvas.width / 2, printSize + 25);
      
      ctx.font = '12px Arial';
      ctx.fillText(`CNPJ: ${posto.cnpj}`, canvas.width / 2, printSize + 45);
      
      if (posto.cidade && posto.estado) {
        ctx.fillText(`${posto.cidade} - ${posto.estado}`, canvas.width / 2, printSize + 65);
      }

      // Download
      const link = document.createElement('a');
      link.download = `qrcode-${posto.nome_posto.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup bloqueado. Por favor, permita popups para imprimir.');
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${posto.nome_posto}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              border-radius: 8px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #1a1a2e;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code svg {
              width: 400px;
              height: 400px;
            }
            .posto-nome {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            .posto-info {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .instrucao {
              margin-top: 20px;
              padding: 10px;
              background: #f0f0f0;
              border-radius: 4px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="logo">📱 FluxPay - Registro de Ponto</div>
            <div class="qr-code">${svgData}</div>
            <div class="posto-nome">${posto.nome_posto}</div>
            <div class="posto-info">CNPJ: ${posto.cnpj}</div>
            <div class="instrucao">
              Escaneie o QR Code no app FluxPay para registrar seu ponto
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">{posto.nome_posto}</h4>
      </div>

      <div 
        ref={qrRef} 
        className="p-4 bg-white rounded-lg shadow-sm"
      >
        <QRCodeSVG 
          value={qrData}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-2 mb-3">
        CNPJ: {posto.cnpj}
      </p>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={downloadQRCode}
          className="flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Baixar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={printQRCode}
          className="flex items-center gap-1"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
