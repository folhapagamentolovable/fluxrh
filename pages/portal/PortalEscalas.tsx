import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Sun, Moon, Coffee, Sparkles } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import Card from '../../components/ui/Card';

const PortalEscalas: React.FC = () => {
  const { funcionario, loading, fetchEscalas } = useEmployeePortal();
  const [escalas, setEscalas] = useState<any[]>([]);
  const [loadingEscalas, setLoadingEscalas] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const mesAtual = currentDate.getMonth() + 1;
  const anoAtual = currentDate.getFullYear();

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    const loadData = async () => {
      if (!funcionario) return;

      setLoadingEscalas(true);
      const data = await fetchEscalas(anoAtual);
      setEscalas(data);
      setLoadingEscalas(false);
    };

    loadData();
  }, [funcionario, anoAtual]);

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

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 md:h-20"></div>);
    }

    // Days of the month
    for (let dia = 1; dia <= totalDays; dia++) {
      const diaInfo = getDiaInfo(dia);
      const isTrabalho = diaInfo?.status === 'TRABALHO';
      const isFolga = diaInfo?.status === 'FOLGA';
      const isFeriado = diaInfo?.status === 'FERIADO';
      const isHoje = dia === new Date().getDate() && 
                     mesAtual === new Date().getMonth() + 1 && 
                     anoAtual === new Date().getFullYear();

      let bgClass = 'bg-muted/30';
      let textClass = 'text-muted-foreground';
      let borderClass = '';
      let shadowClass = '';

      if (isTrabalho) {
        bgClass = 'bg-gradient-to-br from-primary/20 to-primary/10';
        textClass = 'text-primary font-semibold';
      } else if (isFolga) {
        bgClass = 'bg-gradient-to-br from-portal-secondary/20 to-green-400/10';
        textClass = 'text-portal-secondary font-semibold';
      } else if (isFeriado) {
        bgClass = 'bg-gradient-to-br from-portal-accent/20 to-amber-400/10';
        textClass = 'text-portal-accent font-semibold';
      }

      if (isHoje) {
        borderClass = 'ring-2 ring-primary ring-offset-2';
        shadowClass = 'shadow-portal';
      }

      days.push(
        <div
          key={dia}
          className={`
            h-11 sm:h-14 md:h-20 rounded-xl p-1 sm:p-2 ${bgClass} ${borderClass} ${shadowClass}
            flex flex-col items-center justify-center cursor-pointer
            hover:scale-105 transition-all duration-300
          `}
          title={diaInfo?.observacao || diaInfo?.status}
        >
          <span className={`text-xs sm:text-sm md:text-base ${textClass}`}>
            {dia}
          </span>
          {diaInfo && (
            <span className="hidden md:block text-xs text-muted-foreground mt-1 truncate max-w-full">
              {isTrabalho && diaInfo.entrada && (
                <span className="bg-primary/10 px-1.5 py-0.5 rounded text-primary text-[10px]">
                  {diaInfo.entrada.slice(0, 5)}
                </span>
              )}
              {isFolga && <span className="text-portal-secondary text-[10px]">Folga</span>}
              {isFeriado && <span className="text-portal-accent text-[10px]">Feriado</span>}
            </span>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <PortalLayout employeeName={funcionario?.nome_completo}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-portal-secondary/20"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-portal-secondary animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario?.nome_completo}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2 text-portal-secondary mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Calendário de Trabalho</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Minhas Escalas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize sua escala de trabalho mensal
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => navigateMonth(-1)}
              className="p-2.5 rounded-xl border border-border hover:bg-muted hover:border-primary/20 transition-all duration-300 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-portal-secondary/10 to-green-400/10 min-w-[180px] text-center">
              <span className="font-semibold text-foreground text-base">
                {meses[mesAtual - 1]} {anoAtual}
              </span>
            </div>
            <button 
              onClick={() => navigateMonth(1)}
              className="p-2.5 rounded-xl border border-border hover:bg-muted hover:border-primary/20 transition-all duration-300 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {escalaAtual && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <Card className="p-4 text-center border-0 shadow-card portal-card bg-gradient-to-br from-white to-primary/5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {escalaAtual.total_dias_trabalho || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Dias Trabalho</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 text-center border-0 shadow-card portal-card bg-gradient-to-br from-white to-green-500/5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-portal-secondary to-green-400 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {escalaAtual.total_dias_folga || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Dias Folga</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 text-center border-0 shadow-card portal-card bg-gradient-to-br from-white to-amber-500/5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-portal-accent to-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {escalaAtual.total_feriados || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Feriados</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 text-center border-0 shadow-card portal-card bg-gradient-to-br from-white to-purple-500/5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-portal-purple to-purple-400 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Array.isArray(diasDoMes) ? diasDoMes.filter((d: any) => d.noturno).length : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Noturnos</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Calendar */}
        <Card className="p-4 sm:p-6 border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          {loadingEscalas ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-portal-secondary/20"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-portal-secondary animate-spin"></div>
              </div>
            </div>
          ) : !escalaAtual ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Escala não disponível
              </h3>
              <p className="text-sm text-muted-foreground">
                A escala para {meses[mesAtual - 1]} de {anoAtual} ainda não foi gerada.
              </p>
            </div>
          ) : (
            <>
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, i) => (
                  <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-2 sm:hidden">
                    {dia}
                  </div>
                ))}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="hidden sm:block text-center text-sm font-semibold text-muted-foreground py-3">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {renderCalendar()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 pt-5 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10"></div>
                  <span className="text-sm text-muted-foreground">Trabalho</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-portal-secondary/20 to-green-400/10"></div>
                  <span className="text-sm text-muted-foreground">Folga</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-portal-accent/20 to-amber-400/10"></div>
                  <span className="text-sm text-muted-foreground">Feriado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg ring-2 ring-primary ring-offset-1 bg-white"></div>
                  <span className="text-sm text-muted-foreground">Hoje</span>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Observations */}
        {escalaAtual?.observacoes && (
          <Card className="p-5 border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-portal-accent"></div>
              Observações
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {escalaAtual.observacoes}
            </p>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
};

export default PortalEscalas;