import React, { useState, useEffect, useMemo } from 'react';
import { Search, Umbrella } from 'lucide-react';
import Card from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';
import { calcularStatusCorreto, STATUS_GOZADOS, STATUS_PROGRAMADOS } from '../../utils/feriasStatus';

interface FuncionarioFerias {
  id: string;
  nome_completo: string;
  data_admissao: string;
  nome_posto: string | null;
  ferias: Array<{
    id: string;
    periodo_aquisitivo: number;
    data_inicio_aquisitivo: string;
    data_fim_aquisitivo: string;
    data_limite_concessivo: string;
    status: string;
    data_inicio_gozo: string | null;
    data_fim_gozo: string | null;
    dias_gozados: number | null;
  }>;
}

interface PeriodoInfo {
  numero: number;
  inicioAquisitivo: Date;
  fimAquisitivo: Date;
  limiteConcessivo: Date;
  gozado: boolean;
}

const STATUS_GOZADOS_CONTROLE = [...STATUS_GOZADOS, ...STATUS_PROGRAMADOS, 'em_andamento'];

const calcPeriodos = (dataAdmissao: string): { penultimo: PeriodoInfo; ultimo: PeriodoInfo } => {
  const admissao = new Date(dataAdmissao + 'T00:00:00');
  const hoje = new Date();

  // Quantos períodos completos desde a admissão
  const anosDesdeAdmissao = (hoje.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  // O período atual (em aquisição) é o ceil, o último completo é floor
  const ultimoPeriodoCompleto = Math.max(1, Math.floor(anosDesdeAdmissao));
  const penultimoPeriodo = Math.max(1, ultimoPeriodoCompleto - 1);

  const criaPeriodo = (num: number): PeriodoInfo => {
    const inicio = new Date(admissao);
    inicio.setFullYear(inicio.getFullYear() + (num - 1));
    const fim = new Date(admissao);
    fim.setFullYear(fim.getFullYear() + num);
    fim.setDate(fim.getDate() - 1);
    const limite = new Date(fim);
    limite.setFullYear(limite.getFullYear() + 1);
    return { numero: num, inicioAquisitivo: inicio, fimAquisitivo: fim, limiteConcessivo: limite, gozado: false };
  };

  return {
    penultimo: criaPeriodo(penultimoPeriodo),
    ultimo: criaPeriodo(ultimoPeriodoCompleto),
  };
};

type StatusCor = 'verde' | 'amarelo' | 'vermelho';

const calcStatus = (limiteConcessivo: Date, gozado: boolean): StatusCor => {
  if (gozado) return 'verde';
  const hoje = new Date();
  const diffMs = limiteConcessivo.getTime() - hoje.getTime();
  const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  if (diffMeses >= 12) return 'verde';
  if (diffMeses >= 6) return 'amarelo';
  return 'vermelho';
};

const corClasses: Record<StatusCor, string> = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-400',
  vermelho: 'bg-red-500',
};

const ControleFerias: React.FC = () => {
  const [funcionarios, setFuncionarios] = useState<FuncionarioFerias[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, data_admissao, nome_posto')
        .eq('ativo', true)
        .eq('demitido', false)
        .order('nome_completo');

      if (!funcs) { setLoading(false); return; }

      const { data: todasFerias } = await supabase
        .from('ferias')
        .select('id, funcionario_id, periodo_aquisitivo, data_inicio_aquisitivo, data_fim_aquisitivo, data_limite_concessivo, status, data_inicio_gozo, data_fim_gozo, dias_gozados')
        .order('periodo_aquisitivo', { ascending: true });

      const feriasPorFunc = new Map<string, FuncionarioFerias['ferias']>();
      (todasFerias || []).forEach(f => {
        if (!feriasPorFunc.has(f.funcionario_id)) feriasPorFunc.set(f.funcionario_id, []);
        feriasPorFunc.get(f.funcionario_id)!.push(f);
      });

      setFuncionarios(funcs.map(func => ({
        ...func,
        ferias: feriasPorFunc.get(func.id) || [],
      })));
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR');

  const dadosTabela = useMemo(() => {
    return funcionarios
      .filter(f => f.nome_completo.toLowerCase().includes(busca.toLowerCase()))
      .map(f => {
        const { penultimo, ultimo } = calcPeriodos(f.data_admissao);

        // Marca gozado se existe registro na tabela ferias com status adequado
        // OU se as datas indicam que já está em andamento/gozada (mesmo com status desatualizado)
        const feriasPenultimo = f.ferias.find(fe => fe.periodo_aquisitivo === penultimo.numero);
        if (feriasPenultimo) {
          const statusEfetivo = calcularStatusCorreto(feriasPenultimo as any) ?? feriasPenultimo.status;
          penultimo.gozado = STATUS_GOZADOS_CONTROLE.includes(statusEfetivo as any);
        }

        const feriasUltimo = f.ferias.find(fe => fe.periodo_aquisitivo === ultimo.numero);
        if (feriasUltimo) {
          const statusEfetivo = calcularStatusCorreto(feriasUltimo as any) ?? feriasUltimo.status;
          ultimo.gozado = STATUS_GOZADOS_CONTROLE.includes(statusEfetivo as any);
        }

        // Status geral = o pior entre os dois períodos
        const statusPenultimo = calcStatus(penultimo.limiteConcessivo, penultimo.gozado);
        const statusUltimo = calcStatus(ultimo.limiteConcessivo, ultimo.gozado);
        const ordem: Record<StatusCor, number> = { vermelho: 0, amarelo: 1, verde: 2 };
        const statusGeral = ordem[statusPenultimo] <= ordem[statusUltimo] ? statusPenultimo : statusUltimo;

        return {
          id: f.id,
          nome: f.nome_completo,
          dataAdmissao: f.data_admissao,
          posto: f.nome_posto || '-',
          penultimo,
          ultimo,
          statusPenultimo,
          statusUltimo,
          statusGeral,
        };
      })
      .sort((a, b) => {
        const ordem: Record<StatusCor, number> = { vermelho: 0, amarelo: 1, verde: 2 };
        return ordem[a.statusGeral] - ordem[b.statusGeral];
      });
  }, [funcionarios, busca]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const BadgeGozado = ({ gozado }: { gozado: boolean }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${gozado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {gozado ? 'Sim' : 'Não'}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Umbrella className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Controle de Férias</h1>
            <p className="text-sm text-gray-500">{dadosTabela.length} funcionário(s) — Últimos 2 períodos aquisitivos</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar funcionário..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ≥ 12 meses ou gozada</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> 6 a 12 meses</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt; 6 meses</span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-3 py-3 text-left font-medium" rowSpan={2}>Status</th>
                <th className="px-3 py-3 text-left font-medium" rowSpan={2}>Funcionário</th>
                <th className="px-3 py-3 text-left font-medium" rowSpan={2}>Admissão</th>
                <th className="px-3 py-3 text-left font-medium" rowSpan={2}>Posto</th>
                <th className="px-3 py-3 text-center font-medium border-l border-gray-300 dark:border-gray-500" colSpan={3}>Penúltimo Período</th>
                <th className="px-3 py-3 text-center font-medium border-l border-gray-300 dark:border-gray-500" colSpan={3}>Último Período</th>
              </tr>
              <tr>
                <th className="px-3 py-2 text-center font-medium text-xs border-l border-gray-300 dark:border-gray-500">Limite</th>
                <th className="px-3 py-2 text-center font-medium text-xs">Gozada</th>
                <th className="px-3 py-2 text-center font-medium text-xs">Situação</th>
                <th className="px-3 py-2 text-center font-medium text-xs border-l border-gray-300 dark:border-gray-500">Limite</th>
                <th className="px-3 py-2 text-center font-medium text-xs">Gozada</th>
                <th className="px-3 py-2 text-center font-medium text-xs">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {dadosTabela.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-3">
                    <span className={`w-3.5 h-3.5 rounded-full inline-block ${corClasses[row.statusGeral]}`} />
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-gray-100">{row.nome}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(row.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{row.posto}</td>
                  {/* Penúltimo */}
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 text-xs">
                    {formatDate(row.penultimo.limiteConcessivo)}
                  </td>
                  <td className="px-3 py-3 text-center"><BadgeGozado gozado={row.penultimo.gozado} /></td>
                  <td className="px-3 py-3 text-center">
                    <span className={`w-3 h-3 rounded-full inline-block ${corClasses[row.statusPenultimo]}`} />
                  </td>
                  {/* Último */}
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 text-xs">
                    {formatDate(row.ultimo.limiteConcessivo)}
                  </td>
                  <td className="px-3 py-3 text-center"><BadgeGozado gozado={row.ultimo.gozado} /></td>
                  <td className="px-3 py-3 text-center">
                    <span className={`w-3 h-3 rounded-full inline-block ${corClasses[row.statusUltimo]}`} />
                  </td>
                </tr>
              ))}
              {dadosTabela.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ControleFerias;
