/**
 * Utilitário padronizado de impressão.
 * Usa Blob URL em vez de document.write para garantir que
 * o conteúdo seja renderizado corretamente ao salvar como PDF.
 * Injeta barra de ações (Imprimir / Salvar PDF / Fechar) no topo da janela.
 */

const actionBarCSS = `
  .print-action-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #1a1a2e; color: #fff;
    padding: 10px 20px; display: flex; align-items: center; gap: 12px;
    font-family: Arial, sans-serif; font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .print-action-bar button {
    padding: 8px 20px; border: none; border-radius: 6px;
    cursor: pointer; font-size: 14px; font-weight: 600;
  }
  .print-action-bar button:hover { opacity: 0.85; }
  .btn-print { background: #4CAF50; color: #fff; }
  .btn-close { background: #f44336; color: #fff; }
  .print-action-bar .spacer { flex: 1; text-align: center; font-weight: 600; }
  @media print {
    .print-action-bar { display: none !important; }
    body { padding-top: 0 !important; }
  }
`;

const actionBarHTML = (title: string) => `
  <div class="print-action-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <span class="spacer">${title}</span>
    <button class="btn-close" onclick="window.close()">✕ Fechar</button>
  </div>
`;

/**
 * Abre uma janela com o HTML fornecido usando Blob URL (confiável para PDF).
 * Injeta barra de ações no topo.
 * Não dispara print() automaticamente – o usuário decide.
 */
export function escreverEExibirJanela(
  printWindow: Window,
  htmlContent: string,
  title: string
): void {
  // Fechar a janela vazia que foi aberta com window.open('', '_blank')
  // Vamos criar um Blob URL e navegar para ele
  
  // Injetar CSS da barra no <head>
  const headCloseIdx = htmlContent.indexOf('</head>');
  let withCSS: string;
  if (headCloseIdx !== -1) {
    withCSS =
      htmlContent.slice(0, headCloseIdx) +
      `<style>${actionBarCSS}</style>` +
      htmlContent.slice(headCloseIdx);
  } else {
    withCSS = `<style>${actionBarCSS}</style>` + htmlContent;
  }

  // Injetar barra após <body...>
  const bodyOpenIdx = withCSS.indexOf('<body');
  if (bodyOpenIdx !== -1) {
    const bodyCloseTag = withCSS.indexOf('>', bodyOpenIdx);
    if (bodyCloseTag !== -1) {
      withCSS =
        withCSS.slice(0, bodyCloseTag + 1) +
        `<div style="height:50px;"></div>` +
        actionBarHTML(title) +
        withCSS.slice(bodyCloseTag + 1);
    }
  }

  // Usar Blob URL para garantir que o conteúdo seja carregado corretamente
  const blob = new Blob([withCSS], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Navegar a janela já aberta para o Blob URL
  printWindow.location.href = blobUrl;
  
  // Limpar o Blob URL após um tempo para liberar memória
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000); // 1 minuto
}
