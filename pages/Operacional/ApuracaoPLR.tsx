import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { calcularPLRSemestre, buscarParametrosPLR, getPrazos, type ResultadoPLR, type PLRParametros } from '../../utils/calcularPLR';
import ProgressBar from '../../components/ui/ProgressBar';


// ── Tipos ─────────────────────────────────────────────────────────────────────

type Escopo = 'todos' | 'empresa' | 'posto' | 'individual';

interface LinhaApuracao extends ResultadoPLR {
    advertencias_editadas: number;
    suspensoes_editadas: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function diasParaPrazo(dataLimite: string): number {
    const hoje = new Date();
    const limite = new Date(dataLimite + 'T00:00:00');
    return Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Componente ────────────────────────────────────────────────────────────────

const ApuracaoPLR: React.FC = () => {
    const { showToast, ToastContainer } = useToast();

    // Período
    const [ano, setAno] = useState(new Date().getFullYear());
    const [semestre, setSemestre] = useState<1 | 2>(1);

    // Escopo de cálculo
    const [escopo, setEscopo] = useState<Escopo>('todos');
    const [empresaSelecionada, setEmpresaSelecionada] = useState('');
    const [postoSelecionado, setPostoSelecionado] = useState('');
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');

    // Dados de referência para os selects
    const [empresas, setEmpresas] = useState<Array<{ id: string; nome_empresa: string }>>([]);
    const [postos, setPostos] = useState<Array<{ id: string; nome_posto: string }>>([]);
    const [funcionarios, setFuncionarios] = useState<Array<{ id: string; nome_completo: string; empresa_id?: string; posto_trabalho_id?: string }>>([]);

    // Estado da apuração
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [progressoCalc, setProgressoCalc] = useState({ atual: 0, total: 0 });
    const [progressoSave, setProgressoSave] = useState({ atual: 0, total: 0 });
    const [linhas, setLinhas] = useState<LinhaApuracao[]>([]);
    const [parametrosPLR, setParametrosPLR] = useState<PLRParametros | null>(null);

    const prazos = getPrazos(ano, semestre);

    // Carregar dados de referência
    useEffect(() => {
        const carregar = async () => {
            const [{ data: emp }, { data: pos }, { data: func }] = await Promise.all([
                supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
                supabase.from('postos_trabalho').select('id, nome_posto').eq('ativo', true).is('local_area', null).order('nome_posto'),
                supabase.from('funcionarios').select('id, nome_completo, empresa_id, posto_trabalho_id')
                    .eq('ativo', true).eq('demitido', false).order('nome_completo'),
            ]);
            setEmpresas(emp || []);
            setPostos(pos || []);
            setFuncionarios(func || []);
        };
        carregar();
    }, []);

    // Busca os parâmetros PLR do banco para o ano selecionado
    useEffect(() => {
        buscarParametrosPLR(ano).then(setParametrosPLR);
    }, [ano]);

    // Limpa resultados ao mudar período ou escopo
    useEffect(() => {
        setLinhas([]);
    }, [ano, semestre, escopo, empresaSelecionada, postoSelecionado, funcionarioSelecionado]);

    // Funcionários filtrados para o select individual (respeita empresa/posto se selecionados)
    const funcionariosFiltrados = funcionarios.filter(f => {
        if (escopo === 'empresa' && empresaSelecionada) return f.empresa_id === empresaSelecionada;
        if (escopo === 'posto' && postoSelecionado) return f.posto_trabalho_id === postoSelecionado;
        return true;
    });

    const handleCalcular = async () => {
        if (!parametrosPLR) {
            showToast(`PLR Base não encontrado para ${ano}. Configure em Tabelas > Benefícios.`, 'error');
            return;
        }

        // Validar seleção conforme escopo
        if (escopo === 'empresa' && !empresaSelecionada) {
            showToast('Selecione uma empresa.', 'error'); return;
        }
        if (escopo === 'posto' && !postoSelecionado) {
            showToast('Selecione um posto de trabalho.', 'error'); return;
        }
        if (escopo === 'individual' && !funcionarioSelecionado) {
            showToast('Selecione um funcionário.', 'error'); return;
        }

        setLoading(true);
        setProgressoCalc({ atual: 1, total: 3 });
        try {
            // Calcula todos e filtra pelo escopo
            setProgressoCalc({ atual: 1, total: 3 });
            let resultados = await calcularPLRSemestre(ano, semestre, parametrosPLR);

            setProgressoCalc({ atual: 2, total: 3 });
            if (escopo === 'empresa' && empresaSelecionada) {
                const idsEmpresa = new Set(funcionarios.filter(f => f.empresa_id === empresaSelecionada).map(f => f.id));
                resultados = resultados.filter(r => idsEmpresa.has(r.funcionario_id));
            } else if (escopo === 'posto' && postoSelecionado) {
                const idsPosto = new Set(funcionarios.filter(f => f.posto_trabalho_id === postoSelecionado).map(f => f.id));
                resultados = resultados.filter(r => idsPosto.has(r.funcionario_id));
            } else if (escopo === 'individual' && funcionarioSelecionado) {
                resultados = resultados.filter(r => r.funcionario_id === funcionarioSelecionado);
            }

            // Buscar advertências e suspensões já salvos
            const ids = resultados.map(r => r.funcionario_id);
            const { data: salvos } = await supabase
                .from('plr_apuracao')
                .select('funcionario_id, advertencias, suspensoes')
                .eq('ano', ano)
                .eq('semestre', semestre)
                .in('funcionario_id', ids);

            const salvosMap = new Map((salvos || []).map(s => [s.funcionario_id, s]));

            setProgressoCalc({ atual: 3, total: 3 });
            setLinhas(resultados.map(r => ({
                ...r,
                advertencias_editadas: salvosMap.get(r.funcionario_id)?.advertencias ?? r.advertencias,
                suspensoes_editadas: salvosMap.get(r.funcionario_id)?.suspensoes ?? r.suspensoes,
            })));

            showToast(`${resultados.length} funcionário(s) calculado(s).`, 'success');
        } catch (error: any) {
            showToast(`Erro ao calcular: ${error.message}`, 'error');
        } finally {
            setLoading(false);
            setProgressoCalc({ atual: 0, total: 0 });
        }
    };

    const handleAdvertenciaChange = (funcionarioId: string, valor: number) => {
        setLinhas(prev => prev.map(l =>
            l.funcionario_id === funcionarioId ? { ...l, advertencias_editadas: valor } : l
        ));
    };

    const handleSuspensaoChange = (funcionarioId: string, valor: number) => {
        setLinhas(prev => prev.map(l =>
            l.funcionario_id === funcionarioId ? { ...l, suspensoes_editadas: valor } : l
        ));
    };

    const handleExcluirLinha = async (funcionarioId: string, nome: string) => {
        if (!window.confirm(`Remover ${nome} da apuração de PLR deste período?`)) return;
        setLinhas(prev => prev.filter(l => l.funcionario_id !== funcionarioId));
        try {
            await supabase
                .from('plr_apuracao')
                .delete()
                .eq('funcionario_id', funcionarioId)
                .eq('ano', ano)
                .eq('semestre', semestre);
        } catch {
            // registro pode não existir ainda; a remoção da lista já foi aplicada
        }
        showToast(`${nome} removido(a) da apuração.`, 'success');
    };


    const handleRecalcular = async () => {
        if (!parametrosPLR) {
            showToast(`PLR Base não encontrado para ${ano}. Configure em Tabelas > Benefícios.`, 'error');
            return;
        }
        const confirmar = window.confirm(
            `Isso irá APAGAR os dados salvos de PLR do ${semestre}º semestre de ${ano} para o escopo selecionado e recalcular com as regras atuais.\n\nDeseja continuar?`
        );
        if (!confirmar) return;

        setLoading(true);
        try {
            // Determina os IDs afetados pelo escopo
            let idsFiltro: string[] | null = null;
            if (escopo === 'empresa' && empresaSelecionada) {
                idsFiltro = funcionarios.filter(f => f.empresa_id === empresaSelecionada).map(f => f.id);
            } else if (escopo === 'posto' && postoSelecionado) {
                idsFiltro = funcionarios.filter(f => f.posto_trabalho_id === postoSelecionado).map(f => f.id);
            } else if (escopo === 'individual' && funcionarioSelecionado) {
                idsFiltro = [funcionarioSelecionado];
            }

            // Apaga registros salvos do período
            let deleteQuery = supabase
                .from('plr_apuracao')
                .delete()
                .eq('ano', ano)
                .eq('semestre', semestre);
            if (idsFiltro) {
                deleteQuery = deleteQuery.in('funcionario_id', idsFiltro);
            }
            const { error: delErr } = await deleteQuery;
            if (delErr) throw delErr;

            showToast('Registros apagados. Recalculando...', 'success');
        } catch (error: any) {
            showToast(`Erro ao apagar registros: ${error.message}`, 'error');
            setLoading(false);
            return;
        }

        // Recalcula com a lógica atual
        await handleCalcular();
    };

    const handleSalvar = async () => {
        if (linhas.length === 0) return;
        setSalvando(true);
        setProgressoSave({ atual: 0, total: linhas.length });
        try {
            const upserts = linhas.map((l, i) => {
                setProgressoSave({ atual: i + 1, total: linhas.length });
                return {
                    funcionario_id: l.funcionario_id,
                    ano: l.ano,
                    semestre: l.semestre,
                    meses_trabalhados: l.meses_trabalhados,
                    faltas_justificadas: l.faltas_justificadas,
                    faltas_injustificadas: l.faltas_injustificadas,
                    suspensoes: l.suspensoes_editadas,
                    advertencias: l.advertencias_editadas,
                    valor_bruto: l.valor_bruto,
                    desconto_total: l.desconto_total,
                    valor_final: l.valor_final,
                };
            });

            const { error } = await supabase
                .from('plr_apuracao')
                .upsert(upserts, { onConflict: 'funcionario_id,ano,semestre' });

            if (error) throw error;
            showToast('Apuração salva com sucesso!', 'success');
        } catch (error: any) {
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setSalvando(false);
            setProgressoSave({ atual: 0, total: 0 });
        }
    };

    const linhasFiltradas = linhas;

    const totalFinal = linhasFiltradas.reduce((s, l) => s + l.valor_final, 0);
    const totalBruto = linhasFiltradas.reduce((s, l) => s + l.valor_bruto, 0);
    const totalDescontos = linhasFiltradas.reduce((s, l) => s + l.desconto_total, 0);

    const diasPrazo = prazos ? diasParaPrazo(prazos.limite_pagamento) : null;

    const escopoLabel = {
        todos: 'Todos os funcionários',
        empresa: empresas.find(e => e.id === empresaSelecionada)?.nome_empresa || 'Empresa',
        posto: postos.find(p => p.id === postoSelecionado)?.nome_posto || 'Posto',
        individual: funcionarios.find(f => f.id === funcionarioSelecionado)?.nome_completo || 'Funcionário',
    }[escopo];

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Apuração de PLR</h1>

            {/* Painel de configuração */}
            <div className="bg-white rounded-lg shadow-md p-4 space-y-4">

                {/* Linha 1: Período */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                        <select value={ano} onChange={e => setAno(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
                        <select value={semestre} onChange={e => setSemestre(Number(e.target.value) as 1 | 2)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={1}>1º Semestre (Jan–Jun)</option>
                            <option value={2}>2º Semestre (Jul–Dez)</option>
                        </select>
                    </div>
                </div>

                {/* Linha 2: Escopo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Escopo do cálculo</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(['todos', 'empresa', 'posto', 'individual'] as Escopo[]).map(op => (
                            <button key={op} onClick={() => setEscopo(op)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                    escopo === op
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                }`}>
                                {{ todos: 'Todos', empresa: 'Por Empresa', posto: 'Por Posto', individual: 'Individual' }[op]}
                            </button>
                        ))}
                    </div>

                    {/* Select dinâmico conforme escopo */}
                    {escopo === 'empresa' && (
                        <div className="max-w-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                            <select value={empresaSelecionada} onChange={e => setEmpresaSelecionada(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione uma empresa</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                            </select>
                        </div>
                    )}

                    {escopo === 'posto' && (
                        <div className="max-w-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Posto de Trabalho</label>
                            <select value={postoSelecionado} onChange={e => setPostoSelecionado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione um posto</option>
                                {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                            </select>
                        </div>
                    )}

                    {escopo === 'individual' && (
                        <div className="max-w-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
                            <select value={funcionarioSelecionado} onChange={e => setFuncionarioSelecionado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione um funcionário</option>
                                {funcionariosFiltrados.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Botões */}
                <div className="flex flex-wrap gap-3 pt-1">
                    <button onClick={handleCalcular} disabled={loading}
                        className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Calculando...' : 'Calcular PLR'}
                    </button>
                    {linhas.length > 0 && (
                        <button onClick={handleSalvar} disabled={salvando}
                            className="bg-green-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                            {salvando ? 'Salvando...' : 'Salvar Apuração'}
                        </button>
                    )}
                    <button onClick={handleRecalcular} disabled={loading}
                        className="bg-orange-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                        title="Apaga os dados salvos do período e recalcula com as regras atuais">
                        {loading ? 'Processando...' : '🔄 Recalcular (apagar e refazer)'}
                    </button>
                </div>

                {progressoCalc.total > 0 && (
                    <div className="mt-3">
                        <ProgressBar label="Calculando apuração PLR" current={progressoCalc.atual} total={progressoCalc.total} color="blue" icon="🧮" />
                    </div>
                )}
                {progressoSave.total > 0 && (
                    <div className="mt-3">
                        <ProgressBar label="Salvando apuração PLR" current={progressoSave.atual} total={progressoSave.total} color="green" icon="💾" />
                    </div>
                )}
            </div>

            {/* Informações do período */}
            {prazos && (
                <div className={`rounded-lg border p-4 text-sm ${
                    diasPrazo !== null && diasPrazo < 0 ? 'bg-red-50 border-red-300' :
                    diasPrazo !== null && diasPrazo <= 30 ? 'bg-orange-50 border-orange-300' :
                    'bg-blue-50 border-blue-200'
                }`}>
                    <div className="flex flex-wrap gap-6">
                        <div>
                            <span className="font-semibold text-gray-700">Período: </span>
                            <span className="text-gray-600">
                                {new Date(prazos.apuracao_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(prazos.apuracao_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Prazo pagamento: </span>
                            <span className={`font-semibold ${diasPrazo !== null && diasPrazo < 0 ? 'text-red-700' : diasPrazo !== null && diasPrazo <= 30 ? 'text-orange-700' : 'text-gray-600'}`}>
                                {new Date(prazos.limite_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                {diasPrazo !== null && diasPrazo >= 0 && ` (${diasPrazo} dias)`}
                                {diasPrazo !== null && diasPrazo < 0 && ' — VENCIDO'}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Taxa Sindeepres: </span>
                            <span className="text-gray-600">R$ 12,00/empregado até {new Date(prazos.limite_taxa + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        {parametrosPLR !== null
                            ? <div><span className="font-semibold text-gray-700">Valor parcela: </span><span className="text-gray-600">{fmt(parametrosPLR.plr_base / 2)}/empregado</span></div>
                            : <div className="text-red-600 font-semibold">PLR Base não configurado para {ano}. Acesse Tabelas &gt; Benefícios.</div>
                        }
                    </div>
                </div>
            )}

            {/* Regras CCT */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                <span className="font-semibold">Regras CCT 2025 (Cláusula 18ª): </span>
                Falta justificada −20% | Falta injustificada −25% | Advertência −20% | Suspensão −25% | Proporcional 1/12 por mês (mín. 15 dias)
            </div>

            {/* Tabela de resultados */}
            {linhas.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                            {escopoLabel} — {linhasFiltradas.length} funcionário(s)
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left font-semibold text-gray-600 min-w-[180px]">Funcionário</th>
                                    <th className="px-3 py-3 text-center font-semibold text-gray-600">Meses</th>
                                    <th className="px-3 py-3 text-center font-semibold text-blue-700">F.Just.</th>
                                    <th className="px-3 py-3 text-center font-semibold text-red-700">F.Inj.</th>
                                    <th className="px-3 py-3 text-center font-semibold text-orange-700">Advert.</th>
                                    <th className="px-3 py-3 text-center font-semibold text-orange-800">Suspens.</th>
                                    <th className="px-3 py-3 text-right font-semibold text-gray-600">Bruto</th>
                                    <th className="px-3 py-3 text-right font-semibold text-red-600">Descontos</th>
                                    <th className="px-3 py-3 text-right font-semibold text-green-700">Final</th>
                                    <th className="px-3 py-3 text-center font-semibold text-gray-600">Ações</th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {linhasFiltradas.map(l => (
                                    <tr key={l.funcionario_id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-900">{l.nome_completo}</div>
                                            {l.empresa && <div className="text-xs text-gray-400">{l.empresa}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold">{l.meses_trabalhados}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={l.faltas_justificadas > 0 ? 'text-blue-700 font-semibold' : 'text-gray-300'}>{l.faltas_justificadas}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={l.faltas_injustificadas > 0 ? 'text-red-700 font-semibold' : 'text-gray-300'}>{l.faltas_injustificadas}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input type="number" min={0} value={l.advertencias_editadas}
                                                onChange={e => handleAdvertenciaChange(l.funcionario_id, Number(e.target.value))}
                                                className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input type="number" min={0} value={l.suspensoes_editadas}
                                                onChange={e => handleSuspensaoChange(l.funcionario_id, Number(e.target.value))}
                                                className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-800" />
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700">{fmt(l.valor_bruto)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{l.desconto_total > 0 ? `−${fmt(l.desconto_total)}` : '—'}</td>
                                        <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(l.valor_final)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleExcluirLinha(l.funcionario_id, l.nome_completo)}
                                                className="px-2 py-1 text-xs font-semibold rounded border border-red-300 text-red-600 hover:bg-red-50"
                                                title="Excluir linha da apuração"
                                            >
                                                Excluir
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan={6} className="px-3 py-2 font-bold text-gray-700">Total ({linhasFiltradas.length})</td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-700">{fmt(totalBruto)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-red-600">−{fmt(totalDescontos)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(totalFinal)}</td>
                                    <td></td>

                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {linhas.length === 0 && !loading && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    Selecione o período e escopo, depois clique em "Calcular PLR".
                </div>
            )}
        </div>
    );
};

export default ApuracaoPLR;
