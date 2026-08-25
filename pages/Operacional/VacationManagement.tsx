import React, { useState, useEffect, useMemo } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import {
  Calendar,
  Users,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  Inbox,
  
} from "lucide-react";
import { useFuncionariosAtivos, useCargos } from "../../hooks/useSupabase";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { usePermissions } from "../../hooks/usePermissions";
import VacationFormModal from "../../components/VacationFormModal";
import VacationCalendarView from "../../components/VacationCalendarView";
import VacationApprovalModal from "../../components/VacationApprovalModal";

import { sincronizarStatusFerias, calcularStatusCorreto, getStatusConfig, STATUS_PROGRAMADOS, STATUS_GOZADOS } from "../../utils/feriasStatus";

// Tipos
interface Ferias {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo: number;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_concessivo: string;
  status:
    | "pendente"
    | "programada"
    | "em_andamento"
    | "gozada"
    | "vencida"
    | "solicitado"
    | "reprovada"
    | "agendada"
    | "aprovada";
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  dias_gozados: number;
  fracionamento: number;
  total_fracoes: number;
  salario_base_calculo: number;
  valor_ferias: number;
  valor_terco: number;
  valor_total: number;
  dias_abono: number;
  valor_abono: number;
  observacoes: string | null;
  resposta_empresa: string | null;
  periodo1_inicio: string | null;
  periodo1_fim: string | null;
  periodo2_inicio: string | null;
  periodo2_fim: string | null;
  periodo3_inicio: string | null;
  periodo3_fim: string | null;
  created_at: string;
  updated_at: string;
}

interface FeriasComFuncionario extends Ferias {
  funcionario?: {
    id: string;
    nome_completo: string;
    data_admissao: string;
    nome_empresa?: string;
    nome_cargo?: string;
    nome_posto?: string;
  };
}

interface PeriodoAquisitivo {
  funcionario_id: string;
  nome_funcionario: string;
  data_admissao: string;
  empresa?: string;
  cargo?: string;
  posto?: string;
  periodo: number;
  data_inicio: Date;
  data_fim: Date;
  data_limite: Date;
  dias_restantes: number;
  status: "disponivel" | "proximo" | "vencido" | "gozado" | "programado" | "em_andamento";
  ferias?: Ferias;
}

const VacationManagement: React.FC = () => {
  const { data: funcionarios, loading: loadingFuncionarios } = useFuncionariosAtivos();
  const { data: cargos } = useCargos();
  const { showToast } = useToast();
  const { canCrudVacation } = usePermissions();

  // Estados
  const [activeTab, setActiveTab] = useState("solicitacoes");
  const [ferias, setFerias] = useState<FeriasComFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("todas");

  // Filtros para solicitações
  const [filterSolicitacaoEmpresa, setFilterSolicitacaoEmpresa] = useState<string>("todas");
  const [filterSolicitacaoCargo, setFilterSolicitacaoCargo] = useState<string>("todos");
  const [filterSolicitacaoStatus, setFilterSolicitacaoStatus] = useState<string>("todas");
  const [searchSolicitacao, setSearchSolicitacao] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingFerias, setEditingFerias] = useState<FeriasComFuncionario | null>(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);

  // Calendário
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Modal de aprovação
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<FeriasComFuncionario | null>(null);

  // Carregar férias do banco
  const carregarFerias = async () => {
    try {
      setLoading(true);

      // Sincronizar status desatualizados antes de carregar
      await sincronizarStatusFerias();

      const { data, error } = await supabase
        .from("ferias")
        .select("*")
        .order("data_limite_concessivo", { ascending: true });

      if (error) throw error;

      // Associar funcionários
      const feriasComFuncionario = (data || []).map((f) => {
        const func = funcionarios?.find((func) => func.id === f.funcionario_id);
        return {
          ...f,
          funcionario: func
            ? {
                id: func.id,
                nome_completo: func.nome_completo,
                data_admissao: func.data_admissao,
                nome_empresa: func.nome_empresa,
                nome_cargo: func.nome_cargo,
                nome_posto: func.nome_posto,
              }
            : undefined,
        };
      });

      setFerias(feriasComFuncionario);
    } catch (error) {
      showToast("Erro ao carregar dados de férias", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (funcionarios && funcionarios.length > 0) {
      carregarFerias();
    }
  }, [funcionarios]);

  // Calcular períodos aquisitivos de todos os funcionários
  const periodosAquisitivos = useMemo(() => {
    if (!funcionarios) return [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const periodos: PeriodoAquisitivo[] = [];

    for (const funcionario of funcionarios) {
      // Ignorar funcionários sem data de admissão, demitidos ou inativos
      if (!funcionario.data_admissao || funcionario.demitido || !funcionario.ativo) continue;

      const dataAdmissao = new Date(funcionario.data_admissao + "T00:00:00");
      const anosDesdeAdmissao = Math.floor((hoje.getTime() - dataAdmissao.getTime()) / (1000 * 60 * 60 * 24 * 365));

      // Calcular cada período aquisitivo
      for (let periodo = 1; periodo <= anosDesdeAdmissao + 1; periodo++) {
        const dataInicio = new Date(dataAdmissao);
        dataInicio.setFullYear(dataAdmissao.getFullYear() + (periodo - 1));

        const dataFim = new Date(dataAdmissao);
        dataFim.setFullYear(dataAdmissao.getFullYear() + periodo);
        dataFim.setDate(dataFim.getDate() - 1);

        // Se o período ainda não completou, não mostrar
        if (dataFim > hoje) continue;

        const dataLimite = new Date(dataFim);
        dataLimite.setFullYear(dataLimite.getFullYear() + 1);

        const diffTime = dataLimite.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Verificar se existe registro de férias para este período
        const feriasRegistrada = ferias.find(
          (f) => f.funcionario_id === funcionario.id && f.periodo_aquisitivo === periodo,
        );

        let status: PeriodoAquisitivo["status"] = "disponivel";
        if (feriasRegistrada) {
          const statusEfetivo = calcularStatusCorreto(feriasRegistrada as any) ?? feriasRegistrada.status;

          if (statusEfetivo === "gozada") {
            status = "gozado";
          } else if (statusEfetivo === "em_andamento") {
            status = "em_andamento";
          } else if (
            [...STATUS_PROGRAMADOS, 'pendente', 'aprovada', 'agendada', 'programada'].includes(statusEfetivo) &&
            (feriasRegistrada.data_inicio_gozo || feriasRegistrada.periodo1_inicio)
          ) {
            status = "programado";
          }
        } else if (diasRestantes <= 0) {
          status = "vencido";
        } else if (diasRestantes <= 30) {
          status = "proximo";
        }

        periodos.push({
          funcionario_id: funcionario.id,
          nome_funcionario: funcionario.nome_completo,
          data_admissao: funcionario.data_admissao,
          empresa: funcionario.nome_empresa,
          cargo: funcionario.nome_cargo,
          posto: funcionario.nome_posto,
          periodo,
          data_inicio: dataInicio,
          data_fim: dataFim,
          data_limite: dataLimite,
          dias_restantes: diasRestantes,
          status,
          ferias: feriasRegistrada,
        });
      }
    }

    return periodos;
  }, [funcionarios, ferias]);

  // Filtrar períodos
  const periodosFiltrados = useMemo(() => {
    return periodosAquisitivos.filter((p) => {
      const matchSearch = p.nome_funcionario.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "todos" || p.status === filterStatus;
      const matchEmpresa = filterEmpresa === "todas" || p.empresa === filterEmpresa;
      return matchSearch && matchStatus && matchEmpresa;
    });
  }, [periodosAquisitivos, searchTerm, filterStatus, filterEmpresa]);

  // Agrupar por funcionário
  const periodosPorFuncionario = useMemo(() => {
    const grouped: { [key: string]: PeriodoAquisitivo[] } = {};
    periodosFiltrados.forEach((p) => {
      if (!grouped[p.funcionario_id]) {
        grouped[p.funcionario_id] = [];
      }
      grouped[p.funcionario_id].push(p);
    });
    return grouped;
  }, [periodosFiltrados]);

  // Solicitações filtradas (todas, pendentes, aprovadas, reprovadas) com filtros
  const solicitacoesFiltradas = useMemo(() => {
    return ferias.filter((f) => {
      // Só mostrar registros que são solicitações (não períodos pendentes de agendamento)
      const statusValidos = ["solicitado", "programada", "aprovada", "reprovada", "agendada"];
      if (!statusValidos.includes(f.status) && f.status !== "gozada" && f.status !== "em_andamento") {
        // Se não tem resposta_empresa e não é um dos status de solicitação, ignorar
        if (!f.resposta_empresa && f.status === "pendente") return false;
      }

      // Filtro por status
      if (filterSolicitacaoStatus !== "todas") {
        if (filterSolicitacaoStatus === "pendentes" && f.status !== "solicitado") return false;
        if (
          filterSolicitacaoStatus === "aprovadas" &&
          f.status !== "programada" &&
          f.status !== "agendada" &&
          f.status !== "aprovada"
        )
          return false;
        if (filterSolicitacaoStatus === "reprovadas" && f.status !== "reprovada") return false;
      } else {
        // "Todas" mostra apenas solicitações (pendentes, aprovadas, reprovadas)
        if (
          f.status !== "solicitado" &&
          f.status !== "programada" &&
          f.status !== "agendada" &&
          f.status !== "aprovada" &&
          f.status !== "reprovada"
        )
          return false;
      }

      // Filtro por busca
      if (searchSolicitacao && !f.funcionario?.nome_completo?.toLowerCase().includes(searchSolicitacao.toLowerCase())) {
        return false;
      }

      // Filtro por empresa
      if (filterSolicitacaoEmpresa !== "todas" && f.funcionario?.nome_empresa !== filterSolicitacaoEmpresa) {
        return false;
      }

      // Filtro por cargo
      if (filterSolicitacaoCargo !== "todos" && f.funcionario?.nome_cargo !== filterSolicitacaoCargo) {
        return false;
      }

      return true;
    });
  }, [ferias, searchSolicitacao, filterSolicitacaoEmpresa, filterSolicitacaoCargo, filterSolicitacaoStatus]);

  // Total de solicitações (sem filtro, para o badge)
  const totalSolicitacoes = useMemo(() => {
    return ferias.filter((f) => f.status === "solicitado").length;
  }, [ferias]);

  // Lista de cargos para filtro
  const cargosList = useMemo(() => {
    const set = new Set<string>();
    funcionarios?.forEach((f) => {
      if (f.nome_cargo) set.add(f.nome_cargo);
    });
    return Array.from(set).sort();
  }, [funcionarios]);

  // Estatísticas
  const stats = useMemo(() => {
    const vencidas = periodosAquisitivos.filter((p) => p.status === "vencido").length;
    const proximas = periodosAquisitivos.filter((p) => p.status === "proximo").length;
    // Contar aprovadas: férias com status aprovada, programada ou agendada
    const aprovadas = ferias.filter((f) => 
      f.status === "programada" || f.status === "aprovada" || f.status === "agendada"
    ).length;
    const disponiveis = periodosAquisitivos.filter((p) => p.status === "disponivel").length;
    const solicitadas = totalSolicitacoes;
    return { vencidas, proximas, aprovadas, disponiveis, solicitadas };
  }, [periodosAquisitivos, ferias, totalSolicitacoes]);

  // Lista de empresas para filtro
  const empresas = useMemo(() => {
    const set = new Set<string>();
    funcionarios?.forEach((f) => {
      if (f.nome_empresa) set.add(f.nome_empresa);
    });
    return Array.from(set).sort();
  }, [funcionarios]);

  // Handlers
  const handleProgramarFerias = (periodo: PeriodoAquisitivo) => {
    setSelectedFuncionario(periodo.funcionario_id);
    setSelectedPeriodo(periodo.periodo);
    setEditingFerias(periodo.ferias || null);
    setShowModal(true);
  };

  const handleEditFerias = (ferias: FeriasComFuncionario) => {
    setEditingFerias(ferias);
    setSelectedFuncionario(ferias.funcionario_id);
    setSelectedPeriodo(ferias.periodo_aquisitivo);
    setShowModal(true);
  };

  const handleDeleteFerias = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de férias?")) return;

    try {
      const { error } = await supabase.from("ferias").delete().eq("id", id);
      if (error) throw error;
      showToast("Registro de férias excluído", "success");
      carregarFerias();
    } catch (error) {
      showToast("Erro ao excluir registro", "error");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFerias(null);
    setSelectedFuncionario(null);
    setSelectedPeriodo(null);
  };

  const handleSaveFerias = async () => {
    await carregarFerias();
    handleCloseModal();
  };

  // Handlers para modal de aprovação
  const handleOpenApprovalModal = (solicitacao: FeriasComFuncionario) => {
    setSelectedSolicitacao(solicitacao);
    setShowApprovalModal(true);
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedSolicitacao(null);
  };

  const handleSaveApproval = async () => {
    await carregarFerias();
    handleCloseApprovalModal();
    showToast("Solicitação processada com sucesso!", "success");
  };

  // Gerar períodos aquisitivos para todos os funcionários
  const gerarPeriodosAquisitivos = async () => {
    if (!funcionarios || funcionarios.length === 0) {
      showToast("Nenhum funcionário encontrado", "error");
      return;
    }

    try {
      setLoading(true);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let periodosInseridos = 0;
      let periodosExistentes = 0;

      for (const funcionario of funcionarios) {
        // Ignorar funcionários sem data de admissão, demitidos ou inativos
        if (!funcionario.data_admissao || funcionario.demitido || !funcionario.ativo) continue;

        const dataAdmissao = new Date(funcionario.data_admissao + "T00:00:00");
        let periodoNum = 1;
        let inicioAquisitivo = new Date(dataAdmissao);

        while (true) {
          // Fim do período aquisitivo = 12 meses após o início
          const fimAquisitivo = new Date(inicioAquisitivo);
          fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);
          fimAquisitivo.setDate(fimAquisitivo.getDate() - 1);

          // Só processar períodos já adquiridos (fim aquisitivo <= hoje)
          if (fimAquisitivo > hoje) break;

          // Data limite concessivo = 12 meses após o fim do período aquisitivo
          const limiteConcessivo = new Date(fimAquisitivo);
          limiteConcessivo.setFullYear(limiteConcessivo.getFullYear() + 1);

          // Verificar se já existe registro para este período
          const existente = ferias.find(
            (f) => f.funcionario_id === funcionario.id && f.periodo_aquisitivo === periodoNum,
          );

          if (!existente) {
            // Inserir novo período
            const { error } = await supabase.from("ferias").insert({
              funcionario_id: funcionario.id,
              periodo_aquisitivo: periodoNum,
              data_inicio_aquisitivo: inicioAquisitivo.toISOString().split("T")[0],
              data_fim_aquisitivo: fimAquisitivo.toISOString().split("T")[0],
              data_limite_concessivo: limiteConcessivo.toISOString().split("T")[0],
              dias_gozados: 30,
              status: "pendente",
              fracionamento: 1,
              total_fracoes: 1,
              dias_abono: 0,
            });

            if (error) {
            } else {
              periodosInseridos++;
            }
          } else {
            periodosExistentes++;
          }

          // Próximo período
          inicioAquisitivo = new Date(fimAquisitivo);
          inicioAquisitivo.setDate(inicioAquisitivo.getDate() + 1);
          periodoNum++;

          // Limitar a 10 períodos por funcionário
          if (periodoNum > 10) break;
        }
      }

      await carregarFerias();
      showToast(`${periodosInseridos} períodos gerados. ${periodosExistentes} já existentes.`, "success");
    } catch (error) {
      showToast("Erro ao gerar períodos aquisitivos", "error");
    } finally {
      setLoading(false);
    }
  };

  // Formatadores
  const formatarData = (data: string | Date) => {
    const d = typeof data === "string" ? new Date(data + "T00:00:00") : data;
    return d.toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusBadge = (status: PeriodoAquisitivo["status"]) => {
    const badges = {
      vencido:      { bg: "bg-red-100",    text: "text-red-800",    label: "Vencido" },
      proximo:      { bg: "bg-yellow-100", text: "text-yellow-800", label: "Próximo ao Limite" },
      disponivel:   { bg: "bg-green-100",  text: "text-green-800",  label: "Disponível" },
      programado:   { bg: "bg-blue-100",   text: "text-blue-800",   label: "Programado" },
      em_andamento: { bg: "bg-green-200",  text: "text-green-900",  label: "Em andamento" },
      gozado:       { bg: "bg-gray-100",   text: "text-gray-800",   label: "Usufruído" },
    };
    const badge = badges[status] ?? badges.disponivel;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
    );
  };

  if (loadingFuncionarios || loading) {
    return (
      <div className="p-3 sm:p-6">
        <Card>
          <div className="p-4 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base text-gray-600">Carregando dados de férias...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="responsive-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            Gestão de Férias
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Controle e programação de férias dos funcionários
          </p>
        </div>
        {canCrudVacation() && (
          <Button
            onClick={gerarPeriodosAquisitivos}
            disabled={loading}
            className="flex items-center gap-2 w-full sm:w-auto text-sm"
          >
            <Plus className="w-4 h-4" />
            Gerar Períodos
          </Button>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
          onClick={() => { setFilterStatus("vencido"); setActiveTab("funcionarios"); }}
        >
          <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.vencidas}</p>
              <p className="text-xs sm:text-sm text-gray-600">Vencidas</p>
            </div>
          </div>
        </Card>
        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
          onClick={() => { setFilterStatus("proximo"); setActiveTab("funcionarios"); }}
        >
          <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.proximas}</p>
              <p className="text-xs sm:text-sm text-gray-600">Próximas</p>
            </div>
          </div>
        </Card>
        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
          onClick={() => { setFilterStatus("programado"); setActiveTab("funcionarios"); }}
        >
          <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.aprovadas}</p>
              <p className="text-xs sm:text-sm text-gray-600">Aprovadas</p>
            </div>
          </div>
        </Card>
        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
          onClick={() => { setFilterStatus("disponivel"); setActiveTab("funcionarios"); }}
        >
          <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.disponiveis}</p>
              <p className="text-xs sm:text-sm text-gray-600">Disponíveis</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 p-1 rounded-lg flex-wrap">
          <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Solicitações{" "}
            {stats.solicitadas > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{stats.solicitadas}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="funcionarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Por Funcionário
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas ({stats.vencidas + stats.proximas})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Solicitações */}
        <TabsContent value="solicitacoes">
          <Card>
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Solicitações de Férias</h3>
                  <p className="text-sm text-gray-600">Gerencie todas as solicitações de férias dos funcionários</p>
                </div>
                {totalSolicitacoes > 0 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                    {totalSolicitacoes} {totalSolicitacoes === 1 ? "pendente" : "pendentes"}
                  </span>
                )}
              </div>

              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={searchSolicitacao}
                    onChange={(e) => setSearchSolicitacao(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterSolicitacaoStatus}
                  onChange={(e) => setFilterSolicitacaoStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="todas">Todas</option>
                  <option value="pendentes">Pendentes</option>
                  <option value="aprovadas">Aprovadas</option>
                  <option value="reprovadas">Reprovadas</option>
                </select>
                <select
                  value={filterSolicitacaoEmpresa}
                  onChange={(e) => setFilterSolicitacaoEmpresa(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas as Empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSolicitacaoCargo}
                  onChange={(e) => setFilterSolicitacaoCargo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Cargos</option>
                  {cargosList.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {solicitacoesFiltradas.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Nenhuma solicitação encontrada</p>
                  <p className="text-sm">
                    {filterSolicitacaoStatus !== "todas" ||
                    searchSolicitacao ||
                    filterSolicitacaoEmpresa !== "todas" ||
                    filterSolicitacaoCargo !== "todos"
                      ? "Tente ajustar os filtros"
                      : "Ainda não há solicitações de férias registradas"}
                  </p>
                </div>
              ) : (
                solicitacoesFiltradas.map((solicitacao) => {
                  // Badge de status
                  const getStatusBadge = () => {
                    if (solicitacao.status === "solicitado") {
                      return (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Aguardando Análise
                        </span>
                      );
                    } else if (
                      solicitacao.status === "programada" ||
                      solicitacao.status === "agendada" ||
                      solicitacao.status === "aprovada"
                    ) {
                      return (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Aprovada
                        </span>
                      );
                    } else if (solicitacao.status === "reprovada") {
                      return (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Reprovada
                        </span>
                      );
                    }
                    return null;
                  };

                  return (
                    <div key={solicitacao.id} className="p-4 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">
                              {solicitacao.funcionario?.nome_completo || "Funcionário não encontrado"}
                            </h4>
                            {getStatusBadge()}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">Período Aquisitivo:</span> {solicitacao.periodo_aquisitivo}º
                              ({formatarData(solicitacao.data_inicio_aquisitivo)} -{" "}
                              {formatarData(solicitacao.data_fim_aquisitivo)})
                            </p>
                            <p>
                              <span className="font-medium">Período Solicitado:</span>{" "}
                              {solicitacao.periodo1_inicio && solicitacao.periodo1_fim ? (
                                <>
                                  {formatarData(solicitacao.periodo1_inicio)} - {formatarData(solicitacao.periodo1_fim)}
                                  {solicitacao.periodo2_inicio &&
                                    ` + ${formatarData(solicitacao.periodo2_inicio)} - ${formatarData(solicitacao.periodo2_fim || '')}`}
                                  {solicitacao.periodo3_inicio &&
                                    ` + ${formatarData(solicitacao.periodo3_inicio)} - ${formatarData(solicitacao.periodo3_fim || '')}`}
                                </>
                              ) : solicitacao.data_inicio_gozo && solicitacao.data_fim_gozo ? (
                                `${formatarData(solicitacao.data_inicio_gozo)} - ${formatarData(solicitacao.data_fim_gozo)}`
                              ) : (
                                "-"
                              )}
                            </p>
                            <p>
                              <span className="font-medium">Total de Dias:</span> {solicitacao.dias_gozados} dias
                              {solicitacao.dias_abono > 0 && ` + ${solicitacao.dias_abono} dias de abono`}
                            </p>
                            {solicitacao.funcionario?.nome_cargo && (
                              <p className="text-gray-500">
                                {solicitacao.funcionario.nome_cargo} • {solicitacao.funcionario.nome_empresa}
                              </p>
                            )}
                            {/* Mostrar resposta da empresa para aprovadas/reprovadas */}
                            {solicitacao.resposta_empresa &&
                              (solicitacao.status === "reprovada" ||
                                solicitacao.status === "programada" ||
                                solicitacao.status === "agendada" ||
                                solicitacao.status === "aprovada") && (
                                <div
                                  className={`mt-2 p-2 rounded-lg text-sm ${
                                    solicitacao.status === "reprovada"
                                      ? "bg-red-50 border border-red-200 text-red-700"
                                      : "bg-green-50 border border-green-200 text-green-700"
                                  }`}
                                >
                                  <span className="font-medium">Resposta: </span>
                                  {solicitacao.resposta_empresa}
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {solicitacao.status === "solicitado" ? (
                            <Button
                              variant="primary"
                              onClick={() => handleOpenApprovalModal(solicitacao)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Analisar
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => handleOpenApprovalModal(solicitacao)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalhes
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() => handleDeleteFerias(solicitacao.id)}
                            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Por Funcionário */}
        <TabsContent value="funcionarios">
          <Card>
            {/* Filtros */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="vencido">Vencidas</option>
                  <option value="proximo">Próximas ao Limite</option>
                  <option value="disponivel">Disponíveis</option>
                  <option value="programado">Programadas</option>
                  <option value="gozado">Tiradas</option>
                </select>
                <select
                  value={filterEmpresa}
                  onChange={(e) => setFilterEmpresa(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas as Empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista de Funcionários */}
            <div className="divide-y divide-gray-200">
              {Object.entries(periodosPorFuncionario).length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum período aquisitivo encontrado</p>
                </div>
              ) : (
                Object.entries(periodosPorFuncionario).map(([funcId, periodos]) => {
                  const primeiroP = periodos[0];
                  return (
                    <div key={funcId} className="p-4">
                      {/* Cabeçalho do Funcionário */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{primeiroP.nome_funcionario}</h3>
                          <p className="text-sm text-gray-500">
                            {primeiroP.cargo} • {primeiroP.empresa} • Admissão: {formatarData(primeiroP.data_admissao)}
                          </p>
                        </div>
                      </div>

                      {/* Períodos do Funcionário */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {periodos.map((periodo) => (
                          <div
                            key={`${periodo.funcionario_id}-${periodo.periodo}`}
                            className={`p-3 rounded-lg border ${
                              periodo.status === "vencido"
                                ? "border-red-200 bg-red-50"
                                : periodo.status === "proximo"
                                  ? "border-yellow-200 bg-yellow-50"
                                  : periodo.status === "em_andamento"
                                    ? "border-green-400 bg-green-50"
                                    : periodo.status === "programado"
                                      ? "border-blue-200 bg-blue-50"
                                      : periodo.status === "gozado"
                                        ? "border-gray-200 bg-gray-50"
                                        : "border-green-200 bg-green-50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-gray-900">{periodo.periodo}º Período</span>
                              {getStatusBadge(periodo.status)}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">Aquisitivo:</span> {formatarData(periodo.data_inicio)} -{" "}
                                {formatarData(periodo.data_fim)}
                              </p>
                              <p>
                                <span className="font-medium">Limite:</span> {formatarData(periodo.data_limite)}
                              </p>
                              {periodo.status !== "gozado" && periodo.status !== "programado" && periodo.status !== "em_andamento" && (
                                <p
                                  className={`font-semibold ${
                                    periodo.dias_restantes <= 0
                                      ? "text-red-600"
                                      : periodo.dias_restantes <= 30
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                  }`}
                                >
                                  {periodo.dias_restantes <= 0
                                    ? `Vencido há ${Math.abs(periodo.dias_restantes)} dias`
                                    : `${periodo.dias_restantes} dias restantes`}
                                </p>
                              )}
                              {periodo.ferias?.data_inicio_gozo && (
                                <p className="text-blue-600 font-medium">
                                  Período: {formatarData(periodo.ferias.data_inicio_gozo)} -{" "}                           {formatarData(periodo.ferias.data_fim_gozo!)}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 flex gap-2">
                              {periodo.status !== "gozado" && (
                                <Button
                                  variant={periodo.ferias ? "secondary" : "primary"}
                                  onClick={() => handleProgramarFerias(periodo)}
                                >
                                  {periodo.ferias ? "Editar" : "Programar"}
                                </Button>
                              )}
                              {periodo.ferias && (
                                <Button variant="secondary" onClick={() => handleDeleteFerias(periodo.ferias!.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Calendário */}
        <TabsContent value="calendario">
          <VacationCalendarView
            ferias={ferias}
            funcionarios={funcionarios || []}
            month={calendarMonth}
            year={calendarYear}
            onMonthChange={setCalendarMonth}
            onYearChange={setCalendarYear}
            onEditFerias={handleEditFerias as any}
          />
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas">
          <Card>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Períodos que Requerem Atenção</h3>
              <p className="text-sm text-gray-600">Férias vencidas ou próximas ao vencimento</p>
            </div>

            <div className="divide-y divide-gray-200">
              {periodosAquisitivos
                .filter((p) => p.status === "vencido" || p.status === "proximo")
                .sort((a, b) => a.dias_restantes - b.dias_restantes)
                .map((periodo) => (
                  <div
                    key={`${periodo.funcionario_id}-${periodo.periodo}`}
                    className={`p-4 ${periodo.status === "vencido" ? "bg-red-50" : "bg-yellow-50"}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${periodo.status === "vencido" ? "bg-red-100" : "bg-yellow-100"}`}
                        >
                          <AlertTriangle
                            className={`w-5 h-5 ${periodo.status === "vencido" ? "text-red-600" : "text-yellow-600"}`}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{periodo.nome_funcionario}</h4>
                          <p className="text-sm text-gray-600">
                            {periodo.periodo}º Período • {periodo.cargo} • {periodo.empresa}
                          </p>
                          <p className="text-sm text-gray-600">Limite: {formatarData(periodo.data_limite)}</p>
                          <p
                            className={`text-sm font-semibold ${
                              periodo.status === "vencido" ? "text-red-600" : "text-yellow-600"
                            }`}
                          >
                            {periodo.dias_restantes <= 0
                              ? `⚠️ Vencido há ${Math.abs(periodo.dias_restantes)} dias`
                              : `⏰ Faltam ${periodo.dias_restantes} dias`}
                          </p>
                        </div>
                      </div>
                      <Button variant="primary" onClick={() => handleProgramarFerias(periodo)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Programar Férias
                      </Button>
                    </div>
                  </div>
                ))}

              {periodosAquisitivos.filter((p) => p.status === "vencido" || p.status === "proximo").length === 0 && (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Nenhum alerta no momento</h3>
                  <p className="text-gray-600">Todos os períodos aquisitivos estão em dia!</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modal de Programação/Edição */}
      {showModal && selectedFuncionario && selectedPeriodo && (
        <VacationFormModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onSave={handleSaveFerias}
          funcionarioId={selectedFuncionario}
          periodoAquisitivo={selectedPeriodo}
          funcionarios={funcionarios || []}
          cargos={cargos || []}
          feriasExistente={editingFerias}
        />
      )}

      {/* Modal de Aprovação de Solicitação */}
      {showApprovalModal && selectedSolicitacao && (
        <VacationApprovalModal
          isOpen={showApprovalModal}
          onClose={handleCloseApprovalModal}
          onSave={handleSaveApproval}
          solicitacao={selectedSolicitacao}
        />
      )}
    </div>
  );
};

export default VacationManagement;
