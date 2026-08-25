import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Umbrella, Calendar, User, Building2, MapPin, Briefcase, 
  Clock, AlertTriangle, CheckCircle, ArrowLeft, List, 
  CalendarDays, FileText, Ban
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { supabase } from '../../lib/supabase';
import { calcularStatusCorreto, getStatusConfig } from '../../utils/feriasStatus';

interface Funcionario {
  id: string;
  nome_completo: string;
  data_admissao: string;
  nome_empresa: string | null;
  nome_posto: string | null;
  nome_cargo: string | null;
  codigo_escala: string | null;
}

interface Ferias {
  id: string;
  periodo_aquisitivo: number;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_concessivo: string;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  dias_direito: number | null;
  dias_gozados: number | null;
  status: string;
}

interface FaltaSuspensao {
  data: string;
  tipo: 'falta_injustificada' | 'suspensao';
  mes: number;
  ano: number;
}

// Tabela CLT para referência visual
const TABELA_CLT = [
  { faltasMin: 0, faltasMax: 5, diasFerias: 30 },
  { faltasMin: 6, faltasMax: 14, diasFerias: 24 },
  { faltasMin: 15, faltasMax: 23, diasFerias: 18 },
  { faltasMin: 24, faltasMax: 32, diasFerias: 12 },
  { faltasMin: 33, faltasMax: Infinity, diasFerias: 0 },
];

const VacationDetailsManager: React.FC = () => {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState<string>('');
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [selectedFerias, setSelectedFerias] = useState<Ferias | null>(null);
  const [faltasSuspensoes, setFaltasSuspensoes] = useState<FaltaSuspensao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFaltas, setLoadingFaltas] = useState(false);

  // Carregar lista de funcionários
  useEffect(() => {
    loadFuncionarios();
  }, []);

  // Quando selecionar funcionário, carregar dados
  useEffect(() => {
    if (selectedFuncionarioId) {
      loadFuncionarioData();
    } else {
      setFuncionario(null);
      setFerias([]);
      setSelectedFerias(null);
      setFaltasSuspensoes([]);
    }
  }, [selectedFuncionarioId]);

  // Quando selecionar período de férias, carregar faltas/suspensões
  useEffect(() => {
    if (selectedFerias && funcionario) {
      loadFaltasSuspensoes();
    } else {
      setFaltasSuspensoes([]);
    }
  }, [selectedFerias]);

  const loadFuncionarios = async () => {
    const { data } = await supabase
      .from('funcionarios')
      .select('id, nome_completo, data_admissao, nome_empresa, nome_posto, nome_cargo, codigo_escala')
      .eq('ativo', true)
      .eq('demitido', false)
      .order('nome_completo');
    
    setFuncionarios(data || []);
  };

  const loadFuncionarioData = async () => {
    setLoading(true);
    try {
      // Carregar dados do funcionário
      const { data: func } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, data_admissao, nome_empresa, nome_posto, nome_cargo, codigo_escala')
        .eq('id', selectedFuncionarioId)
        .single();

      setFuncionario(func);

      // Carregar períodos de férias
      const { data: feriasData } = await supabase
        .from('ferias')
        .select('*')
        .eq('funcionario_id', selectedFuncionarioId)
        .order('periodo_aquisitivo', { ascending: false });

      setFerias(
        // Deduplicar por id (evita duplicatas causadas pelo React StrictMode em dev)
        Array.from(new Map((feriasData || []).map(f => [f.id, f])).values())
      );
      
      // Selecionar automaticamente o primeiro período pendente ou o mais recente
      if (feriasData && feriasData.length > 0) {
        const pendente = feriasData.find(f => f.status === 'pendente');
        setSelectedFerias(pendente || feriasData[0]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadFaltasSuspensoes = async () => {
    if (!selectedFerias || !funcionario) return;
    
    setLoadingFaltas(true);
    try {
      const dataInicio = new Date(selectedFerias.data_inicio_aquisitivo + 'T00:00:00');
      const dataFim = new Date(selectedFerias.data_fim_aquisitivo + 'T00:00:00');

      // Buscar folhas de ponto do período
      const { data: folhasPonto } = await supabase
        .from('folhas_ponto')
        .select('mes, ano, dados_dias, total_faltas_injustificadas, total_suspensoes')
        .eq('funcionario_id', funcionario.id)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });

      const faltas: FaltaSuspensao[] = [];

      // Filtrar folhas dentro do período e extrair faltas/suspensões
      (folhasPonto || []).forEach(folha => {
        const primeiroDiaMes = new Date(folha.ano, folha.mes - 1, 1);
        const ultimoDiaMes = new Date(folha.ano, folha.mes, 0);

        // Verificar se o mês está dentro do período aquisitivo
        if (primeiroDiaMes <= dataFim && ultimoDiaMes >= dataInicio) {
          if (folha.dados_dias) {
            try {
              const dadosDias = typeof folha.dados_dias === 'string' 
                ? JSON.parse(folha.dados_dias) 
                : folha.dados_dias;

              Object.entries(dadosDias).forEach(([chave, dados]: [string, any]) => {
                // Extrair número do dia da chave (pode ser "dia_1" ou apenas "1")
                const diaMatch = chave.match(/(\d+)/);
                if (!diaMatch) return;
                
                const diaNum = parseInt(diaMatch[1], 10);
                const dataCompleta = `${folha.ano}-${String(folha.mes).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                const dataObj = new Date(dataCompleta + 'T00:00:00');
                
                // Verificar se a data está dentro do período aquisitivo
                if (dataObj >= dataInicio && dataObj <= dataFim) {
                  if (dados.falta_injustificada) {
                    faltas.push({
                      data: dataCompleta,
                      tipo: 'falta_injustificada',
                      mes: folha.mes,
                      ano: folha.ano
                    });
                  }
                  if (dados.suspensao) {
                    faltas.push({
                      data: dataCompleta,
                      tipo: 'suspensao',
                      mes: folha.mes,
                      ano: folha.ano
                    });
                  }
                }
              });
            } catch (e) {
            }
          }
        }
      });

      // Ordenar por data
      faltas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      setFaltasSuspensoes(faltas);
    } catch (error) {
    } finally {
      setLoadingFaltas(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getStatusColor = (f: Ferias) => {
    const s = calcularStatusCorreto(f as any) ?? f.status;
    const cfg = getStatusConfig(s);
    return `${cfg.bg} ${cfg.text}`;
  };

  const getStatusLabel = (f: Ferias) => {
    const s = calcularStatusCorreto(f as any) ?? f.status;
    return getStatusConfig(s).label;
  };

  const totalFaltasInjustificadas = faltasSuspensoes.filter(f => f.tipo === 'falta_injustificada').length;
  const totalSuspensoes = faltasSuspensoes.filter(f => f.tipo === 'suspensao').length;
  const totalGeral = totalFaltasInjustificadas + totalSuspensoes;
  const diasFeriasCalculado = totalGeral <= 5 ? 30 : totalGeral <= 14 ? 24 : totalGeral <= 23 ? 18 : totalGeral <= 32 ? 12 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Umbrella className="w-7 h-7 text-green-600" />
              Gerenciamento de Férias
            </h1>
            <p className="text-gray-600">Análise detalhada de períodos aquisitivos e direito a férias</p>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Seleção de Funcionário */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-gray-500" />
            <div className="flex-1">
              <Select
                label="Selecione o Funcionário"
                value={selectedFuncionarioId}
                onChange={(e) => setSelectedFuncionarioId(e.target.value)}
              >
                <option value="">Selecione um funcionário...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {funcionario && !loading && (
          <>
            {/* Dados do Funcionário */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Dados do Funcionário
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Nome</p>
                    <p className="font-medium text-gray-800">{funcionario.nome_completo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Data de Admissão</p>
                    <p className="font-medium text-gray-800">{formatDate(funcionario.data_admissao)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Empresa</p>
                    <p className="font-medium text-gray-800">{funcionario.nome_empresa || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Posto de Trabalho</p>
                    <p className="font-medium text-gray-800">{funcionario.nome_posto || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Cargo</p>
                    <p className="font-medium text-gray-800">{funcionario.nome_cargo || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Escala</p>
                    <p className="font-medium text-gray-800">{funcionario.codigo_escala || '-'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Seleção de Período Aquisitivo */}
            {ferias.length > 0 ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  Períodos Aquisitivos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ferias.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFerias(f)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedFerias?.id === f.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">
                          {f.periodo_aquisitivo}º Período
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(f)}`}>
                          {getStatusLabel(f)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(f.data_inicio_aquisitivo)} a {formatDate(f.data_fim_aquisitivo)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Limite: {formatDate(f.data_limite_concessivo)}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <Umbrella className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum período aquisitivo cadastrado para este funcionário.</p>
              </Card>
            )}

            {/* Detalhes do Período Selecionado */}
            {selectedFerias && (
              <>
                {/* Informações do Período */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Detalhes do {selectedFerias.periodo_aquisitivo}º Período Aquisitivo
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Período Aquisitivo</p>
                      <p className="text-sm font-semibold text-blue-800 mt-1">
                        {formatDate(selectedFerias.data_inicio_aquisitivo)}
                      </p>
                      <p className="text-sm font-semibold text-blue-800">
                        a {formatDate(selectedFerias.data_fim_aquisitivo)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Limite Concessivo</p>
                      <p className="text-lg font-bold text-purple-800 mt-1">
                        {formatDate(selectedFerias.data_limite_concessivo)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">Período de Gozo</p>
                      {selectedFerias.data_inicio_gozo ? (
                        <>
                          <p className="text-sm font-semibold text-green-800 mt-1">
                            {formatDate(selectedFerias.data_inicio_gozo)}
                          </p>
                          <p className="text-sm font-semibold text-green-800">
                            a {formatDate(selectedFerias.data_fim_gozo)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-green-700 mt-1">Não agendado</p>
                      )}
                    </div>
                    <div className={`p-4 rounded-lg ${diasFeriasCalculado === 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <p className={`text-xs font-medium ${diasFeriasCalculado === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        Dias de Direito
                      </p>
                      <p className={`text-3xl font-bold mt-1 ${diasFeriasCalculado === 0 ? 'text-red-800' : 'text-amber-800'}`}>
                        {diasFeriasCalculado}
                      </p>
                      <p className={`text-xs ${diasFeriasCalculado === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {diasFeriasCalculado === 0 ? 'PERDEU O DIREITO' : 'dias'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Lista de Faltas e Suspensões */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <List className="w-5 h-5 text-red-600" />
                    Faltas Injustificadas e Suspensões no Período
                  </h2>

                  {loadingFaltas ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                  ) : faltasSuspensoes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">#</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Mês/Ano</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Contagem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {faltasSuspensoes.map((falta, index) => (
                            <tr key={`${falta.data}-${falta.tipo}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {formatDate(falta.data)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  falta.tipo === 'falta_injustificada'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {falta.tipo === 'falta_injustificada' ? (
                                    <>
                                      <Ban className="w-3 h-3" />
                                      Falta Injustificada
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3 h-3" />
                                      Suspensão
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {String(falta.mes).padStart(2, '0')}/{falta.ano}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm">
                                  1
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">
                              Total de Ocorrências:
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white font-bold">
                                {totalGeral}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-medium">Nenhuma falta ou suspensão registrada no período!</p>
                      <p className="text-green-600 text-sm">Funcionário mantém direito a 30 dias de férias.</p>
                    </div>
                  )}

                  {/* Resumo */}
                  {faltasSuspensoes.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <p className="text-xs text-red-600 font-medium">Faltas Injustificadas</p>
                        <p className="text-2xl font-bold text-red-800">{totalFaltasInjustificadas}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg text-center">
                        <p className="text-xs text-orange-600 font-medium">Suspensões</p>
                        <p className="text-2xl font-bold text-orange-800">{totalSuspensoes}</p>
                      </div>
                      <div className="p-4 bg-gray-100 rounded-lg text-center">
                        <p className="text-xs text-gray-600 font-medium">Total para Cálculo</p>
                        <p className="text-2xl font-bold text-gray-800">{totalGeral}</p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Tabela CLT de Referência */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Tabela CLT - Redução de Férias por Faltas
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-indigo-700">
                            Faltas Injustificadas + Suspensões
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-indigo-700">
                            Dias de Férias
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-indigo-700">
                            Situação Atual
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {TABELA_CLT.map((faixa, index) => {
                          const isCurrentRange = totalGeral >= faixa.faltasMin && totalGeral <= faixa.faltasMax;
                          return (
                            <tr 
                              key={index} 
                              className={isCurrentRange ? 'bg-green-100' : 'hover:bg-gray-50'}
                            >
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {faixa.faltasMax === Infinity 
                                  ? `Mais de ${faixa.faltasMin - 1} faltas`
                                  : `${faixa.faltasMin} a ${faixa.faltasMax} faltas`
                                }
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold ${
                                  faixa.diasFerias === 0 
                                    ? 'bg-red-100 text-red-800'
                                    : faixa.diasFerias < 30
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-green-100 text-green-800'
                                }`}>
                                  {faixa.diasFerias === 0 ? 'PERDE DIREITO' : `${faixa.diasFerias} dias`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isCurrentRange && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-bold">
                                    <CheckCircle className="w-4 h-4" />
                                    FAIXA ATUAL
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Descrição final */}
                  <div className={`mt-4 p-4 rounded-lg ${
                    diasFeriasCalculado === 0 
                      ? 'bg-red-100 border border-red-300' 
                      : diasFeriasCalculado < 30 
                        ? 'bg-amber-100 border border-amber-300'
                        : 'bg-green-100 border border-green-300'
                  }`}>
                    <p className={`font-medium ${
                      diasFeriasCalculado === 0 
                        ? 'text-red-800' 
                        : diasFeriasCalculado < 30 
                          ? 'text-amber-800'
                          : 'text-green-800'
                    }`}>
                      {diasFeriasCalculado === 0
                        ? 'Funcionário perdeu o direito às férias (mais de 32 faltas injustificadas — CLT Art. 130).'
                        : diasFeriasCalculado < 30
                          ? `Com ${totalGeral} falta(s)/suspensão(ões), o funcionário tem direito a ${diasFeriasCalculado} dias de férias (CLT Art. 130).`
                          : 'Funcionário não possui faltas ou suspensões no período. Direito a 30 dias de férias.'
                      }
                    </p>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VacationDetailsManager;
