import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { DollarSign, TrendingUp, Users, Calendar, Plus, Edit2, History, AlertCircle, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface Funcionario {
  id: string;
  nome_completo: string;
  cargo_id: string | null;
  nome_cargo: string | null;
  ativo: boolean;
  demitido: boolean;
}

interface Cargo {
  id: string;
  nome_cargo: string;
  salario_base: number;
}

interface HistoricoSalario {
  id: string;
  funcionario_id: string;
  salario_base: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string | null;
  motivo: string;
  percentual_reajuste: number | null;
  observacoes: string | null;
  created_at: string;
  funcionario?: Funcionario;
}

const SalaryHistory: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [historico, setHistorico] = useState<HistoricoSalario[]>([]);
  
  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>('');
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<string>('data_inicio_vigencia');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Função para lidar com ordenação
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Função para ordenar os dados
  const sortedHistorico = React.useMemo(() => {
    if (!historico) return [];
    
    return [...historico].sort((a, b) => {
      let aValue = (a as Record<string, any>)[sortField];
      let bValue = (b as Record<string, any>)[sortField];
      
      // Tratar valores nulos/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Para campos de data
      if (sortField === 'data_inicio_vigencia' || sortField === 'data_fim_vigencia') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Para campos numéricos
      if (sortField === 'salario_base' || sortField === 'percentual_reajuste') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Para funcionario (nome)
      if (sortField === 'funcionario') {
        aValue = a.funcionario?.nome_completo || '';
        bValue = b.funcionario?.nome_completo || '';
      }
      
      // Converter para string para comparação
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [historico, sortField, sortDirection]);
  
  // Modal de dissídio coletivo (por cargo)
  const [showDissidioModal, setShowDissidioModal] = useState(false);
  const [dissidioDataVigencia, setDissidioDataVigencia] = useState<string>('');
  const [dissidioObservacoes, setDissidioObservacoes] = useState<string>('');
  const [aplicandoDissidio, setAplicandoDissidio] = useState(false);
  const [reajustesPorCargo, setReajustesPorCargo] = useState<Record<string, { percentual: string; novoSalario: number }>>({});
  
  // Modal de registro individual
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');
  const [novoSalario, setNovoSalario] = useState<string>('');
  const [motivoIndividual, setMotivoIndividual] = useState<string>('promocao');
  const [dataVigenciaIndividual, setDataVigenciaIndividual] = useState<string>('');
  const [observacoesIndividual, setObservacoesIndividual] = useState<string>('');
  const [salvandoIndividual, setSalvandoIndividual] = useState(false);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar funcionários ativos
      const { data: funcsData, error: funcsError } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, cargo_id, nome_cargo, ativo, demitido')
        .eq('demitido', false)
        .order('nome_completo');

      if (funcsError) throw funcsError;
      setFuncionarios(funcsData || []);

      // Carregar cargos
      const { data: cargosData, error: cargosError } = await supabase
        .from('cargos')
        .select('id, nome_cargo, salario_base')
        .order('nome_cargo');

      if (cargosError) throw cargosError;
      setCargos(cargosData || []);

      // Carregar histórico de salários
      const { data: histData, error: histError } = await supabase
        .from('historico_salarios')
        .select('*')
        .order('data_inicio_vigencia', { ascending: false });

      if (histError) throw histError;
      setHistorico(histData || []);

    } catch (error: any) {
      showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Buscar salário atual de um funcionário (do cargo ou do histórico)
  const getSalarioAtual = (funcionarioId: string): number => {
    // Primeiro, verificar se tem no histórico
    const historicoFunc = historico
      .filter(h => h.funcionario_id === funcionarioId && !h.data_fim_vigencia)
      .sort((a, b) => new Date(b.data_inicio_vigencia).getTime() - new Date(a.data_inicio_vigencia).getTime());
    
    if (historicoFunc.length > 0) {
      return historicoFunc[0].salario_base;
    }

    // Se não tem histórico, buscar do cargo
    const func = funcionarios.find(f => f.id === funcionarioId);
    if (func?.cargo_id) {
      const cargo = cargos.find(c => c.id === func.cargo_id);
      return cargo?.salario_base || 0;
    }

    return 0;
  };

  // Inicializar reajustes por cargo quando abrir o modal
  const inicializarReajustesPorCargo = () => {
    const reajustes: Record<string, { percentual: string; novoSalario: number }> = {};
    cargos.forEach(cargo => {
      reajustes[cargo.id] = {
        percentual: '',
        novoSalario: cargo.salario_base
      };
    });
    setReajustesPorCargo(reajustes);
  };

  // Atualizar percentual de um cargo específico
  const atualizarPercentualCargo = (cargoId: string, percentual: string) => {
    const cargo = cargos.find(c => c.id === cargoId);
    if (!cargo) return;
    
    const perc = parseFloat(percentual) || 0;
    const novoSalario = cargo.salario_base * (1 + perc / 100);
    
    setReajustesPorCargo(prev => ({
      ...prev,
      [cargoId]: {
        percentual,
        novoSalario: Math.round(novoSalario * 100) / 100
      }
    }));
  };

  // Aplicar dissídio coletivo por cargo
  const aplicarDissidioColetivo = async () => {
    if (!dissidioDataVigencia) {
      showToast('Preencha a data de vigência', 'error');
      return;
    }

    // Verificar se tem algum cargo com percentual definido
    const cargosComReajuste = Object.entries(reajustesPorCargo).filter(
      ([_, dados]) => dados.percentual && parseFloat(dados.percentual) !== 0
    );

    if (cargosComReajuste.length === 0) {
      showToast('Informe o percentual de reajuste para pelo menos um cargo', 'error');
      return;
    }

    setAplicandoDissidio(true);
    try {
      const dataVigencia = dissidioDataVigencia;
      let sucessoFuncionarios = 0;
      let sucessoCargos = 0;
      let erros = 0;

      for (const [cargoId, dados] of cargosComReajuste) {
        const percentual = parseFloat(dados.percentual);
        const cargo = cargos.find(c => c.id === cargoId);
        if (!cargo) continue;

        // 1. Atualizar salário base do cargo
        const { error: cargoError } = await supabase
          .from('cargos')
          .update({ salario_base: dados.novoSalario })
          .eq('id', cargoId);

        if (cargoError) {
          erros++;
          continue;
        }
        sucessoCargos++;

        // 2. Atualizar funcionários deste cargo
        const funcionariosDoCargo = funcionarios.filter(
          f => f.cargo_id === cargoId && f.ativo && !f.demitido
        );

        for (const func of funcionariosDoCargo) {
          const salarioAtual = getSalarioAtual(func.id);
          const novoSalario = salarioAtual > 0 
            ? salarioAtual * (1 + percentual / 100)
            : dados.novoSalario;

          // Fechar registro anterior
          await supabase
            .from('historico_salarios')
            .update({ data_fim_vigencia: dataVigencia })
            .eq('funcionario_id', func.id)
            .is('data_fim_vigencia', null);

          // Criar novo registro
          const { error: insertError } = await supabase
            .from('historico_salarios')
            .insert({
              funcionario_id: func.id,
              salario_base: Math.round(novoSalario * 100) / 100,
              data_inicio_vigencia: dataVigencia,
              motivo: 'dissidio',
              percentual_reajuste: percentual,
              observacoes: dissidioObservacoes || `Dissídio coletivo ${new Date(dataVigencia).getFullYear()} - ${cargo.nome_cargo}`
            });

          if (insertError) {
            erros++;
          } else {
            sucessoFuncionarios++;
          }
        }
      }

      showToast(
        `Dissídio aplicado: ${sucessoCargos} cargos e ${sucessoFuncionarios} funcionários atualizados${erros > 0 ? `, ${erros} erros` : ''}`, 
        sucessoCargos > 0 ? 'success' : 'error'
      );
      setShowDissidioModal(false);
      setDissidioDataVigencia('');
      setDissidioObservacoes('');
      setReajustesPorCargo({});
      loadData();

    } catch (error: any) {
      showToast('Erro ao aplicar dissídio: ' + error.message, 'error');
    } finally {
      setAplicandoDissidio(false);
    }
  };

  // Registrar alteração individual
  const registrarAlteracaoIndividual = async () => {
    if (!selectedFuncionario || !novoSalario || !dataVigenciaIndividual) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    const salario = parseFloat(novoSalario);
    if (isNaN(salario) || salario <= 0) {
      showToast('Salário inválido', 'error');
      return;
    }

    setSalvandoIndividual(true);
    try {
      const salarioAtual = getSalarioAtual(selectedFuncionario);
      const percentualReajuste = salarioAtual > 0 ? ((salario - salarioAtual) / salarioAtual) * 100 : null;

      // Fechar registro anterior
      await supabase
        .from('historico_salarios')
        .update({ data_fim_vigencia: dataVigenciaIndividual })
        .eq('funcionario_id', selectedFuncionario)
        .is('data_fim_vigencia', null);

      // Criar novo registro
      const { error } = await supabase
        .from('historico_salarios')
        .insert({
          funcionario_id: selectedFuncionario,
          salario_base: salario,
          data_inicio_vigencia: dataVigenciaIndividual,
          motivo: motivoIndividual,
          percentual_reajuste: percentualReajuste,
          observacoes: observacoesIndividual || null
        });

      if (error) throw error;

      showToast('Alteração registrada com sucesso!', 'success');
      setShowIndividualModal(false);
      setSelectedFuncionario('');
      setNovoSalario('');
      setMotivoIndividual('promocao');
      setDataVigenciaIndividual('');
      setObservacoesIndividual('');
      loadData();

    } catch (error: any) {
      showToast('Erro: ' + error.message, 'error');
    } finally {
      setSalvandoIndividual(false);
    }
  };

  // Popular histórico inicial (primeira vez)
  const popularHistoricoInicial = async () => {
    if (!window.confirm('Isso irá criar registros iniciais para todos os funcionários que ainda não têm histórico. Continuar?')) {
      return;
    }

    setLoading(true);
    try {
      let criados = 0;
      const dataHoje = new Date().toISOString().split('T')[0];

      for (const func of funcionarios) {
        // Verificar se já tem histórico
        const temHistorico = historico.some(h => h.funcionario_id === func.id);
        if (temHistorico) continue;

        // Buscar salário do cargo
        const cargo = cargos.find(c => c.id === func.cargo_id);
        if (!cargo) continue;

        const { error } = await supabase
          .from('historico_salarios')
          .insert({
            funcionario_id: func.id,
            salario_base: cargo.salario_base,
            data_inicio_vigencia: dataHoje,
            motivo: 'inicial',
            observacoes: 'Registro inicial - salário do cargo'
          });

        if (!error) criados++;
      }

      showToast(`${criados} registros iniciais criados`, 'success');
      loadData();

    } catch (error: any) {
      showToast('Erro: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar histórico
  const historicoFiltrado = filtroFuncionario
    ? sortedHistorico.filter(h => h.funcionario_id === filtroFuncionario)
    : sortedHistorico;

  // Estatísticas
  const funcionariosComHistorico = new Set(historico.map(h => h.funcionario_id)).size;
  const funcionariosSemHistorico = funcionarios.filter(f => !historico.some(h => h.funcionario_id === f.id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History className="w-7 h-7 text-blue-600" />
            Histórico de Salários
          </h1>
          <p className="text-gray-600 mt-1">Gerencie reajustes salariais e dissídios coletivos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={popularHistoricoInicial}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Popular Inicial
          </Button>
          <Button
            onClick={() => setShowIndividualModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Alteração Individual
          </Button>
          <Button
            onClick={() => {
              inicializarReajustesPorCargo();
              setShowDissidioModal(true);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <TrendingUp className="w-4 h-4" />
            Aplicar Dissídio
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Funcionários</p>
              <p className="text-2xl font-bold text-gray-800">{funcionarios.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Com Histórico</p>
              <p className="text-2xl font-bold text-green-600">{funcionariosComHistorico}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sem Histórico</p>
              <p className="text-2xl font-bold text-yellow-600">{funcionariosSemHistorico}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Registros</p>
              <p className="text-2xl font-bold text-purple-600">{historico.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Filtrar por Funcionário"
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
            >
              <option value="">Todos os funcionários</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome_completo}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de histórico */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('funcionario')}
                >
                  <div className="flex items-center gap-1">
                    Funcionário
                    {sortField === 'funcionario' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('salario_base')}
                >
                  <div className="flex items-center gap-1">
                    Salário
                    {sortField === 'salario_base' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('data_inicio_vigencia')}
                >
                  <div className="flex items-center gap-1">
                    Vigência
                    {sortField === 'data_inicio_vigencia' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('motivo')}
                >
                  <div className="flex items-center gap-1">
                    Motivo
                    {sortField === 'motivo' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('percentual_reajuste')}
                >
                  <div className="flex items-center gap-1">
                    Reajuste
                    {sortField === 'percentual_reajuste' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historicoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((h) => {
                  const func = funcionarios.find(f => f.id === h.funcionario_id);
                  return (
                    <tr key={h.id} className={!h.data_fim_vigencia ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{func?.nome_completo || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{func?.nome_cargo || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-green-600">
                          R$ {h.salario_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>{new Date(h.data_inicio_vigencia + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        {h.data_fim_vigencia && (
                          <div className="text-gray-400">
                            até {new Date(h.data_fim_vigencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {!h.data_fim_vigencia && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Vigente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          h.motivo === 'dissidio' ? 'bg-blue-100 text-blue-800' :
                          h.motivo === 'promocao' ? 'bg-purple-100 text-purple-800' :
                          h.motivo === 'correcao' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {h.motivo === 'dissidio' ? 'Dissídio' :
                           h.motivo === 'promocao' ? 'Promoção' :
                           h.motivo === 'correcao' ? 'Correção' :
                           h.motivo === 'inicial' ? 'Inicial' :
                           h.motivo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {h.percentual_reajuste !== null ? (
                          <span className={h.percentual_reajuste >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {h.percentual_reajuste >= 0 ? '+' : ''}{h.percentual_reajuste.toFixed(2)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {h.observacoes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Explicação de funcionamento */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Como funciona o histórico de salários?</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p><strong>1. Cálculos existentes:</strong> Folhas já calculadas permanecem inalteradas (usam o salário que foi gravado na época).</p>
          <p><strong>2. Novos cálculos:</strong> Ao calcular uma folha, o sistema pode consultar o salário vigente na data de competência usando a função <code>get_salario_vigente()</code>.</p>
          <p><strong>3. Recálculo retroativo:</strong> Para recalcular folhas antigas com o novo salário, é necessário excluir a folha e calcular novamente (o sistema buscará o salário correto do período).</p>
          <p><strong>4. Dissídio coletivo:</strong> Aplica o reajuste para todos os funcionários ativos de uma vez, criando novos registros com a data de vigência informada.</p>
        </div>
      </Card>

      {/* Modal Dissídio Coletivo - Por Cargo */}
      {showDissidioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Aplicar Dissídio Coletivo - Por Cargo
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Data de Vigência"
                  type="date"
                  value={dissidioDataVigencia}
                  onChange={(e) => setDissidioDataVigencia(e.target.value)}
                />
                
                <Input
                  label="Observações"
                  type="text"
                  placeholder="Ex: Dissídio coletivo 2025"
                  value={dissidioObservacoes}
                  onChange={(e) => setDissidioObservacoes(e.target.value)}
                />
              </div>

              {/* Tabela de cargos com percentuais */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salário Atual</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reajuste (%)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Novo Salário</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Funcionários</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cargos.map(cargo => {
                      const dados = reajustesPorCargo[cargo.id] || { percentual: '', novoSalario: cargo.salario_base };
                      const qtdFuncionarios = funcionarios.filter(
                        f => f.cargo_id === cargo.id && f.ativo && !f.demitido
                      ).length;
                      const temReajuste = dados.percentual && parseFloat(dados.percentual) !== 0;
                      
                      return (
                        <tr key={cargo.id} className={temReajuste ? 'bg-green-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {cargo.nome_cargo}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            R$ {cargo.salario_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={dados.percentual}
                              onChange={(e) => atualizarPercentualCargo(cargo.id, e.target.value)}
                              className="w-24 mx-auto block text-center border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {temReajuste ? (
                              <span className="font-semibold text-green-600">
                                R$ {dados.novoSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              qtdFuncionarios > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {qtdFuncionarios}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Informe o percentual de reajuste para cada cargo. 
                  Apenas cargos com percentual preenchido serão atualizados. 
                  O salário base do cargo e o histórico de todos os funcionários ativos desse cargo serão atualizados.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDissidioModal(false);
                  setReajustesPorCargo({});
                }}
                disabled={aplicandoDissidio}
              >
                Cancelar
              </Button>
              <Button
                onClick={aplicarDissidioColetivo}
                disabled={aplicandoDissidio}
                className="bg-green-600 hover:bg-green-700"
              >
                {aplicandoDissidio ? 'Aplicando...' : 'Aplicar Dissídio'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alteração Individual */}
      {showIndividualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-blue-600" />
              Alteração Individual de Salário
            </h2>
            
            <div className="space-y-4">
              <Select
                label="Funcionário"
                value={selectedFuncionario}
                onChange={(e) => setSelectedFuncionario(e.target.value)}
              >
                <option value="">Selecione...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome_completo} - Atual: R$ {getSalarioAtual(f.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </Select>
              
              <Input
                label="Novo Salário (R$)"
                type="number"
                step="0.01"
                placeholder="Ex: 2500.00"
                value={novoSalario}
                onChange={(e) => setNovoSalario(e.target.value)}
              />
              
              <Select
                label="Motivo"
                value={motivoIndividual}
                onChange={(e) => setMotivoIndividual(e.target.value)}
              >
                <option value="promocao">Promoção</option>
                <option value="correcao">Correção</option>
                <option value="dissidio">Dissídio (individual)</option>
                <option value="outro">Outro</option>
              </Select>
              
              <Input
                label="Data de Vigência"
                type="date"
                value={dataVigenciaIndividual}
                onChange={(e) => setDataVigenciaIndividual(e.target.value)}
              />
              
              <Input
                label="Observações"
                type="text"
                placeholder="Opcional"
                value={observacoesIndividual}
                onChange={(e) => setObservacoesIndividual(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowIndividualModal(false)}
                disabled={salvandoIndividual}
              >
                Cancelar
              </Button>
              <Button
                onClick={registrarAlteracaoIndividual}
                disabled={salvandoIndividual}
              >
                {salvandoIndividual ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryHistory;