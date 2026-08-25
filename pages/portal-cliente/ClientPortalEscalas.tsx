import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import ClientPortalLayout from '../../components/portal/ClientPortalLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';

interface EscalaMensal {
  id: string;
  funcionario_id: string;
  nome_funcionario: string;
  mes: number;
  ano: number;
  dias_trabalhados: string | null;
  total_dias_trabalho: number;
  total_dias_folga: number;
  total_feriados: number;
  observacoes: string | null;
  escala_id: string;
}

interface PostoTrabalho {
  id: string;
  nome: string;
}

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const ClientPortalEscalas: React.FC = () => {
  const { profile, user } = useAuth();
  const [escalas, setEscalas] = useState<EscalaMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [clientPostos, setClientPostos] = useState<string[]>([]);
  const [postoNome, setPostoNome] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('client_postos').select('posto_id').eq('user_id', user.id)
        .then(({ data }) => {
          const postoIds = (data || []).map((d: any) => d.posto_id);
          setClientPostos(postoIds);
          
          // Buscar nome do primeiro posto
          if (postoIds.length > 0) {
            supabase.from('postos_trabalho').select('nome_posto').eq('id', postoIds[0]).single()
              .then(({ data: posto }) => {
                if (posto) setPostoNome(posto.nome_posto);
              });
          }
        });
    }
  }, [user]);

  useEffect(() => {
    if (clientPostos.length > 0) carregarEscalas();
  }, [clientPostos, mes, ano]);

  const carregarEscalas = async () => {
    setLoading(true);
    try {
      // Get funcionarios from client's postos
      const { data: funcs } = await supabase.from('funcionarios')
        .select('id, nome_completo, posto_trabalho_id')
        .in('posto_trabalho_id', clientPostos)
        .eq('ativo', true).eq('demitido', false);

      if (!funcs || funcs.length === 0) { setEscalas([]); return; }

      const funcIds = funcs.map(f => f.id);
      const { data, error } = await supabase.from('escala_mensal')
        .select('*')
        .in('funcionario_id', funcIds)
        .eq('mes', mes).eq('ano', ano)
        .order('nome_funcionario');

      if (error) throw error;
      setEscalas(data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const parseDiasTrabalhados = (dias: string | null): Record<string, any> => {
    if (!dias) return {};
    try { return JSON.parse(dias); } catch { return {}; }
  };

  return (
    <ClientPortalLayout clientName={profile?.user_name || profile?.email || 'Cliente'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-500" /> Escalas Mensais
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Escalas dos funcionários do {postoNome || 'condomínio'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Select label="Mês" value={mes.toString()} onChange={(e) => setMes(Number(e.target.value))}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </Select>
          <Select label="Ano" value={ano.toString()} onChange={(e) => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Carregando escalas...</p>
          </div>
        ) : escalas.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma escala encontrada para {meses[mes - 1]}/{ano}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {escalas.map((esc) => {
              const expanded = expandedId === esc.id;
              const dias = parseDiasTrabalhados(esc.dias_trabalhados);
              const diasArray = Object.entries(dias).sort(([a], [b]) => Number(a) - Number(b));

              return (
                <div key={esc.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expanded ? null : esc.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{esc.nome_funcionario}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {esc.total_dias_trabalho} dias de trabalho · {esc.total_dias_folga} folgas · {esc.total_feriados} feriados
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 overflow-x-auto">
                      {diasArray.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-500 text-xs">
                              <th className="text-left py-1 px-2">Dia</th>
                              <th className="text-left py-1 px-2">Entrada</th>
                              <th className="text-left py-1 px-2">Saída</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diasArray.map(([dia, info]: [string, any]) => (
                              <tr key={dia} className={`border-t border-gray-100 dark:border-gray-700 ${
                                info.status === 'FOLGA' ? 'bg-gray-50 dark:bg-gray-800' : 
                                info.status === 'FERIADO' ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                              }`}>
                                <td className="py-1.5 px-2 font-medium">{dia}</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{info.entrada || '-'}</td>
                                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{info.saida || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Sem detalhes de dias disponíveis</p>
                      )}
                      {esc.observacoes && (
                        <p className="mt-3 text-sm text-gray-500 italic">Obs: {esc.observacoes}</p>
                      )}
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

export default ClientPortalEscalas;
