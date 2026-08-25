import { mapearFolhaParaHolerite } from '../../../utils/codigosContabeisHolerite';
import { formatarMoeda } from '../../../utils/calcularFolhaPagamento';
import { calcularTotaisComEventos } from '../../../utils/calculosTotais';
import { escreverEExibirJanela } from '../../../utils/printUtils';
import { type FolhaCalculadaCompleta, type EventoExcepcional, type PrintContext } from './types';
import { normalizarDescricao } from '../../../utils/eventosExcepcionaisValidator';
import { obterPeriodoFolhaPonto } from '../../../utils/periodoFolhaPonto';


// Função auxiliar: calcular salário líquido a partir dos lançamentos do holerite
function calcularSalarioLiquidoPorLancamentos(
    funcionarioId: string,
    resultado: any,
    eventosParam: EventoExcepcional[],
    folhaPonto: any,
    ctx: PrintContext
) {
    const lancamentos = mapearFolhaParaHolerite(resultado, eventosParam, folhaPonto, ctx.parametros);
    const totalProventos = lancamentos.filter((l: any) => l.tipo === 'provento').reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
    const totalDescontos = lancamentos.filter((l: any) => l.tipo === 'desconto').reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
    return totalProventos - totalDescontos;
}

// Funções auxiliares de formatação
const formatarCPF = (cpf: string) => {
    const numeros = (cpf || '').replace(/\D/g, '');
    return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
};

const formatarCNPJ = (cnpj: string) => {
    const numeros = (cnpj || '').replace(/\D/g, '');
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Função consolidada para imprimir TUDO em uma única janela
export async function imprimirTudoEmUmaJanela(ctx: PrintContext, folhas: FolhaCalculadaCompleta[]) {
    if (folhas.length === 0) {
        ctx.showToast('Nenhuma folha para imprimir', 'error');
        return;
    }

    // Iniciar indicador de progresso
    const totalPaginas = folhas.length * 3; // 3 documentos por funcionário (holerite, benefícios, recibo)
    ctx.setImprimindo(true);
    ctx.setProgressoImpressao({ atual: 0, total: totalPaginas, tipo: 'Todos os Documentos' });

    // Pequeno delay para o UI atualizar
    await new Promise(resolve => setTimeout(resolve, 50));

    // Criar uma única janela para toda a impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.setImprimindo(false);
        ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Funções auxiliares

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Impressão Completa - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS ROBUSTO para impressão - IDÊNTICO às funções individuais */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    .page-break {
                        page-break-after: always !important;
                        break-after: always !important;
                    }
                    
                    .no-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                }
                
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                table {
                    width: 90%;
                    max-width: 90%;
                    border-collapse: collapse;
                    margin: 2mm auto;
                    box-sizing: border-box;
                    table-layout: fixed;
                }
                
                td {
                    word-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                
                /* Estilos específicos para Recibo de Pagamento */
                .recibo-pagamento {
                    font-size: 12px;
                    line-height: 1.6;
                    max-width: 90%;
                    margin: 0 auto;
                    padding: 20mm;
                }
                .recibo-pagamento h1 { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; }
                .recibo-pagamento p { text-align: justify; line-height: 1.8; margin-bottom: 16px; }
                .recibo-pagamento table { width: 100%; max-width: 100%; border-collapse: collapse; }
                .recibo-pagamento th { padding: 8px; text-align: center; border-bottom: 1px solid #000; font-weight: bold; }
                .recibo-pagamento th:first-child { width: 15%; }
                .recibo-pagamento th:nth-child(2) { width: 60%; }
                .recibo-pagamento th:last-child { width: 25%; }
                .recibo-pagamento td { padding: 8px; text-align: center; }
                .recibo-pagamento .total-row td { border-top: 1px solid #000; }
                .recibo-pagamento .signature-line { border-top: 1px solid #000; padding-top: 8px; min-width: 300px; display: inline-block; }
                .recibo-pagamento .spacing-after-table { margin-bottom: 100px; }
                .recibo-pagamento .spacing-after-date { margin-bottom: 150px; }
            </style>
        </head>
        <body>
    `;

    let pageCount = 0;

    // ========== SEÇÃO 1: HOLERITES (LAYOUT IDÊNTICO À imprimirHoleritesEmLote) ==========
    folhas.forEach((folha, index) => {
        ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: index + 1 }));
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
        const eventos = mapearFolhaParaHolerite(folha.resultado, eventosAtuais, folha.dadosFolha, ctx.parametros);
        const eventosComDados = eventos.filter(e => e && e.valor !== 0);
        const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;

        // Calcular totais a partir dos lançamentos mapeados
        const totalProventos = eventosComDados.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((sum, e) => sum + e.valor, 0);
        const totalDescontos = eventosComDados.filter(e => e.tipo === 'desconto').reduce((sum, e) => sum + e.valor, 0);
        const salarioLiquido = totalProventos - totalDescontos;

        htmlContent += `
            <div class="page-break">
                <table>
                    <colgroup>
                        <col style="width: 5%">
                        <col style="width: 5%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                    </colgroup>
                    <tbody>
                        <tr style="height: 8mm;">
                            <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="flex: 1;"></span>
                                    <span class="font-bold" style="font-size: 14px;">RECIBO DE PAGAMENTO DE SALÁRIO</span>
                                    <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                                </div>
                            </td>
                        </tr>
                        ${isRegistrado ? `
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.nome_empresa || 'Empresa'}</span>
                                    <span>Via do Empregado</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.endereco || 'Endereço'}</span>
                                    <span>CNPJ: ${folha.empresa?.cnpj || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span><span class="font-bold">Empregado</span> ${folha.funcionario?.nome_completo || 'N/A'}</span>
                                    <span><span class="font-bold">Admissão:</span> ${folha.funcionario?.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <span style="flex: 1;"><span class="font-bold">Cargo</span> ${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                    <span>CPF: ${folha.funcionario?.cpf || 'N/A'}</span>
                                    <span>RG: ${folha.funcionario?.rg || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Código</td>
                            <td colspan="3" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descrição</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Referência</td>
                            <td class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Unid</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Proventos</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descontos</td>
                        </tr>
                        ${eventosComDados.map((evento, idx) => `
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.codigo}</td>
                            <td colspan="3" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.descricao}</td>
                            <td colspan="2" class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.referencia || ''}</td>
                            <td class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.unidade || ''}</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                        </tr>
                        `).join('')}
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                    <span>a</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                                </div>
                            </td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalProventos)}</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalDescontos)}</td>
                        </tr>
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;"></td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Total Líquido</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(salarioLiquido)}</td>
                        </tr>
                        <tr style="height: 12mm;">
                            <td colspan="12" style="border: 1px solid black; padding: 4px; font-size: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 100%; margin-top: 28px;">
                                    <span>Declaro ter recebido a importância líquida discriminada neste recibo.</span>
                                    <div style="text-align: center;">
                                        <span>Assinatura do Funcionário _______________________________________________________</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        pageCount++;
    });

    // ========== SEÇÃO 2: BENEFÍCIOS (LAYOUT IDÊNTICO À imprimirBeneficiosEmLote) ==========
    folhas.forEach((folha, index) => {
        ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: folhas.length + index + 1 }));
        
        const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];

        // Calcular dados de benefícios (IDÊNTICO À impressão individual)
        const diasTrabalhados = (() => {
            const dadosDias = folha.dadosFolha?.dados_dias;
            if (!dadosDias) return 0;
            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
        })();

        const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
        const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;
        const faltasJustificadas = folha.dadosFolha?.total_faltas_justificadas || 0;
        const faltasInjustificadas = folha.dadosFolha?.total_faltas_injustificadas || 0;

        // Calcular totais de benefícios (IDÊNTICO À impressão individual)
        const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
        const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

        const totalBeneficios = 
            (folha.resultado.vale_transporte_mes_anterior || 0) +
            (folha.resultado.vale_transporte_mes_atual || 0) +
            (folha.resultado.vale_alimentacao_mes_anterior || 0) +
            (folha.resultado.vale_alimentacao_mes_atual || 0) +
            ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
            ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
            (folha.resultado.cesta_basica || 0) +
            (folha.resultado.premio_permanencia || 0) +
            (folha.resultado.folga_trabalhada || 0) +
            beneficiosEventos;

        const totalDescontosBeneficios = 
            (folha.resultado.desconto_vt_faltas || 0) +
            (folha.resultado.desconto_va_faltas || 0) +
            (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
            descontosEventos;

        const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

        // Pular funcionários sem benefícios
        if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
            return;
        }

        // Gerar eventos de benefícios (IDÊNTICO À impressão individual)
        const eventosBeneficios: { codigo: string; descricao: string; referencia: string; valor: number; tipo: string }[] = [];
        const mesAtual = ctx.meses[ctx.mes - 1];
        const mesProximo = ctx.meses[ctx.mes % 12];

        if (folha.resultado.vale_transporte_mes_anterior > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_transporte_mes_anterior, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_transporte_mes_atual > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesProximo})`, referencia: diasATrabalharVT.toString(), valor: folha.resultado.vale_transporte_mes_atual, tipo: 'beneficio' });
        }
        if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: 'Vale Transporte', referencia: '', valor: folha.resultado.vale_transporte, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_alimentacao_mes_anterior, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_alimentacao_mes_atual > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesProximo})`, referencia: diasATrabalharVA.toString(), valor: folha.resultado.vale_alimentacao_mes_atual, tipo: 'beneficio' });
        }
        if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: 'Vale Alimentação', referencia: '', valor: folha.resultado.vale_alimentacao, tipo: 'beneficio' });
        }
        if (folha.resultado.cesta_basica > 0) {
            eventosBeneficios.push({ codigo: '0603', descricao: 'Cesta Básica', referencia: '1', valor: folha.resultado.cesta_basica, tipo: 'beneficio' });
        }
        if (folha.resultado.premio_permanencia > 0) {
            eventosBeneficios.push({ codigo: '0604', descricao: 'Prêmio Permanência', referencia: '', valor: folha.resultado.premio_permanencia, tipo: 'beneficio' });
        }
        if (folha.resultado.desconto_vt_faltas > 0) {
            const totalFaltas = faltasJustificadas + faltasInjustificadas;
            eventosBeneficios.push({ codigo: '5004', descricao: 'Desc. VT por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_vt_faltas, tipo: 'desconto' });
        }
        if (folha.resultado.desconto_va_faltas > 0) {
            const totalFaltas = faltasJustificadas + faltasInjustificadas;
            eventosBeneficios.push({ codigo: '5003', descricao: 'Desc. VA por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_va_faltas, tipo: 'desconto' });
        }
        if (folha.resultado.desc_rondas_nao_realizadas_benef > 0) {
            eventosBeneficios.push({ codigo: '5011', descricao: 'Desc. Rondas Não Realizadas', referencia: '', valor: folha.resultado.desc_rondas_nao_realizadas_benef, tipo: 'desconto' });
        }

        // Adicionar eventos excepcionais de benefícios
        eventosAtuais.forEach(evento => {
            if (evento.tipo === 'beneficio') {
                const valorAbsoluto = Math.abs(evento.valor);
                if (valorAbsoluto > 0) {
                    const tipoEvento = evento.valor < 0 ? 'desconto' : 'beneficio';
                    let codigo = '0605';
                    if (evento.descricao === 'Reembolsos' || evento.descricao === 'Reembolsos (Uber)') codigo = '0605';
                    else if (evento.descricao === 'Desc. Rondas Não Realizadas') codigo = '5011';
                    
                    eventosBeneficios.push({ codigo, descricao: evento.descricao, referencia: '', valor: valorAbsoluto, tipo: tipoEvento });
                }
            }
        });

        // Separar benefícios e descontos para exibição no formato correto
        const eventosBeneficiosFormatados = [];
        
        // Usar as variáveis mesAtual e mesProximo já declaradas anteriormente
        
        // Vale Transporte - separado por mês
        if (folha.resultado.vale_transporte_mes_anterior > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0601', 
            descricao: `Vale Transporte (${mesAtual})`, 
            referencia: diasTrabalhados.toString(),
            unidade: 'R$',
            valor: folha.resultado.vale_transporte_mes_anterior, 
            tipo: 'beneficio' 
          });
        }
        if (folha.resultado.vale_transporte_mes_atual > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0601', 
            descricao: `Vale Transporte (${mesProximo})`, 
            referencia: diasATrabalharVT.toString(),
            unidade: 'R$',
            valor: folha.resultado.vale_transporte_mes_atual, 
            tipo: 'beneficio' 
          });
        }
        // Fallback para vale_transporte total (caso não tenha separação)
        if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0601', 
            descricao: 'Vale Transporte', 
            referencia: '',
            unidade: 'R$',
            valor: folha.resultado.vale_transporte, 
            tipo: 'beneficio' 
          });
        }
        
        // Vale Alimentação - separado por mês
        if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0602', 
            descricao: `Vale Alimentação (${mesAtual})`, 
            referencia: diasTrabalhados.toString(),
            unidade: 'R$',
            valor: folha.resultado.vale_alimentacao_mes_anterior, 
            tipo: 'beneficio' 
          });
        }
        if (folha.resultado.vale_alimentacao_mes_atual > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0602', 
            descricao: `Vale Alimentação (${mesProximo})`, 
            referencia: diasATrabalharVA.toString(),
            unidade: 'R$',
            valor: folha.resultado.vale_alimentacao_mes_atual, 
            tipo: 'beneficio' 
          });
        }
        // Fallback para vale_alimentacao total (caso não tenha separação)
        if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0602', 
            descricao: 'Vale Alimentação', 
            referencia: '',
            unidade: 'R$',
            valor: folha.resultado.vale_alimentacao, 
            tipo: 'beneficio' 
          });
        }
        
        if (folha.resultado.cesta_basica > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0603', 
            descricao: 'Cesta Básica', 
            referencia: '1',
            unidade: 'R$',
            valor: folha.resultado.cesta_basica, 
            tipo: 'beneficio' 
          });
        }
        if (folha.resultado.premio_permanencia > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '0604', 
            descricao: 'Prêmio Permanência', 
            referencia: '1',
            unidade: 'R$',
            valor: folha.resultado.premio_permanencia, 
            tipo: 'beneficio' 
          });
        }
        if (folha.resultado.desconto_vt_faltas > 0) {
          const totalFaltas = faltasJustificadas + faltasInjustificadas;
          eventosBeneficiosFormatados.push({ 
            codigo: '5004', 
            descricao: 'Desc. VT por Faltas', 
            referencia: totalFaltas.toString(),
            unidade: 'R$',
            valor: folha.resultado.desconto_vt_faltas, 
            tipo: 'desconto' 
          });
        }
        if (folha.resultado.desconto_va_faltas > 0) {
          const totalFaltas = faltasJustificadas + faltasInjustificadas;
          eventosBeneficiosFormatados.push({ 
            codigo: '5003', 
            descricao: 'Desc. VA por Faltas', 
            referencia: totalFaltas.toString(),
            unidade: 'R$',
            valor: folha.resultado.desconto_va_faltas, 
            tipo: 'desconto' 
          });
        }
        if (folha.resultado.desc_rondas_nao_realizadas_benef > 0) {
          eventosBeneficiosFormatados.push({ 
            codigo: '5011', 
            descricao: 'Desc. Rondas Não Realizadas', 
            referencia: '',
            unidade: 'R$',
            valor: folha.resultado.desc_rondas_nao_realizadas_benef, 
            tipo: 'desconto' 
          });
        }
        
        // Adicionar eventos excepcionais de benefícios
        eventosAtuais.forEach(evento => {
          if (evento.tipo === 'beneficio') {
            const valorAbsoluto = Math.abs(evento.valor);
            if (valorAbsoluto > 0) {
              const tipoEvento = evento.valor < 0 ? 'desconto' : 'beneficio';
              let codigo = '0605';
              if (evento.descricao === 'Reembolsos' || evento.descricao === 'Reembolsos (Uber)') codigo = '0605';
              else if (evento.descricao === 'Desc. Rondas Não Realizadas') codigo = '5011';
              
              eventosBeneficiosFormatados.push({ 
                codigo, 
                descricao: evento.descricao, 
                referencia: '',
                unidade: 'R$',
                valor: valorAbsoluto, 
                tipo: tipoEvento 
              });
            }
          }
        });

        // HTML com layout idêntico ao componente individual
        htmlContent += `
            <div class="page-break" style="width: 100%; min-height: 297mm; font-size: 8px; padding: 0; box-sizing: border-box;">
                <table style="table-layout: fixed; width: 90%; max-width: 90%; margin: 2mm auto; border-collapse: collapse;">
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
                        <!-- LINHA 1: Título -->
                        <tr style="height: 8mm;">
                            <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="flex: 1;"></span>
                                    <span style="font-weight: bold; font-size: 10px;">RECIBO DE BENEFÍCIOS</span>
                                    <span style="flex: 1; text-align: right; font-weight: bold;">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- LINHA 4: Empregado e Admissão -->
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span><span style="font-weight: 600;">Empregado</span> ${folha.funcionario.nome_completo}</span>
                                    <span><span style="font-weight: 600;">Admissão:</span> ${folha.funcionario.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- LINHA 5: Cargo e CPF/RG -->
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <span style="flex: 1;"><span style="font-weight: 600;">Cargo</span> ${folha.funcionario.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                    <span>CPF: ${formatarCPF(folha.funcionario.cpf || '')}</span>
                                    <span>RG: ${folha.funcionario.rg || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- LINHA 6: Cabeçalho da Tabela -->
                        <tr style="height: 6mm;">
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Código</td>
                            <td colspan="3" style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Descrição</td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Referência</td>
                            <td style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Unid</td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Benefícios</td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; font-weight: bold; text-align: center;">Descontos</td>
                        </tr>
                        
                        <!-- LINHAS 7-31: Eventos de Benefícios -->
                        ${eventosBeneficiosFormatados.map((evento, idx) => `
                            <tr style="height: 6mm;">
                                <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px; text-align: center;">
                                    ${evento.codigo}
                                </td>
                                <td colspan="3" style="border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px;">
                                    ${evento.descricao}
                                </td>
                                <td colspan="2" style="border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px; text-align: center;">
                                    ${evento.referencia || ''}
                                </td>
                                <td style="border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px; text-align: center;">
                                    R$
                                </td>
                                <td colspan="2" style="border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px; text-align: right;">
                                    ${evento.tipo === 'beneficio' ? 'R$ ' + formatarValor(evento.valor) : ''}
                                </td>
                                <td colspan="2" style="border-right: 1px solid black; ${idx === eventosBeneficiosFormatados.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px; font-size: 8px; text-align: right;">
                                    ${evento.tipo === 'desconto' ? 'R$ ' + formatarValor(evento.valor) : ''}
                                </td>
                            </tr>
                        `).join('')}
                        
                        <!-- LINHA 32: Período e Totais -->
                        <tr style="height: 7mm; font-weight: bold;">
                            <td colspan="8" style="border-left: 1px solid black; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 8px;">
                                Referente ao(s) dia(s) trabalhados no período de ${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio} a ${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}
                            </td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; text-align: right;">
                                R$ ${formatarValor(totalBeneficios)}
                            </td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; text-align: right;">
                                R$ ${formatarValor(totalDescontosBeneficios)}
                            </td>
                        </tr>
                        
                        <!-- LINHA 33: Total Líquido -->
                        <tr style="height: 7mm; font-weight: bold;">
                            <td colspan="8" style="border: 1px solid black; padding: 1px; font-size: 8px;">
                                <!-- Vazio -->
                            </td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; text-align: right;">
                                Total Líquido
                            </td>
                            <td colspan="2" style="border: 1px solid black; padding: 1px; font-size: 8px; text-align: right;">
                                R$ ${formatarValor(totalLiquidoBeneficios)}
                            </td>
                        </tr>
                        
                        <!-- LINHA 34: Declaração -->
                        <tr style="height: 7mm;">
                            <td colspan="12" style="border: 1px solid black; padding: 1px; font-size: 8px;">
                                Declaro ter recebido os benefícios discriminados neste recibo.
                            </td>
                        </tr>
                        
                        <!-- LINHA 35: Data e Assinatura -->
                        <tr style="height: 15mm;">
                            <td colspan="5" style="border-left: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 8px; vertical-align: bottom;">
                                <div style="text-align: center;">
                                    <div style="font-size: 8px; color: #666; margin-top: 1px;">Data: ________ /________ /________________</div>
                                </div>
                            </td>
                            <td colspan="7" style="border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 8px; vertical-align: bottom;">
                                <div style="text-align: left;">
                                    <div style="font-size: 8px; color: #666; margin-top: 1px;">Assinatura do Funcionário</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        pageCount++;
    });

    // ========== SEÇÃO 3: RECIBOS DE PAGAMENTO (LAYOUT IDÊNTICO À imprimirRecibosEmLote) ==========
    folhas.forEach((folha, index) => {
        ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: (folhas.length * 2) + index + 1 }));
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];

        // Calcular dados de benefícios (IGUAL À FUNÇÃO individual)
        const diasTrabalhados = (() => {
            const dadosDias = folha.dadosFolha?.dados_dias;
            if (!dadosDias) return 0;
            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
        })();

        const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
        const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;

        // Calcular totais de benefícios
        const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
        const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

        const totalBeneficios = 
            (folha.resultado.vale_transporte_mes_anterior || 0) +
            (folha.resultado.vale_transporte_mes_atual || 0) +
            (folha.resultado.vale_alimentacao_mes_anterior || 0) +
            (folha.resultado.vale_alimentacao_mes_atual || 0) +
            ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
            ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
            (folha.resultado.cesta_basica || 0) +
            (folha.resultado.premio_permanencia || 0) +
            (folha.resultado.folga_trabalhada || 0) +
            beneficiosEventos;

        const totalDescontosBeneficios = 
            (folha.resultado.desconto_vt_faltas || 0) +
            (folha.resultado.desconto_va_faltas || 0) +
            (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
            descontosEventos;

        const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;
        
        // ⭐ Calcular salário líquido via lançamentos do holerite (consistência com HOLERITE)
        const salarioLiquido = calcularSalarioLiquidoPorLancamentos(
            folha.funcionario.id,
            folha.resultado,
            eventosAtuais,
            folha.dadosFolha
        , ctx);
        const totalGeralRecebido = salarioLiquido + totalLiquidoBeneficios;

        if (totalBeneficios === 0) return;

        // Gerar lista de benefícios
        const beneficios: { quantidade: number | string; descricao: string; valor: number }[] = [];
        const mesAtual = ctx.meses[ctx.mes - 1];
        const mesProximo = ctx.meses[ctx.mes % 12];

        if (folha.resultado.vale_transporte_mes_anterior > 0) {
            beneficios.push({ quantidade: diasTrabalhados, descricao: `Vale Transporte (${mesAtual})`, valor: folha.resultado.vale_transporte_mes_anterior });
        }
        if (folha.resultado.vale_transporte_mes_atual > 0) {
            beneficios.push({ quantidade: diasATrabalharVT, descricao: `Vale Transporte (${mesProximo})`, valor: folha.resultado.vale_transporte_mes_atual });
        }
        if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
            beneficios.push({ quantidade: '-', descricao: 'Vale Transporte', valor: folha.resultado.vale_transporte });
        }
        if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
            beneficios.push({ quantidade: diasTrabalhados, descricao: `Vale Alimentação (${mesAtual})`, valor: folha.resultado.vale_alimentacao_mes_anterior });
        }
        if (folha.resultado.vale_alimentacao_mes_atual > 0) {
            beneficios.push({ quantidade: diasATrabalharVA, descricao: `Vale Alimentação (${mesProximo})`, valor: folha.resultado.vale_alimentacao_mes_atual });
        }
        if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
            beneficios.push({ quantidade: '-', descricao: 'Vale Alimentação', valor: folha.resultado.vale_alimentacao });
        }
        if (folha.resultado.cesta_basica > 0) {
            beneficios.push({ quantidade: 1, descricao: 'Cesta Básica', valor: folha.resultado.cesta_basica });
        }
        if (folha.resultado.premio_permanencia > 0) {
            beneficios.push({ quantidade: 1, descricao: 'Prêmio Permanência', valor: folha.resultado.premio_permanencia });
        }

        // Adicionar eventos excepcionais de benefícios
        eventosAtuais.forEach(evento => {
            if (evento.tipo === 'beneficio' && evento.valor > 0) {
                beneficios.push({ quantidade: '-', descricao: normalizarDescricao(evento.descricao), valor: evento.valor });
            }
        });

        // Gerar HTML do recibo (IDÊNTICO À FUNÇÃO individual)
        htmlContent += `
            <div class="recibo-pagamento page-break">
                <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin: 0 0 40px 0;">RECIBO DE PAGAMENTO</h1>
                
                <p>
                    Eu, <span class="font-bold">${folha.funcionario?.nome_completo}</span>, portador(a) do CPF nº 
                    <span class="font-bold">${formatarCPF(folha.funcionario?.cpf || '')}</span>, DECLARO, para os devidos fins, 
                    que recebi da empresa <span class="font-bold">${folha.empresa?.nome_empresa || '[NOME DA EMPRESA]'}</span>, inscrita no CNPJ 
                    sob o nº <span class="font-bold">${folha.empresa?.cnpj ? formatarCNPJ(folha.empresa.cnpj) : '[CNPJ]'}</span>, a quantia de R$ 
                    <span class="font-bold">${formatarValor(totalGeralRecebido)}</span>, conforme detalhamento abaixo:
                </p>
                
                <div style="margin-bottom: 20px;"></div>
                
                <table style="width: 100%; max-width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="width: 15%; text-align: center;">Qtde</th>
                            <th style="width: 60%; text-align: center;">Descrição</th>
                            <th style="width: 25%; text-align: center;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center;">-</td>
                            <td style="text-align: center;">Salário Líquido</td>
                            <td style="text-align: center;">R$ ${formatarValor(salarioLiquido)}</td>
                        </tr>
                        ${beneficios.map(beneficio => `
                            <tr>
                                <td style="text-align: center;">${beneficio.quantidade !== undefined && beneficio.quantidade !== '' ? beneficio.quantidade : '-'}</td>
                                <td style="text-align: center;">${beneficio.descricao}</td>
                                <td style="text-align: center;">R$ ${formatarValor(beneficio.valor)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td></td>
                            <td style="text-align: center;" class="font-bold">Total depositado:</td>
                            <td style="text-align: center;" class="font-bold">R$ ${formatarValor(totalGeralRecebido)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-bottom: 100px;"></div>
                
                <p>Campinas, ____ / ____ / _____________</p>
                
                <div style="margin-bottom: 150px;"></div>
                
                <div>
                    <div class="signature-line">
                        <p class="font-bold">${folha.funcionario?.nome_completo}</p>
                    </div>
                </div>
            </div>
        `;
        pageCount++;
    });

    // Fechar HTML
    htmlContent += `
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Impressão em Lote - ${pageCount} páginas`);
    ctx.setImprimindo(false);
    ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });

    // Finalizar progresso
    ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: prev.total }));
    ctx.showToast(`Preparando impressão de ${pageCount} páginas em uma única janela...`, 'success');
};

// ========================================
// INÍCIO DO CÓDIGO DE IMPRESSÃO EM LOTE
// ========================================

// Função para imprimir todos os recibos de UM funcionário em UMA ÚNICA janela
export function imprimirTudoSeparado(ctx: PrintContext, folha: FolhaCalculadaCompleta) {
    if (!folha) return;

    // Usar a função consolidada passando apenas esse funcionário
    imprimirTudoEmUmaJanela(ctx, [folha]);
};

// ========================================
// FIM DO CÓDIGO DE IMPRESSÃO EM LOTE
// ========================================


// Função para imprimir holerites em lote
export async function imprimirHoleritesEmLote(ctx: PrintContext, folhas: FolhaCalculadaCompleta[]) {
    if (folhas.length === 0) {
        ctx.showToast('Nenhuma folha para imprimir', 'error');
        return;
    }

    // Iniciar indicador de progresso
    ctx.setImprimindo(true);
    ctx.setProgressoImpressao({ atual: 0, total: folhas.length, tipo: 'Holerites' });
    await new Promise(resolve => setTimeout(resolve, 50));

    // Criar uma nova janela para impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.setImprimindo(false);
        ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Montar HTML com todos os holerites
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Holerites - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS ULTRA-ROBUSTO para impressão - força configurações corretas */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    .page-break {
                        page-break-after: always !important;
                        break-after: always !important;
                    }
                    
                    .no-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                }
                
                /* CSS para tela e impressão */
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                table {
                    width: 90%;
                    max-width: 90%;
                    border-collapse: collapse;
                    margin: 2mm auto;
                    box-sizing: border-box;
                    table-layout: fixed;
                }
                
                td {
                    word-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 8mm 3mm 8mm 3mm; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page-break {
                        page-break-after: always;
                        break-after: always;
                    }
                    .no-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
                
                body {
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                table {
                    width: 100%;
                    max-width: 210mm; /* Largura total do papel A4 */
                    border-collapse: collapse;
                    margin: 0 auto;
                    box-sizing: border-box;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
    `;

    folhas.forEach((folha, index) => {
        // Atualizar progresso
        ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: index + 1 }));
        
        // ⭐ USAR EVENTOS DO ESTADO (eventosExcepcionais) EM VEZ DE folha.eventosExcepcionais
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
        const eventos = mapearFolhaParaHolerite(folha.resultado, eventosAtuais, folha.dadosFolha, ctx.parametros);
        const eventosComDados = eventos.filter(e => e && e.valor !== 0);
        const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;

        htmlContent += `
            <div class="${index < folhas.length - 1 ? 'page-break' : ''}">
                <table>
                    <colgroup>
                        <col style="width: 5%">
                        <col style="width: 5%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                    </colgroup>
                    <tbody>
                        <tr style="height: 8mm;">
                            <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="flex: 1;"></span>
                                    <span class="font-bold" style="font-size: 14px;">RECIBO DE PAGAMENTO DE SALÁRIO</span>
                                    <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                                </div>
                            </td>
                        </tr>
                        ${isRegistrado ? `
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.nome_empresa || 'Empresa'}</span>
                                    <span>Via do Empregado</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.endereco || 'Endereço'}</span>
                                    <span>CNPJ: ${folha.empresa?.cnpj || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span><span class="font-bold">Empregado</span> ${folha.funcionario?.nome_completo || 'N/A'}</span>
                                    <span><span class="font-bold">Admissão:</span> ${folha.funcionario?.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <span style="flex: 1;"><span class="font-bold">Cargo</span> ${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                    <span>CPF: ${folha.funcionario?.cpf || 'N/A'}</span>
                                    <span>RG: ${folha.funcionario?.rg || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Código</td>
                            <td colspan="3" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descrição</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Referência</td>
                            <td class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Unid</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Proventos</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descontos</td>
                        </tr>
                        ${(() => {
                            // Calcular totais a partir dos lançamentos mapeados para evitar inconsistências
                            const totalProventosCalc = eventosComDados.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((sum, e) => sum + e.valor, 0);
                            const totalDescontosCalc = eventosComDados.filter(e => e.tipo === 'desconto').reduce((sum, e) => sum + e.valor, 0);
                            const salarioLiquidoCalc = totalProventosCalc - totalDescontosCalc;
                            
                            return eventosComDados.map((evento, idx) => `
                            <tr style="height: 6mm;">
                                <td colspan="2" class="text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.codigo}</td>
                                <td colspan="3" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.descricao}</td>
                                <td colspan="2" class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.referencia || ''}</td>
                                <td class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.unidade || ''}</td>
                                <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}</td>
                                <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                            </tr>
                        `).join('') + `
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                    <span>a</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                                </div>
                            </td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalProventosCalc)}</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalDescontosCalc)}</td>
                        </tr>
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;"></td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Total Líquido</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(salarioLiquidoCalc)}</td>
                        </tr>`;
                        })()}
                        <tr style="height: 7mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <span style="flex: 1; min-width: 120px;">Salário Base: ${formatarMoeda(folha.resultado.salario_base)}</span>
                                    <span style="flex: 1; min-width: 120px;">Base INSS: ${formatarMoeda(folha.resultado.base_inss || folha.resultado.salario_base)}</span>
                                    <span style="flex: 1; min-width: 120px;">Base FGTS: ${formatarMoeda(folha.resultado.base_fgts || folha.resultado.salario_base)}</span>
                                    <span style="flex: 1; min-width: 120px;">FGTS do mês: ${formatarMoeda(folha.resultado.fgts)}</span>
                                    <span style="flex: 1; min-width: 120px;">Base IRRF: ${formatarMoeda(folha.resultado.base_irrf || (folha.resultado.salario_base - folha.resultado.desconto_inss))}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 7mm;">
                            <td colspan="12" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Declaro ter recebido a importância líquida discriminada neste recibo.</td>
                        </tr>
                        <tr style="height: 15mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 8px 12px; font-size: 9px; vertical-align: bottom;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 15px;">
                                    <div style="text-align: left;; margin-top: 8px">
                                        <span style="font-size: 9px;">Data: ______/______/____________</span>
                                    </div>
                                    <div style="text-align: right;; margin-top: 8px">
                                        <span style="font-size: 9px;">Assinatura: _________________________________________________________</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Holerites em Lote - ${folhas.length} funcionários`);
    ctx.setImprimindo(false);
    ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
    
    // Finalizar progresso
    ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: prev.total }));
    ctx.showToast(`Preparando impressão de ${folhas.length} holerites...`, 'success');
};

// ========================================
// INÍCIO DO CÓDIGO DE IMPRESSÃO INDIVIDUAL - HOLERITE
// ========================================

// Função para imprimir holerite individual
const imprimirHoleriteIndividual = (ctx: PrintContext, folha: FolhaCalculadaCompleta) => {
    if (!folha) {
        ctx.showToast('Nenhuma folha selecionada para imprimir', 'error');
        return;
    }

    // Criar uma nova janela para impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Buscar eventos excepcionais do estado atual
    const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
    const eventos = mapearFolhaParaHolerite(folha.resultado, eventosAtuais, folha.dadosFolha, ctx.parametros);
    const eventosComDados = eventos.filter(e => e && e.valor !== 0);
    const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;

    // Calcular totais a partir dos lançamentos mapeados para evitar duplicação
    // NOTA: Os eventos excepcionais já estão incluídos em eventosComDados via mapearFolhaParaHolerite
    const totalProventos = eventosComDados.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((sum, e) => sum + e.valor, 0);
    const totalDescontos = eventosComDados.filter(e => e.tipo === 'desconto').reduce((sum, e) => sum + e.valor, 0);
    const salarioLiquido = totalProventos - totalDescontos;

    // Montar HTML com configurações idênticas à impressão em lote
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Holerite Individual - ${folha.funcionario?.nome_completo} - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS ULTRA-ROBUSTO para impressão - IDÊNTICO À IMPRESSÃO EM LOTE */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                }
                
                /* CSS para tela e impressão */
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                table {
                    width: 90%;
                    max-width: 90%;
                    border-collapse: collapse;
                    margin: 2mm auto;
                    box-sizing: border-box;
                    table-layout: fixed;
                }
                
                td {
                    word-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <colgroup>
                    <col style="width: 5%">
                    <col style="width: 5%">
                    <col style="width: 11%">
                    <col style="width: 11%">
                    <col style="width: 11%">
                    <col style="width: 7%">
                    <col style="width: 7%">
                    <col style="width: 7%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                </colgroup>
                <tbody>
                    <tr style="height: 8mm;">
                        <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="flex: 1;"></span>
                                <span class="font-bold" style="font-size: 14px;">RECIBO DE PAGAMENTO DE SALÁRIO</span>
                                <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                            </div>
                        </td>
                    </tr>
                    ${isRegistrado ? `
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>${folha.empresa?.nome_empresa || 'Empresa'}</span>
                                <span>Via do Empregado</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>${folha.empresa?.endereco || 'Endereço'}</span>
                                <span>CNPJ: ${folha.empresa?.cnpj || 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    ` : ''}
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span><span class="font-bold">Empregado</span> ${folha.funcionario?.nome_completo || 'N/A'}</span>
                                <span><span class="font-bold">Admissão:</span> ${folha.funcionario?.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                <span style="flex: 1;"><span class="font-bold">Cargo</span> ${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                <span>CPF: ${folha.funcionario?.cpf || 'N/A'}</span>
                                <span>RG: ${folha.funcionario?.rg || 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Código</td>
                        <td colspan="3" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descrição</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Referência</td>
                        <td class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Unid</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Proventos</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descontos</td>
                    </tr>
                    ${eventosComDados.map((evento, idx) => `
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.codigo}</td>
                            <td colspan="3" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.descricao}</td>
                            <td colspan="2" class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.referencia || ''}</td>
                            <td class="text-center" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.unidade || ''}</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosComDados.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                        </tr>
                    `).join('')}
                    <tr class="font-bold" style="height: 7mm;">
                        <td colspan="8" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                <span>a</span>
                                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                            </div>
                        </td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalProventos)}</td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalDescontos)}</td>
                    </tr>
                    <tr class="font-bold" style="height: 7mm;">
                        <td colspan="8" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;"></td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Total Líquido</td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(salarioLiquido)}</td>
                    </tr>
                    <tr style="height: 7mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="flex: 1; min-width: 120px;">Salário Base: ${formatarMoeda(folha.resultado.salario_base)}</span>
                                <span style="flex: 1; min-width: 120px;">Base INSS: ${formatarMoeda(folha.resultado.base_inss || folha.resultado.salario_base)}</span>
                                <span style="flex: 1; min-width: 120px;">Base FGTS: ${formatarMoeda(folha.resultado.base_fgts || folha.resultado.salario_base)}</span>
                                <span style="flex: 1; min-width: 120px;">FGTS do mês: ${formatarMoeda(folha.resultado.fgts)}</span>
                                <span style="flex: 1; min-width: 120px;">Base IRRF: ${formatarMoeda(folha.resultado.base_irrf || (folha.resultado.salario_base - folha.resultado.desconto_inss))}</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 7mm;">
                        <td colspan="12" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Declaro ter recebido a importância líquida discriminada neste recibo.</td>
                    </tr>
                    <tr style="height: 15mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 8px 12px; font-size: 9px; vertical-align: bottom;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 15px;">
                                <div style="text-align: left; margin-top: 8px;">
                                    <span style="font-size: 9px;">Data: ______/______/____________</span>
                                </div>
                                <div style="text-align: right; margin-top: 8px;">
                                    <span style="font-size: 9px;">Assinatura: _________________________________________________________</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Holerite - ${folha.funcionario?.nome_completo}`);
};

// ========================================
// FIM DO CÓDIGO DE IMPRESSÃO INDIVIDUAL - HOLERITE
// ========================================

// ----------------------------------------
// RECIBOS DE BENEFÍCIOS - INDIVIDUAL
// ----------------------------------------

// ========================================
// INÍCIO DO CÓDIGO DE IMPRESSÃO INDIVIDUAL - RECIBO DE BENEFÍCIOS
// ========================================

// Função para imprimir recibo de benefícios individual
const imprimirReciboBeneficiosIndividual = (ctx: PrintContext, folha: FolhaCalculadaCompleta) => {
    if (!folha) {
        ctx.showToast('Nenhuma folha selecionada para imprimir', 'error');
        return;
    }

    // Criar uma nova janela para impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Buscar eventos excepcionais do estado atual
    const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
    const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;

    // Calcular dados de benefícios
    const diasTrabalhados = (() => {
        const dadosDias = folha.dadosFolha?.dados_dias;
        if (!dadosDias) return 0;
        const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
        return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
    })();

    const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
    const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;
    const faltasJustificadas = folha.dadosFolha?.total_faltas_justificadas || 0;
    const faltasInjustificadas = folha.dadosFolha?.total_faltas_injustificadas || 0;

    // Calcular totais de benefícios
    const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
    const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

    const totalBeneficios = 
        (folha.resultado.vale_transporte_mes_anterior || 0) +
        (folha.resultado.vale_transporte_mes_atual || 0) +
        (folha.resultado.vale_alimentacao_mes_anterior || 0) +
        (folha.resultado.vale_alimentacao_mes_atual || 0) +
        ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
        ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
        (folha.resultado.cesta_basica || 0) +
        (folha.resultado.premio_permanencia || 0) +
        (folha.resultado.folga_trabalhada || 0) +
        beneficiosEventos;

    const totalDescontosBeneficios = 
        (folha.resultado.desconto_vt_faltas || 0) +
        (folha.resultado.desconto_va_faltas || 0) +
        (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
        descontosEventos;

    const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

    // Se não há benefícios, não imprimir
    if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
        ctx.showToast('Este funcionário não possui benefícios para imprimir', 'info');
        printWindow.close();
        return;
    }

    // Gerar eventos de benefícios
    const eventosBeneficios = [];
    const mesAtual = ctx.meses[ctx.mes - 1];
    const mesProximo = ctx.meses[ctx.mes % 12];

    if (folha.resultado.vale_transporte_mes_anterior > 0) {
        eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_transporte_mes_anterior, tipo: 'beneficio' });
    }
    if (folha.resultado.vale_transporte_mes_atual > 0) {
        eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesProximo})`, referencia: diasATrabalharVT.toString(), valor: folha.resultado.vale_transporte_mes_atual, tipo: 'beneficio' });
    }
    if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
        eventosBeneficios.push({ codigo: '0601', descricao: 'Vale Transporte', referencia: '', valor: folha.resultado.vale_transporte, tipo: 'beneficio' });
    }
    if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
        eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_alimentacao_mes_anterior, tipo: 'beneficio' });
    }
    if (folha.resultado.vale_alimentacao_mes_atual > 0) {
        eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesProximo})`, referencia: diasATrabalharVA.toString(), valor: folha.resultado.vale_alimentacao_mes_atual, tipo: 'beneficio' });
    }
    if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
        eventosBeneficios.push({ codigo: '0602', descricao: 'Vale Alimentação', referencia: '', valor: folha.resultado.vale_alimentacao, tipo: 'beneficio' });
    }
    if (folha.resultado.cesta_basica > 0) {
        eventosBeneficios.push({ codigo: '0603', descricao: 'Cesta Básica', referencia: '1', valor: folha.resultado.cesta_basica, tipo: 'beneficio' });
    }
    if (folha.resultado.premio_permanencia > 0) {
        eventosBeneficios.push({ codigo: '0604', descricao: 'Prêmio Permanência', referencia: '', valor: folha.resultado.premio_permanencia, tipo: 'beneficio' });
    }
    if (folha.resultado.desconto_vt_faltas > 0) {
        const totalFaltas = faltasJustificadas + faltasInjustificadas;
        eventosBeneficios.push({ codigo: '5004', descricao: 'Desc. VT por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_vt_faltas, tipo: 'desconto' });
    }
    if (folha.resultado.desconto_va_faltas > 0) {
        const totalFaltas = faltasJustificadas + faltasInjustificadas;
        eventosBeneficios.push({ codigo: '5003', descricao: 'Desc. VA por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_va_faltas, tipo: 'desconto' });
    }
    if (folha.resultado.desc_rondas_nao_realizadas_benef > 0) {
        eventosBeneficios.push({ codigo: '5011', descricao: 'Desc. Rondas Não Realizadas', referencia: '', valor: folha.resultado.desc_rondas_nao_realizadas_benef, tipo: 'desconto' });
    }

    // Adicionar eventos excepcionais de benefícios
    eventosAtuais.forEach(evento => {
        if (evento.tipo === 'beneficio') {
            const valorAbsoluto = Math.abs(evento.valor);
            if (valorAbsoluto > 0) {
                const tipoEvento = evento.valor < 0 ? 'desconto' : 'beneficio';
                let codigo = '0605';
                if (evento.descricao === 'Reembolsos') codigo = '0605';
                else if (evento.descricao === 'Desc. Rondas Não Realizadas') codigo = '5011';
                
                eventosBeneficios.push({ codigo, descricao: evento.descricao, referencia: '', valor: valorAbsoluto, tipo: tipoEvento });
            }
        }
    });

    // Montar HTML com configurações idênticas à impressão em lote
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Recibo de Benefícios Individual - ${folha.funcionario?.nome_completo} - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS ULTRA-ROBUSTO para impressão - IDÊNTICO À IMPRESSÃO EM LOTE */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                }
                
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                table {
                    width: 90%;
                    max-width: 90%;
                    border-collapse: collapse;
                    margin: 2mm auto;
                    box-sizing: border-box;
                    table-layout: fixed;
                }
                
                td {
                    word-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <colgroup>
                    <col style="width: 5%">
                    <col style="width: 5%">
                    <col style="width: 11%">
                    <col style="width: 11%">
                    <col style="width: 11%">
                    <col style="width: 7%">
                    <col style="width: 7%">
                    <col style="width: 7%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                    <col style="width: 9%">
                </colgroup>
                <tbody>
                    <tr style="height: 8mm;">
                        <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="flex: 1;"></span>
                                <span class="font-bold" style="font-size: 14px;">RECIBO DE BENEFÍCIOS</span>
                                <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                            </div>
                        </td>
                    </tr>
                    ${isRegistrado ? `
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>${folha.empresa?.nome_empresa || 'Empresa'}</span>
                                <span>Via do Empregado</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>${folha.empresa?.endereco || 'Endereço'}</span>
                                <span>CNPJ: ${folha.empresa?.cnpj || 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    ` : ''}
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span><span class="font-bold">Empregado</span> ${folha.funcionario?.nome_completo || 'N/A'}</span>
                                <span><span class="font-bold">Admissão:</span> ${folha.funcionario?.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                <span style="flex: 1;"><span class="font-bold">Cargo</span> ${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                <span>CPF: ${folha.funcionario?.cpf || 'N/A'}</span>
                                <span>RG: ${folha.funcionario?.rg || 'N/A'}</span>
                            </div>
                        </td>
                    </tr>
                    <tr style="height: 6mm;">
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Código</td>
                        <td colspan="3" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descrição</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Referência</td>
                        <td class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Unid</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Benefícios</td>
                        <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descontos</td>
                    </tr>
                    ${eventosBeneficios.map((evento, idx) => `
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.codigo}</td>
                            <td colspan="3" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.descricao}</td>
                            <td colspan="2" class="text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.referencia || ''}</td>
                            <td class="text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">R$</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'beneficio' ? formatarMoeda(evento.valor) : ''}</td>
                            <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                        </tr>
                    `).join('')}
                    <tr class="font-bold" style="height: 7mm;">
                        <td colspan="8" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                <span>a</span>
                                <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                            </div>
                        </td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalBeneficios)}</td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalDescontosBeneficios)}</td>
                    </tr>
                    <tr class="font-bold" style="height: 7mm;">
                        <td colspan="8" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;"></td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Total Líquido</td>
                        <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalLiquidoBeneficios)}</td>
                    </tr>
                    <tr style="height: 7mm;">
                        <td colspan="12" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Declaro ter recebido os benefícios discriminados neste recibo.</td>
                    </tr>
                    <tr style="height: 15mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 8px 12px 10px 12px; font-size: 9px; vertical-align: bottom;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 15px;">
                                <div style="text-align: left;">
                                    <span style="font-size: 9px;">Data: ______/______/____________</span>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 9px;">Assinatura: ____________________________________________________________</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Recibo Benefícios - ${folha.funcionario?.nome_completo}`);
};

// ----------------------------------------
// FIM: RECIBOS DE BENEFÍCIOS - INDIVIDUAL
// ----------------------------------------

// ----------------------------------------
// RECIBOS DE PAGAMENTO - INDIVIDUAL
// ----------------------------------------

// ========================================
// INÍCIO DO CÓDIGO DE IMPRESSÃO INDIVIDUAL - RECIBO DE PAGAMENTO
// ========================================

// Função para imprimir recibo de pagamento individual
const imprimirReciboPagamentoIndividual = (ctx: PrintContext, folha: FolhaCalculadaCompleta) => {
    if (!folha) {
        ctx.showToast('Nenhuma folha selecionada para imprimir', 'error');
        return;
    }

    // Criar uma nova janela para impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Buscar eventos excepcionais do estado atual
    const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];

    // Calcular dados de benefícios (IGUAL À FUNÇÃO DE BENEFÍCIOS)
    const diasTrabalhados = (() => {
        const dadosDias = folha.dadosFolha?.dados_dias;
        if (!dadosDias) return 0;
        const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
        return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
    })();

    const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
    const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;

    // Calcular totais de benefícios
    const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
    const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

    const totalBeneficios = 
        (folha.resultado.vale_transporte_mes_anterior || 0) +
        (folha.resultado.vale_transporte_mes_atual || 0) +
        (folha.resultado.vale_alimentacao_mes_anterior || 0) +
        (folha.resultado.vale_alimentacao_mes_atual || 0) +
        ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
        ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
        (folha.resultado.cesta_basica || 0) +
        (folha.resultado.premio_permanencia || 0) +
        beneficiosEventos;

    const totalDescontosBeneficios = 
        (folha.resultado.desconto_vt_faltas || 0) +
        (folha.resultado.desconto_va_faltas || 0) +
        (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
        descontosEventos;

    const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

    // Se não há benefícios, não imprimir
    if (totalLiquidoBeneficios <= 0) {
        ctx.showToast('Este funcionário não possui benefícios para gerar recibo de pagamento', 'info');
        printWindow.close();
        return;
    }

    // Calcular salário líquido (SEM benefícios) a partir dos lançamentos do holerite
    const salarioLiquido = calcularSalarioLiquidoPorLancamentos(
        folha.funcionario.id,
        folha.resultado,
        eventosAtuais,
        folha.dadosFolha
    , ctx);

    // Total geral que o funcionário recebeu (salário líquido + benefícios líquidos)
    const totalGeralRecebido = salarioLiquido + totalLiquidoBeneficios;

    // Preparar lista de benefícios COM QUANTIDADES CORRETAS
    const beneficios = [];
    
    if (folha.resultado.vale_transporte_mes_anterior > 0) {
        beneficios.push({ 
            quantidade: diasTrabalhados.toString(), 
            descricao: `Vale Transporte (${ctx.meses[ctx.mes - 1]})`, 
            valor: folha.resultado.vale_transporte_mes_anterior 
        });
    }
    if (folha.resultado.vale_transporte_mes_atual > 0) {
        beneficios.push({ 
            quantidade: diasATrabalharVT.toString(), 
            descricao: `Vale Transporte (${ctx.meses[ctx.mes % 12]})`, 
            valor: folha.resultado.vale_transporte_mes_atual 
        });
    }
    if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
        beneficios.push({ 
            quantidade: diasTrabalhados.toString(), 
            descricao: 'Vale Transporte', 
            valor: folha.resultado.vale_transporte 
        });
    }
    if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
        beneficios.push({ 
            quantidade: diasTrabalhados.toString(), 
            descricao: `Vale Alimentação (${ctx.meses[ctx.mes - 1]})`, 
            valor: folha.resultado.vale_alimentacao_mes_anterior 
        });
    }
    if (folha.resultado.vale_alimentacao_mes_atual > 0) {
        beneficios.push({ 
            quantidade: diasATrabalharVA.toString(), 
            descricao: `Vale Alimentação (${ctx.meses[ctx.mes % 12]})`, 
            valor: folha.resultado.vale_alimentacao_mes_atual 
        });
    }
    if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
        beneficios.push({ 
            quantidade: diasTrabalhados.toString(), 
            descricao: 'Vale Alimentação', 
            valor: folha.resultado.vale_alimentacao 
        });
    }
    if (folha.resultado.cesta_basica > 0) {
        beneficios.push({ 
            quantidade: '1', 
            descricao: 'Cesta Básica', 
            valor: folha.resultado.cesta_basica 
        });
    }
    if (folha.resultado.premio_permanencia > 0) {
        beneficios.push({ 
            quantidade: '1', 
            descricao: 'Prêmio Permanência', 
            valor: folha.resultado.premio_permanencia 
        });
    }

    // Adicionar eventos excepcionais de benefícios COM QUANTIDADES
    eventosAtuais.forEach(evento => {
        if (evento.tipo === 'beneficio' && evento.valor > 0) {
            // ⭐ Normalizar descrição antes de exibir
            const descricaoNormalizada = normalizarDescricao(evento.descricao);
            
            // Definir quantidade baseada no tipo de evento
            let quantidade = '';
            const descLower = descricaoNormalizada.toLowerCase();
            if (descLower.includes('vale transporte')) {
                quantidade = diasTrabalhados.toString();
            } else if (descLower.includes('vale alimentação')) {
                quantidade = diasTrabalhados.toString();
            } else if (descLower.includes('cesta') || 
                      descLower.includes('prêmio') ||
                      descLower.includes('reembolso')) {
                quantidade = '1';
            }
            
            beneficios.push({ 
                quantidade: quantidade || '', 
                descricao: descricaoNormalizada, 
                valor: evento.valor 
            });
        }
    });




    // Montar HTML com configurações idênticas à impressão em lote
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Recibo de Pagamento Individual - ${folha.funcionario?.nome_completo} - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS ULTRA-ROBUSTO para impressão - IDÊNTICO À IMPRESSÃO EM LOTE */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                }
                
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 20px;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                .container {
                    width: 90%;
                    max-width: 90%;
                    margin: 0 auto;
                    box-sizing: border-box;
                }
                
                h1 { text-align: center; font-size: 18px; font-weight: bold; }
                p { text-align: justify; line-height: 1.8; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { padding: 8px; text-align: center; border-bottom: 1px solid #000; font-weight: bold; }
                td { padding: 8px; text-align: center; }
                .total-row td { border-top: 1px solid #000; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .signature-line { border-top: 1px solid #000; padding-top: 8px; min-width: 300px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin: 0 0 40px 0;">RECIBO DE PAGAMENTO</h1>
                
                <p>
                    Eu, <span class="font-bold">${folha.funcionario?.nome_completo}</span>, portador(a) do CPF nº 
                    <span class="font-bold">${formatarCPF(folha.funcionario?.cpf || '')}</span>, DECLARO, para os devidos fins, 
                    que recebi da empresa <span class="font-bold">${folha.empresa?.nome_empresa || '[NOME DA EMPRESA]'}</span>, inscrita no CNPJ 
                    sob o nº <span class="font-bold">${folha.empresa?.cnpj ? formatarCNPJ(folha.empresa.cnpj) : '[CNPJ]'}</span>, a quantia de R$ 
                    <span class="font-bold">${formatarValor(totalGeralRecebido)}</span>, conforme detalhamento abaixo:
                </p>
                
                <div style="margin-bottom: 20px;"></div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Qtde</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>-</td>
                            <td>Salário Líquido</td>
                        <td>R$ ${formatarValor(salarioLiquido)}</td>
                        </tr>
                        ${beneficios.map(beneficio => `
                            <tr>
                                <td>${beneficio.quantidade !== undefined && beneficio.quantidade !== '' ? beneficio.quantidade : '-'}</td>
                                <td>${beneficio.descricao}</td>
                                <td>R$ ${formatarValor(beneficio.valor)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td></td>
                            <td class="font-bold">Total depositado:</td>
                            <td class="font-bold">R$ ${formatarValor(totalGeralRecebido)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-bottom: 100px;"></div>
                
                <p>Campinas, ____ / ____ / _____________</p>
                
                <div style="margin-bottom: 150px;"></div>
                
                <div>
                    <div class="signature-line">
                        <p class="font-bold">${folha.funcionario?.nome_completo}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Recibo Pagamento - ${folha.funcionario?.nome_completo}`);
};

// ========================================
// FIM DO CÓDIGO DE IMPRESSÃO INDIVIDUAL - RECIBO DE PAGAMENTO
// ========================================

// ----------------------------------------
// FIM: RECIBOS DE PAGAMENTO - INDIVIDUAL
// ----------------------------------------

// ========================================
// FIM: CÓDIGO DE IMPRESSÃO INDIVIDUAL
// ========================================

// ----------------------------------------
// RECIBOS DE BENEFÍCIOS - EM LOTE
// ----------------------------------------

// Função para imprimir benefícios em lote
export async function imprimirBeneficiosEmLote(ctx: PrintContext, folhas: FolhaCalculadaCompleta[]) {
    if (folhas.length === 0) {
        ctx.showToast('Nenhuma folha para imprimir', 'error');
        return;
    }

    // Iniciar indicador de progresso
    ctx.setImprimindo(true);
    ctx.setProgressoImpressao({ atual: 0, total: folhas.length, tipo: 'Benefícios' });
    await new Promise(resolve => setTimeout(resolve, 50));

    // Filtrar apenas funcionários com beno
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.setImprimindo(false);
        ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Montar HTML com EXATAMENTE a mesma estrutura da impressão individual
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Recibos de Benefícios - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                /* CSS IDÊNTICO À IMPRESSÃO INDIVIDUAL */
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 2mm 5mm 2mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                    
                    .page-break {
                        page-break-after: always !important;
                        break-after: always !important;
                    }
                }
                
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                
                table {
                    width: 90%;
                    max-width: 90%;
                    border-collapse: collapse;
                    margin: 2mm auto;
                    box-sizing: border-box;
                    table-layout: fixed;
                }
                
                td {
                    word-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
    `;

    folhas.forEach((folha, index) => {
        // Atualizar progresso
        ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: index + 1 }));
        
        const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];

        // Calcular dados de benefícios (IDÊNTICO À IMPRESSÃO INDIVIDUAL)
        const diasTrabalhados = (() => {
            const dadosDias = folha.dadosFolha?.dados_dias;
            if (!dadosDias) return 0;
            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
        })();

        const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
        const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;
        const faltasJustificadas = folha.dadosFolha?.total_faltas_justificadas || 0;
        const faltasInjustificadas = folha.dadosFolha?.total_faltas_injustificadas || 0;
        
        // ✅ Folgas trabalhadas da folha de ponto
        const folgasTrabalhadas = folha.folgas_trabalhadas || folha.resultado.folgas_trabalhadas_vt || 0;
        const vtDia = ctx.parametros?.[0]?.vale_transporte || 13.50;
        const vaDia = ctx.parametros?.[0]?.vale_alimentacao || 34.00;
        const vtFolgasTrabalhadas = folgasTrabalhadas * vtDia * 2; // VT = ida e volta
        const vaFolgasTrabalhadas = folgasTrabalhadas * vaDia;

        // Calcular totais de benefícios (IDÊNTICO À IMPRESSÃO INDIVIDUAL)
        const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
        const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

        const totalBeneficios = 
            (folha.resultado.vale_transporte_mes_anterior || 0) +
            (folha.resultado.vale_transporte_mes_atual || 0) +
            (folha.resultado.vale_alimentacao_mes_anterior || 0) +
            (folha.resultado.vale_alimentacao_mes_atual || 0) +
            ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
            ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
            vtFolgasTrabalhadas + // ✅ VT Folgas Trabalhadas
            vaFolgasTrabalhadas + // ✅ VA Folgas Trabalhadas
            (folha.resultado.cesta_basica || 0) +
            (folha.resultado.premio_permanencia || 0) +
            beneficiosEventos;

        const totalDescontosBeneficios = 
            (folha.resultado.desconto_vt_faltas || 0) +
            (folha.resultado.desconto_va_faltas || 0) +
            (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
            descontosEventos;

        const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

        // Pular funcionários sem benefícios
        if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
            return;
        }

        // Gerar eventos de benefícios (IDÊNTICO À IMPRESSÃO INDIVIDUAL)
        const eventosBeneficios = [];
        const mesAtual = ctx.meses[ctx.mes - 1];
        const mesProximo = ctx.meses[ctx.mes % 12];

        if (folha.resultado.vale_transporte_mes_anterior > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_transporte_mes_anterior, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_transporte_mes_atual > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesProximo})`, referencia: diasATrabalharVT.toString(), valor: folha.resultado.vale_transporte_mes_atual, tipo: 'beneficio' });
        }
        if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: 'Vale Transporte', referencia: '', valor: folha.resultado.vale_transporte, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesAtual})`, referencia: diasTrabalhados.toString(), valor: folha.resultado.vale_alimentacao_mes_anterior, tipo: 'beneficio' });
        }
        if (folha.resultado.vale_alimentacao_mes_atual > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesProximo})`, referencia: diasATrabalharVA.toString(), valor: folha.resultado.vale_alimentacao_mes_atual, tipo: 'beneficio' });
        }
        if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: 'Vale Alimentação', referencia: '', valor: folha.resultado.vale_alimentacao, tipo: 'beneficio' });
        }
        if (folha.resultado.cesta_basica > 0) {
            eventosBeneficios.push({ codigo: '0603', descricao: 'Cesta Básica', referencia: '1', valor: folha.resultado.cesta_basica, tipo: 'beneficio' });
        }
        if (folha.resultado.premio_permanencia > 0) {
            eventosBeneficios.push({ codigo: '0604', descricao: 'Prêmio Permanência', referencia: '', valor: folha.resultado.premio_permanencia, tipo: 'beneficio' });
        }
        // ✅ VT Folgas Trabalhadas
        if (folgasTrabalhadas > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: 'VT Folgas Trabalhadas', referencia: folgasTrabalhadas.toString(), valor: vtFolgasTrabalhadas, tipo: 'beneficio' });
        }
        // ✅ VA Folgas Trabalhadas
        if (folgasTrabalhadas > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: 'VA Folgas Trabalhadas', referencia: folgasTrabalhadas.toString(), valor: vaFolgasTrabalhadas, tipo: 'beneficio' });
        }
        if (folha.resultado.desconto_vt_faltas > 0) {
            const totalFaltas = faltasJustificadas + faltasInjustificadas;
            eventosBeneficios.push({ codigo: '5004', descricao: 'Desc. VT por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_vt_faltas, tipo: 'desconto' });
        }
        if (folha.resultado.desconto_va_faltas > 0) {
            const totalFaltas = faltasJustificadas + faltasInjustificadas;
            eventosBeneficios.push({ codigo: '5003', descricao: 'Desc. VA por Faltas', referencia: totalFaltas.toString(), valor: folha.resultado.desconto_va_faltas, tipo: 'desconto' });
        }
        if (folha.resultado.desc_rondas_nao_realizadas_benef > 0) {
            eventosBeneficios.push({ codigo: '5011', descricao: 'Desc. Rondas Não Realizadas', referencia: '', valor: folha.resultado.desc_rondas_nao_realizadas_benef, tipo: 'desconto' });
        }

        // Adicionar eventos excepcionais de benefícios (IDÊNTICO À IMPRESSÃO INDIVIDUAL)
        eventosAtuais.forEach(evento => {
            if (evento.tipo === 'beneficio') {
                const valorAbsoluto = Math.abs(evento.valor);
                if (valorAbsoluto > 0) {
                    const tipoEvento = evento.valor < 0 ? 'desconto' : 'beneficio';
                    let codigo = '0605';
                    if (evento.descricao === 'Reembolsos') codigo = '0605';
                    else if (evento.descricao === 'Desc. Rondas Não Realizadas') codigo = '5011';
                    
                    eventosBeneficios.push({ codigo, descricao: evento.descricao, referencia: '', valor: valorAbsoluto, tipo: tipoEvento });
                }
            }
        });

        // HTML IDÊNTICO À IMPRESSÃO INDIVIDUAL
        htmlContent += `
            <div class="${index < folhas.length - 1 ? 'page-break' : ''}">
                <table>
                    <colgroup>
                        <col style="width: 5%">
                        <col style="width: 5%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 11%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 7%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                        <col style="width: 9%">
                    </colgroup>
                    <tbody>
                        <tr style="height: 8mm;">
                            <td colspan="12" style="border: 1px solid black; border-bottom: 1px solid black; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="flex: 1;"></span>
                                    <span class="font-bold" style="font-size: 14px;">RECIBO DE BENEFÍCIOS</span>
                                    <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                                </div>
                            </td>
                        </tr>
                        ${isRegistrado ? `
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.nome_empresa || 'Empresa'}</span>
                                    <span>Via do Empregado</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${folha.empresa?.endereco || 'Endereço'}</span>
                                    <span>CNPJ: ${folha.empresa?.cnpj || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span><span class="font-bold">Empregado</span> ${folha.funcionario?.nome_completo || 'N/A'}</span>
                                    <span><span class="font-bold">Admissão:</span> ${folha.funcionario?.data_admissao ? new Date(folha.funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <span style="flex: 1;"><span class="font-bold">Cargo</span> ${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</span>
                                    <span>CPF: ${folha.funcionario?.cpf || 'N/A'}</span>
                                    <span>RG: ${folha.funcionario?.rg || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Código</td>
                            <td colspan="3" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descrição</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Referência</td>
                            <td class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Unid</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Benefícios</td>
                            <td colspan="2" class="text-center font-bold" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Descontos</td>
                        </tr>
                        ${eventosBeneficios.map((evento, idx) => `
                            <tr style="height: 6mm;">
                                <td colspan="2" class="text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.codigo}</td>
                                <td colspan="3" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.descricao}</td>
                                <td colspan="2" class="text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.referencia || ''}</td>
                                <td class="text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">R$</td>
                                <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'beneficio' ? formatarMoeda(evento.valor) : ''}</td>
                                <td colspan="2" class="text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : 'border-bottom: none;'} padding: 2px 4px; font-size: 9px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                            </tr>
                        `).join('')}
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px; font-size: 9px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                    <span>a</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                                </div>
                            </td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalBeneficios)}</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalDescontosBeneficios)}</td>
                        </tr>
                        <tr class="font-bold" style="height: 7mm;">
                            <td colspan="8" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;"></td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Total Líquido</td>
                            <td colspan="2" class="text-right" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">${formatarMoeda(totalLiquidoBeneficios)}</td>
                        </tr>
                        <tr style="height: 7mm;">
                            <td colspan="12" style="border: 1px solid black; padding: 2px 4px; font-size: 9px;">Declaro ter recebido os benefícios discriminados neste recibo.</td>
                    <tr style="height: 15mm;">
                        <td colspan="12" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 8px 12px 10px 12px; font-size: 9px; vertical-align: bottom;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 15px;">
                                <div style="text-align: left;">
                                    <span style="font-size: 9px;">Data: ______/______/____________</span>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 9px;">Assinatura: ____________________________________________________________</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, `Recibos Benefícios em Lote - ${folhas.length} funcionários`);
    ctx.setImprimindo(false);
    ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
    
    // Finalizar progresso
    ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: prev.total }));
    ctx.showToast(`Preparando impressão de ${folhas.length} recibos de benefícios...`, 'success');
};

// ----------------------------------------
// FIM: RECIBOS DE BENEFÍCIOS - EM LOTE
// ----------------------------------------

// ----------------------------------------
// RECIBOS DE PAGAMENTO - EM LOTE
// ----------------------------------------

// Função para imprimir recibos em lote
export async function imprimirRecibosEmLote(ctx: PrintContext, folhas: FolhaCalculadaCompleta[]) {
    if (folhas.length === 0) {
        ctx.showToast('Nenhuma folha para imprimir', 'error');
        return;
    }

    // Filtrar apenas funcionários com benefícios
    const folhasComBeneficios = folhas.filter(folha => {
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
        const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
        
        const totalBeneficios = 
            (folha.resultado.vale_transporte_mes_anterior || 0) +
            (folha.resultado.vale_transporte_mes_atual || 0) +
            (folha.resultado.vale_alimentacao_mes_anterior || 0) +
            (folha.resultado.vale_alimentacao_mes_atual || 0) +
            ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
            ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
            (folha.resultado.cesta_basica || 0) +
            (folha.resultado.premio_permanencia || 0) +
            beneficiosEventos;

        return totalBeneficios > 0;
    });

    if (folhasComBeneficios.length === 0) {
        ctx.showToast('Nenhum funcionário possui benefícios para gerar recibo de pagamento', 'info');
        return;
    }

    // Iniciar indicador de progresso
    ctx.setImprimindo(true);
    ctx.setProgressoImpressao({ atual: 0, total: folhasComBeneficios.length, tipo: 'Recibos' });
    await new Promise(resolve => setTimeout(resolve, 50));

    // Criar uma única janela para todos os recibos
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.setImprimindo(false);
        ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Funções auxiliares
    


    // Gerar HTML para todos os recibos
    let htmlContent = '';
    
    folhasComBeneficios.forEach((folha, index) => {
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
        
        // Calcular dados de benefícios (IGUAL À FUNÇÃO INDIVIDUAL)
        const diasTrabalhados = (() => {
            const dadosDias = folha.dadosFolha?.dados_dias;
            if (!dadosDias) return 0;
            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
        })();

        const diasATrabalharVA = folha.escalaMensalProximoMes?.diasVA || 0;
        const diasATrabalharVT = folha.escalaMensalProximoMes?.diasVT || 0;

        // Calcular totais de benefícios
        const beneficiosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
        const descontosEventos = eventosAtuais.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);

        const totalBeneficios = 
            (folha.resultado.vale_transporte_mes_anterior || 0) +
            (folha.resultado.vale_transporte_mes_atual || 0) +
            (folha.resultado.vale_alimentacao_mes_anterior || 0) +
            (folha.resultado.vale_alimentacao_mes_atual || 0) +
            ((!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual) ? (folha.resultado.vale_transporte || 0) : 0) +
            ((!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual) ? (folha.resultado.vale_alimentacao || 0) : 0) +
            (folha.resultado.cesta_basica || 0) +
            (folha.resultado.premio_permanencia || 0) +
            beneficiosEventos;

        const totalDescontosBeneficios = 
            (folha.resultado.desconto_vt_faltas || 0) +
            (folha.resultado.desconto_va_faltas || 0) +
            (folha.resultado.desc_rondas_nao_realizadas_benef || 0) +
            descontosEventos;

        const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;
        const salarioLiquido = folha.resultado.salario_liquido || 0;
        const totalGeralRecebido = salarioLiquido + totalLiquidoBeneficios;

        // Gerar lista de benefícios
        const beneficios = [];
        const mesAtual = ctx.meses[ctx.mes - 1];
        const mesProximo = ctx.meses[ctx.mes % 12];

        if (folha.resultado.vale_transporte_mes_anterior > 0) {
            beneficios.push({ quantidade: diasTrabalhados, descricao: `Vale Transporte (${mesAtual})`, valor: folha.resultado.vale_transporte_mes_anterior });
        }
        if (folha.resultado.vale_transporte_mes_atual > 0) {
            beneficios.push({ quantidade: diasATrabalharVT, descricao: `Vale Transporte (${mesProximo})`, valor: folha.resultado.vale_transporte_mes_atual });
        }
        if (!folha.resultado.vale_transporte_mes_anterior && !folha.resultado.vale_transporte_mes_atual && folha.resultado.vale_transporte > 0) {
            beneficios.push({ quantidade: '-', descricao: 'Vale Transporte', valor: folha.resultado.vale_transporte });
        }
        if (folha.resultado.vale_alimentacao_mes_anterior > 0) {
            beneficios.push({ quantidade: diasTrabalhados, descricao: `Vale Alimentação (${mesAtual})`, valor: folha.resultado.vale_alimentacao_mes_anterior });
        }
        if (folha.resultado.vale_alimentacao_mes_atual > 0) {
            beneficios.push({ quantidade: diasATrabalharVA, descricao: `Vale Alimentação (${mesProximo})`, valor: folha.resultado.vale_alimentacao_mes_atual });
        }
        if (!folha.resultado.vale_alimentacao_mes_anterior && !folha.resultado.vale_alimentacao_mes_atual && folha.resultado.vale_alimentacao > 0) {
            beneficios.push({ quantidade: '-', descricao: 'Vale Alimentação', valor: folha.resultado.vale_alimentacao });
        }
        if (folha.resultado.cesta_basica > 0) {
            beneficios.push({ quantidade: 1, descricao: 'Cesta Básica', valor: folha.resultado.cesta_basica });
        }
        if (folha.resultado.premio_permanencia > 0) {
            beneficios.push({ quantidade: 1, descricao: 'Prêmio Permanência', valor: folha.resultado.premio_permanencia });
        }

        // Adicionar eventos excepcionais de benefícios
        eventosAtuais.forEach(evento => {
            if (evento.tipo === 'beneficio' && evento.valor > 0) {
                beneficios.push({ quantidade: '-', descricao: evento.descricao, valor: evento.valor });
            }
        });

        // Gerar HTML do recibo (IDÊNTICO À FUNÇÃO INDIVIDUAL)
        htmlContent += `
            <div${index < folhasComBeneficios.length - 1 ? ' style="page-break-after: always;"' : ''}>
                <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin: 0 0 40px 0;">RECIBO DE PAGAMENTO</h1>
                
                <p>
                    Eu, <span class="font-bold">${folha.funcionario?.nome_completo}</span>, portador(a) do CPF nº 
                    <span class="font-bold">${formatarCPF(folha.funcionario?.cpf || '')}</span>, DECLARO, para os devidos fins, 
                    que recebi da empresa <span class="font-bold">${folha.empresa?.nome_empresa || '[NOME DA EMPRESA]'}</span>, inscrita no CNPJ 
                    sob o nº <span class="font-bold">${folha.empresa?.cnpj ? formatarCNPJ(folha.empresa.cnpj) : '[CNPJ]'}</span>, a quantia de R$ 
                    <span class="font-bold">${formatarValor(totalGeralRecebido)}</span>, conforme detalhamento abaixo:
                </p>
                
                <div style="margin-bottom: 20px;"></div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Qtde</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>-</td>
                            <td>Salário Líquido</td>
                            <td>R$ ${formatarValor(salarioLiquido)}</td>
                        </tr>
                        ${beneficios.map(beneficio => `
                            <tr>
                                <td>${beneficio.quantidade !== undefined && beneficio.quantidade !== '' ? beneficio.quantidade : '-'}</td>
                                <td>${beneficio.descricao}</td>
                                <td>R$ ${formatarValor(beneficio.valor)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td></td>
                            <td class="font-bold">Total depositado:</td>
                            <td class="font-bold">R$ ${formatarValor(totalGeralRecebido)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-bottom: 100px;"></div>
                
                <p>Campinas, ____ / ____ / _____________</p>
                
                <div style="margin-bottom: 150px;"></div>
                
                <div>
                    <div class="signature-line">
                        <p class="font-bold">${folha.funcionario?.nome_completo}</p>
                    </div>
                </div>
            </div>
        `;
    });

    // Montar documento completo (IDÊNTICO À FUNÇÃO INDIVIDUAL)
    const documentoCompleto = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Recibos de Pagamento - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            <style>
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 20mm 20mm 20mm 30mm !important; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    
                    html, body { 
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow-x: hidden !important;
                    }
                    
                    table {
                        width: 90% !important;
                        max-width: 90% !important;
                        table-layout: fixed !important;
                    }
                }
                
                html, body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.6;
                    width: 100%;
                    max-width: 90%;
                    margin: 0 auto;
                    box-sizing: border-box;
                }
                
                h1 { text-align: center; font-size: 18px; font-weight: bold; }
                p { text-align: justify; line-height: 1.8; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { padding: 8px; text-align: center; border-bottom: 1px solid #000; font-weight: bold; }
                td { padding: 8px; text-align: center; }
                .total-row td { border-top: 1px solid #000; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .signature-line { border-top: 1px solid #000; padding-top: 8px; min-width: 300px; display: inline-block; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, documentoCompleto, `Recibos Pagamento em Lote - ${folhasComBeneficios.length} funcionários`);
    ctx.setImprimindo(false);
    ctx.setProgressoImpressao({ atual: 0, total: 0, tipo: '' });

    ctx.setProgressoImpressao((prev: any) => ({ ...prev, atual: prev.total }));
    ctx.showToast(`Preparando impressão de ${folhasComBeneficios.length} recibos de pagamento...`, 'success');
};

// ----------------------------------------
// FIM: RECIBOS DE PAGAMENTO - EM LOTE
// ----------------------------------------

// ----------------------------------------
// RECIBOS DE BENEFÍCIOS ESPECÍFICOS - EM LOTE
// ----------------------------------------

// Função para imprimir recibos de benefícios em lote
export function imprimirRecibosBeneficiosEmLote(ctx: PrintContext, folhas: FolhaCalculadaCompleta[]) {
    if (folhas.length === 0) {
        ctx.showToast('Nenhuma folha para imprimir', 'error');
        return;
    }

    // Criar uma nova janela para impressão
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
        ctx.showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
        return;
    }

    // Estilos CSS inline para a impressão - otimizado para evitar cortes
    const styles = `
        <style>
            /* CSS otimizado para impressão - evita cortes */
            @media print {
                @page { 
                    size: A4 portrait; 
                    margin: 8mm 3mm 8mm 3mm; 
                }
                body { 
                    margin: 0; 
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .page-break {
                    page-break-after: always;
                    break-after: always;
                }
                .no-break {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 9px;
                max-width: 100%;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            table {
                width: 100%;
                max-width: 210mm; /* Largura total do papel A4 */
                border-collapse: collapse;
                margin: 0 auto;
                box-sizing: border-box;
                table-layout: fixed;
            }

            .border {
                border: 1px solid black;
            }
            .border-black {
                border-color: black;
            }
            .px-1 {
                padding-left: 4px;
                padding-right: 4px;
            }
            .text-xs {
                font-size: 10px;
            }
            .text-sm {
                font-size: 12px;
            }
            .text-base {
                font-size: 14px;
            }
            .font-bold {
                font-weight: bold;
            }
            .font-semibold {
                font-weight: 600;
            }
            .text-center {
                text-align: center;
            }
            .text-right {
                text-align: right;
            }
            .text-gray-500 {
                color: #6b7280;
            }
            .mb-2 {
                margin-bottom: 8px;
            }
            .mt-1 {
                margin-top: 4px;
            }
        </style>
    `;

    // Montar HTML com todos os recibos de benefícios
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Recibos de Benefícios - ${ctx.meses[ctx.mes - 1]}/${ctx.ano}</title>
            ${styles}
        </head>
        <body>
    `;

    folhas.forEach((folha, index) => {
        const r = folha.resultado;
        const funcionario = folha.funcionario;
        const empresa = folha.empresa || funcionario.empresa;
        const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;
        
        // ⭐ USAR EVENTOS DO ESTADO E FUNÇÃO DE CÁLCULO PARA CONSISTÊNCIA (com faixa VT)
        const eventosAtuais = ctx.eventosExcepcionais[folha.funcionario.id] || [];
        const totaisCalculados = calcularTotaisComEventos(folha.funcionario.id, r, eventosAtuais, undefined, funcionario);
        
        // Calcular totais usando a função de rastreamento
        const totalBeneficios = totaisCalculados.totalBeneficios + (r.desconto_vt_faltas || 0) + (r.desconto_va_faltas || 0); // Adicionar de volta os descontos pois a função já subtrai
        const totalDescontosBeneficios = (r.desconto_vt_faltas || 0) + (r.desconto_va_faltas || 0);
        const totalLiquidoBeneficios = totaisCalculados.totalBeneficios;
        
        if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
            return; // Pular se não há benefícios
        }
        
        // Montar lista de eventos de benefícios
        const eventosBeneficios = [];
        
        // Nomes dos meses
        const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesAtual = mesesNomes[ctx.mes - 1];
        const mesProximo = mesesNomes[ctx.mes % 12];
        
        // Vale Transporte - separado por mês
        if (r.vale_transporte_mes_anterior > 0) eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesAtual})`, valor: r.vale_transporte_mes_anterior, tipo: 'beneficio' });
        if (r.vale_transporte_mes_atual > 0) eventosBeneficios.push({ codigo: '0601', descricao: `Vale Transporte (${mesProximo})`, valor: r.vale_transporte_mes_atual, tipo: 'beneficio' });
        // Fallback para vale_transporte total (caso não tenha separação)
        if (!r.vale_transporte_mes_anterior && !r.vale_transporte_mes_atual && r.vale_transporte > 0) {
            eventosBeneficios.push({ codigo: '0601', descricao: 'Vale Transporte', valor: r.vale_transporte, tipo: 'beneficio' });
        }
        
        // Vale Alimentação - separado por mês
        if (r.vale_alimentacao_mes_anterior > 0) eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesAtual})`, valor: r.vale_alimentacao_mes_anterior, tipo: 'beneficio' });
        if (r.vale_alimentacao_mes_atual > 0) eventosBeneficios.push({ codigo: '0602', descricao: `Vale Alimentação (${mesProximo})`, valor: r.vale_alimentacao_mes_atual, tipo: 'beneficio' });
        // Fallback para vale_alimentacao total (caso não tenha separação)
        if (!r.vale_alimentacao_mes_anterior && !r.vale_alimentacao_mes_atual && r.vale_alimentacao > 0) {
            eventosBeneficios.push({ codigo: '0602', descricao: 'Vale Alimentação', valor: r.vale_alimentacao, tipo: 'beneficio' });
        }
        
        if (r.cesta_basica > 0) eventosBeneficios.push({ codigo: '0603', descricao: 'Cesta Básica', valor: r.cesta_basica, tipo: 'beneficio' });
        if (r.premio_permanencia > 0) eventosBeneficios.push({ codigo: '0604', descricao: 'Prêmio Permanência', valor: r.premio_permanencia, tipo: 'beneficio' });
        if (r.desconto_vt_faltas > 0) eventosBeneficios.push({ codigo: '5004', descricao: 'Desc. VT por Faltas', valor: r.desconto_vt_faltas, tipo: 'desconto' });
        if (r.desconto_va_faltas > 0) eventosBeneficios.push({ codigo: '5003', descricao: 'Desc. VA por Faltas', valor: r.desconto_va_faltas, tipo: 'desconto' });
        
        const dataAdmissao = funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
        const ultimoDiaMes = new Date(ctx.ano, ctx.mes, 0).getDate();
        
        htmlContent += `
            <div class="${index < folhas.length - 1 ? 'page-break' : ''}" style="padding: 8px; width: 210mm; min-height: 297mm; box-sizing: border-box;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <colgroup>
                        <col style="width: 5%" />
                        <col style="width: 5%" />
                        <col style="width: 11%" />
                        <col style="width: 11%" />
                        <col style="width: 11%" />
                        <col style="width: 7%" />
                        <col style="width: 7%" />
                        <col style="width: 7%" />
                        <col style="width: 9%" />
                        <col style="width: 9%" />
                        <col style="width: 9%" />
                        <col style="width: 9%" />
                    </colgroup>
                    <tbody>
                        <!-- Título -->
                        <tr style="height: 8mm;">
                            <td colspan="12" style="border: 1px solid black; padding: 4px 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="flex: 1;"></span>
                                    <span class="font-bold text-base">RECIBO DE BENEFÍCIOS</span>
                                    <span style="flex: 1; text-align: right;" class="font-bold">${ctx.mes.toString().padStart(2, '0')}/${ctx.ano}</span>
                                </div>
                            </td>
                        </tr>
                        ${isRegistrado ? `
                        <!-- Empresa -->
                        <tr style="height: 6mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>${empresa?.nome_empresa || 'Empresa'}</span>
                                    <span>Via do Empregado</span>
                                </div>
                            </td>
                        </tr>
                        <!-- Endereço e CNPJ -->
                        <tr style="height: 6mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>${empresa?.endereco || 'Endereço'}</span>
                                    <span>CNPJ: ${empresa?.cnpj || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                        <!-- Empregado -->
                        <tr style="height: 6mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 4px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span><span class="font-semibold">Empregado</span> ${funcionario?.nome_completo || 'N/A'}</span>
                                    <span><span class="font-semibold">Admissão:</span> ${dataAdmissao}</span>
                                </div>
                            </td>
                        </tr>
                        <!-- Cargo e CPF/RG -->
                        <tr style="height: 6mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
                                <div style="display: flex; justify-content: space-between; gap: 20px;">
                                    <span style="flex: 1;"><span class="font-semibold">Cargo</span> ${funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                                    <span>CPF: ${funcionario?.cpf || 'N/A'}</span>
                                    <span>RG: ${funcionario?.rg || 'N/A'}</span>
                                </div>
                            </td>
                        </tr>
                        <!-- Cabeçalho -->
                        <tr style="height: 6mm;">
                            <td colspan="2" class="border border-black px-1 text-xs font-bold text-center">Código</td>
                            <td colspan="3" class="border border-black px-1 text-xs font-bold text-center">Descrição</td>
                            <td colspan="2" class="border border-black px-1 text-xs font-bold text-center">Referência</td>
                            <td class="border border-black px-1 text-xs font-bold text-center">Unid</td>
                            <td colspan="2" class="border border-black px-1 text-xs font-bold text-center">Benefícios</td>
                            <td colspan="2" class="border border-black px-1 text-xs font-bold text-center">Descontos</td>
                        </tr>
                        <!-- Eventos -->
                        ${eventosBeneficios.map((evento, idx) => `
                        <tr style="height: 6mm;">
                            <td colspan="2" class="text-xs text-center" style="border-left: 1px solid black; border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">${evento.codigo}</td>
                            <td colspan="3" class="text-xs" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">${evento.descricao}</td>
                            <td colspan="2" class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;"></td>
                            <td class="text-xs text-center" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">R$</td>
                            <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">${evento.tipo === 'beneficio' ? formatarMoeda(evento.valor) : ''}</td>
                            <td colspan="2" class="text-xs text-right" style="border-right: 1px solid black; ${idx === eventosBeneficios.length - 1 ? 'border-bottom: 1px solid black;' : ''} padding: 2px 4px;">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
                        </tr>
                        `).join('')}
                        <!-- Período e Totais -->
                        <tr style="height: 7mm;" class="font-bold">
                            <td colspan="8" class="text-xs" style="border-left: 1px solid black; border-top: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>Referente ao(s) dia(s) trabalhados no período de</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).inicio}</span>
                                    <span>a</span>
                                    <span>${obterPeriodoFolhaPonto(folha.dadosFolha, ctx.mes, ctx.ano).fim}</span>
                                </div>
                            </td>
                            <td colspan="2" class="border border-black px-1 text-xs text-right">${formatarMoeda(totalBeneficios)}</td>
                            <td colspan="2" class="border border-black px-1 text-xs text-right">${formatarMoeda(totalDescontosBeneficios)}</td>
                        </tr>
                        <!-- Total Líquido -->
                        <tr style="height: 7mm;" class="font-bold">
                            <td colspan="8" class="border border-black px-1 text-xs"></td>
                            <td colspan="2" class="border border-black px-1 text-xs text-right">Total Líquido</td>
                            <td colspan="2" class="border border-black px-1 text-xs text-right">${formatarMoeda(totalLiquidoBeneficios)}</td>
                        </tr>
                        <!-- Espaço vazio -->
                        <tr style="height: 7mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 2px 4px;"></td>
                        </tr>
                        <!-- Declaração -->
                        <tr style="height: 7mm;">
                            <td colspan="12" class="border border-black px-1 text-xs">Declaro ter recebido os benefícios discriminados neste recibo.</td>
                        </tr>
                        <!-- Data e Assinatura -->
                        <tr style="height: 15mm;">
                            <td colspan="12" class="text-xs" style="border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; padding: 8px 12px; vertical-align: bottom;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 15px;">
                                    <div style="text-align: left;">
                                        <span style="font-size: 9px;">Data: ______/______/____________</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="font-size: 9px;">Assinatura: _________________________________________________________</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    escreverEExibirJanela(printWindow, htmlContent, 'Recibos Benefícios Específicos');
};

// ----------------------------------------
// FIM: RECIBOS DE BENEFÍCIOS ESPECÍFICOS - EM LOTE
// ----------------------------------------

// ========================================
// FIM: CÓDIGO DE IMPRESSÃO EM LOTE
// ========================================
