import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Umbrella, Calendar, Clock, AlertTriangle, CheckCircle, ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

interface Funcionario {
  id: string;
  nome_completo: string;
  nome_cargo: string | null;
  nome_empresa: string | null;
}

const PortalGerencialFerias: React.FC = () => {
  const { funcionarioId } = useParams<{ funcionarioId: string }>();
  const navigate = useNavigate();
  const { isAdminOrManager } = useAuth();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [ferias, setFerias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminOrManager) {
      navigate('/');
      return;
    }
    loadData();
  }, [funcionarioId, isAdminOrManager]);

  const loadData = async () => {
    if (!funcionarioId) return;
    setLoading(true);

    try {
      // Carregar funcionário
      const { data: func } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, nome_cargo, nome_empresa')
        .eq('id', funcionarioId)
        .single();

      setFuncionario(func);

      // Carregar férias
      const { data: feriasData } = await supabase
        .from('ferias')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('periodo_aquisitivo', { ascending: false });

      setFerias(feriasData || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-amber-100 text-amber-800';
      case 'agendada':
        return 'bg-blue-100 text-blue-800';
      case 'em_gozo':
        return 'bg-green-100 text-green-800';
      case 'concluida':
        return 'bg-gray-100 text-gray-800';
      case 'solicitado':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'agendada':
        return 'Agendada';
      case 'em_gozo':
        return 'Em Gozo';
      case 'concluida':
        return 'Concluída';
      case 'solicitado':
        return 'Solicitado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'agendada':
        return <Calendar className="w-4 h-4" />;
      case 'em_gozo':
        return <Umbrella className="w-4 h-4" />;
      case 'concluida':
        return <CheckCircle className="w-4 h-4" />;
      case 'solicitado':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const calcularDiasRestantes = (dataLimite: string) => {
    const limite = new Date(dataLimite);
    const hoje = new Date();
    const diff = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const feriasPendentes = ferias.filter(f => f.status === 'pendente');
  const feriasAgendadas = ferias.filter(f => f.status === 'agendada' || f.status === 'solicitado');
  const feriasHistorico = ferias.filter(f => f.status === 'concluida' || f.status === 'em_gozo');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Funcionário não encontrado</h2>
          <Button onClick={() => navigate('/portal-gerencial')}>Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Gerencial */}
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Visualizando férias de: <strong>{funcionario.nome_completo}</strong>
            </span>
          </div>
          <Button
            onClick={() => navigate(`/portal-gerencial/funcionario/${funcionarioId}`)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Férias do Funcionário</h1>
          <p className="text-gray-600">Visualizar períodos aquisitivos e férias</p>
        </div>

        {ferias.length === 0 ? (
          <Card className="p-8 text-center">
            <Umbrella className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Nenhum período de férias encontrado
            </h3>
            <p className="text-gray-500">
              Este funcionário ainda não possui períodos aquisitivos cadastrados.
            </p>
          </Card>
        ) : (
          <>
            {/* Férias Pendentes */}
            {feriasPendentes.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Períodos Pendentes ({feriasPendentes.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feriasPendentes.map((periodo) => {
                    const diasRestantes = calcularDiasRestantes(periodo.data_limite_concessivo);
                    const isUrgente = diasRestantes <= 90;

                    return (
                      <Card key={periodo.id} className={`p-4 ${isUrgente ? 'border-amber-500 border-2' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {periodo.periodo_aquisitivo}º Período Aquisitivo
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(periodo.data_inicio_aquisitivo)} a {formatDate(periodo.data_fim_aquisitivo)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(periodo.status)}`}>
                            {getStatusIcon(periodo.status)}
                            {getStatusLabel(periodo.status)}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Dias de direito</span>
                            <span className="font-medium text-gray-700">
                              {periodo.dias_gozados || 30} dias
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Limite para gozo</span>
                            <span className={`font-medium ${isUrgente ? 'text-amber-600' : 'text-gray-700'}`}>
                              {formatDate(periodo.data_limite_concessivo)}
                            </span>
                          </div>
                          {isUrgente && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="text-sm text-amber-700">
                                {diasRestantes > 0 
                                  ? `Faltam ${diasRestantes} dias para o limite!`
                                  : 'Prazo vencido!'
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Férias Agendadas */}
            {feriasAgendadas.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Férias Agendadas ({feriasAgendadas.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feriasAgendadas.map((periodo) => (
                    <Card key={periodo.id} className="p-4 border-blue-200 border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {periodo.periodo_aquisitivo}º Período
                          </h3>
                          <p className="text-sm text-gray-500">Período de gozo</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(periodo.status)}`}>
                          {getStatusIcon(periodo.status)}
                          {getStatusLabel(periodo.status)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Início</span>
                          <span className="font-medium text-gray-700">
                            {formatDate(periodo.data_inicio_gozo)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Término</span>
                          <span className="font-medium text-gray-700">
                            {formatDate(periodo.data_fim_gozo)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Dias</span>
                          <span className="font-medium text-gray-700">
                            {periodo.dias_gozados || 30} dias
                          </span>
                        </div>
                        {periodo.valor_total && (
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-500">Valor Total</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(periodo.valor_total)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico */}
            {feriasHistorico.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Histórico ({feriasHistorico.length})
                </h2>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Período</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data Gozo</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dias</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Valor</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {feriasHistorico.map((periodo) => (
                          <tr key={periodo.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {periodo.periodo_aquisitivo}º Período
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatDate(periodo.data_inicio_gozo)} - {formatDate(periodo.data_fim_gozo)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {periodo.dias_gozados || 30}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {formatCurrency(periodo.valor_total)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(periodo.status)}`}>
                                {getStatusLabel(periodo.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PortalGerencialFerias;
