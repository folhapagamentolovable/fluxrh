import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Search, Filter, Clock, MapPin, AlertTriangle, CheckCircle, XCircle, Download, FileText, Users, Building2, Edit2 } from 'lucide-react';
import EditarRegistroPontoModal from '../../components/EditarRegistroPontoModal';
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
  latitude_registro: number | null;
  longitude_registro: number | null;
  observacoes: string | null;
  created_at: string;
  inconsistencias?: InconsistenciaHorario[];
}

interface Funcionario {
  id: string;
  nome_completo: string;
}

interface PostoTrabalho {
  id: string;
  nome_posto: string;
}

interface Inconsistencia {
  registro: RegistroPonto;
  tipo: 'incompleto' | 'fora_raio' | 'horario_irregular' | 'sem_saida';
  descricao: string;
}

const HistoricoPontoAutomatico: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historico' | 'inconsistencias'>('historico');
  const [registroParaEditar, setRegistroParaEditar] = useState<RegistroPonto | null>(null);

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar funcionários
      const { data: funcData } = await supabase
        .from('funcionarios')
        .select('id, nome_completo')
        .eq('ativo', true)
        .order('nome_completo');

      if (funcData) setFuncionarios(funcData);

      // Carregar postos
      const { data: postosData } = await supabase
        .from('postos_trabalho')
        .select('id, nome_posto')
        .eq('ativo', true)
        .order('nome_posto');

      if (postosData) setPostos(postosData);

      // Carregar registros
      await carregarRegistros();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const carregarRegistros = async () => {
    try {
      let query = supabase
        .from('folha_ponto_automatica')
        .select('*')
        .order('data_registro', { ascending: false })
        .order('created_at', { ascending: false });

      if (filtroFuncionario) {
        query = query.eq('funcionario_id', filtroFuncionario);
      }

      if (filtroPosto) {
        query = query.eq('posto_trabalho_id', filtroPosto);
      }

      if (filtroDataInicio) {
        query = query.gte('data_registro', filtroDataInicio);
      }

      if (filtroDataFim) {
        query = query.lte('data_registro', filtroDataFim);
      }

      if (filtroStatus) {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (!loading) {
      carregarRegistros();
    }
  }, [filtroFuncionario, filtroPosto, filtroDataInicio, filtroDataFim, filtroStatus]);

  const identificarInconsistencias = (): Inconsistencia[] => {
    const inconsistencias: Inconsistencia[] = [];

    registros.forEach(registro => {
      // Registro incompleto (sem entrada ou saída)
      if (!registro.primeiro_registro) {
        inconsistencias.push({
          registro,
          tipo: 'incompleto',
          descricao: 'Registro sem horário de entrada'
        });
      } else if (!registro.quarto_registro && !registro.segundo_registro && registro.status === 'fechado') {
        inconsistencias.push({
          registro,
          tipo: 'incompleto',
          descricao: 'Registro fechado sem horário de saída'
        });
      }

      // Registro sem saída (ainda aberto há mais de 14 horas)
      if (registro.status === 'aberto' && registro.primeiro_registro) {
        const dataRegistro = new Date(registro.data_registro + 'T' + registro.primeiro_registro);
        const agora = new Date();
        const horasDecorridas = (agora.getTime() - dataRegistro.getTime()) / (1000 * 60 * 60);
        
        if (horasDecorridas > 14) {
          inconsistencias.push({
            registro,
            tipo: 'sem_saida',
            descricao: `Registro aberto há mais de ${Math.floor(horasDecorridas)} horas sem saída`
          });
        }
      }

      // Fora do raio de validação
      if (registro.validacao_geolocalizacao === false && registro.distancia_posto_metros !== null) {
        inconsistencias.push({
          registro,
          tipo: 'fora_raio',
          descricao: `Registro feito a ${registro.distancia_posto_metros?.toFixed(0)}m do posto`
        });
      }

      // Horário irregular (intervalo de refeição muito curto ou muito longo)
      if (registro.segundo_registro && registro.terceiro_registro) {
        const inicioRefeicao = new Date(`2000-01-01T${registro.segundo_registro}`);
        const terminoRefeicao = new Date(`2000-01-01T${registro.terceiro_registro}`);
        const duracaoMinutos = (terminoRefeicao.getTime() - inicioRefeicao.getTime()) / (1000 * 60);

        if (duracaoMinutos < 30) {
          inconsistencias.push({
            registro,
            tipo: 'horario_irregular',
            descricao: `Intervalo de refeição muito curto: ${duracaoMinutos} minutos`
          });
        } else if (duracaoMinutos > 180) {
          inconsistencias.push({
            registro,
            tipo: 'horario_irregular',
            descricao: `Intervalo de refeição muito longo: ${duracaoMinutos} minutos`
          });
        }
      }

      // Jornada muito longa
      if (registro.primeiro_registro && (registro.quarto_registro || registro.segundo_registro)) {
        const entrada = new Date(`2000-01-01T${registro.primeiro_registro}`);
        const saida = new Date(`2000-01-01T${registro.quarto_registro || registro.segundo_registro}`);
        let duracaoHoras = (saida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
        
        // Ajustar se passou da meia-noite
        if (duracaoHoras < 0) duracaoHoras += 24;

        if (duracaoHoras > 12) {
          inconsistencias.push({
            registro,
            tipo: 'horario_irregular',
            descricao: `Jornada muito longa: ${duracaoHoras.toFixed(1)} horas`
          });
        }
      }
    });

    return inconsistencias;
  };

  const formatarData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatarHora = (hora: string | null) => {
    if (!hora) return '-';
    return hora.substring(0, 5);
  };

  const exportarCSV = () => {
    const dados = registros.map(r => ({
      'Data': formatarData(r.data_registro),
      'Funcionário': r.nome_funcionario,
      'Posto': r.nome_posto,
      'Entrada': formatarHora(r.primeiro_registro),
      'Início Refeição': formatarHora(r.segundo_registro),
      'Fim Refeição': formatarHora(r.terceiro_registro),
      'Saída': formatarHora(r.quarto_registro),
      'Status': r.status,
      'Geolocalização': r.validacao_geolocalizacao ? 'Válida' : 'Inválida',
      'Distância (m)': r.distancia_posto_metros?.toFixed(0) || '-'
    }));

    const headers = Object.keys(dados[0] || {});
    const csvContent = [
      headers.join(';'),
      ...dados.map(row => headers.map(h => row[h as keyof typeof row]).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_ponto_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const inconsistencias = identificarInconsistencias();

  const getIconeInconsistencia = (tipo: string) => {
    switch (tipo) {
      case 'incompleto':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'fora_raio':
        return <MapPin className="w-5 h-5 text-orange-500" />;
      case 'horario_irregular':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'sem_saida':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'incompleto':
        return 'bg-red-100 text-red-800';
      case 'fora_raio':
        return 'bg-orange-100 text-orange-800';
      case 'horario_irregular':
        return 'bg-yellow-100 text-yellow-800';
      case 'sem_saida':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Ponto Automático</h1>
          <p className="text-gray-600">Consulta e análise de registros de ponto via QR Code</p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'historico'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico Completo
          </div>
        </button>
        <button
          onClick={() => setActiveTab('inconsistencias')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'inconsistencias'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Inconsistências
            {inconsistencias.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {inconsistencias.length}
              </span>
            )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {activeTab === 'historico' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entrada</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Iníc. Ref.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fim Ref.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saída</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Local</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Escala</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  registros.map(registro => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatarData(registro.data_registro)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {registro.nome_funcionario}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {registro.nome_posto}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-mono">
                        {formatarHora(registro.primeiro_registro)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-mono text-gray-500">
                        {formatarHora(registro.segundo_registro)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-mono text-gray-500">
                        {formatarHora(registro.terceiro_registro)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-mono">
                        {formatarHora(registro.quarto_registro)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          registro.status === 'fechado' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registro.status === 'fechado' ? 'Fechado' : 'Aberto'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {registro.validacao_geolocalizacao ? (
                          <div title="Localização válida">
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          </div>
                        ) : registro.distancia_posto_metros !== null ? (
                          <div className="flex items-center justify-center gap-1" title={`${registro.distancia_posto_metros?.toFixed(0)}m do posto`}>
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span className="text-xs text-orange-600">{registro.distancia_posto_metros?.toFixed(0)}m</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {registro.inconsistencias && registro.inconsistencias.length > 0 ? (
                          <div 
                            className="flex items-center justify-center gap-1 cursor-pointer"
                            title={registro.inconsistencias.map(i => i.descricao).join('\n')}
                          >
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <span className="text-xs text-orange-600 font-medium">
                              {registro.inconsistencias.length}
                            </span>
                          </div>
                        ) : (
                          <div title="Sem inconsistências de escala">
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setRegistroParaEditar(registro)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar registro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {registros.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumo de inconsistências */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {inconsistencias.filter(i => i.tipo === 'incompleto').length}
                  </p>
                  <p className="text-sm text-gray-600">Incompletos</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {inconsistencias.filter(i => i.tipo === 'fora_raio').length}
                  </p>
                  <p className="text-sm text-gray-600">Fora do Raio</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {inconsistencias.filter(i => i.tipo === 'horario_irregular').length}
                  </p>
                  <p className="text-sm text-gray-600">Horário Irregular</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {inconsistencias.filter(i => i.tipo === 'sem_saida').length}
                  </p>
                  <p className="text-sm text-gray-600">Sem Saída</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de inconsistências */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <h3 className="font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Registros com Inconsistências ({inconsistencias.length})
              </h3>
            </div>
            
            {inconsistencias.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">Nenhuma inconsistência encontrada!</p>
                <p className="text-sm text-gray-500">Todos os registros estão em conformidade.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {inconsistencias.map((item, index) => (
                  <div key={`${item.registro.id}-${item.tipo}-${index}`} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getIconeInconsistencia(item.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {item.registro.nome_funcionario}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCorTipo(item.tipo)}`}>
                            {item.tipo === 'incompleto' && 'Incompleto'}
                            {item.tipo === 'fora_raio' && 'Fora do Raio'}
                            {item.tipo === 'horario_irregular' && 'Horário Irregular'}
                            {item.tipo === 'sem_saida' && 'Sem Saída'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.descricao}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatarData(item.registro.data_registro)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.registro.nome_posto}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatarHora(item.registro.primeiro_registro)} - {formatarHora(item.registro.quarto_registro || item.registro.segundo_registro)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {registroParaEditar && (
        <EditarRegistroPontoModal
          registro={registroParaEditar}
          onClose={() => setRegistroParaEditar(null)}
          onSave={() => {
            setRegistroParaEditar(null);
            carregarRegistros();
          }}
        />
      )}
    </div>
  );
};

export default HistoricoPontoAutomatico;
