import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import Select from '../../components/ui/Select';
import { Printer, RefreshCw, Clock, Users, TrendingUp, AlertCircle, History, X, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import {
  calcularBancoHorasMes, somarMinutosBanco, minutesToHHMM,
  DIAS_SEMANA_LABELS, TOLERANCIA_MINUTOS, MINIMO_CREDITO_DIARIO, DATA_INICIO_REGRA_30MIN,
  type BancoHorasDia, type RegraEscalaBase, type RegistroPontoBase
} from '../../hooks/useBancoHoras';

interface Funcionario {
    id: string;
    nome_completo: string;
    nome_posto?: string;
    posto_trabalho_id?: string;
    empresa_id?: string;
    codigo_escala?: string;
    cargo?: { nome_cargo: string; cbo?: string };
    empresa?: { id: string; nome_empresa: string; cnpj: string };
}

interface HorarioEscala {
    entrada: string;
    saida: string;
}

type RegraEscala = RegraEscalaBase & { codigo_escala: string };
type RegistroPonto = RegistroPontoBase & { id: string; status: string };

const diasSemanaLabels = DIAS_SEMANA_LABELS;

const BancoHoras: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { isClient, user } = useAuth();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [registrosPonto, setRegistrosPonto] = useState<RegistroPonto[]>([]);
    const [regrasEscalas, setRegrasEscalas] = useState<RegraEscala[]>([]);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [loadingRegistros, setLoadingRegistros] = useState(false);
    const [clientPostos, setClientPostos] = useState<string[]>([]);

    const [empresas, setEmpresas] = useState<Array<{ id: string; nome_empresa: string }>>([]);
    const [postos, setPostos] = useState<Array<{ id: string; nome_posto: string }>>([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState('');
    const [postoSelecionado, setPostoSelecionado] = useState('');
    const [acumulados, setAcumulados] = useState<Record<string, number>>({}); // Armazena acumulados por funcionario_id
    const [detalheFunc, setDetalheFunc] = useState<Funcionario | null>(null);
    const [detalheMeses, setDetalheMeses] = useState<Array<{ ano: number; mes: number; minutos_entrada: number; minutos_saida: number; minutos_total: number; dias_com_banco: number; dias_trabalhados: number; data_calculo?: string }>>([]);
    const [loadingDetalhe, setLoadingDetalhe] = useState(false);
    const [mesExpandido, setMesExpandido] = useState<string | null>(null); // "ano-mes"
    const [diasPorMes, setDiasPorMes] = useState<Record<string, BancoHorasDia[]>>({});
    const [loadingDias, setLoadingDias] = useState<string | null>(null);
    // Constantes de paginação / validação
    const ITENS_POR_PAGINA = 50;
    const MAX_DIAS_INTERVALO = 366;
    // Helpers de persistência de filtros (localStorage)
    const FILTROS_LS_KEY = 'bancoHoras.filtrosAuditoria.v1';
    const carregarFiltrosPersistidos = () => {
        try {
            const raw = globalThis.localStorage?.getItem(FILTROS_LS_KEY);
            if (!raw) return {} as any;
            return JSON.parse(raw) || {};
        } catch { return {} as any; }
    };
    const filtrosIniciais = carregarFiltrosPersistidos();
    const [mostrarBruto, setMostrarBruto] = useState<boolean>(!!filtrosIniciais.mostrarBruto);
    // Filtros do modal de auditoria (persistidos)
    const [filtroDataInicio, setFiltroDataInicio] = useState<string>(filtrosIniciais.filtroDataInicio || '');
    const [filtroDataFim, setFiltroDataFim] = useState<string>(filtrosIniciais.filtroDataFim || '');
    const [buscaDia, setBuscaDia] = useState<string>(filtrosIniciais.buscaDia || '');
    const [ordenacaoDia, setOrdenacaoDia] = useState<'dia-asc' | 'dia-desc' | 'ds-asc' | 'tipo'>(filtrosIniciais.ordenacaoDia || 'dia-asc');
    const [filtroTipoDia, setFiltroTipoDia] = useState<'todos' | 'creditados' | 'ignorados' | 'debitos'>(filtrosIniciais.filtroTipoDia || 'todos');
    // Modal de cálculo do dia
    const [diaCalculo, setDiaCalculo] = useState<{ dia: BancoHorasDia; ano: number; mes: number } | null>(null);
    // Pré-visualização do PDF
    const [previewPdfHtml, setPreviewPdfHtml] = useState<string | null>(null);
    // Paginação por mês expandido ("ano-mes" → página atual, base 1)
    const [paginaPorMes, setPaginaPorMes] = useState<Record<string, number>>({});
    // Seleção de meses (chaves "ano-mes") para exportação combinada — vazio = todos os meses do filtro
    const [mesesSelecionados, setMesesSelecionados] = useState<Set<string>>(new Set());
    // Configurações do PDF
    const [pdfOrientacao, setPdfOrientacao] = useState<'portrait' | 'landscape'>(
        (filtrosIniciais.pdfOrientacao as 'portrait' | 'landscape') || 'landscape'
    );
    const [pdfFontSize, setPdfFontSize] = useState<number>(filtrosIniciais.pdfFontSize || 10);

    // Dias excluídos manualmente do banco (persistidos), namespaced por período selecionado
    // para evitar conflitos ao trocar o intervalo de datas.
    // Chave: "periodoInicio_periodoFim|funcionarioId|YYYY-MM-DD"
    const EXCLUSOES_LS_KEY = 'bancoHoras.diasExcluidos.v2';
    const [diasExcluidos, setDiasExcluidos] = useState<Set<string>>(() => {
        try {
            const raw = globalThis.localStorage?.getItem(EXCLUSOES_LS_KEY);
            return new Set<string>(raw ? JSON.parse(raw) : []);
        } catch { return new Set<string>(); }
    });
    useEffect(() => {
        try { globalThis.localStorage?.setItem(EXCLUSOES_LS_KEY, JSON.stringify(Array.from(diasExcluidos))); } catch { /* ignore */ }
    }, [diasExcluidos]);
    // Escopo do período atual — quando o usuário troca o intervalo, as exclusões ficam isoladas.
    const periodoScope = `${filtroDataInicio || 'all'}_${filtroDataFim || 'all'}`;
    const chaveExclusao = (funcId: string, ano: number, mes: number, dia: number) =>
        `${periodoScope}|${funcId}|${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    const isDiaExcluido = (funcId: string | undefined, ano: number, mes: number, dia: number) =>
        !!funcId && diasExcluidos.has(chaveExclusao(funcId, ano, mes, dia));
    const toggleDiaExcluido = (funcId: string, ano: number, mes: number, dia: number) => {
        const k = chaveExclusao(funcId, ano, mes, dia);
        setDiasExcluidos(prev => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k); else next.add(k);
            return next;
        });
    };
    const minutosExcluidosNoMes = (funcId: string | undefined, ano: number, mes: number): number => {
        if (!funcId) return 0;
        const key = `${ano}-${mes}`;
        const dias = diasPorMes[key];
        if (!dias) return 0;
        return dias.reduce((acc, d) => acc + (isDiaExcluido(funcId, ano, mes, d.dia) ? d.totalMinutos : 0), 0);
    };

    // Persistir filtros do modal de auditoria sempre que mudarem
    useEffect(() => {
        try {
            globalThis.localStorage?.setItem(FILTROS_LS_KEY, JSON.stringify({
                filtroDataInicio, filtroDataFim, buscaDia, ordenacaoDia, filtroTipoDia, mostrarBruto,
                pdfOrientacao, pdfFontSize,
            }));
        } catch { /* ignore */ }
    }, [filtroDataInicio, filtroDataFim, buscaDia, ordenacaoDia, filtroTipoDia, mostrarBruto, pdfOrientacao, pdfFontSize]);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    useEffect(() => {
        // Para clientes, só carregar dados depois que clientPostos for resolvido
        if (isClient && clientPostos.length === 0) return;
        carregarDados();
    }, [clientPostos, isClient]);

    // Carregar postos do cliente
    useEffect(() => {
        if (isClient && user) {
            supabase
                .from('client_postos')
                .select('posto_id')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    setClientPostos((data || []).map((d: any) => d.posto_id));
                });
        }
    }, [isClient, user]);

    useEffect(() => {
        if (funcionarios.length > 0) {
            carregarRegistrosPonto();
            carregarAcumulados();
        }
    }, [mes, ano, funcionarios]);

    const carregarAcumulados = async () => {
        const acumuladosTemp: Record<string, number> = {};
        
        for (const func of funcionarios) {
            const acumulado = await calcularAcumuladoAteAnterior(func.id);
            acumuladosTemp[func.id] = acumulado;
        }
        
        setAcumulados(acumuladosTemp);
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [funcRes, empRes, postRes, escRes] = await Promise.all([
                supabase.from('funcionarios').select(`
                    id, nome_completo, nome_posto, posto_trabalho_id, empresa_id, codigo_escala,
                    cargo:cargos(nome_cargo, cbo),
                    empresa:empresas(id, nome_empresa, cnpj)
                `).eq('ativo', true).eq('demitido', false).order('nome_completo'),
                supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
                supabase.from('postos_trabalho').select('id, nome_posto').is('local_area', null).order('nome_posto'),
                supabase.from('regras_escalas').select(`
                    codigo_escala, 
                    horarios_segunda, horarios_terca, horarios_quarta, horarios_quinta,
                    horarios_sexta, horarios_sabado, horarios_domingo,
                    trabalha_segunda, trabalha_terca, trabalha_quarta, trabalha_quinta,
                    trabalha_sexta, trabalha_sabado, trabalha_domingo
                `).eq('ativa', true)
            ]);

            if (funcRes.error) throw funcRes.error;
            let funcs = (funcRes.data || []) as any as Funcionario[];
            
            // Filtrar por postos do cliente
            if (isClient && clientPostos.length > 0) {
                funcs = funcs.filter(f => f.posto_trabalho_id && clientPostos.includes(f.posto_trabalho_id));
            }
            
            setFuncionarios(funcs);
            // Para clientes, filtrar empresas e postos apenas pelos que têm funcionários vinculados
            if (isClient && clientPostos.length > 0) {
                const empresaIdsVinculadas = new Set(funcs.map(f => f.empresa_id).filter(Boolean));
                setEmpresas((empRes.data || []).filter(e => empresaIdsVinculadas.has(e.id)));
                setPostos((postRes.data || []).filter(p => clientPostos.includes(p.id)));
            } else {
                setEmpresas(empRes.data || []);
                setPostos(postRes.data || []);
            }
            setRegrasEscalas((escRes.data || []) as any as RegraEscala[]);
        } catch (error) {
            showToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    };

    const carregarRegistrosPonto = useCallback(async () => {
        setLoadingRegistros(true);
        try {
            const primeiroDia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const ultimoDiaStr = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;

            // Carregar registros do mês filtrado
            const { data, error } = await supabase
                .from('folha_ponto_automatica')
                .select('id, funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
                .gte('data_registro', primeiroDia)
                .lte('data_registro', ultimoDiaStr)
                .order('data_registro', { ascending: true });

            if (error) throw error;
            setRegistrosPonto(data || []);
        } catch (error) {
            showToast('Erro ao carregar registros de ponto', 'error');
        } finally {
            setLoadingRegistros(false);
        }
    }, [mes, ano]);

    const getEscalaFuncionario = (func: Funcionario): RegraEscala | null => {
        if (!func.codigo_escala) return null;
        return regrasEscalas.find(r => r.codigo_escala === func.codigo_escala) || null;
    };

    // Calcular acumulado de TODOS os meses até o mês filtrado (INCLUSIVE) usando a tabela banco_horas_mensal
    const calcularAcumuladoAteAnterior = async (funcionarioId: string): Promise<number> => {
        try {
            // Buscar todos os registros até o mês filtrado (inclusive)
            const { data, error } = await supabase
                .from('banco_horas_mensal')
                .select('minutos_total')
                .eq('funcionario_id', funcionarioId)
                .or(`ano.lt.${ano},and(ano.eq.${ano},mes.lte.${mes})`)
                .order('ano', { ascending: true })
                .order('mes', { ascending: true });

            if (error) {
                return 0;
            }

            // Somar todos os minutos
            const total = (data || []).reduce((acc, registro) => acc + (registro.minutos_total || 0), 0);
            return total;
        } catch (error) {
            return 0;
        }
    };

    const abrirDetalheMesAMes = async (func: Funcionario) => {
        setDetalheFunc(func);
        setLoadingDetalhe(true);
        setDetalheMeses([]);
        setMesExpandido(null);
        setDiasPorMes({});
        try {
            const { data, error } = await supabase
                .from('banco_horas_mensal')
                .select('ano, mes, minutos_entrada, minutos_saida, minutos_total, dias_com_banco, dias_trabalhados, data_calculo')
                .eq('funcionario_id', func.id)
                .order('ano', { ascending: true })
                .order('mes', { ascending: true });
            if (error) throw error;
            setDetalheMeses(data || []);
        } catch (e) {
            showToast('Erro ao carregar histórico mensal', 'error');
        } finally {
            setLoadingDetalhe(false);
        }
    };

    const toggleMesExpandido = async (anoMes: number, mesMes: number) => {
        if (!detalheFunc) return;
        const key = `${anoMes}-${mesMes}`;
        if (mesExpandido === key) {
            setMesExpandido(null);
            return;
        }
        setMesExpandido(key);
        if (diasPorMes[key]) return; // já carregado
        setLoadingDias(key);
        try {
            const primeiroDia = `${anoMes}-${mesMes.toString().padStart(2, '0')}-01`;
            const ultimoDiaNum = new Date(anoMes, mesMes, 0).getDate();
            const ultimoDia = `${anoMes}-${mesMes.toString().padStart(2, '0')}-${ultimoDiaNum.toString().padStart(2, '0')}`;
            const { data, error } = await supabase
                .from('folha_ponto_automatica')
                .select('id, funcionario_id, data_registro, primeiro_registro, quarto_registro, status')
                .eq('funcionario_id', detalheFunc.id)
                .gte('data_registro', primeiroDia)
                .lte('data_registro', ultimoDia)
                .order('data_registro', { ascending: true });
            if (error) throw error;
            const escala = getEscalaFuncionario(detalheFunc);
            const dias = calcularBancoHorasMes({
                mes: mesMes,
                ano: anoMes,
                registros: (data || []) as any,
                codigoEscala: detalheFunc.codigo_escala || escala?.codigo_escala || '',
                escala,
            });
            setDiasPorMes(prev => ({ ...prev, [key]: dias }));
        } catch (e) {
            showToast('Erro ao carregar dias do mês', 'error');
        } finally {
            setLoadingDias(null);
        }
    };



    const calcularBancoHorasFuncionario = (funcionarioId: string, escala: RegraEscala | null): BancoHorasDia[] => {
        const registrosFunc = registrosPonto.filter(r => r.funcionario_id === funcionarioId);
        const func = funcionarios.find(f => f.id === funcionarioId);
        return calcularBancoHorasMes({
            mes, ano,
            registros: registrosFunc,
            codigoEscala: func?.codigo_escala || escala?.codigo_escala || '',
            escala,
        });
    };

    // Estatísticas gerais
    const calcularEstatisticas = () => {
        let totalMinutosGeral = 0;
        let funcionariosComBanco = 0;
        const funcionariosComRegistros = new Set(registrosPonto.map(r => r.funcionario_id)).size;

        for (const func of funcionarios) {
            const escala = getEscalaFuncionario(func);
            const banco = calcularBancoHorasFuncionario(func.id, escala);
            const totalFunc = somarMinutosBanco(banco);
            if (totalFunc !== 0) {
                totalMinutosGeral += totalFunc;
                funcionariosComBanco++;
            }
        }

        return { totalFuncionarios: funcionarios.length, comRegistros: funcionariosComRegistros, comBancoHoras: funcionariosComBanco, totalMinutosGeral };
    };

    const estatisticas = calcularEstatisticas();

    // Impressão
    const gerarHtmlBancoHoras = (func: Funcionario) => {
        const escala = getEscalaFuncionario(func);
        const banco = calcularBancoHorasFuncionario(func.id, escala);
        const totalMensal = somarMinutosBanco(banco);
        const diasNoMes = new Date(ano, mes, 0).getDate();

        const linhasHtml = banco.map(d => `
            <tr>
                <td class="day-cell">${d.dia.toString().padStart(2, '0')}</td>
                <td class="ds-cell">${d.diaSemana}</td>
                <td class="time-cell">${d.entradaProgramada}</td>
                <td class="time-cell">${d.saidaProgramada}</td>
                <td class="time-cell ${d.entradaReal ? 'filled' : ''}">${d.entradaReal}</td>
                <td class="time-cell ${d.saidaReal ? 'filled' : ''}">${d.saidaReal}</td>
                <td class="min-cell">${d.minutosEntrada !== 0 ? (d.minutosEntrada > 0 ? '+' : '') + d.minutosEntrada + ' min' : ''}</td>
                <td class="min-cell">${d.minutosSaida !== 0 ? (d.minutosSaida > 0 ? '+' : '') + d.minutosSaida + ' min' : ''}</td>
                <td class="total-cell ${d.totalMinutos > 0 ? 'highlight' : d.totalMinutos < 0 ? 'negative' : ''}">${d.totalMinutos !== 0 ? minutesToHHMM(d.totalMinutos) : ''}</td>
            </tr>
        `).join('');

        return `
            <div class="page-container">
                <div class="container">
                    <div class="header-section">
                        <div class="header">BANCO DE HORAS</div>
                        <div class="periodo-header">Período: ${meses[mes - 1]}/${ano}</div>
                    </div>
                    <div class="info-section">
                        <div class="info-row"><span class="info-label">Funcionário:</span><span class="info-value">${func.nome_completo}</span></div>
                        <div class="info-row"><span class="info-label">Cargo:</span><span class="info-value">${func.cargo?.nome_cargo || ''}</span></div>
                        <div class="info-row"><span class="info-label">Empresa:</span><span class="info-value">${func.empresa?.nome_empresa || ''}</span></div>
                        <div class="info-row"><span class="info-label">Escala:</span><span class="info-value">${func.codigo_escala || 'Não definida'}</span></div>
                        <div class="info-row"><span class="info-label">Tolerância:</span><span class="info-value">${TOLERANCIA_MINUTOS} minutos</span></div>
                    </div>
                    <table class="bh-table">
                        <thead>
                            <tr>
                                <th class="day-cell">Dia</th>
                                <th class="ds-cell">D.S.</th>
                                <th class="time-cell" colspan="2">Horário Programado</th>
                                <th class="time-cell" colspan="2">Horário Real</th>
                                <th class="min-cell" colspan="2">Minutos Excedentes</th>
                                <th class="total-cell">Banco</th>
                            </tr>
                            <tr>
                                <th></th>
                                <th></th>
                                <th class="time-cell">Entrada</th>
                                <th class="time-cell">Saída</th>
                                <th class="time-cell">Entrada</th>
                                <th class="time-cell">Saída</th>
                                <th class="min-cell">Entrada</th>
                                <th class="min-cell">Saída</th>
                                <th class="total-cell">Horas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasHtml}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="8" style="text-align:right; font-weight:bold; padding-right:10px;">TOTAL BANCO DE HORAS DO MÊS:</td>
                                <td class="total-cell highlight" style="font-size:13px;">${minutesToHHMM(totalMensal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer-section">
                        <div class="footer-row"><span>Funcionário: ______________________________________________</span></div>
                        <div class="footer-row"><span>Chefia: ___________________________________________________</span></div>
                        <div class="footer-row"><span>Data: ______ / ______ / ______________</span></div>
                    </div>
                </div>
            </div>
        `;
    };

    const getEstilosImpressao = () => `
        @media print {
            @page { size: A4 portrait; margin: 8mm 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .page-container { page-break-after: always; }
            .page-container:last-child { page-break-after: auto; }
        }
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 5px; }
        .page-container { margin-bottom: 20px; }
        .container { width: 100%; border: 2px solid black; padding: 6px; }
        .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .header { font-weight: bold; font-size: 14px; flex: 1; text-align: center; }
        .periodo-header { font-weight: bold; font-size: 10px; }
        .info-section { border: 1px solid black; padding: 4px; margin-bottom: 8px; }
        .info-row { display: flex; margin-bottom: 2px; }
        .info-label { font-weight: bold; width: 80px; font-size: 10px; }
        .info-value { flex: 1; font-size: 10px; }
        .bh-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .bh-table th, .bh-table td { border: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px; }
        .bh-table th { background-color: #e8e8e8; font-weight: bold; }
        .day-cell { width: 25px; font-weight: bold; background-color: #f0f0f0; }
        .ds-cell { width: 25px; font-size: 8px; }
        .time-cell { width: 40px; }
        .time-cell.filled { background-color: #e8f5e9; font-weight: 500; }
        .min-cell { width: 45px; font-size: 8px; }
        .total-cell { width: 45px; font-weight: bold; }
        .total-cell.highlight { background-color: #fff3e0; color: #e65100; }
        .total-cell.negative { background-color: #ffebee; color: #c62828; }
        .total-row { background-color: #e3f2fd; }
        .footer-section { margin-top: 15px; font-size: 10px; }
        .footer-row { margin-bottom: 12px; }
    `;

    const abrirJanelaImpressao = async (funcs: Funcionario[], titulo: string) => {
        if (funcs.length === 0) { showToast('Nenhum funcionário encontrado', 'error'); return; }
        setLoading(true);
        try {
            const folhas = funcs.map(f => gerarHtmlBancoHoras(f)).join('');
            const printWindow = globalThis.open('', '_blank');
            if (!printWindow) { showToast('Permita pop-ups para este site.', 'error'); return; }
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>${getEstilosImpressao()}</style></head><body>${folhas}</body></html>`;
            escreverEExibirJanela(printWindow, html, titulo);
            showToast(`${funcs.length} folha(s) prontas para impressão!`, 'success');
        } catch (error) {
            showToast('Erro ao preparar impressão', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Helpers de filtragem / ordenação para a auditoria ───────────────────
    const dataDia = (ano: number, mes: number, dia: number) =>
        `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

    const mesIntersectaIntervalo = useCallback((ano: number, mes: number) => {
        if (!filtroDataInicio && !filtroDataFim) return true;
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const ini = dataDia(ano, mes, 1);
        const fim = dataDia(ano, mes, ultimoDia);
        if (filtroDataInicio && fim < filtroDataInicio) return false;
        if (filtroDataFim && ini > filtroDataFim) return false;
        return true;
    }, [filtroDataInicio, filtroDataFim]);

    const filtrarOrdenarDias = useCallback((dias: BancoHorasDia[], ano: number, mes: number): BancoHorasDia[] => {
        const q = buscaDia.trim().toLowerCase();
        let arr = dias.filter(d => {
            const data = dataDia(ano, mes, d.dia);
            if (filtroDataInicio && data < filtroDataInicio) return false;
            if (filtroDataFim && data > filtroDataFim) return false;
            const teveCredito = d.minutosEntrada > 0 || d.minutosSaida > 0;
            const teveDebito = d.minutosEntrada < 0 || d.minutosSaida < 0;
            if (filtroTipoDia === 'creditados' && !teveCredito) return false;
            if (filtroTipoDia === 'ignorados' && !d.creditoIgnoradoRegra30) return false;
            if (filtroTipoDia === 'debitos' && !teveDebito) return false;
            if (q) {
                const blob = `${d.dia.toString().padStart(2, '0')} ${d.diaSemana} ${data} ${d.entradaReal} ${d.saidaReal} ${d.creditoIgnoradoRegra30 ? 'ignorado' : (teveCredito ? 'creditado' : '')}`.toLowerCase();
                if (!blob.includes(q)) return false;
            }
            return true;
        });
        const dsOrder = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        arr.sort((a, b) => {
            if (ordenacaoDia === 'dia-desc') return b.dia - a.dia;
            if (ordenacaoDia === 'ds-asc') return dsOrder.indexOf(a.diaSemana) - dsOrder.indexOf(b.diaSemana) || a.dia - b.dia;
            if (ordenacaoDia === 'tipo') {
                const cat = (d: BancoHorasDia) => d.creditoIgnoradoRegra30 ? 1 : (d.minutosEntrada > 0 || d.minutosSaida > 0 ? 0 : (d.minutosEntrada < 0 || d.minutosSaida < 0 ? 2 : 3));
                return cat(a) - cat(b) || a.dia - b.dia;
            }
            return a.dia - b.dia;
        });
        return arr;
    }, [filtroDataInicio, filtroDataFim, buscaDia, ordenacaoDia, filtroTipoDia]);

    // Cache memoizado dos dias filtrados/ordenados por mês — evita recomputação a cada re-render
    const diasFiltradosPorMes = useMemo(() => {
        const out: Record<string, BancoHorasDia[]> = {};
        for (const key of Object.keys(diasPorMes)) {
            const [a, m] = key.split('-').map(Number);
            out[key] = filtrarOrdenarDias(diasPorMes[key], a, m);
        }
        return out;
    }, [diasPorMes, filtrarOrdenarDias]);

    // Toggle seleção de mês para exportação combinada
    const toggleMesSelecionado = useCallback((key: string) => {
        setMesesSelecionados(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    // ── Geração da fórmula textual do cálculo do dia ────────────────────────
    const explicarCalculoDia = (d: BancoHorasDia) => {
        const fmt = (v: number) => (v >= 0 ? '+' : '') + v;
        const creditoBrutoEnt = Math.max(0, d.minutosEntradaBruto);
        const creditoBrutoSai = Math.max(0, d.minutosSaidaBruto);
        const somaCreditos = creditoBrutoEnt + creditoBrutoSai;
        const debitoEnt = Math.min(0, d.minutosEntradaBruto);
        const debitoSai = Math.min(0, d.minutosSaidaBruto);
        return {
            entradaBruto: d.minutosEntradaBruto,
            saidaBruto: d.minutosSaidaBruto,
            entradaFinal: d.minutosEntrada,
            saidaFinal: d.minutosSaida,
            somaCreditos,
            debitos: debitoEnt + debitoSai,
            total: d.totalMinutos,
            fmt,
            atingiuMinimo: somaCreditos >= MINIMO_CREDITO_DIARIO,
        };
    };

    // Validação do intervalo de datas do filtro
    const erroFiltroDatas = (() => {
        if (filtroDataInicio && filtroDataFim) {
            if (filtroDataInicio > filtroDataFim) {
                return 'A data início deve ser anterior ou igual à data fim.';
            }
            const di = new Date(filtroDataInicio + 'T00:00:00').getTime();
            const df = new Date(filtroDataFim + 'T00:00:00').getTime();
            const dias = Math.floor((df - di) / 86400000) + 1;
            if (dias > MAX_DIAS_INTERVALO) {
                return `Intervalo máximo permitido é de ${MAX_DIAS_INTERVALO} dias (selecionado: ${dias}).`;
            }
        }
        return null;
    })();

    // Geração do HTML do PDF de auditoria (usado tanto na exportação quanto na pré-visualização)
    const gerarHtmlAuditoria = (autoPrint: boolean): string | null => {
        if (!detalheFunc || detalheMeses.length === 0) return null;
        // 1) Aplica intervalo de datas
        let mesesFiltrados = detalheMeses.filter(m => mesIntersectaIntervalo(m.ano, m.mes));
        // 2) Se houver seleção explícita, restringe a esses meses (multi-mês em um único PDF)
        if (mesesSelecionados.size > 0) {
            mesesFiltrados = mesesFiltrados.filter(m => mesesSelecionados.has(`${m.ano}-${m.mes}`));
        }
        if (mesesFiltrados.length === 0) return null;

        const fmtMin = (v: number) => v !== 0 ? (v > 0 ? '+' : '') + v + ' min' : '—';
        // Tamanhos derivados do font-size base configurado pelo usuário
        const fsBase = Math.max(7, Math.min(14, pdfFontSize));
        const fsH1 = fsBase + 5;
        const fsH2 = fsBase + 2;
        const fsTh = Math.max(7, fsBase - 1);
        const fsBadge = Math.max(6, fsBase - 2);
        // Layout fixo + thead repetido + quebras seguras
        const css = `
            @page { size: A4 ${pdfOrientacao}; margin: 12mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: ${fsBase}px; }
            h1 { font-size: ${fsH1}px; margin: 0 0 4px; }
            h2 { font-size: ${fsH2}px; margin: 14px 0 4px; padding-bottom: 3px; border-bottom: 1px solid #999; page-break-after: avoid; }
            .meta { color: #555; font-size: ${fsBase}px; margin-bottom: 10px; }
            .summary { background: #f5f5f5; border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; margin-bottom: 10px; display: flex; gap: 14px; flex-wrap: wrap; }
            .summary div { font-size: ${fsBase}px; }
            .summary strong { display: block; font-size: ${fsH2 + 1}px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
            thead { display: table-header-group; }
            tfoot { display: table-row-group; }
            tr { page-break-inside: avoid; }
            th, td { border: 1px solid #bbb; padding: 3px 4px; text-align: center; word-wrap: break-word; overflow-wrap: break-word; vertical-align: middle; }
            th { background: #eee; font-size: ${fsTh}px; font-weight: bold; }
            td.left, th.left { text-align: left; }
            .pos { color: #92400e; font-weight: bold; }
            .neg { color: #b91c1c; font-weight: bold; }
            .muted { color: #888; }
            .strike { text-decoration: line-through; color: #888; }
            .badge { display: inline-block; padding: 0 5px; border-radius: 3px; font-size: ${fsBadge}px; font-weight: bold; line-height: 1.4; }
            .badge-ign { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
            .badge-ok  { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .month-block { margin-bottom: 12px; page-break-inside: auto; }
            .legend { font-size: ${fsTh}px; color: #555; margin: 2px 0 4px; }
            .footer-note { margin-top: 12px; padding-top: 6px; border-top: 1px dashed #999; font-size: ${fsTh}px; color: #555; }
            /* Larguras fixas: detalhe diário (11 colunas) */
            table.dia col.c-dia    { width: 5%;  }
            table.dia col.c-ds     { width: 6%;  }
            table.dia col.c-prog   { width: 9%;  }
            table.dia col.c-real   { width: 9%;  }
            table.dia col.c-min    { width: 9%;  }
            table.dia col.c-total  { width: 10%; }
            table.dia col.c-regra  { width: 11%; }
            table.mensal col.m-per { width: 18%; }
            table.mensal col.m-dt  { width: 11%; }
            table.mensal col.m-db  { width: 13%; }
            table.mensal col.m-hh  { width: 11%; }
        `;

        // Resumo agregado a partir dos meses carregados (com dias em cache, dentro do filtro)
        let totalCreditados = 0, totalIgnorados = 0;
        mesesFiltrados.forEach(m => {
            const dias = diasPorMes[`${m.ano}-${m.mes}`];
            if (!dias) return;
            filtrarOrdenarDias(dias, m.ano, m.mes).forEach(d => {
                if (d.creditoIgnoradoRegra30) totalIgnorados++;
                else if (d.minutosEntrada > 0 || d.minutosSaida > 0) totalCreditados++;
            });
        });
        const totalAcum = mesesFiltrados.reduce((a, m) => a + (m.minutos_total || 0), 0);

        let saldo = 0;
        const linhasMeses = mesesFiltrados.map(m => {
            saldo += m.minutos_total || 0;
            const cls = m.minutos_total > 0 ? 'pos' : m.minutos_total < 0 ? 'neg' : 'muted';
            const clsAcum = saldo > 0 ? 'pos' : saldo < 0 ? 'neg' : 'muted';
            return `<tr>
                <td class="left">${meses[m.mes - 1]}/${m.ano}</td>
                <td>${m.dias_trabalhados}</td>
                <td>${m.dias_com_banco}</td>
                <td>${minutesToHHMM(m.minutos_entrada || 0)}</td>
                <td>${minutesToHHMM(m.minutos_saida || 0)}</td>
                <td class="${cls}">${minutesToHHMM(m.minutos_total || 0)}</td>
                <td class="${clsAcum}">${minutesToHHMM(saldo)}</td>
            </tr>`;
        }).join('');

        const blocosDetalhe = mesesFiltrados.map(m => {
            const key = `${m.ano}-${m.mes}`;
            const diasBrutos = diasPorMes[key];
            if (!diasBrutos || diasBrutos.length === 0) return '';
            const dias = filtrarOrdenarDias(diasBrutos, m.ano, m.mes);
            if (dias.length === 0) return '';
            let creditados = 0, ignorados = 0;
            const linhas = dias.map(d => {
                const ign = d.creditoIgnoradoRegra30;
                const teveCredito = d.minutosEntrada > 0 || d.minutosSaida > 0;
                if (ign) ignorados++; else if (teveCredito) creditados++;
                const entCell = ign && d.minutosEntradaBruto > 0
                    ? `<span class="strike">${fmtMin(d.minutosEntradaBruto)}</span>`
                    : fmtMin(d.minutosEntrada);
                const saiCell = ign && d.minutosSaidaBruto > 0
                    ? `<span class="strike">${fmtMin(d.minutosSaidaBruto)}</span>`
                    : fmtMin(d.minutosSaida);
                let bancoCell = '';
                if (d.totalMinutos !== 0) {
                    const cls = d.totalMinutos > 0 ? 'pos' : 'neg';
                    bancoCell = `<span class="${cls}">${minutesToHHMM(d.totalMinutos)}</span>`;
                } else bancoCell = '—';
                let regraCell = '<span class="muted">—</span>';
                if (d.regra30Vigente) {
                    if (ign) regraCell = `<span class="badge badge-ign">ignorado</span>`;
                    else if (teveCredito) regraCell = `<span class="badge badge-ok">creditado</span>`;
                }
                return `<tr>
                    <td>${d.dia.toString().padStart(2, '0')}</td>
                    <td>${d.diaSemana}</td>
                    <td class="muted">${d.entradaProgramada || '-'}</td>
                    <td class="muted">${d.saidaProgramada || '-'}</td>
                    <td>${d.entradaReal || '-'}</td>
                    <td>${d.saidaReal || '-'}</td>
                    <td>${entCell}</td>
                    <td>${saiCell}</td>
                    <td>${bancoCell}</td>
                    <td>${regraCell}</td>
                </tr>`;
            }).join('');
            return `<div class="month-block">
                <h2>${meses[m.mes - 1]}/${m.ano} — Detalhamento diário</h2>
                <div class="legend">Dias creditados: <strong>${creditados}</strong> · Dias com crédito ignorado (&lt; ${MINIMO_CREDITO_DIARIO} min): <strong>${ignorados}</strong></div>
                <table class="dia">
                    <colgroup>
                        <col class="c-dia"/><col class="c-ds"/>
                        <col class="c-prog"/><col class="c-prog"/>
                        <col class="c-real"/><col class="c-real"/>
                        <col class="c-min"/><col class="c-min"/>
                        <col class="c-total"/><col class="c-regra"/>
                    </colgroup>
                    <thead><tr>
                        <th>Dia</th><th>D.S.</th><th>Entr. Prog.</th><th>Saí. Prog.</th>
                        <th>Entr. Real</th><th>Saí. Real</th><th>Min. Entrada</th><th>Min. Saída</th>
                        <th>Banco do Dia</th><th>Regra 30 min</th>
                    </tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>`;
        }).join('');

        const naoExpandidos = mesesFiltrados.filter(m => !diasPorMes[`${m.ano}-${m.mes}`]).length;
        const filtroLabel = (filtroDataInicio || filtroDataFim)
            ? ` · Período: ${filtroDataInicio || '...'} a ${filtroDataFim || '...'}`
            : '';
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Auditoria Banco de Horas - ${detalheFunc.nome_completo}</title><style>${css}</style></head>
            <body>
                <h1>Auditoria — Banco de Horas</h1>
                <div class="meta">
                    <strong>${detalheFunc.nome_completo}</strong>
                    ${detalheFunc.codigo_escala ? ` · Escala ${detalheFunc.codigo_escala}` : ''}
                    ${detalheFunc.empresa?.nome_empresa ? ` · ${detalheFunc.empresa.nome_empresa}` : ''}${filtroLabel}
                    <br/>Gerado em ${new Date().toLocaleString('pt-BR')}
                </div>
                <div class="summary">
                    <div><strong>${minutesToHHMM(totalAcum)}</strong>Saldo (filtro)</div>
                    <div><strong>${mesesFiltrados.length}</strong>Meses exibidos</div>
                    <div><strong>${totalCreditados}</strong>Dias creditados</div>
                    <div><strong>${totalIgnorados}</strong>Dias ignorados &lt; ${MINIMO_CREDITO_DIARIO} min</div>
                </div>
                <h2>Resumo mensal</h2>
                <table class="mensal">
                    <colgroup>
                        <col class="m-per"/><col class="m-dt"/><col class="m-db"/>
                        <col class="m-hh"/><col class="m-hh"/><col class="m-hh"/><col class="m-hh"/>
                    </colgroup>
                    <thead><tr>
                        <th class="left">Período</th><th>Dias Trab.</th><th>Dias c/ Banco</th>
                        <th>Entrada</th><th>Saída</th><th>Total Mês</th><th>Saldo Acum.</th>
                    </tr></thead>
                    <tbody>${linhasMeses}</tbody>
                </table>
                ${blocosDetalhe}
                ${naoExpandidos > 0 ? `<div class="footer-note">⚠ ${naoExpandidos} mês(es) sem detalhamento diário — abra cada mês no modal antes de exportar para incluir o detalhe.</div>` : ''}
                <div class="footer-note">
                    Regra dos 30 min vigente desde ${new Date(DATA_INICIO_REGRA_30MIN + 'T00:00:00').toLocaleDateString('pt-BR')}.
                    Créditos diários (entrada antecipada + saída tardia, além da tolerância de ${TOLERANCIA_MINUTOS} min) só são contabilizados se somarem ${MINIMO_CREDITO_DIARIO} min ou mais. Débitos sempre contam.
                </div>
                ${autoPrint ? `<script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>` : ''}
            </body></html>`;
        return html;
    };

    // Estado de geração do PDF (loading) — evita cliques duplicados
    const [gerandoPdf, setGerandoPdf] = useState<false | 'export' | 'preview'>(false);

    // Exportação PDF do modal de auditoria (mês-a-mês + dias detalhados)
    const exportarAuditoriaPDF = async () => {
        if (gerandoPdf) { showToast('Geração em andamento — aguarde o PDF atual concluir.', 'info'); return; }
        if (erroFiltroDatas) { showToast(erroFiltroDatas, 'error'); return; }
        if (!detalheFunc || detalheMeses.length === 0) { showToast('Sem dados para exportar.', 'error'); return; }
        setGerandoPdf('export');
        try {
            // yield ao browser para o spinner aparecer antes do trabalho pesado
            await new Promise(r => setTimeout(r, 0));
            const html = gerarHtmlAuditoria(true);
            if (!html) { showToast('Nenhum mês dentro do intervalo selecionado.', 'error'); return; }
            const printWindow = globalThis.open('', '_blank');
            if (!printWindow) { showToast('Permita pop-ups para este site.', 'error'); return; }
            escreverEExibirJanela(printWindow, html, 'Auditoria Banco de Horas');
        } finally {
            setGerandoPdf(false);
        }
    };

    const previsualizarPDF = async () => {
        if (gerandoPdf) { showToast('Geração em andamento — aguarde a pré-visualização atual concluir.', 'info'); return; }
        if (erroFiltroDatas) { showToast(erroFiltroDatas, 'error'); return; }
        if (!detalheFunc || detalheMeses.length === 0) { showToast('Sem dados para pré-visualizar.', 'error'); return; }
        setGerandoPdf('preview');
        try {
            await new Promise(r => setTimeout(r, 0));
            const html = gerarHtmlAuditoria(false);
            if (!html) { showToast('Nenhum mês dentro do intervalo selecionado.', 'error'); return; }
            setPreviewPdfHtml(html);
        } finally {
            setGerandoPdf(false);
        }
    };

    const funcionariosFiltrados = funcionarios.filter(f => {
        if (empresaSelecionada && f.empresa_id !== empresaSelecionada) return false;
        if (postoSelecionado && f.posto_trabalho_id !== postoSelecionado) return false;
        return true;
    });

    // Resumo agregado dos meses abertos (dias creditados x ignorados)
    const resumoAuditoria = (() => {
        let creditados = 0, ignorados = 0, mesesAbertos = 0;
        Object.values(diasPorMes).forEach(dias => {
            mesesAbertos++;
            dias.forEach(d => {
                if (d.creditoIgnoradoRegra30) ignorados++;
                else if (d.minutosEntrada > 0 || d.minutosSaida > 0) creditados++;
            });
        });
        return { creditados, ignorados, mesesAbertos };
    })();

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0 lg:max-w-[70%] lg:mx-auto">
            <ToastContainer />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                        Banco de Horas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Controle mensal de horas excedentes baseado nos registros automáticos de ponto.
                    </p>
                </div>
                <button
                    onClick={carregarRegistrosPonto}
                    disabled={loadingRegistros}
                    className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 self-start"
                >
                    <RefreshCw className={`w-4 h-4 ${loadingRegistros ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {isClient && clientPostos.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                        <strong>Visualização restrita</strong> — Exibindo dados dos postos:{' '}
                        {postos
                            .filter(p => clientPostos.includes(p.id))
                            .map(p => p.nome_posto)
                            .join(', ') || 'Carregando...'}
                    </span>
                </div>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Funcionários</p>
                            <p className="text-2xl font-bold text-foreground">{estatisticas.totalFuncionarios}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Com Registros</p>
                            <p className="text-2xl font-bold text-foreground">{estatisticas.comRegistros}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Com Banco de Horas</p>
                            <p className="text-2xl font-bold text-foreground">{estatisticas.comBancoHoras}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Geral</p>
                            <p className="text-2xl font-bold text-foreground">{minutesToHHMM(estatisticas.totalMinutosGeral)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles */}
            <div className="bg-card border border-border rounded-lg shadow-md p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Select label="Mês" value={mes.toString()} onChange={(e) => setMes(Number(e.target.value))}>
                        {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </Select>
                    <Select label="Ano" value={ano.toString()} onChange={(e) => setAno(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Filtrar por Empresa</label>
                        <select value={empresaSelecionada} onChange={(e) => setEmpresaSelecionada(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                            <option value="">Todas</option>
                            {(isClient && clientPostos.length > 0
                                ? empresas.filter(e => funcionarios.some(f => f.empresa_id === e.id))
                                : empresas
                            ).map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Filtrar por Posto</label>
                        <select value={postoSelecionado} onChange={(e) => setPostoSelecionado(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                            <option value="">Todos</option>
                            {(isClient && clientPostos.length > 0
                                ? postos.filter(p => clientPostos.includes(p.id))
                                : postos
                            ).map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                        </select>
                    </div>
                </div>

                {/* Botões de Impressão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => abrirJanelaImpressao(funcionariosFiltrados, `Banco de Horas - ${meses[mes - 1]}/${ano}`)}
                        disabled={loading || funcionariosFiltrados.length === 0}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Filtrados ({funcionariosFiltrados.length})
                    </button>
                    <button
                        onClick={() => abrirJanelaImpressao(funcionarios, `Banco de Horas - Todos - ${meses[mes - 1]}/${ano}`)}
                        disabled={loading || funcionarios.length === 0}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Todas
                    </button>
                </div>

                {/* Info */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Regras do Banco de Horas:</h3>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                        <li>• Considera apenas horários de <strong>entrada</strong> e <strong>saída</strong> (almoço ignorado)</li>
                        <li>• Tolerância de <strong>{TOLERANCIA_MINUTOS} minutos</strong> na entrada e na saída</li>
                        <li>• Entrada antecipada além da tolerância → minutos adicionados ao banco<strong>*</strong></li>
                        <li>• Saída tardia além da tolerância → minutos adicionados ao banco<strong>*</strong></li>
                        <li>• Horários programados obtidos da escala vinculada ao funcionário</li>
                    </ul>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">
                        <strong>*</strong> A soma deve ser maior que 30 minutos para que o tempo excedente seja adicionado ao banco de horas.
                    </p>
                </div>
            </div>

            {/* Lista de Funcionários */}
            <div className="bg-card border border-border rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Banco de Horas por Funcionário</h2>

                {loading || loadingRegistros ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Carregando...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-3 text-foreground">Funcionário</th>
                                    <th className="text-left py-2 px-3 text-foreground hidden sm:table-cell">Cargo</th>
                                    <th className="text-left py-2 px-3 text-foreground hidden lg:table-cell">Empresa</th>
                                    <th className="text-left py-2 px-3 text-foreground hidden lg:table-cell">Escala</th>
                                    <th className="text-center py-2 px-3 text-foreground">Dias c/ Registro</th>
                                    <th className="text-center py-2 px-3 text-foreground">Banco Mensal</th>
                                    <th className="text-center py-2 px-3 text-foreground">Acumulado</th>
                                    <th className="text-center py-2 px-3 text-foreground">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {funcionariosFiltrados.map(func => {
                                    const escala = getEscalaFuncionario(func);
                                    const banco = calcularBancoHorasFuncionario(func.id, escala);
                                    const totalMinutos = somarMinutosBanco(banco);
                                    const diasComRegistro = registrosPonto.filter(r => r.funcionario_id === func.id).length;
                                    const acumulado = acumulados[func.id] || 0; // Busca do estado

                                    return (
                                        <tr key={func.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                            <td className="py-2 px-3 font-medium text-foreground">{func.nome_completo}</td>
                                            <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{func.cargo?.nome_cargo || '-'}</td>
                                            <td className="py-2 px-3 text-muted-foreground hidden lg:table-cell">{func.empresa?.nome_empresa || '-'}</td>
                                            <td className="py-2 px-3 text-muted-foreground hidden lg:table-cell">
                                                {func.codigo_escala || (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <AlertCircle className="w-3 h-3" /> Sem escala
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center text-foreground">{diasComRegistro}</td>
                                            <td className={`py-2 px-3 text-center font-bold ${totalMinutos > 0 ? 'text-amber-600 dark:text-amber-400' : totalMinutos < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                                {minutesToHHMM(totalMinutos)}
                                            </td>
                                            <td className={`py-2 px-3 text-center font-bold ${acumulado > 0 ? 'text-green-600 dark:text-green-400' : acumulado < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                                {minutesToHHMM(acumulado)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => abrirDetalheMesAMes(func)}
                                                        className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                                        title="Detalhamento mês a mês (auditoria)"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => abrirJanelaImpressao([func], `Banco de Horas - ${func.nome_completo}`)}
                                                        disabled={loading}
                                                        className="bg-primary/10 text-primary px-2 py-1 rounded text-xs hover:bg-primary/20 transition-colors disabled:opacity-50"
                                                        title="Imprimir"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {funcionariosFiltrados.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Nenhum funcionário encontrado com os filtros selecionados.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de detalhamento mês a mês (auditoria) */}
            {detalheFunc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetalheFunc(null)}>
                    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/40">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-600" />
                                    Detalhamento Mês a Mês — Auditoria
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {detalheFunc.nome_completo}
                                    {detalheFunc.codigo_escala ? ` · Escala ${detalheFunc.codigo_escala}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label
                                    className="flex items-center gap-2 text-xs px-2 py-1 rounded border border-border bg-card cursor-pointer hover:bg-muted"
                                    title="Alterna entre os créditos brutos (antes da regra dos 30 min) e os créditos efetivamente contabilizados no banco."
                                >
                                    <input
                                        type="checkbox"
                                        checked={mostrarBruto}
                                        onChange={(e) => setMostrarBruto(e.target.checked)}
                                        className="h-3.5 w-3.5"
                                    />
                                    Mostrar créditos brutos
                                </label>
                                <button
                                    onClick={previsualizarPDF}
                                    disabled={!!erroFiltroDatas || !!gerandoPdf}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-indigo-300 dark:border-indigo-700 bg-background hover:bg-muted text-indigo-700 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={gerandoPdf ? 'Gerando PDF, aguarde...' : 'Abre uma pré-visualização do PDF antes da exportação.'}
                                >
                                    {gerandoPdf === 'preview'
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Printer className="w-3.5 h-3.5" />}
                                    {gerandoPdf === 'preview' ? 'Gerando...' : 'Pré-visualizar'}
                                </button>
                                <button
                                    onClick={exportarAuditoriaPDF}
                                    disabled={!!erroFiltroDatas || !!gerandoPdf}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={gerandoPdf ? 'Gerando PDF, aguarde...' : (erroFiltroDatas || 'Exporta o detalhamento mês a mês (incluindo dias abertos) para PDF.')}
                                >
                                    {gerandoPdf === 'export'
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Printer className="w-3.5 h-3.5" />}
                                    {gerandoPdf === 'export'
                                        ? 'Gerando PDF...'
                                        : `Exportar PDF${mesesSelecionados.size > 0 ? ` (${mesesSelecionados.size})` : ''}`}
                                </button>
                                <button onClick={() => setDetalheFunc(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Resumo agregado da auditoria */}
                        {detalheMeses.length > 0 && (
                            <div className="px-5 py-3 border-b border-border bg-card grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="rounded border border-border p-2">
                                    <div className="text-muted-foreground">Saldo acumulado</div>
                                    <div className="text-base font-bold text-foreground">
                                        {minutesToHHMM(detalheMeses.reduce((a, m) => a + (m.minutos_total || 0), 0))}
                                    </div>
                                </div>
                                <div className="rounded border border-border p-2">
                                    <div className="text-muted-foreground">Meses abertos</div>
                                    <div className="text-base font-bold text-foreground">
                                        {resumoAuditoria.mesesAbertos} / {detalheMeses.length}
                                    </div>
                                </div>
                                <div className="rounded border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-2">
                                    <div className="text-green-700 dark:text-green-400">Dias creditados</div>
                                    <div className="text-base font-bold text-green-700 dark:text-green-300">
                                        {resumoAuditoria.creditados}
                                    </div>
                                </div>
                                <div className="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2">
                                    <div className="text-amber-700 dark:text-amber-400" title={`Dias em que a soma dos créditos foi menor que ${MINIMO_CREDITO_DIARIO} min`}>
                                        Crédito ignorado (&lt; {MINIMO_CREDITO_DIARIO} min)
                                    </div>
                                    <div className="text-base font-bold text-amber-700 dark:text-amber-300">
                                        {resumoAuditoria.ignorados}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filtros: intervalo de datas + busca + ordenação + tipo */}
                        {detalheMeses.length > 0 && (
                            <div className="px-5 py-2 border-b border-border bg-muted/20 flex flex-wrap items-end gap-2 text-xs">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">Data início</label>
                                    <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">Data fim</label>
                                    <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs" />
                                </div>
                                {(filtroDataInicio || filtroDataFim) && (
                                    <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                                        className="px-2 py-1 rounded border border-border bg-background hover:bg-muted text-muted-foreground" title="Limpar intervalo">
                                        Limpar datas
                                    </button>
                                )}
                                <div className="flex flex-col flex-1 min-w-[140px]">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">Buscar (dia, D.S., data, tipo)</label>
                                    <input type="text" value={buscaDia} onChange={e => setBuscaDia(e.target.value)}
                                        placeholder="Ex: Seg, 15, creditado..."
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">Tipo</label>
                                    <select value={filtroTipoDia} onChange={e => setFiltroTipoDia(e.target.value as any)}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs">
                                        <option value="todos">Todos</option>
                                        <option value="creditados">Creditados</option>
                                        <option value="ignorados">Ignorados</option>
                                        <option value="debitos">Débitos</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">Ordenar</label>
                                    <select value={ordenacaoDia} onChange={e => setOrdenacaoDia(e.target.value as any)}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs">
                                        <option value="dia-asc">Dia ↑</option>
                                        <option value="dia-desc">Dia ↓</option>
                                        <option value="ds-asc">Dia da semana</option>
                                        <option value="tipo">Tipo (creditado → ignorado)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">PDF: orientação</label>
                                    <select value={pdfOrientacao} onChange={e => setPdfOrientacao(e.target.value as any)}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs">
                                        <option value="landscape">Paisagem</option>
                                        <option value="portrait">Retrato</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground mb-0.5">PDF: fonte</label>
                                    <select value={pdfFontSize} onChange={e => setPdfFontSize(Number(e.target.value))}
                                        className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs">
                                        {[8, 9, 10, 11, 12].map(s => <option key={s} value={s}>{s}px</option>)}
                                    </select>
                                </div>
                                {mesesSelecionados.size > 0 && (
                                    <button onClick={() => setMesesSelecionados(new Set())}
                                        className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-700 bg-background hover:bg-muted text-indigo-700 dark:text-indigo-300 text-xs"
                                        title="Limpar seleção (exporta todos os meses do filtro)">
                                        Limpar seleção ({mesesSelecionados.size})
                                    </button>
                                )}
                            </div>
                        )}
                        {erroFiltroDatas && (
                            <div className="px-5 py-2 border-b border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span><strong>Intervalo inválido:</strong> {erroFiltroDatas}</span>
                            </div>
                        )}

                        <div className="overflow-auto p-4">
                            {loadingDetalhe ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="mt-2 text-muted-foreground">Carregando histórico...</p>
                                </div>
                            ) : detalheMeses.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum registro consolidado encontrado para este funcionário em <code>banco_horas_mensal</code>.
                                </p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-center py-2 px-2 w-8" title="Selecionar meses para exportar em um único PDF">
                                                <input
                                                    type="checkbox"
                                                    checked={mesesSelecionados.size > 0 && detalheMeses.filter(m => mesIntersectaIntervalo(m.ano, m.mes)).every(m => mesesSelecionados.has(`${m.ano}-${m.mes}`))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setMesesSelecionados(new Set(detalheMeses.filter(m => mesIntersectaIntervalo(m.ano, m.mes)).map(m => `${m.ano}-${m.mes}`)));
                                                        } else {
                                                            setMesesSelecionados(new Set());
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="text-left py-2 px-3">Período</th>
                                            <th className="text-center py-2 px-3">Dias Trab.</th>
                                            <th className="text-center py-2 px-3">Dias c/ Banco</th>
                                            <th className="text-center py-2 px-3">Entrada</th>
                                            <th className="text-center py-2 px-3">Saída</th>
                                            <th className="text-center py-2 px-3">Total Mês</th>
                                            <th className="text-center py-2 px-3">Saldo Acumulado</th>
                                            <th className="text-center py-2 px-3 hidden md:table-cell">Calculado em</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            let saldo = 0;
                                            return detalheMeses.map((m, idx) => {
                                                const excluidoMin = minutosExcluidosNoMes(detalheFunc?.id, m.ano, m.mes);
                                                const totalMesAjustado = (m.minutos_total || 0) - excluidoMin;
                                                saldo += totalMesAjustado;
                                                if (!mesIntersectaIntervalo(m.ano, m.mes)) return null;
                                                const key = `${m.ano}-${m.mes}`;
                                                const expanded = mesExpandido === key;
                                                const diasBrutos = diasPorMes[key];
                                                const dias = diasBrutos ? diasFiltradosPorMes[key] : undefined;
                                                const carregandoDias = loadingDias === key;
                                                const selecionado = mesesSelecionados.has(key);
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <tr
                                                            onClick={() => toggleMesExpandido(m.ano, m.mes)}
                                                            className={`border-b border-border hover:bg-muted/40 cursor-pointer transition-colors ${selecionado ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                                        >
                                                            <td className="py-2 px-2 text-center" onClick={e => { e.stopPropagation(); toggleMesSelecionado(key); }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selecionado}
                                                                    onChange={() => toggleMesSelecionado(key)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    title="Incluir este mês na exportação combinada"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-3 font-medium text-foreground">
                                                                <span className="inline-flex items-center gap-1">
                                                                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    {meses[m.mes - 1]}/{m.ano}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 text-center">{m.dias_trabalhados}</td>
                                                            <td className="py-2 px-3 text-center">{m.dias_com_banco}</td>
                                                            <td className="py-2 px-3 text-center text-muted-foreground">
                                                                {minutesToHHMM(m.minutos_entrada || 0)}
                                                            </td>
                                                            <td className="py-2 px-3 text-center text-muted-foreground">
                                                                {minutesToHHMM(m.minutos_saida || 0)}
                                                            </td>
                                                            <td className={`py-2 px-3 text-center font-bold ${totalMesAjustado > 0 ? 'text-amber-600' : totalMesAjustado < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                {minutesToHHMM(totalMesAjustado)}
                                                                {excluidoMin !== 0 && (
                                                                    <span className="block text-[10px] font-normal text-muted-foreground" title={`Original: ${minutesToHHMM(m.minutos_total || 0)} — Excluído: ${minutesToHHMM(excluidoMin)}`}>
                                                                        (excl. {minutesToHHMM(excluidoMin)})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className={`py-2 px-3 text-center font-bold ${saldo > 0 ? 'text-green-600' : saldo < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                {minutesToHHMM(saldo)}
                                                            </td>
                                                            <td className="py-2 px-3 text-center text-xs text-muted-foreground hidden md:table-cell">
                                                                {m.data_calculo ? new Date(m.data_calculo).toLocaleDateString('pt-BR') : '-'}
                                                            </td>
                                                        </tr>

                                                        {expanded && (
                                                            <tr className="bg-muted/20">
                                                                <td colSpan={9} className="p-3">
                                                                    {carregandoDias ? (
                                                                        <div className="text-center py-4 text-muted-foreground text-xs">
                                                                            Carregando dias...
                                                                        </div>
                                                                    ) : !dias || dias.length === 0 ? (
                                                                        <div className="text-center py-4 text-muted-foreground text-xs">
                                                                            Sem registros de ponto neste mês.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="overflow-x-auto">
                                                                            {(() => {
                                                                                let cred = 0, ign = 0;
                                                                                dias.forEach(d => {
                                                                                    if (d.creditoIgnoradoRegra30) ign++;
                                                                                    else if (d.minutosEntrada > 0 || d.minutosSaida > 0) cred++;
                                                                                });
                                                                                return (
                                                                                    <div className="flex flex-wrap gap-3 text-[11px] mb-2 px-1">
                                                                                        <span className="inline-flex items-center gap-1">
                                                                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                                                                            Creditados no mês: <strong className="text-foreground">{cred}</strong>
                                                                                        </span>
                                                                                        <span className="inline-flex items-center gap-1">
                                                                                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                                                                                            Ignorados (&lt; {MINIMO_CREDITO_DIARIO} min): <strong className="text-foreground">{ign}</strong>
                                                                                        </span>
                                                                                        <span className="ml-auto text-muted-foreground italic">
                                                                                            Exibindo créditos {mostrarBruto ? 'brutos (antes da regra)' : 'contabilizados (após a regra)'}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            <table className="w-full text-xs border border-border rounded">
                                                                                <thead>
                                                                                    <tr className="bg-muted/40 text-muted-foreground">
                                                                                        <th className="py-1 px-2 text-left">Dia</th>
                                                                                        <th className="py-1 px-2 text-left">D.S.</th>
                                                                                        <th className="py-1 px-2 text-center">Entrada Prog.</th>
                                                                                        <th className="py-1 px-2 text-center">Saída Prog.</th>
                                                                                        <th className="py-1 px-2 text-center">Entrada Real</th>
                                                                                        <th className="py-1 px-2 text-center">Saída Real</th>
                                                                                        <th className="py-1 px-2 text-center">Min. Entrada</th>
                                                                                        <th className="py-1 px-2 text-center">Min. Saída</th>
                                                                                        <th className="py-1 px-2 text-center">Banco do Dia</th>
                                                                                        <th className="py-1 px-2 text-center">Regra 30 min</th>
                                                                                        <th className="py-1 px-2 text-center">Ação</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {(() => {
                                                                                        const key = `${m.ano}-${m.mes}`;
                                                                                        const pagina = paginaPorMes[key] || 1;
                                                                                        const totalPag = Math.max(1, Math.ceil(dias.length / ITENS_POR_PAGINA));
                                                                                        const pgClamp = Math.min(pagina, totalPag);
                                                                                        const ini = (pgClamp - 1) * ITENS_POR_PAGINA;
                                                                                        const diasPag = dias.slice(ini, ini + ITENS_POR_PAGINA);
                                                                                        return diasPag.map(d => {
                                                                                        const fmt = (v: number) => v !== 0 ? (v > 0 ? '+' : '') + v : '';
                                                                                        const ignorado = d.creditoIgnoradoRegra30;
                                                                                        const teveCredito = d.minutosEntrada > 0 || d.minutosSaida > 0;
                                                                                        const somaBruta = Math.max(0, d.minutosEntradaBruto) + Math.max(0, d.minutosSaidaBruto);
                                                                                        const valorEnt = mostrarBruto ? d.minutosEntradaBruto : d.minutosEntrada;
                                                                                        const valorSai = mostrarBruto ? d.minutosSaidaBruto : d.minutosSaida;
                                                                                        const entCell = ignorado && d.minutosEntradaBruto > 0 && !mostrarBruto
                                                                                            ? <span className="line-through text-muted-foreground" title={`Crédito de ${fmt(d.minutosEntradaBruto)} min ignorado — soma diária ${somaBruta} min < ${MINIMO_CREDITO_DIARIO} min`}>{fmt(d.minutosEntradaBruto)}</span>
                                                                                            : fmt(valorEnt);
                                                                                        const saiCell = ignorado && d.minutosSaidaBruto > 0 && !mostrarBruto
                                                                                            ? <span className="line-through text-muted-foreground" title={`Crédito de ${fmt(d.minutosSaidaBruto)} min ignorado — soma diária ${somaBruta} min < ${MINIMO_CREDITO_DIARIO} min`}>{fmt(d.minutosSaidaBruto)}</span>
                                                                                            : fmt(valorSai);
                                                                                        const excluido = isDiaExcluido(detalheFunc?.id, m.ano, m.mes, d.dia);
                                                                                        return (
                                                                                            <tr key={d.dia} className={`border-t border-border ${excluido ? 'bg-red-50/60 dark:bg-red-900/10 opacity-70' : ''}`}>
                                                                                                <td className={`py-1 px-2 font-medium ${excluido ? 'line-through' : ''}`}>{d.dia.toString().padStart(2, '0')}</td>
                                                                                                <td className={`py-1 px-2 ${excluido ? 'line-through' : ''}`}>{d.diaSemana}</td>
                                                                                                <td className="py-1 px-2 text-center text-muted-foreground">{d.entradaProgramada || '-'}</td>
                                                                                                <td className="py-1 px-2 text-center text-muted-foreground">{d.saidaProgramada || '-'}</td>
                                                                                                <td className="py-1 px-2 text-center">{d.entradaReal || '-'}</td>
                                                                                                <td className="py-1 px-2 text-center">{d.saidaReal || '-'}</td>
                                                                                                <td className={`py-1 px-2 text-center ${excluido ? 'line-through text-muted-foreground' : ''}`}>{entCell}</td>
                                                                                                <td className={`py-1 px-2 text-center ${excluido ? 'line-through text-muted-foreground' : ''}`}>{saiCell}</td>
                                                                                                <td className={`py-1 px-2 text-center font-bold ${excluido ? 'line-through text-muted-foreground' : (d.totalMinutos > 0 ? 'text-amber-600' : d.totalMinutos < 0 ? 'text-red-600' : 'text-muted-foreground')}`}>
                                                                                                    {d.totalMinutos !== 0 ? minutesToHHMM(d.totalMinutos) : ''}
                                                                                                </td>
                                                                                                <td className="py-1 px-2 text-center">
                                                                                                    {excluido ? (
                                                                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" title="Dia excluído manualmente do banco de horas">excluído</span>
                                                                                                    ) : !d.regra30Vigente ? (
                                                                                                        <span className="text-[10px] text-muted-foreground" title="Dia anterior à vigência da regra (14/06/2026)">—</span>
                                                                                                    ) : ignorado ? (
                                                                                                        <span
                                                                                                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 cursor-help"
                                                                                                            title={`Crédito ignorado: a soma dos créditos do dia (${somaBruta} min) é menor que ${MINIMO_CREDITO_DIARIO} min. Regra exige soma ≥ ${MINIMO_CREDITO_DIARIO} min para contabilizar.`}
                                                                                                        >
                                                                                                            ignorado
                                                                                                        </span>
                                                                                                    ) : teveCredito ? (
                                                                                                        <span
                                                                                                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 cursor-help"
                                                                                                            title={`Crédito contabilizado: soma dos créditos (${somaBruta} min) ≥ ${MINIMO_CREDITO_DIARIO} min, atendendo à regra.`}
                                                                                                        >
                                                                                                            creditado
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-[10px] text-muted-foreground">—</span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="py-1 px-2 text-center">
                                                                                                    <div className="inline-flex items-center gap-1">
                                                                                                        <button
                                                                                                            onClick={() => setDiaCalculo({ dia: d, ano: m.ano, mes: m.mes })}
                                                                                                            className="text-[10px] px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-foreground"
                                                                                                            title="Ver fórmula e detalhamento do cálculo deste dia"
                                                                                                        >
                                                                                                            Ver cálculo
                                                                                                        </button>
                                                                                                        {detalheFunc && (
                                                                                                            <button
                                                                                                                onClick={() => {
                                                                                                                    if (!excluido) {
                                                                                                                        const ok = globalThis.confirm(`Excluir o dia ${d.dia.toString().padStart(2,'0')}/${m.mes.toString().padStart(2,'0')}/${m.ano} do banco de horas?\n\nO saldo do dia (${minutesToHHMM(d.totalMinutos)}) será desconsiderado no total do mês e no saldo acumulado.`);
                                                                                                                        if (!ok) return;
                                                                                                                    }
                                                                                                                    toggleDiaExcluido(detalheFunc.id, m.ano, m.mes, d.dia);
                                                                                                                    showToast(excluido ? 'Dia restaurado ao banco de horas.' : 'Dia excluído do banco de horas.', 'success');
                                                                                                                }}
                                                                                                                className={`text-[10px] px-2 py-0.5 rounded border ${excluido ? 'border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30' : 'border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'} bg-background`}
                                                                                                                title={excluido ? 'Restaurar este dia ao banco de horas' : 'Excluir este dia do banco de horas (decisão de auditoria)'}
                                                                                                            >
                                                                                                                {excluido ? 'Restaurar' : 'Excluir'}
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                        });
                                                                                    })()}
                                                                                    {dias.length === 0 && (
                                                                                        <tr><td colSpan={11} className="py-3 text-center text-muted-foreground text-xs italic">Nenhum dia corresponde aos filtros.</td></tr>
                                                                                    )}
                                                                                </tbody>
                                                                            </table>
                                                                            {(() => {
                                                                                const key = `${m.ano}-${m.mes}`;
                                                                                const pagina = paginaPorMes[key] || 1;
                                                                                const totalPag = Math.max(1, Math.ceil(dias.length / ITENS_POR_PAGINA));
                                                                                if (totalPag <= 1) return null;
                                                                                const pgClamp = Math.min(pagina, totalPag);
                                                                                return (
                                                                                    <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                                                                                        <span>
                                                                                            {dias.length} dias · página {pgClamp}/{totalPag} ({ITENS_POR_PAGINA} por página)
                                                                                        </span>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <button
                                                                                                disabled={pgClamp <= 1}
                                                                                                onClick={() => setPaginaPorMes(p => ({ ...p, [key]: Math.max(1, pgClamp - 1) }))}
                                                                                                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                                                                                            >Anterior</button>
                                                                                            <button
                                                                                                disabled={pgClamp >= totalPag}
                                                                                                onClick={() => setPaginaPorMes(p => ({ ...p, [key]: Math.min(totalPag, pgClamp + 1) }))}
                                                                                                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                                                                                            >Próxima</button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            });

                                        })()}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/40 font-bold">
                                            <td className="py-2 px-3" colSpan={6}>TOTAL ACUMULADO</td>
                                            <td className="py-2 px-3 text-center">
                                                {minutesToHHMM(detalheMeses.reduce((a, m) => a + (m.minutos_total || 0), 0))}
                                            </td>
                                            <td className="py-2 px-3 text-center text-green-700">
                                                {minutesToHHMM(detalheMeses.reduce((a, m) => a + (m.minutos_total || 0), 0))}
                                            </td>
                                            <td className="hidden md:table-cell"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                        <div className="px-5 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
                            Fonte: tabela <code>banco_horas_mensal</code>. Os valores são consolidados por mês para fins de auditoria.
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Ver cálculo do dia */}
            {diaCalculo && (() => {
                const { dia: d, ano, mes } = diaCalculo;
                const calc = explicarCalculoDia(d);
                const dataLabel = `${d.dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setDiaCalculo(null)}>
                        <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                                <h4 className="font-semibold text-foreground">Cálculo do dia — {dataLabel} ({d.diaSemana})</h4>
                                <button onClick={() => setDiaCalculo(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4 text-sm space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded border border-border p-2">
                                        <div className="text-muted-foreground">Entrada programada</div>
                                        <div className="font-mono">{d.entradaProgramada || '—'}</div>
                                    </div>
                                    <div className="rounded border border-border p-2">
                                        <div className="text-muted-foreground">Entrada real</div>
                                        <div className="font-mono">{d.entradaReal || '—'}</div>
                                    </div>
                                    <div className="rounded border border-border p-2">
                                        <div className="text-muted-foreground">Saída programada</div>
                                        <div className="font-mono">{d.saidaProgramada || '—'}</div>
                                    </div>
                                    <div className="rounded border border-border p-2">
                                        <div className="text-muted-foreground">Saída real</div>
                                        <div className="font-mono">{d.saidaReal || '—'}</div>
                                    </div>
                                </div>

                                <div className="rounded-md border border-border p-3 bg-muted/30 font-mono text-xs leading-relaxed">
                                    <div className="font-bold mb-1 text-foreground">Fórmula</div>
                                    <div>min_entrada = prog − real (com tolerância de {TOLERANCIA_MINUTOS} min)</div>
                                    <div>min_saída&nbsp;&nbsp; = real − prog (com tolerância de {TOLERANCIA_MINUTOS} min)</div>
                                    <div className="mt-1">→ min_entrada (bruto) = <strong>{calc.fmt(calc.entradaBruto)}</strong></div>
                                    <div>→ min_saída&nbsp;&nbsp; (bruto) = <strong>{calc.fmt(calc.saidaBruto)}</strong></div>
                                </div>

                                <div className={`rounded-md border p-3 text-xs ${d.regra30Vigente
                                    ? (d.creditoIgnoradoRegra30
                                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                                        : 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800')
                                    : 'border-border bg-muted/30'}`}>
                                    <div className="font-bold mb-1 text-foreground">Aplicação da regra dos {MINIMO_CREDITO_DIARIO} min</div>
                                    {!d.regra30Vigente ? (
                                        <div>Dia anterior à vigência da regra ({new Date(DATA_INICIO_REGRA_30MIN + 'T00:00:00').toLocaleDateString('pt-BR')}). Créditos contam normalmente.</div>
                                    ) : (
                                        <>
                                            <div>Soma dos créditos do dia = máx(0, min_entrada) + máx(0, min_saída)</div>
                                            <div className="font-mono">= máx(0, {calc.entradaBruto}) + máx(0, {calc.saidaBruto}) = <strong>{calc.somaCreditos} min</strong></div>
                                            <div className="mt-1">
                                                Soma {calc.atingiuMinimo ? '≥' : '<'} {MINIMO_CREDITO_DIARIO} min →{' '}
                                                <strong>
                                                    {calc.atingiuMinimo ? 'créditos contabilizados' : 'créditos ignorados (zerados)'}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="rounded-md border border-border p-3 text-xs font-mono leading-relaxed">
                                    <div className="font-bold mb-1 text-foreground">Saldo do dia</div>
                                    <div>min_entrada (final) = <strong>{calc.fmt(calc.entradaFinal)}</strong></div>
                                    <div>min_saída&nbsp;&nbsp; (final) = <strong>{calc.fmt(calc.saidaFinal)}</strong></div>
                                    <div className="mt-1">débitos preservados = <strong>{calc.fmt(calc.debitos)}</strong></div>
                                    <div className="mt-2 text-sm">
                                        <span className="text-muted-foreground">Saldo = </span>
                                        <span className={`font-bold ${calc.total > 0 ? 'text-amber-600' : calc.total < 0 ? 'text-red-600' : 'text-foreground'}`}>
                                            {calc.fmt(calc.total)} min ({minutesToHHMM(calc.total)})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Pré-visualização do PDF de auditoria */}
            {previewPdfHtml && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewPdfHtml(null)}>
                    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                            <div>
                                <h4 className="font-semibold text-foreground">Pré-visualização do PDF</h4>
                                <p className="text-xs text-muted-foreground">Confira o layout antes de exportar. Use "Exportar PDF" para gerar a versão final.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setPreviewPdfHtml(null); exportarAuditoriaPDF(); }}
                                    disabled={!!gerandoPdf}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={gerandoPdf ? 'Gerando PDF, aguarde...' : 'Exportar PDF'}
                                >
                                    {gerandoPdf === 'export'
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Printer className="w-3.5 h-3.5" />}
                                    {gerandoPdf === 'export' ? 'Gerando PDF...' : 'Exportar PDF'}
                                </button>
                                <button onClick={() => setPreviewPdfHtml(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-white overflow-hidden">
                            <iframe
                                title="Pré-visualização PDF"
                                srcDoc={previewPdfHtml}
                                className="w-full h-full border-0 bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default BancoHoras;
