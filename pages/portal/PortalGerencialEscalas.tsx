import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Sun, Moon, Coffee, ArrowLeft, Eye } from 'lucide-react';
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

const PortalGerencialEscalas: React.FC = () => {
  const { funcionarioId } = useParams<{ funcionarioId: string }>();
  const navigate = useNavigate();
  const { isAdminOrManager } = useAuth();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const mesAtual = currentDate.getMonth() + 1;
  const anoAtual = currentDate.getFullYear();

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    if (!isAdminOrManager) {
      navigate('/');
      return;
    }
    loadData();
  }, [funcionarioId, anoAtual, isAdminOrManager]);

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

      // Carregar escalas
      const { data: escalaData } = await supabase
        .from('escala_mensal')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('ano', anoAtual)
        .order('mes', { ascending: true });

      setEscalas(escalaData || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const escalaAtual = escalas.find(e => e.mes === mesAtual && e.ano === anoAtual);

  const parseDiasTrabalhados = (diasTrabalhados: string | null): any[] => {
    if (!diasTrabalhados) return [];
    try {
      const parsed = JSON.parse(diasTrabalhados);
      
      // Se já é um array, retornar como está
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      // Se é um objeto com chaves "dia_X", converter para array
      if (typeof parsed === 'object') {
        const diasArray = [];
        for (const key in parsed) {
          if (key.startsWith('dia_')) {
            const diaNumero = Number.parseInt(key.replace('dia_', ''), 10);
            const diaData = parsed[key];
            
            // Determinar status baseado nos dados
            let status = 'TRABALHO';
            if (diaData.feriado) {
              status = 'FERIADO';
            } else if (diaData.folga) {
              status = 'FOLGA';
            }
            
            diasArray.push({
              dia: diaNumero,
              status: status,
              entrada: diaData.entrada || null,
              saida: diaData.saida || null,
              inicio_refeicao: diaData.inicio_refeicao || null,
              termino_refeicao: diaData.termino_refeicao || null,
              noturno: false, // Pode ser calculado baseado nos horários se necessário
              feriado: diaData.feriado || false,
              folga: diaData.folga || false
            });
          }
        }
        return diasArray.sort((a, b) => a.dia - b.dia);
      }
      
      return [];
    } catch (error) {
      return [];
    }
  };

  const diasDoMes = parseDiasTrabalhados(escalaAtual?.dias_trabalhados);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getDiaInfo = (dia: number) => {
    return Array.isArray(diasDoMes) ? diasDoMes.find((d: any) => d.dia === dia) : null;
  };

  const renderCalendar = () => {
    const totalDays = getDaysInMonth(mesAtual, anoAtual);
    const firstDay = getFirstDayOfMonth(mesAtual, anoAtual);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 md:h-20"></div>);
    }

    for (let dia = 1; dia <= totalDays; dia++) {
      const diaInfo = getDiaInfo(dia);
      const isTrabalho = diaInfo?.status === 'TRABALHO';
      const isFolga = diaInfo?.status === 'FOLGA';
      const isFeriado = diaInfo?.status === 'FERIADO';
      const isHoje = dia === new Date().getDate() && 
                     mesAtual === new Date().getMonth() + 1 && 
                     anoAtual === new Date().getFullYear();

      let bgColor = 'bg-gray-100';
      let textColor = 'text-gray-500';
      let borderColor = '';

      if (isTrabalho) {
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-700';
      } else if (isFolga) {
        bgColor = 'bg-green-100';
        textColor = 'text-green-700';
      } else if (isFeriado) {
        bgColor = 'bg-amber-100';
        textColor = 'text-amber-700';
      }

      if (isHoje) {
        borderColor = 'ring-2 ring-blue-500 ring-offset-2';
      }

      days.push(
        <div
          key={dia}
          className={`h-12 md:h-20 rounded-lg p-1 md:p-2 ${bgColor} ${borderColor}
            flex flex-col items-center justify-center`}
          title={diaInfo?.observacao || diaInfo?.status}
        >
          <span className={`text-sm md:text-base font-semibold ${textColor}`}>
            {dia}
          </span>
          {diaInfo && (
            <span className="hidden md:block text-xs text-gray-500 mt-1 truncate max-w-full">
              {isTrabalho && diaInfo.entrada && (
                <span>{diaInfo.entrada.slice(0, 5)}</span>
              )}
              {isFolga && 'Folga'}
              {isFeriado && 'Feriado'}
            </span>
          )}
        </div>
      );
    }

    return days;
  };

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
              Visualizando escalas de: <strong>{funcionario.nome_completo}</strong>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Escalas de Trabalho</h1>
            <p className="text-gray-600">Visualizar escala mensal</p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-gray-800 min-w-[140px] text-center">
              {meses[mesAtual - 1]} {anoAtual}
            </span>
            <button 
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {escalaAtual && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <Sun className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {escalaAtual.total_dias_trabalho || 0}
                </p>
                <p className="text-sm text-gray-500">Dias de Trabalho</p>
              </div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <Coffee className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {escalaAtual.total_dias_folga || 0}
                </p>
                <p className="text-sm text-gray-500">Dias de Folga</p>
              </div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <Calendar className="w-6 h-6 text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {escalaAtual.total_feriados || 0}
                </p>
                <p className="text-sm text-gray-500">Feriados</p>
              </div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <Moon className="w-6 h-6 text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-gray-800">
                  {Array.isArray(diasDoMes) ? diasDoMes.filter((d: any) => d.noturno).length : 0}
                </p>
                <p className="text-sm text-gray-500">Turnos Noturnos</p>
              </div>
            </Card>
          </div>
        )}

        {/* Calendar */}
        <Card className="p-4 md:p-6">
          {!escalaAtual ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Escala não disponível
              </h3>
              <p className="text-gray-500">
                A escala para {meses[mesAtual - 1]} de {anoAtual} ainda não foi gerada.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="text-center text-sm font-medium text-gray-500 py-2">
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>

              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100"></div>
                  <span className="text-sm text-gray-500">Trabalho</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100"></div>
                  <span className="text-sm text-gray-500">Folga</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-100"></div>
                  <span className="text-sm text-gray-500">Feriado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded ring-2 ring-blue-500 ring-offset-1"></div>
                  <span className="text-sm text-gray-500">Hoje</span>
                </div>
              </div>
            </>
          )}
        </Card>

        {escalaAtual?.observacoes && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Observações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {escalaAtual.observacoes}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PortalGerencialEscalas;
