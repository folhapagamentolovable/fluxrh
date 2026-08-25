import React, { useEffect, useState } from 'react';
import { Umbrella, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Plus } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import VacationRequestModal from '../../components/portal/VacationRequestModal';
import { calcularStatusCorreto, getStatusConfig, STATUS_GOZADOS, STATUS_PROGRAMADOS } from '../../utils/feriasStatus';

const PortalFerias: React.FC = () => {
  const { funcionario, loading, fetchFerias } = useEmployeePortal();
  const [ferias, setFerias] = useState<any[]>([]);
  const [loadingFerias, setLoadingFerias] = useState(true);
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!funcionario) return;

      setLoadingFerias(true);
      const data = await fetchFerias();
      setFerias(data);
      setLoadingFerias(false);
    };

    loadData();
  }, [funcionario]);

  const handleSolicitarFerias = (periodo: any) => {
    setPeriodoSelecionado(periodo);
    setShowSolicitacao(true);
  };

  const handleCloseSolicitacao = () => {
    setShowSolicitacao(false);
    setPeriodoSelecionado(null);
  };

  const handleSaveSolicitacao = async () => {
    setShowSolicitacao(false);
    setPeriodoSelecionado(null);
    // Recarregar férias
    setLoadingFerias(true);
    const data = await fetchFerias();
    setFerias(data);
    setLoadingFerias(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    // Adicionar T00:00:00 para evitar que o fuso horário mude o dia (bug do dia a menos)
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getDataAdmissaoFormatada = () => {
    if (!funcionario?.data_admissao) return 'sua data de admissão';
    return new Date(funcionario.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR');
  };
  
  const getDataLimiteConcessao = () => {
    if (!funcionario?.data_admissao) return '[data limite]';
    const dataAdmissao = new Date(funcionario.data_admissao + 'T00:00:00');
    const dataLimite = new Date(dataAdmissao);
    dataLimite.setDate(dataLimite.getDate() + 364); // 364 dias após admissão
    return dataLimite.toLocaleDateString('pt-BR');
  };

  // Retorna o status efetivo considerando as datas reais (não apenas o campo status do banco)
  const getStatusEfetivo = (periodo: any): string => {
    return calcularStatusCorreto(periodo) ?? periodo.status;
  };

  const getStatusColor = (periodo: any) => {
    return getStatusConfig(getStatusEfetivo(periodo)).bg + ' ' + getStatusConfig(getStatusEfetivo(periodo)).text;
  };

  const getStatusLabel = (periodo: any) => {
    return getStatusConfig(getStatusEfetivo(periodo)).label;
  };

  const getStatusIcon = (periodo: any) => {
    const s = getStatusEfetivo(periodo);
    if (s === 'pendente') return <Clock className="w-4 h-4" />;
    if (s === 'em_andamento') return <CheckCircle className="w-4 h-4" />;
    if (s === 'gozada') return <CheckCircle className="w-4 h-4" />;
    if (s === 'programada' || s === 'aprovada' || s === 'agendada') return <Calendar className="w-4 h-4" />;
    if (s === 'reprovada') return <XCircle className="w-4 h-4" />;
    if (s === 'vencida') return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const calcularDiasRestantes = (dataLimite: string) => {
    const limite = new Date(dataLimite);
    const hoje = new Date();
    const diff = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Separar férias por categoria usando status efetivo (considera datas reais)
  const feriasPendentes = ferias.filter(f => {
    const s = calcularStatusCorreto(f) ?? f.status;
    return s === 'pendente';
  });
  const feriasEmAndamento = ferias.filter(f => {
    const s = calcularStatusCorreto(f) ?? f.status;
    return s === 'em_andamento';
  });
  const feriasAgendadas = ferias.filter(f => {
    const s = calcularStatusCorreto(f) ?? f.status;
    return STATUS_PROGRAMADOS.includes(s as any) || f.status === 'solicitado';
  });
  const feriasReprovadas = ferias.filter(f => f.status === 'reprovada');
  const feriasHistorico = ferias.filter(f => {
    const s = calcularStatusCorreto(f) ?? f.status;
    return STATUS_GOZADOS.includes(s as any);
  });

  // Verificar se existe algum pedido com status 'solicitado' (aguardando análise)
  const temPedidoPendente = ferias.some(f => f.status === 'solicitado');

  if (loading) {
    return (
      <PortalLayout employeeName={funcionario?.nome_completo}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario?.nome_completo}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Minhas Férias</h1>
            <p className="text-sm text-muted-foreground">
              Consulte seus períodos aquisitivos e solicite férias
            </p>
          </div>
        </div>

        {loadingFerias ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : ferias.length === 0 ? (
          <Card className="p-8 text-center">
            <Umbrella className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum período de férias encontrado
            </h3>
            <p className="text-muted-foreground">
              Seus períodos aquisitivos aparecerão aqui quando estiverem disponíveis.
            </p>
          </Card>
        ) : (
          <>
            {/* Férias em Andamento */}
            {feriasEmAndamento.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  Em Andamento ({feriasEmAndamento.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {feriasEmAndamento.map((periodo) => (
                    <Card key={periodo.id} className="p-3 sm:p-4 border-green-400 bg-green-50/30">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {periodo.periodo_aquisitivo}º Período Aquisitivo
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(periodo.data_inicio_aquisitivo)} – {formatDate(periodo.data_fim_aquisitivo)}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-100 text-green-800 whitespace-nowrap">
                          <CheckCircle className="w-3 h-3" /> Em andamento
                        </span>
                      </div>
                      <div className="text-sm text-foreground space-y-1 mt-2">
                        <p><span className="font-medium">Período de gozo:</span> {formatDate(periodo.data_inicio_gozo)} – {formatDate(periodo.data_fim_gozo)}</p>
                        <p><span className="font-medium">Dias:</span> {periodo.dias_gozados}</p>
                        
                        {(periodo.valor_total && periodo.valor_total > 0) && (
                          <div className="flex justify-between pt-2 border-t border-dashed border-green-300 mt-2">
                            <span className="text-green-800 font-medium">Líquido a Receber</span>
                            <span className="font-bold text-green-800">
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

            {/* Férias Pendentes */}
            {feriasPendentes.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  Períodos Pendentes ({feriasPendentes.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {feriasPendentes.map((periodo) => {
                    const diasRestantes = calcularDiasRestantes(periodo.data_limite_concessivo);
                    const isUrgente = diasRestantes <= 90;

                    return (
                      <Card 
                        key={periodo.id} 
                        className={`p-3 sm:p-4 ${isUrgente ? 'border-amber-500' : ''}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base text-foreground">
                              {periodo.periodo_aquisitivo}º Período Aquisitivo
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {formatDate(periodo.data_inicio_aquisitivo)} a {formatDate(periodo.data_fim_aquisitivo)}
                            </p>
                          </div>
                          <span className={`self-start px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${getStatusColor(periodo.status)}`}>
                            {getStatusIcon(periodo.status)}
                            {getStatusLabel(periodo.status)}
                          </span>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dias de direito</span>
                            <span className="font-medium text-foreground">
                              {periodo.dias_gozados || 30} dias
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Limite para gozo</span>
                            <span className={`font-medium ${isUrgente ? 'text-amber-600' : 'text-foreground'}`}>
                              {formatDate(periodo.data_limite_concessivo)}
                            </span>
                          </div>
                          {isUrgente && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-amber-700">
                                {diasRestantes > 0 
                                  ? `Faltam ${diasRestantes} dias para o limite!`
                                  : 'Prazo vencido!'
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        {temPedidoPendente ? (
                          <div className="mt-3 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs sm:text-sm text-amber-700">
                                Você já possui uma solicitação aguardando análise. Aguarde a resposta antes de fazer um novo pedido.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            variant="primary" 
                            className="w-full mt-3 text-xs sm:text-sm py-2"
                            onClick={() => handleSolicitarFerias(periodo)}
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                            Solicitar Férias
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Férias Agendadas/Solicitadas */}
            {feriasAgendadas.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Férias Agendadas ({feriasAgendadas.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {feriasAgendadas.map((periodo) => (
                    <Card key={periodo.id} className="p-3 sm:p-4 border-blue-200">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {periodo.periodo_aquisitivo}º Período
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Período de gozo
                          </p>
                        </div>
                        <span className={`self-start px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${getStatusColor(periodo.status)}`}>
                          {getStatusIcon(periodo.status)}
                          {getStatusLabel(periodo.status)}
                        </span>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Início</span>
                          <span className="font-medium text-foreground">
                            {formatDate(periodo.data_inicio_gozo || periodo.periodo1_inicio)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Término</span>
                          <span className="font-medium text-foreground">
                            {formatDate(periodo.data_fim_gozo || periodo.periodo1_fim)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dias</span>
                          <span className="font-medium text-foreground">
                            {periodo.dias_gozados || 30} dias
                          </span>
                        </div>

                        {/* Detalhamento de Proventos se existir itens_calculados */}
                        {periodo.itens_calculados?.proventos?.length > 0 && (
                          <div className="pt-2 border-t border-dashed border-border mt-2 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Proventos</p>
                            {periodo.itens_calculados.proventos.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[11px] sm:text-xs">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="text-foreground">{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Detalhamento de Descontos se existir itens_calculados */}
                        {periodo.itens_calculados?.descontos?.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Descontos</p>
                            {periodo.itens_calculados.descontos.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[11px] sm:text-xs">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="text-red-500">-{formatCurrency(item.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {(periodo.valor_total && periodo.valor_total > 0) ? (
                          <div className="flex justify-between pt-2 border-t border-border mt-1">
                            <span className="text-muted-foreground font-bold">Líquido a Receber</span>
                            <span className="font-bold text-primary text-sm sm:text-base">
                              {formatCurrency(periodo.valor_total)}
                            </span>
                          </div>
                        ) : (periodo.valor_ferias && periodo.valor_ferias > 0) && (
                          <div className="flex justify-between pt-2 border-t border-border mt-1">
                            <span className="text-muted-foreground font-bold">Total Bruto</span>
                            <span className="font-bold text-primary text-sm sm:text-base">
                              {formatCurrency(periodo.valor_ferias)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Resposta da Empresa */}
                      {periodo.resposta_empresa && (periodo.status === 'programada' || periodo.status === 'agendada') && (
                        <div className="mt-3 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                            <span className="text-xs sm:text-sm font-medium text-green-800">Aprovado pela empresa</span>
                          </div>
                          <p className="text-xs sm:text-sm text-green-700">{periodo.resposta_empresa}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Férias Reprovadas */}
            {feriasReprovadas.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  Solicitações Reprovadas ({feriasReprovadas.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {feriasReprovadas.map((periodo) => (
                    <Card key={periodo.id} className="p-3 sm:p-4 border-red-200 bg-red-50/30">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {periodo.periodo_aquisitivo}º Período
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Solicitação reprovada
                          </p>
                        </div>
                        <span className={`self-start px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${getStatusColor(periodo.status)}`}>
                          {getStatusIcon(periodo.status)}
                          {getStatusLabel(periodo.status)}
                        </span>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Período Solicitado</span>
                          <span className="font-medium text-foreground">
                            {formatDate(periodo.periodo1_inicio)} - {formatDate(periodo.periodo1_fim)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dias</span>
                          <span className="font-medium text-foreground">
                            {periodo.dias_gozados || 30} dias
                          </span>
                        </div>
                      </div>

                      {periodo.resposta_empresa && (
                        <div className="mt-3 p-2.5 sm:p-3 bg-red-100 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                            <span className="text-xs sm:text-sm font-medium text-red-800">Motivo da Reprovação</span>
                          </div>
                          <p className="text-xs sm:text-sm text-red-700">{periodo.resposta_empresa}</p>
                        </div>
                      )}

                      {temPedidoPendente ? (
                        <div className="mt-3 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-amber-700">
                              Aguarde a análise da solicitação atual.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="secondary" 
                          className="w-full mt-3 text-xs sm:text-sm py-2"
                          onClick={() => handleSolicitarFerias(periodo)}
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          Nova Solicitação
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico */}
            {feriasHistorico.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Histórico ({feriasHistorico.length})
                </h2>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Período
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Data Gozo
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Dias
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Valor
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {feriasHistorico.map((periodo) => (
                          <tr key={periodo.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 text-sm text-foreground">
                              {periodo.periodo_aquisitivo}º Período
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {formatDate(periodo.data_inicio_gozo)} - {formatDate(periodo.data_fim_gozo)}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {periodo.dias_gozados || 30}
                            </td>
                             <td className="px-4 py-3 text-sm font-medium text-foreground">
                              {periodo.valor_total && periodo.valor_total > 0 ? formatCurrency(periodo.valor_total) : '-'}
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

        {/* Info Card */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-2">Informações sobre Férias</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• O seu período aquisitivo é de 12 meses trabalhados, contados a partir de {getDataAdmissaoFormatada()}</li>
            <li>• Você tem até 12 meses após o período aquisitivo para gozar as férias, ou seja, a empresa tem até o dia {getDataLimiteConcessao()} para conceder as suas férias</li>
            <li>• As férias podem ser fracionadas em até 3 períodos</li>
            <li>• Um dos períodos deve ter no mínimo 14 dias corridos</li>
            <li>• Para solicitar férias, envie mensagem pelo aplicativo informando o período pretendido</li>
          </ul>
        </Card>
      </div>

      {/* Modal de Solicitação de Férias */}
      {funcionario && periodoSelecionado && (
        <VacationRequestModal
          isOpen={showSolicitacao}
          onClose={handleCloseSolicitacao}
          onSave={handleSaveSolicitacao}
          funcionario={{
            id: funcionario.id,
            nome_completo: funcionario.nome_completo,
            data_admissao: funcionario.data_admissao
          }}
          periodoAquisitivo={periodoSelecionado}
        />
      )}
    </PortalLayout>
  );
};

export default PortalFerias;
