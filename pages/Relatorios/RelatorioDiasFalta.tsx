import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Printer, FileSpreadsheet } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Funcionario {
    id: string;
    nome_completo: string;
    empresa_id?: string;
    posto_trabalho_id?: string;
    nome_empresa?: string;
    nome_posto?: string;
}

type TipoFalta = 'injustificada' | 'justificada' | 'suspensao';

interface DiaFalta {
    dia: number;
    data: string;          // dd/mm/aaaa
    diaSemana: string;     // Dom, Seg...
    diaSemanaNum: number;  // 0 = domingo
    tipo: TipoFalta;
    feriado: boolean;
}

interface MesFalta {
    mes: number;
    ano: number;
    dias: DiaFalta[];
    injustificadas: number;
    justificadas: number;
    suspensoes: number;
    // Base DSR: faltas injustificadas + suspensões em dias úteis
    diasUteisPerdidos: number;
    domingosFeriadosPerdidos: number;
}

interface LinhaFuncionario {
    funcionario: Funcionario;
    meses: MesFalta[];
    totalInjustificadas: number;
    totalJustificadas: number;
    totalSuspensoes: number;
    totalDiasUteisPerdidos: number;
}

const MESES_COMPLETOS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const LABEL_TIPO: Record<TipoFalta, string> = {
    injustificada: 'Falta injustificada',
    justificada: 'Falta justificada (atestado)',
    suspensao: 'Suspensão',
};

// ── Componente ───────────────────────────────────────────────────────────────

const RelatorioDiasFalta: React.FC = () => {
    const { showToast, ToastContainer } = useToast();

    const hoje = new Date();
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mesInicio, setMesInicio] = useState(1);
    const [mesFim, setMesFim] = useState(12);
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    const [postoFiltro, setPostoFiltro] = useState('');
    const [funcionarioFiltro, setFuncionarioFiltro] = useState('');
    const [somenteComFaltas, setSomenteComFaltas] = useState(true);

    const [empresas, setEmpresas] = useState<Array<{ id: string; nome_empresa: string }>>([]);
    const [postos, setPostos] = useState<Array<{ id: string; nome_posto: string }>>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [linhas, setLinhas] = useState<LinhaFuncionario[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { carregarFiltros(); }, []);
    useEffect(() => { carregarDados(); /* eslint-disable-next-line */ }, [ano, mesInicio, mesFim, empresaFiltro, postoFiltro, funcionarioFiltro]);

    const carregarFiltros = async () => {
        const [{ data: emp }, { data: pos }, { data: func }] = await Promise.all([
            supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
            supabase.from('postos_trabalho').select('id, nome_posto').eq('ativo', true).is('local_area', null).order('nome_posto'),
            supabase.from('funcionarios').select('id, nome_completo, empresa_id, posto_trabalho_id, nome_empresa, nome_posto')
                .eq('demitido', false).order('nome_completo'),
        ]);
        setEmpresas(emp || []);
        setPostos(pos || []);
        setFuncionarios((func || []) as Funcionario[]);
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            let qFunc = supabase
                .from('funcionarios')
                .select('id, nome_completo, empresa_id, posto_trabalho_id, nome_empresa, nome_posto')
                .eq('demitido', false)
                .order('nome_completo');

            if (empresaFiltro) qFunc = qFunc.eq('empresa_id', empresaFiltro);
            if (postoFiltro) qFunc = qFunc.eq('posto_trabalho_id', postoFiltro);
            if (funcionarioFiltro) qFunc = qFunc.eq('id', funcionarioFiltro);

            const { data: funcs, error: errFunc } = await qFunc;
            if (errFunc) throw errFunc;
            if (!funcs || funcs.length === 0) { setLinhas([]); return; }

            const ids = funcs.map((f: any) => f.id);

            const [{ data: folhas, error: errFolhas }, { data: feriados }] = await Promise.all([
                supabase
                    .from('folhas_ponto')
                    .select('funcionario_id, mes, ano, dados_dias, total_faltas_justificadas, total_faltas_injustificadas, total_suspensoes')
                    .in('funcionario_id', ids)
                    .eq('ano', ano)
                    .gte('mes', mesInicio)
                    .lte('mes', mesFim)
                    .order('mes'),
                supabase
                    .from('feriados')
                    .select('data_feriado')
                    .gte('data_feriado', `${ano}-01-01`)
                    .lte('data_feriado', `${ano}-12-31`),
            ]);
            if (errFolhas) throw errFolhas;

            const setFeriados = new Set((feriados || []).map((f: any) => String(f.data_feriado).slice(0, 10)));

            const novasLinhas: LinhaFuncionario[] = (funcs as any[]).map(func => {
                const folhasFunc = (folhas || []).filter((f: any) => f.funcionario_id === func.id);

                const meses: MesFalta[] = folhasFunc.map((folha: any) => {
                    const dados = typeof folha.dados_dias === 'string'
                        ? safeParse(folha.dados_dias)
                        : (folha.dados_dias || {});

                    const dias: DiaFalta[] = [];
                    Object.keys(dados || {})
                        .filter(k => k.startsWith('dia_'))
                        .forEach(key => {
                            const dia = Number.parseInt(key.replace('dia_', ''), 10);
                            const d = dados[key] || {};
                            let tipo: TipoFalta | null = null;
                            if (d.falta_injustificada) tipo = 'injustificada';
                            else if (d.suspensao) tipo = 'suspensao';
                            else if (d.atestado) tipo = 'justificada';
                            if (!tipo || !dia) return;

                            const dataObj = new Date(folha.ano, folha.mes - 1, dia, 12, 0, 0);
                            const iso = `${folha.ano}-${String(folha.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                            dias.push({
                                dia,
                                data: `${String(dia).padStart(2, '0')}/${String(folha.mes).padStart(2, '0')}/${folha.ano}`,
                                diaSemana: DIAS_SEMANA[dataObj.getDay()],
                                diaSemanaNum: dataObj.getDay(),
                                tipo,
                                feriado: setFeriados.has(iso) || !!d.feriado,
                            });
                        });

                    dias.sort((a, b) => a.dia - b.dia);

                    const injustificadas = dias.filter(d => d.tipo === 'injustificada').length;
                    const justificadas = dias.filter(d => d.tipo === 'justificada').length;
                    const suspensoes = dias.filter(d => d.tipo === 'suspensao').length;

                    const perdidosDSR = dias.filter(d => d.tipo === 'injustificada' || d.tipo === 'suspensao');
                    const domingosFeriadosPerdidos = perdidosDSR.filter(d => d.diaSemanaNum === 0 || d.feriado).length;

                    return {
                        mes: folha.mes,
                        ano: folha.ano,
                        dias,
                        injustificadas,
                        justificadas,
                        suspensoes,
                        diasUteisPerdidos: perdidosDSR.length - domingosFeriadosPerdidos,
                        domingosFeriadosPerdidos,
                    };
                }).filter(m => m.dias.length > 0 || !somenteComFaltas);

                return {
                    funcionario: func,
                    meses,
                    totalInjustificadas: meses.reduce((s, m) => s + m.injustificadas, 0),
                    totalJustificadas: meses.reduce((s, m) => s + m.justificadas, 0),
                    totalSuspensoes: meses.reduce((s, m) => s + m.suspensoes, 0),
                    totalDiasUteisPerdidos: meses.reduce((s, m) => s + m.diasUteisPerdidos, 0),
                };
            });

            setLinhas(novasLinhas);
        } catch (error: any) {
            showToast(`Erro ao carregar dados: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const linhasFiltradas = useMemo(
        () => linhas.filter(l => !somenteComFaltas || l.meses.some(m => m.dias.length > 0)),
        [linhas, somenteComFaltas]
    );

    const funcionariosDoFiltro = useMemo(() => funcionarios.filter(f =>
        (!empresaFiltro || f.empresa_id === empresaFiltro) &&
        (!postoFiltro || f.posto_trabalho_id === postoFiltro)
    ), [funcionarios, empresaFiltro, postoFiltro]);

    const imprimir = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
      <html><head><title>Dias de Falta - DSR ${ano}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 14px 0 4px; border-bottom: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { border: 1px solid #999; padding: 3px 5px; text-align: left; }
        th { background: #eee; }
        .tot { font-weight: bold; background: #f5f5f5; }
      </style></head><body>
      <h1>Relatório de Dias de Falta (base para DSR)</h1>
      <p>Ano ${ano} — meses ${MESES_COMPLETOS[mesInicio - 1]} a ${MESES_COMPLETOS[mesFim - 1]}</p>
      ${linhasFiltradas.map(l => `
        <h2>${l.funcionario.nome_completo} — ${l.funcionario.nome_posto || '-'}</h2>
        <table>
          <thead><tr><th>Mês</th><th>Dias de falta</th><th>Injust.</th><th>Justif.</th><th>Susp.</th><th>Dom./Feriados</th></tr></thead>
          <tbody>
            ${l.meses.map(m => `<tr>
              <td>${MESES_COMPLETOS[m.mes - 1]}</td>
              <td>${m.dias.map(d => `${String(d.dia).padStart(2, '0')} (${d.diaSemana}${d.feriado ? '/Fer' : ''}) ${sigla(d.tipo)}`).join('; ') || '-'}</td>
              <td>${m.injustificadas}</td><td>${m.justificadas}</td><td>${m.suspensoes}</td>
              <td>${m.domingosFeriadosPerdidos}</td>
            </tr>`).join('')}
            <tr class="tot"><td>TOTAL</td><td></td><td>${l.totalInjustificadas}</td><td>${l.totalJustificadas}</td><td>${l.totalSuspensoes}</td><td></td></tr>
          </tbody>
        </table>`).join('')}
      </body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 400);
    };

    const exportarCSV = () => {
        const linhasCsv: string[] = ['Funcionario;Posto;Mes;Ano;Dia;Dia da semana;Feriado;Tipo'];
        linhasFiltradas.forEach(l => {
            l.meses.forEach(m => {
                m.dias.forEach(d => {
                    linhasCsv.push([
                        l.funcionario.nome_completo,
                        l.funcionario.nome_posto || '',
                        MESES_COMPLETOS[m.mes - 1],
                        String(m.ano),
                        d.data,
                        d.diaSemana,
                        d.feriado ? 'Sim' : 'Não',
                        LABEL_TIPO[d.tipo],
                    ].join(';'));
                });
            });
        });
        const blob = new Blob(['\uFEFF' + linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dias-falta-dsr-${ano}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Dias de Falta (DSR)</h1>
                    <p className="text-sm text-muted-foreground">Dias exatos de falta de cada funcionário, mês a mês, extraídos das folhas de ponto.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportarCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                        <FileSpreadsheet size={16} /> Excel/CSV
                    </button>
                    <button onClick={imprimir} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Ano</label>
                        <select value={ano} onChange={e => setAno(Number(e.target.value))} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Mês inicial</label>
                        <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            {MESES_COMPLETOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Mês final</label>
                        <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            {MESES_COMPLETOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Empresa</label>
                        <select value={empresaFiltro} onChange={e => { setEmpresaFiltro(e.target.value); setFuncionarioFiltro(''); }} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value="">Todas</option>
                            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Posto</label>
                        <select value={postoFiltro} onChange={e => { setPostoFiltro(e.target.value); setFuncionarioFiltro(''); }} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value="">Todos</option>
                            {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-1">Funcionário</label>
                        <select value={funcionarioFiltro} onChange={e => setFuncionarioFiltro(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value="">Todos</option>
                            {funcionariosDoFiltro.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" checked={somenteComFaltas} onChange={e => setSomenteComFaltas(e.target.checked)} />
                            Exibir apenas quem teve faltas
                        </label>
                    </div>
                </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">I = Falta injustificada</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">J = Falta justificada (atestado)</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">S = Suspensão</span>
                <span>Base do DSR = faltas injustificadas + suspensões em dias úteis</span>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-muted-foreground text-sm">Carregando dados...</p>
                </div>
            ) : linhasFiltradas.length === 0 ? (
                <div className="bg-card rounded-lg shadow-md p-8 text-center text-muted-foreground border border-border">
                    Nenhuma falta encontrada para os filtros selecionados.
                </div>
            ) : (
                <div className="space-y-4">
                    {linhasFiltradas.map(l => (
                        <div key={l.funcionario.id} className="bg-card text-card-foreground rounded-lg shadow-md border border-border overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="font-semibold">{l.funcionario.nome_completo}</p>
                                    <p className="text-xs text-muted-foreground">{l.funcionario.nome_empresa || '-'} • {l.funcionario.nome_posto || '-'}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 rounded bg-red-100 text-red-800">Injust.: {l.totalInjustificadas}</span>
                                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Justif.: {l.totalJustificadas}</span>
                                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">Susp.: {l.totalSuspensoes}</span>
                                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-semibold">Dias úteis p/ DSR: {l.totalDiasUteisPerdidos}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">Mês</th>
                                            <th className="px-3 py-2 text-left font-semibold">Dias de falta</th>
                                            <th className="px-3 py-2 text-center font-semibold">Injust.</th>
                                            <th className="px-3 py-2 text-center font-semibold">Justif.</th>
                                            <th className="px-3 py-2 text-center font-semibold">Susp.</th>
                                            <th className="px-3 py-2 text-center font-semibold">Dom./Feriados</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {l.meses.map(m => (
                                            <tr key={`${m.ano}-${m.mes}`}>
                                                <td className="px-3 py-2 whitespace-nowrap">{MESES_COMPLETOS[m.mes - 1]}/{m.ano}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {m.dias.length === 0 && <span className="text-muted-foreground">—</span>}
                                                        {m.dias.map(d => (
                                                            <span key={d.dia} className={`px-1.5 py-0.5 rounded text-xs ${corTipo(d.tipo)}`} title={`${d.data} • ${d.diaSemana}${d.feriado ? ' • Feriado' : ''} • ${LABEL_TIPO[d.tipo]}`}>
                                                                {String(d.dia).padStart(2, '0')} {d.diaSemana}{d.feriado ? '/Fer' : ''} · {sigla(d.tipo)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">{m.injustificadas}</td>
                                                <td className="px-3 py-2 text-center">{m.justificadas}</td>
                                                <td className="px-3 py-2 text-center">{m.suspensoes}</td>
                                                <td className="px-3 py-2 text-center">{m.domingosFeriadosPerdidos}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function safeParse(v: string) {
    try { return JSON.parse(v); } catch { return {}; }
}

function sigla(tipo: TipoFalta) {
    return tipo === 'injustificada' ? 'I' : tipo === 'justificada' ? 'J' : 'S';
}

function corTipo(tipo: TipoFalta) {
    if (tipo === 'injustificada') return 'bg-red-100 text-red-800';
    if (tipo === 'justificada') return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
}

export default RelatorioDiasFalta;
