/**
 * Funções utilitárias para impressão de documentos (Holerite e Recibo de Benefícios)
 * Reutilizáveis entre CalculatedPayroll e Portal do Usuário
 * 
 * IMPORTANTE: Estas funções agora usam renderização de componentes React para garantir
 * layouts idênticos entre impressão individual e em lote.
 */

import { mapearFolhaParaHolerite, formatarMoeda } from './codigosContabeisHolerite';
import { normalizarDescricao } from './eventosExcepcionaisValidator';
import { escreverEExibirJanela } from './printUtils';
import { obterPeriodoFolhaPonto } from './periodoFolhaPonto';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface DadosImpressao {
  funcionario: any;
  empresa: any;
  resultado: any;
  mes: number;
  ano: number;
  eventosExcepcionais?: any[];
  dadosFolha?: any;
  parametros?: any;
  escalaMensalProximoMes?: any;
}

/**
 * Imprime o holerite usando o componente React (layout idêntico ao batch)
 */
export const imprimirHolerite = (dados: DadosImpressao, onError?: (msg: string) => void): boolean => {
  const { funcionario, resultado, mes, ano } = dados;

  if (!funcionario || !resultado) {
    onError?.('Dados insuficientes para impressão');
    return false;
  }

  const printWindow = globalThis.open('', '_blank');
  if (!printWindow) {
    onError?.('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.');
    return false;
  }

  // Gerar o HTML do holerite
  const holeriteHtml = gerarHtmlHoleriteFromComponent(dados);

  // Criar HTML base com estilos de impressão (sem script inline para evitar problemas com backticks)
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Holerite - ${funcionario?.nome_completo || 'Funcionário'} - ${mes.toString().padStart(2, '0')}/${ano}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 5mm 2mm 5mm 2mm !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
      html, body { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      table { width: 90% !important; max-width: 90% !important; table-layout: fixed !important; }
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
  </style>
</head>
<body>
  ${holeriteHtml}
</body>
</html>`;

  escreverEExibirJanela(printWindow, htmlContent, `Holerite - ${dados.funcionario?.nome_completo || 'Funcionário'}`);

  return true;
};

/**
 * Imprime o recibo de benefícios usando o componente React (layout idêntico ao batch)
 */
export const imprimirReciboBeneficios = (dados: DadosImpressao, onError?: (msg: string) => void): boolean => {
  const { funcionario, resultado, mes, ano, eventosExcepcionais = [] } = dados;

  if (!funcionario || !resultado) {
    onError?.('Dados insuficientes para impressão');
    return false;
  }

  const printWindow = globalThis.open('', '_blank');
  if (!printWindow) {
    onError?.('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.');
    return false;
  }

  // Calcular dados de benefícios
  const dadosDias = dados.dadosFolha?.dados_dias;
  let diasTrabalhados = 0;
  if (dadosDias) {
    const dadosParsed = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
    diasTrabalhados = Object.values(dadosParsed).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
  }

  const diasATrabalharVA = dados.escalaMensalProximoMes?.diasVA || 0;
  const diasATrabalharVT = dados.escalaMensalProximoMes?.diasVT || 0;
  const faltasJustificadas = dados.dadosFolha?.total_faltas_justificadas || 0;
  const faltasInjustificadas = dados.dadosFolha?.total_faltas_injustificadas || 0;

  // Calcular totais de benefícios
  const beneficiosEventos = eventosExcepcionais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
  const descontosEventos = eventosExcepcionais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

  // ⭐ VT/VA por folgas trabalhadas (valores do banco)
  const vtFolgasTrabalhadas = (resultado as any).valor_vt_folgas_trabalhadas || 0;
  const vaFolgasTrabalhadas = (resultado as any).valor_va_folgas_trabalhadas || 0;

  const totalBeneficios = 
    (resultado.vale_transporte_mes_anterior || 0) +
    (resultado.vale_transporte_mes_atual || 0) +
    (resultado.vale_alimentacao_mes_anterior || 0) +
    (resultado.vale_alimentacao_mes_atual || 0) +
    ((!resultado.vale_transporte_mes_anterior && !resultado.vale_transporte_mes_atual) ? (resultado.vale_transporte || 0) : 0) +
    ((!resultado.vale_alimentacao_mes_anterior && !resultado.vale_alimentacao_mes_atual) ? (resultado.vale_alimentacao || 0) : 0) +
    vtFolgasTrabalhadas +
    vaFolgasTrabalhadas +
    (resultado.cesta_basica || 0) +
    (resultado.premio_permanencia || 0) +
    (resultado.folga_trabalhada || 0) +
    beneficiosEventos;

  const totalDescontosBeneficios = 
    (resultado.desconto_vt_faltas || 0) +
    (resultado.desconto_va_faltas || 0) +
    (resultado.desc_rondas_nao_realizadas_benef || 0) +
    ((resultado as any).desc_ajuste_beneficios || 0) +
    descontosEventos;

  // Se não há benefícios, não imprimir
  if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
    onError?.('Não há benefícios para imprimir neste período');
    printWindow.close();
    return false;
  }

  // Gerar o HTML do recibo
  const reciboHtml = gerarHtmlReciboBeneficiosFromComponent({
    ...dados,
    diasTrabalhados,
    diasATrabalharVA,
    diasATrabalharVT,
    faltasJustificadas,
    faltasInjustificadas
  });

  // Criar HTML base com estilos de impressão (sem script inline)
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo de Benefícios - ${funcionario?.nome_completo || 'Funcionário'} - ${mes.toString().padStart(2, '0')}/${ano}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 5mm 2mm 5mm 2mm !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
      html, body { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      table { width: 90% !important; max-width: 90% !important; table-layout: fixed !important; }
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
  </style>
</head>
<body>
  ${reciboHtml}
</body>
</html>`;

  escreverEExibirJanela(printWindow, htmlContent, `Recibo Benefícios - ${dados.funcionario?.nome_completo || 'Funcionário'}`);

  return true;
};

// Funções auxiliares para geração de HTML que replicam exatamente os componentes React

function gerarHtmlHoleriteFromComponent(dados: DadosImpressao) {
  const { funcionario, empresa, resultado, mes, ano, eventosExcepcionais = [], parametros } = dados;
  
  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;
  
  // Mapear dados para lançamentos (SEM benefícios) - igual ao componente React
  const lancamentos = mapearFolhaParaHolerite(resultado, eventosExcepcionais, dados.dadosFolha, parametros);
  
  // Calcular totais a partir dos lançamentos já mapeados
  const totalProventos = lancamentos.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + l.valor, 0);
  const totalDescontos = lancamentos.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + l.valor, 0);
  const salarioLiquido = totalProventos - totalDescontos;

  // Filtrar apenas eventos com dados (sem linhas em branco) - aceita valores negativos
  const eventosComDados = lancamentos.filter(lanc => lanc && lanc.valor !== 0);

  const eventosHtml = eventosComDados.map((evento: any, idx: number) => `
    <tr style="height: 4mm">
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
    <div class="bg-white overflow-x-auto" id="holerite-print" style="width: 90%; min-height: auto; font-size: 8px; padding: 0; box-sizing: border-box; margin: 10px auto 0;">
      <table class="border-collapse min-w-full" style="table-layout: fixed; width: 100%; max-width: 100%; margin: 2mm auto; border-collapse: collapse;">
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
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.nome_empresa || 'Empresa'}</span>
                <span>Via do Empregado</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.endereco || 'Endereço'}</span>
                <span>CNPJ: ${empresa?.cnpj || 'N/A'}</span>
              </div>
            </td>
          </tr>
          ` : ''}
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><span class="font-semibold">Empregado</span> ${funcionario?.nome_completo || 'N/A'}</span>
                <span><span class="font-semibold">Admissão:</span> ${funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                <span style="flex: 1;"><span class="font-semibold">Cargo</span> ${funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: ${funcionario?.cpf || 'N/A'}</span>
                <span>RG: ${funcionario?.rg || 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
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
                <span>${obterPeriodoFolhaPonto(dados.dadosFolha, mes, ano).inicio}</span>
                <span>a</span>
                <span>${obterPeriodoFolhaPonto(dados.dadosFolha, mes, ano).fim}</span>
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
                <span style="flex: 1; min-width: 120px;">Base INSS: ${formatarMoeda(resultado.base_inss)}</span>
                <span style="flex: 1; min-width: 120px;">Base FGTS: ${formatarMoeda(resultado.base_fgts)}</span>
                <span style="flex: 1; min-width: 120px;">FGTS do mês: ${formatarMoeda(resultado.fgts)}</span>
                <span style="flex: 1; min-width: 120px;">Base IRRF: ${formatarMoeda(resultado.base_irrf)}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 7mm;">
            <td colspan="12" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              Declaro ter recebido a importância líquida discriminada neste recibo.
            </td>
          </tr>
          <tr style="height: 15mm;">
            <td colspan="5" class="text-xs" style="border: 1px solid black; padding: 2px 4px; vertical-align: bottom;">
              <div style="text-align: center;">
                <div class="text-xs text-gray-500 mt-1">Data: ________ /________ /________________</div>
              </div>
            </td>
            <td colspan="7" class="text-xs" style="border: 1px solid black; padding: 2px 4px; vertical-align: bottom;">
              <div style="text-align: left;">
                <div class="text-xs text-gray-500 mt-1">Assinatura do Funcionário _______________________________________________________</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function gerarHtmlReciboBeneficiosFromComponent(dados: any) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const { funcionario, empresa, resultado, mes, ano, eventosExcepcionais = [], diasTrabalhados = 0, diasATrabalharVA = 0, diasATrabalharVT = 0, faltasJustificadas = 0, faltasInjustificadas = 0 } = dados;
  
  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;

  // Calcular eventos excepcionais de benefícios
  const beneficiosEventos = (eventosExcepcionais || [])
    .filter((e: any) => e.tipo === 'beneficio' && e.valor > 0)
    .reduce((sum: number, e: any) => sum + e.valor, 0);
  
  const descontosEventos = (eventosExcepcionais || [])
    .filter((e: any) => e.tipo === 'beneficio' && e.valor < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.valor), 0);

  // ⭐ VT/VA por folgas trabalhadas (valores do banco)
  const qtdFolgasTrabalhadasVT = resultado.folgas_trabalhadas_vt || 0;
  const qtdFolgasTrabalhadasVA = resultado.folgas_trabalhadas_va || 0;
  const vtFolgasTrabalhadas = resultado.valor_vt_folgas_trabalhadas || 0;
  const vaFolgasTrabalhadas = resultado.valor_va_folgas_trabalhadas || 0;

  // Calcular totais de benefícios (usando valores separados por mês quando disponíveis)
  const totalBeneficios = 
    (resultado.vale_transporte_mes_anterior || 0) +
    (resultado.vale_transporte_mes_atual || 0) +
    (resultado.vale_alimentacao_mes_anterior || 0) +
    (resultado.vale_alimentacao_mes_atual || 0) +
    ((!resultado.vale_transporte_mes_anterior && !resultado.vale_transporte_mes_atual) ? (resultado.vale_transporte || 0) : 0) +
    ((!resultado.vale_alimentacao_mes_anterior && !resultado.vale_alimentacao_mes_atual) ? (resultado.vale_alimentacao || 0) : 0) +
    vtFolgasTrabalhadas +
    vaFolgasTrabalhadas +
    (resultado.cesta_basica || 0) +
    (resultado.premio_permanencia || 0) +
    (resultado.folga_trabalhada || 0) +
    beneficiosEventos;

  const totalDescontosBeneficios = 
    (resultado.desconto_vt_faltas || 0) +
    (resultado.desconto_va_faltas || 0) +
    (resultado.desc_rondas_nao_realizadas_benef || 0) +
    (resultado.desc_ajuste_beneficios || 0) +
    descontosEventos;

  const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

  // Se não há benefícios, não renderizar
  if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
    return '';
  }

  // Gerar eventos de benefícios (replicando a lógica do componente React)
  const eventosBeneficios = [];
  const mesAtual = meses[mes - 1];
  const mesProximo = meses[mes % 12];
  
  if (resultado.vale_transporte_mes_anterior > 0) {
    eventosBeneficios.push({ 
      codigo: '0601', 
      descricao: `Vale Transporte (${mesAtual})`, 
      referencia: diasTrabalhados.toString(),
      valor: resultado.vale_transporte_mes_anterior, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.vale_transporte_mes_atual > 0) {
    eventosBeneficios.push({ 
      codigo: '0601', 
      descricao: `Vale Transporte (${mesProximo})`, 
      referencia: diasATrabalharVT.toString(),
      valor: resultado.vale_transporte_mes_atual, 
      tipo: 'beneficio' 
    });
  }
  if (!resultado.vale_transporte_mes_anterior && !resultado.vale_transporte_mes_atual && resultado.vale_transporte > 0) {
    eventosBeneficios.push({ 
      codigo: '0601', 
      descricao: 'Vale Transporte', 
      referencia: '',
      valor: resultado.vale_transporte, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.vale_alimentacao_mes_anterior > 0) {
    eventosBeneficios.push({ 
      codigo: '0602', 
      descricao: `Vale Alimentação (${mesAtual})`, 
      referencia: diasTrabalhados.toString(),
      valor: resultado.vale_alimentacao_mes_anterior, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.vale_alimentacao_mes_atual > 0) {
    eventosBeneficios.push({ 
      codigo: '0602', 
      descricao: `Vale Alimentação (${mesProximo})`, 
      referencia: diasATrabalharVA.toString(),
      valor: resultado.vale_alimentacao_mes_atual, 
      tipo: 'beneficio' 
    });
  }
  if (!resultado.vale_alimentacao_mes_anterior && !resultado.vale_alimentacao_mes_atual && resultado.vale_alimentacao > 0) {
    eventosBeneficios.push({ 
      codigo: '0602', 
      descricao: 'Vale Alimentação', 
      referencia: '',
      valor: resultado.vale_alimentacao, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.cesta_basica > 0) {
    eventosBeneficios.push({ 
      codigo: '0603', 
      descricao: 'Cesta Básica', 
      referencia: '1',
      valor: resultado.cesta_basica, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.premio_permanencia > 0) {
    eventosBeneficios.push({ 
      codigo: '0604', 
      descricao: 'Prêmio Permanência', 
      referencia: '1',
      valor: resultado.premio_permanencia, 
      tipo: 'beneficio' 
    });
  }
  // ⭐ VT por Folgas Trabalhadas
  if (qtdFolgasTrabalhadasVT > 0 && vtFolgasTrabalhadas > 0) {
    eventosBeneficios.push({ 
      codigo: '0601', 
      descricao: 'VT Folgas Trabalhadas', 
      referencia: qtdFolgasTrabalhadasVT.toString(),
      valor: vtFolgasTrabalhadas, 
      tipo: 'beneficio' 
    });
  }
  // ⭐ VA por Folgas Trabalhadas
  if (qtdFolgasTrabalhadasVA > 0 && vaFolgasTrabalhadas > 0) {
    eventosBeneficios.push({ 
      codigo: '0602', 
      descricao: 'VA Folgas Trabalhadas', 
      referencia: qtdFolgasTrabalhadasVA.toString(),
      valor: vaFolgasTrabalhadas, 
      tipo: 'beneficio' 
    });
  }
  // ⭐ Folga(s) Trabalhada(s) - valor diário fixo (FT manual)
  if ((resultado.folga_trabalhada || 0) > 0) {
    eventosBeneficios.push({ 
      codigo: '0606', 
      descricao: 'Folga(s) Trabalhada(s)', 
      referencia: '',
      valor: resultado.folga_trabalhada, 
      tipo: 'beneficio' 
    });
  }
  if (resultado.desconto_vt_faltas > 0) {
    const totalFaltas = faltasJustificadas + faltasInjustificadas;
    eventosBeneficios.push({ 
      codigo: '5004', 
      descricao: 'Desc. VT por Faltas', 
      referencia: totalFaltas.toString(),
      valor: resultado.desconto_vt_faltas, 
      tipo: 'desconto' 
    });
  }
  if (resultado.desconto_va_faltas > 0) {
    const totalFaltas = faltasJustificadas + faltasInjustificadas;
    eventosBeneficios.push({ 
      codigo: '5003', 
      descricao: 'Desc. VA por Faltas', 
      referencia: totalFaltas.toString(),
      valor: resultado.desconto_va_faltas, 
      tipo: 'desconto' 
    });
  }
  if (resultado.desc_rondas_nao_realizadas_benef > 0) {
    eventosBeneficios.push({ 
      codigo: 'B001', 
      descricao: 'Desc. Rondas Não Realizadas', 
      referencia: '',
      valor: resultado.desc_rondas_nao_realizadas_benef, 
      tipo: 'desconto' 
    });
  }
  
  // Adicionar eventos excepcionais de benefícios
  if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach((evento: any) => {
      if (evento.tipo === 'beneficio') {
        const valorAbsoluto = Math.abs(evento.valor);
        if (valorAbsoluto > 0) {
          const descricaoNormalizada = normalizarDescricao(evento.descricao);
          const tipoEvento = evento.valor < 0 ? 'desconto' : 'beneficio';
          let codigo = 'B010';
          if (descricaoNormalizada === 'Reembolsos') codigo = 'B010';
          else if (descricaoNormalizada === 'Outros Reembolsos') codigo = 'B011';
          else if (descricaoNormalizada === 'Desc. Rondas Não Realizadas') codigo = 'B001';
          else if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') codigo = 'B002';
          else if (descricaoNormalizada === 'Desc. Outros Benefícios') codigo = 'B003';
          
          eventosBeneficios.push({ 
            codigo, 
            descricao: descricaoNormalizada, 
            referencia: '',
            valor: valorAbsoluto, 
            tipo: tipoEvento 
          });
        }
      }
    });
  }

  const eventosHtml = eventosBeneficios.map((evento: any, idx: number) => `
    <tr style="height: 5mm;">
      <td colspan="2" class="text-xs text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.codigo}
      </td>
      <td colspan="3" class="text-xs" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.descricao}
      </td>
      <td colspan="2" class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.referencia || ''}
      </td>
      <td class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        R$
      </td>
      <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.tipo === 'beneficio' ? formatarMoeda(evento.valor) : ''}
      </td>
      <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">
        ${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}
      </td>
    </tr>
  `).join('');

  return `
    <div class="bg-white overflow-x-auto" id="recibo-beneficios-print" style="width: 90%; min-height: auto; font-size: 8px; padding: 0; box-sizing: border-box; margin: 0 auto;">
      <table class="border-collapse min-w-full" style="table-layout: fixed; width: 100%; max-width: 100%; margin: 2mm auto; border-collapse: collapse;">
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
                <span class="font-bold text-base">RECIBO DE BENEFÍCIOS</span>
                <span style="flex: 1; text-align: right; font-size: 12px;" class="font-bold">${mes.toString().padStart(2, '0')}/${ano}</span>
              </div>
            </td>
          </tr>
          ${isRegistrado ? `
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.nome_empresa || 'Empresa'}</span>
                <span>Via do Empregado</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${empresa?.endereco || 'Endereço'}</span>
                <span>CNPJ: ${empresa?.cnpj || 'N/A'}</span>
              </div>
            </td>
          </tr>
          ` : ''}
          <tr style="height: 5mm;">
            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><span class="font-semibold">Empregado</span> ${funcionario?.nome_completo || 'N/A'}</span>
                <span><span class="font-semibold">Admissão:</span> ${funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                <span style="flex: 1;"><span class="font-semibold">Cargo</span> ${funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: ${funcionario?.cpf || 'N/A'}</span>
              </div>
            </td>
          </tr>
          <tr style="height: 5mm;">
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Código</td>
            <td colspan="3" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Descrição</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Referência</td>
            <td class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Unid</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Benefícios</td>
            <td colspan="2" class="text-xs font-bold text-center" style="border: 1px solid black; padding: 2px 4px;">Descontos</td>
          </tr>
          ${eventosHtml}
          <tr style="height: 7mm;" class="font-bold">
            <td colspan="8" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>Referente ao(s) dia(s) trabalhados no período de</span>
                <span>${obterPeriodoFolhaPonto(dados.dadosFolha, mes, ano).inicio}</span>
                <span>a</span>
                <span>${obterPeriodoFolhaPonto(dados.dadosFolha, mes, ano).fim}</span>
              </div>
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(totalBeneficios)}
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(totalDescontosBeneficios)}
            </td>
          </tr>
          <tr style="height: 7mm;" class="font-bold">
            <td colspan="8" class="text-xs" style="border: 1px solid black; padding: 2px 4px;"></td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              Total Líquido
            </td>
            <td colspan="2" class="text-xs text-right" style="border: 1px solid black; padding: 2px 4px;">
              ${formatarMoeda(totalLiquidoBeneficios)}
            </td>
          </tr>
          <tr style="height: 7mm;">
            <td colspan="12" class="text-xs" style="border: 1px solid black; padding: 2px 4px;">
              Declaro ter recebido os benefícios discriminados neste recibo.
            </td>
          </tr>
          <tr style="height: 15mm;">
            <td colspan="5" class="text-xs" style="border: 1px solid black; padding: 2px 4px; vertical-align: bottom;">
              <div style="text-align: center;">
                <div class="text-xs text-gray-500 mt-1">Data: ________ /________ /________________</div>
              </div>
            </td>
            <td colspan="7" class="text-xs" style="border: 1px solid black; padding: 2px 4px; vertical-align: bottom;">
              <div style="text-align: left;">
                <div class="text-xs text-gray-500 mt-1">Assinatura do Funcionário _______________________________________________________</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
