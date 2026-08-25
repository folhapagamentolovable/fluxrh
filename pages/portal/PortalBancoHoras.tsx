import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import {
  calcularBancoHorasMes, somarMinutosBanco, minutesToHHMM,
  type BancoHorasDia, type RegraEscalaBase, type RegistroPontoBase
} from '../../hooks/useBancoHoras';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const PortalBancoHoras: React.FC = () => {
  const { funcionario, loading: loadingFunc } = useEmployeePortal();
  const [registrosMes, setRegistrosMes] = useState<RegistroPontoBase[]>([]);
  const [todosRegistros, setTodosRegistros] = useState<RegistroPontoBase[]>([]);
  const [regraEscala, setRegraEscala] = useState<RegraEscalaBase | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [expandedDia, setExpandedDia] = useState<string | null>(null);

  // Carregar regra de escala
  useEffect(() => {
    if (!funcionario?.codigo_escala) return;
    supabase.from('regras_escalas')
      .select('codigo_escala, horarios_segunda, horarios_terca, horarios_quarta, horarios_quinta, horarios_sexta, horarios_sabado, horarios_domingo, trabalha_segunda, trabalha_terca, trabalha_quarta, trabalha_quinta, trabalha_sexta, trabalha_sabado, trabalha_domingo')
      .eq('codigo_escala', funcionario.codigo_escala)
      .eq('ativa', true)
      .maybeSingle()
      .then(({ data }) => { if (data) setRegraEscala(data as RegraEscalaBase); });
  }, [funcionario?.codigo_escala]);

  // Carregar registros de ponto
  const carregarRegistros = useCallback(async () => {
    if (!funcionario) return;
    setLoading(true);
    const primeiroDia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const ultimoDiaStr = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;

    const [{ data: mesDados }, { data: todosDados }] = await Promise.all([
      supabase.from('folha_ponto_automatica')
        .select('funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
        .eq('funcionario_id', funcionario.id)
        .gte('data_registro', primeiroDia)
        .lte('data_registro', ultimoDiaStr)
        .order('data_registro'),
      supabase.from('folha_ponto_automatica')
        .select('funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
        .eq('funcionario_id', funcionario.id)
        .order('data_registro'),
    ]);

    setRegistrosMes(mesDados || []);
    setTodosRegistros(todosDados || []);
    setLoading(false);
  }, [funcionario, mes, ano]);

  useEffect(() => {
    if (funcionario) carregarRegistros();
  }, [funcionario, mes, ano, carregarRegistros]);

  // Calcular acumulado de todos os meses até o mês filtrado (inclusive)
  const calcularAcumulado = (): number => {
    if (!regraEscala && !funcionario?.codigo_escala) return 0;
    let total = 0;
    const dataLimite = new Date(ano, mes - 1, 31);
    let iter = new Date(ano - 2, 0, 1);
    while (iter <= dataLimite) {
      const m = iter.getMonth() + 1;
      const a = iter.getFullYear();
      const regs = todosRegistros.filter(r => r.data_registro.startsWith(`${a}-${m.toString().padStart(2, '0')}`));
      total += somarMinutosBanco(calcularBancoHorasMes({
        mes: m, ano: a, registros: regs,
        codigoEscala: funcionario?.codigo_escala || '',
        escala: regraEscala,
      }));
      iter.setMonth(iter.getMonth() + 1);
    }
    return total;
  };

  const banco: BancoHorasDia[] = calcularBancoHorasMes({
    mes, ano,
    registros: registrosMes,
    codigoEscala: funcionario?.codigo_escala || '',
    escala: regraEscala,
  });

  const totalMinutos = somarMinutosBanco(banco);
  const acumulado = calcularAcumulado();
  // Mostrar todos os dias com registro OU com saldo diferente de zero
  const diasRelevantes = banco.filter(d => d.totalMinutos !== 0 || d.entradaReal);

  if (loadingFunc) return (
    <PortalLayout>
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    </PortalLayout>
  );

  return (
    <PortalLayout employeeName={funcionario?.nome_completo}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-500" /> Banco de Horas
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe seu saldo de horas</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Select label="Mês" value={mes.toString()} onChange={e => setMes(Number(e.target.value))}>
            {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <Select label="Ano" value={ano.toString()} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>

        {/* Cards de totais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-r ${totalMinutos >= 0 ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium">Saldo do Mês</p>
                <p className="text-3xl font-bold mt-1">{minutesToHHMM(totalMinutos)}</p>
                <p className="text-sm text-white/70 mt-1">{totalMinutos >= 0 ? 'horas a favor' : 'horas devidas'}</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-r ${acumulado >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium">Saldo Acumulado</p>
                <p className="text-3xl font-bold mt-1">{minutesToHHMM(acumulado)}</p>
                <p className="text-sm text-white/70 mt-1">{acumulado >= 0 ? 'total a favor' : 'total devidas'}</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
            <p className="mt-2 text-muted-foreground">Carregando registros...</p>
          </div>
        ) : diasRelevantes.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center border border-border">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum registro neste mês</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {diasRelevantes.map(d => {
              const key = `${d.dia}`;
              const expanded = expandedDia === key;
              const cor = d.totalMinutos > 0
                ? 'text-green-600 dark:text-green-400'
                : d.totalMinutos < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground';

              return (
                <div key={key} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => setExpandedDia(expanded ? null : key)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-foreground w-8">{d.dia.toString().padStart(2, '0')}</span>
                      <span className="text-muted-foreground w-8">{d.diaSemana}</span>
                      <span className={`font-semibold ${cor}`}>
                        {d.totalMinutos > 0 ? '+' : ''}{minutesToHHMM(d.totalMinutos)}
                      </span>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="px-6 pb-4 bg-muted/30">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Horário Previsto</p>
                          <p className="font-medium text-foreground">
                            {d.entradaProgramada || '--:--'} → {d.saidaProgramada || '--:--'}
                          </p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Registros de Ponto</p>
                          <p className="font-medium text-foreground">
                            {d.entradaReal || '--:--'} → {d.saidaReal || '--:--'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {d.minutosEntrada !== 0 && (
                          <span>
                            Entrada: <strong className={d.minutosEntrada > 0 ? 'text-green-600' : 'text-red-600'}>
                              {d.minutosEntrada > 0 ? '+' : ''}{d.minutosEntrada} min
                            </strong>
                          </span>
                        )}
                        {d.minutosSaida !== 0 && (
                          <span>
                            Saída: <strong className={d.minutosSaida > 0 ? 'text-green-600' : 'text-red-600'}>
                              {d.minutosSaida > 0 ? '+' : ''}{d.minutosSaida} min
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default PortalBancoHoras;
