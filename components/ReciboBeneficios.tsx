import React from 'react';
import { formatarMoeda } from '../utils/codigosContabeisHolerite';
import { normalizarDescricao } from '../utils/eventosExcepcionaisValidator';
import { obterPeriodoFolhaPonto } from '../utils/periodoFolhaPonto';

interface ReciboBeneficiosProps {
  funcionario: any;
  empresa: any;
  resultado: any;
  mes: number;
  ano: number;
  eventosExcepcionais?: any[];
  folhaPonto?: any;
  diasTrabalhados?: number;
  diasATrabalharVA?: number;
  diasATrabalharVT?: number;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
  // Props para retrocompatibilidade (serão ignoradas se resultado já tiver os valores)
  folgasTrabalhadasVT?: number;
  folgasTrabalhadasVA?: number;
  vtDia?: number;
  vaDia?: number;
}

const ReciboBeneficios: React.FC<ReciboBeneficiosProps> = ({
  funcionario,
  empresa,
  resultado,
  mes,
  ano,
  eventosExcepcionais,
  folhaPonto,
  diasTrabalhados = 0,
  diasATrabalharVA = 0,
  diasATrabalharVT = 0,
  faltasJustificadas = 0,
  faltasInjustificadas = 0,
  folgasTrabalhadasVT = 0,
  folgasTrabalhadasVA = 0,
  vtDia = 13.50,
  vaDia = 34.00
}) => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // ⭐ PRIORIZAR VALORES DO BANCO (resultado) sobre props passadas
  const diasTrabalhadosRef = resultado.dias_vt_mes_anterior ?? resultado.dias_va_mes_anterior ?? diasTrabalhados ?? 0;
  const diasATrabalharVARef = resultado.dias_va_mes_atual ?? diasATrabalharVA ?? 0;
  const diasATrabalharVTRef = resultado.dias_vt_mes_atual ?? diasATrabalharVT ?? 0;

  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;

  // Helper: detecta se um evento de tipo 'beneficio' é, na verdade, um desconto
  // (identificado pela descrição começando com "Desc" ou por valor negativo)
  const isEventoDescontoBeneficio = (e: any): boolean => {
    if (!e || e.tipo !== 'beneficio') return false;
    const desc = normalizarDescricao(e.descricao || '').toLowerCase();
    return desc.startsWith('desc') || Number(e.valor) < 0;
  };

  // Calcular eventos excepcionais de benefícios (proventos = benefícios reais)
  const beneficiosEventos = (eventosExcepcionais || [])
    .filter(e => {
      if (e.tipo !== 'beneficio') return false;
      if (isEventoDescontoBeneficio(e)) return false;
      return Number(e.valor) > 0;
    })
    .reduce((sum, e) => sum + Number(e.valor), 0);

  const descontosEventos = (eventosExcepcionais || [])
    .filter(e => {
      if (!isEventoDescontoBeneficio(e)) return false;
      // Evitar duplicação: se já existe no campo específico, não incluir
      const descricaoNormalizada = normalizarDescricao(e.descricao);
      if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios' && resultado.desc_ajuste_beneficios > 0) {
        return false;
      }
      return true;
    })
    .reduce((sum, e) => sum + Math.abs(Number(e.valor)), 0);

  // ⭐ USAR VALORES DIRETAMENTE DO BANCO (prioridade) ou calcular como fallback
  const qtdFolgasTrabalhadasVT = resultado.folgas_trabalhadas_vt ?? folgasTrabalhadasVT ?? 0;
  const qtdFolgasTrabalhadasVA = resultado.folgas_trabalhadas_va ?? folgasTrabalhadasVA ?? 0;
  
  // Valores monetários: priorizar banco quando > 0, fallback para cálculo
  // CORREÇÃO: Usar fallback se valor do banco for 0 (não apenas undefined/null)
  const vtFolgasTrabalhadas = (resultado.valor_vt_folgas_trabalhadas && resultado.valor_vt_folgas_trabalhadas > 0) 
    ? resultado.valor_vt_folgas_trabalhadas 
    : (qtdFolgasTrabalhadasVT * vtDia * 2); // VT = ida + volta
  const vaFolgasTrabalhadas = (resultado.valor_va_folgas_trabalhadas && resultado.valor_va_folgas_trabalhadas > 0) 
    ? resultado.valor_va_folgas_trabalhadas 
    : (qtdFolgasTrabalhadasVA * vaDia);

  // Calcular totais de benefícios (usando valores separados por mês quando disponíveis)
  const totalBeneficios = 
    (resultado.vale_transporte_mes_anterior || 0) +
    (resultado.vale_transporte_mes_atual || 0) +
    (resultado.vale_alimentacao_mes_anterior || 0) +
    (resultado.vale_alimentacao_mes_atual || 0) +
    // Fallback para valores totais (caso não tenha separação)
    ((!resultado.vale_transporte_mes_anterior && !resultado.vale_transporte_mes_atual) ? (resultado.vale_transporte || 0) : 0) +
    ((!resultado.vale_alimentacao_mes_anterior && !resultado.vale_alimentacao_mes_atual) ? (resultado.vale_alimentacao || 0) : 0) +
    // VT/VA por folgas trabalhadas (valores do banco)
    vtFolgasTrabalhadas +
    vaFolgasTrabalhadas +
    (resultado.cesta_basica || 0) +
    (resultado.premio_permanencia || 0) +
    // ⭐ FT manual (valor diário fixo da folga trabalhada)
    (resultado.folga_trabalhada || 0) +
    beneficiosEventos;

  const totalDescontosBeneficios = 
    (resultado.desconto_vt_faltas || 0) +
    (resultado.desconto_va_faltas || 0) +
    (resultado.desc_rondas_nao_realizadas_benef || 0) +
    (resultado.desc_ajuste_beneficios || 0) + // ⭐ ADICIONADO: Desconto de ajuste dos benefícios
    descontosEventos;

  const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;

  // Se não há benefícios, não renderizar
  if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
    return null;
  }

  return (
    <div className="bg-white overflow-x-auto" id="recibo-beneficios-print" style={{ width: '100%', minHeight: 'auto', fontSize: '8px', padding: '0', boxSizing: 'border-box' }}>
      {/* GRID 10 COLUNAS x 36 LINHAS - CONFIGURAÇÕES IDÊNTICAS À IMPRESSÃO EM LOTE */}
      <table className="border-collapse min-w-[600px] sm:min-w-full" style={{ tableLayout: 'fixed', width: '90%', maxWidth: '90%', margin: '2mm auto', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '5%' }} /> {/* Col 1: Código */}
          <col style={{ width: '5%' }} /> {/* Col 2: Código parte 2 */}
          <col style={{ width: '11%' }} /> {/* Col 3: Descrição parte 1 */}
          <col style={{ width: '11%' }} /> {/* Col 4: Descrição parte 2 */}
          <col style={{ width: '11%' }} /> {/* Col 5: Descrição parte 3 */}
          <col style={{ width: '7%' }} />  {/* Col 6: Referência parte 1 */}
          <col style={{ width: '7%' }} />  {/* Col 7: Referência parte 2 */}
          <col style={{ width: '7%' }} />  {/* Col 8: Unidade */}
          <col style={{ width: '9%' }} /> {/* Col 9: Benefícios parte 1 */}
          <col style={{ width: '9%' }} /> {/* Col 10: Benefícios parte 2 */}
          <col style={{ width: '9%' }} /> {/* Col 11: Descontos parte 1 */}
          <col style={{ width: '9%' }} /> {/* Col 12: Descontos parte 2 */}
        </colgroup>

        <tbody>
          {/* LINHA 1: Título */}
          <tr style={{ height: '8mm' }}>
            <td colSpan={12} style={{ border: '1px solid black', borderBottom: '1px solid black', padding: '4px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ flex: 1 }}></span>
                <span className="font-bold text-base">RECIBO DE BENEFÍCIOS</span>
                <span style={{ flex: 1, textAlign: 'right', fontSize: '12px' }} className="font-bold">{mes.toString().padStart(2, '0')}/{ano}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 2: Empresa (apenas para funcionários registrados) */}
          {isRegistrado && (
            <tr style={{ height: '6mm' }}>
              <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{empresa?.nome_empresa || 'Empresa'}</span>
                  <span>Via do Empregado</span>
                </div>
              </td>
            </tr>
          )}

          {/* LINHA 3: Endereço e CNPJ (apenas para funcionários registrados) */}
          {isRegistrado && (
            <tr style={{ height: '6mm' }}>
              <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '2px 4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{empresa?.endereco || 'Endereço'}</span>
                  <span>CNPJ: {empresa?.cnpj || 'N/A'}</span>
                </div>
              </td>
            </tr>
          )}

          {/* LINHA 4: Empregado e Admissão */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span className="font-semibold">Empregado</span> {funcionario?.nome_completo || 'N/A'}</span>
                <span><span className="font-semibold">Admissão:</span> {funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 5: Cargo e CPF/RG */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} className="text-xs" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <span style={{ flex: 1 }}><span className="font-semibold">Cargo</span> {funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: {funcionario?.cpf || 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 6: Cabeçalho da Tabela */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Código</td>
            <td colSpan={3} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descrição</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Referência</td>
            <td className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Unid</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Benefícios</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descontos</td>
          </tr>

          {/* LINHAS 7-31: Eventos de Benefícios (sem bordas horizontais internas, mantendo verticais) */}
          {(() => {
            const eventosBeneficios = [];
            
            // Nomes dos meses
            const mesAtual = meses[mes - 1];
            const mesProximo = meses[mes % 12];
            
            // Vale Transporte - separado por mês
            if (resultado.vale_transporte_mes_anterior > 0) {
              eventosBeneficios.push({ 
                codigo: '0601', 
                descricao: `Vale Transporte (${mesAtual})`, 
                referencia: diasTrabalhadosRef.toString(),
                valor: resultado.vale_transporte_mes_anterior, 
                tipo: 'beneficio' 
              });
            }
            if (resultado.vale_transporte_mes_atual > 0) {
              eventosBeneficios.push({ 
                codigo: '0601', 
                descricao: `Vale Transporte (${mesProximo})`, 
                referencia: diasATrabalharVTRef.toString(),
                valor: resultado.vale_transporte_mes_atual, 
                tipo: 'beneficio' 
              });
            }
            // Fallback para vale_transporte total (caso não tenha separação)
            if (!resultado.vale_transporte_mes_anterior && !resultado.vale_transporte_mes_atual && resultado.vale_transporte > 0) {
              eventosBeneficios.push({ 
                codigo: '0601', 
                descricao: 'Vale Transporte', 
                referencia: '',
                valor: resultado.vale_transporte, 
                tipo: 'beneficio' 
              });
            }
            
            // Vale Alimentação - separado por mês
            if (resultado.vale_alimentacao_mes_anterior > 0) {
              eventosBeneficios.push({ 
                codigo: '0602', 
                descricao: `Vale Alimentação (${mesAtual})`, 
                referencia: diasTrabalhadosRef.toString(),
                valor: resultado.vale_alimentacao_mes_anterior, 
                tipo: 'beneficio' 
              });
            }
            if (resultado.vale_alimentacao_mes_atual > 0) {
              eventosBeneficios.push({ 
                codigo: '0602', 
                descricao: `Vale Alimentação (${mesProximo})`, 
                referencia: diasATrabalharVARef.toString(),
                valor: resultado.vale_alimentacao_mes_atual, 
                tipo: 'beneficio' 
              });
            }
            // Fallback para vale_alimentacao total (caso não tenha separação)
            if (!resultado.vale_alimentacao_mes_anterior && !resultado.vale_alimentacao_mes_atual && resultado.vale_alimentacao > 0) {
              eventosBeneficios.push({ 
                codigo: '0602', 
                descricao: 'Vale Alimentação', 
                referencia: '',
                valor: resultado.vale_alimentacao, 
                tipo: 'beneficio' 
              });
            }
            
            // VT por Folgas Trabalhadas (usar valores do banco)
            if (qtdFolgasTrabalhadasVT > 0) {
              eventosBeneficios.push({ 
                codigo: '0601', 
                descricao: 'VT Folgas Trabalhadas', 
                referencia: qtdFolgasTrabalhadasVT.toString(),
                valor: vtFolgasTrabalhadas, 
                tipo: 'beneficio' 
              });
            }
            
            // VA por Folgas Trabalhadas (usar valores do banco)
            if (qtdFolgasTrabalhadasVA > 0) {
              eventosBeneficios.push({ 
                codigo: '0602', 
                descricao: 'VA Folgas Trabalhadas', 
                referencia: qtdFolgasTrabalhadasVA.toString(),
                valor: vaFolgasTrabalhadas, 
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
              // ⭐ Para Prêmio Permanência, usar "1" como referência (1 mês)
              eventosBeneficios.push({ 
                codigo: '0604', 
                descricao: 'Prêmio Permanência', 
                referencia: '1',
                valor: resultado.premio_permanencia, 
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
                codigo: '5011', 
                descricao: 'Desc. Rondas Não Realizadas', 
                referencia: '',
                valor: resultado.desc_rondas_nao_realizadas_benef, 
                tipo: 'desconto' 
              });
            }
            
            // Adicionar desc_ajuste_beneficios do campo específico
            if (resultado.desc_ajuste_beneficios > 0) {
              eventosBeneficios.push({ 
                codigo: 'B002', 
                descricao: 'Desc. Ajuste dos Benefícios', 
                referencia: '',
                valor: resultado.desc_ajuste_beneficios, 
                tipo: 'desconto' 
              });
            }
            
            // Adicionar eventos excepcionais de benefícios
            if (eventosExcepcionais && eventosExcepcionais.length > 0) {
              eventosExcepcionais.forEach(evento => {
                if (evento.tipo === 'beneficio') {
                  const valorAbsoluto = Math.abs(evento.valor);
                  if (valorAbsoluto > 0) {
                    // ⭐ Normalizar descrição antes de exibir
                    const descricaoNormalizada = normalizarDescricao(evento.descricao);
                    
                    // ⚠️ EVITAR DUPLICAÇÃO: Se já foi adicionado do campo específico, pular
                    if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios' && resultado.desc_ajuste_beneficios > 0) {
                      return; // Já foi adicionado acima
                    }
                    
                    // ⚠️ Detecta descontos entre eventos de tipo 'beneficio':
                    // por descrição iniciando com "Desc" ou por valor negativo
                    let tipoEvento = 'beneficio';
                    if (isEventoDescontoBeneficio(evento)) {
                      tipoEvento = 'desconto';
                    }
                    
                    // Mapear código específico
                    let codigo = '0605';
                    if (descricaoNormalizada === 'Reembolsos' || descricaoNormalizada === 'Reembolsos (Uber)') codigo = '0605';
                    else if (descricaoNormalizada === 'Desc. Rondas Não Realizadas') codigo = '5011';
                    else if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') codigo = 'B002';
                    
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
            
            return eventosBeneficios.map((evento, idx) => (
              <tr key={`beneficio-${evento.codigo}-${idx}`} style={{ height: '6mm' }}>
                <td colSpan={2} className="text-xs text-center" style={{ 
                  borderLeft: '1px solid black', 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  {evento.codigo}
                </td>
                <td colSpan={3} className="text-xs" style={{ 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  {evento.descricao}
                </td>
                <td colSpan={2} className="text-xs text-center" style={{ 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  {evento.referencia || ''}
                </td>
                <td className="text-xs text-center" style={{ 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  R$
                </td>
                <td colSpan={2} className="text-xs text-right" style={{ 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  {evento.tipo === 'beneficio' ? formatarMoeda(evento.valor) : ''}
                </td>
                <td colSpan={2} className="text-xs text-right" style={{ 
                  borderRight: '1px solid black',
                  borderBottom: idx === eventosBeneficios.length - 1 ? '1px solid black' : 'none',
                  padding: '2px 4px' 
                }}>
                  {evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}
                </td>
              </tr>
            ));
          })()}

          {/* LINHA 32: Período e Totais */}
          <tr style={{ height: '7mm' }} className="font-bold">
            <td colSpan={8} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Referente ao(s) dia(s) trabalhados no período de</span>
                {(() => { const p = obterPeriodoFolhaPonto(folhaPonto, mes, ano); return (<>
                  <span>{p.inicio}</span>
                  <span>a</span>
                  <span>{p.fim}</span>
                </>); })()}
              </div>
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalBeneficios)}
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalDescontosBeneficios)}
            </td>
          </tr>

          {/* LINHA: Folgas Trabalhadas (apenas se houver) */}
          {(folgasTrabalhadasVT > 0 || folgasTrabalhadasVA > 0) && (
            <tr style={{ height: '6mm' }}>
              <td colSpan={12} className="text-xs" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '2px 4px', backgroundColor: '#f0f9ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="font-semibold" style={{ color: '#0369a1' }}>📅 Folgas trabalhadas contabilizadas:</span>
                  {folgasTrabalhadasVT > 0 && (
                    <span>VT: {folgasTrabalhadasVT} dia(s)</span>
                  )}
                  {folgasTrabalhadasVA > 0 && (
                    <span>VA: {folgasTrabalhadasVA} dia(s)</span>
                  )}
                </div>
              </td>
            </tr>
          )}

          {/* LINHA 33: Total Líquido */}
          <tr style={{ height: '7mm' }} className="font-bold">
            <td colSpan={8} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {/* Vazio */}
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Total Líquido
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalLiquidoBeneficios)}
            </td>
          </tr>



          {/* LINHA 35: Declaração */}
          <tr style={{ height: '7mm' }}>
            <td colSpan={12} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Declaro ter recebido os benefícios discriminados neste recibo.
            </td>
          </tr>

          {/* LINHA 36: Data e Assinatura */}
          <tr style={{ height: '15mm' }}>
            <td colSpan={5} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px', verticalAlign: 'bottom' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="text-xs text-gray-500 mt-1">Data: ________ /________ /________________</div>
              </div>
            </td>
            <td colSpan={7} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px', verticalAlign: 'bottom' }}>
              <div style={{ textAlign: 'left' }}>
                <div className="text-xs text-gray-500 mt-1">Assinatura do Funcionário _______________________________________________________</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReciboBeneficios;
