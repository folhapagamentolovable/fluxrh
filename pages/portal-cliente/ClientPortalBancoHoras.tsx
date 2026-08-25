import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';
import ClientPortalLayout from '../../components/portal/ClientPortalLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import {
  calcularBancoHorasMes, somarMinutosBanco, minutesToHHMM,
  type BancoHorasDia, type RegraEscalaBase, type RegistroPontoBase
} from '../../hooks/useBancoHoras';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Funcionario {
  id: string;
  nome_completo: string;
  codigo_escala?: string;
  posto_trabalho_id?: string;
}

const ClientPortalBancoHoras: React.FC = () => {
  const { profile, user } = useAuth();
  const [clientPostos, setClientPostos] = useState<string[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [registrosMes, setRegistrosMes] = useState<RegistroPontoBase[]>([]);
  const [todosRegistros, setTodosRegistros] = useState<RegistroPontoBase[]>([]);
  const [regrasEscalas, setRegrasEscalas] = useState<RegraEscalaBase[]>([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [expandedFunc, setExpandedFunc] = useState<string | null>(null);
  const [expandedDia, setExpandedDia] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('client_postos').select('posto_id').eq('user_id', user.id)
        .then(({ data }) => setClientPostos((data || []).map((d: any) => d.posto_id)));
    }
  }, [user]);

  useEffect(() => {
    if (clientPostos.length > 0) carregarDados();
  }, [clientPostos]);

  useEffect(() => {
    if (funcionarios.length > 0) carregarRegistros();
  }, [mes, ano, funcionarios]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [funcRes, escRes] = await Promise.all([
        supabase.from('funcionarios')
          .select('id, nome_completo, codigo_escala, posto_trabalho_id, banco_horas_ativo')
          .in('posto_trabalho_id', clientPostos).eq('ativo', true).eq('demitido', false)
          .eq('banco_horas_ativo', true).order('nome_completo'),
        supabase.from('regras_escalas')
          .select('codigo_escala, horarios_segunda, horarios_terca, horarios_quarta, horarios_quinta, horarios_sexta, horarios_sabado, horarios_domingo, trabalha_segunda, trabalha_terca, trabalha_quarta, trabalha_quinta, trabalha_sexta, trabalha_sabado, trabalha_domingo')
          .eq('ativa', true),
      ]);
      setFuncionarios((funcRes.data || []) as Funcionario[]);
      setRegrasEscalas((escRes.data || []) as RegraEscalaBase[]);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const carregarRegistros = useCallback(async () => {
    const primeiroDia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const ultimoDiaStr = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;

    const [{ data: mesDados }, { data: todosDados }] = await Promise.all([
      supabase.from('folha_ponto_automatica')
        .select('funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
        .gte('data_registro', primeiroDia).lte('data_registro', ultimoDiaStr).order('data_registro'),
      supabase.from('folha_ponto_automatica')
        .select('funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
        .order('data_registro'),
    ]);
    setRegistrosMes(mesDados || []);
    setTodosRegistros(todosDados || []);
  }, [mes, ano]);

  const getEscala = (func: Funcionario): RegraEscalaBase | null =>
    regrasEscalas.find(r => r.codigo_escala === func.codigo_escala) || null;

  const getBancoFunc = (func: Funcionario): BancoHorasDia[] =>
    calcularBancoHorasMes({
      mes, ano,
      registros: registrosMes.filter(r => r.funcionario_id === func.id),
      codigoEscala: func.codigo_escala || '',
      escala: getEscala(func),
    });

  const getAcumuladoFunc = (func: Funcionario): number => {
    let total = 0;
    const dataLimite = new Date(ano, mes - 1, 31);
    let iter = new Date(ano - 2, 0, 1);
    while (iter <= dataLimite) {
      const m = iter.getMonth() + 1;
      const a = iter.getFullYear();
      const regs = todosRegistros.filter(r =>
        r.funcionario_id === func.id &&
        r.data_registro.startsWith(`${a}-${m.toString().padStart(2, '0')}`)
      );
      total += somarMinutosBanco(calcularBancoHorasMes({
        mes: m, ano: a, registros: regs,
        codigoEscala: func.codigo_escala || '',
        escala: getEscala(func),
      }));
      iter.setMonth(iter.getMonth() + 1);
    }
    return total;
  };

  return (
    <ClientPortalLayout clientName={profile?.user_name || profile?.email || 'Cliente'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-500" /> Banco de Horas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Relatório consolidado de horas por funcionário</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Select label="Mês" value={mes.toString()} onChange={e => setMes(Number(e.target.value))}>
            {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <Select label="Ano" value={ano.toString()} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
            <p className="mt-2 text-gray-500">Carregando...</p>
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum funcionário vinculado aos seus postos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {funcionarios.map(func => {
              const banco = getBancoFunc(func);
              const totalMinutos = somarMinutosBanco(banco);
              const acumulado = getAcumuladoFunc(func);
              const diasRelevantes = banco.filter(d => d.totalMinutos !== 0);
              const isExpanded = expandedFunc === func.id;
              const corMes = totalMinutos > 0 ? 'text-purple-600 font-bold' : totalMinutos < 0 ? 'text-red-600 font-bold' : '';
              const corAcum = acumulado >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';

              return (
                <div key={func.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => { setExpandedFunc(isExpanded ? null : func.id); setExpandedDia(null); }}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {func.nome_completo.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{func.nome_completo}</p>
                        <p className="text-sm text-gray-500">
                          Mês: <span className={corMes}>{minutesToHHMM(totalMinutos)}</span>
                          {' · '}Acumulado: <span className={corAcum}>{minutesToHHMM(acumulado)}</span>
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {diasRelevantes.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center text-sm">Nenhum registro com saldo neste mês</p>
                      ) : diasRelevantes.map(d => {
                        const diaKey = `${func.id}-${d.dia}`;
                        const isDiaExpanded = expandedDia === diaKey;
                        const corDia = d.totalMinutos > 0
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-red-600 dark:text-red-400';

                        return (
                          <div key={diaKey} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            <button
                              onClick={() => setExpandedDia(isDiaExpanded ? null : diaKey)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-sm"
                            >
                              <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-gray-900 dark:text-white w-8">
                                  {d.dia.toString().padStart(2, '0')}
                                </span>
                                <span className="text-gray-500 w-8">{d.diaSemana}</span>
                                <span className={`font-semibold ${corDia}`}>
                                  {d.totalMinutos > 0 ? '+' : ''}{minutesToHHMM(d.totalMinutos)}
                                </span>
                              </div>
                              {isDiaExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>

                            {isDiaExpanded && (
                              <div className="px-6 pb-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <p className="text-xs text-gray-500 mb-1">Horário Previsto</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {d.entradaProgramada || '--:--'} → {d.saidaProgramada || '--:--'}
                                    </p>
                                  </div>
                                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <p className="text-xs text-gray-500 mb-1">Registros de Ponto</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {d.entradaReal || '--:--'} → {d.saidaReal || '--:--'}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                                  {d.minutosEntrada !== 0 && (
                                    <span>Entrada: <strong className={d.minutosEntrada > 0 ? 'text-green-600' : 'text-red-600'}>
                                      {d.minutosEntrada > 0 ? '+' : ''}{d.minutosEntrada} min
                                    </strong></span>
                                  )}
                                  {d.minutosSaida !== 0 && (
                                    <span>Saída: <strong className={d.minutosSaida > 0 ? 'text-green-600' : 'text-red-600'}>
                                      {d.minutosSaida > 0 ? '+' : ''}{d.minutosSaida} min
                                    </strong></span>
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
              );
            })}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default ClientPortalBancoHoras;
