import React from 'react';
import { mapearFolhaParaHolerite, formatarMoeda } from '../utils/codigosContabeisHolerite';
import { obterPeriodoFolhaPonto } from '../utils/periodoFolhaPonto';

interface HoleriteProps {
  funcionario: any;
  empresa: any;
  resultado: any;
  mes: number;
  ano: number;
  eventosExcepcionais?: any[];
  folhaPonto?: any; // Adicionar folha de ponto
  parametros?: any; // Adicionar parâmetros para cálculo das porcentagens
}

const Holerite: React.FC<HoleriteProps> = ({
  funcionario,
  empresa,
  resultado,
  mes,
  ano,
  eventosExcepcionais,
  folhaPonto,
  parametros
}) => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;
  

  // Mapear dados para lançamentos (SEM benefícios)
  const lancamentos = mapearFolhaParaHolerite(resultado, eventosExcepcionais, folhaPonto, parametros);
  
  // Calcular totais a partir dos lançamentos já mapeados
  // NOTA: Os eventos excepcionais já estão incluídos em lancamentos via mapearFolhaParaHolerite
  // Portanto, calculamos os totais diretamente dos lançamentos para evitar duplicação
  const totalProventos = lancamentos.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + l.valor, 0);
  const totalDescontos = lancamentos.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + l.valor, 0);
  // Salário Líquido = Proventos - Descontos (SEM benefícios)
  const salarioLiquido = totalProventos - totalDescontos;

  // Filtrar apenas eventos com dados (sem linhas em branco) - aceita valores negativos
  const eventosComDados = lancamentos.filter(lanc => lanc && lanc.valor !== 0);

  return (
    <div className="bg-white overflow-x-auto" id="holerite-print" style={{ width: '100%', minHeight: 'auto', fontSize: '8px', padding: '0', boxSizing: 'border-box', marginTop: '10px' }}>
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
          <col style={{ width: '9%' }} /> {/* Col 9: Proventos parte 1 */}
          <col style={{ width: '9%' }} /> {/* Col 10: Proventos parte 2 */}
          <col style={{ width: '9%' }} /> {/* Col 11: Descontos parte 1 */}
          <col style={{ width: '9%' }} /> {/* Col 12: Descontos parte 2 */}
        </colgroup>

        <tbody>
          {/* LINHA 1: Título - SEM colunas visíveis */}
          <tr style={{ height: '8mm' }}>
            <td colSpan={12} style={{ border: '1px solid black', borderBottom: '1px solid black', padding: '4px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ flex: 1 }}></span>
                <span className="font-bold text-base">RECIBO DE PAGAMENTO DE SALÁRIO</span>
                <span style={{ flex: 1, textAlign: 'right', fontSize: '12px'}} className="font-bold">{mes.toString().padStart(2, '0')}/{ano}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 2: Empresa - SEM borda inferior (apenas para funcionários registrados) */}
          {isRegistrado && (
            <tr style={{ height: '6mm' }}>
              <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '12px'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{empresa?.nome_empresa || 'Empresa'}</span>
                  <span>Via do Empregado</span>
                </div>
              </td>
            </tr>
          )}

          {/* LINHA 3: Endereço e CNPJ - SEM colunas visíveis (apenas para funcionários registrados) */}
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

          {/* LINHA 4: Empregado e Admissão - SEM borda inferior */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span className="font-semibold">Empregado</span> {funcionario?.nome_completo || 'N/A'}</span>
                <span><span className="font-semibold">Admissão:</span> {funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 5: Cargo e CPF/RG - SEM bordas internas */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} className="text-xs" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <span style={{ flex: 1 }}><span className="font-semibold">Cargo</span> {funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: {funcionario?.cpf || 'N/A'}</span>
                <span>RG: {funcionario?.rg || 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 6: Cabeçalho da Tabela */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Código</td>
            <td colSpan={3} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descrição</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Referência</td>
            <td className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Unid</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Proventos</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descontos</td>
          </tr>

          {/* LINHAS 7-31: Eventos (sem bordas horizontais internas, mantendo verticais) */}
          {eventosComDados.map((evento, idx) => (
            <tr key={`evento-${evento.codigo}-${idx}`} style={{ height: '6mm' }}>
              <td colSpan={2} className="text-xs text-center" style={{ 
                borderLeft: '1px solid black', 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.codigo}
              </td>
              <td colSpan={3} className="text-xs" style={{ 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.descricao}
              </td>
              <td colSpan={2} className="text-xs text-center" style={{ 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.referencia || ''}
              </td>
              <td className="text-xs text-center" style={{ 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.unidade || ''}
              </td>
              <td colSpan={2} className="text-xs text-right" style={{ 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}
              </td>
              <td colSpan={2} className="text-xs text-right" style={{ 
                borderRight: '1px solid black',
                borderBottom: idx === eventosComDados.length - 1 ? '1px solid black' : 'none',
                padding: '2px 4px' 
              }}>
                {evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}
              </td>
            </tr>
          ))}

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
              {formatarMoeda(totalProventos)}
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalDescontos)}
            </td>
          </tr>

          {/* LINHA 33: Total Líquido */}
          <tr style={{ height: '7mm' }} className="font-bold">
            <td colSpan={8} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {/* Vazio */}
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Total Líquido
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(salarioLiquido)}
            </td>
          </tr>

          {/* LINHA 34: Bases de Cálculo */}
          <tr style={{ height: '7mm' }}>
            <td colSpan={12} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: '120px' }}>Salário Base: {formatarMoeda(resultado.salario_base)}</span>
                <span style={{ flex: 1, minWidth: '120px' }}>Base INSS: {formatarMoeda(resultado.base_inss)}</span>
                <span style={{ flex: 1, minWidth: '120px' }}>Base FGTS: {formatarMoeda(resultado.base_fgts)}</span>
                <span style={{ flex: 1, minWidth: '120px' }}>FGTS do mês: {formatarMoeda(resultado.fgts)}</span>
                <span style={{ flex: 1, minWidth: '120px' }}>Base IRRF: {formatarMoeda(resultado.base_irrf)}</span>
              </div>
            </td>
          </tr>

          {/* LINHA 35: Declaração */}
          <tr style={{ height: '7mm' }}>
            <td colSpan={12} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Declaro ter recebido a importância líquida discriminada neste recibo.
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

export default Holerite;
