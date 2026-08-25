import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Calendar,
  Users,
  Building2,
  Filter,
  TrendingUp,
  BarChart2,
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface InconsistenciaHorario {
  tipo: 'HORARIO_FORA_TOLERANCIA' | 'POSTO_DIFERENTE' | 'DIA_FOLGA' | 'SEM_ESCALA';
  descricao: string;
  horario_esperado?: string;
  horario_registrado?: string;
  posto_esperado?: string;
  posto_registrado?: string;
}

interface RegistroPonto {
  id: string;
  funcionario_id: string;
  posto_trabalho_id: string;
  nome_funcionario: string;
  nome_posto: string;
  data_registro: string;
  primeiro_registro: string | null;
  segundo_registro: string | null;
  terceiro_registro: string | null;
  quarto_registro: string | null;
  status: string;
  validacao_geolocalizacao: boolean;
  distancia_posto_metros: number | null;
  observacoes: string | null;
  inconsistencias: InconsistenciaHorario[] | null;
  created_at: string;
  revisado?: boolean;
  revisado_por?: string;
  revisado_em?: string;
  aprovado?: boolean;
}

interface PadraoFuncionario {
  funcionario_id: string;
  nome_funcionario: string;
  total_registros: number;
  registros_com_inconsistencia: number;
  percentual_inconsistencias: number;
  tipos_inconsistencias: {
    HORARIO_FORA_TOLERANCIA: number;
    POSTO_DIFERENTE: number;
    DIA_FOLGA: number;
    SEM_ESCALA: number;
  };
  media_minutos_atraso: number;
  media_minutos_antecipacao: number;
}

interface Funcionario {
  id: string;
  nome_completo: string;
  posto_trabalho_id: string;
}

interface PostoTrabalho {
  id: string;
  nome_posto: string;
}

const RevisaoInconsistencias: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'relatorio'>('pendentes');
  
  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');
  const [filtroTipoInconsistencia, setFiltroTipoInconsistencia] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Estado para expandir/colapsar funcionários no relatório
  const [funcionariosExpandidos, setFuncionariosExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [funcResult, postosResult, registrosResult] = await Promise.all([
        supabase.from('funcionarios').select('id, nome_completo, posto_trabalho_id').eq('ativo', true).order('nome_completo'),
        supabase.from('postos_trabalho').select('id, nome_posto').eq('ativo', true).is('local_area', null).order('nome_posto'),
        supabase.from('folha_ponto_automatica')
          .select('*')
          .not('inconsistencias', 'is', null)
          .order('data_registro', { ascending: false })
          .limit(1000)
      ]);

      if (funcResult.data) setFuncionarios(funcResult.data);
      if (postosResult.data) setPostos(postosResult.data);
      if (registrosResult.data) {
        // Filtrar apenas registros com inconsistencias não vazias
        const registrosComInconsistencias = registrosResult.data.filter(
          r => r.inconsistencias && Array.isArray(r.inconsistencias) && r.inconsistencias.length > 0
        );
        setRegistros(registrosComInconsistencias);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const aprovarRegistro = async (registroId: string) => {
    setSalvando(registroId);
    try {
      const { error } = await supabase
        .from('folha_ponto_automatica')
        .update({
          inconsistencias: null, // Limpar inconsistências = aprovado
          observacoes: 'Registro revisado e aprovado pelo gestor'
        })
        .eq('id', registroId);

      if (error) throw error;
      
      // Remover da lista local
      setRegistros(prev => prev.filter(r => r.id !== registroId));
    } catch (error) {
      alert('Erro ao aprovar registro');
    } finally {
      setSalvando(null);
    }
  };

  const rejeitarRegistro = async (registroId: string) => {
    const motivo = prompt('Informe o motivo da rejeição:');
    if (!motivo) return;

    setSalvando(registroId);
    try {
      const { error } = await supabase
        .from('folha_ponto_automatica')
        .update({
          status: 'rejeitado',
          observacoes: `REJEITADO: ${motivo}`
        })
        .eq('id', registroId);

      if (error) throw error;
      
      // Remover da lista local
      setRegistros(prev => prev.filter(r => r.id !== registroId));
    } catch (error) {
      alert('Erro ao rejeitar registro');
    } finally {
      setSalvando(null);
    }
  };

  const excluirRegistro = async (registroId: string, nomeFuncionario: string, dataRegistro: string) => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Deseja EXCLUIR permanentemente este registro?\n\n` +
      `Funcionário: ${nomeFuncionario}\n` +
      `Data: ${formatarData(dataRegistro)}\n\n` +
      `Esta ação NÃO PODE ser desfeita!\n\n` +
      `O registro será completamente removido do sistema.`
    );

    if (!confirmacao) return;

    // Segunda confirmação para ações críticas
    const segundaConfirmacao = window.confirm(
      `Confirma a EXCLUSÃO DEFINITIVA deste registro?\n\n` +
      `Digite OK para confirmar ou Cancelar para voltar.`
    );

    if (!segundaConfirmacao) return;

    setSalvando(registroId);
    try {
      const { error } = await supabase
        .from('folha_ponto_automatica')
        .delete()
        .eq('id', registroId);

      if (error) throw error;
      
      // Remover da lista local
      setRegistros(prev => prev.filter(r => r.id !== registroId));
      
      alert('✅ Registro excluído com sucesso!');
    } catch (error: any) {
      alert('❌ Erro ao excluir registro: ' + error.message);
    } finally {
      setSalvando(null);
    }
  };

  const calcularPadroesFuncionarios = (): PadraoFuncionario[] => {
    const mapaPadroes = new Map<string, PadraoFuncionario>();

    registros.forEach(registro => {
      if (!mapaPadroes.has(registro.funcionario_id)) {
        mapaPadroes.set(registro.funcionario_id, {
          funcionario_id: registro.funcionario_id,
          nome_funcionario: registro.nome_funcionario,
          total_registros: 0,
          registros_com_inconsistencia: 0,
          percentual_inconsistencias: 0,
          tipos_inconsistencias: {
            HORARIO_FORA_TOLERANCIA: 0,
            POSTO_DIFERENTE: 0,
            DIA_FOLGA: 0,
            SEM_ESCALA: 0
          },
          media_minutos_atraso: 0,
          media_minutos_antecipacao: 0
        });
      }

      const padrao = mapaPadroes.get(registro.funcionario_id)!;
      padrao.total_registros++;
      
      if (registro.inconsistencias && registro.inconsistencias.length > 0) {
        padrao.registros_com_inconsistencia++;
        
        registro.inconsistencias.forEach(inc => {
          if (inc.tipo in padrao.tipos_inconsistencias) {
            padrao.tipos_inconsistencias[inc.tipo as keyof typeof padrao.tipos_inconsistencias]++;
          }
        });
      }
    });

    // Calcular percentuais
    mapaPadroes.forEach(padrao => {
      padrao.percentual_inconsistencias = padrao.total_registros > 0 
        ? (padrao.registros_com_inconsistencia / padrao.total_registros) * 100 
        : 0;
    });

    return Array.from(mapaPadroes.values())
      .filter(p => p.registros_com_inconsistencia > 0)
      .sort((a, b) => b.registros_com_inconsistencia - a.registros_com_inconsistencia);
  };

  const registrosFiltrados = registros.filter(r => {
    if (filtroFuncionario && r.funcionario_id !== filtroFuncionario) return false;
    if (filtroPosto && r.posto_trabalho_id !== filtroPosto) return false;
    if (filtroDataInicio && r.data_registro < filtroDataInicio) return false;
    if (filtroDataFim && r.data_registro > filtroDataFim) return false;
    if (filtroTipoInconsistencia && r.inconsistencias) {
      const temTipo = r.inconsistencias.some(inc => inc.tipo === filtroTipoInconsistencia);
      if (!temTipo) return false;
    }
    return true;
  });

  const padroes = calcularPadroesFuncionarios();

  const toggleFuncionarioExpandido = (id: string) => {
    setFuncionariosExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  };

  const formatarData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatarHora = (hora: string | null) => {
    if (!hora) return '-';
    return hora.substring(0, 5);
  };

  const getIconeTipoInconsistencia = (tipo: string) => {
    switch (tipo) {
      case 'HORARIO_FORA_TOLERANCIA':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'POSTO_DIFERENTE':
        return <MapPin className="w-4 h-4 text-orange-500" />;
      case 'DIA_FOLGA':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'SEM_ESCALA':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCorTipoInconsistencia = (tipo: string) => {
    switch (tipo) {
      case 'HORARIO_FORA_TOLERANCIA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'POSTO_DIFERENTE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DIA_FOLGA':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SEM_ESCALA':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLabelTipo = (tipo: string) => {
    switch (tipo) {
      case 'HORARIO_FORA_TOLERANCIA':
        return 'Horário';
      case 'POSTO_DIFERENTE':
        return 'Posto';
      case 'DIA_FOLGA':
        return 'Folga';
      case 'SEM_ESCALA':
        return 'Sem Escala';
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revisão de Inconsistências</h1>
          <p className="text-gray-600">Aprovar ou rejeitar registros de ponto com inconsistências</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregarDados}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Atrasos/Antecipações</p>
              <p className="text-xl font-bold text-gray-900">
                {registros.filter(r => r.inconsistencias?.some(i => i.tipo === 'HORARIO_FORA_TOLERANCIA')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Posto Diferente</p>
              <p className="text-xl font-bold text-gray-900">
                {registros.filter(r => r.inconsistencias?.some(i => i.tipo === 'POSTO_DIFERENTE')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dia de Folga</p>
              <p className="text-xl font-bold text-gray-900">
                {registros.filter(r => r.inconsistencias?.some(i => i.tipo === 'DIA_FOLGA')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pendentes</p>
              <p className="text-xl font-bold text-gray-900">{registros.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'pendentes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Pendentes de Revisão
            {registrosFiltrados.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {registrosFiltrados.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'relatorio'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Relatório por Funcionário
          </div>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Funcionário
            </label>
            <select
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome_completo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building2 className="w-4 h-4 inline mr-1" />
              Posto de Trabalho
            </label>
            <select
              value={filtroPosto}
              onChange={(e) => setFiltroPosto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {postos.map(p => (
                <option key={p.id} value={p.id}>{p.nome_posto}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Tipo de Inconsistência
            </label>
            <select
              value={filtroTipoInconsistencia}
              onChange={(e) => setFiltroTipoInconsistencia(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="HORARIO_FORA_TOLERANCIA">Horário Fora da Tolerância</option>
              <option value="POSTO_DIFERENTE">Posto Diferente</option>
              <option value="DIA_FOLGA">Dia de Folga</option>
              <option value="SEM_ESCALA">Sem Escala</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {activeTab === 'pendentes' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {registrosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo revisado!</h3>
              <p className="text-gray-500">Não há registros pendentes de revisão.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {registrosFiltrados.map(registro => (
                <div key={registro.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Info do Registro */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{registro.nome_funcionario}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{formatarData(registro.data_registro)}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {registro.nome_posto}
                        </div>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Entrada: {formatarHora(registro.primeiro_registro)}</span>
                          {registro.quarto_registro && (
                            <>
                              <span className="text-gray-300">→</span>
                              <span>Saída: {formatarHora(registro.quarto_registro)}</span>
                            </>
                          )}
                          {!registro.quarto_registro && registro.segundo_registro && (
                            <>
                              <span className="text-gray-300">→</span>
                              <span>Saída: {formatarHora(registro.segundo_registro)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Inconsistências */}
                      <div className="flex flex-wrap gap-2">
                        {registro.inconsistencias?.map((inc, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCorTipoInconsistencia(inc.tipo)}`}
                          >
                            {getIconeTipoInconsistencia(inc.tipo)}
                            <span>{inc.descricao}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 lg:flex-shrink-0">
                      <button
                        onClick={() => aprovarRegistro(registro.id)}
                        disabled={salvando === registro.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {salvando === registro.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Aprovar
                      </button>
                      <button
                        onClick={() => rejeitarRegistro(registro.id)}
                        disabled={salvando === registro.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                        Rejeitar
                      </button>
                      <button
                        onClick={() => excluirRegistro(registro.id, registro.nome_funcionario, registro.data_registro)}
                        disabled={salvando === registro.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Excluir registro permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Tab Relatório por Funcionário
        <div className="space-y-4">
          {padroes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sem padrões identificados</h3>
              <p className="text-gray-500">Não há inconsistências suficientes para análise de padrões.</p>
            </div>
          ) : (
            padroes.map(padrao => {
              const isExpandido = funcionariosExpandidos.has(padrao.funcionario_id);
              const registrosFuncionario = registros.filter(r => r.funcionario_id === padrao.funcionario_id);
              
              return (
                <div key={padrao.funcionario_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header do Funcionário */}
                  <button
                    onClick={() => toggleFuncionarioExpandido(padrao.funcionario_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {padrao.nome_funcionario.charAt(0)}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{padrao.nome_funcionario}</h3>
                        <p className="text-sm text-gray-500">
                          {padrao.registros_com_inconsistencia} inconsistências em {padrao.total_registros} registros
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Mini badges de tipos */}
                      <div className="hidden md:flex items-center gap-2">
                        {padrao.tipos_inconsistencias.HORARIO_FORA_TOLERANCIA > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />
                            {padrao.tipos_inconsistencias.HORARIO_FORA_TOLERANCIA}
                          </span>
                        )}
                        {padrao.tipos_inconsistencias.POSTO_DIFERENTE > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                            <MapPin className="w-3 h-3" />
                            {padrao.tipos_inconsistencias.POSTO_DIFERENTE}
                          </span>
                        )}
                        {padrao.tipos_inconsistencias.DIA_FOLGA > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                            <Calendar className="w-3 h-3" />
                            {padrao.tipos_inconsistencias.DIA_FOLGA}
                          </span>
                        )}
                        {padrao.tipos_inconsistencias.SEM_ESCALA > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            {padrao.tipos_inconsistencias.SEM_ESCALA}
                          </span>
                        )}
                      </div>
                      
                      {/* Percentual */}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        padrao.percentual_inconsistencias > 50 
                          ? 'bg-red-100 text-red-700' 
                          : padrao.percentual_inconsistencias > 25 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {padrao.percentual_inconsistencias.toFixed(0)}%
                      </div>
                      
                      {isExpandido ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Detalhes expandidos */}
                  {isExpandido && (
                    <div className="border-t border-gray-200">
                      {/* Estatísticas detalhadas */}
                      <div className="p-4 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">{padrao.tipos_inconsistencias.HORARIO_FORA_TOLERANCIA}</p>
                          <p className="text-xs text-gray-500">Atrasos/Antecipações</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{padrao.tipos_inconsistencias.POSTO_DIFERENTE}</p>
                          <p className="text-xs text-gray-500">Posto Diferente</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{padrao.tipos_inconsistencias.DIA_FOLGA}</p>
                          <p className="text-xs text-gray-500">Dia de Folga</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{padrao.tipos_inconsistencias.SEM_ESCALA}</p>
                          <p className="text-xs text-gray-500">Sem Escala</p>
                        </div>
                      </div>
                      
                      {/* Lista de registros */}
                      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        {registrosFuncionario.map(registro => (
                          <div key={registro.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700">
                                {formatarData(registro.data_registro)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatarHora(registro.primeiro_registro)} - {formatarHora(registro.quarto_registro || registro.segundo_registro)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {registro.nome_posto}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {registro.inconsistencias?.map((inc, idx) => (
                                <span 
                                  key={idx}
                                  className={`px-2 py-0.5 rounded text-xs ${getCorTipoInconsistencia(inc.tipo)}`}
                                >
                                  {getLabelTipo(inc.tipo)}
                                </span>
                              ))}
                              <button
                                onClick={() => excluirRegistro(registro.id, registro.nome_funcionario, registro.data_registro)}
                                disabled={salvando === registro.id}
                                className="ml-2 p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Excluir este registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RevisaoInconsistencias;
