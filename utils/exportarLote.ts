import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatarMoeda, mapearFolhaParaHolerite } from './codigosContabeisHolerite';
import { escreverEExibirJanela } from './printUtils';
import { obterPeriodoFolhaPonto } from './periodoFolhaPonto';

interface FolhaExport {
  funcionario: {
    id: string;
    nome_completo: string;
    cpf?: string;
    rg?: string;
    cargo?: { nome_cargo?: string };
    nome_cargo?: string;
    data_admissao?: string;
    registrado?: boolean;
    funcionario_registrado?: boolean;
  };
  resultado: any;
  dadosFolha: any;
  empresa?: { nome_empresa?: string; cnpj?: string; endereco?: string };
  posto_trabalho?: { nome_posto?: string };
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Exportar múltiplas folhas de pagamento para Excel
 */
export async function exportarFolhasExcel(
  folhas: FolhaExport[],
  mes: number,
  ano: number,
  parametros: any
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FluxPay';
  workbook.created = new Date();

  // Planilha resumo
  const resumoSheet = workbook.addWorksheet('Resumo');
  resumoSheet.columns = [
    { header: 'Funcionário', key: 'nome', width: 35 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Cargo', key: 'cargo', width: 25 },
    { header: 'Empresa', key: 'empresa', width: 25 },
    { header: 'Posto', key: 'posto', width: 25 },
    { header: 'Salário Base', key: 'salario_base', width: 15 },
    { header: 'Total Proventos', key: 'total_proventos', width: 15 },
    { header: 'Total Descontos', key: 'total_descontos', width: 15 },
    { header: 'Total Benefícios', key: 'total_beneficios', width: 15 },
    { header: 'Salário Líquido', key: 'salario_liquido', width: 15 },
    { header: 'FGTS', key: 'fgts', width: 12 },
    { header: 'INSS', key: 'inss', width: 12 },
  ];

  // Estilizar cabeçalho
  resumoSheet.getRow(1).font = { bold: true };
  resumoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  resumoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Adicionar dados
  folhas.forEach(folha => {
    resumoSheet.addRow({
      nome: folha.funcionario.nome_completo,
      cpf: folha.funcionario.cpf || '',
      cargo: folha.funcionario.cargo?.nome_cargo || '',
      empresa: folha.empresa?.nome_empresa || '',
      posto: folha.posto_trabalho?.nome_posto || '',
      salario_base: folha.resultado.salario_base,
      total_proventos: folha.resultado.total_proventos,
      total_descontos: folha.resultado.total_descontos,
      total_beneficios: folha.resultado.total_beneficios || 0,
      salario_liquido: folha.resultado.salario_liquido,
      fgts: folha.resultado.fgts || 0,
      inss: folha.resultado.desconto_inss || 0,
    });
  });

  // Formatar colunas de moeda
  ['F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach(col => {
    resumoSheet.getColumn(col).numFmt = 'R$ #,##0.00';
  });

  // Adicionar totais
  const totalRow = resumoSheet.addRow({
    nome: 'TOTAL',
    salario_base: folhas.reduce((sum, f) => sum + (f.resultado.salario_base || 0), 0),
    total_proventos: folhas.reduce((sum, f) => sum + (f.resultado.total_proventos || 0), 0),
    total_descontos: folhas.reduce((sum, f) => sum + (f.resultado.total_descontos || 0), 0),
    total_beneficios: folhas.reduce((sum, f) => sum + (f.resultado.total_beneficios || 0), 0),
    salario_liquido: folhas.reduce((sum, f) => sum + (f.resultado.salario_liquido || 0), 0),
    fgts: folhas.reduce((sum, f) => sum + (f.resultado.fgts || 0), 0),
    inss: folhas.reduce((sum, f) => sum + (f.resultado.desconto_inss || 0), 0),
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };

  // Planilha detalhada por funcionário
  const detalhadoSheet = workbook.addWorksheet('Detalhado');
  detalhadoSheet.columns = [
    { header: 'Funcionário', key: 'nome', width: 35 },
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Referência', key: 'referencia', width: 15 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Valor', key: 'valor', width: 15 },
  ];

  detalhadoSheet.getRow(1).font = { bold: true };
  detalhadoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  detalhadoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  folhas.forEach(folha => {
    const eventos = mapearFolhaParaHolerite(folha.resultado, [], folha.dadosFolha, parametros);
    eventos.filter(e => e && e.valor !== 0).forEach(evento => {
      detalhadoSheet.addRow({
        nome: folha.funcionario.nome_completo,
        codigo: evento.codigo,
        descricao: evento.descricao,
        referencia: evento.referencia || '',
        tipo: evento.tipo === 'provento' ? 'Provento' : 'Desconto',
        valor: evento.valor,
      });
    });
  });

  detalhadoSheet.getColumn('F').numFmt = 'R$ #,##0.00';

  // Gerar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `folhas_pagamento_${mes.toString().padStart(2, '0')}_${ano}.xlsx`);
}

/**
 * Exportar folhas de benefícios para Excel
 */
export async function exportarBeneficiosExcel(
  folhas: FolhaExport[],
  mes: number,
  ano: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FluxPay';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Benefícios');
  sheet.columns = [
    { header: 'Funcionário', key: 'nome', width: 35 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Empresa', key: 'empresa', width: 25 },
    { header: 'Posto', key: 'posto', width: 25 },
    { header: 'Vale Transporte', key: 'vt', width: 15 },
    { header: 'Vale Alimentação', key: 'va', width: 15 },
    { header: 'Cesta Básica', key: 'cesta', width: 15 },
    { header: 'Total Benefícios', key: 'total', width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  folhas.forEach(folha => {
    sheet.addRow({
      nome: folha.funcionario.nome_completo,
      cpf: folha.funcionario.cpf || '',
      empresa: folha.empresa?.nome_empresa || '',
      posto: folha.posto_trabalho?.nome_posto || '',
      vt: folha.resultado.vale_transporte || 0,
      va: folha.resultado.vale_alimentacao || 0,
      cesta: folha.resultado.cesta_basica || 0,
      total: folha.resultado.total_beneficios || 0,
    });
  });

  ['E', 'F', 'G', 'H'].forEach(col => {
    sheet.getColumn(col).numFmt = 'R$ #,##0.00';
  });

  // Total
  const totalRow = sheet.addRow({
    nome: 'TOTAL',
    vt: folhas.reduce((sum, f) => sum + (f.resultado.vale_transporte || 0), 0),
    va: folhas.reduce((sum, f) => sum + (f.resultado.vale_alimentacao || 0), 0),
    cesta: folhas.reduce((sum, f) => sum + (f.resultado.cesta_basica || 0), 0),
    total: folhas.reduce((sum, f) => sum + (f.resultado.total_beneficios || 0), 0),
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `beneficios_${mes.toString().padStart(2, '0')}_${ano}.xlsx`);
}

/**
 * Gera HTML do holerite idêntico ao componente de impressão individual
 */
function gerarHtmlHolerite(
  folha: FolhaExport,
  mes: number,
  ano: number,
  eventosExcepcionais: any[],
  parametros: any
): string {
  const { funcionario, empresa, resultado } = folha;
  
  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;
  
  // Mapear dados para lançamentos (SEM benefícios) - igual ao componente React
  const lancamentos = mapearFolhaParaHolerite(resultado, eventosExcepcionais, folha.dadosFolha, parametros);
  
  // Calcular totais a partir dos lançamentos já mapeados
  const totalProventos = lancamentos.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + l.valor, 0);
  const totalDescontos = lancamentos.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + l.valor, 0);
  const salarioLiquido = totalProventos - totalDescontos;

  // Filtrar apenas eventos com dados (sem linhas em branco)
  const eventosComDados = lancamentos.filter(lanc => lanc && lanc.valor !== 0);

  const eventosHtml = eventosComDados.map((evento: any, idx: number) => `
    <tr style="height: 6mm">
      <td colspan="2" class="text-xs text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.codigo}
      </td>
      <td colspan="3" class="text-xs" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.descricao}
      </td>
      <td colspan="2" class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.referencia || ''}
      </td>
      <td class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.unidade || ''}
      </td>
      <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}
      </td>
      <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}
      </td>
    </tr>
  `).join('');

  return `
    <div class="bg-white overflow-x-auto" style="width: 100%; min-height: auto; font-size: 8px; padding: 0; box-sizing: border-box; margin-top: 10px;">
      <table class="border-collapse min-w-full" style="table-layout: fixed; width: 90%; max-width: 90%; margin: 2mm auto; border-collapse: collapse;">
        <colgroup>
          <col style="width: 5%;" />
          <col style="width: 5%;" />
          <col style="width: 11%;" />
          <col style="width: 11%;" />
          <col style="width: 11%;" />
          <col style="width: 7%;" />
          <col style="width: 7%;" />
          <col style="width: 7%;" />
          <col style="width: 9%;" />
          <col style="width: 9%;" />
          <col style="width: 9%;" />
          <col style="width: 9%;" />
        </colgroup>
        <tbody>
          <tr style="height: 8mm;">
            <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="flex: 1;"></span>
                <span class="font-bold text-base">RECIBO DE PAGAMENTO DE SALÁRIO</span>
                <span style="flex: 1; text-align: right; font-size: 12px;" class="font-bold">${mes.toString().padStart(2, '0')}/${ano}</span>
              </div>
            </td>
          </tr>
          ${isRegistrado ? `
          <tr style="height: 6mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.nome_empresa || 'Empresa'}</span>
                <span>Via do Empregado</span>
              </div>
            </td>
          </tr>
          <tr style="height: 6mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.endereco || 'Endereço'}</span>
                <span>CNPJ: ${empresa?.cnpj || 'N/A'}</span>
              </div>
            </td>
          </tr>
          ` : ''}
          <tr style="height: 6mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><span class="font-semibold">Empregado</span> ${funcionario?.nome_completo || 'N/A'}</span>
                <span><span class="font-semibold">Admissão:</span> ${funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 6mm;">
            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                <span style="flex: 1;"><span class="font-semibold">Cargo</span> ${funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: ${funcionario?.cpf || 'N/A'}</span>
                <span>RG: ${funcionario?.rg || 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 6mm;">
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Código</td>
            <td colspan="3" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Descrição</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Referência</td>
            <td class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Unid</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Proventos</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Descontos</td>
          </tr>
          ${eventosHtml}
          <tr style="height: 7mm;" class="font-bold">
            <td colspan="8" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>Referente ao(s) dia(s) trabalhados no período de</span>
                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, mes, ano).inicio}</span>
                <span>a</span>
                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, mes, ano).fim}</span>
              </div>
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(totalProventos)}
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(totalDescontos)}
            </td>
          </tr>
          <tr style="height: 7mm;" class="font-bold">
            <td colspan="8" class="text-xs" style="border: 1px solid black; padding: 2px 4px;"></td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              Total Líquido
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(salarioLiquido)}
            </td>
          </tr>
          <tr style="height: 7mm;">
            <td colspan="12" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="flex: 1; min-width: 120px;">Salário Base: ${formatarMoeda(resultado.salario_base)}</span>
                <span style="flex: 1; min-width: 120px;">Base INSS: ${formatarMoeda(resultado.base_inss || 0)}</span>
                <span style="flex: 1; min-width: 120px;">Base FGTS: ${formatarMoeda(resultado.base_fgts || 0)}</span>
                <span style="flex: 1; min-width: 120px;">FGTS do Mês: ${formatarMoeda(resultado.fgts || 0)}</span>
                <span style="flex: 1; min-width: 120px;">Base IRRF: ${formatarMoeda(resultado.base_irrf || 0)}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 7mm;">
            <td colspan="8" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>Recebi de meu empregador a importância líquida discriminada neste recibo.</span>
              </div>
            </td>
            <td colspan="4" class="text-xs text-center" style="border: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>___/___/______</span>
                <span>____________________________</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Gerar PDF em lote (abre janela de impressão) - Layout idêntico à impressão individual
 */
export function gerarPDFLote(
  folhas: FolhaExport[],
  mes: number,
  ano: number,
  tipo: 'holerite' | 'beneficios',
  parametros: any,
  eventosExcepcionais: Record<string, any[]>
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Habilite popups para imprimir');
    return;
  }

  // Estilos CSS idênticos aos usados na impressão individual
  const estilosCSS = `
    @media print {
      @page { size: A4 portrait; margin: 5mm 2mm 5mm 2mm !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
      html, body { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      table { width: 90% !important; max-width: 90% !important; table-layout: fixed !important; }
      .page-break { page-break-after: always; }
    }
    html, body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; }
    table { width: 90%; max-width: 90%; border-collapse: collapse; margin: 2mm auto; table-layout: fixed; }
    td { word-wrap: break-word; overflow: hidden; text-overflow: ellipsis; }
    .bg-white { background-color: white; }
    .overflow-x-auto { overflow-x: auto; }
    .border-collapse { border-collapse: collapse; }
    .min-w-full { min-width: 100%; }
    .text-xs { font-size: 8px; }
    .text-sm { font-size: 10px; }
    .text-base { font-size: 12px; }
    .font-bold { font-weight: bold; }
    .font-semibold { font-weight: 600; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-700 { color: #374151; }
    .text-gray-800 { color: #1f2937; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .gap-8 { gap: 8px; }
    .gap-20 { gap: 20px; }
    .mt-1 { margin-top: 1px; }
    .p-2 { padding: 2px; }
    .p-4 { padding: 4px; }
    .min-w-120 { min-width: 120px; }
    .flex-1 { flex: 1; }
    .flex-wrap { flex-wrap: wrap; }
    .page-break { page-break-after: always; }
  `;

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${tipo === 'holerite' ? 'Holerites' : 'Benefícios'} - ${mes.toString().padStart(2, '0')}/${ano}</title>
      <style>${estilosCSS}</style>
    </head>
    <body>
  `;

  folhas.forEach((folha, index) => {
    const eventos = eventosExcepcionais[folha.funcionario.id] || [];
    
    if (tipo === 'holerite') {
      // Usar o mesmo layout da impressão individual
      htmlContent += `<div class="${index < folhas.length - 1 ? 'page-break' : ''}">${gerarHtmlHolerite(folha, mes, ano, eventos, parametros)}</div>`;
    } else {
      // Para benefícios, usar layout simplificado (mantém o antigo por enquanto)
      const eventosComDados = mapearFolhaParaHolerite(folha.resultado, eventos, folha.dadosFolha, parametros)
        .filter(e => e && e.valor !== 0);
      
      const totalProventosPDF = eventosComDados.filter(e => e.tipo === 'provento').reduce((sum, e) => sum + (e.valor || 0), 0);
      const totalDescontosPDF = eventosComDados.filter(e => e.tipo === 'desconto').reduce((sum, e) => sum + (e.valor || 0), 0);
      const salarioLiquidoPDF = totalProventosPDF - totalDescontosPDF;

      htmlContent += `
        <div class="${index < folhas.length - 1 ? 'page-break' : ''}">
          <table style="border-collapse: collapse; width: 90%; margin: 10px auto;">
            <tr style="background: #4F46E5; color: white;">
              <td colspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding: 8px; border: 1px solid #333;">
                RECIBO DE BENEFÍCIOS - ${mes.toString().padStart(2, '0')}/${ano}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border: 1px solid #333; padding: 4px;"><strong>Funcionário:</strong> ${folha.funcionario.nome_completo}</td>
              <td colspan="2" style="border: 1px solid #333; padding: 4px;"><strong>CPF:</strong> ${folha.funcionario.cpf || 'N/A'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #333; padding: 4px;"><strong>Cargo:</strong> ${folha.funcionario.cargo?.nome_cargo || folha.funcionario.nome_cargo || 'N/A'}</td>
              <td style="border: 1px solid #333; padding: 4px;"><strong>Empresa:</strong> ${folha.empresa?.nome_empresa || 'N/A'}</td>
              <td colspan="2" style="border: 1px solid #333; padding: 4px;"><strong>Admissão:</strong> ${folha.funcionario.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            </tr>
          </table>
          <table style="border-collapse: collapse; width: 90%; margin: 10px auto;">
            <tr style="background: #e5e7eb; font-weight: bold;">
              <td style="text-align: center; border: 1px solid #333; padding: 4px;">Código</td>
              <td style="border: 1px solid #333; padding: 4px;">Descrição</td>
              <td style="text-align: right; border: 1px solid #333; padding: 4px;">Proventos</td>
              <td style="text-align: right; border: 1px solid #333; padding: 4px;">Descontos</td>
            </tr>
            ${eventosComDados.map(e => `
              <tr>
                <td style="text-align: center; border: 1px solid #333; padding: 4px;">${e.codigo}</td>
                <td style="border: 1px solid #333; padding: 4px;">${e.descricao}</td>
                <td style="text-align: right; border: 1px solid #333; padding: 4px;">${e.tipo === 'provento' ? formatarMoeda(e.valor) : ''}</td>
                <td style="text-align: right; border: 1px solid #333; padding: 4px;">${e.tipo === 'desconto' ? formatarMoeda(e.valor) : ''}</td>
              </tr>
            `).join('')}
            <tr style="background: #d1d5db; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #333; padding: 4px;">TOTAIS</td>
              <td style="text-align: right; border: 1px solid #333; padding: 4px;">${formatarMoeda(totalProventosPDF)}</td>
              <td style="text-align: right; border: 1px solid #333; padding: 4px;">${formatarMoeda(totalDescontosPDF)}</td>
            </tr>
            <tr style="background: #4F46E5; color: white; font-weight: bold;">
              <td colspan="3" style="border: 1px solid #333; padding: 4px;">SALÁRIO LÍQUIDO</td>
              <td style="text-align: right; border: 1px solid #333; padding: 4px;">${formatarMoeda(salarioLiquidoPDF)}</td>
            </tr>
          </table>
          <p style="margin-top: 30px; text-align: center;">Data: ____/____/________ Assinatura: _______________________________</p>
        </div>
      `;
    }
  });

  htmlContent += '</body></html>';

  escreverEExibirJanela(printWindow, htmlContent, 'Impressão em Lote');
}
