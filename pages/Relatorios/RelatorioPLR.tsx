import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Printer, FileSpreadsheet, ArrowUp, ArrowDown, X } from 'lucide-react';
import { buscarParametrosPLR, calcularPLRSemestre, getPrazos } from '../../utils/calcularPLR';

// ── Tipos ────────────────────────────────────────────────────────────────────

type StatusPLR = 'calculado' | 'aprovado' | 'pago' | 'cancelado';

interface DiaFaltaPLR {
    data: string; // dd/mm/aaaa
    tipo: 'justificada' | 'injustificada';
}

interface LinhaPLR {
    funcionario_id: string;
    nome: string;
    empresa_id: string;

    data_admissao: string;
    cargo: string;
    meses: number;
    faltas_justificadas: number;
    faltas_injustificadas: number;
    advertencias: number;
    suspensoes: number;
    valor_bruto: number;
    desconto_total: number;
    valor_final: number;
    diasJustificadas: string[];
    diasInjustificadas: string[];
}

type ColKey =
    | 'nome' | 'data_admissao' | 'cargo' | 'meses'
    | 'faltas_justificadas' | 'faltas_injustificadas'
    | 'advertencias' | 'suspensoes'
    | 'valor_bruto' | 'desconto_total' | 'valor_final';

const COLUNAS: Array<{ key: ColKey; label: string; numeric?: boolean }> = [
    { key: 'nome',                  label: 'Nome do Funcionário' },
    { key: 'data_admissao',         label: 'Admissão' },
    { key: 'cargo',                 label: 'Cargo' },
    { key: 'meses',                 label: 'Meses', numeric: true },
    { key: 'faltas_justificadas',   label: 'Faltas Justif.', numeric: true },
    { key: 'faltas_injustificadas', label: 'Faltas Injustif.', numeric: true },
    { key: 'advertencias',          label: 'Advertências', numeric: true },
    { key: 'suspensoes',            label: 'Suspensões', numeric: true },
    { key: 'valor_bruto',           label: 'PLR Bruto', numeric: true },
    { key: 'desconto_total',        label: 'Descontos', numeric: true },
    { key: 'valor_final',           label: 'Saldo a Receber', numeric: true },
];

const STATUS_LABEL: Record<StatusPLR, string> = {
    calculado: 'Calculado',
    aprovado: 'Aprovado',
    pago: 'Pago',
    cancelado: 'Cancelado',
};

const STATUS_CLASS: Record<StatusPLR, string> = {
    calculado: 'bg-blue-100 text-blue-800',
    aprovado: 'bg-amber-100 text-amber-800',
    pago: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-red-100 text-red-800',
};

const fmtMoeda = (n: number) =>
    (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso?: string) => {
    if (!iso) return '-';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

const safeParse = (s: any) => { try { return JSON.parse(s); } catch { return {}; } };

// ── Componente ───────────────────────────────────────────────────────────────

const RelatorioPLR: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const hoje = new Date();

    const [ano, setAno] = useState(hoje.getFullYear());
    const [semestre, setSemestre] = useState(hoje.getMonth() < 6 ? 1 : 2);
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    const [saldoFiltro, setSaldoFiltro] = useState('');
    const [empresas, setEmpresas] = useState<Array<{ id: string; nome_empresa: string }>>([]);

    const [linhas, setLinhas] = useState<LinhaPLR[]>([]);
    const [loading, setLoading] = useState(false);

    const [ordenarPor, setOrdenarPor] = useState<ColKey>('nome');
    const [direcao, setDirecao] = useState<'asc' | 'desc'>('asc');
    const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

    const [modalImpressao, setModalImpressao] = useState(false);
    const [colunasSelecionadas, setColunasSelecionadas] = useState<ColKey[]>(COLUNAS.map(c => c.key));
    const [imprimirDetalhes, setImprimirDetalhes] = useState(true);

    const prazos = useMemo(() => getPrazos(ano, semestre), [ano, semestre]);

    useEffect(() => {
        supabase.from('empresas').select('id, nome_empresa').order('nome_empresa')
            .then(({ data }) => setEmpresas(data || []));
    }, []);

    useEffect(() => { carregar(); setExcluidos(new Set()); /* eslint-disable-next-line */ }, [ano, semestre]);

    const carregar = async () => {
        setLoading(true);
        try {
            const mesInicio = semestre === 1 ? 1 : 7;
            const mesFim = semestre === 1 ? 6 : 12;

            // Busca parâmetros e funcionários em paralelo
            const [parametros, { data: funcs }] = await Promise.all([
                buscarParametrosPLR(ano),
                supabase.from('funcionarios')
                    .select('id, nome_completo, cpf, nome_cargo, nome_empresa, empresa_id, data_admissao')
                    .order('nome_completo'),
            ]);

            if (!parametros) { setLinhas([]); return; }

            const funcMap = new Map((funcs || []).map((f: any) => [f.id, f]));

            // Sempre recalcula com a lógica atual
            const calc = await calcularPLRSemestre(ano, semestre, parametros);
            if (calc.length === 0) { setLinhas([]); return; }

            const ids = calc.map(c => c.funcionario_id);

            // Busca advertências editadas manualmente e dados de faltas em paralelo
            const [{ data: salvos }, { data: folhas }] = await Promise.all([
                supabase.from('plr_apuracao')
                    .select('funcionario_id, advertencias')
                    .eq('ano', ano)
                    .eq('semestre', semestre)
                    .in('funcionario_id', ids),
                supabase.from('folhas_ponto')
                    .select('funcionario_id, mes, ano, dados_dias')
                    .in('funcionario_id', ids)
                    .eq('ano', ano)
                    .gte('mes', mesInicio)
                    .lte('mes', mesFim),
            ]);

            const advertenciasMap = new Map((salvos || []).map((s: any) => [s.funcionario_id, s.advertencias]));

            const detalhes = new Map<string, DiaFaltaPLR[]>();
            (folhas || []).forEach((folha: any) => {
                const dados = typeof folha.dados_dias === 'string' ? safeParse(folha.dados_dias) : (folha.dados_dias || {});
                const lista = detalhes.get(folha.funcionario_id) || [];
                Object.keys(dados || {}).filter(k => k.startsWith('dia_')).forEach(key => {
                    const dia = Number.parseInt(key.replace('dia_', ''), 10);
                    const d = dados[key] || {};
                    if (!dia) return;
                    const data = `${String(dia).padStart(2, '0')}/${String(folha.mes).padStart(2, '0')}/${folha.ano}`;
                    if (d.falta_injustificada) lista.push({ data, tipo: 'injustificada' });
                    else if (d.atestado) lista.push({ data, tipo: 'justificada' });
                });
                detalhes.set(folha.funcionario_id, lista);
            });

            const novas: LinhaPLR[] = calc.map(c => {
                const f: any = funcMap.get(c.funcionario_id) || {};
                const dias = (detalhes.get(c.funcionario_id) || []).sort((a, b) => a.data.localeCompare(b.data));
                // Usa advertências editadas manualmente se existirem
                const advertencias = advertenciasMap.get(c.funcionario_id) ?? c.advertencias;
                return {
                    funcionario_id: c.funcionario_id,
                    nome: f.nome_completo || '-',
                    empresa_id: f.empresa_id || '',
                    data_admissao: f.data_admissao || '',
                    cargo: f.nome_cargo || '-',
                    meses: c.meses_trabalhados,
                    faltas_justificadas: c.faltas_justificadas,
                    faltas_injustificadas: c.faltas_injustificadas,
                    advertencias,
                    suspensoes: c.suspensoes,
                    valor_bruto: c.valor_bruto,
                    desconto_total: c.desconto_total,
                    valor_final: c.valor_final,
                    diasJustificadas: dias.filter(d => d.tipo === 'justificada').map(d => d.data),
                    diasInjustificadas: dias.filter(d => d.tipo === 'injustificada').map(d => d.data),
                };
            });

            setLinhas(novas);
        } catch (error: any) {
            showToast(`Erro ao carregar PLR: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const linhasVisiveis = useMemo(() => {
        const filtradas = linhas.filter(l =>
            (!empresaFiltro || l.empresa_id === empresaFiltro) &&
            (saldoFiltro === '' ||
                (saldoFiltro === 'positivo' && l.valor_final > 0) ||
                (saldoFiltro === 'nulo' && l.valor_final <= 0)) &&
            !excluidos.has(l.funcionario_id)
        );
        const dir = direcao === 'asc' ? 1 : -1;
        return [...filtradas].sort((a, b) => {
            const va = (a as any)[ordenarPor];
            const vb = (b as any)[ordenarPor];
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR') * dir;
        });
    }, [linhas, empresaFiltro, saldoFiltro, excluidos, ordenarPor, direcao]);

    const totais = useMemo(() => ({
        bruto: linhasVisiveis.reduce((s, l) => s + l.valor_bruto, 0),
        desconto: linhasVisiveis.reduce((s, l) => s + l.desconto_total, 0),
        final: linhasVisiveis.reduce((s, l) => s + l.valor_final, 0),
    }), [linhasVisiveis]);

    const alternarOrdem = (key: ColKey) => {
        if (ordenarPor === key) setDirecao(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setOrdenarPor(key); setDirecao('asc'); }
    };

    const tituloRelatorio = `Relatório PLR - ${semestre}º Semestre - apuração de ${fmtData(prazos.apuracao_inicio)} a ${fmtData(prazos.apuracao_fim)} - Pagamento: ${fmtData(prazos.limite_pagamento)} (${semestre === 1 ? '1ª' : '2ª'} parcela)`;

    const valorCelula = (l: LinhaPLR, key: ColKey): string => {
        switch (key) {
            case 'valor_bruto':     return fmtMoeda(l.valor_bruto);
            case 'desconto_total':  return fmtMoeda(l.desconto_total);
            case 'valor_final':     return fmtMoeda(l.valor_final);
            case 'data_admissao':   return fmtData(l.data_admissao);
            default:                return String((l as any)[key] ?? '-');
        }
    };

    const imprimir = () => {
        const cols = COLUNAS.filter(c => colunasSelecionadas.includes(c.key));
        if (cols.length === 0) { showToast('Selecione ao menos uma coluna', 'error'); return; }

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
      <html><head><title>Relatório PLR ${semestre}º sem/${ano}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; }
        h1 { font-size: 14px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 3px 4px; }
        th { background: #f3e0aa; text-align: center; }
        td.num { text-align: right; }
        tr.det td { background: #f7f7f7; font-size: 9px; }
        tr.tot td { background: #c5e0b4; font-weight: bold; }
      </style></head><body>
      <h1>${tituloRelatorio}</h1>
      <table>
        <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${linhasVisiveis.map(l => `
            <tr>${cols.map(c => `<td class="${c.numeric ? 'num' : ''}">${valorCelula(l, c.key)}</td>`).join('')}</tr>
            ${imprimirDetalhes && (l.diasJustificadas.length || l.diasInjustificadas.length) ? `
              <tr class="det"><td></td><td colspan="${cols.length - 1}">
                ${l.diasJustificadas.length ? `<strong>Faltas justificadas:</strong> ${l.diasJustificadas.join('; ')} ` : ''}
                ${l.diasInjustificadas.length ? `<strong>Faltas injustificadas:</strong> ${l.diasInjustificadas.join('; ')}` : ''}
              </td></tr>` : ''}
          `).join('')}
          <tr class="tot">
            ${cols.map(c => {
            if (c.key === 'valor_bruto') return `<td class="num">${fmtMoeda(totais.bruto)}</td>`;
            if (c.key === 'desconto_total') return `<td class="num">${fmtMoeda(totais.desconto)}</td>`;
            if (c.key === 'valor_final') return `<td class="num">${fmtMoeda(totais.final)}</td>`;
            if (c.key === 'nome') return `<td>TOTAL (${linhasVisiveis.length})</td>`;
            return '<td></td>';
        }).join('')}
          </tr>
        </tbody>
      </table>
      </body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 400);
        setModalImpressao(false);
    };

    const exportarCSV = () => {
        const cols = COLUNAS;
        const linhasCsv = [cols.map(c => c.label).join(';')];
        linhasVisiveis.forEach(l => {
            linhasCsv.push(cols.map(c => valorCelula(l, c.key)).join(';'));
            if (l.diasJustificadas.length) linhasCsv.push(`Faltas justificadas;${l.diasJustificadas.join(' ')}`);
            if (l.diasInjustificadas.length) linhasCsv.push(`Faltas injustificadas;${l.diasInjustificadas.join(' ')}`);
        });
        const blob = new Blob(['\uFEFF' + linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-plr-${semestre}sem-${ano}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Relatório PLR</h1>
                    <p className="text-sm text-muted-foreground">{tituloRelatorio}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportarCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                        <FileSpreadsheet size={16} /> Excel/CSV
                    </button>
                    <button onClick={() => setModalImpressao(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Ano</label>
                        <select value={ano} onChange={e => setAno(Number(e.target.value))} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Semestre</label>
                        <select value={semestre} onChange={e => setSemestre(Number(e.target.value))} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value={1}>1º Semestre</option>
                            <option value={2}>2º Semestre</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Empresa</label>
                        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value="">Todas</option>
                            {empresas.map(e => <option key={e.id} value={e.nome_empresa}>{e.nome_empresa}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Saldo</label>
                        <select value={saldoFiltro} onChange={e => setSaldoFiltro(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm">
                            <option value="">Todos</option>
                            <option value="positivo">Com saldo a receber ({">"} 0)</option>
                            <option value="nulo">Sem saldo (≤ 0)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg shadow-md p-4">
                    <p className="text-xs text-muted-foreground">Funcionários</p>
                    <p className="text-2xl font-bold text-foreground">{linhasVisiveis.length}</p>
                </div>
                <div className="bg-card border border-border rounded-lg shadow-md p-4">
                    <p className="text-xs text-muted-foreground">PLR Bruto</p>
                    <p className="text-2xl font-bold text-blue-600">{fmtMoeda(totais.bruto)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg shadow-md p-4">
                    <p className="text-xs text-muted-foreground">Descontos</p>
                    <p className="text-2xl font-bold text-red-600">{fmtMoeda(totais.desconto)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg shadow-md p-4">
                    <p className="text-xs text-muted-foreground">Saldo a Receber</p>
                    <p className="text-2xl font-bold text-emerald-600">{fmtMoeda(totais.final)}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-muted-foreground text-sm">Carregando apuração...</p>
                </div>
            ) : linhasVisiveis.length === 0 ? (
                <div className="bg-card rounded-lg shadow-md p-8 text-center text-muted-foreground border border-border">
                    Nenhuma apuração de PLR encontrada para o período selecionado.
                </div>
            ) : (
                <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border overflow-x-auto overflow-y-auto max-h-[60vh] plr-scroll-container">
                    <table className="min-w-full text-sm">
                        <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                                {COLUNAS.map(c => (
                                    <th
                                        key={c.key}
                                        onClick={() => alternarOrdem(c.key)}
                                        className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap cursor-pointer select-none hover:bg-accent"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {c.label}
                                            {ordenarPor === c.key && (direcao === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                        </span>
                                    </th>
                                ))}
                                <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhasVisiveis.map(l => (
                                <React.Fragment key={l.funcionario_id}>
                                    <tr className="border-t border-border">
                                        {COLUNAS.map(c => (
                                            <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.numeric ? 'text-right' : ''}`}>
                                                {valorCelula(l, c.key)}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setExcluidos(prev => new Set([...prev, l.funcionario_id]))}
                                                className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/60 whitespace-nowrap"
                                                title="Remover do relatório"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                    {(l.diasJustificadas.length > 0 || l.diasInjustificadas.length > 0) && (
                                        <tr className="bg-muted/40">
                                            <td className="px-3 py-1.5" />
                                            <td colSpan={COLUNAS.length} className="px-3 py-1.5 text-xs text-muted-foreground">
                                                {l.diasJustificadas.length > 0 && (
                                                    <span className="mr-4"><strong>Faltas justificadas:</strong> {l.diasJustificadas.join('; ')}</span>
                                                )}
                                                {l.diasInjustificadas.length > 0 && (
                                                    <span><strong>Faltas injustificadas:</strong> {l.diasInjustificadas.join('; ')}</span>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            <tr className="border-t-2 border-border bg-emerald-50 dark:bg-emerald-900/20 font-bold">
                                <td className="px-3 py-2" colSpan={8}>TOTAL ({linhasVisiveis.length})</td>
                                <td className="px-3 py-2 text-right">{fmtMoeda(totais.bruto)}</td>
                                <td className="px-3 py-2 text-right">{fmtMoeda(totais.desconto)}</td>
                                <td className="px-3 py-2 text-right">{fmtMoeda(totais.final)}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de impressão */}
            {modalImpressao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h2 className="font-semibold">Colunas para impressão</h2>
                            <button onClick={() => setModalImpressao(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            <div className="flex gap-2 text-xs">
                                <button onClick={() => setColunasSelecionadas(COLUNAS.map(c => c.key))} className="px-2 py-1 rounded border border-border">Selecionar todas</button>
                                <button onClick={() => setColunasSelecionadas([])} className="px-2 py-1 rounded border border-border">Limpar</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {COLUNAS.map(c => (
                                    <label key={c.key} className="inline-flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={colunasSelecionadas.includes(c.key)}
                                            onChange={e => setColunasSelecionadas(prev =>
                                                e.target.checked ? [...prev, c.key] : prev.filter(k => k !== c.key)
                                            )}
                                        />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm pt-2 border-t border-border w-full">
                                <input type="checkbox" checked={imprimirDetalhes} onChange={e => setImprimirDetalhes(e.target.checked)} />
                                Imprimir detalhamento das datas das faltas
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
                            <button onClick={() => setModalImpressao(false)} className="px-3 py-2 rounded border border-border text-sm">Cancelar</button>
                            <button onClick={imprimir} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelatorioPLR;
