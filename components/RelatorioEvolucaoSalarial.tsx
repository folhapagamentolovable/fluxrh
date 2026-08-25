import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Download, Filter, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../src/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface HistoricoItem {
  id: string;
  cargo_id: string;
  salario_base: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string | null;
  motivo: string;
  percentual_reajuste: number | null;
}

interface CargoHistorico {
  cargo_id: string;
  nome_cargo: string;
  historico: HistoricoItem[];
}

interface RelatorioEvolucaoSalarialProps {
  isOpen: boolean;
  onClose: () => void;
}

const RelatorioEvolucaoSalarial: React.FC<RelatorioEvolucaoSalarialProps> = ({
  isOpen,
  onClose
}) => {
  const [dados, setDados] = useState<CargoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargosFiltrados, setCargosFiltrados] = useState<string[]>([]);
  const [todosCargos, setTodosCargos] = useState<{id: string, nome: string}[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<'linha' | 'barra'>('linha');

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Buscar todos os cargos
      const { data: cargos, error: errorCargos } = await supabase
        .from('cargos')
        .select('id, nome_cargo')
        .order('nome_cargo');

      if (errorCargos) throw errorCargos;

      setTodosCargos((cargos || []).map(c => ({ id: c.id, nome: c.nome_cargo })));

      // Buscar todo o histórico de salários
      const { data: historicos, error: errorHistorico } = await (supabase as any)
        .from('historico_salarios_cargo')
        .select('*')
        .order('data_inicio_vigencia', { ascending: true });

      if (errorHistorico) throw errorHistorico;

      // Agrupar por cargo
      const dadosAgrupados: CargoHistorico[] = [];
      
      for (const cargo of (cargos || [])) {
        const historicosCargo = (historicos || []).filter((h: any) => h.cargo_id === cargo.id);
        if (historicosCargo.length > 0) {
          dadosAgrupados.push({
            cargo_id: cargo.id,
            nome_cargo: cargo.nome_cargo,
            historico: historicosCargo
          });
        }
      }

      setDados(dadosAgrupados);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getAno = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').getFullYear();
  };

  // Preparar dados para o gráfico de linha temporal
  const prepararDadosGrafico = () => {
    const dadosFiltrados = cargosFiltrados.length > 0
      ? dados.filter(d => cargosFiltrados.includes(d.cargo_id))
      : dados;

    // Coletar todos os anos únicos
    const anosSet = new Set<number>();
    dadosFiltrados.forEach(cargo => {
      cargo.historico.forEach(h => {
        anosSet.add(getAno(h.data_inicio_vigencia));
      });
    });
    const anos = Array.from(anosSet).sort();

    // Criar dados para cada ano
    return anos.map(ano => {
      const ponto: any = { ano: ano.toString() };
      
      dadosFiltrados.forEach(cargo => {
        // Buscar salário vigente para este ano
        const historicoAno = cargo.historico
          .filter(h => getAno(h.data_inicio_vigencia) <= ano)
          .sort((a, b) => b.data_inicio_vigencia.localeCompare(a.data_inicio_vigencia))[0];
        
        if (historicoAno) {
          ponto[cargo.nome_cargo] = Number(historicoAno.salario_base);
        }
      });
      
      return ponto;
    });
  };

  // Preparar dados para comparação de reajustes
  const prepararDadosReajustes = () => {
    const dadosFiltrados = cargosFiltrados.length > 0
      ? dados.filter(d => cargosFiltrados.includes(d.cargo_id))
      : dados;

    return dadosFiltrados.map(cargo => {
      const historico = cargo.historico;
      let reajusteTotal = 0;
      
      for (let i = 1; i < historico.length; i++) {
        const salarioAnterior = Number(historico[i - 1].salario_base);
        const salarioAtual = Number(historico[i].salario_base);
        if (salarioAnterior > 0) {
          reajusteTotal += ((salarioAtual - salarioAnterior) / salarioAnterior) * 100;
        }
      }

      const salarioInicial = historico.length > 0 ? Number(historico[0].salario_base) : 0;
      const salarioAtual = historico.length > 0 ? Number(historico[historico.length - 1].salario_base) : 0;
      
      return {
        nome: cargo.nome_cargo.length > 20 ? cargo.nome_cargo.substring(0, 20) + '...' : cargo.nome_cargo,
        nomeCompleto: cargo.nome_cargo,
        salarioInicial,
        salarioAtual,
        reajusteAcumulado: salarioInicial > 0 ? ((salarioAtual - salarioInicial) / salarioInicial) * 100 : 0,
        qtdReajustes: historico.length - 1
      };
    }).sort((a, b) => b.reajusteAcumulado - a.reajusteAcumulado);
  };

  const toggleCargo = (cargoId: string) => {
    setCargosFiltrados(prev => 
      prev.includes(cargoId)
        ? prev.filter(id => id !== cargoId)
        : [...prev, cargoId]
    );
  };

  const selecionarTodos = () => {
    setCargosFiltrados(dados.map(d => d.cargo_id));
  };

  const limparSelecao = () => {
    setCargosFiltrados([]);
  };

  const dadosGrafico = prepararDadosGrafico();
  const dadosReajustes = prepararDadosReajustes();

  const cores = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-blue-600">
          <div className="flex items-center gap-3 text-white">
            <TrendingUp className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Relatório de Evolução Salarial</h2>
              <p className="text-sm opacity-80">Comparativo por cargo ao longo dos anos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">Carregando dados...</span>
            </div>
          ) : dados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nenhum histórico de salário encontrado.</p>
              <p className="text-sm">Adicione históricos de reajuste nos cargos para gerar o relatório.</p>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Filtrar Cargos</span>
                    <span className="text-sm text-gray-500">
                      ({cargosFiltrados.length === 0 ? 'Todos' : `${cargosFiltrados.length} selecionados`})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={selecionarTodos}>
                      Selecionar Todos
                    </Button>
                    <Button size="sm" variant="secondary" onClick={limparSelecao}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {dados.map((cargo, index) => (
                    <button
                      key={cargo.cargo_id}
                      onClick={() => toggleCargo(cargo.cargo_id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        cargosFiltrados.length === 0 || cargosFiltrados.includes(cargo.cargo_id)
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      style={{
                        backgroundColor: cargosFiltrados.length === 0 || cargosFiltrados.includes(cargo.cargo_id)
                          ? cores[index % cores.length]
                          : undefined
                      }}
                    >
                      {cargo.nome_cargo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Gráfico */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={tipoGrafico === 'linha' ? 'primary' : 'secondary'}
                  onClick={() => setTipoGrafico('linha')}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Evolução Temporal
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === 'barra' ? 'primary' : 'secondary'}
                  onClick={() => setTipoGrafico('barra')}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Comparativo de Reajustes
                </Button>
              </div>

              {/* Gráfico */}
              {tipoGrafico === 'linha' ? (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Evolução Salarial por Ano
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ano" />
                        <YAxis 
                          tickFormatter={(value) => `R$ ${(value/1000).toFixed(1)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Ano: ${label}`}
                        />
                        <Legend />
                        {(cargosFiltrados.length > 0 
                          ? dados.filter(d => cargosFiltrados.includes(d.cargo_id))
                          : dados
                        ).map((cargo, index) => (
                          <Line
                            key={cargo.cargo_id}
                            type="monotone"
                            dataKey={cargo.nome_cargo}
                            stroke={cores[index % cores.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Reajuste Acumulado por Cargo (%)
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosReajustes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => `${value.toFixed(1)}%`} />
                        <YAxis type="category" dataKey="nome" width={150} />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'reajusteAcumulado') return [`${value.toFixed(2)}%`, 'Reajuste Acumulado'];
                            return [value, name];
                          }}
                          labelFormatter={(label) => {
                            const item = dadosReajustes.find(d => d.nome === label);
                            return item?.nomeCompleto || label;
                          }}
                        />
                        <Bar 
                          dataKey="reajusteAcumulado" 
                          fill="#10B981"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tabela Detalhada */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <h3 className="font-medium text-gray-800 p-4 bg-gray-50 border-b flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Resumo por Cargo
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salário Inicial</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salário Atual</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reajuste Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd. Reajustes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dadosReajustes.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.nomeCompleto}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.salarioInicial)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.salarioAtual)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.reajusteAcumulado > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.reajusteAcumulado > 0 ? '+' : ''}{item.reajusteAcumulado.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.qtdReajustes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioEvolucaoSalarial;
