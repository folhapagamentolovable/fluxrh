import React, { useState } from 'react';
import Button from './ui/Button';
import Select from './ui/Select';
import { calcularFolhaPagamento } from '../utils/calcularFolhaPagamento';
import { salvarFolhaCalculada } from '../utils/salvarFolhaCalculada';
import { supabase } from '../lib/supabase';
import { getDadosDiasProximoMes } from '../utils/getDadosDiasProximoMes';
import { useFuncionariosAtivos } from '../hooks/useSupabase';
import { getSalarioCargoVigente } from '../hooks/useSalarioCargo';

interface GerarFolhaIndividualModalProps {
  funcionario?: any;
  mes: number;
  ano: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const GerarFolhaIndividualModal: React.FC<GerarFolhaIndividualModalProps> = ({
  funcionario: funcionarioProp,
  mes: mesProp,
  ano: anoProp,
  onClose,
  onSuccess
}) => {
  const { data: funcionarios } = useFuncionariosAtivos();
  const [funcionarioId, setFuncionarioId] = useState(funcionarioProp?.id || '');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  
  const funcionarioSelecionado = funcionarios.find(f => f.id === funcionarioId);

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleCalcular = async () => {
    if (!funcionarioSelecionado) {
      setErro('Selecione um funcionário');
      return;
    }

    // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
    if (funcionarioSelecionado.demitido === true) {
      setErro('Não é possível calcular folha de pagamento para funcionário demitido');
      return;
    }

    setLoading(true);
    setErro(null);
    setResultado(null);

    try {

      // Buscar dados necessários
      const [
        { data: folhaPonto },
        { data: parametros },
        escalaMensalProximoMes,
        { data: folhaPontoMesAnterior }
      ] = await Promise.all([
        // Folha de ponto do mês atual
        supabase
          .from('folhas_ponto')
          .select('*, funcionario:funcionarios(*,cargo:cargos(*))')
          .eq('funcionario_id', funcionarioSelecionado.id)
          .eq('mes', mesProp)
          .eq('ano', anoProp)
          .maybeSingle(),
        
        // Parâmetros de cálculo para o ano da folha
        supabase
          .from('parametros_calculo')
          .select('*')
          .eq('ativo', true)
          .eq('ano_vigencia', anoProp)
          .maybeSingle(),
        
        // ⭐ Folha de ponto do PRÓXIMO mês (com fallback para escala_mensal)
        // Necessário para calcular VT/VA antecipado do próximo mês
        getDadosDiasProximoMes(funcionarioSelecionado.id, mesProp, anoProp),
        
        // Folha de ponto do mês anterior
        supabase
          .from('folhas_ponto')
          .select('*')
          .eq('funcionario_id', funcionarioSelecionado.id)
          .eq('mes', mesProp === 1 ? 12 : mesProp - 1)
          .eq('ano', mesProp === 1 ? anoProp - 1 : anoProp)
          .maybeSingle()
      ]);


      if (!folhaPonto) {
        throw new Error(`Folha de ponto não encontrada para ${meses[mesProp - 1]}/${anoProp}`);
      }

      if (!parametros) {
        throw new Error('Parâmetros de cálculo não encontrados');
      }

      // Calcular folha
      // ⭐ USAR SALÁRIO VIGENTE DO CARGO NO HISTÓRICO (para a competência específica)
      const cargoId = folhaPonto.funcionario.cargo_id || folhaPonto.funcionario.cargo?.id;
      const salarioFallback = folhaPonto.funcionario.cargo?.salario_base || 0;
      const salarioBase = cargoId 
        ? await getSalarioCargoVigente(cargoId, anoProp, mesProp, salarioFallback)
        : salarioFallback;
      const resultadoCalculo = calcularFolhaPagamento(
        folhaPonto,
        folhaPonto.funcionario,
        parametros,
        salarioBase,
        220,
        folhaPontoMesAnterior || undefined,
        escalaMensalProximoMes || undefined,
        undefined,
        0, // descontoRondasNaoRealizadas
        0, // descontoAvariaUtilitario  
        0  // eventosExcepcionaisProventos (modal não tem eventos excepcionais)
      );

      setResultado(resultadoCalculo);

    } catch (error: any) {
      setErro(error.message || 'Erro ao calcular folha de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!resultado || !funcionarioSelecionado) return;

    setLoading(true);
    setErro(null);

    try {
      const response = await salvarFolhaCalculada(
        funcionarioSelecionado.id,
        mesProp,
        anoProp,
        resultado
      );

      if (!response.success) {
        throw new Error(response.error || 'Erro ao salvar folha');
      }

      alert('✅ Folha de pagamento salva com sucesso!');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      setErro(error.message || 'Erro ao salvar folha de pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            Gerar Folha de Pagamento Individual
          </h2>

          <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              Período: {meses[mesProp - 1]}/{anoProp}
            </p>
          </div>

          <div className="mb-6">
            <Select
              label="Selecione o Funcionário"
              id="funcionario-select"
              value={funcionarioId}
              onChange={(e) => {
                setFuncionarioId(e.target.value);
                setResultado(null);
                setErro(null);
              }}
              disabled={loading}
            >
              <option value="">-- Selecione um funcionário --</option>
              {funcionarios
                .filter(f => f.cargo_id) // Apenas funcionários com cargo
                .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))
                .map((func) => (
                  <option key={func.id} value={func.id}>
                    {func.nome_completo}
                  </option>
                ))}
            </Select>
          </div>

          {funcionarioSelecionado && (
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <p className="font-semibold">{funcionarioSelecionado.nome_completo}</p>
              <p className="text-sm text-gray-600">CPF: {funcionarioSelecionado.cpf}</p>
              <p className="text-sm text-gray-600">
                Cargo: {funcionarioSelecionado.cargo?.nome_cargo || 'N/A'}
              </p>
            </div>
          )}

          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {erro}
            </div>
          )}

          {resultado && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold mb-3 text-green-800">
                Resultado do Cálculo
              </h3>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* COLUNA 1: PROVENTOS (Salários e Horas) */}
                <div>
                  <p className="font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-300">💰 PROVENTOS</p>
                  <p>Salário Base: R$ {resultado.salario_base.toFixed(2)}</p>
                  {resultado.horas_extras_50 > 0 && <p>Horas Extras 50%: R$ {resultado.horas_extras_50.toFixed(2)}</p>}
                  {resultado.horas_extras_100 > 0 && <p>Horas Extras 100%: R$ {resultado.horas_extras_100.toFixed(2)}</p>}
                  {resultado.adicional_noturno > 0 && <p>Adicional Noturno: R$ {resultado.adicional_noturno.toFixed(2)}</p>}
                  {resultado.intrajornada_50 > 0 && <p>Intrajornada 50%: R$ {resultado.intrajornada_50.toFixed(2)}</p>}
                  {resultado.intrajornada_100 > 0 && <p>Intrajornada 100%: R$ {resultado.intrajornada_100.toFixed(2)}</p>}
                  {resultado.dsr_horas_extras > 0 && <p>DSR s/ H.Extras: R$ {resultado.dsr_horas_extras.toFixed(2)}</p>}
                  {resultado.dsr_adicional_noturno > 0 && <p>DSR s/ Ad.Noturno: R$ {resultado.dsr_adicional_noturno.toFixed(2)}</p>}
                  {resultado.adicional_insalubridade > 0 && <p>Insalubridade: R$ {resultado.adicional_insalubridade.toFixed(2)}</p>}
                  {resultado.adicional_acumulo_funcao > 0 && <p>Acúmulo Função: R$ {resultado.adicional_acumulo_funcao.toFixed(2)}</p>}
                  {resultado.salario_familia > 0 && <p>Salário Família: R$ {resultado.salario_familia.toFixed(2)}</p>}
                </div>

                {/* COLUNA 2: BENEFÍCIOS */}
                <div>
                  <p className="font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-300">🎁 BENEFÍCIOS</p>
                  {resultado.vale_transporte > 0 && <p>Vale Transporte: R$ {resultado.vale_transporte.toFixed(2)}</p>}
                  {resultado.vale_alimentacao > 0 && <p>Vale Alimentação: R$ {resultado.vale_alimentacao.toFixed(2)}</p>}
                  {resultado.cesta_basica > 0 && <p>Cesta Básica: R$ {resultado.cesta_basica.toFixed(2)}</p>}
                  {resultado.plr > 0 && <p>PLR: R$ {resultado.plr.toFixed(2)}</p>}
                  {resultado.premio_permanencia > 0 && <p>Prêmio Permanência: R$ {resultado.premio_permanencia.toFixed(2)}</p>}
                  {resultado.vale_transporte === 0 && resultado.vale_alimentacao === 0 && resultado.cesta_basica === 0 && resultado.plr === 0 && resultado.premio_permanencia === 0 && (
                    <p className="text-gray-400 italic">Nenhum benefício</p>
                  )}
                </div>

                {/* COLUNA 3: DESCONTOS */}
                <div>
                  <p className="font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-300">📉 DESCONTOS</p>
                  {resultado.desconto_inss > 0 && <p>INSS: R$ {resultado.desconto_inss.toFixed(2)}</p>}
                  {resultado.desconto_irrf > 0 && <p>IRRF: R$ {resultado.desconto_irrf.toFixed(2)}</p>}
                  {resultado.desconto_vt > 0 && <p>Desc. VT: R$ {resultado.desconto_vt.toFixed(2)}</p>}
                  {resultado.desconto_vt_faltas > 0 && <p>Desc. VT Faltas: R$ {resultado.desconto_vt_faltas.toFixed(2)}</p>}
                  {resultado.desconto_va_faltas > 0 && <p>Desc. VA Faltas: R$ {resultado.desconto_va_faltas.toFixed(2)}</p>}
                  {resultado.desconto_seguro_vida > 0 && <p>Seguro Vida: R$ {resultado.desconto_seguro_vida.toFixed(2)}</p>}
                  {resultado.desconto_convenio_odonto > 0 && <p>Convênio Odonto: R$ {resultado.desconto_convenio_odonto.toFixed(2)}</p>}
                  {resultado.desconto_contribuicao_assistencial > 0 && <p>Contrib. Assistencial: R$ {resultado.desconto_contribuicao_assistencial.toFixed(2)}</p>}
                  {resultado.desconto_atrasos > 0 && <p>Atrasos: R$ {resultado.desconto_atrasos.toFixed(2)}</p>}
                  {resultado.desconto_faltas > 0 && <p>Faltas: R$ {resultado.desconto_faltas.toFixed(2)}</p>}
                  {resultado.desconto_plr > 0 && <p>Desc. PLR: R$ {resultado.desconto_plr.toFixed(2)}</p>}
                  {resultado.desconto_adiantamento_quinzenal > 0 && <p>Adiant. Quinzenal: R$ {resultado.desconto_adiantamento_quinzenal.toFixed(2)}</p>}
                  {resultado.total_descontos === 0 && (
                    <p className="text-gray-400 italic">Nenhum desconto</p>
                  )}
                </div>
              </div>

              {/* TOTAIS E LÍQUIDO */}
              <div className="mt-4 pt-4 border-t border-green-300">
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="text-center">
                    <p className="font-semibold text-green-700">Total Proventos</p>
                    <p className="text-lg font-bold text-green-800">R$ {resultado.total_proventos.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-700">Total Benefícios</p>
                    <p className="text-lg font-bold text-blue-800">
                      R$ {(
                        resultado.vale_transporte + 
                        resultado.vale_alimentacao + 
                        resultado.cesta_basica + 
                        resultado.plr + 
                        resultado.premio_permanencia
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-red-700">Total Descontos</p>
                    <p className="text-lg font-bold text-red-800">R$ {resultado.total_descontos.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="text-center pt-3 border-t border-green-400">
                  <p className="text-lg font-bold text-green-800">
                    SALÁRIO LÍQUIDO: R$ {resultado.salario_liquido.toFixed(2)}
                  </p>
                  <div className="mt-2 text-xs text-gray-600">
                    <p>FGTS: R$ {resultado.fgts.toFixed(2)} | INSS Patronal: R$ {resultado.inss_patronal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>

            {!resultado && (
              <Button
                onClick={handleCalcular}
                disabled={loading || !funcionarioId}
              >
                {loading ? 'Calculando...' : 'Calcular'}
              </Button>
            )}

            {resultado && (
              <Button
                onClick={handleSalvar}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Folha'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerarFolhaIndividualModal;
