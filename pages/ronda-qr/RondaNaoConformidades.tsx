import React, { useState, useEffect, useCallback } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { abreviarNome } from '../../utils/formatarNome';
import { getNivelColor, getNivelLabel, type NivelNaoConformidade } from './utils/naoConformidades';
import { AlertTriangle, BarChart2, Calendar, ChevronDown, ChevronUp, Download, Filter, Loader2, Shield, User } from 'lucide-react';

interface NCRecord {
  id: string;
  sessao_id: string | null;
  funcionario_id: string;
  data_ronda: string;
  ciclo_numero: number | null;
  nivel: NivelNaoConformidade;
  tipo: string;
  diferenca_minutos: number;
  descricao: string;
  recomendacao_gerencial: string;
  ponto_nome: string | null;
  created_at: string;
  funcionario?: { nome_completo: string } | null;
}

interface RondaAgrupada {
  data: string;
  funcionario_id: string;
  funcionario_nome: string;
  sessao_id: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  nao_conformidades: NCRecord[];
  totalLeve: number;
  totalMedia: number;
  totalGrave: number;
  totalGravissima: number;
}

export default function RondaNaoConformidades() {
  const [periodo, setPeriodo] = useState(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: hoje.toISOString().split('T')[0],
    };
  });
  const [registros, setRegistros] = useState<NCRecord[]>([]);
  const [agrupados, setAgrupados] = useState<RondaAgrupada[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState<string>('');

  const buscar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rondas_nao_conformidades')
      .select('*, funcionario:funcionarios(nome_completo)')
      .gte('data_ronda', periodo.inicio)
      .lte('data_ronda', periodo.fim)
      .order('data_ronda', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    let filtered = (data || []) as NCRecord[];
    if (filtroNivel) filtered = filtered.filter(r => r.nivel === filtroNivel);

    setRegistros(filtered);

    // Group by date + funcionario + sessao
    const groups = new Map<string, RondaAgrupada>();
    for (const r of filtered) {
      const key = `${r.data_ronda}_${r.funcionario_id}_${r.sessao_id || 'sem'}`;
      if (!groups.has(key)) {
        groups.set(key, {
          data: r.data_ronda,
          funcionario_id: r.funcionario_id,
          funcionario_nome: r.funcionario?.nome_completo || 'N/A',
          sessao_id: r.sessao_id,
          hora_inicio: null,
          hora_fim: null,
          nao_conformidades: [],
          totalLeve: 0,
          totalMedia: 0,
          totalGrave: 0,
          totalGravissima: 0,
        });
      }
      const g = groups.get(key)!;
      g.nao_conformidades.push(r);
      if (r.nivel === 'leve') g.totalLeve++;
      else if (r.nivel === 'media') g.totalMedia++;
      else if (r.nivel === 'grave') g.totalGrave++;
      else if (r.nivel === 'gravissima') g.totalGravissima++;
    }

    // Fetch session times
    const sessaoIds = [...new Set(filtered.map(r => r.sessao_id).filter(Boolean))] as string[];
    if (sessaoIds.length > 0) {
      const { data: sessoes } = await supabase
        .from('rondas_sessoes')
        .select('id, iniciada_em, finalizada_em')
        .in('id', sessaoIds);
      if (sessoes) {
        for (const s of sessoes) {
          for (const g of groups.values()) {
            if (g.sessao_id === s.id) {
              g.hora_inicio = s.iniciada_em ? new Date(s.iniciada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
              g.hora_fim = s.finalizada_em ? new Date(s.finalizada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
            }
          }
        }
      }
    }

    setAgrupados([...groups.values()]);
    setLoading(false);
  }, [periodo, filtroNivel]);

  useEffect(() => { buscar(); }, []);

  // Stats
  const totalLeve = registros.filter(r => r.nivel === 'leve').length;
  const totalMedia = registros.filter(r => r.nivel === 'media').length;
  const totalGrave = registros.filter(r => r.nivel === 'grave').length;
  const totalGravissima = registros.filter(r => r.nivel === 'gravissima').length;

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <RondaLayout title="Não Conformidades" subtitle="Relatório gerencial de não conformidades das rondas">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
            <input type="date" value={periodo.inicio}
              onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Fim</label>
            <input type="date" value={periodo.fim}
              onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nível</label>
            <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white">
              <option value="">Todos</option>
              <option value="leve">Leve</option>
              <option value="media">Média</option>
              <option value="grave">Grave</option>
              <option value="gravissima">Gravíssima</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={buscar}
              className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
              <BarChart2 className="w-4 h-4" /> Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Leve', value: totalLeve, color: 'text-blue-600 dark:text-blue-400', bg: 'border-blue-200 dark:border-blue-800' },
          { label: 'Média', value: totalMedia, color: 'text-amber-600 dark:text-amber-400', bg: 'border-amber-200 dark:border-amber-800' },
          { label: 'Grave', value: totalGrave, color: 'text-orange-600 dark:text-orange-400', bg: 'border-orange-200 dark:border-orange-800' },
          { label: 'Gravíssima', value: totalGravissima, color: 'text-red-600 dark:text-red-400', bg: 'border-red-200 dark:border-red-800' },
        ].map((s, i) => (
          <div key={i} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border ${s.bg} shadow-sm`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Report table */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        </div>
      ) : agrupados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 text-center">
          <Shield className="w-16 h-16 text-emerald-200 dark:text-emerald-800 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhuma não conformidade encontrada</p>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Todas as rondas estão em conformidade no período selecionado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-700/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Início</div>
            <div className="col-span-1">Término</div>
            <div className="col-span-3">Funcionário</div>
            <div className="col-span-3">Ocorrências</div>
            <div className="col-span-2">Recomendações</div>
          </div>

          {agrupados.map((grupo, idx) => {
            const key = `${grupo.data}_${grupo.funcionario_id}_${grupo.sessao_id}`;
            const isExpanded = expandedRow === key;
            const maxNivel = grupo.totalGravissima > 0 ? 'gravissima' : grupo.totalGrave > 0 ? 'grave' : grupo.totalMedia > 0 ? 'media' : 'leve';
            const nivelColors = getNivelColor(maxNivel as NivelNaoConformidade);
            const isMissed = grupo.nao_conformidades.some(nc => nc.tipo === 'ronda_nao_realizada');

            return (
              <div key={key}>
                {/* Row */}
                <div
                  onClick={() => setExpandedRow(isExpanded ? null : key)}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-2 px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700 ${idx % 2 === 0 ? '' : 'bg-slate-25 dark:bg-slate-800/50'}`}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-slate-900 dark:text-white">{formatDate(grupo.data)}</span>
                  </div>
                  <div className="col-span-1 text-sm text-slate-600 dark:text-slate-300">
                    {grupo.hora_inicio || (isMissed ? '—' : '—')}
                  </div>
                  <div className="col-span-1 text-sm text-slate-600 dark:text-slate-300">
                    {grupo.hora_fim || (isMissed ? '—' : '—')}
                  </div>
                  <div className="col-span-3 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {isMissed && !grupo.funcionario_nome ? '—' : abreviarNome(grupo.funcionario_nome)}
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-1">
                    {grupo.totalLeve > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{grupo.totalLeve} Leve</span>}
                    {grupo.totalMedia > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{grupo.totalMedia} Média</span>}
                    {grupo.totalGrave > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">{grupo.totalGrave} Grave</span>}
                    {grupo.totalGravissima > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{grupo.totalGravissima} Gravíssima</span>}
                  </div>
                  <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                    {grupo.nao_conformidades.length} registro(s)
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50 dark:bg-slate-700/20 border-b border-slate-200 dark:border-slate-600">
                    <div className="space-y-3">
                      {grupo.nao_conformidades.map(nc => {
                        const colors = getNivelColor(nc.nivel);
                        return (
                          <div key={nc.id} className={`rounded-xl p-4 border ${colors.border} ${colors.bg}`}>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${colors.badge}`}>
                                {getNivelLabel(nc.nivel)}
                              </span>
                              {nc.ponto_nome && (
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  📍 {nc.ponto_nome}
                                </span>
                              )}
                              {nc.ciclo_numero && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Ciclo {nc.ciclo_numero}
                                </span>
                              )}
                              {nc.diferenca_minutos !== 0 && (
                                <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                  {nc.diferenca_minutos > 0 ? '+' : ''}{nc.diferenca_minutos} min
                                </span>
                              )}
                              <span className="text-xs text-slate-400 ml-auto">
                                {new Date(nc.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`text-sm ${colors.text} mb-2`}>{nc.descricao}</p>
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
                              <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                <span className="font-bold">Recomendação:</span> {nc.recomendacao_gerencial}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </RondaLayout>
  );
}
