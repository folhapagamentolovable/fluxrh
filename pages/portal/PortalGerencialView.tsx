import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { normalizarFolhaCalculada } from '../../utils/normalizarFolhaCalculada';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  ArrowLeft, FileText, Calendar, Umbrella, AlertCircle, 
  Clock, DollarSign, User, Building2, Briefcase, Eye, MessageSquare, TrendingUp
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_admissao: string;
  ativo: boolean;
  nome_cargo: string | null;
  nome_empresa: string | null;
  nome_posto: string | null;
  cargo?: { nome_cargo: string; salario_base: number } | null;
  empresa?: { nome_empresa: string } | null;
  posto_trabalho?: { nome_posto: string } | null;
  funcionario_registrado: boolean;
}

const PortalGerencialView: React.FC = () => {
  const { funcionarioId } = useParams<{ funcionarioId: string }>();
  const navigate = useNavigate();
  const { isAdminOrManager } = useAuth();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    ultimoHolerite: null as any,
    proximaEscala: null as any,
    feriasPendentes: 0,
    diasAteFerias: null as number | null,
    totalMensagens: 0,
    mensagensPendentes: 0
  });

  useEffect(() => {
    if (!isAdminOrManager) {
      navigate('/');
      return;
    }
    loadFuncionario();
  }, [funcionarioId, isAdminOrManager]);

  const loadFuncionario = async () => {
    if (!funcionarioId) return;

    setLoading(true);
    try {
      // Carregar funcionário
      const { data: func, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .eq('id', funcionarioId)
        .single();

      if (funcError) throw funcError;
      if (!func) {
        setError('Funcionário não encontrado');
        return;
      }

      setFuncionario(func);
      await loadStats(funcionarioId);
    } catch (err) {
      setError('Erro ao carregar dados do funcionário');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (funcId: string) => {
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      // Buscar configuração de visibilidade do portal (mês limite)
      const { data: visConfig } = await supabase
        .from('portal_visibility_config')
        .select('*')
        .eq('tipo_documento', 'holerites')
        .single();

      let ultimoHoleriteData = null;
      if (visConfig && visConfig.ativo) {
        // Buscar holerite do mês limite configurado
        const { data: holerites } = await supabase
          .from('folha_calculada')
          .select('*')
          .eq('funcionario_id', funcId)
          .lte('ano', visConfig.ano_limite)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false });

        // Filtrar apenas até o mês/ano limite
        ultimoHoleriteData = holerites?.find(h => 
          h.ano < visConfig.ano_limite || 
          (h.ano === visConfig.ano_limite && h.mes <= visConfig.mes_limite)
        ) || null;
      } else {
        // Sem config, pegar o último disponível
        const { data: holerites } = await supabase
          .from('folha_calculada')
          .select('*')
          .eq('funcionario_id', funcId)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
          .limit(1);
        ultimoHoleriteData = holerites?.[0] || null;
      }

      // Último holerite
      const ultimoHolerite = ultimoHoleriteData ? normalizarFolhaCalculada(ultimoHoleriteData) : null;

      // Escalas
      const { data: escalas } = await supabase
        .from('escala_mensal')
        .select('*')
        .eq('funcionario_id', funcId)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      // Férias
      const { data: ferias } = await supabase
        .from('ferias')
        .select('*')
        .eq('funcionario_id', funcId);

      // Mensagens/Sugestões
      const { data: mensagens } = await supabase
        .from('sugestoes_reclamacoes')
        .select('*')
        .eq('funcionario_id', funcId);

      // ultimoHolerite already set above
      const proximaEscala = escalas?.find(e => 
        (e.ano === anoAtual && e.mes >= mesAtual) || e.ano > anoAtual
      ) || escalas?.[0];
      const feriasPendentes = ferias?.filter(f => f.status === 'pendente').length || 0;
      const proximasFerias = ferias?.find(f => f.data_inicio_gozo && new Date(f.data_inicio_gozo) > hoje);
      const diasAteFerias = proximasFerias?.data_inicio_gozo 
        ? Math.ceil((new Date(proximasFerias.data_inicio_gozo).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      const totalMensagens = mensagens?.length || 0;
      const mensagensPendentes = mensagens?.filter(m => 
        m.status === 'pendente' || (m.resposta_empresa && !m.data_resposta)
      ).length || 0;

      setStats({ 
        ultimoHolerite, 
        proximaEscala, 
        feriasPendentes, 
        diasAteFerias,
        totalMensagens,
        mensagensPendentes
      });
    } catch (err) {
    }
  };

  const formatMesAno = (mes: number, ano: number) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[mes - 1]}/${ano}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !funcionario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error || 'Funcionário não encontrado'}</p>
          <Button onClick={() => navigate('/portal-gerencial')}>
            Voltar ao Portal Gerencial
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4 md:p-6 pt-20 md:pt-24">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header com banner de modo gerencial */}
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Modo Gerencial - Visualizando portal de: <strong>{funcionario.nome_completo}</strong>
            </span>
          </div>
          <Button
            onClick={() => navigate('/portal-gerencial')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>

        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Portal do Funcionário
              </h1>
              <p className="text-gray-600">{funcionario.nome_completo}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                {funcionario.nome_cargo && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {funcionario.nome_cargo}
                  </span>
                )}
                {funcionario.nome_empresa && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {funcionario.nome_empresa}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Holerites */}
          <Link to={`/portal-gerencial/funcionario/${funcionarioId}/holerites`}>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-100">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Holerites</p>
                  <p className="text-xl font-bold text-gray-800">
                    Ver contracheques
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Férias Pendentes */}
          <Link to={`/portal-gerencial/funcionario/${funcionarioId}/ferias`}>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-purple-100">
                  <Umbrella className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Férias Pendentes</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.feriasPendentes} período(s)
                  </p>
                  {stats.diasAteFerias !== null && (
                    <p className="text-xs text-gray-500">
                      Próximas em {stats.diasAteFerias} dias
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Link>

          {/* Banco de Horas */}
          <Link to="/banco-de-horas">
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-teal-100">
                  <TrendingUp className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Banco de Horas</p>
                  <p className="text-xl font-bold text-gray-800">
                    Ver saldo
                  </p>
                  <p className="text-xs text-gray-500">
                    Horas extras acumuladas
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to={`/portal-gerencial/funcionario/${funcionarioId}/escalas`}>
            <Card className="p-6 hover:border-blue-500 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Escalas</h3>
                  <p className="text-sm text-gray-500">
                    Ver escala de trabalho
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={`/portal-gerencial/funcionario/${funcionarioId}/ferias`}>
            <Card className="p-6 hover:border-purple-500 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <Umbrella className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Férias</h3>
                  <p className="text-sm text-gray-500">
                    Ver férias
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="p-6 hover:border-orange-500 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-orange-100 group-hover:bg-orange-200 transition-colors">
                <MessageSquare className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Mensagens</h3>
                <p className="text-sm text-gray-500">
                  {stats.totalMensagens} mensagem{stats.totalMensagens !== 1 ? 's' : ''}
                  {stats.mensagensPendentes > 0 && (
                    <span className="text-red-600 font-medium">
                      {' '}• {stats.mensagensPendentes} pendente{stats.mensagensPendentes !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-4">Informações do Funcionário</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Cargo</p>
              <p className="font-medium text-gray-800">
                {funcionario.cargo?.nome_cargo || funcionario.nome_cargo || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Empresa</p>
              <p className="font-medium text-gray-800">
                {funcionario.empresa?.nome_empresa || funcionario.nome_empresa || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Posto de Trabalho</p>
              <p className="font-medium text-gray-800">
                {funcionario.posto_trabalho?.nome_posto || funcionario.nome_posto || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Último Salário</p>
              {stats.ultimoHolerite ? (
                <>
                  <p className="font-medium text-gray-800">
                    {formatCurrency(stats.ultimoHolerite.salario_liquido)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatMesAno(stats.ultimoHolerite.mes, stats.ultimoHolerite.ano)}
                  </p>
                </>
              ) : (
                <p className="font-medium text-gray-800">Não disponível</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">Dias no Mês</p>
              {stats.proximaEscala ? (
                <>
                  <p className="font-medium text-gray-800">
                    {stats.proximaEscala.total_dias_trabalho || 0} dias
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.proximaEscala.total_dias_folga || 0} folgas
                  </p>
                </>
              ) : (
                <p className="font-medium text-gray-800">Não disponível</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">Tempo de Empresa</p>
              <p className="font-medium text-gray-800">
                {(() => {
                  const admissao = new Date(funcionario.data_admissao);
                  const hoje = new Date();
                  const anos = Math.floor((hoje.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 365));
                  const meses = Math.floor(((hoje.getTime() - admissao.getTime()) % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                  if (anos > 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
                  return `${meses} mês${meses !== 1 ? 'es' : ''}`;
                })()}
              </p>
              <p className="text-xs text-gray-500">
                Desde {new Date(funcionario.data_admissao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PortalGerencialView;
