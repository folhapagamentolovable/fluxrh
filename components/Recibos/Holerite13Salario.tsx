import React from 'react';
import { mapearFolhaParaHolerite13Salario, formatarMoeda } from './codigosContabeis13Salario';

interface Holerite13SalarioProps {
  funcionario: any;
  empresa: any;
  resultado: any;
  mes: number;
  ano: number;
  eventosExcepcionais?: any[];
  tipoRecibo?: '1a_parcela' | '2a_parcela' | 'integral';
}

const Holerite13Salario: React.FC<Holerite13SalarioProps> = ({
  funcionario,
  empresa,
  resultado,
  mes,
  ano,
  eventosExcepcionais,
  tipoRecibo = 'integral'
}) => {
  // Verificar se funcionário é registrado
  const isRegistrado = funcionario?.registrado === true || funcionario?.funcionario_registrado === true;

  // Mapear dados para lançamentos (APENAS itens de 13°)
  const lancamentos = mapearFolhaParaHolerite13Salario(resultado, eventosExcepcionais);
  
  // Calcular totais
  const totalProventos = lancamentos.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + l.valor, 0);
  const totalDescontos = lancamentos.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + l.valor, 0);
  const valorLiquido = totalProventos - totalDescontos;

  // Filtrar apenas eventos com dados
  const eventosComDados = lancamentos.filter(lanc => lanc && lanc.valor !== 0);

  // Título dinâmico baseado no tipo de recibo
  const getTitulo = () => {
    switch (tipoRecibo) {
      case '1a_parcela': return 'RECIBO DE PAGAMENTO - 13º SALÁRIO (1ª PARCELA)';
      case '2a_parcela': return 'RECIBO DE PAGAMENTO - 13º SALÁRIO (2ª PARCELA)';
      default: return 'RECIBO DE PAGAMENTO - 13º SALÁRIO';
    }
  };

  // Se não houver lançamentos, não exibir o recibo
  if (eventosComDados.length === 0) {
    return (
      <div className="bg-white p-4 text-center text-gray-500">
        Nenhum lançamento de 13º salário para este período.
      </div>
    );
  }

  return (
    <div className="bg-white overflow-x-auto" id="holerite-13-print" style={{ width: '100%', minHeight: 'auto', fontSize: '8px', padding: '0', boxSizing: 'border-box', marginTop: '10px' }}>
      <table className="border-collapse min-w-[600px] sm:min-w-full" style={{ tableLayout: 'fixed', width: '90%', maxWidth: '90%', margin: '2mm auto', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>

        <tbody>
          {/* Título */}
          <tr style={{ height: '8mm' }}>
            <td colSpan={12} style={{ border: '1px solid black', borderBottom: '1px solid black', padding: '4px 8px', backgroundColor: '#f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ flex: 1 }}></span>
                <span className="font-bold text-base">{getTitulo()}</span>
                <span style={{ flex: 1, textAlign: 'right', fontSize: '12px'}} className="font-bold">{mes.toString().padStart(2, '0')}/{ano}</span>
              </div>
            </td>
          </tr>

          {/* Empresa (apenas para funcionários registrados) */}
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

          {/* Endereço e CNPJ (apenas para funcionários registrados) */}
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

          {/* Empregado e Admissão */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span className="font-semibold">Empregado</span> {funcionario?.nome_completo || 'N/A'}</span>
                <span><span className="font-semibold">Admissão:</span> {funcionario?.data_admissao ? new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* Cargo e CPF/RG */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={12} className="text-xs" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <span style={{ flex: 1 }}><span className="font-semibold">Cargo</span> {funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}</span>
                <span>CPF: {funcionario?.cpf || 'N/A'}</span>
                <span>RG: {funcionario?.rg || 'N/A'}</span>
              </div>
            </td>
          </tr>

          {/* Cabeçalho da Tabela */}
          <tr style={{ height: '6mm' }}>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Código</td>
            <td colSpan={3} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descrição</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Referência</td>
            <td className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Unid</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Proventos</td>
            <td colSpan={2} className="text-xs font-bold text-center" style={{ border: '1px solid black', padding: '2px 4px' }}>Descontos</td>
          </tr>

          {/* Eventos */}
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

          {/* Totais */}
          <tr style={{ height: '7mm' }} className="font-bold">
            <td colSpan={8} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>13º Salário - Exercício {ano}</span>
              </div>
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalProventos)}
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(totalDescontos)}
            </td>
          </tr>

          {/* Total Líquido */}
          <tr style={{ height: '7mm' }} className="font-bold">
            <td colSpan={8} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Total Líquido
            </td>
            <td colSpan={2} className="text-xs text-right" style={{ border: '1px solid black', padding: '2px 4px' }}>
              {formatarMoeda(valorLiquido)}
            </td>
          </tr>

          {/* Declaração */}
          <tr style={{ height: '7mm' }}>
            <td colSpan={12} className="text-xs" style={{ border: '1px solid black', padding: '2px 4px' }}>
              Declaro ter recebido a importância líquida discriminada neste recibo.
            </td>
          </tr>

          {/* Data e Assinatura */}
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

export default Holerite13Salario;
