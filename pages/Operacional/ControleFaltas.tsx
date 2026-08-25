import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { calcularDiasFeriasPorFaltas } from '../../hooks/useCalculoFerias';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Funcionario {
    id: number;
    nome_completo: string;
    empresa_id?: number;
    posto_trabalho_id?: number;
    empresa?: { id: string; nome_empresa: string };
    posto_trabalho?: { id: string; nome_posto: string };
}

interface RegistroFalta {
    mes: number;
    ano: number;
    justificadas: number;
    injustificadas: number;
    suspensoes: number;
    total: number;
}

interface ResumoFuncionario {
    funcionario: Funcionario;
    registros: RegistroFalta[];
    totalJustificadas: number;
    totalInjustificadas: number;
    totalSuspensoes: number;
    totalGeral: number;
    diasFerias: number; // impacto CLT
}

// ── Constantes ───────────────────────────────────────────────────────────────

const MESES = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MESES_COMPLETOS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Tabela CLT para exibição
const TABELA_CLT = [
    { faixaLabel: '0 – 5 faltas', diasFerias: 30 },
    { faixaLabel: '6 – 14 faltas', diasFerias: 24 },
    { faixaLabel: '15 – 23 faltas', diasFerias: 18 },
    { faixaLabel: '24 – 32 faltas', diasFerias: 12 },
    { faixaLabel: '> 32 faltas', diasFerias: 0 },
];

// ── Componente ────────────────────────────────────────────────────────────────

const ControleFaltas: React.FC = () => {
    const { showToast, ToastContainer } = useToast();

    const [ano, setAno] = useState(new Date().getFullYear());
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    const [postoFiltro, setPostoFiltro] = useState('');
    const [funcionarioFiltro, setFuncionarioFiltro] = useState('');
    const [loading, setLoading] = useState(false);

    const [empresas, setEmpresas] = useState<Array<{ id: string; nome_empresa: string }>>([]);
    const [postos, setPostos] = useState<Array<{ id: string; nome_posto: string }>>([]);
    const [resumos, setResumos] = useState<ResumoFuncionario[]>([]);
    const [expandido, setExpandido] = useState<number | null>(null);

    // Modo de visualização: consolidado (uma linha por funcionário) ou detalhado (mês a mês)
    const [modoDetalhado, setModoDetalhado] = useState(false);

    useEffect(() => {
        carregarFiltros();
    }, []);

    useEffect(() => {
        carregarDados();
    }, [ano, empresaFiltro, postoFiltro]);

    const carregarFiltros = async () => {
        const [{ data: emp }, { data: pos }] = await Promise.all([
            supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
            supabase.from('postos_trabalho').select('id, nome_posto').eq('ativo', true).is('local_area', null).order('nome_posto'),
        ]);
        setEmpresas(emp || []);
        setPostos(pos || []);
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            // 1. Buscar funcionários ativos com filtros
            let query = supabase
                .from('funcionarios')
                .select('id, nome_completo, empresa_id, posto_trabalho_id, empresa:empresas(id, nome_empresa), posto_trabalho:postos_trabalho(id, nome_posto)')
                .eq('ativo', true)
                .eq('demitido', false)
                .order('nome_completo');

            if (empresaFiltro) query = query.eq('empresa_id', empresaFiltro);
            if (postoFiltro) query = query.eq('posto_trabalho_id', postoFiltro);

            const { data: funcionarios, error: errFunc } = await query;
            if (errFunc) throw errFunc;
            if (!funcionarios || funcionarios.length === 0) {
                setResumos([]);
                return;
            }

            // 2. Buscar todas as folhas de ponto do ano para esses funcionários
            const ids = funcionarios.map(f => f.id);
            const { data: folhas, error: errFolhas } = await supabase
                .from('folhas_ponto')
                .select('funcionario_id, mes, ano, total_faltas_justificadas, total_faltas_injustificadas, total_suspensoes')
                .in('funcionario_id', ids)
                .eq('ano', ano)
                .order('mes');

            if (errFolhas) throw errFolhas;

            // 3. Montar resumo por funcionário
            const novosResumos: ResumoFuncionario[] = (funcionarios as any[]).map(func => {
                const folhasFunc = (folhas || []).filter(f => f.funcionario_id === func.id);

                const registros: RegistroFalta[] = folhasFunc.map(f => ({
                    mes: f.mes,
                    ano: f.ano,
                    justificadas: f.total_faltas_justificadas || 0,
                    injustificadas: f.total_faltas_injustificadas || 0,
                    suspensoes: f.total_suspensoes || 0,
                    total: (f.total_faltas_justificadas || 0) + (f.total_faltas_injustificadas || 0) + (f.total_suspensoes || 0),
                }));

                const totalJustificadas = registros.reduce((s, r) => s + r.justificadas, 0);
                const totalInjustificadas = registros.reduce((s, r) => s + r.injustificadas, 0);
                const totalSuspensoes = registros.reduce((s, r) => s + r.suspensoes, 0);
                const totalGeral = totalJustificadas + totalInjustificadas + totalSuspensoes;
                const diasFerias = calcularDiasFeriasPorFaltas(totalInjustificadas + totalSuspensoes);

                return { funcionario: func, registros, totalJustificadas, totalInjustificadas, totalSuspensoes, totalGeral, diasFerias };
            });

            setResumos(novosResumos);
        } catch (error: any) {
            showToast(`Erro ao carregar dados: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filtro local por nome
    const resumosFiltrados = resumos.filter(r =>
        !funcionarioFiltro ||
        r.funcionario.nome_completo.toLowerCase().includes(funcionarioFiltro.toLowerCase())
    );

    // Cor do badge de dias de férias
    const corFerias = (dias: number) => {
        if (dias === 30) return 'bg-green-100 text-green-800';
        if (dias === 24) return 'bg-yellow-100 text-yellow-800';
        if (dias === 18) return 'bg-orange-100 text-orange-800';
        if (dias === 12) return 'bg-red-100 text-red-800';
        return 'bg-red-200 text-red-900 font-bold';
    };

    const getMesRegistro = (registros: RegistroFalta[], mes: number) =>
        registros.find(r => r.mes === mes);

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Controle de Faltas</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModoDetalhado(false)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!modoDetalhado ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Consolidado
                    </button>
                    <button
                        onClick={() => setModoDetalhado(true)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${modoDetalhado ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Mês a Mês
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                        <select
                            value={ano}
                            onChange={e => setAno(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                        <select
                            value={empresaFiltro}
                            onChange={e => setEmpresaFiltro(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Todas</option>
                            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
                        <select
                            value={postoFiltro}
                            onChange={e => setPostoFiltro(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Todos</option>
                            {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={funcionarioFiltro}
                            onChange={e => setFuncionarioFiltro(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Tabela CLT de referência */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Tabela CLT — Impacto de faltas injustificadas + suspensões nas férias:</p>
                <div className="flex flex-wrap gap-3">
                    {TABELA_CLT.map(t => (
                        <div key={t.diasFerias} className="flex items-center gap-2 text-xs text-blue-700">
                            <span className={`px-2 py-0.5 rounded font-bold ${corFerias(t.diasFerias)}`}>{t.diasFerias}d</span>
                            <span>{t.faixaLabel}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-gray-600 text-sm">Carregando dados...</p>
                </div>
            ) : resumosFiltrados.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    Nenhum dado encontrado para os filtros selecionados.
                </div>
            ) : modoDetalhado ? (
                <TabelaDetalhada resumos={resumosFiltrados} corFerias={corFerias} getMesRegistro={getMesRegistro} />
            ) : (
                <TabelaConsolidada
                    resumos={resumosFiltrados}
                    corFerias={corFerias}
                    expandido={expandido}
                    setExpandido={setExpandido}
                    getMesRegistro={getMesRegistro}
                />
            )}
        </div>
    );
};

// ── Tabela Consolidada (uma linha por funcionário, expansível) ────────────────

const TabelaConsolidada: React.FC<{
    resumos: ResumoFuncionario[];
    corFerias: (d: number) => string;
    expandido: number | null;
    setExpandido: (id: number | null) => void;
    getMesRegistro: (r: RegistroFalta[], mes: number) => RegistroFalta | undefined;
}> = ({ resumos, corFerias, expandido, setExpandido, getMesRegistro }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Funcionário</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Empresa / Posto</th>
                        <th className="px-3 py-3 text-center font-semibold text-blue-700">Justif.</th>
                        <th className="px-3 py-3 text-center font-semibold text-red-700">Injustif.</th>
                        <th className="px-3 py-3 text-center font-semibold text-orange-700">Suspens.</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">Total</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">Férias (CLT)</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-500">Detalhe</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {resumos.map(r => (
                        <React.Fragment key={r.funcionario.id}>
                            <tr className={`hover:bg-gray-50 transition-colors ${expandido === r.funcionario.id ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-900">{r.funcionario.nome_completo}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    <div>{(r.funcionario.empresa as any)?.nome_empresa || '—'}</div>
                                    <div>{(r.funcionario.posto_trabalho as any)?.nome_posto || '—'}</div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-semibold ${r.totalJustificadas > 0 ? 'bg-blue-100 text-blue-800' : 'text-gray-400'}`}>
                                        {r.totalJustificadas}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-semibold ${r.totalInjustificadas > 0 ? 'bg-red-100 text-red-800' : 'text-gray-400'}`}>
                                        {r.totalInjustificadas}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-semibold ${r.totalSuspensoes > 0 ? 'bg-orange-100 text-orange-800' : 'text-gray-400'}`}>
                                        {r.totalSuspensoes}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-gray-800">{r.totalGeral}</td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${corFerias(r.diasFerias)}`}>
                                        {r.diasFerias}d
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <button
                                        onClick={() => setExpandido(expandido === r.funcionario.id ? null : r.funcionario.id)}
                                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                                    >
                                        {expandido === r.funcionario.id ? 'Fechar' : 'Ver meses'}
                                    </button>
                                </td>
                            </tr>
                            {expandido === r.funcionario.id && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3 bg-blue-50">
                                        <DetalhesMensais registros={r.registros} getMesRegistro={getMesRegistro} />
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                        <td colSpan={2} className="px-4 py-2 font-bold text-gray-700 text-sm">Totais ({resumos.length} funcionários)</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700">
                            {resumos.reduce((s, r) => s + r.totalJustificadas, 0)}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-red-700">
                            {resumos.reduce((s, r) => s + r.totalInjustificadas, 0)}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-orange-700">
                            {resumos.reduce((s, r) => s + r.totalSuspensoes, 0)}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-gray-800">
                            {resumos.reduce((s, r) => s + r.totalGeral, 0)}
                        </td>
                        <td colSpan={2} />
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
);

// ── Detalhe mensal expandido ──────────────────────────────────────────────────

const DetalhesMensais: React.FC<{
    registros: RegistroFalta[];
    getMesRegistro: (r: RegistroFalta[], mes: number) => RegistroFalta | undefined;
}> = ({ registros, getMesRegistro }) => (
    <div className="overflow-x-auto">
        <table className="text-xs w-full">
            <thead>
                <tr>
                    {MESES.map((m, i) => (
                        <th key={i} className="px-2 py-1 text-center text-gray-500 font-semibold">{m}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {/* Justificadas */}
                <tr>
                    {MESES.map((_, i) => {
                        const reg = getMesRegistro(registros, i + 1);
                        return (
                            <td key={i} className="px-2 py-1 text-center">
                                {reg && reg.justificadas > 0
                                    ? <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">{reg.justificadas}J</span>
                                    : <span className="text-gray-300">—</span>}
                            </td>
                        );
                    })}
                </tr>
                {/* Injustificadas */}
                <tr>
                    {MESES.map((_, i) => {
                        const reg = getMesRegistro(registros, i + 1);
                        return (
                            <td key={i} className="px-2 py-1 text-center">
                                {reg && reg.injustificadas > 0
                                    ? <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold">{reg.injustificadas}I</span>
                                    : <span className="text-gray-300">—</span>}
                            </td>
                        );
                    })}
                </tr>
            </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-1">J = Justificada &nbsp;|&nbsp; I = Injustificada</p>
    </div>
);

// ── Tabela Detalhada (mês a mês, uma linha por funcionário por mês) ───────────

const TabelaDetalhada: React.FC<{
    resumos: ResumoFuncionario[];
    corFerias: (d: number) => string;
    getMesRegistro: (r: RegistroFalta[], mes: number) => RegistroFalta | undefined;
}> = ({ resumos, corFerias, getMesRegistro }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50">Funcionário</th>
                        {MESES.map((m, i) => (
                            <th key={i} className="px-2 py-3 text-center font-semibold text-gray-500 min-w-[52px]">{m}</th>
                        ))}
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">Total</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">Férias</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {resumos.map(r => (
                        <tr key={r.funcionario.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                                {r.funcionario.nome_completo}
                            </td>
                            {MESES.map((_, i) => {
                                const reg = getMesRegistro(r.registros, i + 1);
                                const total = reg ? reg.total : 0;
                                const inj = reg ? reg.injustificadas + reg.suspensoes : 0;
                                return (
                                    <td key={i} className="px-2 py-2 text-center">
                                        {total > 0 ? (
                                            <span
                                                title={reg ? `J:${reg.justificadas} I:${reg.injustificadas} S:${reg.suspensoes}` : ''}
                                                className={`inline-block min-w-[28px] px-1.5 py-0.5 rounded text-xs font-semibold cursor-help ${inj > 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                                            >
                                                {total}
                                            </span>
                                        ) : (
                                            <span className="text-gray-200">—</span>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="px-3 py-2 text-center font-bold text-gray-800">{r.totalGeral}</td>
                            <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${corFerias(r.diasFerias)}`}>
                                    {r.diasFerias}d
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <p className="text-xs text-gray-400 px-4 py-2">
            Passe o mouse sobre o número para ver o detalhamento (J = Justificada, I = Injustificada, S = Suspensão).
            Vermelho = contém faltas injustificadas ou suspensões.
        </p>
    </div>
);

export default ControleFaltas;
