import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { Calculator, UserPlus, Printer, X, FileText, Loader2, Bell, Download, Building2 } from 'lucide-react';
import BulkNotificationButton from '../../components/BulkNotificationButton';
import { useFuncionariosAtivos, useParametrosCalculo, useEmpresas, usePostosTrabalho } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { calcularTotaisComEventos } from '../../utils/calculosTotais';
import { calcularFolhaPagamento, formatarMoeda, type ResultadoCalculoFolha } from '../../utils/calcularFolhaPagamento';
import { getSalarioCargoVigente } from '../../hooks/useSalarioCargo';
import { getSalarioVigente } from '../../hooks/useSalarioVigente';
import { mapearFolhaParaHolerite } from '../../utils/codigosContabeisHolerite';
import { normalizarDescricao } from '../../utils/eventosExcepcionaisValidator';
import { normalizarFolhaCalculada } from '../../utils/normalizarFolhaCalculada';
import PeriodSelector, { formatMonthYear } from '../../components/PeriodSelector';
import GerarFolhaIndividualModal from '../../components/GerarFolhaIndividualModal';
import EditarFolhaIndividualModal from '../../components/EditarFolhaIndividualModal';
import AnaliseIAModal from '../../components/AnaliseIAModal';
import Holerite from '../../components/Holerite';
import ReciboBeneficios from '../../components/ReciboBeneficios';
import { ReciboDepositoBeneficios } from '../../components/ReciboDepositoBeneficios';
import { useToast } from '../../hooks/useToast';
import { imprimirHolerite, imprimirReciboBeneficios } from '../../utils/impressaoDocumentos';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { usePermissions } from '../../hooks/usePermissions';
import ExportacaoLoteModal from '../../components/ExportacaoLoteModal';
import CNABModal from '../../components/CNABModal';
import ProgressBar from '../../components/ui/ProgressBar';
import { abreviarNome } from '../../utils/formatarNome';
import { getDadosDiasProximoMes } from '../../utils/getDadosDiasProximoMes';
import { type EventoExcepcional, type FolhaCalculadaCompleta, type PrintContext } from './CalculatedPayroll/types';
import {
    imprimirTudoEmUmaJanela,
    imprimirTudoSeparado,
    imprimirHoleritesEmLote,
    imprimirBeneficiosEmLote,
    imprimirRecibosEmLote,
    imprimirRecibosBeneficiosEmLote
} from './CalculatedPayroll/printUtils';

const CalculatedPayroll: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { isAdmin, canShowForm, canShowActions } = usePermissions();
    const { data: funcionarios } = useFuncionariosAtivos();
    const { data: parametros } = useParametrosCalculo();
    const { data: empresas } = useEmpresas();
    const { data: postos } = usePostosTrabalho();
    
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [progressoCalculo, setProgressoCalculo] = useState({ atual: 0, total: 0, nome: '' });
    const [progressoSalvar, setProgressoSalvar] = useState({ atual: 0, total: 0, nome: '' });
    const [todasFolhas, setTodasFolhas] = useState<FolhaCalculadaCompleta[]>([]);
    const [activeTab, setActiveTab] = useState<string>('');
    const [ordenacao, setOrdenacao] = useState<'nome' | 'empresa' | 'posto'>('nome');
    const [mostrarModalFolhaIndividual, setMostrarModalFolhaIndividual] = useState(false);
    const [mostrarModalEditarFolha, setMostrarModalEditarFolha] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<any>(null);
    const [eventosExcepcionais, setEventosExcepcionais] = useState<Record<string, EventoExcepcional[]>>({});
    const [mostrarHolerite, setMostrarHolerite] = useState(false);
    const [folhaSelecionadaHolerite, setFolhaSelecionadaHolerite] = useState<FolhaCalculadaCompleta | null>(null);
    const [mostrarReciboBeneficios, setMostrarReciboBeneficios] = useState(false);
    const [folhaSelecionadaReciboBeneficios, setFolhaSelecionadaReciboBeneficios] = useState<FolhaCalculadaCompleta | null>(null);
    const [mostrarRecibo, setMostrarRecibo] = useState(false);
    const [folhaSelecionadaRecibo, setFolhaSelecionadaRecibo] = useState<FolhaCalculadaCompleta | null>(null);
    const [mostrarImprimirTudo, setMostrarImprimirTudo] = useState(false);
    const [folhaSelecionadaImprimirTudo, setFolhaSelecionadaImprimirTudo] = useState<FolhaCalculadaCompleta | null>(null);
    const [mostrarAnaliseIA, setMostrarAnaliseIA] = useState(false);
    const [modoEdicao, setModoEdicao] = useState<Record<string, boolean>>({});
    const [mostrarModalFaltas, setMostrarModalFaltas] = useState(false);
    const [tipoFaltaModal, setTipoFaltaModal] = useState<'justificadas' | 'injustificadas'>('justificadas');
    const [observacoes, setObservacoes] = useState<Record<string, string>>({});
    // Undo/Redo do container de Benefícios (snapshots por funcionário)
    const [beneficiosUndo, setBeneficiosUndo] = useState<Record<string, Array<{ resultado: any; eventos: EventoExcepcional[] }>>>({});
    const [beneficiosRedo, setBeneficiosRedo] = useState<Record<string, Array<{ resultado: any; eventos: EventoExcepcional[] }>>>({});
    // Modal de confirmação para exclusão em Benefícios
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
    
    // Estados para impressão em lote
    const [filtroImpressao, setFiltroImpressao] = useState<'todos' | 'posto' | 'empresa'>('todos');
    const [postoFiltro, setPostoFiltro] = useState('');
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    
    // Estados para indicador de progresso de impressão
    const [imprimindo, setImprimindo] = useState(false);
    const [progressoImpressao, setProgressoImpressao] = useState({ atual: 0, total: 0, tipo: '' });
    
    // Estado para filtro de funcionários registrados
    const [filtroRegistro, setFiltroRegistro] = useState<'todos' | 'registrados' | 'nao_registrados'>('todos');

    // Estados para visualização em lote
    const [mostrarVisualizacaoLote, setMostrarVisualizacaoLote] = useState(false);
    const [tipoVisualizacaoLote, setTipoVisualizacaoLote] = useState<'holerite' | 'beneficios' | 'recibo' | 'tudo'>('holerite');
    const [folhasVisualizacaoLote, setFolhasVisualizacaoLote] = useState<FolhaCalculadaCompleta[]>([]);
    
    // Estados para modais de exportação
    const [mostrarExportacaoLote, setMostrarExportacaoLote] = useState(false);
    const [mostrarCNABModal, setMostrarCNABModal] = useState(false);
    
    // Estado para mostrar seletor de período
    const [mostrarSeletorPeriodo, setMostrarSeletorPeriodo] = useState(false);
    const [progressoGeracaoPeriodo, setProgressoGeracaoPeriodo] = useState({ atual: 0, total: 0 });

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
        'Novembro 13º', 'Dezembro 13º'
    ];

    // Flag para identificar se estamos no modo 13º salário
    const is13Salario = mes === 13 || mes === 14;
    const mesRealPara13 = mes === 13 ? 11 : mes === 14 ? 12 : mes;

    // Função para extrair datas das faltas do JSON dados_dias
    const extrairDatasFaltas = (dadosDias: any, tipoFalta: 'justificadas' | 'injustificadas'): number[] => {
        
        if (!dadosDias) {
            return [];
        }
        
        try {
            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
            
            const datas: number[] = [];
            
            Object.keys(dados).forEach(diaKey => {
                const diaData = dados[diaKey];
                // Extrair número do dia (ex: "dia_8" -> 8)
                const diaNumero = Number.parseInt(diaKey.replace('dia_', ''));
                
                if (tipoFalta === 'justificadas') {
                    // Falta justificada = atestado === true
                    if (diaData.atestado === true || diaData.atestado === 'true') {
                        datas.push(diaNumero);
                    }
                } else {
                    // Falta injustificada = falta_injustificada === true
                    if (diaData.falta_injustificada === true || diaData.falta_injustificada === 'true') {
                        datas.push(diaNumero);
                    }
                }
            });
            
            return datas.sort((a, b) => a - b);
        } catch (error) {
            return [];
        }
    };

    // Carregar folhas de pagamento salvas ao montar o componente ou mudar mês/ano
    useEffect(() => {
        carregarFolhasSalvas();
    }, [mes, ano]);

    const carregarFolhasSalvas = async (preservarActiveTab: boolean = false) => {
        const activeTabAtual = activeTab; // Guardar o activeTab atual antes de recarregar
        setLoading(true);
        try {
            
            // Buscar folhas sem JOIN problemático
            const { data: folhasSalvas, error } = await supabase
                .from('folha_calculada')
                .select(`
                    funcionario_id,
                    nome_funcionario,
                    mes,
                    ano,
                    empresa_id,
                    posto_trabalho_id,
                    salario_base,
                    horas_extras_50,
                    horas_extras_100,
                    adicional_noturno,
                    intrajornada_50,
                    intrajornada_100,
                    dsr_horas_extras,
                    dsr_adicional_noturno,
                    adicional_insalubridade,
                    adicional_acumulo_funcao,
                    salario_familia,
                    complemento_salario,
                    vale_transporte,
                    vale_transporte_mes_anterior,
                    vale_transporte_mes_atual,
                    vale_alimentacao,
                    vale_alimentacao_mes_anterior,
                    vale_alimentacao_mes_atual,
                    cesta_basica,
                    plr,
                    premio_permanencia,
                    desconto_inss,
                    desconto_irrf,
                    desconto_vt,
                    desconto_vt_faltas,
                    desconto_va_faltas,
                    desconto_seguro_vida,
                    desconto_convenio_odonto,
                    desconto_contribuicao_assistencial,
                    desconto_atrasos,
                    desconto_faltas,
                    desconto_dsr_faltas,
                    dias_dsr_faltas,
                    desconto_plr,
                    desconto_pensao_alimenticia,
                    desconto_rondas_nao_realizadas,
                    desc_rondas_nao_realizadas_benef,
                    desconto_adiantamento_quinzenal,
                    desconto_complemento_anterior,
                    desconto_adiantamento_salario,
                    desc_avaria_utilitario,
                    total_proventos,
                    total_descontos,
                    total_beneficios,
                    salario_liquido,
                    base_inss,
                    base_irrf,
                    base_fgts,
                    fgts,
                    inss_patronal,
                    eventos_excepcionais,
                    decimo_terceiro_proporcional_rescisao,
                    ferias_proporcionais_rescisao,
                    um_terco_ferias_proporcional_rescisao,
                    plr_proporcional_rescisao,
                    decimo_terceiro_vantagens_rescisao,
                    decimo_terceiro_primeira_parcela,
                    decimo_terceiro_vantagens_primeira_parcela,
                    decimo_terceiro_segunda_parcela,
                    decimo_terceiro_vantagens_segunda_parcela,
                    folga_trabalhada,
                    servicos_externos_folhas_pagamento,
                    servicos_externos_controle_rondas,
                    reembolsos_uber,
                    supervisao_palmeiras,
                    inss_13,
                    inss_ferias,
                    desc_ajuste_beneficios,
                    decimo_terceiro_integral,
                    vantagens_13,
                    adiantamento_13_salario,
                    adiantamento_vantagens_13,
                    folgas_trabalhadas_vt,
                    folgas_trabalhadas_va,
                    observacoes,
                    funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
                    empresa:empresas(*),
                    posto_trabalho:postos_trabalho(*)
                `)
                .eq('mes', mes)
                .eq('ano', ano);


            if (error) {
                throw error;
            }

            if (folhasSalvas && folhasSalvas.length > 0) {
                
                // Normalizar relacionamentos - Supabase pode retornar array em vez de objeto
                folhasSalvas.forEach((folha: any) => {
                    if (Array.isArray(folha.funcionario)) {
                        folha.funcionario = folha.funcionario[0] || null;
                    }
                    if (Array.isArray(folha.empresa)) {
                        folha.empresa = folha.empresa[0] || null;
                    }
                    if (Array.isArray(folha.posto_trabalho)) {
                        folha.posto_trabalho = folha.posto_trabalho[0] || null;
                    }
                });
                
                // Buscar escalas separadamente
                const { data: regrasData } = await supabase
                    .from('regras_escalas')
                    .select('id, codigo_escala, nome_escala');

                // Fazer JOIN manual
                if (regrasData) {
                    folhasSalvas.forEach((folha: any) => {
                        if (folha.funcionario?.cargo?.escala_id) {
                            folha.funcionario.cargo.escala = regrasData.find(r => r.id === folha.funcionario.cargo.escala_id) || null;
                        }
                    });
                }
            } else {
                setTodasFolhas([]);
                setActiveTab('');
                return;
            }

            if (folhasSalvas && folhasSalvas.length > 0) {
                // Buscar folhas de ponto correspondentes para ter os dados de horas e faltas
                const funcionarioIds = folhasSalvas.map(f => f.funcionario_id);
                const { data: folhasPonto } = await supabase
                    .from('folhas_ponto')
                    .select('*')
                    .in('funcionario_id', funcionarioIds)
                    .eq('mes', mes)
                    .eq('ano', ano);

                // Buscar folhas de ponto do PRÓXIMO MÊS (para VA/VT)
                const proximoMes = mes === 12 ? 1 : mes + 1;
                const proximoAno = mes === 12 ? ano + 1 : ano;
                const { data: folhasPontoProximoMes } = await supabase
                    .from('folhas_ponto')
                    .select('funcionario_id, dados_dias')
                    .in('funcionario_id', funcionarioIds)
                    .eq('mes', proximoMes)
                    .eq('ano', proximoAno);

                const folhasProcessadas = folhasSalvas.map(folha => {
                    // Encontrar a folha de ponto correspondente
                    const folhaPonto = folhasPonto?.find(fp => fp.funcionario_id === folha.funcionario_id);
                    
                    // Encontrar a folha de ponto do próximo mês
                    const folhaPontoProximoMes = folhasPontoProximoMes?.find(fp => fp.funcionario_id === folha.funcionario_id);
                    
                    // Calcular dias de VA e VT do próximo mês
                    let diasVA = 0;
                    let diasVT = 0;
                    if (folhaPontoProximoMes?.dados_dias) {
                        const dados = typeof folhaPontoProximoMes.dados_dias === 'string' 
                            ? JSON.parse(folhaPontoProximoMes.dados_dias) 
                            : folhaPontoProximoMes.dados_dias;
                        
                        Object.values(dados).forEach((d: any) => {
                            if (d.entrada && d.saida && !d.folga) {
                                diasVT++; // Todos os dias trabalhados
                                
                                // Calcular horas trabalhadas
                                const [hE, mE] = d.entrada.split(':').map(Number);
                                const [hS, mS] = d.saida.split(':').map(Number);
                                const [hIR, mIR] = (d.inicio_refeicao || '00:00').split(':').map(Number);
                                const [hTR, mTR] = (d.termino_refeicao || '00:00').split(':').map(Number);
                                
                                const minutosEntrada = hE * 60 + mE;
                                const minutosSaida = hS * 60 + mS;
                                const minutosInicioRef = hIR * 60 + mIR;
                                const minutosTerminoRef = hTR * 60 + mTR;
                                
                                let totalMinutos = minutosSaida - minutosEntrada;
                                if (totalMinutos < 0) totalMinutos += 24 * 60;
                                
                                const intervalo = minutosTerminoRef - minutosInicioRef;
                                totalMinutos -= intervalo;
                                
                                const horas = totalMinutos / 60;
                                if (horas >= 6) diasVA++; // Apenas dias ≥6h
                            }
                        });
                    } else {
                        // ⭐ FALLBACK: Calcular baseado na escala quando não há folha do próximo mês
                        const func = folha.funcionario as any;
                        const codigoEscala = func?.cargo?.escala?.codigo_escala || func?.codigo_escala;
                        const proximoMes = mes === 12 ? 1 : mes + 1;
                        const proximoAno = mes === 12 ? ano + 1 : ano;
                        const diasNoMes = new Date(proximoAno, proximoMes, 0).getDate();
                        
                        if (codigoEscala) {
                            // Escalas 12x36 (dias alternados)
                            if (codigoEscala.includes('12X36') || codigoEscala.includes('12x36')) {
                                diasVT = Math.floor(diasNoMes / 2); // Aproximadamente metade dos dias
                                diasVA = diasVT; // Para 12x36, todos os dias trabalhados são ≥6h
                            }
                            // Escalas 6x1 (6 dias por semana)
                            else if (codigoEscala.includes('6X1') || codigoEscala.includes('6x1')) {
                                const semanas = Math.floor(diasNoMes / 7);
                                diasVT = semanas * 6 + Math.min(diasNoMes % 7, 6);
                                diasVA = diasVT; // Para 6x1, todos os dias trabalhados são ≥6h
                            }
                            // Escalas 5x2 (5 dias por semana)
                            else if (codigoEscala.includes('5X2') || codigoEscala.includes('5x2')) {
                                const semanas = Math.floor(diasNoMes / 7);
                                diasVT = semanas * 5 + Math.min(diasNoMes % 7, 5);
                                diasVA = diasVT; // Para 5x2, todos os dias trabalhados são ≥6h
                            }
                            // Escala padrão (assumir 22 dias úteis)
                            else {
                                diasVT = 22;
                                diasVA = 22;
                            }
                        } else {
                            // Sem escala definida - assumir 22 dias úteis
                            diasVT = 22;
                            diasVA = 22;
                        }
                        
                    }
                    
                    const escalaMensalProximoMes = { diasVA, diasVT };
                    
                    return {
                        funcionario: folha.funcionario,
                        empresa: folha.empresa,
                        posto_trabalho: folha.posto_trabalho,
                        // Adicionar dados da folha de ponto para o relatório detalhado
                        total_horas_extras_50: folhaPonto?.total_horas_extras_50 || 0,
                        total_horas_extras_100: folhaPonto?.total_horas_extras_100 || 0,
                        total_intrajornada_50: folhaPonto?.total_intrajornada_50 || 0,
                        total_intrajornada_100: folhaPonto?.total_intrajornada_100 || 0,
                        total_horas_noturnas: folhaPonto?.total_horas_noturnas || 0,
                        total_atrasos: folhaPonto?.total_atrasos || 0,
                        total_faltas_justificadas: folhaPonto?.total_faltas_justificadas || 0,
                        total_faltas_injustificadas: folhaPonto?.total_faltas_injustificadas || 0,
                        dados_dias: folhaPonto?.dados_dias,
                        mes: folha.mes,
                        ano: folha.ano,
                    resultado: {
                        salario_base: folha.salario_base,
                        horas_extras_50: folha.horas_extras_50 || 0,
                        horas_extras_100: folha.horas_extras_100 || 0,
                        adicional_noturno: folha.adicional_noturno || 0,
                        intrajornada_50: folha.intrajornada_50 || 0,
                        intrajornada_100: folha.intrajornada_100 || 0,
                        dsr_horas_extras: folha.dsr_horas_extras || 0,
                        dsr_adicional_noturno: folha.dsr_adicional_noturno || 0,
                        adicional_insalubridade: folha.adicional_insalubridade || 0,
                        adicional_acumulo_funcao: folha.adicional_acumulo_funcao || 0,
                        salario_familia: folha.salario_familia || 0,
                        complemento_salario: folha.complemento_salario || 0,
                        vale_transporte: folha.vale_transporte || 0,
                        vale_transporte_mes_anterior: folha.vale_transporte_mes_anterior || 0,
                        vale_transporte_mes_atual: folha.vale_transporte_mes_atual || 0,
                        vale_alimentacao: folha.vale_alimentacao || 0,
                        vale_alimentacao_mes_anterior: folha.vale_alimentacao_mes_anterior || 0,
                        vale_alimentacao_mes_atual: folha.vale_alimentacao_mes_atual || 0,
                        cesta_basica: folha.cesta_basica || 0,
                        plr: folha.plr || 0,
                        premio_permanencia: folha.premio_permanencia || 0,
                        folga_trabalhada: folha.folga_trabalhada || 0,
                        folgas_trabalhadas_vt: 0,
                        folgas_trabalhadas_va: 0,
                        desconto_inss: folha.desconto_inss || 0,
                        desconto_irrf: folha.desconto_irrf || 0,
                        desconto_vt: folha.desconto_vt || 0,
                        desconto_vt_faltas: folha.desconto_vt_faltas || 0,
                        desconto_va_faltas: folha.desconto_va_faltas || 0,
                        desconto_seguro_vida: folha.desconto_seguro_vida || 0,
                        desconto_convenio_odonto: folha.desconto_convenio_odonto || 0,
                        desconto_contribuicao_assistencial: folha.desconto_contribuicao_assistencial || 0,
                        desconto_atrasos: folha.desconto_atrasos || 0,
                        desconto_faltas: folha.desconto_faltas || 0,
                        desconto_dsr_faltas: (folha as any).desconto_dsr_faltas || 0,
                        dias_dsr_faltas: (folha as any).dias_dsr_faltas || 0,
                        desconto_plr: folha.desconto_plr || 0,
                        desconto_pensao_alimenticia: folha.desconto_pensao_alimenticia || 0,
                        desconto_rondas_nao_realizadas: folha.desconto_rondas_nao_realizadas || 0,
                        desc_rondas_nao_realizadas_benef: (folha as any).desc_rondas_nao_realizadas_benef || 0,
                        desconto_adiantamento_quinzenal: folha.desconto_adiantamento_quinzenal || 0,
                        desconto_complemento_anterior: folha.desconto_complemento_anterior || 0,
                        desconto_adiantamento_salario: folha.desconto_adiantamento_salario || 0,
                        desc_avaria_utilitario: (folha as any).desc_avaria_utilitario || 0,
                        // ⭐ ADICIONAR SERVIÇOS EXTERNOS AO RESULTADO
                        servicos_externos_folhas_pagamento: folha.servicos_externos_folhas_pagamento || 0,
                        servicos_externos_controle_rondas: folha.servicos_externos_controle_rondas || 0,
                        // ⭐ ADICIONAR BENEFÍCIOS - DESCONTOS (normalizado para valor absoluto)
                        desc_ajuste_beneficios: Math.abs((folha as any).desc_ajuste_beneficios || 0),
                        total_proventos: folha.total_proventos || 0,
                        total_descontos: folha.total_descontos || 0,
                        total_beneficios: (folha as any).total_beneficios || 0,
                        salario_liquido: folha.salario_liquido || 0,

                        base_inss: folha.base_inss || 0,
                        base_irrf: folha.base_irrf || 0,
                        base_fgts: folha.base_fgts || 0,
                        fgts: folha.fgts || 0,
                        inss_patronal: folha.inss_patronal || 0
                    } as ResultadoCalculoFolha,
                    dadosFolha: {
                        ...(folhaPonto || folha), // Usar folha de ponto se disponível
                        // Adicionar os novos campos de eventos excepcionais da tabela folha_calculada
                        total_decimo_terceiro_primeira_parcela: folha.decimo_terceiro_primeira_parcela || 0,
                        total_decimo_terceiro_vantagens_primeira_parcela: folha.decimo_terceiro_vantagens_primeira_parcela || 0,
                        total_decimo_terceiro_segunda_parcela: folha.decimo_terceiro_segunda_parcela || 0,
                        total_decimo_terceiro_vantagens_segunda_parcela: folha.decimo_terceiro_vantagens_segunda_parcela || 0,
                        total_folga_trabalhada: folha.folga_trabalhada || 0,
                        // Adicionar serviços externos e reembolsos
                        total_servicos_externos_folhas_pagamento: folha.servicos_externos_folhas_pagamento || 0,
                        total_servicos_externos_controle_rondas: folha.servicos_externos_controle_rondas || 0,
                        total_reembolsos_uber: folha.reembolsos_uber || 0,
                        total_supervisao_palmeiras: folha.supervisao_palmeiras || 0,
                        // Também adicionar os eventos de rescisão existentes
                        total_decimo_terceiro_proporcional_rescisao: folha.decimo_terceiro_proporcional_rescisao || 0,
                        total_ferias_proporcionais_rescisao: folha.ferias_proporcionais_rescisao || 0,
                        total_um_terco_ferias_proporcional_rescisao: folha.um_terco_ferias_proporcional_rescisao || 0,
                        total_plr_proporcional_rescisao: folha.plr_proporcional_rescisao || 0,
                        total_decimo_terceiro_vantagens_rescisao: folha.decimo_terceiro_vantagens_rescisao || 0,
                        // Adicionar eventos de descontos
                        total_inss_13: folha.inss_13 || 0,
                        total_inss_ferias: folha.inss_ferias || 0, // ⭐ NOVO
                        // Adicionar eventos de benefícios
                        total_desc_ajuste_beneficios: folha.desc_ajuste_beneficios || 0, // ⭐ NOVO
                        // Adicionar novos eventos de 13º salário integral
                        total_decimo_terceiro_integral: folha.decimo_terceiro_integral || 0,
                        total_vantagens_13: folha.vantagens_13 || 0,
                        total_adiantamento_13_salario: folha.adiantamento_13_salario || 0,
                        total_adiantamento_vantagens_13: folha.adiantamento_vantagens_13 || 0
                    },
                    escalaMensalProximoMes: escalaMensalProximoMes,
                    eventosExcepcionais: folha.eventos_excepcionais || [],
                    folgas_trabalhadas: folhaPonto?.folgas_trabalhadas || 0, // ✅ Folgas trabalhadas (4h+)
                    observacoes: folha.observacoes || '' // ✅ Observações da folha
                };
                });

                // ⭐ CARREGAR EVENTOS EXCEPCIONAIS DOS CAMPOS ESPECÍFICOS DA TABELA folha_calculada
                const eventosRestaurados: Record<string, EventoExcepcional[]> = {};
                
                folhasProcessadas.forEach(folha => {
                    const eventos: EventoExcepcional[] = [];
                    
                    // ⭐ HELPER para adicionar eventos normalizados
                    const adicionarEvento = (descricao: string, valor: number, tipo: 'provento' | 'beneficio' | 'desconto') => {
                        if (valor > 0) {
                            eventos.push({
                                descricao: normalizarDescricao(descricao),
                                valor,
                                tipo
                            });
                        }
                    };
                    
                    // Carregar eventos de rescisão (PROVENTOS)
                    adicionarEvento('13º Proporc. Rescisão', folha.dadosFolha.total_decimo_terceiro_proporcional_rescisao, 'provento');
                    adicionarEvento('Férias Proporc. Rescisão', folha.dadosFolha.total_ferias_proporcionais_rescisao, 'provento');
                    adicionarEvento('1/3 Férias proporc. Rescisão', folha.dadosFolha.total_um_terco_ferias_proporcional_rescisao, 'provento');
                    adicionarEvento('PLR Proporc. Rescisão', folha.dadosFolha.total_plr_proporcional_rescisao, 'provento');
                    adicionarEvento('13º Proporc. Vantagens Rescisão', folha.dadosFolha.total_decimo_terceiro_vantagens_rescisao, 'provento');
                    
                    // Carregar novos eventos de 13º salário (PROVENTOS)
                    adicionarEvento('13º Salário 1ª Parcela', folha.dadosFolha.total_decimo_terceiro_primeira_parcela, 'provento');
                    adicionarEvento('13º Salário Vantagens 1ª Parcela', folha.dadosFolha.total_decimo_terceiro_vantagens_primeira_parcela, 'provento');
                    adicionarEvento('13º Salário 2ª Parcela', folha.dadosFolha.total_decimo_terceiro_segunda_parcela, 'provento');
                    adicionarEvento('13º Salário Vantagens 2ª Parcela', folha.dadosFolha.total_decimo_terceiro_vantagens_segunda_parcela, 'provento');
                    
                    // Carregar serviços externos (PROVENTOS) - NOMES ATUALIZADOS
                    adicionarEvento('Folhas de Pagamento', folha.dadosFolha.total_servicos_externos_folhas_pagamento, 'provento');
                    adicionarEvento('Controle de Rondas Palmeiras', folha.dadosFolha.total_servicos_externos_controle_rondas, 'provento');
                    
                    // Carregar supervisão palmeiras (PROVENTOS) - NOME ATUALIZADO
                    adicionarEvento('Supervisão Palmeiras', folha.dadosFolha.total_supervisao_palmeiras, 'provento');
                    
                    // Carregar reembolsos (BENEFÍCIOS)
                    adicionarEvento('Reembolsos', folha.dadosFolha.total_reembolsos_uber, 'beneficio');
                    
                    // Carregar eventos de benefícios (BENEFÍCIOS)
                    adicionarEvento('Desc. Ajuste dos Benefícios', folha.dadosFolha.total_desc_ajuste_beneficios, 'beneficio'); // ⭐ NOVO
                    
                    // Carregar eventos de descontos (DESCONTOS)
                    adicionarEvento('INSS 13º', folha.dadosFolha.total_inss_13, 'desconto');
                    adicionarEvento('INSS Férias', folha.dadosFolha.total_inss_ferias, 'desconto'); // ⭐ NOVO
                    adicionarEvento('Adiantam. de Salário', folha.resultado.desconto_adiantamento_salario, 'desconto'); // ⭐ CORREÇÃO: Usar do resultado
                    adicionarEvento('Adiantam. 13º Salário', folha.dadosFolha.total_adiantamento_13_salario, 'desconto');
                    adicionarEvento('Adiantam. Vantagens 13º', folha.dadosFolha.total_adiantamento_vantagens_13, 'desconto');
                    
                    // ⭐ CARREGAR DESCONTO DE AVARIA UTILITÁRIO
                    adicionarEvento('Desc. Avaria Utilitário (Parcela)', folha.resultado.desc_avaria_utilitario, 'desconto');
                    
                    // ⭐ CARREGAR DESCONTO DE RONDAS NÃO REALIZADAS
                    adicionarEvento('Desc. Rondas Não Realizadas', folha.resultado.desconto_rondas_nao_realizadas, 'desconto');
                    
                    // ⭐ CARREGAR OUTROS DESCONTOS ESPECÍFICOS
                    adicionarEvento('Pensão Alimentícia', folha.resultado.desconto_pensao_alimenticia, 'desconto');
                    adicionarEvento('Desconto PLR', folha.resultado.desconto_plr, 'desconto');
                    
                    // Carregar novos eventos de 13º salário integral (PROVENTOS) - NOMES ATUALIZADOS
                    adicionarEvento('13º Salário', folha.dadosFolha.total_decimo_terceiro_integral, 'provento');
                    adicionarEvento('Vantagens 13º', folha.dadosFolha.total_vantagens_13, 'provento');
                    
                    // ⭐ CARREGAR EVENTOS SALVOS NO CAMPO JSON eventos_excepcionais
                    // ⚠️ FILTRAR duplicatas: ignorar eventos que já estão sendo carregados de colunas específicas
                    const eventosJaCarregados = new Set(eventos.map(e => normalizarDescricao(e.descricao)));
                    
                    if (folha.eventosExcepcionais && Array.isArray(folha.eventosExcepcionais)) {
                        folha.eventosExcepcionais.forEach((eventoSalvo: any) => {
                            if (eventoSalvo && eventoSalvo.descricao && typeof eventoSalvo.valor === 'number' && eventoSalvo.valor !== 0 && eventoSalvo.tipo) {
                                const descNorm = normalizarDescricao(eventoSalvo.descricao);
                                
                                // ⭐ CORREÇÃO: Não carregar 'Adiantam. de Salário' do JSON pois já vem do campo específico
                                if (descNorm === 'Adiantam. de Salário') {
                                    return;
                                }
                                
                                // Só adicionar se não foi carregado de coluna específica
                                if (!eventosJaCarregados.has(descNorm)) {
                                    eventos.push({
                                        descricao: descNorm,
                                        valor: eventoSalvo.valor,
                                        tipo: eventoSalvo.tipo
                                    });
                                    eventosJaCarregados.add(descNorm);
                                }
                            }
                        });
                    }
                    
                    // Se há eventos salvos, adicionar ao estado
                    if (eventos.length > 0) {
                        eventosRestaurados[(folha.funcionario as any).id] = eventos;
                    }
                });
                
                // ⭐ CORREÇÃO DEFINITIVA: NÃO DUPLICAR EVENTOS EXCEPCIONAIS
                // Apenas carregar eventos salvos da tabela, sem preservar eventos anteriores
                // Isso evita duplicação quando o usuário recalcula após salvar
                setEventosExcepcionais(eventosRestaurados);

                // ⭐ CARREGAR OBSERVAÇÕES DAS FOLHAS SALVAS
                const observacoesRestauradas: Record<string, string> = {};
                folhasProcessadas.forEach(folha => {
                    const funcionarioId = (folha.funcionario as any).id;
                    if (folha.observacoes) {
                        observacoesRestauradas[funcionarioId] = folha.observacoes;
                    }
                });
                
                // ⭐ PRESERVAR OBSERVAÇÕES NÃO SALVAS (merge com observações existentes)
                setObservacoes(prev => ({
                    ...prev, // Manter observações não salvas
                    ...observacoesRestauradas // Sobrescrever com observações salvas
                }));

                setTodasFolhas(folhasProcessadas);
                
                if (folhasProcessadas.length > 0) {
                    // Se deve preservar o activeTab e o funcionário ainda existe na lista, manter
                    if (preservarActiveTab && activeTabAtual && folhasProcessadas.some((f: any) => f.funcionario.id === activeTabAtual)) {
                        setActiveTab(activeTabAtual);
                    } else {
                        const novoActiveTab = (folhasProcessadas[0].funcionario as any).id;
                        setActiveTab(novoActiveTab);
                    }
                }
                
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleCalcularTodas = async () => {
        if (!parametros || parametros.length === 0) {
            showToast('Parâmetros de cálculo não configurados. Configure na página de Tabelas de Apoio.', 'error');
            return;
        }

        const funcionariosComCargo = funcionarios.filter(f => {
            // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
            if (f.demitido === true) {
                return false;
            }
            
            return f.cargo_id;
        });
        
        if (funcionariosComCargo.length === 0) {
            showToast('Nenhum funcionário ativo com cargo definido', 'error');
            return;
        }

        setLoading(true);
        setProgressoCalculo({ atual: 0, total: funcionariosComCargo.length, nome: 'Iniciando...' });
        const folhasCalculadas: FolhaCalculadaCompleta[] = [];

        try {
            // ✅ CORREÇÃO: Buscar parâmetros do ANO da folha, não o "ativo" genérico
            // Primeiro tenta encontrar parâmetro do ano selecionado, senão usa o ativo ou o primeiro
            const parametroAtivo = parametros.find(p => p.ano_vigencia === ano) 
                || parametros.find(p => p.ativo) 
                || parametros[0];
            
            let _idxCalc = 0;
            for (const funcionario of funcionariosComCargo) {
                _idxCalc++;
                setProgressoCalculo({ atual: _idxCalc, total: funcionariosComCargo.length, nome: funcionario.nome_completo });
                try {
                    // Buscar folha de ponto
                    const { data: folhaPonto, error: errorFolha } = await supabase
                        .from('folhas_ponto')
                        .select(`
                            *,
                            funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
                            empresa:empresas(*),
                            posto_trabalho:postos_trabalho(*)
                        `)
                        .eq('funcionario_id', funcionario.id)
                        .eq('mes', mes)
                        .eq('ano', ano)
                        .maybeSingle();

                    if (errorFolha || !folhaPonto) {
                        continue;
                    }

                    // LOG GERAL: Mostrar empresa_id e posto_id de TODOS os funcionários

                    // 🔍 DEBUG: Verificar se os totais dos eventos excepcionais estão na folha de ponto



                    // Buscar escala separadamente
                    if (folhaPonto.funcionario?.cargo?.escala_id) {
                        const { data: escalaData } = await supabase
                            .from('regras_escalas')
                            .select('id, codigo_escala, nome_escala')
                            .eq('id', folhaPonto.funcionario.cargo.escala_id)
                            .single();
                        folhaPonto.funcionario.cargo.escala = escalaData || null;
                    }

                    // Verificar se é mês seguinte à admissão e buscar folha do mês anterior
                    let folhaPontoMesAnterior = null;
                    const dataAdmissao = folhaPonto.funcionario.data_admissao ? new Date(folhaPonto.funcionario.data_admissao) : null;
                    if (dataAdmissao) {
                        const mesAdmissao = dataAdmissao.getMonth() + 1;
                        const anoAdmissao = dataAdmissao.getFullYear();
                        const isMesSeguinteAdmissao = 
                            (mes === mesAdmissao + 1 && ano === anoAdmissao) || 
                            (mes === 1 && mesAdmissao === 12 && ano === anoAdmissao + 1);
                        
                        if (isMesSeguinteAdmissao) {
                            // Buscar folha de ponto do mês anterior
                            const mesAnterior = mes === 1 ? 12 : mes - 1;
                            const anoAnterior = mes === 1 ? ano - 1 : ano;
                            
                            const { data: folhaAnterior } = await supabase
                                .from('folhas_ponto')
                                .select('*')
                                .eq('funcionario_id', funcionario.id)
                                .eq('mes', mesAnterior)
                                .eq('ano', anoAnterior)
                                .maybeSingle();
                            
                            if (folhaAnterior) {
                                folhaPontoMesAnterior = folhaAnterior;
                            }
                        }
                    }
                    
                    // Buscar FOLHA CALCULADA do MÊS ANTERIOR (para buscar complemento de salário)
                    const mesAnteriorCalc = mes === 1 ? 12 : mes - 1;
                    const anoAnteriorCalc = mes === 1 ? ano - 1 : ano;
                    
                    
                    const { data: folhaCalculadaAnterior, error: erroFolhaAnterior } = await supabase
                        .from('folha_calculada')
                        .select('complemento_salario')
                        .eq('funcionario_id', funcionario.id)
                        .eq('mes', mesAnteriorCalc)
                        .eq('ano', anoAnteriorCalc)
                        .maybeSingle();
                    
                    
                    // Se houver complemento no mês anterior, adicionar aos eventos como desconto
                    if (folhaCalculadaAnterior && folhaCalculadaAnterior.complemento_salario > 0) {
                        
                        // Adicionar automaticamente como evento excepcional
                        if (!eventosExcepcionais[funcionario.id]) {
                            eventosExcepcionais[funcionario.id] = [];
                        }
                        
                        // Verificar se já não foi adicionado
                        const jaExiste = eventosExcepcionais[funcionario.id].some(e => 
                            e.descricao === 'Estouro do Mês Anterior'
                        );
                        
                        if (!jaExiste) {
                            eventosExcepcionais[funcionario.id].push({
                                descricao: 'Estouro do Mês Anterior',
                                valor: folhaCalculadaAnterior.complemento_salario,
                                tipo: 'desconto'
                            });
                        }
                    }

                    // Buscar FOLHA DE PONTO do PRÓXIMO MÊS (para VT e VA antecipado)
                    // Se não existir folha de ponto do próximo mês, usar ESCALA_MENSAL como fallback (dias programados).
                    const proximoMes = mes === 12 ? 1 : mes + 1;
                    const proximoAno = mes === 12 ? ano + 1 : ano;
                    
                    let folhaPontoProximoMes: any = null;
                    
                    const { data: folhaPontoProximoMesDB } = await supabase
                        .from('folhas_ponto')
                        .select('dados_dias')
                        .eq('funcionario_id', funcionario.id)
                        .eq('mes', proximoMes)
                        .eq('ano', proximoAno)
                        .maybeSingle();

                    if (folhaPontoProximoMesDB?.dados_dias) {
                        folhaPontoProximoMes = folhaPontoProximoMesDB;
                    } else {
                        // ✅ Fallback: usar a escala mensal do próximo mês (quando a folha de ponto ainda não foi gerada)
                        const { data: escalaProximoMes } = await supabase
                            .from('escala_mensal')
                            .select('dias_trabalhados')
                            .eq('funcionario_id', funcionario.id)
                            .eq('mes', proximoMes)
                            .eq('ano', proximoAno)
                            .maybeSingle();

                        if (escalaProximoMes?.dias_trabalhados) {
                            const dias = typeof escalaProximoMes.dias_trabalhados === 'string'
                                ? JSON.parse(escalaProximoMes.dias_trabalhados)
                                : escalaProximoMes.dias_trabalhados;

                            // Padronizar no formato esperado pelo calcularFolhaPagamento (dados_dias)
                            folhaPontoProximoMes = { dados_dias: dias };
                        }
                    }

                    if (!folhaPontoProximoMes) {
                    }

                    // Buscar folhas do semestre (para cálculo de PLR com desconto por faltas)
                    let folhasPontoSemestre = null;
                    if (mes === 3 || mes === 8 || mes === 9) {
                        let folhasParaBuscar: Array<{meses: number[], ano: number}> = [];
                        
                        if (mes === 8) {
                            // 1ª parcela (agosto): janeiro a junho do ano atual
                            folhasParaBuscar.push({ meses: [1, 2, 3, 4, 5, 6], ano: ano });
                        } else if (mes === 3) {
                            // 2ª parcela (março): julho a dezembro do ano anterior
                            folhasParaBuscar.push({ meses: [7, 8, 9, 10, 11, 12], ano: ano - 1 });
                        } else if (mes === 9) {
                            // Setembro: buscar AMBOS os semestres para verificar desconto
                            // Semestre 1 (jan-jun do ano atual) - para PLR de agosto
                            folhasParaBuscar.push({ meses: [1, 2, 3, 4, 5, 6], ano: ano });
                            // Semestre 2 (jul-dez do ano anterior) - para PLR de março
                            folhasParaBuscar.push({ meses: [7, 8, 9, 10, 11, 12], ano: ano - 1 });
                        }
                        
                        // Buscar todas as folhas necessárias
                        const todasFolhas: any[] = [];
                        for (const periodo of folhasParaBuscar) {
                            const { data: folhasSemestre } = await supabase
                                .from('folhas_ponto')
                                .select('mes, ano, total_faltas_justificadas, total_faltas_injustificadas')
                                .eq('funcionario_id', funcionario.id)
                                .eq('ano', periodo.ano)
                                .in('mes', periodo.meses);
                            
                            if (folhasSemestre && folhasSemestre.length > 0) {
                                todasFolhas.push(...folhasSemestre);
                            }
                        }
                        
                        if (todasFolhas.length > 0) {
                            folhasPontoSemestre = todasFolhas;
                        } else {
                        }
                    }

                    // Calcular folha
                    // ⭐ BUSCAR SALÁRIO DO FUNCIONÁRIO PRIMEIRO, DEPOIS DO CARGO
                    // Prioridade: 1) Salário individual do funcionário, 2) Salário do cargo
                    const cargoId = folhaPonto.funcionario.cargo_id || folhaPonto.funcionario.cargo?.id;
                    const salarioFallback = folhaPonto.funcionario.cargo?.salario_base || 0;
                    
                    // Tentar buscar salário individual do funcionário primeiro
                    const salarioFuncionario = await getSalarioVigente(funcionario.id, ano, mes, 0);
                    
                    // Se não tem salário individual (retornou 0), buscar do cargo
                    const salarioBase = salarioFuncionario > 0
                        ? salarioFuncionario
                        : (cargoId ? await getSalarioCargoVigente(cargoId, ano, mes, salarioFallback) : salarioFallback);
                    
                    // Jornada mensal padrão é sempre 220h para cálculo do valor/hora
                    const jornadaMensal = 220;

                    // Extrair descontos excepcionais dos eventos
                    const eventos = eventosExcepcionais[funcionario.id] || [];
                    const eventoRondas = eventos.find(e => 
                        e.tipo === 'desconto' && 
                        (e.descricao.toLowerCase().includes('ronda') || e.descricao.toLowerCase().includes('rondas'))
                    );
                    const descontoRondas = eventoRondas ? eventoRondas.valor : 0;
                    
                    const eventoAvaria = eventos.find(e => 
                        e.tipo === 'desconto' && (e as any).isAvariaUtilitario === true
                    );
                    const descontoAvaria = eventoAvaria ? eventoAvaria.valor : 0;

                    // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE PROVENTOS (para base INSS/IRRF/FGTS)
                    const eventosProventos = eventos
                        .filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR'))
                        .reduce((sum, e) => sum + e.valor, 0);

                    // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE BENEFÍCIOS (para controle de duplicação)
                    const eventosBeneficios = eventos
                        .filter(e => e.tipo === 'beneficio')
                        .reduce((sum, e) => sum + e.valor, 0);

                    const calc = calcularFolhaPagamento(
                        folhaPonto,
                        folhaPonto.funcionario,
                        parametroAtivo,
                        salarioBase,
                        jornadaMensal,
                        folhaPontoMesAnterior,
                        folhaPontoProximoMes, // Passar folha de ponto do mês seguinte para VT/VA
                        folhasPontoSemestre || undefined, // Passar folhas do semestre para cálculo de PLR
                        descontoRondas, // Passar desconto de rondas para cálculo da base INSS
                        descontoAvaria, // Passar desconto de avaria para cálculo da base INSS
                        eventosProventos, // ⭐ PASSAR EVENTOS EXCEPCIONAIS DE PROVENTOS
                        eventos // ⭐ PASSAR LISTA COMPLETA DE EVENTOS (para adiantamento de salário etc.)
                    );



                    const folhaParaAdicionar = {
                        funcionario: folhaPonto.funcionario,
                        resultado: calc,
                        dadosFolha: folhaPonto,
                        escalaMensalProximoMes: folhaPontoProximoMes,
                        empresa: folhaPonto.empresa,
                        posto_trabalho: folhaPonto.posto_trabalho
                    };



                    folhasCalculadas.push(folhaParaAdicionar);

                } catch (error) {
                }
            }

            setTodasFolhas(folhasCalculadas);
            if (folhasCalculadas.length > 0) {
                setActiveTab(folhasCalculadas[0].funcionario.id);
            }

            showToast(`${folhasCalculadas.length} folha(s) calculada(s) com sucesso!`, 'success');

        } catch (error) {
            showToast('Erro ao calcular folhas de pagamento', 'error');
        } finally {
            setLoading(false);
            setProgressoCalculo({ atual: 0, total: 0, nome: '' });
        }
    };

    const handleSalvarTodas = async () => {
        if (todasFolhas.length === 0) {
            showToast('Nenhuma folha para salvar', 'error');
            return;
        }

        const confirmar = window.confirm(
            `Deseja salvar ${todasFolhas.length} folha(s) de pagamento?\n\n` +
            `Folhas existentes serão atualizadas.`
        );

        if (!confirmar) return;

        setSubmitting(true);
        setProgressoSalvar({ atual: 0, total: todasFolhas.length, nome: 'Iniciando...' });
        let sucessos = 0;
        let erros = 0;

        try {
            let _idxSalvar = 0;
            for (const folha of todasFolhas) {
                _idxSalvar++;
                setProgressoSalvar({ atual: _idxSalvar, total: todasFolhas.length, nome: folha.funcionario?.nome_completo || '' });
                try {
                    // Incluir eventos excepcionais
                    const eventos = eventosExcepcionais[folha.funcionario.id] || [];
                    
                    // 🔍 MAPEAR EVENTOS DE RESCISÃO PARA CAMPOS ESPECÍFICOS
                    let eventoRescisao13 = 0;
                    let eventoRescisaoFerias = 0;
                    let eventoRescisao13Ferias = 0;
                    let eventoRescisaoPLR = 0;
                    let eventoRescisao13Vantagens = 0;
                    
                    // 🔍 MAPEAR NOVOS EVENTOS EXCEPCIONAIS PARA CAMPOS ESPECÍFICOS
                    let evento13Primeira = 0;
                    let evento13VantagensPrimeira = 0;
                    let evento13Segunda = 0;
                    let evento13VantagensSegunda = 0;
                    let eventoFolgaTrabalhada = 0;
                    
                    // 🔍 MAPEAR SERVIÇOS EXTERNOS E REEMBOLSOS
                    let eventoServicosExternosFolhas = 0;
                    let eventoServicosExternosRondas = 0;
                    let eventoReembolsosUber = 0;
                    let eventoSupervisaoPalmeiras = 0;
                    
                    // 🔍 MAPEAR EVENTOS EXCEPCIONAIS DE DESCONTOS
                    let eventoInss13 = 0;
                    let eventoInssFerias = 0; // ⭐ NOVO: INSS Férias
                    let eventoAdiantamento13Salario = 0;
                    let eventoAdiantamentoVantagens13 = 0;
                    let eventoAdiantamentoSalario = 0; // ⭐ NOVO: Adiantamento de Salário
                    
                    // 🔍 MAPEAR NOVOS EVENTOS DE 13º SALÁRIO INTEGRAL (PROVENTOS)
                    let evento13Integral = 0;
                    let eventoVantagens13 = 0;
                    
                    // 🔍 MAPEAR EVENTOS EXCEPCIONAIS DE BENEFÍCIOS
                    let eventoDescAjusteBeneficios = 0; // ⭐ NOVO: Desc. Ajuste dos Benefícios
                    
                    // Filtrar eventos de rescisão e mapear para campos específicos
                    const eventosNormais = eventos.filter(evento => {
                        if (evento.tipo === 'provento') {
                            if (evento.descricao === '13º Proporc. Rescisão') {
                                eventoRescisao13 += evento.valor;
                                return false; // Remove dos eventos normais
                            } else if (evento.descricao === 'Férias Proporc. Rescisão') {
                                eventoRescisaoFerias += evento.valor;
                                return false;
                            } else if (evento.descricao === '1/3 Férias proporc. Rescisão') {
                                eventoRescisao13Ferias += evento.valor;
                                return false;
                            } else if (evento.descricao === 'PLR Proporc. Rescisão') {
                                eventoRescisaoPLR += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Proporc. Vantagens Rescisão') {
                                eventoRescisao13Vantagens += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Salário 1ª Parcela') {
                                evento13Primeira += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Salário Vantagens 1ª Parcela') {
                                evento13VantagensPrimeira += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Salário 2ª Parcela') {
                                evento13Segunda += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Salário Vantagens 2ª Parcela') {
                                evento13VantagensSegunda += evento.valor;
                                return false;
                            } else if (evento.descricao === 'FT (Folga Trabalhada)') {
                                eventoFolgaTrabalhada += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Folhas de Pagamento' || evento.descricao === 'Serviços Externos (Folhas de Pagamento)') {
                                eventoServicosExternosFolhas += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Controle de Rondas Palmeiras' || evento.descricao === 'Serviços Externos (Controle de Rondas)') {
                                eventoServicosExternosRondas += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Supervisão Palmeiras' || evento.descricao === 'Supervisão (Palmeiras)') {
                                eventoSupervisaoPalmeiras += evento.valor;
                                return false;
                            } else if (evento.descricao === '13º Salário' || evento.descricao === '13º Salário Integral') {
                                evento13Integral += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Vantagens 13º') {
                                eventoVantagens13 += evento.valor;
                                return false;
                            }
                        } else if (evento.tipo === 'beneficio') {
                            if (evento.descricao === 'Reembolsos' || evento.descricao === 'Reembolsos (Uber)') {
                                eventoReembolsosUber += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Desc. Ajuste dos Benefícios') {
                                eventoDescAjusteBeneficios += Math.abs(evento.valor);
                                return false; // ⭐ Remove do array JSON
                            }
                        } else if (evento.tipo === 'desconto') {
                            // 🔍 MAPEAR EVENTOS EXCEPCIONAIS DE DESCONTOS
                            if (evento.descricao === 'INSS 13º') {
                                eventoInss13 += evento.valor;
                                return false;
                            } else if (evento.descricao === 'INSS Férias') {
                                eventoInssFerias += evento.valor;
                                return false; // ⭐ Remove do array JSON
                            } else if (evento.descricao === 'Adiantam. 13º Salário') {
                                eventoAdiantamento13Salario += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Adiantam. Vantagens 13º') {
                                eventoAdiantamentoVantagens13 += evento.valor;
                                return false;
                            } else if (evento.descricao === 'Adiantam. de Salário') {
                                eventoAdiantamentoSalario += evento.valor;
                                return false; // ⭐ CORREÇÃO: Remove do array JSON
                            }
                        }
                        return true; // Manter outros eventos
                    });
                    
                    // Identificar desconto de rondas não realizadas nos eventos (DESCONTO DE SALÁRIO)
                    const descontoRondas = eventos
                        .filter(e => e.tipo === 'desconto' && ((e as any).isRondasNaoRealizadas === true || e.descricao.toLowerCase().includes('ronda')))
                        .reduce((sum, e) => sum + e.valor, 0);
                    
                    // Identificar desconto de rondas não realizadas como BENEFÍCIO NEGATIVO
                    const descontoRondasBenef = eventos
                        .filter(e => e.tipo === 'beneficio' && (e as any).isRondasNaoRealizadasBenef === true)
                        .reduce((sum, e) => sum + Math.abs(e.valor), 0); // Usar valor absoluto pois benefício é negativo
                    
                    // Identificar desconto de avaria de utilitário nos eventos
                    const descontoAvariaUtilitario = eventos
                        .filter(e => e.tipo === 'desconto' && (e as any).isAvariaUtilitario === true)
                        .reduce((sum, e) => sum + e.valor, 0);
                    
                    // ⭐ CALCULAR TOTAIS USANDO AS 3 FUNÇÕES SIMPLES (com faixa VT do funcionário)
                    const totais = calcularTotaisComEventos(folha.funcionario.id, folha.resultado, eventos, undefined, folha.funcionario);
                    const complementoSalario = totais.complementoSalario;
                    const salarioLiquidoSemBeneficios = totais.salarioLiquido;
                    
                    // 🔍 DEBUG: Log dos valores calculados
                    if (descontoRondasBenef > 0 || descontoAvariaUtilitario > 0 || complementoSalario > 0) {
                    }
                    


                    // Garantir que empresa_id e posto_trabalho_id sejam salvos
                    // Prioridade: 1) funcionario, 2) folha de ponto, 3) buscar do cadastro
                    let empresaId = folha.funcionario.empresa_id || folha.empresa?.id || null;
                    let postoId = folha.funcionario.posto_trabalho_id || folha.posto_trabalho?.id || null;

                    // Se ainda estiver vazio, buscar diretamente do cadastro do funcionário
                    if (!empresaId || !postoId) {
                        const { data: funcData } = await supabase
                            .from('funcionarios')
                            .select('empresa_id, posto_trabalho_id')
                            .eq('id', folha.funcionario.id)
                            .single();
                        
                        if (funcData) {
                            empresaId = empresaId || funcData.empresa_id;
                            postoId = postoId || funcData.posto_trabalho_id;
                        }
                    }

                    const folhaParaSalvar = normalizarFolhaCalculada({
                        funcionario_id: folha.funcionario.id,
                        nome_funcionario: folha.funcionario.nome_completo, // ✅ Nome para facilitar consultas
                        mes,
                        ano,
                        empresa_id: empresaId,
                        posto_trabalho_id: postoId,
                        salario_base: folha.resultado.salario_base,
                        horas_extras: folha.resultado.horas_extras_50 + folha.resultado.horas_extras_100,
                        horas_extras_50: folha.resultado.horas_extras_50,
                        horas_extras_100: folha.resultado.horas_extras_100,
                        adicional_noturno: folha.resultado.adicional_noturno,
                        intrajornada_50: folha.resultado.intrajornada_50,
                        intrajornada_100: folha.resultado.intrajornada_100,
                        dsr_horas_extras: folha.resultado.dsr_horas_extras,
                        dsr_adicional_noturno: folha.resultado.dsr_adicional_noturno,
                        adicional_insalubridade: folha.resultado.adicional_insalubridade,
                        adicional_acumulo_funcao: folha.resultado.adicional_acumulo_funcao,
                        complemento_salario: complementoSalario, // normalizado abaixo pela soma dos itens da Folha Calculada
                        vale_transporte: folha.resultado.vale_transporte,
                        vale_transporte_mes_anterior: folha.resultado.vale_transporte_mes_anterior,
                        vale_transporte_mes_atual: folha.resultado.vale_transporte_mes_atual,
                        vale_alimentacao: folha.resultado.vale_alimentacao,
                        vale_alimentacao_mes_anterior: folha.resultado.vale_alimentacao_mes_anterior,
                        vale_alimentacao_mes_atual: folha.resultado.vale_alimentacao_mes_atual,
                        cesta_basica: folha.resultado.cesta_basica,
                        plr: folha.resultado.plr,
                        premio_permanencia: folha.resultado.premio_permanencia,
                        // ⭐ FT é benefício diária (R$ por função). NÃO gera VT/VA suplementares.
                        folgas_trabalhadas_vt: 0,
                        folgas_trabalhadas_va: 0,
                        valor_vt_folgas_trabalhadas: 0,
                        valor_va_folgas_trabalhadas: 0,
                        // ⭐ Dias de referência para recibos de benefícios
                        dias_vt_mes_anterior: (() => {
                            const dadosDias = folha.dadosFolha?.dados_dias;
                            if (!dadosDias) return 0;
                            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                        })(),
                        dias_vt_mes_atual: folha.escalaMensalProximoMes?.diasVT || 0,
                        dias_va_mes_anterior: (() => {
                            const dadosDias = folha.dadosFolha?.dados_dias;
                            if (!dadosDias) return 0;
                            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                            return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                        })(),
                        dias_va_mes_atual: folha.escalaMensalProximoMes?.diasVA || 0,
                        desconto_inss: folha.resultado.desconto_inss,
                        desconto_irrf: folha.resultado.desconto_irrf,
                        desconto_vt: folha.resultado.desconto_vt,
                        desconto_vt_faltas: folha.resultado.desconto_vt_faltas,
                        desconto_va_faltas: folha.resultado.desconto_va_faltas,
                        desconto_seguro_vida: folha.resultado.desconto_seguro_vida,
                        desconto_convenio_odonto: folha.resultado.desconto_convenio_odonto,
                        desconto_contribuicao_assistencial: folha.resultado.desconto_contribuicao_assistencial,
                        desconto_atrasos: folha.resultado.desconto_atrasos,
                        desconto_faltas: folha.resultado.desconto_faltas,
                        desconto_plr: folha.resultado.desconto_plr,
                        desconto_pensao_alimenticia: folha.resultado.desconto_pensao_alimenticia,
                        desconto_rondas_nao_realizadas: descontoRondas,
                        desc_rondas_nao_realizadas_benef: descontoRondasBenef, // ⭐ NOVO: Rondas como benefício
                        desconto_adiantamento_quinzenal: folha.resultado.desconto_adiantamento_quinzenal,
                        desconto_complemento_anterior: folha.resultado.desconto_complemento_anterior,
                        desconto_adiantamento_salario: eventoAdiantamentoSalario, // ⭐ Usar valor do evento excepcional
                        desc_avaria_utilitario: descontoAvariaUtilitario,
                        total_proventos: totais.totalProventos,
                        total_descontos: totais.totalDescontos,
                        total_beneficios: totais.totalBeneficios,
                        salario_liquido: totais.salarioLiquido,
                        base_inss: folha.resultado.base_inss,
                        base_irrf: folha.resultado.base_irrf,
                        base_fgts: folha.resultado.base_fgts,
                        fgts: folha.resultado.fgts,
                        inss_patronal: folha.resultado.inss_patronal,
                        eventos_excepcionais: eventosNormais, // ⭐ CORREÇÃO: Salvar apenas eventos que não têm coluna específica
                        
                        // === EVENTOS EXCEPCIONAIS (PROVENTOS) ===
                        // ⚠️ CORREÇÃO: Usar apenas o valor do evento excepcional, sem somar com dadosFolha
                        // porque o valor já foi restaurado do banco para eventosExcepcionais
                        decimo_terceiro_proporcional_rescisao: eventoRescisao13,
                        ferias_proporcionais_rescisao: eventoRescisaoFerias,
                        um_terco_ferias_proporcional_rescisao: eventoRescisao13Ferias,
                        plr_proporcional_rescisao: eventoRescisaoPLR,
                        decimo_terceiro_vantagens_rescisao: eventoRescisao13Vantagens,
                        
                        // === NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
                        decimo_terceiro_primeira_parcela: evento13Primeira,
                        decimo_terceiro_vantagens_primeira_parcela: evento13VantagensPrimeira,
                        decimo_terceiro_segunda_parcela: evento13Segunda,
                        decimo_terceiro_vantagens_segunda_parcela: evento13VantagensSegunda,
                        folga_trabalhada: eventoFolgaTrabalhada || folha.resultado.folga_trabalhada || 0,
                        
                        // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
                        servicos_externos_folhas_pagamento: eventoServicosExternosFolhas,
                        servicos_externos_controle_rondas: eventoServicosExternosRondas,
                        reembolsos_uber: eventoReembolsosUber,
                        supervisao_palmeiras: eventoSupervisaoPalmeiras,
                        
                        // === EVENTOS EXCEPCIONAIS (DESCONTOS) ===
                        // ⚠️ CORREÇÃO: Usar apenas o valor do evento excepcional, sem somar com dadosFolha
                        // porque o valor já foi restaurado do banco para eventosExcepcionais
                        inss_13: eventoInss13,
                        inss_ferias: eventoInssFerias, // ⭐ NOVO: INSS Férias
                        adiantamento_13_salario: eventoAdiantamento13Salario,
                        adiantamento_vantagens_13: eventoAdiantamentoVantagens13,
                        
                        // === EVENTOS EXCEPCIONAIS (BENEFÍCIOS) ===
                        desc_ajuste_beneficios: Math.abs(eventoDescAjusteBeneficios), // ⭐ NOVO: Desc. Ajuste dos Benefícios
                        
                        // === NOVOS EVENTOS DE 13º SALÁRIO INTEGRAL (PROVENTOS) ===
                        decimo_terceiro_integral: evento13Integral,
                        vantagens_13: eventoVantagens13,
                        
                        // === OBSERVAÇÕES ===
                        observacoes: observacoes[folha.funcionario.id] || ''
                    });

                    // 🔍 DEBUG: Log dos dados ANTES de salvar

                    // UPSERT: Atualiza se existir, insere se não existir
                    const { data: savedData, error } = await supabase
                        .from('folha_calculada')
                        .upsert(folhaParaSalvar, {
                            onConflict: 'funcionario_id,mes,ano'
                        })
                        .select();
                    
                    // 🔍 DEBUG: Log do resultado APÓS salvar
                    
                    if (error) {
                        throw error;
                    }

                    // LOG: Mostrar o que foi salvo no banco
                    if (savedData && savedData.length > 0) {
                    }

                    sucessos++;
                } catch (error) {
                    erros++;
                }
            }

            if (erros > 0) {
                showToast(`Processo concluído com erros: ${sucessos} salvas, ${erros} erros`, 'error');
            } else {
                showToast(`${sucessos} folha(s) salva(s) com sucesso!`, 'success');
            }

        } catch (error) {
            showToast('Erro inesperado ao salvar folhas', 'error');
        } finally {
            setSubmitting(false);
            setProgressoSalvar({ atual: 0, total: 0, nome: '' });
        }
    };

    const handleSalvarIndividual = async (funcionarioId: string) => {
        
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        
        if (!folha) {
            showToast('Folha não encontrada', 'error');
            return;
        }


        const confirmar = window.confirm(
            `Deseja salvar a folha de pagamento de ${folha.funcionario.nome_completo}?\n\n` +
            `Período: ${meses[mes - 1]}/${ano}\n` +
            `Salário Líquido: ${formatarMoeda(folha.resultado.salario_liquido)}`
        );

        if (!confirmar) {
            return;
        }

        setSubmitting(true);

        try {
            // Verificar permissões usando o hook useAuth
            if (!isAdmin) {
                throw new Error('Apenas administradores podem salvar folhas de pagamento');
            }
            
            // Incluir eventos excepcionais
            const eventos = eventosExcepcionais[funcionarioId] || [];
            
            // 🔍 MAPEAR EVENTOS DE RESCISÃO PARA CAMPOS ESPECÍFICOS
            let eventoRescisao13 = 0;
            let eventoRescisaoFerias = 0;
            let eventoRescisao13Ferias = 0;
            let eventoRescisaoPLR = 0;
            let eventoRescisao13Vantagens = 0;
            
            // 🔍 MAPEAR NOVOS EVENTOS EXCEPCIONAIS PARA CAMPOS ESPECÍFICOS
            let evento13Primeira = 0;
            let evento13VantagensPrimeira = 0;
            let evento13Segunda = 0;
            let evento13VantagensSegunda = 0;
            let eventoFolgaTrabalhada = 0;
            
            // 🔍 MAPEAR SERVIÇOS EXTERNOS E REEMBOLSOS
            let eventoServicosExternosFolhas = 0;
            let eventoServicosExternosRondas = 0;
            let eventoReembolsosUber = 0;
            let eventoSupervisaoPalmeiras = 0;
            
            // 🔍 MAPEAR EVENTOS EXCEPCIONAIS DE DESCONTOS
            let eventoInss13 = 0;
            let eventoAdiantamento13Salario = 0;
            let eventoAdiantamentoVantagens13 = 0;
            let eventoAdiantamentoSalario = 0; // ⭐ NOVO: Adiantamento de Salário
            
            // 🔍 MAPEAR NOVOS EVENTOS DE 13º SALÁRIO INTEGRAL (PROVENTOS)
            let evento13Integral = 0;
            let eventoVantagens13 = 0;
            
            // Filtrar eventos de rescisão e mapear para campos específicos
            const eventosNormais = eventos.filter(evento => {
                if (evento.tipo === 'provento') {
                    if (evento.descricao === '13º Proporc. Rescisão') {
                        eventoRescisao13 += evento.valor;
                        return false; // Remove dos eventos normais
                    } else if (evento.descricao === 'Férias Proporc. Rescisão') {
                        eventoRescisaoFerias += evento.valor;
                        return false;
                    } else if (evento.descricao === '1/3 Férias proporc. Rescisão') {
                        eventoRescisao13Ferias += evento.valor;
                        return false;
                    } else if (evento.descricao === 'PLR Proporc. Rescisão') {
                        eventoRescisaoPLR += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Proporc. Vantagens Rescisão') {
                        eventoRescisao13Vantagens += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Salário 1ª Parcela') {
                        evento13Primeira += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Salário Vantagens 1ª Parcela') {
                        evento13VantagensPrimeira += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Salário 2ª Parcela') {
                        evento13Segunda += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Salário Vantagens 2ª Parcela') {
                        evento13VantagensSegunda += evento.valor;
                        return false;
                    } else if (evento.descricao === 'FT (Folga Trabalhada)') {
                        eventoFolgaTrabalhada += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Folhas de Pagamento' || evento.descricao === 'Serviços Externos (Folhas de Pagamento)') {
                        eventoServicosExternosFolhas += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Controle de Rondas Palmeiras' || evento.descricao === 'Serviços Externos (Controle de Rondas)') {
                        eventoServicosExternosRondas += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Supervisão Palmeiras' || evento.descricao === 'Supervisão (Palmeiras)') {
                        eventoSupervisaoPalmeiras += evento.valor;
                        return false;
                    } else if (evento.descricao === '13º Salário' || evento.descricao === '13º Salário Integral') {
                        evento13Integral += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Vantagens 13º') {
                        eventoVantagens13 += evento.valor;
                        return false;
                    }
                } else if (evento.tipo === 'beneficio') {
                    if (evento.descricao === 'Reembolsos' || evento.descricao === 'Reembolsos (Uber)') {
                        eventoReembolsosUber += evento.valor;
                        return false;
                    }
                } else if (evento.tipo === 'desconto') {
                    // 🔍 MAPEAR EVENTOS EXCEPCIONAIS DE DESCONTOS
                    if (evento.descricao === 'INSS 13º') {
                        eventoInss13 += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Adiantam. 13º Salário') {
                        eventoAdiantamento13Salario += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Adiantam. Vantagens 13º') {
                        eventoAdiantamentoVantagens13 += evento.valor;
                        return false;
                    } else if (evento.descricao === 'Adiantam. de Salário') {
                        eventoAdiantamentoSalario += evento.valor;
                        // NÃO usar return false - manter no array para exibir no holerite
                    }
                }
                return true; // Manter outros eventos
            });
            
            
            // Identificar desconto de rondas não realizadas nos eventos (DESCONTO DE SALÁRIO)
            const eventoRondas = eventos.find(e => 
                e.tipo === 'desconto' && 
                (e.descricao.toLowerCase().includes('ronda') || e.descricao.toLowerCase().includes('rondas'))
            );
            const descontoRondas = eventoRondas ? eventoRondas.valor : 0;
            
            // Identificar desconto de rondas não realizadas como BENEFÍCIO NEGATIVO
            const descontoRondasBenef = eventos
                .filter(e => e.tipo === 'beneficio' && (e as any).isRondasNaoRealizadasBenef === true)
                .reduce((sum, e) => sum + Math.abs(e.valor), 0); // Usar valor absoluto pois benefício é negativo
            
            // Identificar desconto de avaria de utilitário nos eventos
            const descontoAvariaUtilitario = eventos
                .filter(e => e.tipo === 'desconto' && (e as any).isAvariaUtilitario === true)
                .reduce((sum, e) => sum + e.valor, 0);
            
            // Calcular complemento de salário (se salário líquido sem benefícios for negativo)
            const proventosEventos = eventos.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((sum, e) => sum + e.valor, 0);
            const descontosEventos = eventos.filter(e => e.tipo === 'desconto').reduce((sum, e) => sum + e.valor, 0);
            const salarioLiquidoSemBeneficios = (folha.resultado.total_proventos + proventosEventos) - 
                                                (folha.resultado.total_descontos + descontosEventos - 
                                                 (folha.resultado.desconto_vt_faltas || 0) - 
                                                 (folha.resultado.desconto_va_faltas || 0));
            const complementoSalario = salarioLiquidoSemBeneficios < 0 ? Math.abs(salarioLiquidoSemBeneficios) : 0;
            
            // ⭐ CALCULAR TOTAIS USANDO AS 3 FUNÇÕES SIMPLES (com faixa VT do funcionário)
            const totais = calcularTotaisComEventos(folha.funcionario.id, folha.resultado, eventos, undefined, folha.funcionario);
            
            // 🔍 DEBUG: Verificar valores calculados
            
            const folhaParaSalvar = normalizarFolhaCalculada({
                funcionario_id: folha.funcionario.id,
                nome_funcionario: folha.funcionario.nome_completo, // ✅ Nome para facilitar consultas
                mes,
                ano,
                empresa_id: folha.funcionario.empresa_id || folha.empresa?.id || null,
                posto_trabalho_id: folha.funcionario.posto_trabalho_id || folha.posto_trabalho?.id || null,
                salario_base: folha.resultado.salario_base,
                horas_extras: folha.resultado.horas_extras_50 + folha.resultado.horas_extras_100,
                horas_extras_50: folha.resultado.horas_extras_50,
                horas_extras_100: folha.resultado.horas_extras_100,
                adicional_noturno: folha.resultado.adicional_noturno,
                intrajornada_50: folha.resultado.intrajornada_50,
                intrajornada_100: folha.resultado.intrajornada_100,
                dsr_horas_extras: folha.resultado.dsr_horas_extras,
                dsr_adicional_noturno: folha.resultado.dsr_adicional_noturno,
                adicional_insalubridade: folha.resultado.adicional_insalubridade,
                adicional_acumulo_funcao: folha.resultado.adicional_acumulo_funcao,
                salario_familia: folha.resultado.salario_familia,
                complemento_salario: complementoSalario, // normalizado abaixo pela soma dos itens da Folha Calculada
                vale_transporte: folha.resultado.vale_transporte,
                vale_transporte_mes_anterior: folha.resultado.vale_transporte_mes_anterior,
                vale_transporte_mes_atual: folha.resultado.vale_transporte_mes_atual,
                vale_alimentacao: folha.resultado.vale_alimentacao,
                vale_alimentacao_mes_anterior: folha.resultado.vale_alimentacao_mes_anterior,
                vale_alimentacao_mes_atual: folha.resultado.vale_alimentacao_mes_atual,
                cesta_basica: folha.resultado.cesta_basica,
                plr: folha.resultado.plr,
                premio_permanencia: folha.resultado.premio_permanencia,
                // ⭐ FT é benefício diária (R$ por função). NÃO gera VT/VA suplementares.
                folgas_trabalhadas_vt: 0,
                folgas_trabalhadas_va: 0,
                valor_vt_folgas_trabalhadas: 0,
                valor_va_folgas_trabalhadas: 0,
                // ⭐ Dias de referência para recibos de benefícios
                dias_vt_mes_anterior: (() => {
                    const dadosDias = folha.dadosFolha?.dados_dias;
                    if (!dadosDias) return 0;
                    const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                    return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                })(),
                dias_vt_mes_atual: folha.escalaMensalProximoMes?.diasVT || 0,
                dias_va_mes_anterior: (() => {
                    const dadosDias = folha.dadosFolha?.dados_dias;
                    if (!dadosDias) return 0;
                    const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                    return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                })(),
                dias_va_mes_atual: folha.escalaMensalProximoMes?.diasVA || 0,
                desconto_inss: folha.resultado.desconto_inss,
                desconto_irrf: folha.resultado.desconto_irrf,
                desconto_vt: folha.resultado.desconto_vt,
                desconto_vt_faltas: folha.resultado.desconto_vt_faltas,
                desconto_va_faltas: folha.resultado.desconto_va_faltas,
                desconto_seguro_vida: folha.resultado.desconto_seguro_vida,
                desconto_convenio_odonto: folha.resultado.desconto_convenio_odonto,
                desconto_contribuicao_assistencial: folha.resultado.desconto_contribuicao_assistencial,
                desconto_atrasos: folha.resultado.desconto_atrasos,
                desconto_faltas: folha.resultado.desconto_faltas,
                desconto_dsr_faltas: folha.resultado.desconto_dsr_faltas || 0, // ⭐ DSR s/ Faltas (Limpeza/Zeladoria)
                dias_dsr_faltas: folha.resultado.dias_dsr_faltas || 0, // ⭐ Semanas com falta
                desconto_plr: folha.resultado.desconto_plr,
                desconto_pensao_alimenticia: folha.resultado.desconto_pensao_alimenticia,
                desconto_rondas_nao_realizadas: descontoRondas,
                desc_rondas_nao_realizadas_benef: descontoRondasBenef, // ⭐ NOVO: Rondas como benefício
                desconto_adiantamento_quinzenal: folha.resultado.desconto_adiantamento_quinzenal,
                desconto_complemento_anterior: folha.resultado.desconto_complemento_anterior,
                desconto_adiantamento_salario: eventoAdiantamentoSalario, // ⭐ Usar valor do evento excepcional
                desc_avaria_utilitario: descontoAvariaUtilitario, // ⭐ Avaria de utilitário
                total_proventos: totais.totalProventos,
                total_descontos: totais.totalDescontos,
                total_beneficios: totais.totalBeneficios,
                salario_liquido: totais.salarioLiquido,
                base_inss: folha.resultado.base_inss,
                base_irrf: folha.resultado.base_irrf,
                base_fgts: folha.resultado.base_fgts,
                fgts: folha.resultado.fgts,
                inss_patronal: folha.resultado.inss_patronal,
                eventos_excepcionais: eventos, // ⭐ CORREÇÃO: Salvar TODOS os eventos, não apenas os normais
                
                // === EVENTOS EXCEPCIONAIS (PROVENTOS) ===
                // ⚠️ CORREÇÃO: Usar apenas o valor do evento excepcional, sem somar com dadosFolha
                // porque o valor já foi restaurado do banco para eventosExcepcionais
                decimo_terceiro_proporcional_rescisao: eventoRescisao13,
                ferias_proporcionais_rescisao: eventoRescisaoFerias,
                um_terco_ferias_proporcional_rescisao: eventoRescisao13Ferias,
                plr_proporcional_rescisao: eventoRescisaoPLR,
                decimo_terceiro_vantagens_rescisao: eventoRescisao13Vantagens,
                
                // === NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
                decimo_terceiro_primeira_parcela: evento13Primeira,
                decimo_terceiro_vantagens_primeira_parcela: evento13VantagensPrimeira,
                decimo_terceiro_segunda_parcela: evento13Segunda,
                decimo_terceiro_vantagens_segunda_parcela: evento13VantagensSegunda,
                folga_trabalhada: eventoFolgaTrabalhada || folha.resultado.folga_trabalhada || 0,
                
                // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
                servicos_externos_folhas_pagamento: eventoServicosExternosFolhas,
                servicos_externos_controle_rondas: eventoServicosExternosRondas,
                reembolsos_uber: eventoReembolsosUber,
                supervisao_palmeiras: eventoSupervisaoPalmeiras,
                
                // === EVENTOS EXCEPCIONAIS (DESCONTOS) ===
                // ⚠️ CORREÇÃO: Usar apenas o valor do evento excepcional, sem somar com dadosFolha
                // porque o valor já foi restaurado do banco para eventosExcepcionais
                inss_13: eventoInss13,
                adiantamento_13_salario: eventoAdiantamento13Salario,
                adiantamento_vantagens_13: eventoAdiantamentoVantagens13,
                
                // === NOVOS EVENTOS DE 13º SALÁRIO INTEGRAL (PROVENTOS) ===
                decimo_terceiro_integral: evento13Integral,
                vantagens_13: eventoVantagens13,
                
                // === OBSERVAÇÕES ===
                observacoes: observacoes[funcionarioId] || ''
            });


            // UPSERT: Atualiza se existir, insere se não existir
            // Chave única: funcionario_id + mes + ano
            const { data, error } = await supabase
                .from('folha_calculada')
                .upsert(folhaParaSalvar, {
                    onConflict: 'funcionario_id,mes,ano'
                })
                .select();

            if (error) {
                
                // Erro mais específico baseado no código
                let mensagemErro = 'Erro ao salvar folha de pagamento';
                if (error.code === '42501') {
                    mensagemErro = 'Sem permissão para salvar. Verifique se você é administrador.';
                } else if (error.code === '23505') {
                    mensagemErro = 'Conflito de dados. Tente novamente.';
                } else if (error.message.includes('permission')) {
                    mensagemErro = 'Sem permissão para salvar dados.';
                }
                
                throw new Error(mensagemErro);
            }
            
            showToast('💾 Folha de pagamento salva com sucesso!', 'success');

            // Recarregar folhas salvas mantendo o foco no funcionário atual
            await carregarFolhasSalvas(true);

        } catch (error: any) {
            
            // Mostrar mensagem de erro mais específica
            const mensagem = error.message || 'Erro desconhecido ao salvar folha de pagamento';
            showToast(`❌ ${mensagem}`, 'error');
            

        } finally {
            setSubmitting(false);
        }
    };

    const handleExcluirIndividual = async (funcionarioId: string) => {
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        
        if (!folha) {
            showToast('Folha não encontrada', 'error');
            return;
        }

        const confirmar = window.confirm(
            `⚠️ ATENÇÃO: Deseja EXCLUIR a folha de pagamento de ${folha.funcionario.nome_completo}?\n\n` +
            `Período: ${meses[mes - 1]}/${ano}\n` +
            `Salário Líquido: ${formatarMoeda(folha.resultado.salario_liquido)}\n\n` +
            `Esta ação NÃO pode ser desfeita!`
        );

        if (!confirmar) return;

        setSubmitting(true);

        try {
            // Verificar se existe folha salva
            const { data: existing } = await supabase
                .from('folha_calculada')
                .select('id')
                .eq('funcionario_id', folha.funcionario.id)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();

            if (existing) {
                // Excluir do banco
                const { error } = await supabase
                    .from('folha_calculada')
                    .delete()
                    .eq('id', existing.id);

                if (error) {
                    throw error;
                }
                
                showToast(' Folha de pagamento excluída com sucesso!', 'success');
                
                // Recarregar folhas salvas
                await carregarFolhasSalvas();
            } else {
                showToast(' Esta folha ainda não foi salva no banco de dados.', 'info');
            }

            // Remover da lista local
            setTodasFolhas(prev => prev.filter(f => f.funcionario.id !== funcionarioId));
            
            // Se era a folha ativa, limpar
            if (activeTab === funcionarioId) {
                setActiveTab('');
            }

        } catch (error) {
            showToast('❌ Erro ao excluir folha de pagamento', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRecalcularIndividual = async (funcionarioId: string) => {
        
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        
        if (!folha) {
            showToast('Folha não encontrada', 'error');
            return;
        }

        if (!parametros || parametros.length === 0) {
            showToast('Parâmetros de cálculo não configurados', 'error');
            return;
        }

        setLoading(true);

        try {
            // ✅ CORREÇÃO: Buscar parâmetros do ANO da folha, não o "ativo" genérico
            const parametroAtivo = parametros.find(p => p.ano_vigencia === ano) 
                || parametros.find(p => p.ativo) 
                || parametros[0];

            // Buscar folha de ponto (apenas dados de horários)
            const { data: folhaPonto, error: errorFolha } = await supabase
                .from('folhas_ponto')
                .select(`
                    *,
                    funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
                    empresa:empresas(*),
                    posto_trabalho:postos_trabalho(*)
                `)
                .eq('funcionario_id', funcionarioId)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();

            if (errorFolha || !folhaPonto) {
                showToast('Folha de ponto não encontrada', 'error');
                setLoading(false);
                return;
            }

            // Buscar folha calculada (para eventos excepcionais salvos)
            const { data: folhaCalculadaSalva } = await supabase
                .from('folha_calculada')
                .select(`
                    funcionario_id,
                    mes,
                    ano,
                    total_proventos,
                    total_descontos,
                    total_beneficios,
                    salario_liquido,
                    eventos_excepcionais,
                    decimo_terceiro_proporcional_rescisao,
                    ferias_proporcionais_rescisao,
                    um_terco_ferias_proporcional_rescisao,
                    plr_proporcional_rescisao,
                    decimo_terceiro_vantagens_rescisao,
                    decimo_terceiro_primeira_parcela,
                    decimo_terceiro_vantagens_primeira_parcela,
                    decimo_terceiro_segunda_parcela,
                    decimo_terceiro_vantagens_segunda_parcela,
                    folga_trabalhada,
                    servicos_externos_folhas_pagamento,
                    servicos_externos_controle_rondas,
                    reembolsos_uber,
                    desc_ajuste_beneficios,
                    supervisao_palmeiras
                `)
                .eq('funcionario_id', funcionarioId)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();


            // ⭐ CARREGAR EVENTOS EXCEPCIONAIS DA TABELA SE NÃO HOUVER NO ESTADO
            let eventosParaUsar = eventosExcepcionais[funcionarioId] || [];
            
            if (eventosParaUsar.length === 0 && folhaCalculadaSalva) {
                
                const eventosDaTabela: EventoExcepcional[] = [];
                
                // Carregar eventos de rescisão (PROVENTOS)
                if (folhaCalculadaSalva.decimo_terceiro_proporcional_rescisao > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Proporc. Rescisão',
                        valor: folhaCalculadaSalva.decimo_terceiro_proporcional_rescisao,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.ferias_proporcionais_rescisao > 0) {
                    eventosDaTabela.push({
                        descricao: 'Férias Proporc. Rescisão',
                        valor: folhaCalculadaSalva.ferias_proporcionais_rescisao,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.um_terco_ferias_proporcional_rescisao > 0) {
                    eventosDaTabela.push({
                        descricao: '1/3 Férias proporc. Rescisão',
                        valor: folhaCalculadaSalva.um_terco_ferias_proporcional_rescisao,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.plr_proporcional_rescisao > 0) {
                    eventosDaTabela.push({
                        descricao: 'PLR Proporc. Rescisão',
                        valor: folhaCalculadaSalva.plr_proporcional_rescisao,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.decimo_terceiro_vantagens_rescisao > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Proporc. Vantagens Rescisão',
                        valor: folhaCalculadaSalva.decimo_terceiro_vantagens_rescisao,
                        tipo: 'provento'
                    });
                }
                
                // Carregar novos eventos de 13º salário (PROVENTOS)
                if (folhaCalculadaSalva.decimo_terceiro_primeira_parcela > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Salário 1ª Parcela',
                        valor: folhaCalculadaSalva.decimo_terceiro_primeira_parcela,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.decimo_terceiro_vantagens_primeira_parcela > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Salário Vantagens 1ª Parcela',
                        valor: folhaCalculadaSalva.decimo_terceiro_vantagens_primeira_parcela,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.decimo_terceiro_segunda_parcela > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Salário 2ª Parcela',
                        valor: folhaCalculadaSalva.decimo_terceiro_segunda_parcela,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.decimo_terceiro_vantagens_segunda_parcela > 0) {
                    eventosDaTabela.push({
                        descricao: '13º Salário Vantagens 2ª Parcela',
                        valor: folhaCalculadaSalva.decimo_terceiro_vantagens_segunda_parcela,
                        tipo: 'provento'
                    });
                }
                if (folhaCalculadaSalva.folga_trabalhada > 0) {
                    eventosDaTabela.push({
                        descricao: 'FT (Folga Trabalhada)',
                        valor: folhaCalculadaSalva.folga_trabalhada,
                        tipo: 'provento'
                    });
                }
                
                // Carregar reembolsos (BENEFÍCIOS)
                if (folhaCalculadaSalva.reembolsos_uber > 0) {
                    eventosDaTabela.push({
                        descricao: 'Reembolsos',
                        valor: folhaCalculadaSalva.reembolsos_uber,
                        tipo: 'beneficio'
                    });
                }

                // Carregar desconto de ajuste dos benefícios (BENEFÍCIOS - valor negativo no evento)
                const valorDescAjusteBeneficios = Math.abs(folhaCalculadaSalva.desc_ajuste_beneficios || 0);
                if (valorDescAjusteBeneficios > 0) {
                    eventosDaTabela.push({
                        descricao: 'Desc. Ajuste dos Benefícios',
                        valor: -valorDescAjusteBeneficios,
                        tipo: 'beneficio'
                    });
                }
                
                // Carregar supervisão palmeiras (PROVENTOS)
                if (folhaCalculadaSalva.supervisao_palmeiras > 0) {
                    eventosDaTabela.push({
                        descricao: 'Supervisão Palmeiras',
                        valor: folhaCalculadaSalva.supervisao_palmeiras,
                        tipo: 'provento'
                    });
                }
                
                if (eventosDaTabela.length > 0) {
                    eventosParaUsar = eventosDaTabela;
                    
                    // Atualizar o estado com os eventos carregados
                    setEventosExcepcionais(prev => ({
                        ...prev,
                        [funcionarioId]: eventosDaTabela
                    }));
                    
                }
            }

            // Buscar escala
            if (folhaPonto.funcionario?.cargo?.escala_id) {
                const { data: escalaData } = await supabase
                    .from('regras_escalas')
                    .select('id, codigo_escala, nome_escala')
                    .eq('id', folhaPonto.funcionario.cargo.escala_id)
                    .single();
                folhaPonto.funcionario.cargo.escala = escalaData || null;
            }

            // Buscar FOLHA CALCULADA do MÊS ANTERIOR (para buscar complemento de salário)
            const mesAnteriorCalc = mes === 1 ? 12 : mes - 1;
            const anoAnteriorCalc = mes === 1 ? ano - 1 : ano;
            
            
            const { data: folhaCalculadaAnterior, error: erroFolhaAnterior } = await supabase
                .from('folha_calculada')
                .select('complemento_salario')
                .eq('funcionario_id', funcionarioId)
                .eq('mes', mesAnteriorCalc)
                .eq('ano', anoAnteriorCalc)
                .maybeSingle();
            
            
            // Se houver complemento no mês anterior, adicionar aos eventos como desconto
            if (folhaCalculadaAnterior && folhaCalculadaAnterior.complemento_salario > 0) {
                
                // Adicionar automaticamente como evento excepcional
                setEventosExcepcionais(prev => {
                    const eventosAtuais = prev[funcionarioId] || [];
                    
                    // Verificar se já não foi adicionado
                    const jaExiste = eventosAtuais.some(e => 
                        e.descricao === 'Estouro do Mês Anterior'
                    );
                    
                    if (!jaExiste) {
                        return {
                            ...prev,
                            [funcionarioId]: [
                                ...eventosAtuais,
                                {
                                    descricao: 'Estouro do Mês Anterior',
                                    valor: folhaCalculadaAnterior.complemento_salario,
                                    tipo: 'desconto'
                                }
                            ]
                        };
                    }
                    return prev;
                });
            }
            
            // Buscar FOLHA DE PONTO do PRÓXIMO MÊS (para VT e VA antecipado)
            const proximoMes = mes === 12 ? 1 : mes + 1;
            const proximoAno = mes === 12 ? ano + 1 : ano;
            
            // ⭐ Usa folha de ponto do próximo mês; se não existir, faz fallback para escala_mensal
            const folhaPontoProximoMes = await getDadosDiasProximoMes(funcionarioId, mes, ano);


            // Recalcular
            // ⭐ USAR SALÁRIO VIGENTE DO CARGO NO HISTÓRICO (para a competência específica)
            const cargoId = folhaPonto.funcionario.cargo_id || folhaPonto.funcionario.cargo?.id;
            const salarioFallback = folhaPonto.funcionario.cargo?.salario_base || 0;
            const salarioBase = cargoId 
              ? await getSalarioCargoVigente(cargoId, ano, mes, salarioFallback)
              : salarioFallback;
            const jornadaMensal = 220;

            // Usar os eventos carregados (do estado ou da tabela)
            const eventos = eventosParaUsar;
            
            const eventoRondas = eventos.find(e => 
                e.tipo === 'desconto' && 
                (e.descricao.toLowerCase().includes('ronda') || e.descricao.toLowerCase().includes('rondas'))
            );
            const descontoRondas = eventoRondas ? eventoRondas.valor : 0;
            
            const eventoAvaria = eventos.find(e => 
                e.tipo === 'desconto' && (e as any).isAvariaUtilitario === true
            );
            const descontoAvaria = eventoAvaria ? eventoAvaria.valor : 0;

            // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE PROVENTOS (para base INSS/IRRF/FGTS)
            const eventosProventos = eventos
                .filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR'))
                .reduce((sum, e) => sum + e.valor, 0);

            // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE BENEFÍCIOS (para controle de duplicação)
            const eventosBeneficios = eventos
                .filter(e => e.tipo === 'beneficio')
                .reduce((sum, e) => sum + e.valor, 0);
                

            const calc = calcularFolhaPagamento(
                folhaPonto,
                folhaPonto.funcionario,
                parametroAtivo,
                salarioBase,
                jornadaMensal,
                undefined,
                folhaPontoProximoMes,
                undefined,
                descontoRondas, // Passar desconto de rondas para cálculo da base INSS
                descontoAvaria, // Passar desconto de avaria para cálculo da base INSS
                eventosProventos, // ⭐ PASSAR EVENTOS EXCEPCIONAIS DE PROVENTOS
                eventos // ⭐ PASSAR LISTA COMPLETA DE EVENTOS
            );


            // Atualizar na lista PRESERVANDO eventos excepcionais
            setTodasFolhas(prev => prev.map(f => 
                f.funcionario.id === funcionarioId
                    ? {
                        ...f,
                        resultado: calc,
                        dadosFolha: folhaPonto,
                        eventosExcepcionais: eventos // ⭐ PRESERVAR EVENTOS EXCEPCIONAIS
                    }
                    : f
            ));
            

            showToast(`✅ Folha de ${folhaPonto.funcionario.nome_completo} recalculada!`, 'success');

        } catch (error) {
            showToast('Erro ao recalcular folha de pagamento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLimparTodas = () => {
        setTodasFolhas([]);
        setActiveTab('');
        setEventosExcepcionais({});
    };

    const handleRecalcularTodas = async () => {
        if (todasFolhas.length === 0) {
            showToast('Nenhuma folha para recalcular', 'error');
            return;
        }

        const confirmar = window.confirm(
            `Deseja recalcular ${todasFolhas.length} folha(s) de pagamento?\n\n` +
            `Isso irá atualizar todos os cálculos com as regras mais recentes.`
        );

        if (!confirmar) return;

        setLoading(true);
        const folhasRecalculadas: FolhaCalculadaCompleta[] = [];
        let sucessos = 0;
        let erros = 0;

        try {
            const parametroAtivo = parametros?.find(p => p.ativo) || parametros?.[0];

            for (const folhaAtual of todasFolhas) {
                try {
                    // Buscar folha de ponto atualizada
                    const { data: folhaPonto, error: errorFolha } = await supabase
                        .from('folhas_ponto')
                        .select(`
                            *,
                            funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
                            empresa:empresas(*),
                            posto_trabalho:postos_trabalho(*)
                        `)
                        .eq('funcionario_id', folhaAtual.funcionario.id)
                        .eq('mes', mes)
                        .eq('ano', ano)
                        .maybeSingle();

                    if (errorFolha || !folhaPonto) {
                        erros++;
                        continue;
                    }

                    // Buscar escala separadamente
                    if (folhaPonto.funcionario?.cargo?.escala_id) {
                        const { data: escalaData } = await supabase
                            .from('regras_escalas')
                            .select('id, codigo_escala, nome_escala')
                            .eq('id', folhaPonto.funcionario.cargo.escala_id)
                            .single();
                        folhaPonto.funcionario.cargo.escala = escalaData || null;
                    }

                    // Buscar folha de ponto do próximo mês (com fallback para escala_mensal)
                    const proximoMes = mes === 12 ? 1 : mes + 1;
                    const proximoAno = mes === 12 ? ano + 1 : ano;
                    
                    const folhaPontoProximoMes = await getDadosDiasProximoMes(folhaAtual.funcionario.id, mes, ano);


                    // Recalcular
                    // ⭐ USAR SALÁRIO VIGENTE DO CARGO NO HISTÓRICO (para a competência específica)
                    const cargoId = folhaPonto.funcionario.cargo_id || folhaPonto.funcionario.cargo?.id;
                    const salarioFallback = folhaPonto.funcionario.cargo?.salario_base || 0;
                    const salarioBase = cargoId 
                      ? await getSalarioCargoVigente(cargoId, ano, mes, salarioFallback)
                      : salarioFallback;
                    const jornadaMensal = 220;

                    // ⚠️ PROBLEMA: Ao recalcular, os eventos excepcionais são perdidos!
                    // SOLUÇÃO: Preservar eventos excepcionais existentes
                    const eventos = eventosExcepcionais[folhaAtual.funcionario.id] || [];
                    const eventoRondas = eventos.find(e => 
                        e.tipo === 'desconto' && 
                        (e.descricao.toLowerCase().includes('ronda') || e.descricao.toLowerCase().includes('rondas'))
                    );
                    const descontoRondas = eventoRondas ? eventoRondas.valor : 0;
                    
                    const eventoAvaria = eventos.find(e => 
                        e.tipo === 'desconto' && (e as any).isAvariaUtilitario === true
                    );
                    const descontoAvaria = eventoAvaria ? eventoAvaria.valor : 0;

                    // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE PROVENTOS (para base INSS/IRRF/FGTS)
                    const eventosProventos = eventos
                        .filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR'))
                        .reduce((sum, e) => sum + e.valor, 0);

                    // ⭐ CALCULAR EVENTOS EXCEPCIONAIS DE BENEFÍCIOS (para controle de duplicação)
                    const eventosBeneficios = eventos
                        .filter(e => e.tipo === 'beneficio')
                        .reduce((sum, e) => sum + e.valor, 0);

                    const calc = calcularFolhaPagamento(
                        folhaPonto,
                        folhaPonto.funcionario,
                        parametroAtivo,
                        salarioBase,
                        jornadaMensal,
                        undefined,
                        folhaPontoProximoMes,
                        undefined,
                        descontoRondas,
                        descontoAvaria,
                        eventosProventos, // ⭐ PASSAR EVENTOS EXCEPCIONAIS DE PROVENTOS
                        eventos // ⭐ PASSAR LISTA COMPLETA DE EVENTOS
                    );


                    folhasRecalculadas.push({
                        funcionario: folhaPonto.funcionario,
                        resultado: calc,
                        dadosFolha: folhaPonto,
                        escalaMensalProximoMes: folhaPontoProximoMes,
                        empresa: folhaPonto.empresa,
                        posto_trabalho: folhaPonto.posto_trabalho,
                        eventosExcepcionais: eventos
                    });

                    sucessos++;
                } catch (error) {
                    erros++;
                }
            }

            setTodasFolhas(folhasRecalculadas);
            
            if (sucessos > 0) {
                showToast(`${sucessos} folha(s) recalculada(s) com sucesso!`, 'success');
            }
            if (erros > 0) {
                showToast(`${erros} erro(s) ao recalcular folhas`, 'error');
            }

        } catch (error) {
            showToast('Erro ao recalcular folhas de pagamento', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Funções para gerenciar eventos excepcionais
    const adicionarEvento = (funcionarioId: string, tipo: 'provento' | 'beneficio' | 'desconto') => {
        // Se for desconto, perguntar qual tipo
        let isAvariaUtilitario = false;
        let isRondasNaoRealizadas = false;
        let isRondasNaoRealizadasBenef = false; // Nova flag para rondas como benefício
        let descricao = '';
        
        if (tipo === 'desconto') {
            const opcao = prompt(
                'Escolha o tipo de desconto:\n\n' +
                'DIVERSOS:\n' +
                '1 - Desc. Rondas Não Realizadas\n' +
                '2 - Desc. Avaria Utilitário (Parcela)\n' +
                '3 - Outros Descontos (personalizado)\n\n' +
                'LEGAIS:\n' +
                '4 - INSS 13º\n' +
                '5 - INSS Férias\n\n' +
                'ADIANTAMENTOS:\n' +
                '6 - Adiantam. de Salário\n' +
                '7 - Adiantam. 13º Salário\n' +
                '8 - Adiantam. Vantagens 13º\n' +
                '9 - Outros Adiantamentos (personalizado)\n\n' +
                'Digite o número da opção:'
            );
            
            if (!opcao) return;
            
            if (opcao === '1') {
                isRondasNaoRealizadas = true;
                descricao = 'Desc. Rondas Não Realizadas';
            } else if (opcao === '2') {
                isAvariaUtilitario = true;
                descricao = 'Desc. Avaria Utilitário (Parcela)';
            } else if (opcao === '3') {
                descricao = prompt('Digite a descrição do desconto:') || '';
                if (!descricao) return;
                descricao = `Outros Descontos: ${descricao}`;
            } else if (opcao === '4') {
                descricao = 'INSS 13º';
            } else if (opcao === '5') {
                descricao = 'INSS Férias';
            } else if (opcao === '6') {
                descricao = 'Adiantam. de Salário';
            } else if (opcao === '7') {
                descricao = 'Adiantam. 13º Salário';
            } else if (opcao === '8') {
                descricao = 'Adiantam. Vantagens 13º';
            } else if (opcao === '9') {
                descricao = prompt('Digite a descrição do adiantamento:') || '';
                if (!descricao) return;
                descricao = `Outros Adiantamentos: ${descricao}`;
            } else {
                showToast('Opção inválida!', 'error');
                return;
            }
        } else if (tipo === 'beneficio') {
            // Para benefícios, oferecer opção de desconto de rondas e PLR
            const opcao = prompt(
                'Escolha o tipo de benefício:\n\n' +
                'DESCONTOS DE BENEFÍCIO:\n' +
                '1 - Desc. Rondas Não Realizadas\n' +
                '2 - Desc. Ajuste dos Benefícios\n' +
                '3 - Desc. Outros Benefícios (personalizado)\n\n' +
                'REEMBOLSOS:\n' +
                '4 - Reembolsos\n' +
                '5 - Outros Reembolsos (personalizado)\n\n' +
                'PLR:\n' +
                '6 - 1ª Parcela PLR\n' +
                '7 - 2ª Parcela PLR\n' +
                '8 - PLR Integral\n\n' +
                'Digite o número da opção:'
            );
            
            if (!opcao) return;
            
            if (opcao === '1') {
                isRondasNaoRealizadasBenef = true; // Marcar como rondas de benefício
                descricao = 'Desc. Rondas Não Realizadas';
            } else if (opcao === '2') {
                descricao = 'Desc. Ajuste dos Benefícios';
            } else if (opcao === '3') {
                descricao = prompt('Digite a descrição do benefício a descontar:') || '';
                if (!descricao) return;
                descricao = `Desc. Outros Benefícios: ${descricao}`;
            } else if (opcao === '4') {
                descricao = 'Reembolsos';
            } else if (opcao === '5') {
                descricao = prompt('Digite a descrição do reembolso:') || '';
                if (!descricao) return;
                descricao = `Outros Reembolsos: ${descricao}`;
            } else if (opcao === '6') {
                descricao = '1ª Parcela PLR';
            } else if (opcao === '7') {
                descricao = '2ª Parcela PLR';
            } else if (opcao === '8') {
                descricao = 'PLR Integral';
            } else {
                showToast('Opção inválida!', 'error');
                return;
            }
        } else {
            // Para proventos, oferecer opções de rescisão, 13º salário e PLR
            // Calcular mês anterior para Saldo de Salário
            const mesesNomes = ['Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro'];
            const mesAnterior = mesesNomes[mes - 1] || 'Mês Anterior';
            
            const opcao = prompt(
                'Escolha o tipo de provento:\n\n' +
                'ADICIONAIS:\n' +
                '1 - Folhas de Pagamento\n' +
                '2 - Controle de Rondas Palmeiras\n' +
                '3 - Supervisão Palmeiras\n' +
                '4 - Outros Serviços (personalizado)\n\n' +
                'RESCISÃO:\n' +
                '5 - 13º Proporc. Rescisão\n' +
                '6 - 13º Proporc. Vantagens Rescisão\n' +
                '7 - Férias Proporc. Rescisão\n' +
                '8 - 1/3 Férias Proporc. Rescisão\n' +
                '9 - PLR Proporc. Rescisão\n\n' +
                '13º SALÁRIO:\n' +
                '10 - 13º Salário\n' +
                '11 - Vantagens 13º\n' +
                '12 - 13º Salário 1ª Parcela\n' +
                '13 - 13º Salário 2ª Parcela\n' +
                '14 - 13º Salário Vantagens 1ª Parcela\n' +
                '15 - 13º Salário Vantagens 2ª Parcela\n\n' +
                'OUTROS:\n' +
                `16 - Saldo de Salário - ${mesAnterior}\n\n` +
                'Digite o número da opção:'
            );
            
            if (!opcao) return;
            
            if (opcao === '1') {
                descricao = 'Folhas de Pagamento';
            } else if (opcao === '2') {
                descricao = 'Controle de Rondas Palmeiras';
            } else if (opcao === '3') {
                descricao = 'Supervisão Palmeiras';
            } else if (opcao === '4') {
                descricao = prompt('Digite a descrição do serviço:') || '';
                if (!descricao) return;
                descricao = `Outros Serviços: ${descricao}`;
            } else if (opcao === '5') {
                descricao = '13º Proporc. Rescisão';
            } else if (opcao === '6') {
                descricao = '13º Proporc. Vantagens Rescisão';
            } else if (opcao === '7') {
                descricao = 'Férias Proporc. Rescisão';
            } else if (opcao === '8') {
                descricao = '1/3 Férias Proporc. Rescisão';
            } else if (opcao === '9') {
                descricao = 'PLR Proporc. Rescisão';
            } else if (opcao === '10') {
                descricao = '13º Salário';
            } else if (opcao === '11') {
                descricao = 'Vantagens 13º';
            } else if (opcao === '12') {
                descricao = '13º Salário 1ª Parcela';
            } else if (opcao === '13') {
                descricao = '13º Salário 2ª Parcela';
            } else if (opcao === '14') {
                descricao = '13º Salário Vantagens 1ª Parcela';
            } else if (opcao === '15') {
                descricao = '13º Salário Vantagens 2ª Parcela';
            } else if (opcao === '16') {
                descricao = `Saldo de Salário - ${mesAnterior}`;
            } else {
                showToast('Opção inválida!', 'error');
                return;
            }
        }

        const mensagemValor = tipo === 'beneficio' 
            ? 'Digite o valor (use - para descontar, ex: -50):'
            : 'Digite o valor (apenas números):';
        
        const valorStr = prompt(mensagemValor);
        if (!valorStr) return;

        const valor = parseFloat(valorStr.replace(',', '.'));
        if (isNaN(valor)) {
            showToast('Valor inválido! Digite apenas números', 'error');
            return;
        }
        
        // Validação específica por tipo
        if (tipo === 'provento' && valor <= 0) {
            showToast('Proventos devem ser valores positivos!', 'error');
            return;
        }
        if (tipo === 'desconto' && valor <= 0) {
            showToast('Descontos devem ser valores positivos!', 'error');
            return;
        }
        // Benefícios podem ser positivos (adicionar) ou negativos (descontar)

        // ⭐ Normalizar descrição antes de adicionar (garante consistência)
        const descricaoNormalizada = normalizarDescricao(descricao);

        setEventosExcepcionais(prev => ({
            ...prev,
            [funcionarioId]: [
                ...(prev[funcionarioId] || []),
                { descricao: descricaoNormalizada, valor, tipo, isAvariaUtilitario, isRondasNaoRealizadas, isRondasNaoRealizadasBenef }
            ]
        }));
    };

    // === BENEFÍCIOS: Undo/Redo + confirmação de exclusão ===
    const BENEFICIOS_CAMPOS = [
        'vale_transporte', 'vale_transporte_mes_anterior', 'vale_transporte_mes_atual',
        'vale_alimentacao', 'vale_alimentacao_mes_anterior', 'vale_alimentacao_mes_atual',
        'cesta_basica', 'plr', 'premio_permanencia', 'folga_trabalhada',
        'desconto_vt_faltas', 'desconto_va_faltas', 'desc_ajuste_beneficios'
    ];
    const snapshotBeneficios = (funcionarioId: string) => {
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        if (!folha) return;
        const resultadoSnap: any = {};
        BENEFICIOS_CAMPOS.forEach(c => { resultadoSnap[c] = (folha.resultado as any)[c]; });
        const eventosSnap = JSON.parse(JSON.stringify(eventosExcepcionais[funcionarioId] || []));
        setBeneficiosUndo(prev => ({ ...prev, [funcionarioId]: [...(prev[funcionarioId] || []), { resultado: resultadoSnap, eventos: eventosSnap }].slice(-30) }));
        setBeneficiosRedo(prev => ({ ...prev, [funcionarioId]: [] }));
    };
    const captureBeneficiosAtual = (funcionarioId: string) => {
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        if (!folha) return null;
        const resultadoSnap: any = {};
        BENEFICIOS_CAMPOS.forEach(c => { resultadoSnap[c] = (folha.resultado as any)[c]; });
        return { resultado: resultadoSnap, eventos: JSON.parse(JSON.stringify(eventosExcepcionais[funcionarioId] || [])) };
    };
    const aplicarBeneficiosSnapshot = (funcionarioId: string, snap: { resultado: any; eventos: EventoExcepcional[] }) => {
        setTodasFolhas(prev => prev.map(f => f.funcionario.id === funcionarioId
            ? { ...f, resultado: { ...f.resultado, ...snap.resultado } } : f));
        setEventosExcepcionais(prev => ({ ...prev, [funcionarioId]: snap.eventos }));
    };
    const undoBeneficios = (funcionarioId: string) => {
        const stack = beneficiosUndo[funcionarioId] || [];
        if (stack.length === 0) return;
        const atual = captureBeneficiosAtual(funcionarioId);
        const anterior = stack[stack.length - 1];
        setBeneficiosUndo(prev => ({ ...prev, [funcionarioId]: stack.slice(0, -1) }));
        if (atual) setBeneficiosRedo(prev => ({ ...prev, [funcionarioId]: [...(prev[funcionarioId] || []), atual] }));
        aplicarBeneficiosSnapshot(funcionarioId, anterior);
        showToast('Alteração desfeita', 'info');
    };
    const redoBeneficios = (funcionarioId: string) => {
        const stack = beneficiosRedo[funcionarioId] || [];
        if (stack.length === 0) return;
        const atual = captureBeneficiosAtual(funcionarioId);
        const proximo = stack[stack.length - 1];
        setBeneficiosRedo(prev => ({ ...prev, [funcionarioId]: stack.slice(0, -1) }));
        if (atual) setBeneficiosUndo(prev => ({ ...prev, [funcionarioId]: [...(prev[funcionarioId] || []), atual] }));
        aplicarBeneficiosSnapshot(funcionarioId, proximo);
        showToast('Alteração refeita', 'info');
    };
    const confirmarExclusaoBeneficio = (message: string, onConfirm: () => void) => {
        setConfirmDelete({ open: true, message, onConfirm });
    };

    const removerEvento = (funcionarioId: string, evento: EventoExcepcional) => {
        setEventosExcepcionais(prev => {
            const eventosAtuais = prev[funcionarioId] || [];
            // Encontrar o índice real do evento no array original
            const indexReal = eventosAtuais.findIndex(
                e => e.descricao === evento.descricao && e.valor === evento.valor && e.tipo === evento.tipo
            );
            if (indexReal === -1) return prev;
            return {
                ...prev,
                [funcionarioId]: eventosAtuais.filter((_, i) => i !== indexReal)
            };
        });
    };

    // ⭐ NOVA FUNÇÃO: Editar valor de um evento excepcional
    const editarEvento = (funcionarioId: string, evento: EventoExcepcional) => {
        const valorAtual = evento.valor.toFixed(2).replace('.', ',');
        const novoValorStr = prompt(`Editar valor de "${evento.descricao}":\n\nValor atual: R$ ${valorAtual}\n\nDigite o novo valor:`, valorAtual);
        
        if (!novoValorStr) return;
        
        const novoValor = parseFloat(novoValorStr.replace(',', '.'));
        if (isNaN(novoValor) || novoValor <= 0) {
            showToast('Valor inválido! Digite apenas números positivos', 'error');
            return;
        }

        setEventosExcepcionais(prev => {
            const eventosAtuais = prev[funcionarioId] || [];
            // Encontrar o índice real do evento no array original
            const indexReal = eventosAtuais.findIndex(
                e => e.descricao === evento.descricao && e.valor === evento.valor && e.tipo === evento.tipo
            );
            if (indexReal === -1) return prev;
            
            // Criar novo array com o evento atualizado
            const novosEventos = [...eventosAtuais];
            novosEventos[indexReal] = { ...novosEventos[indexReal], valor: novoValor };
            
            return {
                ...prev,
                [funcionarioId]: novosEventos
            };
        });
        
        showToast(`Valor atualizado para R$ ${novoValor.toFixed(2).replace('.', ',')}`, 'success');
    };

    // ⭐ IMPORTAR MÓDULOS ISOLADOS DE CÁLCULO
    // Estes módulos garantem consistência e evitam duplicação de código

    // ⭐ FUNÇÃO 2: RASTREAR TODOS OS DESCONTOS
    // ⭐ USAR MÓDULOS ISOLADOS PARA CÁLCULOS
    // As funções de cálculo foram movidas para módulos separados para evitar duplicação
    // e garantir consistência entre diferentes partes do sistema


    // ⭐ FUNÇÃO AUXILIAR: calcular salário líquido a partir dos lançamentos do holerite
    // (mantém consistência com HOLERITE e garante que descontos como Adiantam. de Salário entrem no líquido)
    const calcularSalarioLiquidoPorLancamentos = (
        funcionarioId: string,
        resultado: ResultadoCalculoFolha,
        eventosParam?: EventoExcepcional[],
        folhaPonto?: any
    ) => {
        const eventos = eventosParam || eventosExcepcionais[funcionarioId] || [];
        const lancamentos = mapearFolhaParaHolerite(resultado, eventos, folhaPonto, parametros);
        const totalProventos = lancamentos.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + (l.valor || 0), 0);
        const totalDescontos = lancamentos.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + (l.valor || 0), 0);
        return totalProventos - totalDescontos;
    };

    // Função para visualização em lote (antiga impressão em lote)
    const imprimirLote = (tipo: 'holerite' | 'beneficios' | 'recibo' | 'tudo') => {
        let folhasFiltradas = todasFolhas;

        // Aplicar filtros de posto/empresa
        if (filtroImpressao === 'posto' && postoFiltro) {
            folhasFiltradas = folhasFiltradas.filter(f => f.funcionario.posto_trabalho_id === postoFiltro);
        } else if (filtroImpressao === 'empresa' && empresaFiltro) {
            folhasFiltradas = folhasFiltradas.filter(f => f.funcionario.empresa_id === empresaFiltro);
        }

        // Aplicar filtro de funcionários registrados/não registrados
        if (filtroRegistro === 'registrados') {
            folhasFiltradas = folhasFiltradas.filter(f => f.funcionario.funcionario_registrado === true);
        } else if (filtroRegistro === 'nao_registrados') {
            folhasFiltradas = folhasFiltradas.filter(f => f.funcionario.funcionario_registrado === false);
        }

        if (folhasFiltradas.length === 0) {
            showToast('Nenhuma folha encontrada com os filtros selecionados', 'info');
            return;
        }

        // Abrir modal de visualização em lote
        setTipoVisualizacaoLote(tipo);
        setFolhasVisualizacaoLote(folhasFiltradas);
        setMostrarVisualizacaoLote(true);
    };


    // Função para abrir modal "Visualizar Tudo" de um funcionário específico
    const visualizarTudoIndividual = (folha: FolhaCalculadaCompleta) => {
        // Fechar todos os outros modais primeiro
        setMostrarHolerite(false);
        setMostrarReciboBeneficios(false);
        setMostrarRecibo(false);
        setFolhaSelecionadaHolerite(null);
        setFolhaSelecionadaReciboBeneficios(null);
        setFolhaSelecionadaRecibo(null);
        
        // Abrir modal Imprimir Tudo
        setFolhaSelecionadaImprimirTudo(folha);
        setMostrarImprimirTudo(true);
    };

    // Função para ordenar as folhas
    const folhasOrdenadas = [...todasFolhas].sort((a, b) => {
        switch (ordenacao) {
            case 'nome':
                return (a.funcionario.nome_completo || '').localeCompare(b.funcionario.nome_completo || '');
            case 'empresa':
                const empresaA = a.empresa?.nome_empresa || a.dadosFolha?.empresa?.nome_empresa || '';
                const empresaB = b.empresa?.nome_empresa || b.dadosFolha?.empresa?.nome_empresa || '';
                return empresaA.localeCompare(empresaB);
            case 'posto':
                const postoA = a.funcionario?.nome_posto || a.posto_trabalho?.nome_posto || a.dadosFolha?.posto_trabalho?.nome_posto || '';
                const postoB = b.funcionario?.nome_posto || b.posto_trabalho?.nome_posto || b.dadosFolha?.posto_trabalho?.nome_posto || '';
                return postoA.localeCompare(postoB);
            default:
                return 0;
        }
    });

    const folhaAtiva = folhasOrdenadas.find(f => f.funcionario.id === activeTab);

    // Print context for extracted print functions
    const printCtx: PrintContext = {
        showToast,
        setImprimindo,
        setProgressoImpressao,
        eventosExcepcionais,
        mes,
        ano,
        meses,
        parametros
    };

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            {progressoCalculo.total > 0 && (
                <ProgressBar
                    overlay
                    label="Calculando folhas de pagamento"
                    sublabel={progressoCalculo.nome}
                    current={progressoCalculo.atual}
                    total={progressoCalculo.total}
                    color="blue"
                    icon="🧮"
                />
            )}
            {progressoSalvar.total > 0 && (
                <ProgressBar
                    overlay
                    label="Salvando folhas de pagamento"
                    sublabel={progressoSalvar.nome}
                    current={progressoSalvar.atual}
                    total={progressoSalvar.total}
                    color="green"
                    icon="💾"
                />
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Folha de Pagamento Calculada</h1>


            {/* Seção de Controles */}
            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Calcular Folhas de Pagamento</h2>
                <div className="space-y-4">
                    {/* Linha 1: Selects de Mês e Ano */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <Select
                            label="Mês"
                            value={mes.toString()}
                            onChange={(e) => setMes(Number(e.target.value))}
                        >
                            {meses.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </Select>

                        <Select
                            label="Ano"
                            value={ano.toString()}
                            onChange={(e) => setAno(Number(e.target.value))}
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Select>
                    </div>

                    {/* Indicador de Tabela de Parâmetros em Uso */}
                    {parametros && parametros.length > 0 && (() => {
                        const parametroEmUso = parametros.find(p => p.ano_vigencia === ano) 
                            || parametros.find(p => p.ativo) 
                            || parametros[0];
                        const usandoAnoCorreto = parametroEmUso?.ano_vigencia === ano;
                        
                        return (
                            <div className={`rounded-lg p-3 border ${usandoAnoCorreto ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`font-medium ${usandoAnoCorreto ? 'text-green-700' : 'text-amber-700'}`}>
                                        📊 Tabela de Parâmetros: <strong>{parametroEmUso?.ano_vigencia}</strong>
                                    </span>
                                    {!usandoAnoCorreto && (
                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                            ⚠️ Não há parâmetros para {ano}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                    <span>Cesta: R$ {parametroEmUso?.cesta_basica?.toFixed(2) || '0.00'}</span>
                                    <span>Prêmio: R$ {parametroEmUso?.premio_permanencia_base?.toFixed(2) || '0.00'}</span>
                                    <span>VT: R$ {parametroEmUso?.vale_transporte?.toFixed(2) || '0.00'}</span>
                                    <span>VA: R$ {parametroEmUso?.vale_alimentacao?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Linha 2: Botões de Ação */}
                    {canShowActions() ? (
                    <div className="grid grid-cols-2 lg:flex gap-2">
                        <Button 
                            onClick={() => setMostrarModalFolhaIndividual(true)} 
                            disabled={loading}
                            className="lg:flex-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                        >
                            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Calcular </span>Individual
                        </Button>
                        <Button 
                            onClick={() => setMostrarModalEditarFolha(true)} 
                            disabled={loading}
                            className="lg:flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                        >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Editar </span>Folha
                        </Button>
                        <Button onClick={handleCalcularTodas} disabled={loading} className="lg:flex-1 text-xs sm:text-sm">
                            <Calculator className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {loading ? '...' : <><span className="hidden sm:inline">Calcular </span>Todas</>}
                        </Button>
                        <Button 
                            onClick={() => setMostrarSeletorPeriodo(!mostrarSeletorPeriodo)}
                            disabled={loading}
                            className="lg:flex-1 !bg-primary !text-primary-foreground hover:!bg-primary/90 text-xs sm:text-sm"
                        >
                            📅 <span className="hidden sm:inline">Gerar </span>Período
                        </Button>
                        <Button 
                            onClick={async () => {
                                if (window.confirm(`Tem certeza que deseja excluir TODAS as folhas de pagamento de ${meses[mes - 1]}/${ano}?`)) {
                                    setLoading(true);
                                    try {
                                        const { error } = await supabase
                                            .from('folha_calculada')
                                            .delete()
                                            .eq('mes', mes)
                                            .eq('ano', ano);
                                        
                                        if (error) throw error;
                                        showToast('Todas as folhas de pagamento foram excluídas!', 'success');
                                        setTodasFolhas([]);
                                        setActiveTab('');
                                    } catch (error) {
                                        showToast(`Erro ao excluir folhas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            disabled={loading}
                            className="lg:flex-1 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
                        >
                            🗑️ <span className="hidden sm:inline">Excluir </span>Todas
                        </Button>
                        <BulkNotificationButton 
                            mes={mes} 
                            ano={ano} 
                            funcionarioIds={todasFolhas.map(f => f.funcionario.id)}
                        />
                    </div>
                    ) : (
                        <div className="text-center py-2 text-sm text-gray-500 italic">
                            Modo somente leitura - Ações de cálculo desabilitadas
                        </div>
                    )}
                </div>
            </Card>

            {/* Seletor de Período para Geração em Lote */}
            {mostrarSeletorPeriodo && (
                <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                    <h3 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200">📅 Gerar Folhas Calculadas por Período</h3>
                    
                    {progressoGeracaoPeriodo.total > 0 && (
                        <div className="mb-4 p-3 bg-background rounded-lg border">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Processando mês {progressoGeracaoPeriodo.atual} de {progressoGeracaoPeriodo.total}</span>
                                <span>{Math.round((progressoGeracaoPeriodo.atual / progressoGeracaoPeriodo.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(progressoGeracaoPeriodo.atual / progressoGeracaoPeriodo.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    
                    <PeriodSelector
                        loading={loading}
                        buttonLabel="Gerar Folhas Calculadas"
                        buttonIcon="💰"
                        onGenerate={async (periods) => {
                            if (!parametros || parametros.length === 0) {
                                showToast('Parâmetros de cálculo não configurados.', 'error');
                                return;
                            }
                            
                            const funcionariosComCargo = funcionarios?.filter(f => {
                                if (f.demitido === true) return false;
                                return f.cargo_id;
                            }) || [];
                            
                            if (funcionariosComCargo.length === 0) {
                                showToast('Nenhum funcionário ativo com cargo definido', 'error');
                                return;
                            }
                            
                            if (!window.confirm(`Deseja calcular e salvar as folhas de ${periods.length} mês(es) para ${funcionariosComCargo.length} funcionário(s)?\n\nIsso pode levar alguns minutos.`)) {
                                return;
                            }
                            
                            setLoading(true);
                            setProgressoGeracaoPeriodo({ atual: 0, total: periods.length });
                            
                            try {
                                let totalSucessos = 0;
                                let totalErros = 0;
                                let mesIndex = 0;
                                
                                for (const { mes: mesCalc, ano: anoCalc } of periods) {
                                    mesIndex++;
                                    setProgressoGeracaoPeriodo({ atual: mesIndex, total: periods.length });
                                    
                                    const parametroAtivoLote = parametros.find(p => p.ano_vigencia === anoCalc) 
                                        || parametros.find(p => p.ativo) 
                                        || parametros[0];
                                    
                                    for (const funcionario of funcionariosComCargo) {
                                        try {
                                            const { data: folhaPonto } = await supabase
                                                .from('folhas_ponto')
                                                .select('*, funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*))')
                                                .eq('funcionario_id', funcionario.id)
                                                .eq('mes', mesCalc)
                                                .eq('ano', anoCalc)
                                                .maybeSingle();
                                            
                                            if (!folhaPonto) continue;

                                            if (folhaPonto.funcionario?.cargo?.escala_id) {
                                                const { data: escalaData } = await supabase
                                                    .from('regras_escalas')
                                                    .select('id, codigo_escala, nome_escala')
                                                    .eq('id', folhaPonto.funcionario.cargo.escala_id)
                                                    .single();
                                                folhaPonto.funcionario.cargo.escala = escalaData || null;
                                            }
                                            
                                            const proximoMesCalc = mesCalc === 12 ? 1 : mesCalc + 1;
                                            const proximoAnoCalc = mesCalc === 12 ? anoCalc + 1 : anoCalc;
                                            
                                            const folhaPontoProximoMesCalc = await getDadosDiasProximoMes(funcionario.id, mesCalc, anoCalc);

                                            
                                            const cargoId = folhaPonto.funcionario.cargo_id || folhaPonto.funcionario.cargo?.id;
                                            const salarioFallback = folhaPonto.funcionario.cargo?.salario_base || 0;
                                            const salarioBase = cargoId 
                                              ? await getSalarioCargoVigente(cargoId, anoCalc, mesCalc, salarioFallback)
                                              : salarioFallback;
                                            
                                            const calc = calcularFolhaPagamento(
                                                folhaPonto,
                                                folhaPonto.funcionario,
                                                parametroAtivoLote,
                                                salarioBase,
                                                220,
                                                undefined,
                                                folhaPontoProximoMesCalc,
                                                undefined,
                                                0,
                                                0,
                                                0
                                            );
                                            
                                            const folhaParaSalvar = normalizarFolhaCalculada({
                                                funcionario_id: funcionario.id,
                                                nome_funcionario: funcionario.nome_completo,
                                                mes: mesCalc,
                                                ano: anoCalc,
                                                empresa_id: folhaPonto.funcionario.empresa_id || null,
                                                posto_trabalho_id: folhaPonto.funcionario.posto_trabalho_id || null,
                                                salario_base: calc.salario_base,
                                                horas_extras: calc.horas_extras_50 + calc.horas_extras_100,
                                                horas_extras_50: calc.horas_extras_50,
                                                horas_extras_100: calc.horas_extras_100,
                                                adicional_noturno: calc.adicional_noturno,
                                                intrajornada_50: calc.intrajornada_50,
                                                intrajornada_100: calc.intrajornada_100,
                                                dsr_horas_extras: calc.dsr_horas_extras,
                                                dsr_adicional_noturno: calc.dsr_adicional_noturno,
                                                adicional_insalubridade: calc.adicional_insalubridade,
                                                adicional_acumulo_funcao: calc.adicional_acumulo_funcao,
                                                complemento_salario: calc.complemento_salario,
                                                vale_transporte: calc.vale_transporte,
                                                vale_transporte_mes_anterior: calc.vale_transporte_mes_anterior,
                                                vale_transporte_mes_atual: calc.vale_transporte_mes_atual,
                                                vale_alimentacao: calc.vale_alimentacao,
                                                vale_alimentacao_mes_anterior: calc.vale_alimentacao_mes_anterior,
                                                vale_alimentacao_mes_atual: calc.vale_alimentacao_mes_atual,
                                                cesta_basica: calc.cesta_basica,
                                                plr: calc.plr,
                                                premio_permanencia: calc.premio_permanencia,
                                                folga_trabalhada: calc.folga_trabalhada || 0,
                                                folgas_trabalhadas_vt: 0,
                                                folgas_trabalhadas_va: 0,
                                                valor_vt_folgas_trabalhadas: 0,
                                                valor_va_folgas_trabalhadas: 0,
                                                desconto_inss: calc.desconto_inss,
                                                desconto_irrf: calc.desconto_irrf,
                                                desconto_vt: calc.desconto_vt,
                                                desconto_vt_faltas: calc.desconto_vt_faltas,
                                                desconto_va_faltas: calc.desconto_va_faltas,
                                                desconto_contribuicao_assistencial: calc.desconto_contribuicao_assistencial,
                                                desconto_atrasos: calc.desconto_atrasos,
                                                desconto_faltas: calc.desconto_faltas,
                                                desconto_plr: calc.desconto_plr,
                                                desconto_rondas_nao_realizadas: calc.desconto_rondas_nao_realizadas,
                                                desconto_adiantamento_quinzenal: calc.desconto_adiantamento_quinzenal,
                                                desconto_complemento_anterior: calc.desconto_complemento_anterior,
                                                desconto_adiantamento_salario: calc.desconto_adiantamento_salario,
                                                total_proventos: calc.total_proventos,
                                                total_descontos: calc.total_descontos,
                                                salario_liquido: calc.salario_liquido,
                                                base_inss: calc.base_inss,
                                                base_irrf: calc.base_irrf,
                                                base_fgts: calc.base_fgts,
                                                fgts: calc.fgts,
                                                inss_patronal: calc.inss_patronal
                                            });
                                            
                                            const { data: existing } = await supabase
                                                .from('folha_calculada')
                                                .select('id')
                                                .eq('funcionario_id', funcionario.id)
                                                .eq('mes', mesCalc)
                                                .eq('ano', anoCalc)
                                                .maybeSingle();
                                            
                                            if (existing) {
                                                await supabase
                                                    .from('folha_calculada')
                                                    .update(folhaParaSalvar)
                                                    .eq('id', existing.id);
                                            } else {
                                                await supabase
                                                    .from('folha_calculada')
                                                    .insert(folhaParaSalvar);
                                            }
                                            
                                            totalSucessos++;
                                        } catch (error) {
                                            totalErros++;
                                        }
                                    }
                                }
                                
                                if (totalErros > 0) {
                                    showToast(`${periods.length} meses processados: ${totalSucessos} folhas geradas, ${totalErros} erros`, 'error');
                                } else {
                                    showToast(`${periods.length} meses processados: ${totalSucessos} folhas geradas com sucesso!`, 'success');
                                }
                                
                                carregarFolhasSalvas();
                                setMostrarSeletorPeriodo(false);
                            } catch (error) {
                                showToast('Erro ao gerar período', 'error');
                            } finally {
                                setLoading(false);
                                setProgressoGeracaoPeriodo({ atual: 0, total: 0 });
                            }
                        }}
                    />
                </Card>
            )}

            {/* Seção de Impressão em Lote */}
            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Visualizar Recibos em Lote</h2>
                <div className="space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Filtrar por"
                            value={filtroImpressao}
                            onChange={(e) => setFiltroImpressao(e.target.value as 'todos' | 'posto' | 'empresa')}
                        >
                            <option value="todos">Todos os Funcionários</option>
                            <option value="posto">Por Posto de Trabalho</option>
                            <option value="empresa">Por Empresa</option>
                        </Select>

                        {filtroImpressao === 'posto' && (
                            <Select
                                label="Posto de Trabalho"
                                value={postoFiltro}
                                onChange={(e) => setPostoFiltro(e.target.value)}
                            >
                                <option value="">Selecione um posto</option>
                                {postos.map(posto => (
                                    <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                                ))}
                            </Select>
                        )}

                        {filtroImpressao === 'empresa' && (
                            <Select
                                label="Empresa"
                                value={empresaFiltro}
                                onChange={(e) => setEmpresaFiltro(e.target.value)}
                            >
                                <option value="">Selecione uma empresa</option>
                                {empresas.map(empresa => (
                                    <option key={empresa.id} value={empresa.id}>{empresa.nome_empresa}</option>
                                ))}
                            </Select>
                        )}

                        <Select
                            label="Tipo de Funcionário"
                            value={filtroRegistro}
                            onChange={(e) => setFiltroRegistro(e.target.value as 'todos' | 'registrados' | 'nao_registrados')}
                        >
                            <option value="todos">Todos</option>
                            <option value="registrados">Registrados</option>
                            <option value="nao_registrados">Não Registrados</option>
                        </Select>
                    </div>

                    {/* Indicador de Progresso de Impressão */}
                    {imprimindo && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            Gerando {progressoImpressao.tipo}...
                                        </span>
                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                            {progressoImpressao.atual} / {progressoImpressao.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                                            style={{ width: `${progressoImpressao.total > 0 ? (progressoImpressao.atual / progressoImpressao.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botões de Visualização */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <Button 
                            onClick={() => imprimirLote('holerite')}
                            disabled={loading || imprimindo || todasFolhas.length === 0}
                            variant="secondary"
                            className="text-xs sm:text-sm"
                        >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Visualizar Holerites
                        </Button>
                        <Button 
                            onClick={() => imprimirLote('beneficios')}
                            disabled={loading || imprimindo || todasFolhas.length === 0}
                            variant="secondary"
                            className="text-xs sm:text-sm"
                        >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Visualizar Benefícios
                        </Button>
                        <Button 
                            onClick={() => imprimirLote('recibo')}
                            disabled={loading || imprimindo || todasFolhas.length === 0}
                            variant="secondary"
                            className="text-xs sm:text-sm"
                        >
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Visualizar Recibos
                        </Button>
                        <Button 
                            onClick={() => imprimirLote('tudo')}
                            disabled={loading || imprimindo || todasFolhas.length === 0}
                            className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
                        >
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Visualizar Tudo
                        </Button>
                    </div>

                    {/* Botões de Exportação */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Exportações</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            <Button 
                                onClick={() => setMostrarExportacaoLote(true)}
                                disabled={loading || todasFolhas.length === 0}
                                variant="outline"
                                className="text-xs sm:text-sm"
                            >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Exportar Excel/PDF
                            </Button>
                            {/* TODO: Reativar quando CNAB Itaú estiver pronto para produção
                            <Button 
                                onClick={() => setMostrarCNABModal(true)}
                                disabled={loading || todasFolhas.length === 0}
                                variant="outline"
                                className="text-xs sm:text-sm"
                            >
                                <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Gerar CNAB Itaú
                            </Button>
                            */}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Seção de Resultados */}
            {todasFolhas.length > 0 && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Folhas Calculadas ({todasFolhas.length})</h2>
                        {canShowActions() ? (
                        <div className="flex gap-2">
                            <Button onClick={handleSalvarTodas} disabled={submitting}>
                                {submitting ? 'Salvando...' : `💾 Salvar Todas (${todasFolhas.length})`}
                            </Button>
                            <Button onClick={handleLimparTodas} variant="secondary" disabled={submitting} className="flex-1 sm:flex-none text-sm">
                                Limpar Todas
                            </Button>
                        </div>
                        ) : (
                            <span className="text-sm text-gray-500 italic">Somente leitura</span>
                        )}
                    </div>

                    {/* Layout com Abas à Esquerda */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                        {/* Abas dos Funcionários - À Esquerda */}
                        <div className="w-full lg:w-80 lg:flex-shrink-0">
                            <div className="border-b lg:border-b-0 lg:border-r border-gray-200 pb-4 lg:pb-0 lg:pr-4">
                                {/* Seletor de Ordenação */}
                                <div className="mb-4">
                                    <label htmlFor="ordenacao-select" className="block text-sm font-medium text-gray-700 mb-2">
                                        Ordenar por:
                                    </label>
                                    <select
                                        id="ordenacao-select"
                                        value={ordenacao}
                                        onChange={(e) => setOrdenacao(e.target.value as 'nome' | 'empresa' | 'posto')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="nome">Nome</option>
                                        <option value="empresa">Empresa</option>
                                        <option value="posto">Posto</option>
                                    </select>
                                </div>

                                <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                                    {folhasOrdenadas.map((folha) => (
                                        <button
                                            key={folha.funcionario.id}
                                            onClick={() => setActiveTab(folha.funcionario.id)}
                                            className={`flex-shrink-0 lg:flex-shrink lg:w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors ${
                                                activeTab === folha.funcionario.id
                                                    ? 'bg-blue-100 text-blue-800 font-semibold border-l-4 border-blue-600'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-medium">{abreviarNome(folha.funcionario.nome_completo)}</div>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${folha.funcionario.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {folha.funcionario.ativo !== false ? '✓' : '✗'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {ordenacao === 'empresa' && (
                                                    <div className="font-semibold text-blue-600">
                                                        🏢 {folha.empresa?.nome_empresa || folha.dadosFolha?.empresa?.nome_empresa || 'Sem empresa'}
                                                    </div>
                                                )}
                                                {ordenacao === 'posto' && (
                                                    <div className="font-semibold text-purple-600">
                                                        📍 {folha.funcionario?.nome_posto || folha.posto_trabalho?.nome_posto || folha.dadosFolha?.posto_trabalho?.nome_posto || 'Sem posto'}
                                                    </div>
                                                )}
                                                {folha.funcionario.cargo?.nome_cargo || folha.funcionario?.nome_cargo || folha.dadosFolha?.cargo?.nome_cargo || 'Sem cargo'}
                                            </div>
                                            <div className="text-xs font-semibold text-blue-600 mt-1">
                                                💰 Total: {formatarMoeda(
                                                    (() => {
                                                        // ⭐ USAR EVENTOS DO ESTADO (eventosExcepcionais) com faixa VT
                                                        const eventosAtuais = eventosExcepcionais[folha.funcionario.id] || [];
                                                        const totais = calcularTotaisComEventos(folha.funcionario.id, folha.resultado, eventosAtuais, undefined, folha.funcionario);
                                                        const salarioLiquido = totais.totalProventos - totais.totalDescontos;
                                                        return salarioLiquido + totais.totalBeneficios;
                                                    })()
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Conteúdo da Folha Selecionada - À Direita */}
                        <div className="flex-1">
                            {folhaAtiva && (
                                <>
                                    <Card className="bg-blue-50 border border-blue-200">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap gap-2 w-full justify-end">
                                                <Button
                                                    onClick={() => setMostrarAnaliseIA(true)}
                                                    disabled={loading}
                                                    variant="secondary"
                                                    className="!bg-purple-600 !text-white hover:!bg-purple-700 focus:!ring-purple-500 flex-1 sm:flex-none text-sm"
                                                    title="Analisar com IA"
                                                >
                                                    ✨ Análise IA
                                                </Button>
                                                <Button
                                                    onClick={() => setModoEdicao(prev => ({
                                                        ...prev,
                                                        [folhaAtiva.funcionario.id]: !prev[folhaAtiva.funcionario.id]
                                                    }))}
                                                    variant={modoEdicao[folhaAtiva.funcionario.id] ? "primary" : "secondary"}
                                                    className="flex-1 sm:flex-none text-sm"
                                                >
                                                    {modoEdicao[folhaAtiva.funcionario.id] ? '✅ Concluir' : '✏️ Editar'}
                                                </Button>
                                                <Button
                                                    onClick={() => handleRecalcularIndividual(folhaAtiva.funcionario.id)}
                                                    disabled={loading}
                                                    variant="secondary"
                                                    className="!bg-green-600 !text-white hover:!bg-green-700 focus:!ring-green-500 flex-1 sm:flex-none text-sm"
                                                >
                                                    {loading ? '...' : '🔄 Recalcular'}
                                                </Button>
                                                <Button
                                                    onClick={() => handleSalvarIndividual(folhaAtiva.funcionario.id)}
                                                    disabled={submitting}
                                                    className="flex-1 sm:flex-none text-sm"
                                                >
                                                    {submitting ? '...' : '💾 Salvar'}
                                                </Button>
                                                <Button
                                                    onClick={() => handleExcluirIndividual(folhaAtiva.funcionario.id)}
                                                    disabled={submitting}
                                                    variant="secondary"
                                                    className="!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500 flex-1 sm:flex-none text-sm"
                                                >
                                                    {submitting ? '...' : '🗑️ Excluir'}
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 text-sm w-full">
                                                <div>
                                                    <span className="font-semibold">Funcionário:</span> {folhaAtiva.funcionario.nome_completo}
                                                    {modoEdicao[folhaAtiva.funcionario.id] && (
                                                        <span className="ml-2 text-xs text-orange-600 font-semibold">- Modo Edição</span>
                                                    )}
                                                </div>
                                                <div><span className="font-semibold">Empresa:</span> {folhaAtiva.empresa?.nome_empresa || folhaAtiva.dadosFolha?.empresa?.nome_empresa || 'N/A'}</div>
                                                <div><span className="font-semibold">Posto:</span> {folhaAtiva.posto_trabalho?.nome_posto || folhaAtiva.funcionario?.nome_posto || folhaAtiva.dadosFolha?.posto_trabalho?.nome_posto || 'N/A'}</div>
                                                <div><span className="font-semibold">Cargo:</span> {folhaAtiva.funcionario.cargo?.nome_cargo || folhaAtiva.funcionario?.nome_cargo || folhaAtiva.dadosFolha?.cargo?.nome_cargo || 'N/A'}</div>
                                                <div><span className="font-semibold">Escala:</span> {folhaAtiva.funcionario.cargo?.escala?.codigo_escala || folhaAtiva.funcionario?.codigo_escala || 'N/A'}</div>
                                                <div><span className="font-semibold">Período:</span> {meses[mes - 1]}/{ano}</div>
                                                <div>
                                                    <span className="font-semibold">Status:</span>{' '}
                                                    <span className={`font-semibold ${folhaAtiva.funcionario.ativo !== false ? 'text-green-600' : 'text-red-600'}`}>
                                                        {folhaAtiva.funcionario.ativo !== false ? '🟢 ATIVO' : '🔴 INATIVO'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-semibold">Funcionário Registrado:</span>{' '}
                                                    <span className={`font-semibold ${folhaAtiva.funcionario.funcionario_registrado !== false ? 'text-blue-600' : 'text-orange-600'}`}>
                                                        {folhaAtiva.funcionario.funcionario_registrado !== false ? '✅ SIM' : '❌ NÃO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {is13Salario ? (
                                    /* ========================================= */
                                    /* MODO 13º SALÁRIO - Cards simplificados   */
                                    /* ========================================= */
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                        {/* PROVENTOS 13º (Verde) */}
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <h4 className="font-semibold mb-3 text-green-800">💰 Proventos 13º Salário {mes === 13 ? '(1ª Parcela)' : '(2ª Parcela)'}</h4>
                                            <ul className="space-y-2 text-sm">
                                                {/* Campos específicos do resultado */}
                                                {(folhaAtiva.resultado.decimo_terceiro_primeira_parcela || 0) > 0 && <li className="flex justify-between"><span>13º Salário 1ª Parcela</span><span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_primeira_parcela || 0)}</span></li>}
                                                {(folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela || 0) > 0 && <li className="flex justify-between"><span>13º Salário Vantagens 1ª Parcela</span><span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela || 0)}</span></li>}
                                                {(folhaAtiva.resultado.decimo_terceiro_segunda_parcela || 0) > 0 && <li className="flex justify-between"><span>13º Salário 2ª Parcela</span><span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_segunda_parcela || 0)}</span></li>}
                                                {(folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela || 0) > 0 && <li className="flex justify-between"><span>13º Salário Vantagens 2ª Parcela</span><span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela || 0)}</span></li>}
                                                {(folhaAtiva.resultado.decimo_terceiro_integral || 0) > 0 && <li className="flex justify-between"><span>13º Salário Integral</span><span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_integral || 0)}</span></li>}
                                                {(folhaAtiva.resultado.vantagens_13 || 0) > 0 && <li className="flex justify-between"><span>Vantagens 13º</span><span>{formatarMoeda(folhaAtiva.resultado.vantagens_13 || 0)}</span></li>}
                                                {/* Eventos excepcionais de provento */}
                                                {(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
                                                    .filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR'))
                                                    .map((evento, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-green-100 px-2 py-1 rounded border border-green-300">
                                                            <span className="text-xs font-semibold">{evento.descricao}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold">{formatarMoeda(evento.valor)}</span>
                                                                {modoEdicao[folhaAtiva.funcionario.id] && (
                                                                    <>
                                                                        <button onClick={() => editarEvento(folhaAtiva.funcionario.id, evento)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">✏️</button>
                                                                        <button onClick={() => removerEvento(folhaAtiva.funcionario.id, evento)} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                            <button
                                                onClick={() => adicionarEvento(folhaAtiva.funcionario.id, 'provento')}
                                                disabled={!modoEdicao[folhaAtiva.funcionario.id]}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    modoEdicao[folhaAtiva.funcionario.id]
                                                        ? 'bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                + Adicionar Provento 13º
                                            </button>
                                            <div className="flex justify-between font-bold border-t mt-2 pt-2 text-green-700">
                                                <span>Total Proventos 13º</span>
                                                <span>{formatarMoeda(
                                                    (folhaAtiva.resultado.decimo_terceiro_primeira_parcela || 0) +
                                                    (folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela || 0) +
                                                    (folhaAtiva.resultado.decimo_terceiro_segunda_parcela || 0) +
                                                    (folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela || 0) +
                                                    (folhaAtiva.resultado.decimo_terceiro_integral || 0) +
                                                    (folhaAtiva.resultado.vantagens_13 || 0) +
                                                    (eventosExcepcionais[folhaAtiva.funcionario.id] || []).filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((s, e) => s + e.valor, 0)
                                                )}</span>
                                            </div>
                                        </div>

                                        {/* DESCONTOS 13º (Vermelho) */}
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                            <h4 className="font-semibold mb-3 text-red-800">📉 Descontos 13º Salário</h4>
                                            <ul className="space-y-2 text-sm">
                                                {(folhaAtiva.resultado.inss_13 || 0) > 0 && <li className="flex justify-between"><span>INSS 13º</span><span>-{formatarMoeda(folhaAtiva.resultado.inss_13 || 0)}</span></li>}
                                                {(folhaAtiva.resultado.adiantamento_13_salario || 0) > 0 && <li className="flex justify-between"><span>Adiantam. 13º Salário</span><span>-{formatarMoeda(folhaAtiva.resultado.adiantamento_13_salario || 0)}</span></li>}
                                                {(folhaAtiva.resultado.adiantamento_vantagens_13 || 0) > 0 && <li className="flex justify-between"><span>Adiantam. Vantagens 13º</span><span>-{formatarMoeda(folhaAtiva.resultado.adiantamento_vantagens_13 || 0)}</span></li>}
                                                {(folhaAtiva.resultado.inss_ferias || 0) > 0 && <li className="flex justify-between"><span>INSS Férias</span><span>-{formatarMoeda(folhaAtiva.resultado.inss_ferias || 0)}</span></li>}
                                                {/* Eventos excepcionais de desconto */}
                                                {(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
                                                    .filter(e => e.tipo === 'desconto')
                                                    .map((evento, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-red-100 px-2 py-1 rounded border border-red-300">
                                                            <span className="text-xs font-semibold">{evento.descricao}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold">-{formatarMoeda(evento.valor)}</span>
                                                                {modoEdicao[folhaAtiva.funcionario.id] && (
                                                                    <>
                                                                        <button onClick={() => editarEvento(folhaAtiva.funcionario.id, evento)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">✏️</button>
                                                                        <button onClick={() => removerEvento(folhaAtiva.funcionario.id, evento)} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                            <button
                                                onClick={() => adicionarEvento(folhaAtiva.funcionario.id, 'desconto')}
                                                disabled={!modoEdicao[folhaAtiva.funcionario.id]}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    modoEdicao[folhaAtiva.funcionario.id]
                                                        ? 'bg-red-200 hover:bg-red-300 text-red-800 cursor-pointer'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                + Adicionar Desconto 13º
                                            </button>
                                            <div className="flex justify-between font-bold border-t mt-2 pt-2 text-red-700">
                                                <span>Total Descontos 13º</span>
                                                <span>-{formatarMoeda(
                                                    (folhaAtiva.resultado.inss_13 || 0) +
                                                    (folhaAtiva.resultado.adiantamento_13_salario || 0) +
                                                    (folhaAtiva.resultado.adiantamento_vantagens_13 || 0) +
                                                    (folhaAtiva.resultado.inss_ferias || 0) +
                                                    (eventosExcepcionais[folhaAtiva.funcionario.id] || []).filter(e => e.tipo === 'desconto').reduce((s, e) => s + e.valor, 0)
                                                )}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                        {/* SALÁRIOS (Verde) */}
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <h4 className="font-semibold mb-3 text-green-800">💰 Salários</h4>
                                            <ul className="space-y-2 text-sm">
                                                <li className="flex justify-between"><span>Salário</span><span>{formatarMoeda(folhaAtiva.resultado.salario_base)}</span></li>
                                                {folhaAtiva.resultado.horas_extras_50 > 0 && <li className="flex justify-between"><span>Hora Extra 50%</span><span>{formatarMoeda(folhaAtiva.resultado.horas_extras_50)}</span></li>}
                                                {folhaAtiva.resultado.intrajornada_50 > 0 && <li className="flex justify-between"><span>Intrajornada 50%</span><span>{formatarMoeda(folhaAtiva.resultado.intrajornada_50)}</span></li>}
                                                {folhaAtiva.resultado.horas_extras_100 > 0 && <li className="flex justify-between"><span>Hora Extra 100%</span><span>{formatarMoeda(folhaAtiva.resultado.horas_extras_100)}</span></li>}
                                                {folhaAtiva.resultado.intrajornada_100 > 0 && <li className="flex justify-between"><span>Intrajornada 100%</span><span>{formatarMoeda(folhaAtiva.resultado.intrajornada_100)}</span></li>}
                                                {folhaAtiva.resultado.dsr_horas_extras > 0 && <li className="flex justify-between"><span>D.S.R. s/ H. Extras</span><span>{formatarMoeda(folhaAtiva.resultado.dsr_horas_extras)}</span></li>}
                                                {folhaAtiva.resultado.adicional_noturno > 0 && <li className="flex justify-between"><span>Adicional Noturno</span><span>{formatarMoeda(folhaAtiva.resultado.adicional_noturno)}</span></li>}
                                                {folhaAtiva.resultado.dsr_adicional_noturno > 0 && <li className="flex justify-between"><span>D.S.R. s/ Adicional Noturno</span><span>{formatarMoeda(folhaAtiva.resultado.dsr_adicional_noturno)}</span></li>}
                                                {folhaAtiva.resultado.salario_familia > 0 && <li className="flex justify-between"><span>Salário-Família</span><span>{formatarMoeda(folhaAtiva.resultado.salario_familia)}</span></li>}
                                                {folhaAtiva.resultado.adicional_insalubridade > 0 && <li className="flex justify-between"><span>Adicional Insalubridade</span><span>{formatarMoeda(folhaAtiva.resultado.adicional_insalubridade)}</span></li>}
                                                {folhaAtiva.resultado.adicional_acumulo_funcao > 0 && <li className="flex justify-between"><span>Acúmulo de Função</span><span>{formatarMoeda(folhaAtiva.resultado.adicional_acumulo_funcao)}</span></li>}
                                                {/* ⭐ TODOS OS EVENTOS EXCEPCIONAIS - PROVENTOS (exceto PLR e FT que agora são benefícios) */}
                                                {(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
                                                    .filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR') && !e.descricao.includes('FT ('))
                                                    .map((evento, idx) => {
                                                        // Definir cores baseadas no tipo de evento
                                                        let bgColor = 'bg-green-100';
                                                        let borderColor = 'border-green-300';
                                                        
                                                        // Eventos de rescisão - azul
                                                        if (evento.descricao.includes('Rescisão')) {
                                                            bgColor = 'bg-blue-100';
                                                            borderColor = 'border-blue-300';
                                                        }
                                                        // Serviços externos - roxo
                                                        else if (evento.descricao.includes('Serviços Externos')) {
                                                            bgColor = 'bg-purple-100';
                                                            borderColor = 'border-purple-300';
                                                        }
                                                        // 13º salário e FT - verde claro
                                                        else if (evento.descricao.includes('13º Salário') || evento.descricao.includes('FT (')) {
                                                            bgColor = 'bg-green-100';
                                                            borderColor = 'border-green-300';
                                                        }
                                                        
                                                        return (
                                                            <li key={idx} className={`flex justify-between items-center ${bgColor} px-2 py-1 rounded border ${borderColor}`}>
                                                                <span className="text-xs font-semibold">{evento.descricao}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">{formatarMoeda(evento.valor)}</span>
                                                                    {modoEdicao[folhaAtiva.funcionario.id] && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => editarEvento(folhaAtiva.funcionario.id, evento)}
                                                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                                                                title="Editar valor"
                                                                            >
                                                                                ✏️
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removerEvento(folhaAtiva.funcionario.id, evento)}
                                                                                className="text-red-600 hover:text-red-800 text-xs"
                                                                                title="Remover"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                {/* ⭐ CAMPOS ESPECÍFICOS REMOVIDOS - Todos os eventos são exibidos na lista unificada acima */}
                                                
                                                {/* ⭐ CAMPOS ESPECÍFICOS REMOVIDOS - Agora são exibidos apenas como eventos excepcionais */}
                                                
                                                {/* Complemento de Salário (automático quando salário fica negativo) */}
                                                {(() => {
                                                    // ⭐ USAR EVENTOS DO ESTADO com faixa VT
                                                    const eventosAtuais = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
                                                    const totais = calcularTotaisComEventos(folhaAtiva.funcionario.id, folhaAtiva.resultado, eventosAtuais, undefined, folhaAtiva.funcionario);
                                                    return totais.complementoSalario > 0 && (
                                                        <li className="flex justify-between items-center bg-yellow-100 px-2 py-1 rounded border border-yellow-300">
                                                            <span className="text-xs font-semibold">Complemento de Salário</span>
                                                            <span className="font-semibold">{formatarMoeda(totais.complementoSalario)}</span>
                                                        </li>
                                                    );
                                                })()}
                                            </ul>
                                            <button
                                                onClick={() => adicionarEvento(folhaAtiva.funcionario.id, 'provento')}
                                                disabled={!modoEdicao[folhaAtiva.funcionario.id]}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    modoEdicao[folhaAtiva.funcionario.id]
                                                        ? 'bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                + Adicionar Provento Excepcional
                                            </button>
                                            <div className="flex justify-between font-bold border-t mt-2 pt-2 text-green-700">
                                                <span>Total Salários</span>
                                                <span>{formatarMoeda(calcularTotaisComEventos(folhaAtiva.funcionario.id, folhaAtiva.resultado, eventosExcepcionais[folhaAtiva.funcionario.id] || [], undefined, folhaAtiva.funcionario).totalProventos)}</span>
                                            </div>
                                        </div>

                                        {/* DESCONTOS (Vermelho) */}
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                            <h4 className="font-semibold mb-3 text-red-800">📉 Descontos</h4>
                                            <ul className="space-y-2 text-sm">
                                                {folhaAtiva.resultado.desconto_seguro_vida > 0 && <li className="flex justify-between"><span>Seguro de Vida em Grupo</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_seguro_vida)}</span></li>}
                                                {folhaAtiva.resultado.desconto_convenio_odonto > 0 && <li className="flex justify-between"><span>Convênio Odontológico</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_convenio_odonto)}</span></li>}
                                                {folhaAtiva.resultado.desconto_contribuicao_assistencial > 0 && <li className="flex justify-between"><span>Contrib. Assistencial</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_contribuicao_assistencial)}</span></li>}
                                                {/* Adiantamentos VR e VT / Vales Avulsos - adicionar quando disponível */}
                                                {folhaAtiva.resultado.desconto_faltas > 0 && <li className="flex justify-between"><span>Faltas Injustificadas</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_faltas)}</span></li>}
                                                {(folhaAtiva.resultado as any).desconto_dsr_faltas > 0 && <li className="flex justify-between"><span>DSR s/ Faltas</span><span>-{formatarMoeda((folhaAtiva.resultado as any).desconto_dsr_faltas)}</span></li>}
                                                {/* Taxa Sindical PLR - adicionar quando disponível */}
                                                {/* Pensão Alimenticia - adicionar quando disponível */}
                                                {folhaAtiva.resultado.desconto_vt > 0 && <li className="flex justify-between"><span>Desc. Vale Transporte</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_vt)}</span></li>}
                                                {folhaAtiva.resultado.desconto_atrasos > 0 && <li className="flex justify-between"><span>Faltas e Atrasos (T / H)</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_atrasos)}</span></li>}
                                                {folhaAtiva.resultado.desconto_adiantamento_quinzenal > 0 && <li className="flex justify-between"><span>Desc. Adiantam. Quinzenal</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_adiantamento_quinzenal)}</span></li>}
                                                {folhaAtiva.resultado.desconto_adiantamento_salario > 0 && (
                                                    <li className="flex justify-between items-center">
                                                        <span>Adiantam. de Salário</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>-{formatarMoeda(folhaAtiva.resultado.desconto_adiantamento_salario)}</span>
                                                            {modoEdicao[folhaAtiva.funcionario.id] && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            const novoValor = prompt('Novo valor para Adiantam. de Salário:', String(folhaAtiva.resultado.desconto_adiantamento_salario));
                                                                            if (novoValor !== null) {
                                                                                const valor = parseFloat(novoValor.replace(',', '.'));
                                                                                if (!isNaN(valor) && valor >= 0) {
                                                                                    setTodasFolhas(prev => prev.map(f => {
                                                                                        if (f.funcionario.id === folhaAtiva.funcionario.id) {
                                                                                            return {
                                                                                                ...f,
                                                                                                resultado: {
                                                                                                    ...f.resultado,
                                                                                                    desconto_adiantamento_salario: valor
                                                                                                }
                                                                                            };
                                                                                        }
                                                                                        return f;
                                                                                    }));
                                                                                    showToast('Adiantam. de Salário atualizado!', 'success');
                                                                                } else {
                                                                                    showToast('Valor inválido', 'error');
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                                                        title="Editar valor"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setTodasFolhas(prev => prev.map(f => {
                                                                                if (f.funcionario.id === folhaAtiva.funcionario.id) {
                                                                                    return {
                                                                                        ...f,
                                                                                        resultado: {
                                                                                            ...f.resultado,
                                                                                            desconto_adiantamento_salario: 0
                                                                                        }
                                                                                    };
                                                                                }
                                                                                return f;
                                                                            }));
                                                                            // Também remover do array de eventos excepcionais
                                                                            setEventosExcepcionais(prev => ({
                                                                                ...prev,
                                                                                [folhaAtiva.funcionario.id]: (prev[folhaAtiva.funcionario.id] || []).filter(
                                                                                    e => e.descricao !== 'Adiantam. de Salário'
                                                                                )
                                                                            }));
                                                                            showToast('Adiantam. de Salário removido!', 'success');
                                                                        }}
                                                                        className="text-red-600 hover:text-red-800 text-xs"
                                                                        title="Remover"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </li>
                                                )}
                                                {/* Outros Descontos - adicionar quando disponível */}
                                                {folhaAtiva.resultado.desconto_inss > 0 && <li className="flex justify-between"><span>INSS</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_inss)}</span></li>}
                                                {folhaAtiva.resultado.desconto_irrf > 0 && <li className="flex justify-between"><span>IRRF</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_irrf)}</span></li>}
                                                {folhaAtiva.resultado.desconto_contribuicao_assistencial > 0 && <li className="flex justify-between"><span>Contribuição Assistencial</span><span>-{formatarMoeda(folhaAtiva.resultado.desconto_contribuicao_assistencial)}</span></li>}
                                                {/* ⭐ TODOS OS EVENTOS EXCEPCIONAIS - DESCONTOS */}
                                                {/* Excluir "Adiantam. de Salário" se já existe no campo específico para evitar duplicação */}
                                                {(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
                                                    .filter(e => {
                                                        if (e.tipo !== 'desconto') return false;
                                                        // Se é "Adiantam. de Salário" e já existe no campo específico, não exibir
                                                        if (e.descricao === 'Adiantam. de Salário' && folhaAtiva.resultado.desconto_adiantamento_salario > 0) {
                                                            return false;
                                                        }
                                                        return true;
                                                    })
                                                    .map((evento, idx) => {
                                                        // Definir cores baseadas no tipo de evento
                                                        let bgColor = 'bg-red-100';
                                                        let borderColor = 'border-red-300';
                                                        
                                                        // Eventos específicos - vermelho mais escuro
                                                        if (evento.descricao.includes('Avaria') || evento.descricao.includes('Rondas') || evento.descricao.includes('PLR')) {
                                                            bgColor = 'bg-red-200';
                                                            borderColor = 'border-red-400';
                                                        }
                                                        
                                                        return (
                                                            <li key={idx} className={`flex justify-between items-center ${bgColor} px-2 py-1 rounded border ${borderColor}`}>
                                                                <span className="text-xs font-semibold">{evento.descricao}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">-{formatarMoeda(evento.valor)}</span>
                                                                    {modoEdicao[folhaAtiva.funcionario.id] && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => editarEvento(folhaAtiva.funcionario.id, evento)}
                                                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                                                                title="Editar valor"
                                                                            >
                                                                                ✏️
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removerEvento(folhaAtiva.funcionario.id, evento)}
                                                                                className="text-red-600 hover:text-red-800 text-xs"
                                                                                title="Remover"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                            </ul>
                                            <button
                                                onClick={() => adicionarEvento(folhaAtiva.funcionario.id, 'desconto')}
                                                disabled={!modoEdicao[folhaAtiva.funcionario.id]}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    modoEdicao[folhaAtiva.funcionario.id]
                                                        ? 'bg-red-200 hover:bg-red-300 text-red-800 cursor-pointer'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                + Adicionar Desconto Excepcional
                                            </button>
                                            <div className="flex justify-between font-bold border-t mt-2 pt-2 text-red-700">
                                                <span>Total Descontos</span>
                                                <span>-{formatarMoeda(calcularTotaisComEventos(folhaAtiva.funcionario.id, folhaAtiva.resultado, eventosExcepcionais[folhaAtiva.funcionario.id] || [], undefined, folhaAtiva.funcionario).totalDescontos)}</span>
                                            </div>
                                        </div>

                                        {/* BENEFÍCIOS (Azul) */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            {(() => {
                                                const funcId = folhaAtiva.funcionario.id;
                                                const undoStack = beneficiosUndo[funcId] || [];
                                                const redoStack = beneficiosRedo[funcId] || [];
                                                return (
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h4 className="font-semibold text-blue-800">🎁 Benefícios</h4>
                                                        {modoEdicao[funcId] && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => undoBeneficios(funcId)}
                                                                    disabled={undoStack.length === 0}
                                                                    className={`text-xs px-2 py-0.5 rounded border ${undoStack.length === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-blue-100 text-blue-700 border-blue-300'}`}
                                                                    title="Desfazer"
                                                                >↶ Desfazer</button>
                                                                <button
                                                                    onClick={() => redoBeneficios(funcId)}
                                                                    disabled={redoStack.length === 0}
                                                                    className={`text-xs px-2 py-0.5 rounded border ${redoStack.length === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-blue-100 text-blue-700 border-blue-300'}`}
                                                                    title="Refazer"
                                                                >↷ Refazer</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <ul className="space-y-2 text-sm">
                                                {(() => {
                                                    const editavel = !!modoEdicao[folhaAtiva.funcionario.id];
                                                    const editarCampo = (campo: string, label: string, valorAtual: number) => {
                                                        const novoValor = prompt(`Novo valor para ${label}:`, String(valorAtual ?? 0));
                                                        if (novoValor === null) return;
                                                        const valor = parseFloat(novoValor.replace(',', '.'));
                                                        if (isNaN(valor) || valor < 0) { showToast('Valor inválido', 'error'); return; }
                                                        snapshotBeneficios(folhaAtiva.funcionario.id);
                                                        setTodasFolhas(prev => prev.map(f => f.funcionario.id === folhaAtiva.funcionario.id
                                                            ? { ...f, resultado: { ...f.resultado, [campo]: valor } } : f));
                                                        showToast(`${label} atualizado!`, 'success');
                                                    };
                                                    const limparCampo = (campo: string, label: string) => {
                                                        confirmarExclusaoBeneficio(`Tem certeza que deseja remover "${label}"?`, () => {
                                                            snapshotBeneficios(folhaAtiva.funcionario.id);
                                                            setTodasFolhas(prev => prev.map(f => f.funcionario.id === folhaAtiva.funcionario.id
                                                                ? { ...f, resultado: { ...f.resultado, [campo]: 0 } } : f));
                                                            showToast(`${label} removido!`, 'success');
                                                        });
                                                    };
                                                    const removerEventoBenef = (evento: EventoExcepcional) => {
                                                        confirmarExclusaoBeneficio(`Tem certeza que deseja remover "${evento.descricao}"?`, () => {
                                                            snapshotBeneficios(folhaAtiva.funcionario.id);
                                                            removerEvento(folhaAtiva.funcionario.id, evento);
                                                        });
                                                    };
                                                    const editarEventoBenef = (evento: EventoExcepcional) => {
                                                        snapshotBeneficios(folhaAtiva.funcionario.id);
                                                        editarEvento(folhaAtiva.funcionario.id, evento);
                                                    };
                                                    const linha = (campo: string, label: string, valor: number, opts?: { destaque?: boolean; negativo?: boolean; className?: string }) => valor > 0 && (
                                                        <li className={`flex justify-between items-center ${opts?.destaque ? 'bg-yellow-50 px-2 py-1 rounded border border-yellow-200 font-semibold' : ''} ${opts?.negativo ? 'text-red-600' : ''} ${opts?.className || ''}`}>
                                                            <span>{label}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span>{opts?.negativo ? '-' : ''}{formatarMoeda(valor)}</span>
                                                                {editavel && (
                                                                    <>
                                                                        <button onClick={() => editarCampo(campo, label, valor)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">✏️</button>
                                                                        <button onClick={() => limparCampo(campo, label)} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                    const eventos = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
                                                    const eventosPLR = eventos.filter(e => e.tipo === 'provento' && e.descricao.includes('PLR'));
                                                    const valorFT = folhaAtiva.resultado.folga_trabalhada || 0;
                                                    const cargoUpper = (folhaAtiva.funcionario?.nome_cargo || folhaAtiva.funcionario?.cargo?.nome_cargo || '').toUpperCase();
                                                    let diariaFT = 0;
                                                    if (cargoUpper.includes('VIGIA') || cargoUpper.includes('VIGILANTE')) diariaFT = Number((parametros?.[0] as any)?.ft_diaria_vigia || 0);
                                                    else if (cargoUpper.includes('LIMPEZA') || cargoUpper.includes('AUXILIAR')) diariaFT = Number((parametros?.[0] as any)?.ft_diaria_aux_limpeza || 0);
                                                    else if (cargoUpper.includes('ZELADOR')) diariaFT = Number((parametros?.[0] as any)?.ft_diaria_zelador || 0);
                                                    const qtdFT = diariaFT > 0 ? Math.round(valorFT / diariaFT) : 0;
                                                    const valorDescAjusteEvento = eventos
                                                        .filter(e => e.tipo === 'beneficio' && e.descricao === 'Desc. Ajuste dos Benefícios')
                                                        .reduce((sum, e) => sum + Math.abs(e.valor), 0);
                                                    const valorDescAjuste = Math.abs(folhaAtiva.resultado.desc_ajuste_beneficios || 0) || valorDescAjusteEvento;
                                                    const eventosReembolsos = eventos.filter(e => e.tipo === 'beneficio' && e.descricao === 'Reembolsos');
                                                    const valorReembolsos = eventosReembolsos.reduce((sum, e) => sum + e.valor, 0);

                                                    return (
                                                        <>
                                                            {linha('vale_transporte_mes_anterior', `Vale Transporte (${meses[mes - 1]})`, folhaAtiva.resultado.vale_transporte_mes_anterior, { destaque: true })}
                                                            {linha('vale_alimentacao_mes_anterior', `Vale Alimentação (${meses[mes - 1]})`, folhaAtiva.resultado.vale_alimentacao_mes_anterior, { destaque: true })}
                                                            {linha('vale_transporte', `Vale Transporte (${meses[(mes % 12)]})`, folhaAtiva.resultado.vale_transporte)}
                                                            {linha('vale_alimentacao', `Vale Alimentação (${meses[(mes % 12)]})`, folhaAtiva.resultado.vale_alimentacao)}
                                                            {linha('cesta_basica', 'Cesta Básica', folhaAtiva.resultado.cesta_basica)}
                                                            {linha('plr', 'PLR', folhaAtiva.resultado.plr)}
                                                            {eventosPLR.map((evento, idx) => (
                                                                <li key={`plr-${idx}`} className="flex justify-between items-center bg-purple-100 px-2 py-1 rounded border border-purple-300">
                                                                    <span className="text-xs font-semibold">{evento.descricao}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold">{formatarMoeda(evento.valor)}</span>
                                                                        {editavel && (
                                                                            <>
                                                                                <button onClick={() => editarEventoBenef(evento)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar valor">✏️</button>
                                                                                <button onClick={() => removerEventoBenef(evento)} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                            {linha('premio_permanencia', 'Prêmio Permanência', folhaAtiva.resultado.premio_permanencia)}
                                                            {valorFT > 0 && (
                                                                <li className="flex justify-between items-center bg-amber-50 px-2 py-1 rounded border border-amber-300">
                                                                    <span className="font-semibold text-amber-700">
                                                                        Folga(s) Trabalhada(s){qtdFT > 0 ? ` — ${qtdFT} ${qtdFT === 1 ? 'diária' : 'diárias'}` : ''}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-amber-700">{formatarMoeda(valorFT)}</span>
                                                                        {editavel && (
                                                                            <>
                                                                                <button onClick={() => editarCampo('folga_trabalhada', 'Folga Trabalhada', valorFT)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">✏️</button>
                                                                                <button onClick={() => limparCampo('folga_trabalhada', 'Folga Trabalhada')} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            )}
                                                            {linha('desconto_vt_faltas', 'Desc. VT por Faltas', folhaAtiva.resultado.desconto_vt_faltas, { negativo: true })}
                                                            {linha('desconto_va_faltas', 'Desc. VA por Faltas', folhaAtiva.resultado.desconto_va_faltas, { negativo: true })}
                                                            {linha('desc_ajuste_beneficios', 'Desc. Ajuste dos Benefícios', valorDescAjuste, { negativo: true })}
                                                            {eventos
                                                                .filter(e => e.tipo === 'beneficio' && !(
                                                                    e.descricao === 'Reembolsos' ||
                                                                    e.descricao === 'Desc. Ajuste dos Benefícios'
                                                                ))
                                                                .map((evento, idx) => (
                                                                    <li key={idx} className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded">
                                                                        <span className="text-xs">{evento.descricao}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{formatarMoeda(evento.valor)}</span>
                                                                            {editavel && (
                                                                                <>
                                                                                    <button onClick={() => editarEventoBenef(evento)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar valor">✏️</button>
                                                                                    <button onClick={() => removerEventoBenef(evento)} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            {valorReembolsos > 0 && (
                                                                <li className="flex justify-between items-center bg-orange-100 px-2 py-1 rounded border border-orange-300">
                                                                    <span className="text-xs font-semibold">Reembolsos</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold">{formatarMoeda(valorReembolsos)}</span>
                                                                        {editavel && eventosReembolsos.length > 0 && (
                                                                            <>
                                                                                <button onClick={() => editarEventoBenef(eventosReembolsos[0])} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar valor">✏️</button>
                                                                                <button onClick={() => removerEventoBenef(eventosReembolsos[0])} className="text-red-600 hover:text-red-800 text-xs" title="Remover">✕</button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </ul>
                                            <button
                                                onClick={() => adicionarEvento(folhaAtiva.funcionario.id, 'beneficio')}
                                                disabled={!modoEdicao[folhaAtiva.funcionario.id]}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    modoEdicao[folhaAtiva.funcionario.id]
                                                        ? 'bg-blue-200 hover:bg-blue-300 text-blue-800 cursor-pointer'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                + Adicionar Benefício Excepcional
                                            </button>
                                            <div className="flex justify-between font-bold border-t mt-2 pt-2 text-blue-700">
                                                <span>Total Benefícios</span>
                                                <span>{formatarMoeda(calcularTotaisComEventos(folhaAtiva.funcionario.id, folhaAtiva.resultado, eventosExcepcionais[folhaAtiva.funcionario.id] || [], undefined, folhaAtiva.funcionario).totalBeneficios
                                                )}</span>
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    <div className="mt-6 lg:mt-8 pt-4 border-t-2 border-gray-200">
                                        {is13Salario ? (() => {
                                            const eventosAtuais = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
                                            const totalProventos13 =
                                                (folhaAtiva.resultado.decimo_terceiro_primeira_parcela || 0) +
                                                (folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela || 0) +
                                                (folhaAtiva.resultado.decimo_terceiro_segunda_parcela || 0) +
                                                (folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela || 0) +
                                                (folhaAtiva.resultado.decimo_terceiro_integral || 0) +
                                                (folhaAtiva.resultado.vantagens_13 || 0) +
                                                eventosAtuais.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')).reduce((s, e) => s + e.valor, 0);
                                            const totalDescontos13 =
                                                (folhaAtiva.resultado.inss_13 || 0) +
                                                (folhaAtiva.resultado.adiantamento_13_salario || 0) +
                                                (folhaAtiva.resultado.adiantamento_vantagens_13 || 0) +
                                                (folhaAtiva.resultado.inss_ferias || 0) +
                                                eventosAtuais.filter(e => e.tipo === 'desconto').reduce((s, e) => s + e.valor, 0);
                                            const liquido13 = totalProventos13 - totalDescontos13;
                                            return (
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <span className="text-base sm:text-xl font-bold">Líquido 13º Salário:</span>
                                                    <span className="text-xl sm:text-3xl font-bold text-blue-800">{formatarMoeda(liquido13)}</span>
                                                </div>
                                            );
                                        })() : (() => {
                                            const eventosAtuais = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
                                            const totais = calcularTotaisComEventos(folhaAtiva.funcionario.id, folhaAtiva.resultado, eventosAtuais, undefined, folhaAtiva.funcionario);
                                            const salarioLiquidoSemBeneficios = totais.totalProventos - totais.totalDescontos;
                                            return (
                                                <>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                        <span className="text-base sm:text-xl font-bold">Salário Líquido a Receber:</span>
                                                        <span className="text-xl sm:text-3xl font-bold text-blue-800">{formatarMoeda(salarioLiquidoSemBeneficios)}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3">
                                                        <span className="text-base sm:text-lg font-semibold text-green-700">Benefícios:</span>
                                                        <span className="text-lg sm:text-2xl font-semibold text-green-700">{formatarMoeda(totais.totalBeneficios)}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {(eventosExcepcionais[folhaAtiva.funcionario.id] || []).length > 0 && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                * Inclui {(eventosExcepcionais[folhaAtiva.funcionario.id] || []).length} evento(s) excepcional(is)
                                            </div>
                                        )}
                                    </div>

                                    {!is13Salario && (
                                    <div className="mt-6 pt-4 border-t border-gray-200 bg-gray-50 p-3 lg:p-4 rounded">
                                        <h4 className="font-semibold mb-3 text-gray-700 text-sm lg:text-base">Bases de Cálculo e Encargos (Informativo)</h4>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 text-xs lg:text-sm pb-3 border-b border-gray-300">
                                                <div className="flex justify-between"><span className="font-medium text-gray-600">Base INSS:</span><span className="font-semibold">{formatarMoeda(folhaAtiva.resultado.base_inss || folhaAtiva.resultado.salario_base)}</span></div>
                                                <div className="flex justify-between"><span className="font-medium text-gray-600">Base IRRF:</span><span className="font-semibold">{formatarMoeda(folhaAtiva.resultado.base_irrf || (folhaAtiva.resultado.salario_base - folhaAtiva.resultado.desconto_inss))}</span></div>
                                                <div className="flex justify-between"><span className="font-medium text-gray-600">Base FGTS:</span><span className="font-semibold">{formatarMoeda(folhaAtiva.resultado.base_fgts || folhaAtiva.resultado.salario_base)}</span></div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-xs lg:text-sm">
                                                <div className="flex justify-between"><span className="font-medium text-gray-600">FGTS (8%):</span><span className="font-semibold text-blue-700">{formatarMoeda(folhaAtiva.resultado.fgts)}</span></div>
                                                <div className="flex justify-between"><span className="font-medium text-gray-600">INSS Patronal:</span><span className="font-semibold text-blue-700">{formatarMoeda(folhaAtiva.resultado.inss_patronal)}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    {!is13Salario && (
                                    <>
                                    {/* Relatório Detalhado para Conferência */}
                                    <div className="mt-6 pt-4 border-t-2 border-blue-300 bg-blue-50 p-3 lg:p-4 rounded">
                                        <h4 className="font-semibold mb-3 text-blue-800 text-base lg:text-lg">📊 Relatório Detalhado (Conferência)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-sm">
                                            {/* Dias - Mês Atual */}
                                            <div className="bg-white p-3 rounded shadow-sm">
                                                <div className="font-semibold text-gray-600 mb-2">📅 Dias (Mês Atual)</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between"><span>Dias Corridos:</span><span className="font-semibold">{(() => {
                                                        const anoFolha = folhaAtiva.dadosFolha?.ano || ano;
                                                        const mesFolha = folhaAtiva.dadosFolha?.mes || mes;
                                                        return new Date(anoFolha, mesFolha, 0).getDate();
                                                    })()}</span></div>
                                                    <div className="flex justify-between"><span>Dias Trabalhados:</span><span className="font-semibold">{(() => {
                                                        const dadosDias = folhaAtiva.dadosFolha?.dados_dias;
                                                        if (!dadosDias) return 0;
                                                        const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                                                        return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                                                    })()}</span></div>
                                                    <div className="flex justify-between"><span>Dias Úteis:</span><span className="font-semibold">{(() => {
                                                        const anoFolha = folhaAtiva.dadosFolha?.ano || ano;
                                                        const mesFolha = folhaAtiva.dadosFolha?.mes || mes;
                                                        const primeiroDia = new Date(anoFolha, mesFolha - 1, 1);
                                                        const ultimoDia = new Date(anoFolha, mesFolha, 0);
                                                        let diasUteis = 0;
                                                        for (let dia = new Date(primeiroDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
                                                            if (dia.getDay() !== 0) diasUteis++;
                                                        }
                                                        const dadosDias = folhaAtiva.dadosFolha?.dados_dias;
                                                        let feriadosNaoDomingo = 0;
                                                        if (dadosDias) {
                                                            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                                                            Object.entries(dados).forEach(([diaNum, d]: [string, any]) => {
                                                                if (d.feriado) {
                                                                    const diaData = new Date(anoFolha, mesFolha - 1, parseInt(diaNum.replace('dia_', '')));
                                                                    if (diaData.getDay() !== 0) feriadosNaoDomingo++;
                                                                }
                                                            });
                                                        }
                                                        return diasUteis - feriadosNaoDomingo;
                                                    })()}</span></div>
                                                    <div className="flex justify-between"><span>Dias Não Úteis:</span><span className="font-semibold">{(() => {
                                                        const anoFolha = folhaAtiva.dadosFolha?.ano || ano;
                                                        const mesFolha = folhaAtiva.dadosFolha?.mes || mes;
                                                        const primeiroDia = new Date(anoFolha, mesFolha - 1, 1);
                                                        const ultimoDia = new Date(anoFolha, mesFolha, 0);
                                                        let domingos = 0;
                                                        for (let dia = new Date(primeiroDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
                                                            if (dia.getDay() === 0) domingos++;
                                                        }
                                                        const dadosDias = folhaAtiva.dadosFolha?.dados_dias;
                                                        let feriadosNaoDomingo = 0;
                                                        if (dadosDias) {
                                                            const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                                                            Object.entries(dados).forEach(([diaNum, d]: [string, any]) => {
                                                                if (d.feriado) {
                                                                    const diaData = new Date(anoFolha, mesFolha - 1, parseInt(diaNum.replace('dia_', '')));
                                                                    if (diaData.getDay() !== 0) feriadosNaoDomingo++;
                                                                }
                                                            });
                                                        }
                                                        return domingos + feriadosNaoDomingo;
                                                    })()}</span></div>
                                                </div>
                                            </div>

                                            {/* Dias - Mês Seguinte (VA/VT) */}
                                            <div className="bg-white p-3 rounded shadow-sm">
                                                <div className="font-semibold text-gray-600 mb-2">📅 Dias (Mês Seguinte)</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between"><span>Dias a Trabalhar (VA):</span><span className="font-semibold">{folhaAtiva.escalaMensalProximoMes?.diasVA || '-'}</span></div>
                                                    <div className="flex justify-between"><span>Dias a Trabalhar (VT):</span><span className="font-semibold">{folhaAtiva.escalaMensalProximoMes?.diasVT || '-'}</span></div>
                                                    <div className="text-xs text-gray-500 mt-2">
                                                        VA: apenas dias ≥6h<br/>
                                                        VT: todos os dias trabalhados
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Horas */}
                                            <div className="bg-white p-3 rounded shadow-sm">
                                                <div className="font-semibold text-gray-600 mb-2">⏰ Horas</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>HE 50%:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_horas_extras_50 || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Intrajornada 50%:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_intrajornada_50 || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>HE 100%:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_horas_extras_100 || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Intrajornada 100%:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_intrajornada_100 || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Adicional Noturno:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_horas_noturnas || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Atrasos/Saídas:</span>
                                                        <span className="font-semibold">
                                                            {((folhaAtiva.dadosFolha?.total_atrasos || 0)).toFixed(2)}h
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Faltas e Outros */}
                                            <div className="bg-white p-3 rounded shadow-sm">
                                                <div className="font-semibold text-gray-600 mb-2">📋 Faltas e Outros</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Faltas Justificadas:</span>
                                                        <button
                                                            onClick={() => {
                                                                if ((folhaAtiva.dadosFolha?.total_faltas_justificadas || 0) > 0) {
                                                                    setTipoFaltaModal('justificadas');
                                                                    setMostrarModalFaltas(true);
                                                                }
                                                            }}
                                                            className={`font-semibold ${(folhaAtiva.dadosFolha?.total_faltas_justificadas || 0) > 0 ? 'text-blue-600 hover:text-blue-800 cursor-pointer underline' : ''}`}
                                                            disabled={(folhaAtiva.dadosFolha?.total_faltas_justificadas || 0) === 0}
                                                        >
                                                            {folhaAtiva.dadosFolha?.total_faltas_justificadas || 0}
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Faltas Injustificadas:</span>
                                                        <button
                                                            onClick={() => {
                                                                if ((folhaAtiva.dadosFolha?.total_faltas_injustificadas || 0) > 0) {
                                                                    setTipoFaltaModal('injustificadas');
                                                                    setMostrarModalFaltas(true);
                                                                }
                                                            }}
                                                            className={`font-semibold ${(folhaAtiva.dadosFolha?.total_faltas_injustificadas || 0) > 0 ? 'text-blue-600 hover:text-blue-800 cursor-pointer underline' : ''}`}
                                                            disabled={(folhaAtiva.dadosFolha?.total_faltas_injustificadas || 0) === 0}
                                                        >
                                                            {folhaAtiva.dadosFolha?.total_faltas_injustificadas || 0}
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Filhos {'<'} 14 anos:</span>
                                                        <span className="font-semibold">
                                                            {folhaAtiva.funcionario?.quantidade_filhos || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Observações */}
                                            <div className="bg-white p-3 rounded shadow-sm lg:col-span-2">
                                                <div className="font-semibold text-gray-600 mb-2">📝 Observações</div>
                                                <div className="space-y-2">                                                   
                                                    {modoEdicao[folhaAtiva.funcionario.id] ? (
                                                        <div>
                                                            <textarea
                                                                value={observacoes[folhaAtiva.funcionario.id] || ''}
                                                                onChange={(e) => {
                                                                    const novoValor = e.target.value;
                                                                    setObservacoes(prev => {
                                                                        const novoEstado = {
                                                                            ...prev,
                                                                            [folhaAtiva.funcionario.id]: novoValor
                                                                        };
                                                                        return novoEstado;
                                                                    });
                                                                }}
                                                                onFocus={() => console.log('📝 Textarea focado')}
                                                                onBlur={() => console.log('📝 Textarea desfocado')}
                                                                placeholder="Digite observações sobre esta folha de pagamento..."
                                                                className="w-full p-2 border-2 border-blue-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                rows={3}
                                                                style={{ minHeight: '80px' }}
                                                            />
                                                            <div className="text-xs text-green-600 mt-1 font-medium">
                                                                ✏️ Modo edição ativo - Campo habilitado para digitação
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="text-sm text-gray-700 min-h-[80px] p-2 bg-gray-50 rounded border">
                                                                {observacoes[folhaAtiva.funcionario.id] || 'Nenhuma observação registrada.'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                👁️ Modo visualização - Clique em "Editar" para modificar
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    </>
                                    )}

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {/* BOTÕES DE VISUALIZAÇÃO - COMENTADOS TEMPORARIAMENTE (podem ser reimplantados no futuro) */}
                                        {/* 
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaHolerite(folha);
                                                    setMostrarHolerite(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Visualizar Holerite
                                        </Button>
                                        */}
                                        <Button 
                                            variant="secondary"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaHolerite(folha);
                                                    setMostrarHolerite(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Visualizar Holerite
                                        </Button>
                                        {/* 
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaReciboBeneficios(folha);
                                                    setMostrarReciboBeneficios(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Visualizar Benefícios
                                        </Button>
                                        */}
                                        <Button 
                                            variant="secondary"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaReciboBeneficios(folha);
                                                    setMostrarReciboBeneficios(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Visualizar Benefícios
                                        </Button>
                                        {/* 
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaRecibo(folha);
                                                    setMostrarRecibo(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Visualizar Recibo
                                        </Button>
                                        */}
                                        <Button 
                                            variant="secondary"
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaRecibo(folha);
                                                    setMostrarRecibo(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Visualizar Recibo
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                const folha = todasFolhas.find(f => f.funcionario.id === activeTab);
                                                if (folha) {
                                                    setFolhaSelecionadaImprimirTudo(folha);
                                                    setMostrarImprimirTudo(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none text-sm bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Visualizar Tudo
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            )}
            
            {/* Modal de Gerar Folha Individual */}
            {mostrarModalFolhaIndividual && (
                <GerarFolhaIndividualModal
                    funcionario={funcionarioSelecionado}
                    mes={mes}
                    ano={ano}
                    onClose={() => {
                        setMostrarModalFolhaIndividual(false);
                        setFuncionarioSelecionado(null);
                    }}
                    onSuccess={() => {
                        // Recarregar folhas salvas após sucesso
                        carregarFolhasSalvas();
                    }}
                />
            )}

            {/* Modal de Editar Folha Individual */}
            {mostrarModalEditarFolha && (
                <EditarFolhaIndividualModal
                    onClose={() => setMostrarModalEditarFolha(false)}
                    onSave={() => {
                        setMostrarModalEditarFolha(false);
                        carregarFolhasSalvas(true);
                    }}
                />
            )}

            {/* Modal de Análise por IA */}
            {mostrarAnaliseIA && activeTab && (() => {
                const folhaAtiva = todasFolhas.find(f => f.funcionario.id === activeTab);
                return (
                    <AnaliseIAModal
                        isOpen={mostrarAnaliseIA}
                        onClose={() => setMostrarAnaliseIA(false)}
                        funcionarioId={activeTab}
                        funcionarioNome={folhaAtiva?.funcionario?.nome_completo || ''}
                        mes={mes}
                        ano={ano}
                    />
                );
            })()}



            {/* Modal de Visualização de Holerite */}
            {mostrarHolerite && folhaSelecionadaHolerite && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        {/* Cabeçalho do Modal */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800">Holerite</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={(e) => {
                                        // Evita submit de form / navegação (botão dentro de modal)
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Usar a função de impressão específica em vez de window.print()
                                        imprimirHolerite({
                                            funcionario: folhaSelecionadaHolerite.funcionario,
                                            empresa: folhaSelecionadaHolerite.empresa,
                                            resultado: folhaSelecionadaHolerite.resultado,
                                            mes: mes,
                                            ano: ano,
                                            eventosExcepcionais: eventosExcepcionais[folhaSelecionadaHolerite.funcionario.id] || [],
                                            dadosFolha: folhaSelecionadaHolerite.dadosFolha,
                                            parametros: parametros
                                        }, (msg) => showToast(msg, 'error'));
                                    }}
                                    className="text-sm"
                                >
                                    <Printer className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setMostrarHolerite(false);
                                        setFolhaSelecionadaHolerite(null);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6">
                            {/* Holerite */}
                            <Holerite
                                funcionario={folhaSelecionadaHolerite.funcionario}
                                empresa={folhaSelecionadaHolerite.empresa}
                                resultado={folhaSelecionadaHolerite.resultado}
                                mes={mes}
                                ano={ano}
                                eventosExcepcionais={eventosExcepcionais[folhaSelecionadaHolerite.funcionario.id] || []}
                                folhaPonto={folhaSelecionadaHolerite.dadosFolha}
                                parametros={parametros}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Recibo de Benefícios */}
            {mostrarReciboBeneficios && folhaSelecionadaReciboBeneficios && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        {/* Cabeçalho do Modal */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800">Recibo de Benefícios</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={(e) => {
                                        // Evita submit de form / navegação (botão dentro de modal)
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Usar a função de impressão específica em vez de window.print()
                                        imprimirReciboBeneficios({
                                            funcionario: folhaSelecionadaReciboBeneficios.funcionario,
                                            empresa: folhaSelecionadaReciboBeneficios.empresa,
                                            resultado: folhaSelecionadaReciboBeneficios.resultado,
                                            mes: mes,
                                            ano: ano,
                                            eventosExcepcionais: eventosExcepcionais[folhaSelecionadaReciboBeneficios.funcionario.id] || [],
                                            dadosFolha: folhaSelecionadaReciboBeneficios.dadosFolha,
                                            parametros: parametros,
                                            escalaMensalProximoMes: folhaSelecionadaReciboBeneficios.escalaMensalProximoMes
                                        }, (msg) => showToast(msg, 'error'));
                                    }}
                                    className="text-sm"
                                >
                                    <Printer className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setMostrarReciboBeneficios(false);
                                        setFolhaSelecionadaReciboBeneficios(null);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6">
                            {/* Recibo de Benefícios */}
                            <ReciboBeneficios
                                funcionario={folhaSelecionadaReciboBeneficios.funcionario}
                                empresa={folhaSelecionadaReciboBeneficios.empresa}
                                resultado={folhaSelecionadaReciboBeneficios.resultado}
                                mes={mes}
                                ano={ano}
                                eventosExcepcionais={eventosExcepcionais[folhaSelecionadaReciboBeneficios.funcionario.id] || []}
                                folhaPonto={folhaSelecionadaReciboBeneficios.dadosFolha}
                                diasTrabalhados={(() => {
                                    const dadosDias = folhaSelecionadaReciboBeneficios.dadosFolha?.dados_dias;
                                    if (!dadosDias) return 0;
                                    const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                                    return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                                })()}
                                diasATrabalharVA={folhaSelecionadaReciboBeneficios.escalaMensalProximoMes?.diasVA || 0}
                                diasATrabalharVT={folhaSelecionadaReciboBeneficios.escalaMensalProximoMes?.diasVT || 0}
                                faltasJustificadas={folhaSelecionadaReciboBeneficios.dadosFolha?.total_faltas_justificadas || 0}
                                faltasInjustificadas={folhaSelecionadaReciboBeneficios.dadosFolha?.total_faltas_injustificadas || 0}
                                folgasTrabalhadasVT={folhaSelecionadaReciboBeneficios.folgas_trabalhadas || folhaSelecionadaReciboBeneficios.dadosFolha?.folgas_trabalhadas || 0}
                                folgasTrabalhadasVA={folhaSelecionadaReciboBeneficios.folgas_trabalhadas || folhaSelecionadaReciboBeneficios.dadosFolha?.folgas_trabalhadas || 0}
                                vtDia={parametros?.[0]?.vale_transporte || 13.50}
                                vaDia={parametros?.[0]?.vale_alimentacao || 34.00}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Recibo de Depósito de Benefícios */}
            {mostrarRecibo && folhaSelecionadaRecibo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Cabeçalho do Modal */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800">Recibo de Pagamento</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        
                                        // Criar nova janela para impressão limpa
                                        const printWindow = globalThis.open('', '_blank');
                                        if (!printWindow) {
                                            showToast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.', 'error');
                                            return;
                                        }
                                        
                                        
                                        // Capturar o HTML do componente
                                        const reciboElement = document.querySelector('.recibo-deposito-beneficios');
                                        
                                        if (!reciboElement) {
                                            showToast('Erro ao capturar o recibo para impressão', 'error');
                                            printWindow.close();
                                            return;
                                        }
                                        
                                        if (reciboElement) {
                                            const htmlContent = `
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <meta charset="UTF-8">
                                                    <title>Recibo de Pagamento</title>
                                                    <style>
                                                        @media print {
                                                            @page { size: A4 portrait; margin: 5mm; }
                                                            * { -webkit-print-color-adjust: exact !important; }
                                                        }
                                                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                                                        /* Estilos Tailwind necessários */
                                                        .text-center { text-align: center; }
                                                        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                                                        .font-bold { font-weight: 700; }
                                                        .font-semibold { font-weight: 600; }
                                                        .text-justify { text-align: justify; }
                                                        .mb-4 { margin-bottom: 1rem; }
                                                        .mb-8 { margin-bottom: 2rem; }
                                                        .w-full { width: 100%; }
                                                        .max-w-4xl { max-width: 56rem; }
                                                        .mx-auto { margin-left: auto; margin-right: auto; }
                                                        .p-4 { padding: 1rem; }
                                                        .p-8 { padding: 2rem; }
                                                        .bg-white { background-color: white; }
                                                        .overflow-x-auto { overflow-x: auto; }
                                                        .border-collapse { border-collapse: collapse; }
                                                        .border-b { border-bottom: 1px solid #ccc; }
                                                        .border-t { border-top: 1px solid black; }
                                                        .border-black { border-color: black; }
                                                        table thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
                                                        table tbody tr:last-child { border-top: 2px solid #000; }
                                                        table tbody tr:last-child td { border-bottom: none; }
                                                        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                                                        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                                                        .pt-2 { padding-top: 0.5rem; }
                                                        .text-left { text-align: left; }
                                                        .inline-block { display: inline-block; }
                                                        h1 { margin-bottom: 40px !important; }
                                                    </style>
                                                </head>
                                                <body>
                                                    ${reciboElement.outerHTML}
                                                </body>
                                                </html>
                                            `;
                                            
                                            escreverEExibirJanela(printWindow, htmlContent, 'Recibo de Pagamento');
                                        }
                                    }}
                                    className="text-sm"
                                >
                                    <Printer className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setMostrarRecibo(false);
                                        setFolhaSelecionadaRecibo(null);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6">
                            <ReciboDepositoBeneficios
                                nomeFuncionario={folhaSelecionadaRecibo.funcionario.nome_completo}
                                cpf={folhaSelecionadaRecibo.funcionario.cpf || ''}
                                nomeEmpresa={
                                    folhaSelecionadaRecibo.empresa?.nome_empresa || 
                                    folhaSelecionadaRecibo.funcionario.empresa?.nome_empresa ||
                                    ''
                                }
                                cnpj={
                                    folhaSelecionadaRecibo.empresa?.cnpj || 
                                    folhaSelecionadaRecibo.funcionario.empresa?.cnpj ||
                                    ''
                                }
                                beneficios={(() => {
                                    const r = folhaSelecionadaRecibo.resultado;
                                    // ⭐ USAR EVENTOS DO ESTADO (eventosExcepcionais) EM VEZ DE folha.eventosExcepcionais
                                    const eventos = eventosExcepcionais[folhaSelecionadaRecibo.funcionario.id] || [];
                                    const beneficios = [];
                                    
                                    // Buscar parâmetros ativos para valores de VT e VA
                                    const parametroAtivo = parametros?.find(p => p.ativo) || parametros?.[0];
                                    const valorVT = parametroAtivo?.vale_transporte ? parametroAtivo.vale_transporte * 2 : 12.4;
                                    const valorVA = parametroAtivo?.vale_alimentacao || 24.5;
                                    
                                    // ⭐ Salário Líquido (SEM benefícios) calculado via lançamentos do holerite
                                    const salarioLiquido = calcularSalarioLiquidoPorLancamentos(
                                        folhaSelecionadaRecibo.funcionario.id,
                                        r,
                                        eventos,
                                        folhaSelecionadaRecibo.dadosFolha
                                    );
                                    beneficios.push({ quantidade: 1, descricao: 'Salário Líquido', valor: salarioLiquido });

                                    
                                    // Adicionar benefícios (valores positivos)
                                    if (r.premio_permanencia > 0) beneficios.push({ quantidade: 1, descricao: 'Prêmio de Permanência', valor: r.premio_permanencia });
                                    
                                    // Nomes dos meses
                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                    const mesAtual = meses[folhaSelecionadaRecibo.dadosFolha.mes - 1];
                                    const mesProximo = meses[folhaSelecionadaRecibo.dadosFolha.mes % 12];
                                    
                                    // Vale Transporte (mês anterior = mês atual da folha, mês atual = mês seguinte)
                                    // Quantidade = valor / (vale_transporte * 2)
                                    if (r.vale_transporte_mes_anterior > 0) {
                                        const qtdVT = Math.round(r.vale_transporte_mes_anterior / valorVT);
                                        beneficios.push({ quantidade: qtdVT, descricao: `Vale Transporte (${mesAtual})`, valor: r.vale_transporte_mes_anterior });
                                    }
                                    if (r.vale_transporte_mes_atual > 0) {
                                        const qtdVT = Math.round(r.vale_transporte_mes_atual / valorVT);
                                        beneficios.push({ quantidade: qtdVT, descricao: `Vale Transporte (${mesProximo})`, valor: r.vale_transporte_mes_atual });
                                    }
                                    
                                    // Vale Alimentação (mês anterior = mês atual da folha, mês atual = mês seguinte)
                                    // Quantidade = valor / vale_alimentacao
                                    if (r.vale_alimentacao_mes_anterior > 0) {
                                        const qtdVA = Math.round(r.vale_alimentacao_mes_anterior / valorVA);
                                        beneficios.push({ quantidade: qtdVA, descricao: `Vale Alimentação (${mesAtual})`, valor: r.vale_alimentacao_mes_anterior });
                                    }
                                    if (r.vale_alimentacao_mes_atual > 0) {
                                        const qtdVA = Math.round(r.vale_alimentacao_mes_atual / valorVA);
                                        beneficios.push({ quantidade: qtdVA, descricao: `Vale Alimentação (${mesProximo})`, valor: r.vale_alimentacao_mes_atual });
                                    }
                                    
                                    // Cesta Básica
                                    // Regra de três: cesta_basica_integral = 30 dias, valor = X dias
                                    // X = (valor * 30) / cesta_basica_integral
                                    if (r.cesta_basica > 0) {
                                        const cestaBasicaIntegral = parametroAtivo?.cesta_basica || 193.8;
                                        const diasCesta = Math.round((r.cesta_basica * 30) / cestaBasicaIntegral);
                                        beneficios.push({ quantidade: 1, descricao: `Cesta Básica proporcional a ${diasCesta} dias`, valor: r.cesta_basica });
                                    }
                                    
                                    // Adicionar descontos (valores negativos)
                                    // Quantidade de VT descontado = valor / (vale_transporte * 2)
                                    if (r.desconto_vt_faltas > 0) {
                                        const qtdVTDescontado = Math.round(r.desconto_vt_faltas / valorVT);
                                        beneficios.push({ quantidade: qtdVTDescontado, descricao: 'Desconto VT por Faltas', valor: -r.desconto_vt_faltas });
                                    }
                                    // Quantidade de VA descontado = valor / vale_alimentacao
                                    if (r.desconto_va_faltas > 0) {
                                        const qtdVADescontado = Math.round(r.desconto_va_faltas / valorVA);
                                        beneficios.push({ quantidade: qtdVADescontado, descricao: 'Desconto VA por Faltas', valor: -r.desconto_va_faltas });
                                    }
                                    if (r.desconto_rondas_nao_realizadas > 0) beneficios.push({ quantidade: 1, descricao: 'Desconto Rondas não Realizadas', valor: -r.desconto_rondas_nao_realizadas });
                                    
                                    // Adicionar eventos excepcionais de benefícios (SEM quantidade)
                                    eventos.forEach(evento => {
                                        if (evento.tipo === 'beneficio') {
                                            // ⭐ Normalizar descrição antes de exibir
                                            const descricaoNormalizada = normalizarDescricao(evento.descricao);
                                            const valorEvento = evento.valor < 0 ? evento.valor : evento.valor; // Manter sinal original
                                            beneficios.push({ 
                                                quantidade: '', // Sem quantidade para eventos excepcionais
                                                descricao: descricaoNormalizada, 
                                                valor: valorEvento 
                                            });
                                        }
                                    });
                                    
                                    return beneficios;
                                })()}
                                totalDepositado={(() => {
                                    const r = folhaSelecionadaRecibo.resultado;
                                    // ⭐ USAR EVENTOS DO ESTADO PARA CONSISTÊNCIA
                                    const eventos = eventosExcepcionais[folhaSelecionadaRecibo.funcionario.id] || [];
                                    
                                    // ⭐ Salário Líquido (SEM benefícios) calculado via lançamentos do holerite
                                    const salarioLiquido = calcularSalarioLiquidoPorLancamentos(
                                        folhaSelecionadaRecibo.funcionario.id,
                                        r,
                                        eventos,
                                        folhaSelecionadaRecibo.dadosFolha
                                    );
                                    
                                    // Calcular total de benefícios SEM duplicação
                                    const beneficiosEventos = eventos.filter(e => e.tipo === 'beneficio' && e.valor > 0).reduce((sum, e) => sum + e.valor, 0);
                                    const descontosEventosBenef = eventos.filter(e => e.tipo === 'beneficio' && e.valor < 0).reduce((sum, e) => sum + Math.abs(e.valor), 0);
                                    
                                    const totalBeneficios = 
                                        (r.vale_transporte_mes_anterior || 0) +
                                        (r.vale_transporte_mes_atual || 0) +
                                        (r.vale_alimentacao_mes_anterior || 0) +
                                        (r.vale_alimentacao_mes_atual || 0) +
                                        ((!r.vale_transporte_mes_anterior && !r.vale_transporte_mes_atual) ? (r.vale_transporte || 0) : 0) +
                                        ((!r.vale_alimentacao_mes_anterior && !r.vale_alimentacao_mes_atual) ? (r.vale_alimentacao || 0) : 0) +
                                        (r.cesta_basica || 0) +
                                        (r.premio_permanencia || 0) +
                                        (r.folga_trabalhada || 0) +
                                        beneficiosEventos;
                                    
                                    const totalDescontosBeneficios = 
                                        (r.desconto_vt_faltas || 0) +
                                        (r.desconto_va_faltas || 0) +
                                        (r.desc_rondas_nao_realizadas_benef || 0) +
                                        descontosEventosBenef;
                                    
                                    const totalLiquidoBeneficios = totalBeneficios - totalDescontosBeneficios;
                                    
                                    // Total depositado = Salário Líquido (SEM benefícios) + Benefícios Líquidos
                                    return salarioLiquido + totalLiquidoBeneficios;
                                })()}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Visualizar Tudo */}
            {mostrarImprimirTudo && folhaSelecionadaImprimirTudo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        {/* Cabeçalho do Modal */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800">Visualizar Tudo - {folhaSelecionadaImprimirTudo.funcionario.nome_completo}</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        imprimirTudoSeparado(printCtx, folhaSelecionadaImprimirTudo);
                                    }}
                                    className="text-sm"
                                >
                                    <Printer className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setMostrarImprimirTudo(false);
                                        setFolhaSelecionadaImprimirTudo(null);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6" id="imprimir-tudo-container">
                            <style>{`
                                @media print {
                                    @page {
                                        size: A4 portrait;
                                        margin: 5mm 2mm 5mm 2mm !important;
                                    }
                                    
                                    * {
                                        -webkit-print-color-adjust: exact !important;
                                        print-color-adjust: exact !important;
                                        box-sizing: border-box !important;
                                    }
                                    
                                    html, body { 
                                        width: 100% !important;
                                        max-width: 100% !important;
                                        margin: 0 !important; 
                                        padding: 0 !important;
                                        overflow-x: hidden !important;
                                    }
                                    
                                    /* Ocultar tudo exceto o container de impressão */
                                    body * {
                                        visibility: hidden;
                                    }
                                    
                                    #imprimir-tudo-container, #imprimir-tudo-container * {
                                        visibility: visible;
                                    }
                                    
                                    #imprimir-tudo-container {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100%;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                    }
                                    
                                    .print-page {
                                        page-break-after: always !important;
                                        break-after: always !important;
                                        width: 100% !important;
                                        max-width: 100% !important;
                                        margin: 0;
                                        padding: 0;
                                    }
                                    
                                    .print-page:last-child {
                                        page-break-after: auto !important;
                                    }
                                    
                                    /* Ajustar componentes para A4 - CONFIGURAÇÕES OTIMIZADAS */
                                    #holerite-print, #recibo-beneficios-print {
                                        width: 90% !important;
                                        max-width: 90% !important;
                                        font-size: 8px !important;
                                        min-height: auto !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        box-sizing: border-box !important;
                                        overflow-x: hidden !important;
                                    }
                                    
                                    #holerite-print table, #recibo-beneficios-print table {
                                        width: 90% !important;
                                        max-width: 90% !important;
                                        table-layout: fixed !important;
                                        margin: 2mm auto !important;
                                        border-collapse: collapse !important;
                                    }
                                    
                                    #holerite-print td, #recibo-beneficios-print td {
                                        word-wrap: break-word !important;
                                        overflow: hidden !important;
                                        text-overflow: ellipsis !important;
                                        padding: 2px 4px !important;
                                        font-size: 8px !important;
                                    }
                                    
                                    #holerite-print .text-xs, #recibo-beneficios-print .text-xs {
                                        font-size: 8px !important;
                                    }
                                    
                                    #holerite-print .font-bold, #recibo-beneficios-print .font-bold {
                                        font-weight: bold !important;
                                        font-size: 8px !important;
                                    }
                                    
                                    /* Ocultar títulos de debug */
                                    .mb-2.text-center.font-bold {
                                        display: none !important;
                                    }
                                }
                            `}</style>
                            

                            {/* Página 1: Holerite */}
                            <div className="print-page" style={{ pageBreakAfter: 'always' }}>
                                <div id="holerite-tudo-print">
                                    <Holerite
                                        funcionario={folhaSelecionadaImprimirTudo.funcionario}
                                        empresa={folhaSelecionadaImprimirTudo.empresa}
                                        resultado={folhaSelecionadaImprimirTudo.resultado}
                                        mes={mes}
                                        ano={ano}
                                        eventosExcepcionais={eventosExcepcionais[folhaSelecionadaImprimirTudo.funcionario.id] || []}
                                        folhaPonto={folhaSelecionadaImprimirTudo.dadosFolha}
                                        parametros={parametros}
                                    />
                                </div>
                            </div>

                            {/* Página 2: Recibo de Benefícios */}
                            <div className="print-page" style={{ pageBreakAfter: 'always' }}>
                                <div id="recibo-beneficios-tudo-print">
                                    {(() => {
                                        const r = folhaSelecionadaImprimirTudo.resultado;
                                        const eventos = eventosExcepcionais[folhaSelecionadaImprimirTudo.funcionario.id] || [];
                                        
                                        // Calcular eventos excepcionais de benefícios
                                        const beneficiosEventos = eventos
                                            .filter(e => e.tipo === 'beneficio' && e.valor > 0)
                                            .reduce((sum, e) => sum + e.valor, 0);
                                        
                                        const descontosEventos = eventos
                                            .filter(e => e.tipo === 'beneficio' && e.valor < 0)
                                            .reduce((sum, e) => sum + Math.abs(e.valor), 0);

                                        // Calcular totais de benefícios
                                        const totalBeneficios = 
                                            (r.vale_transporte_mes_anterior || 0) +
                                            (r.vale_transporte_mes_atual || 0) +
                                            (r.vale_alimentacao_mes_anterior || 0) +
                                            (r.vale_alimentacao_mes_atual || 0) +
                                            ((!r.vale_transporte_mes_anterior && !r.vale_transporte_mes_atual) ? (r.vale_transporte || 0) : 0) +
                                            ((!r.vale_alimentacao_mes_anterior && !r.vale_alimentacao_mes_atual) ? (r.vale_alimentacao || 0) : 0) +
                                            (r.cesta_basica || 0) +
                                            (r.premio_permanencia || 0) +
                                            (r.folga_trabalhada || 0) +
                                            beneficiosEventos;

                                        const totalDescontosBeneficios = 
                                            (r.desconto_vt_faltas || 0) +
                                            (r.desconto_va_faltas || 0) +
                                            (r.desc_rondas_nao_realizadas_benef || 0) +
                                            descontosEventos;

                                        if (totalBeneficios === 0 && totalDescontosBeneficios === 0) {
                                            return (
                                                <div className="bg-white p-4" style={{ width: '210mm', minHeight: '297mm', fontSize: '12px' }}>
                                                    <div className="flex items-center justify-center h-full">
                                                        <div className="text-center">
                                                            <h2 className="text-xl font-bold mb-4">RECIBO DE BENEFÍCIOS</h2>
                                                            <p className="text-gray-600">Nenhum benefício para este funcionário no período {mes.toString().padStart(2, '0')}/{ano}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <ReciboBeneficios
                                                funcionario={folhaSelecionadaImprimirTudo.funcionario}
                                                empresa={folhaSelecionadaImprimirTudo.empresa}
                                                resultado={folhaSelecionadaImprimirTudo.resultado}
                                                mes={mes}
                                                ano={ano}
                                                eventosExcepcionais={eventos}
                                                folhaPonto={folhaSelecionadaImprimirTudo.dadosFolha}
                                                diasTrabalhados={(() => {
                                                    const dadosDias = folhaSelecionadaImprimirTudo.dadosFolha?.dados_dias;
                                                    if (!dadosDias) return 0;
                                                    const dados = typeof dadosDias === 'string' ? JSON.parse(dadosDias) : dadosDias;
                                                    return Object.values(dados).filter((d: any) => d.entrada && d.saida && !d.falta_injustificada && !d.atestado).length;
                                                })()}
                                                diasATrabalharVA={folhaSelecionadaImprimirTudo.escalaMensalProximoMes?.diasVA || 0}
                                                diasATrabalharVT={folhaSelecionadaImprimirTudo.escalaMensalProximoMes?.diasVT || 0}
                                                faltasJustificadas={folhaSelecionadaImprimirTudo.dadosFolha?.total_faltas_justificadas || 0}
                                                faltasInjustificadas={folhaSelecionadaImprimirTudo.dadosFolha?.total_faltas_injustificadas || 0}
                                            />
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Página 3: Recibo de Pagamento */}
                            <div className="print-page">
                                <div id="recibo-pagamento-tudo-print">
                                    <ReciboDepositoBeneficios
                                    nomeFuncionario={folhaSelecionadaImprimirTudo.funcionario.nome_completo}
                                    cpf={folhaSelecionadaImprimirTudo.funcionario.cpf || ''}
                                    nomeEmpresa={
                                        folhaSelecionadaImprimirTudo.empresa?.nome_empresa || 
                                        folhaSelecionadaImprimirTudo.funcionario.empresa?.nome_empresa ||
                                        ''
                                    }
                                    cnpj={
                                        folhaSelecionadaImprimirTudo.empresa?.cnpj || 
                                        folhaSelecionadaImprimirTudo.funcionario.empresa?.cnpj ||
                                        ''
                                    }
                                    beneficios={(() => {
                                        const r = folhaSelecionadaImprimirTudo.resultado;
                                        // ⭐ USAR EVENTOS DO ESTADO (eventosExcepcionais) EM VEZ DE folha.eventosExcepcionais
                                        const eventos = eventosExcepcionais[folhaSelecionadaImprimirTudo.funcionario.id] || [];
                                        const beneficios = [];
                                        
                                        // Buscar parâmetros ativos para valores de VT e VA
                                        const parametroAtivo = parametros?.find(p => p.ativo) || parametros?.[0];
                                        const valorVT = parametroAtivo?.vale_transporte ? parametroAtivo.vale_transporte * 2 : 12.4;
                                        const valorVA = parametroAtivo?.vale_alimentacao || 24.5;
                                        
                                        // ⭐ USAR FUNÇÕES DE CÁLCULO PARA CONSISTÊNCIA
                                        const totaisCalculados = calcularTotaisComEventos(folhaSelecionadaImprimirTudo.funcionario.id, r, eventos);
                                        
                                        // Salário Líquido usando função de rastreamento
                                        const salarioLiquido = totaisCalculados.salarioLiquido;
                                        beneficios.push({ quantidade: 1, descricao: 'Salário Líquido', valor: salarioLiquido });
                                        
                                        // Adicionar benefícios (valores positivos)
                                        if (r.premio_permanencia > 0) beneficios.push({ quantidade: 1, descricao: 'Prêmio de Permanência', valor: r.premio_permanencia });
                                        
                                        // Nomes dos meses
                                        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                        const mesAtual = meses[folhaSelecionadaImprimirTudo.dadosFolha.mes - 1];
                                        const mesProximo = meses[folhaSelecionadaImprimirTudo.dadosFolha.mes % 12];
                                        
                                        // Vale Transporte (mês anterior = mês atual da folha, mês atual = mês seguinte)
                                        if (r.vale_transporte_mes_anterior > 0) {
                                            const qtdVT = Math.round(r.vale_transporte_mes_anterior / valorVT);
                                            beneficios.push({ quantidade: qtdVT, descricao: `Vale Transporte (${mesAtual})`, valor: r.vale_transporte_mes_anterior });
                                        }
                                        if (r.vale_transporte_mes_atual > 0) {
                                            const qtdVT = Math.round(r.vale_transporte_mes_atual / valorVT);
                                            beneficios.push({ quantidade: qtdVT, descricao: `Vale Transporte (${mesProximo})`, valor: r.vale_transporte_mes_atual });
                                        }
                                        
                                        // Vale Alimentação (mês anterior = mês atual da folha, mês atual = mês seguinte)
                                        if (r.vale_alimentacao_mes_anterior > 0) {
                                            const qtdVA = Math.round(r.vale_alimentacao_mes_anterior / valorVA);
                                            beneficios.push({ quantidade: qtdVA, descricao: `Vale Alimentação (${mesAtual})`, valor: r.vale_alimentacao_mes_anterior });
                                        }
                                        if (r.vale_alimentacao_mes_atual > 0) {
                                            const qtdVA = Math.round(r.vale_alimentacao_mes_atual / valorVA);
                                            beneficios.push({ quantidade: qtdVA, descricao: `Vale Alimentação (${mesProximo})`, valor: r.vale_alimentacao_mes_atual });
                                        }
                                        
                                        // Cesta Básica
                                        if (r.cesta_basica > 0) {
                                            const cestaBasicaIntegral = parametroAtivo?.cesta_basica || 193.8;
                                            const diasCesta = Math.round((r.cesta_basica * 30) / cestaBasicaIntegral);
                                            beneficios.push({ quantidade: 1, descricao: `Cesta Básica proporcional a ${diasCesta} dias`, valor: r.cesta_basica });
                                        }
                                        
                                        // Adicionar descontos (valores negativos)
                                        if (r.desconto_vt_faltas > 0) {
                                            const qtdVTDescontado = Math.round(r.desconto_vt_faltas / valorVT);
                                            beneficios.push({ quantidade: qtdVTDescontado, descricao: 'Desconto VT por Faltas', valor: -r.desconto_vt_faltas });
                                        }
                                        if (r.desconto_va_faltas > 0) {
                                            const qtdVADescontado = Math.round(r.desconto_va_faltas / valorVA);
                                            beneficios.push({ quantidade: qtdVADescontado, descricao: 'Desconto VA por Faltas', valor: -r.desconto_va_faltas });
                                        }
                                        if (r.desconto_rondas_nao_realizadas > 0) beneficios.push({ quantidade: 1, descricao: 'Desconto Rondas não Realizadas', valor: -r.desconto_rondas_nao_realizadas });
                                        
                                        // Adicionar eventos excepcionais de benefícios (SEM quantidade)
                                        eventos.forEach(evento => {
                                            if (evento.tipo === 'beneficio') {
                                                const valorEvento = evento.valor < 0 ? evento.valor : evento.valor; // Manter sinal original
                                                beneficios.push({ 
                                                    quantidade: '', // Sem quantidade para eventos excepcionais
                                                    descricao: evento.descricao, 
                                                    valor: valorEvento 
                                                });
                                            }
                                        });
                                        
                                        return beneficios;
                                    })()}
                                    totalDepositado={(() => {
                                        const r = folhaSelecionadaImprimirTudo.resultado;
                                        // ⭐ USAR EVENTOS DO ESTADO E FUNÇÕES DE CÁLCULO PARA CONSISTÊNCIA
                                        const eventos = eventosExcepcionais[folhaSelecionadaImprimirTudo.funcionario.id] || [];
                                        const totaisCalculados = calcularTotaisComEventos(folhaSelecionadaImprimirTudo.funcionario.id, r, eventos);
                                        
                                        // Total depositado = Salário Líquido + Total Benefícios
                                        return totaisCalculados.salarioLiquido + totaisCalculados.totalBeneficios;
                                    })()}
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes das Faltas */}
            {mostrarModalFaltas && folhaAtiva && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        {/* Cabeçalho do Modal */}
                        <div className="bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center rounded-t-lg">
                            <h2 className="text-lg font-bold text-gray-800">
                                {tipoFaltaModal === 'justificadas' ? '📋 Faltas Justificadas' : '❌ Faltas Injustificadas'}
                            </h2>
                            <button
                                onClick={() => setMostrarModalFaltas(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-semibold">Funcionário:</span> {folhaAtiva.funcionario.nome_completo}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Período:</span> {meses[mes - 1]}/{ano}
                                </p>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-gray-700 mb-3">Datas das Faltas:</h3>
                                {(() => {
                                    const totalFaltas = tipoFaltaModal === 'justificadas' 
                                        ? folhaAtiva.dadosFolha?.total_faltas_justificadas 
                                        : folhaAtiva.dadosFolha?.total_faltas_injustificadas;
                                    
                                    const datas = extrairDatasFaltas(folhaAtiva.dadosFolha?.dados_dias, tipoFaltaModal);
                                    
                                    if (datas.length === 0) {
                                        return (
                                            <div className="text-center py-4">
                                                <p className="text-gray-500 mb-2">
                                                    Nenhuma data encontrada no registro
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    Total registrado: {totalFaltas || 0} falta(s)
                                                </p>
                                                <details className="mt-4 text-left">
                                                    <summary className="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
                                                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                                                        {JSON.stringify(folhaAtiva.dadosFolha?.dados_dias, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {datas.map(dia => (
                                                    <div
                                                        key={dia}
                                                        className={`text-center py-2 px-3 rounded ${
                                                            tipoFaltaModal === 'justificadas'
                                                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                                                : 'bg-red-100 text-red-800 border border-red-300'
                                                        }`}
                                                    >
                                                        <div className="font-bold">{dia}</div>
                                                        <div className="text-xs">{meses[mes - 1].substring(0, 3)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-3 text-center">
                                                Total: {datas.length} falta(s)
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => setMostrarModalFaltas(false)}
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Visualização em Lote */}
            {mostrarVisualizacaoLote && folhasVisualizacaoLote.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        {/* Cabeçalho do Modal */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800">
                                Visualizar {tipoVisualizacaoLote === 'holerite' ? 'Holerites' : 
                                          tipoVisualizacaoLote === 'beneficios' ? 'Benefícios' : 
                                          tipoVisualizacaoLote === 'recibo' ? 'Recibos' : 'Tudo'} em Lote
                                <span className="text-sm font-normal text-gray-600 ml-2">
                                    ({folhasVisualizacaoLote.length} funcionário{folhasVisualizacaoLote.length > 1 ? 's' : ''})
                                </span>
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        // Imprimir baseado no tipo
                                        switch (tipoVisualizacaoLote) {
                                            case 'holerite':
                                                imprimirHoleritesEmLote(printCtx, folhasVisualizacaoLote);
                                                break;
                                            case 'beneficios':
                                                imprimirBeneficiosEmLote(printCtx, folhasVisualizacaoLote);
                                                break;
                                            case 'recibo':
                                                imprimirRecibosEmLote(printCtx, folhasVisualizacaoLote);
                                                break;
                                            case 'tudo':
                                                imprimirTudoEmUmaJanela(printCtx, folhasVisualizacaoLote);
                                                break;
                                        }
                                    }}
                                    className="text-sm"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setMostrarVisualizacaoLote(false);
                                        setFolhasVisualizacaoLote([]);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Fechar
                                </Button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6">
                            <style>{`
                                @media print {
                                    body * {
                                        visibility: hidden;
                                    }
                                    
                                    .print-content, .print-content * {
                                        visibility: visible;
                                    }
                                    
                                    .print-content {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100%;
                                    }
                                }
                            `}</style>

                            <div className="print-content space-y-8">
                                {folhasVisualizacaoLote.map((folha, index) => (
                                    <div key={folha.funcionario.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                                        {tipoVisualizacaoLote === 'holerite' && (
                                            <Holerite
                                                funcionario={folha.funcionario}
                                                empresa={folha.empresa}
                                                resultado={folha.resultado}
                                                mes={mes}
                                                ano={ano}
                                                eventosExcepcionais={eventosExcepcionais[folha.funcionario.id] || []}
                                                parametros={parametros}
                                            />
                                        )}
                                        
                                        {tipoVisualizacaoLote === 'beneficios' && (
                                            <ReciboBeneficios
                                                funcionario={folha.funcionario}
                                                empresa={folha.empresa}
                                                resultado={folha.resultado}
                                                mes={mes}
                                                ano={ano}
                                            />
                                        )}
                                        
                                        {tipoVisualizacaoLote === 'recibo' && (() => {
                                            // Preparar lista de benefícios para o recibo
                                            const beneficiosList = [];
                                            if (folha.resultado.vale_transporte > 0 || folha.resultado.vale_transporte_mes_anterior > 0 || folha.resultado.vale_transporte_mes_atual > 0) {
                                                const vtTotal = (folha.resultado.vale_transporte_mes_anterior || 0) + (folha.resultado.vale_transporte_mes_atual || 0) || folha.resultado.vale_transporte || 0;
                                                if (vtTotal > 0) beneficiosList.push({ descricao: 'Vale Transporte', valor: vtTotal });
                                            }
                                            if (folha.resultado.vale_alimentacao > 0 || folha.resultado.vale_alimentacao_mes_anterior > 0 || folha.resultado.vale_alimentacao_mes_atual > 0) {
                                                const vaTotal = (folha.resultado.vale_alimentacao_mes_anterior || 0) + (folha.resultado.vale_alimentacao_mes_atual || 0) || folha.resultado.vale_alimentacao || 0;
                                                if (vaTotal > 0) beneficiosList.push({ descricao: 'Vale Alimentação', valor: vaTotal });
                                            }
                                            if (folha.resultado.cesta_basica > 0) beneficiosList.push({ descricao: 'Cesta Básica', valor: folha.resultado.cesta_basica });
                                            if (folha.resultado.premio_permanencia > 0) beneficiosList.push({ descricao: 'Prêmio Permanência', valor: folha.resultado.premio_permanencia });
                                            const totalDepositado = beneficiosList.reduce((sum, b) => sum + b.valor, 0);
                                            
                                            return (
                                                <ReciboDepositoBeneficios
                                                    nomeFuncionario={folha.funcionario.nome_completo || ''}
                                                    cpf={folha.funcionario.cpf || ''}
                                                    nomeEmpresa={folha.empresa?.nome_empresa || ''}
                                                    cnpj={folha.empresa?.cnpj || ''}
                                                    beneficios={beneficiosList}
                                                    totalDepositado={totalDepositado}
                                                />
                                            );
                                        })()}
                                        
                                        {tipoVisualizacaoLote === 'tudo' && (() => {
                                            // Preparar lista de benefícios para o recibo
                                            const beneficiosList = [];
                                            if (folha.resultado.vale_transporte > 0 || folha.resultado.vale_transporte_mes_anterior > 0 || folha.resultado.vale_transporte_mes_atual > 0) {
                                                const vtTotal = (folha.resultado.vale_transporte_mes_anterior || 0) + (folha.resultado.vale_transporte_mes_atual || 0) || folha.resultado.vale_transporte || 0;
                                                if (vtTotal > 0) beneficiosList.push({ descricao: 'Vale Transporte', valor: vtTotal });
                                            }
                                            if (folha.resultado.vale_alimentacao > 0 || folha.resultado.vale_alimentacao_mes_anterior > 0 || folha.resultado.vale_alimentacao_mes_atual > 0) {
                                                const vaTotal = (folha.resultado.vale_alimentacao_mes_anterior || 0) + (folha.resultado.vale_alimentacao_mes_atual || 0) || folha.resultado.vale_alimentacao || 0;
                                                if (vaTotal > 0) beneficiosList.push({ descricao: 'Vale Alimentação', valor: vaTotal });
                                            }
                                            if (folha.resultado.cesta_basica > 0) beneficiosList.push({ descricao: 'Cesta Básica', valor: folha.resultado.cesta_basica });
                                            if (folha.resultado.premio_permanencia > 0) beneficiosList.push({ descricao: 'Prêmio Permanência', valor: folha.resultado.premio_permanencia });
                                            const totalDepositado = beneficiosList.reduce((sum, b) => sum + b.valor, 0);
                                            
                                            return (
                                                <div className="space-y-8">
                                                    <Holerite
                                                        funcionario={folha.funcionario}
                                                        empresa={folha.empresa}
                                                        resultado={folha.resultado}
                                                        mes={mes}
                                                        ano={ano}
                                                        eventosExcepcionais={eventosExcepcionais[folha.funcionario.id] || []}
                                                        parametros={parametros}
                                                    />
                                                    
                                                    <ReciboBeneficios
                                                        funcionario={folha.funcionario}
                                                        empresa={folha.empresa}
                                                        resultado={folha.resultado}
                                                        mes={mes}
                                                        ano={ano}
                                                    />
                                                    
                                                    <ReciboDepositoBeneficios
                                                        nomeFuncionario={folha.funcionario.nome_completo || ''}
                                                        cpf={folha.funcionario.cpf || ''}
                                                        nomeEmpresa={folha.empresa?.nome_empresa || ''}
                                                        cnpj={folha.empresa?.cnpj || ''}
                                                        beneficios={beneficiosList}
                                                        totalDepositado={totalDepositado}
                                                    />
                                                </div>
                                            );
                                        })()}
                                        
                                        {index < folhasVisualizacaoLote.length - 1 && (
                                            <div className="mt-8 border-t border-gray-300"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Exportação em Lote */}
            <ExportacaoLoteModal
                isOpen={mostrarExportacaoLote}
                onClose={() => setMostrarExportacaoLote(false)}
                folhas={todasFolhas}
                mes={mes}
                ano={ano}
                parametros={parametros}
                eventosExcepcionais={eventosExcepcionais}
                empresas={empresas}
                postos={postos}
            />

            {/* TODO: Modal CNAB Itaú - Reativar quando estiver pronto para produção
            <CNABModal
                isOpen={mostrarCNABModal}
                onClose={() => setMostrarCNABModal(false)}
                folhas={todasFolhas}
                mes={mes}
                ano={ano}
                empresas={empresas}
                postos={postos}
            />
            */}
            {/* Modal de confirmação de exclusão (Benefícios) */}
            {confirmDelete.open && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDelete({ open: false, message: '', onConfirm: () => {} })}>
                    <div className="bg-popover text-popover-foreground rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">Confirmar exclusão</h3>
                        <p className="text-sm mb-4">{confirmDelete.message}</p>
                        <p className="text-xs text-muted-foreground mb-4">Esta ação pode ser desfeita usando o botão "Desfazer".</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmDelete({ open: false, message: '', onConfirm: () => {} })}
                                className="px-4 py-2 text-sm rounded border border-border hover:bg-muted"
                            >Cancelar</button>
                            <button
                                onClick={() => {
                                    const fn = confirmDelete.onConfirm;
                                    setConfirmDelete({ open: false, message: '', onConfirm: () => {} });
                                    fn();
                                }}
                                className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white"
                            >Remover</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalculatedPayroll;


