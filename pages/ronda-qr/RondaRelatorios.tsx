import React, { useState, useEffect, useMemo } from 'react';
import RondaLayout from './components/RondaLayout';
import { BarChart2, Download, Filter, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Empresa { id: string; nome_empresa: string }
interface Posto { id: string; nome_posto: string; empresa_id: string | null }

interface ExecucaoRow {
  id: string;
  data_turno: string;
  status: string;
  nome_funcionario: string | null;
  total_pontos_lidos: number | null;
  total_pontos_esperados: number | null;
  posto_trabalho_id: string | null;
  empresa_id: string | null;
  iniciada_em: string | null;
  finalizada_em: string | null;
}

interface LeituraRow {
  id: string;
  status: string;
  diferenca_minutos: number | null;
  ponto_nome: string | null;
  horario_leitura: string | null;
  horario_esperado: string | null;
  execucao_id: string;
}

interface NaoConfRow {
  id: string;
  data_ronda: string;
  nivel: string;
  tipo: string;
  diferenca_minutos: number | null;
  descricao: string | null;
  ponto_nome: string | null;
  ciclo_numero: number | null;
}

export default function RondaRelatorios() {
  const { showToast, ToastContainer } = useToast();
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' });
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(false);
  const [execucoes, setExecucoes] = useState<ExecucaoRow[]>([]);
  const [leituras, setLeituras] = useState<LeituraRow[]>([]);
  const [naoConformidades, setNaoConformidades] = useState<NaoConfRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Default: current month
  useEffect(() => {
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setPeriodo({ inicio: fmt(inicio), fim: fmt(fim) });
  }, []);

  // Load filters
  useEffect(() => {
    (async () => {
      const [{ data: emps }, { data: pts }] = await Promise.all([
        supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
        supabase.from('postos_trabalho').select('id, nome_posto, empresa_id').is('local_area', null).order('nome_posto'),
      ]);
      setEmpresas(emps || []);
      setPostos((pts as Posto[]) || []);
    })();
  }, []);

  const postosFiltrados = useMemo(
    () => filtroEmpresa ? postos.filter(p => p.empresa_id === filtroEmpresa) : postos,
    [postos, filtroEmpresa]
  );

  const handleGerar = async () => {
    if (!periodo.inicio || !periodo.fim) {
      showToast('Selecione o período', 'error');
      return;
    }
    setLoading(true);
    try {
      // Execuções
      let execQuery = supabase
        .from('rq_execucoes')
        .select('id, data_turno, status, nome_funcionario, total_pontos_lidos, total_pontos_esperados, posto_trabalho_id, empresa_id, iniciada_em, finalizada_em')
        .gte('data_turno', periodo.inicio)
        .lte('data_turno', periodo.fim)
        .order('data_turno', { ascending: false });
      if (filtroEmpresa) execQuery = execQuery.eq('empresa_id', filtroEmpresa);
      if (filtroPosto) execQuery = execQuery.eq('posto_trabalho_id', filtroPosto);

      const { data: execData, error: execErr } = await execQuery;
      if (execErr) throw execErr;
      const execs = (execData as ExecucaoRow[]) || [];
      setExecucoes(execs);

      // Leituras das execuções
      const execIds = execs.map(e => e.id);
      let leituraData: LeituraRow[] = [];
      if (execIds.length) {
        const { data: leits, error: leitErr } = await supabase
          .from('rq_leituras')
          .select('id, status, diferenca_minutos, ponto_nome, horario_leitura, horario_esperado, execucao_id')
          .in('execucao_id', execIds);
        if (leitErr) throw leitErr;
        leituraData = (leits as LeituraRow[]) || [];
      }
      setLeituras(leituraData);

      // Não conformidades
      let ncQuery = supabase
        .from('rondas_nao_conformidades')
        .select('id, data_ronda, nivel, tipo, diferenca_minutos, descricao, ponto_nome, ciclo_numero')
        .gte('data_ronda', periodo.inicio)
        .lte('data_ronda', periodo.fim)
        .order('data_ronda', { ascending: false });
      const { data: ncData, error: ncErr } = await ncQuery;
      if (ncErr) throw ncErr;
      setNaoConformidades((ncData as NaoConfRow[]) || []);

      setHasGenerated(true);
      showToast(`Relatório gerado: ${execs.length} execuções`, 'success');
    } catch (e: any) {
      showToast('Erro ao gerar relatório: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Métricas
  const metricas = useMemo(() => {
    const realizadas = execucoes.filter(e => e.status === 'concluida' || e.status === 'incompleta').length;
    const totalEsperado = execucoes.reduce((s, e) => s + (e.total_pontos_esperados || 0), 0);
    const totalLido = leituras.filter(l => l.status === 'no_prazo' || l.status === 'atrasado').length;
    const conformidade = totalEsperado > 0 ? Math.round((totalLido / totalEsperado) * 100) : 0;
    const atrasadas = leituras.filter(l => l.status === 'atrasado').length;
    const naoLidas = leituras.filter(l => l.status === 'nao_realizado').length;
    return { realizadas, conformidade, atrasadas, naoLidas };
  }, [execucoes, leituras]);

  const handleExportarPDF = () => {
    if (!hasGenerated) {
      showToast('Gere o relatório antes de exportar', 'error');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    const dataTxt = `Período: ${periodo.inicio} a ${periodo.fim}`;
    doc.setFontSize(16);
    doc.text('Relatório de Rondas (QR)', 14, 15);
    doc.setFontSize(10);
    doc.text(dataTxt, 14, 22);

    // Sumário
    autoTable(doc, {
      startY: 28,
      head: [['Rondas Realizadas', 'Conformidade', 'Leituras Atrasadas', 'Pontos Não Lidos']],
      body: [[String(metricas.realizadas), `${metricas.conformidade}%`, String(metricas.atrasadas), String(metricas.naoLidas)]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Execuções
    let lastY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(12);
    doc.text('Execuções', 14, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['Data', 'Funcionário', 'Status', 'Lidos', 'Esperados', 'Iniciada', 'Finalizada']],
      body: execucoes.map(e => [
        e.data_turno,
        e.nome_funcionario || '-',
        e.status,
        String(e.total_pontos_lidos ?? 0),
        String(e.total_pontos_esperados ?? 0),
        e.iniciada_em ? new Date(e.iniciada_em).toLocaleString('pt-BR') : '-',
        e.finalizada_em ? new Date(e.finalizada_em).toLocaleString('pt-BR') : '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Leituras
    lastY = (doc as any).lastAutoTable.finalY + 6;
    if (lastY > 180) { doc.addPage(); lastY = 15; }
    doc.setFontSize(12);
    doc.text('Leituras (linha-a-linha)', 14, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['Ponto', 'Status', 'Esperado', 'Leitura', 'Diferença (min)']],
      body: leituras.map(l => [
        l.ponto_nome || '-',
        l.status,
        l.horario_esperado ? new Date(l.horario_esperado).toLocaleString('pt-BR') : '-',
        l.horario_leitura ? new Date(l.horario_leitura).toLocaleString('pt-BR') : '-',
        l.diferenca_minutos != null ? String(l.diferenca_minutos) : '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    // Não conformidades
    lastY = (doc as any).lastAutoTable.finalY + 6;
    if (lastY > 180) { doc.addPage(); lastY = 15; }
    doc.setFontSize(12);
    doc.text('Não Conformidades', 14, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['Data', 'Ciclo', 'Nível', 'Tipo', 'Ponto', 'Dif (min)', 'Descrição']],
      body: naoConformidades.map(n => [
        n.data_ronda,
        String(n.ciclo_numero ?? '-'),
        n.nivel,
        n.tipo,
        n.ponto_nome || '-',
        n.diferenca_minutos != null ? String(n.diferenca_minutos) : '-',
        n.descricao || '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
    });

    doc.save(`relatorio-rondas-${periodo.inicio}-a-${periodo.fim}.pdf`);
    showToast('PDF exportado', 'success');
  };

  return (
    <RondaLayout title="Relatórios" subtitle="Relatórios detalhados das rondas">
      <ToastContainer />
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
            <input
              type="date"
              value={periodo.inicio}
              onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Fim</label>
            <input
              type="date"
              value={periodo.fim}
              onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa</label>
            <select
              value={filtroEmpresa}
              onChange={e => { setFiltroEmpresa(e.target.value); setFiltroPosto(''); }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">Todas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Posto</label>
            <select
              value={filtroPosto}
              onChange={e => setFiltroPosto(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">Todos</option>
              {postosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleGerar}
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Gerar Relatório
          </button>
          <button
            onClick={handleExportarPDF}
            disabled={!hasGenerated || loading}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Rondas Realizadas', value: String(metricas.realizadas), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Conformidade', value: `${metricas.conformidade}%`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Leituras Atrasadas', value: String(metricas.atrasadas), color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Pontos Não Lidos', value: String(metricas.naoLidas), color: 'text-red-600 dark:text-red-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {!hasGenerated ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 text-center">
          <BarChart2 className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Selecione o período e gere o relatório</p>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Os dados detalhados aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Execuções ({execucoes.length})</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Funcionário</th><th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Lidos</th><th className="py-2 pr-3">Esperados</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.data_turno}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.nome_funcionario || '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.status}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.total_pontos_lidos ?? 0}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.total_pontos_esperados ?? 0}</td>
                  </tr>
                ))}
                {execucoes.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">Nenhuma execução no período</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Leituras ({leituras.length})</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 pr-3">Ponto</th><th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Esperado</th><th className="py-2 pr-3">Leitura</th><th className="py-2 pr-3">Dif (min)</th>
                </tr>
              </thead>
              <tbody>
                {leituras.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{l.ponto_nome || '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{l.status}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{l.horario_esperado ? new Date(l.horario_esperado).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{l.horario_leitura ? new Date(l.horario_leitura).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{l.diferenca_minutos ?? '-'}</td>
                  </tr>
                ))}
                {leituras.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">Nenhuma leitura registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Não Conformidades ({naoConformidades.length})</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Ciclo</th><th className="py-2 pr-3">Nível</th>
                  <th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Ponto</th><th className="py-2 pr-3">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {naoConformidades.map(n => (
                  <tr key={n.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.data_ronda}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.ciclo_numero ?? '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.nivel}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.tipo}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.ponto_nome || '-'}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{n.descricao || '-'}</td>
                  </tr>
                ))}
                {naoConformidades.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-slate-400">Nenhuma não conformidade</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RondaLayout>
  );
}
