import React, { useState } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import { supabase } from '../../lib/supabase';
import { gerarResumoMensal } from '../../utils/exportarFolhaPonto';
import { useToast } from '../../hooks/useToast';
import { useFuncionariosAtivos } from '../../hooks/useSupabase';
import { normalizarFolhaCalculada } from '../../utils/normalizarFolhaCalculada';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ClipboardList } from 'lucide-react';
import AuditoriaCalculoModal from '../../components/AuditoriaCalculoModal';


const Reports: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { data: funcionarios } = useFuncionariosAtivos(); // 🎯 Usar apenas funcionários ativos (não demitidos)
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [resumo, setResumo] = useState<any>(null);
    const [folhas, setFolhas] = useState<any[]>([]);
    const [loadingRelatorioPostos, setLoadingRelatorioPostos] = useState(false);
    const [postoSelecionado, setPostoSelecionado] = useState<string>('');
    const [postos, setPostos] = useState<any[]>([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
    const [auditoriaAberta, setAuditoriaAberta] = useState(false);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [relatorioGerado, setRelatorioGerado] = useState<any>(null);
    const [nomePosto, setNomePosto] = useState<string>('');
    
    // Estados para Relatório Individual
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('');
    const [mesIndividual, setMesIndividual] = useState(new Date().getMonth() + 1);
    const [anoIndividual, setAnoIndividual] = useState(new Date().getFullYear());
    const [loadingRelatorioIndividual, setLoadingRelatorioIndividual] = useState(false);
    const [relatorioIndividualGerado, setRelatorioIndividualGerado] = useState<any>(null);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const formatarMoeda = (valor: number) => {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Função auxiliar para calcular benefícios por funcionário (consistente com Folha Calculada)
    const calcBeneficiosFuncionario = (f: any) => {
        const eventosParaIgnorar = ['Reembolsos', 'Reembolsos (Uber)', 'Desc. Ajuste dos Benefícios', 'Desc. Rondas não Realizadas', 'PLR'];
        let eventosBenefExtras = 0;
        if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
            f.eventos_excepcionais.forEach((evento: any) => {
                if (evento.tipo === 'beneficio' && !eventosParaIgnorar.includes(evento.descricao)) {
                    eventosBenefExtras += evento.valor || 0;
                }
            });
        }
        return (f.vale_transporte_mes_anterior || 0) + (f.vale_transporte_mes_atual || 0) + 
            (f.vale_alimentacao_mes_anterior || 0) + (f.vale_alimentacao_mes_atual || 0) + 
            (f.valor_vt_folgas_trabalhadas || 0) + (f.valor_va_folgas_trabalhadas || 0) +
            (f.cesta_basica || 0) + (f.plr || 0) + (f.premio_permanencia || 0) + (f.reembolsos_uber || 0) +
            (f.folga_trabalhada || 0) - 
            (f.desconto_vt_faltas || 0) - (f.desconto_va_faltas || 0) - 
            (f.desc_rondas_nao_realizadas_benef || 0) - (f.desc_ajuste_beneficios || 0) +
            eventosBenefExtras;
    };

    // Carregar postos ao montar
    React.useEffect(() => {
        carregarPostos();
        carregarEmpresas();
    }, []);

    const carregarPostos = async () => {
        try {
            const { data, error } = await supabase
                .from('postos_trabalho')
                .select('id, nome_posto, empresa_id')
                .is('local_area', null)
                .order('nome_posto');

            if (error) throw error;
            setPostos(data || []);
        } catch (error) {
        }
    };

    const carregarEmpresas = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('id, nome_empresa')
                .order('nome_empresa');

            if (error) throw error;
            setEmpresas(data || []);
        } catch (error) {
        }
    };

    // Filtrar postos pela empresa selecionada
    const postosFiltrados = empresaSelecionada
        ? postos.filter(p => p.empresa_id === empresaSelecionada)
        : postos;

    const handleGerarRelatorio = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('folhas_ponto')
                .select(`
                    *,
                    funcionario:funcionarios!inner(nome_completo, cpf, demitido),
                    empresa:empresas(nome_empresa),
                    posto_trabalho:postos_trabalho(nome_posto),
                    cargo:cargos(nome_cargo)
                `)
                .eq('funcionario.demitido', false) // 🎯 FILTRO - apenas funcionários não demitidos
                .eq('mes', mes)
                .eq('ano', ano)
                .order('funcionario(nome_completo)');

            if (error) throw error;

            setFolhas(data || []);
            const resumoGerado = gerarResumoMensal(data || []);
            setResumo(resumoGerado);

        } catch (error) {
            showToast('Erro ao gerar relatório', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportarRelatorioCSV = () => {
        if (folhas.length === 0) {
            showToast('Gere o relatório primeiro', 'info');
            return;
        }

        let csv = `RELATÓRIO MENSAL DE FOLHAS DE PONTO\n`;
        csv += `Período:,${meses[mes - 1]}/${ano}\n\n`;

        csv += 'Funcionário,H.Normais,H.Extras 50%,H.Extras 100%,H.Noturnas,Intras 50%,Intras 100%,Atrasos,Atestados,Faltas Injust.\n';

        folhas.forEach(folha => {
            csv += `${folha.funcionario?.nome_completo || 'N/A'},`;
            csv += `${folha.total_horas_normais?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_horas_extras_50?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_horas_extras_100?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_horas_noturnas?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_intrajornada_50?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_intrajornada_100?.toFixed(2) || '0.00'},`;
            csv += `${folha.total_atrasos || 0},`;
            csv += `${folha.total_atestados || 0},`;
            csv += `${folha.total_faltas_injustificadas || 0}\n`;
        });

        csv += '\nTOTAIS GERAIS\n';
        csv += `Total de Funcionários:,${resumo.total_funcionarios}\n`;
        csv += `Total Horas Normais:,${resumo.total_horas_normais.toFixed(2)}\n`;
        csv += `Total Horas Extras 50%:,${resumo.total_horas_extras_50.toFixed(2)}\n`;
        csv += `Total Horas Extras 100%:,${resumo.total_horas_extras_100.toFixed(2)}\n`;
        csv += `Total Horas Noturnas:,${resumo.total_horas_noturnas.toFixed(2)}\n`;
        csv += `Média Horas/Funcionário:,${resumo.media_horas_por_funcionario.toFixed(2)}\n`;
        csv += `Funcionários com Extras:,${resumo.funcionarios_com_extras}\n`;
        csv += `Funcionários com Faltas:,${resumo.funcionarios_com_faltas}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_mensal_${mes}_${ano}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const gerarRelatorioDetalhadoPosto = async () => {
        if (!postoSelecionado && !empresaSelecionada) {
            showToast('Selecione uma empresa ou um posto de trabalho', 'info');
            return;
        }

        setLoadingRelatorioPostos(true);
        try {
            // Construir query base
            let query = supabase
                .from('folha_calculada')
                .select(`
                    funcionario_id,
                    nome_funcionario,
                    mes,
                    ano,
                    posto_trabalho_id,
                    empresa_id,
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
                    inss_ferias,
                    desc_ajuste_beneficios,
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
                    decimo_terceiro_integral,
                    vantagens_13,
                    adiantamento_13_salario,
                    adiantamento_vantagens_13,
                    folgas_trabalhadas_vt,
                    folgas_trabalhadas_va,
                    valor_vt_folgas_trabalhadas,
                    valor_va_folgas_trabalhadas,
                    funcionario:funcionarios!inner(nome_completo, cpf, data_admissao, demitido)
                `)
                .eq('funcionario.demitido', false)
                .eq('mes', mes)
                .eq('ano', ano);

            // Aplicar filtros conforme seleção
            if (postoSelecionado) {
                query = query.eq('posto_trabalho_id', postoSelecionado);
            } else if (empresaSelecionada) {
                query = query.eq('empresa_id', empresaSelecionada);
            }

            const { data: folhasCalculadas, error } = await query.order('funcionario(nome_completo)');

            if (error) throw error;

            if (!folhasCalculadas || folhasCalculadas.length === 0) {
                showToast('Nenhuma folha encontrada para o filtro selecionado no período', 'info');
                setLoadingRelatorioPostos(false);
                return;
            }

            // Determinar nome para o relatório
            let nomeRelatorio = 'Todos os Postos';
            if (postoSelecionado) {
                const { data: postoData } = await supabase
                    .from('postos_trabalho')
                    .select('nome_posto')
                    .eq('id', postoSelecionado)
                    .single();
                nomeRelatorio = postoData?.nome_posto || 'Posto';
            } else if (empresaSelecionada) {
                const empresa = empresas.find(e => e.id === empresaSelecionada);
                nomeRelatorio = empresa?.nome_empresa || 'Empresa';
            } else {
                nomeRelatorio = 'Todas as Empresas';
            }

            setNomePosto(nomeRelatorio);
            setRelatorioGerado((folhasCalculadas || []).map((folha: any) => normalizarFolhaCalculada(folha)));

        } catch (error) {
            showToast('Erro ao gerar relatório', 'error');
        } finally {
            setLoadingRelatorioPostos(false);
        }
    };

    const imprimirRelatorioPostos = () => {
        if (!relatorioGerado) return;
        gerarExcelRelatorioPostos(relatorioGerado, nomePosto, true);
    };

    // ========== RELATÓRIO INDIVIDUAL DE FUNCIONÁRIO ==========
    const gerarRelatorioIndividual = async () => {
        if (!funcionarioSelecionado) {
            showToast('Selecione um funcionário', 'info');
            return;
        }

        setLoadingRelatorioIndividual(true);
        try {
            // Buscar dados do funcionário
            const { data: funcionario, error: errFunc } = await supabase
                .from('funcionarios')
                .select('*, cargo:cargos(*), empresa:empresas(*)')
                .eq('id', funcionarioSelecionado)
                .single();

            if (errFunc) throw errFunc;

            // Buscar folha calculada do mês
            const { data: folhaCalculada, error: errFolha } = await supabase
                .from('folha_calculada')
                .select('*')
                .eq('funcionario_id', funcionarioSelecionado)
                .eq('mes', mesIndividual)
                .eq('ano', anoIndividual)
                .maybeSingle();

            if (errFolha) throw errFolha;

            // Buscar folha de ponto do mês
            const { data: folhaPonto, error: errPonto } = await supabase
                .from('folhas_ponto')
                .select('*')
                .eq('funcionario_id', funcionarioSelecionado)
                .eq('mes', mesIndividual)
                .eq('ano', anoIndividual)
                .maybeSingle();

            if (errPonto) throw errPonto;

            if (!folhaCalculada) {
                showToast('Nenhuma folha calculada encontrada para este funcionário no período selecionado', 'info');
                setLoadingRelatorioIndividual(false);
                return;
            }

            // Calcular dias corridos do período (não apenas trabalhados)
            let diasCorridos = 0;
            let primeiroDia = 0;
            let ultimoDia = 0;
            
            if (folhaPonto?.dados_dias) {
                const dados = typeof folhaPonto.dados_dias === 'string' 
                    ? JSON.parse(folhaPonto.dados_dias) 
                    : folhaPonto.dados_dias;
                
                // Buscar TODOS os dias registrados na folha de ponto (incluindo folgas)
                const diasRegistrados: number[] = [];
                const diasComTrabalho: number[] = [];
                
                Object.keys(dados).forEach(diaKey => {
                    const diaData = dados[diaKey];
                    const diaNumero = Number.parseInt(diaKey.replace('dia_', ''));
                    if (!Number.isNaN(diaNumero)) {
                        diasRegistrados.push(diaNumero);
                        // Contar apenas dias efetivamente trabalhados para estatísticas
                        if (diaData.entrada && diaData.saida && !diaData.folga && !diaData.falta_injustificada && !diaData.atestado) {
                            diasComTrabalho.push(diaNumero);
                        }
                    }
                });
                
                if (diasRegistrados.length > 0) {
                    diasRegistrados.sort((a, b) => a - b);
                    primeiroDia = diasRegistrados[0];
                    ultimoDia = diasRegistrados[diasRegistrados.length - 1];
                    // Calcular dias corridos do primeiro ao último dia registrado
                    diasCorridos = ultimoDia - primeiroDia + 1;
                }
            }

            setRelatorioIndividualGerado({
                funcionario,
                folhaCalculada: normalizarFolhaCalculada(folhaCalculada),
                folhaPonto,
                diasTrabalhados: diasCorridos,
                primeiroDia,
                ultimoDia,
                mes: mesIndividual,
                ano: anoIndividual
            });

        } catch (error) {
            showToast('Erro ao gerar relatório individual', 'error');
        } finally {
            setLoadingRelatorioIndividual(false);
        }
    };

    // ============================================================
    // Fonte única de linhas do "Valores Discriminados"
    // Espelha exatamente o mapeamento do Relatório Detalhado por Posto
    // (lines 1360–1900) para 1 funcionário/mês. Preview e impressão
    // consomem esta função — qualquer novo item adicionado ao relatório
    // por posto aparece aqui automaticamente.
    // ============================================================
    const buildLinhasDiscriminadas = (folhaOriginal: any, diasTrabalhados: number = 0) => {
        const folha = normalizarFolhaCalculada(folhaOriginal || {});
        type Linha = { descricao: string; valor: number };
        const push = (arr: Linha[], descricao: string, valor: number) => {
            if (valor && valor !== 0) arr.push({ descricao, valor });
        };

        // ---------- PROVENTOS (ordem idêntica ao relatório por posto) ----------
        const proventos: Linha[] = [];
        if ((folha.salario_base || 0) > 0) {
            proventos.push({
                descricao: diasTrabalhados > 0 ? `Saldo salário (${diasTrabalhados} dias)` : 'Salário',
                valor: folha.salario_base || 0,
            });
        }
        push(proventos, 'Intrajornada 50%', folha.intrajornada_50 || 0);
        push(proventos, 'Intrajornada 100%', folha.intrajornada_100 || 0);
        push(proventos, 'H.E. 50%', folha.horas_extras_50 || 0);
        push(proventos, 'H.E. 100%', folha.horas_extras_100 || 0);
        push(proventos, 'D.S.R. s/ H. Extras', folha.dsr_horas_extras || 0);
        push(proventos, 'D.S.R. s/ Adicional Noturno', folha.dsr_adicional_noturno || 0);
        push(proventos, 'Adicional Noturno', folha.adicional_noturno || 0);
        push(proventos, 'Insalubridade', folha.adicional_insalubridade || 0);
        push(proventos, 'Acúmulo de Função', folha.adicional_acumulo_funcao || 0);
        push(proventos, 'Salário Família', folha.salario_familia || 0);
        push(proventos, 'Complemento Salarial', folha.complemento_salario || 0);
        push(proventos, 'Folhas de Pagamento', folha.servicos_externos_folhas_pagamento || 0);
        push(proventos, 'Controle de Rondas Palmeiras', folha.servicos_externos_controle_rondas || 0);

        // Supervisão Palmeiras: campo + evento JSON (igual posto, linhas 1454-1462)
        let supervisao = folha.supervisao_palmeiras || 0;
        if (Array.isArray(folha.eventos_excepcionais)) {
            folha.eventos_excepcionais.forEach((ev: any) => {
                if (ev?.tipo === 'provento' && ev?.descricao === 'Supervisão Palmeiras') {
                    supervisao += ev.valor || 0;
                }
            });
        }
        push(proventos, 'Supervisão Palmeiras', supervisao);

        push(proventos, '13º Salário', folha.decimo_terceiro_integral || 0);
        push(proventos, 'Vantagens 13º', folha.vantagens_13 || 0);
        push(proventos, '13º Salário 1ª Parcela', folha.decimo_terceiro_primeira_parcela || 0);
        push(proventos, '13º Salário 2ª Parcela', folha.decimo_terceiro_segunda_parcela || 0);
        push(proventos, '13º Salário Vantagens 1ª Parcela', folha.decimo_terceiro_vantagens_primeira_parcela || 0);
        push(proventos, '13º Salário Vantagens 2ª Parcela', folha.decimo_terceiro_vantagens_segunda_parcela || 0);
        push(proventos, '13º Proporc. Rescisão', folha.decimo_terceiro_proporcional_rescisao || 0);
        push(proventos, '13º Proporc. Vantagens Rescisão', folha.decimo_terceiro_vantagens_rescisao || 0);
        push(proventos, 'Férias Proporc. Rescisão', folha.ferias_proporcionais_rescisao || 0);
        push(proventos, '1/3 Férias Rescisão', folha.um_terco_ferias_proporcional_rescisao || 0);
        push(proventos, 'PLR Proporc. Rescisão', folha.plr_proporcional_rescisao || 0);

        // Eventos excepcionais de proventos (JSON) — mesmo filtro do posto
        const eventosProventosIgnorar = new Set([
            'Folhas de Pagamento',
            'Controle de Rondas Palmeiras',
            'Supervisão Palmeiras',
            '13º Salário',
            'Vantagens 13º',
            '13º Salário 1ª Parcela',
            '13º Salário 2ª Parcela',
            '13º Salário Vantagens 1ª Parcela',
            '13º Salário Vantagens 2ª Parcela',
            '13º Proporc. Rescisão',
            '13º Proporc. Vantagens Rescisão',
            'Férias Proporc. Rescisão',
            '1/3 Férias proporc. Rescisão',
            'PLR Proporc. Rescisão',
            'FT (Folga Trabalhada)',
            'Folga Trabalhada',
        ]);
        if (Array.isArray(folha.eventos_excepcionais)) {
            const agrupados = new Map<string, number>();
            folha.eventos_excepcionais.forEach((ev: any) => {
                if (ev?.tipo === 'provento' && !eventosProventosIgnorar.has(ev?.descricao)) {
                    agrupados.set(ev.descricao, (agrupados.get(ev.descricao) || 0) + (ev.valor || 0));
                }
            });
            agrupados.forEach((valor, descricao) => push(proventos, descricao, valor));
        }

        // ---------- BENEFÍCIOS ----------
        const beneficios: Linha[] = [];
        // Fallback: se não houver separação por mês, usar o campo total (vale_transporte / vale_alimentacao)
        const temSeparacaoVT = (folha.vale_transporte_mes_anterior || 0) > 0 || (folha.vale_transporte_mes_atual || 0) > 0;
        const temSeparacaoVA = (folha.vale_alimentacao_mes_anterior || 0) > 0 || (folha.vale_alimentacao_mes_atual || 0) > 0;
        push(beneficios, 'VT Mês Anterior', folha.vale_transporte_mes_anterior || 0);
        push(beneficios, 'VA Mês Anterior', folha.vale_alimentacao_mes_anterior || 0);
        if (temSeparacaoVT) {
            push(beneficios, 'VT Mês Atual', folha.vale_transporte_mes_atual || 0);
        } else {
            push(beneficios, 'Vale Transporte', folha.vale_transporte || 0);
        }
        if (temSeparacaoVA) {
            push(beneficios, 'VA Mês Atual', folha.vale_alimentacao_mes_atual || 0);
        } else {
            push(beneficios, 'Vale Alimentação', folha.vale_alimentacao || 0);
        }
        push(beneficios, 'VT Folgas Trabalhadas', folha.valor_vt_folgas_trabalhadas || 0);
        push(beneficios, 'VA Folgas Trabalhadas', folha.valor_va_folgas_trabalhadas || 0);
        push(beneficios, 'Cesta Básica', folha.cesta_basica || 0);
        push(beneficios, 'PLR', folha.plr || 0);
        push(beneficios, 'Prêmio de Permanência', folha.premio_permanencia || 0);
        push(beneficios, 'Reembolsos', folha.reembolsos_uber || 0);
        push(beneficios, 'Folga(s) Trabalhada(s)', folha.folga_trabalhada || 0);
        push(beneficios, 'Desc. VT por Faltas', -(folha.desconto_vt_faltas || 0));
        push(beneficios, 'Desc. VA por Faltas', -(folha.desconto_va_faltas || 0));
        push(beneficios, 'Desc. Rondas (Benefício)', -(folha.desc_rondas_nao_realizadas_benef || 0));
        push(beneficios, 'Desc. Ajuste dos Benefícios', -(folha.desc_ajuste_beneficios || 0));

        // Eventos excepcionais de benefícios (JSON) — mesmo filtro do posto
        const eventosBeneficiosIgnorar = new Set([
            'VT Mês Anterior',
            'VA Mês Anterior',
            'VT Mês Atual',
            'VA Mês Atual',
            'Vale Transporte',
            'Vale Alimentação',
            'VT Folgas Trabalhadas',
            'VA Folgas Trabalhadas',
            'Cesta Básica',
            'PLR',
            'Prêmio de Permanência',
            'Reembolsos',
            'Reembolsos (Uber)',
            'Folga(s) Trabalhada(s)',
            'Folga Trabalhada',
            'FT (Folga Trabalhada)',
            'Desc. VT por Faltas',
            'Desc. VA por Faltas',
            'Desc. Rondas (Benefício)',
            'Desc. Rondas não Realizadas (Benefício)',
            'Desc. Rondas não Realizadas',
            'Desc. Ajuste dos Benefícios',
        ]);
        if (Array.isArray(folha.eventos_excepcionais)) {
            const agrupados = new Map<string, number>();
            folha.eventos_excepcionais.forEach((ev: any) => {
                if (ev?.tipo === 'beneficio' && !eventosBeneficiosIgnorar.has(ev?.descricao)) {
                    agrupados.set(ev.descricao, (agrupados.get(ev.descricao) || 0) + (ev.valor || 0));
                }
            });
            agrupados.forEach((valor, descricao) => push(beneficios, descricao, valor));
        }



        // ---------- DESCONTOS (ordem idêntica ao relatório por posto) ----------
        const descontos: Linha[] = [];
        push(descontos, 'INSS', folha.desconto_inss || 0);
        push(descontos, 'IRRF', folha.desconto_irrf || 0);
        push(descontos, 'Vale Transporte', folha.desconto_vt || 0);
        push(descontos, 'Contribuição Assistencial', folha.desconto_contribuicao_assistencial || 0);
        push(descontos, 'Pensão Alimentícia', folha.desconto_pensao_alimenticia || 0);
        push(descontos, 'Desc. Faltas', folha.desconto_faltas || 0);
        push(descontos, 'Desc. DSR s/ Faltas', folha.desconto_dsr_faltas || 0);
        push(descontos, 'Desc. Atrasos', folha.desconto_atrasos || 0);
        push(descontos, 'Adiantamento Quinzenal', folha.desconto_adiantamento_quinzenal || 0);
        push(descontos, 'Adiantam. de Salário', folha.desconto_adiantamento_salario || 0);
        push(descontos, 'Desc. PLR', folha.desconto_plr || 0);
        push(descontos, 'Seguro de Vida', folha.desconto_seguro_vida || 0);
        push(descontos, 'Convênio Odonto', folha.desconto_convenio_odonto || 0);
        push(descontos, 'Desc. Rondas não Realizadas (Salário)', folha.desconto_rondas_nao_realizadas || 0);
        push(descontos, 'Desc. Rondas não Realizadas (Benefício)', folha.desc_rondas_nao_realizadas_benef || 0);
        push(descontos, 'Desc. Avaria Utilitário (Parcela)', folha.desc_avaria_utilitario || 0);
        push(descontos, 'Desc. Complemento Anterior', folha.desconto_complemento_anterior || 0);
        push(descontos, 'INSS 13º', folha.inss_13 || 0);
        push(descontos, 'INSS Férias', folha.inss_ferias || 0);
        push(descontos, 'Adiantam. 13º Salário', folha.adiantamento_13_salario || 0);
        push(descontos, 'Adiantam. Vantagens 13º', folha.adiantamento_vantagens_13 || 0);

        // Eventos excepcionais de descontos (JSON) — mesmo filtro do posto
        const eventosDescontosIgnorar = new Set([
            'Adiantam. de Salário',
            'Adiantam. 13º Salário',
            'Adiantam. Vantagens 13º',
            'Desc. Avaria Utilitário',
            'Desc. Avaria Utilitário (Parcela)',
        ]);
        if (Array.isArray(folha.eventos_excepcionais)) {
            const agrupados = new Map<string, number>();
            folha.eventos_excepcionais.forEach((ev: any) => {
                if (ev?.tipo === 'desconto' && !eventosDescontosIgnorar.has(ev?.descricao)) {
                    agrupados.set(ev.descricao, (agrupados.get(ev.descricao) || 0) + (ev.valor || 0));
                }
            });
            agrupados.forEach((valor, descricao) => push(descontos, descricao, valor));
        }

        const totalProventos = proventos.reduce((s, p) => s + p.valor, 0);
        const totalBeneficios = beneficios.reduce((s, b) => s + b.valor, 0);
        const totalDescontos = descontos.reduce((s, d) => s + d.valor, 0);
        const totalLiquido = totalProventos + totalBeneficios - totalDescontos;

        return { proventos, beneficios, descontos, totalProventos, totalBeneficios, totalDescontos, totalLiquido };
    };

    const imprimirRelatorioIndividual = () => {
        if (!relatorioIndividualGerado) return;

        const { funcionario, folhaCalculada, diasTrabalhados, primeiroDia, ultimoDia, mes: mesRel, ano: anoRel } = relatorioIndividualGerado;
        
        const formatarData = (data: string) => {
            if (!data) return '';
            const d = new Date(data);
            return d.toLocaleDateString('pt-BR');
        };

        const formatarMoedaRelatorio = (valor: number) => {
            return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        // Calcular datas para o cabeçalho
        const primeiroDiaMes = `01/${mesRel.toString().padStart(2, '0')}/${anoRel}`;
        const ultimoDiaTrabalhadoMes = ultimoDia > 0 ? `${ultimoDia.toString().padStart(2, '0')}/${mesRel.toString().padStart(2, '0')}/${anoRel}` : `${new Date(anoRel, mesRel, 0).getDate().toString().padStart(2, '0')}/${mesRel.toString().padStart(2, '0')}/${anoRel}`;

        // Linhas discriminadas — fonte única compartilhada com o preview
        const { proventos, beneficios, descontos, totalProventos, totalBeneficios, totalDescontos, totalLiquido } =
            buildLinhasDiscriminadas(folhaCalculada, diasTrabalhados);
        const totalBruto = totalProventos;


        // Gerar HTML
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('Não foi possível abrir a janela de impressão', 'error');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Valores Discriminados - ${funcionario.nome_completo}</title>
                <style>
                    /* CSS otimizado para impressão e PDF */
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 15mm 10mm 15mm 10mm; 
                        }
                        body { 
                            margin: 0; 
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .no-break {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        .section-title {
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                    }
                    
                    @media screen {
                        body {
                            background: #f5f5f5;
                            padding: 20px;
                        }
                    }
                    
                    body { 
                        font-family: Arial, sans-serif; 
                        font-size: 11px; 
                        line-height: 1.3;
                        color: #000;
                        max-width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .container {
                        max-width: 190mm; /* Largura máxima para A4 */
                        margin: 0 auto;
                        background: white;
                        padding: 15px;
                        box-sizing: border-box;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 15px;
                        page-break-inside: avoid;
                    }
                    .header h1 {
                        font-size: 14px;
                        font-weight: bold;
                        margin: 0 0 8px 0;
                        text-transform: uppercase;
                    }
                    .header p {
                        margin: 3px 0;
                        font-size: 10px;
                    }
                    
                    .funcionario {
                        margin-bottom: 12px;
                        font-size: 10px;
                        page-break-inside: avoid;
                    }
                    
                    .salario-base {
                        font-weight: bold;
                        font-size: 12px;
                        margin-bottom: 15px;
                        page-break-inside: avoid;
                    }
                    
                    .section-title {
                        font-weight: bold;
                        font-size: 11px;
                        margin-top: 15px;
                        margin-bottom: 8px;
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    
                    .item {
                        display: flex;
                        justify-content: space-between;
                        padding: 2px 0;
                        padding-left: 15px;
                        font-size: 10px;
                        page-break-inside: avoid;
                    }
                    
                    .item-descricao {
                        flex: 1;
                        margin-right: 10px;
                    }
                    
                    .item-valor {
                        text-align: right;
                        min-width: 80px;
                        font-weight: 500;
                        min-width: 120px;
                        white-space: nowrap;
                    }
                    .total {
                        display: flex;
                        justify-content: space-between;
                        font-weight: bold;
                        margin-top: 10px;
                        padding-top: 8px;
                        border-top: 1px solid #000;
                        font-size: 11px;
                        page-break-inside: avoid;
                    }
                    
                    .total-final {
                        display: flex;
                        justify-content: space-between;
                        font-weight: bold;
                        font-size: 12px;
                        margin-top: 15px;
                        padding-top: 10px;
                        border-top: 2px solid #000;
                        page-break-inside: avoid;
                    }
                    
                    /* Evitar quebras de página inadequadas */
                    .section-group {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header no-break">
                        <h1>VALORES DISCRIMINADOS</h1>
                        <p>Admissão: ${formatarData(funcionario.data_admissao)} | Fechamento: ${ultimoDiaTrabalhadoMes}</p>
                        <p> Período de cálculo das verbas salariais e benefícios: ${primeiroDiaMes} a ${ultimoDiaTrabalhadoMes}</p>
                    </div>
                    
                    <div class="funcionario no-break">
                        <strong>FUNCIONÁRIO:</strong> ${funcionario.nome_completo}
                    </div>
                    
                    <div class="salario-base no-break">
                        SALÁRIO BASE: ${formatarMoedaRelatorio(funcionario.cargo?.salario_base || funcionario.salario_base || folhaCalculada.salario_base || 0)}
                    </div>
                
                    <div class="section-group">
                        <div class="section-title">Vencimentos:</div>
                        ${proventos.map(p => `
                            <div class="item">
                                <span class="item-descricao">${p.descricao}</span>
                                <span class="item-valor">${formatarMoedaRelatorio(p.valor)}</span>
                            </div>
                        `).join('')}
                    </div>
                
                    <div class="total no-break">
                        <span>Total bruto a receber:</span>
                        <span>${formatarMoedaRelatorio(totalBruto)}</span>
                    </div>
                
                    ${beneficios.length > 0 ? `
                        <div class="section-group">
                            <div class="section-title">Benefícios:</div>
                            ${beneficios.map(b => `
                                <div class="item">
                                    <span class="item-descricao">${b.descricao}</span>
                                    <span class="item-valor">${formatarMoedaRelatorio(b.valor)}</span>
                                </div>
                            `).join('')}
                            <div class="total no-break">
                                <span><strong>Total dos Benefícios:</strong></span>
                                <span><strong>${formatarMoedaRelatorio(totalBeneficios)}</strong></span>
                            </div>
                        </div>
                    ` : ''}
                
                    ${descontos.length > 0 ? `
                        <div class="section-group">
                            <div class="section-title">Descontos:</div>
                            ${descontos.map(d => `
                                <div class="item">
                                    <span class="item-descricao">${d.descricao}</span>
                                    <span class="item-valor">${formatarMoedaRelatorio(d.valor)}</span>
                                </div>
                            `).join('')}
                            <div class="total no-break">
                                <span><strong>Total dos Descontos:</strong></span>
                                <span><strong>${formatarMoedaRelatorio(totalDescontos)}</strong></span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="total-final no-break">
                        <span>Total líquido a receber:</span>
                        <span>${formatarMoedaRelatorio(totalLiquido)}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        escreverEExibirJanela(printWindow, html, 'Relatório');
    };

    const exportarParaExcel = async () => {
        if (!relatorioGerado || relatorioGerado.length === 0) {
            showToast('Nenhum dado para exportar', 'info');
            return;
        }

        const folhas = relatorioGerado;
        
        // Funções auxiliares que retornam valores já salvos na folha_calculada (não recalculam)
        const calcularSalarioBruto = (f: any) => {
            return f.total_proventos || 0;
        };

        const calcularTotalDescontos = (f: any) => {
            return f.total_descontos || 0;
        };

        const calcularBeneficios = (f: any) => {
            return f.total_beneficios || 0;
        };
        
        // Criar dados para a planilha
        const dados: any[][] = [];
        
        // Cabeçalho
        const cabecalho = ['Descrição', ...folhas.map((f: any) => {
            const nomeCompleto = f.funcionario?.nome_completo || f.nome_funcionario || 'N/A';
            const partes = nomeCompleto.split(' ');
            const primeiroNome = partes[0] || 'N/A';
            const inicialSobrenome = partes[1] ? partes[1][0] + '.' : '';
            return `${primeiroNome} ${inicialSobrenome}`;
        }), 'TOTAL'];
        dados.push(cabecalho);



        // TOTAL A DEPOSITAR
        let totalDepositar = 0;
        const linhaDepositar = ['TOTAL A DEPOSITAR (5º DIA ÚTIL)', ...folhas.map((f: any) => {
            const proventos = f.total_proventos || 0;
            const descontos = f.total_descontos || 0;
            const beneficios = calcBeneficiosFuncionario(f);
            const valor = proventos - descontos + beneficios;
            totalDepositar += valor;
            return valor;
        }), totalDepositar];
        dados.push(linhaDepositar);

        // Linha em branco
        dados.push([]);

        // PROVENTOS
        dados.push(['=== PROVENTOS ===']);
        
        // Adicionar linhas de proventos
        const proventosConfig = [
            { label: 'Salário', campo: 'salario_base' },
            { label: 'Intrajornada 50%', campo: 'intrajornada_50' },
            { label: 'Intrajornada 100%', campo: 'intrajornada_100' },
            { label: 'H.E. 50%', campo: 'horas_extras_50' },
            { label: 'H.E. 100%', campo: 'horas_extras_100' },
            { label: 'D.S.R. s/ H. Extras', campo: 'dsr_horas_extras' },
            { label: 'D.S.R. s/ Adicional Noturno', campo: 'dsr_adicional_noturno' },
            { label: 'Adicional Noturno', campo: 'adicional_noturno' },
            { label: 'Insalubridade', campo: 'adicional_insalubridade' },
            { label: 'Acúmulo de Função', campo: 'adicional_acumulo_funcao' },
            { label: 'Salário Família', campo: 'salario_familia' },
            { label: 'Complemento Salarial', campo: 'complemento_salario' },
            { label: 'Folhas de Pagamento', campo: 'servicos_externos_folhas_pagamento' },
            { label: 'Controle de Rondas Palmeiras', campo: 'servicos_externos_controle_rondas' },
            { label: 'Supervisão Palmeiras', campo: 'supervisao_palmeiras' },
            { label: '13º Salário', campo: 'decimo_terceiro_integral' },
            { label: 'Vantagens 13º', campo: 'vantagens_13' },
            { label: '13º Salário 1ª Parcela', campo: 'decimo_terceiro_primeira_parcela' },
            { label: '13º Salário 2ª Parcela', campo: 'decimo_terceiro_segunda_parcela' },
            { label: '13º Salário Vantagens 1ª Parcela', campo: 'decimo_terceiro_vantagens_primeira_parcela' },
            { label: '13º Salário Vantagens 2ª Parcela', campo: 'decimo_terceiro_vantagens_segunda_parcela' },
            { label: '13º Proporc. Rescisão', campo: 'decimo_terceiro_proporcional_rescisao' },
            { label: '13º Proporc. Vantagens Rescisão', campo: 'decimo_terceiro_vantagens_rescisao' },
            { label: 'Férias Proporc. Rescisão', campo: 'ferias_proporcionais_rescisao' },
            { label: '1/3 Férias proporc. Rescisão', campo: 'um_terco_ferias_proporcional_rescisao' },
            { label: 'PLR Proporc. Rescisão', campo: 'plr_proporcional_rescisao' },
        ];

        proventosConfig.forEach(({ label, campo }) => {
            let total = 0;
            const valores = folhas.map((f: any) => {
                const valor = f[campo] || 0;
                total += valor;
                return valor;
            });
            if (total > 0) {
                dados.push([label, ...valores, total]);
            }
        });

        // Salário Bruto
        let totalSalarioBruto = 0;
        const linhaSalarioBruto = ['Salário Bruto', ...folhas.map((f: any) => {
            const valor = f.total_proventos || 0; // Usar valor salvo
            totalSalarioBruto += valor;
            return valor;
        }), totalSalarioBruto];
        dados.push(linhaSalarioBruto);

        // Linha em branco
        dados.push([]);

        // DESCONTOS
        dados.push(['=== DESCONTOS ===']);
        
        const descontosConfig = [
            { label: 'INSS', campo: 'desconto_inss' },
            { label: 'IRRF', campo: 'desconto_irrf' },
            { label: 'Vale Transporte', campo: 'desconto_vt' },
            { label: 'Contribuição Assistencial', campo: 'desconto_contribuicao_assistencial' },
            { label: 'Pensão Alimentícia', campo: 'desconto_pensao_alimenticia' },
            { label: 'Desc. Faltas', campo: 'desconto_faltas' },
            { label: 'Desc. DSR s/ Faltas', campo: 'desconto_dsr_faltas' },
            { label: 'Desc. Atrasos', campo: 'desconto_atrasos' },
            { label: 'Adiantamento Quinzenal', campo: 'desconto_adiantamento_quinzenal' },
            { label: 'Desc. Complemento Anterior', campo: 'desconto_complemento_anterior' },
            { label: 'Adiantam. de Salário', campo: 'desconto_adiantamento_salario' },
            { label: 'Desc. PLR', campo: 'desconto_plr' },
            { label: 'Seguro de Vida', campo: 'desconto_seguro_vida' },
            { label: 'Convênio Odonto', campo: 'desconto_convenio_odonto' },
            { label: 'Desc. Rondas (Salário)', campo: 'desconto_rondas_nao_realizadas' },
            { label: 'Desc. Rondas (Benefício)', campo: 'desc_rondas_nao_realizadas_benef' },
            { label: 'Desc. Avaria Utilitário', campo: 'desc_avaria_utilitario' },
            // ⚠️ REMOVIDO: Desc. VT/VA por Faltas são BENEFÍCIOS negativos, não descontos
            // { label: 'Desc. VT por Faltas', campo: 'desconto_vt_faltas' },
            // { label: 'Desc. VA por Faltas', campo: 'desconto_va_faltas' },
            { label: 'INSS 13º', campo: 'inss_13' },
            { label: 'INSS Férias', campo: 'inss_ferias' },
            // ⚠️ REMOVIDO: Duplicação de Adiantam. de Salário
            // { label: 'Adiantam. de Salário', campo: 'desconto_adiantamento_salario' },
            { label: 'Adiantam. 13º Salário', campo: 'adiantamento_13_salario' },
            { label: 'Adiantam. Vantagens 13º', campo: 'adiantamento_vantagens_13' },
        ];

        descontosConfig.forEach(({ label, campo }) => {
            let total = 0;
            const valores = folhas.map((f: any) => {
                const valor = f[campo] || 0;
                total += valor;
                return valor;
            });
            if (total > 0) {
                dados.push([label, ...valores, total]);
            }
        });

        // Total Descontos
        let totalDescontosGeral = 0;
        const linhaTotalDescontos = ['Total Descontos', ...folhas.map((f: any) => {
            const valor = f.total_descontos || 0; // Usar valor salvo
            totalDescontosGeral += valor;
            return valor;
        }), totalDescontosGeral];
        dados.push(linhaTotalDescontos);

        // Salário Líquido
        let totalSalarioLiquido = 0;
        const linhaSalarioLiquido = ['Salário Líquido', ...folhas.map((f: any) => {
            const valor = (f.total_proventos || 0) - (f.total_descontos || 0); // Usar valores salvos
            totalSalarioLiquido += valor;
            return valor;
        }), totalSalarioLiquido];
        dados.push(linhaSalarioLiquido);

        // Linha em branco
        dados.push([]);

        // BENEFÍCIOS
        dados.push(['=== BENEFÍCIOS ===']);
        
        const beneficiosConfig = [
            { label: 'VT Mês Anterior', calc: (f: any) => f.vale_transporte_mes_anterior || 0 },
            { label: 'VA Mês Anterior', calc: (f: any) => f.vale_alimentacao_mes_anterior || 0 },
            { label: 'VT Mês Atual', calc: (f: any) => f.vale_transporte_mes_atual || 0 },
            { label: 'VA Mês Atual', calc: (f: any) => f.vale_alimentacao_mes_atual || 0 },
            { label: 'VT Folgas Trabalhadas', calc: (f: any) => f.valor_vt_folgas_trabalhadas || 0 },
            { label: 'VA Folgas Trabalhadas', calc: (f: any) => f.valor_va_folgas_trabalhadas || 0 },
            { label: 'Cesta Básica', calc: (f: any) => f.cesta_basica || 0 },
            { label: 'Prêmio de Permanência', calc: (f: any) => f.premio_permanencia || 0 },
            { label: 'Reembolsos', calc: (f: any) => f.reembolsos_uber || 0 },
            { label: 'Folga(s) Trabalhada(s)', calc: (f: any) => f.folga_trabalhada || 0 },
            { label: 'Desc. VT por Faltas', calc: (f: any) => -(f.desconto_vt_faltas || 0) },
            { label: 'Desc. VA por Faltas', calc: (f: any) => -(f.desconto_va_faltas || 0) },
            { label: 'Desc. Rondas (Benefício)', calc: (f: any) => -(f.desc_rondas_nao_realizadas_benef || 0) },
            { label: 'Desc. Ajuste dos Benefícios', calc: (f: any) => -(f.desc_ajuste_beneficios || 0) },
        ];

        beneficiosConfig.forEach(({ label, calc }) => {
            let total = 0;
            const valores = folhas.map((f: any) => {
                const valor = calc(f);
                total += valor;
                return valor;
            });
            // Mostrar item se houver qualquer valor não-zero (positivo ou negativo)
            if (folhas.some((f: any) => calc(f) !== 0)) {
                dados.push([label, ...valores, total]);
            }
        });

        // Total Benefícios
        let totalBeneficiosGeral = 0;
        const linhaTotalBeneficios = ['Total Benefícios', ...folhas.map((f: any) => {
            const valor = f.total_beneficios || 0; // Usar valor salvo
            totalBeneficiosGeral += valor;
            return valor;
        }), totalBeneficiosGeral];
        dados.push(linhaTotalBeneficios);

        // Salário Líquido + Benefícios
        let totalLiquidoBeneficios = 0;
        const linhaLiquidoBeneficios = ['Salário Líquido + Benefícios', ...folhas.map((f: any) => {
            // Recalcular: Proventos - Descontos + Benefícios (com descontos aplicados corretamente)
            const proventos = f.total_proventos || 0;
            const descontos = f.total_descontos || 0;
            const beneficios = calcBeneficiosFuncionario(f);
            const valor = proventos - descontos + beneficios;
            totalLiquidoBeneficios += valor;
            return valor;
        }), totalLiquidoBeneficios];
        dados.push(linhaLiquidoBeneficios);

        // Criar workbook e worksheet com ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatório');

        // Adicionar dados ao worksheet
        dados.forEach((row, index) => {
            const excelRow = worksheet.addRow(row);
            
            // Estilizar cabeçalho
            if (index === 0) {
                excelRow.eachCell((cell) => {
                    cell.font = { bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0E0E0' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        // Ajustar largura das colunas
        worksheet.getColumn(1).width = 30; // Primeira coluna mais larga
        for (let i = 2; i <= folhas.length + 1; i++) {
            worksheet.getColumn(i).width = 12;
        }

        // Gerar arquivo e fazer download
        const nomeArquivo = `Relatorio_${nomePosto.replace(/\s+/g, '_')}_${meses[mes - 1]}_${ano}.xlsx`;
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, nomeArquivo);
        
        showToast(`Arquivo ${nomeArquivo} exportado com sucesso!`, 'success');
    };

    const gerarExcelRelatorioPostos = (folhas: any[], nomePostoParam: string, paraImpressao: boolean = false) => {
        // Funções auxiliares que retornam valores já salvos na folha_calculada (não recalculam)
        const calcularSalarioBruto = (f: any) => {
            return f.total_proventos || 0;
        };

        const calcularTotalDescontos = (f: any) => {
            return f.total_descontos || 0;
        };

        const calcularBeneficios = (f: any) => {
            return f.total_beneficios || 0;
        };

        // Se for para impressão, criar janela
        let printWindow: Window | null = null;
        if (paraImpressao) {
            printWindow = window.open('', '_blank');
            if (!printWindow) {
                showToast('Não foi possível abrir a janela de impressão', 'error');
                return;
            }
        }

        // Calcular totais
        const totais = {
            resumo_lancamentos: 0,
            proventos: {
                salario: 0,
                intrajornada_50: 0,
                intrajornada_100: 0,
                he_50: 0,
                he_100: 0,
                dsr_he: 0,
                dsr_noturno: 0,
                adicional_noturno: 0,
                insalubridade: 0,
                acumulo_funcao: 0,
                salario_familia: 0,
                complemento_salario: 0,
                // Novos eventos excepcionais de proventos
                folga_trabalhada: 0,
                servicos_externos_folhas: 0,
                servicos_externos_rondas: 0,
                supervisao_palmeiras: 0,
                decimo_terceiro_rescisao: 0,
                decimo_terceiro_vantagens_rescisao: 0,
                ferias_rescisao: 0,
                um_terco_ferias_rescisao: 0,
                plr_rescisao: 0,
                decimo_terceiro_primeira: 0,
                decimo_terceiro_segunda: 0,
                decimo_terceiro_vantagens_primeira: 0,
                decimo_terceiro_vantagens_segunda: 0,
                decimo_terceiro_integral: 0,
                vantagens_13: 0,
                salario_bruto: 0
            },
            descontos: {
                inss: 0,
                irrf: 0,
                vt: 0,
                contribuicao_assistencial: 0,
                pensao: 0,
                faltas: 0,
                dsr_faltas: 0,
                atrasos: 0,
                adiantamento: 0,
                complemento_anterior: 0,
                adiantamento_salario: 0,
                plr: 0,
                seguro_vida: 0,
                convenio_odonto: 0,
                rondas: 0,
                rondas_benef: 0,
                avaria_utilitario: 0,
                vt_faltas: 0,
                va_faltas: 0,
                // Novos eventos excepcionais de descontos
                inss_13: 0,
                inss_ferias: 0,
                adiantamento_13_salario: 0,
                adiantamento_vantagens_13: 0,
                total_descontos: 0
            },
            salario_liquido: 0,
            beneficios: {
                vt_mes_anterior: 0,
                va_mes_anterior: 0,
                vt_mes_atual: 0,
                va_mes_atual: 0,
                vt_folgas_trabalhadas: 0,
                va_folgas_trabalhadas: 0,
                cesta_basica: 0,
                premio_permanencia: 0,
                reembolsos_uber: 0,
                folga_trabalhada: 0,
                rondas_benef: 0,
                desc_ajuste_beneficios: 0,
                total_beneficios: 0
            },
            salario_liquido_beneficios: 0,
            encargos: {
                fgts: 0,
                inss_patronal: 0,
                total_encargos: 0
            }
        };

        folhas.forEach(f => {
            totais.proventos.salario += f.salario_base || 0;
            totais.proventos.intrajornada_50 += f.intrajornada_50 || 0;
            totais.proventos.intrajornada_100 += f.intrajornada_100 || 0;
            totais.proventos.he_50 += f.horas_extras_50 || 0;
            totais.proventos.he_100 += f.horas_extras_100 || 0;
            totais.proventos.dsr_he += f.dsr_horas_extras || 0;
            totais.proventos.dsr_noturno += f.dsr_adicional_noturno || 0;
            totais.proventos.adicional_noturno += f.adicional_noturno || 0;
            totais.proventos.insalubridade += f.adicional_insalubridade || 0;
            totais.proventos.acumulo_funcao += f.adicional_acumulo_funcao || 0;
            totais.proventos.salario_familia += f.salario_familia || 0;
            totais.proventos.complemento_salario += f.complemento_salario || 0;
            
            // Novos eventos excepcionais de proventos (campos específicos)
            totais.proventos.folga_trabalhada += f.folga_trabalhada || 0;
            totais.proventos.servicos_externos_folhas += f.servicos_externos_folhas_pagamento || 0;
            totais.proventos.servicos_externos_rondas += f.servicos_externos_controle_rondas || 0;
            // Somar supervisao_palmeiras do campo direto E dos eventos_excepcionais
            totais.proventos.supervisao_palmeiras += f.supervisao_palmeiras || 0;
            if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                f.eventos_excepcionais.forEach((ev: any) => {
                    if (ev.tipo === 'provento' && ev.descricao === 'Supervisão Palmeiras') {
                        totais.proventos.supervisao_palmeiras += ev.valor || 0;
                    }
                });
            }
            totais.proventos.decimo_terceiro_rescisao += f.decimo_terceiro_proporcional_rescisao || 0;
            totais.proventos.decimo_terceiro_vantagens_rescisao += f.decimo_terceiro_vantagens_rescisao || 0;
            totais.proventos.ferias_rescisao += f.ferias_proporcionais_rescisao || 0;
            totais.proventos.um_terco_ferias_rescisao += f.um_terco_ferias_proporcional_rescisao || 0;
            totais.proventos.plr_rescisao += f.plr_proporcional_rescisao || 0;
            totais.proventos.decimo_terceiro_primeira += f.decimo_terceiro_primeira_parcela || 0;
            totais.proventos.decimo_terceiro_segunda += f.decimo_terceiro_segunda_parcela || 0;
            totais.proventos.decimo_terceiro_vantagens_primeira += f.decimo_terceiro_vantagens_primeira_parcela || 0;
            totais.proventos.decimo_terceiro_vantagens_segunda += f.decimo_terceiro_vantagens_segunda_parcela || 0;
            totais.proventos.decimo_terceiro_integral += f.decimo_terceiro_integral || 0;
            totais.proventos.vantagens_13 += f.vantagens_13 || 0;
            
            // Processar eventos excepcionais de proventos (JSON - outros eventos livres)
            // Somar apenas os que NÃO têm campos específicos (para evitar duplicação)
            if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                const eventosComCampoEspecifico = [
                    'Folhas de Pagamento', 'Controle de Rondas Palmeiras', 'Supervisão Palmeiras',
                    '13º Salário', 'Vantagens 13º', '13º Salário 1ª Parcela', '13º Salário 2ª Parcela',
                    '13º Salário Vantagens 1ª Parcela', '13º Salário Vantagens 2ª Parcela',
                    '13º Proporc. Rescisão', '13º Proporc. Vantagens Rescisão',
                    'Férias Proporc. Rescisão', '1/3 Férias proporc. Rescisão', 'PLR Proporc. Rescisão',
                    'FT (Folga Trabalhada)', 'Folga Trabalhada'
                ];
                f.eventos_excepcionais.forEach((evento: any) => {
                    if (evento.tipo === 'provento' && !eventosComCampoEspecifico.includes(evento.descricao)) {
                        totais.proventos.salario_bruto += evento.valor || 0;
                    }
                });
            }

            totais.descontos.inss += f.desconto_inss || 0;
            totais.descontos.irrf += f.desconto_irrf || 0;
            totais.descontos.vt += f.desconto_vt || 0;
            totais.descontos.contribuicao_assistencial += f.desconto_contribuicao_assistencial || 0;
            totais.descontos.pensao += f.desconto_pensao_alimenticia || 0;
            totais.descontos.faltas += f.desconto_faltas || 0;
            totais.descontos.dsr_faltas += f.desconto_dsr_faltas || 0;
            totais.descontos.atrasos += f.desconto_atrasos || 0;
            totais.descontos.adiantamento += f.desconto_adiantamento_quinzenal || 0;
            totais.descontos.complemento_anterior += f.desconto_complemento_anterior || 0;
            totais.descontos.adiantamento_salario += f.desconto_adiantamento_salario || 0;
            totais.descontos.plr += f.desconto_plr || 0;
            totais.descontos.seguro_vida += f.desconto_seguro_vida || 0;
            totais.descontos.convenio_odonto += f.desconto_convenio_odonto || 0;
            totais.descontos.rondas += f.desconto_rondas_nao_realizadas || 0;
            totais.descontos.rondas_benef += f.desc_rondas_nao_realizadas_benef || 0;
            totais.descontos.avaria_utilitario += f.desc_avaria_utilitario || 0;
            totais.descontos.vt_faltas += f.desconto_vt_faltas || 0;
            totais.descontos.va_faltas += f.desconto_va_faltas || 0;
            
            // Novos eventos excepcionais de descontos (campos específicos)
            totais.descontos.inss_13 += f.inss_13 || 0;
            totais.descontos.inss_ferias += f.inss_ferias || 0;
            totais.descontos.adiantamento_13_salario += f.adiantamento_13_salario || 0;
            totais.descontos.adiantamento_vantagens_13 += f.adiantamento_vantagens_13 || 0;
            
            // Processar eventos excepcionais de descontos (JSON) - apenas os eventos livres sem campo específico
            if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                const descontosComCampoEspecifico = [
                    'Adiantam. de Salário', 'Adiantam. 13º Salário',
                    'Desc. Rondas não Realizadas', 'Avaria Utilitário',
                    'Pensão Alimentícia', 'Desconto PLR'
                ];
                f.eventos_excepcionais.forEach((evento: any) => {
                    if (evento.tipo === 'desconto' && !descontosComCampoEspecifico.includes(evento.descricao)) {
                        // Eventos livres de desconto já estão em total_descontos salvo no banco
                        // Não somar novamente para evitar duplicação
                    }
                });
            }

            totais.salario_liquido += f.salario_liquido || 0;

            totais.beneficios.vt_mes_anterior += f.vale_transporte_mes_anterior || 0;
            totais.beneficios.va_mes_anterior += f.vale_alimentacao_mes_anterior || 0;
            totais.beneficios.vt_mes_atual += f.vale_transporte_mes_atual || 0;
            totais.beneficios.va_mes_atual += f.vale_alimentacao_mes_atual || 0;
            totais.beneficios.vt_folgas_trabalhadas += f.valor_vt_folgas_trabalhadas || 0;
            totais.beneficios.va_folgas_trabalhadas += f.valor_va_folgas_trabalhadas || 0;
            totais.beneficios.cesta_basica += f.cesta_basica || 0;
            totais.beneficios.premio_permanencia += f.premio_permanencia || 0;
            totais.beneficios.reembolsos_uber += f.reembolsos_uber || 0;
            totais.beneficios.folga_trabalhada += f.folga_trabalhada || 0;
            totais.beneficios.rondas_benef += f.desc_rondas_nao_realizadas_benef || 0;
            totais.beneficios.desc_ajuste_beneficios += f.desc_ajuste_beneficios || 0;

            totais.salario_liquido_beneficios += (f.total_proventos || 0) - (f.total_descontos || 0) + calcBeneficiosFuncionario(f);

            totais.encargos.fgts += f.fgts || 0;
            totais.encargos.inss_patronal += f.inss_patronal || 0;
            totais.encargos.total_encargos += (f.fgts || 0) + (f.inss_patronal || 0);
        });

        // Calcular salário bruto corretamente somando todos os campos individuais
        totais.proventos.salario_bruto = totais.proventos.salario + totais.proventos.intrajornada_50 + 
            totais.proventos.intrajornada_100 + totais.proventos.he_50 + totais.proventos.he_100 + 
            totais.proventos.dsr_he + totais.proventos.dsr_noturno + totais.proventos.adicional_noturno + 
            totais.proventos.insalubridade + totais.proventos.acumulo_funcao + totais.proventos.salario_familia + 
            totais.proventos.complemento_salario + 
            totais.proventos.servicos_externos_folhas + totais.proventos.servicos_externos_rondas + 
            totais.proventos.supervisao_palmeiras +
            totais.proventos.decimo_terceiro_primeira + totais.proventos.decimo_terceiro_segunda + 
            totais.proventos.decimo_terceiro_vantagens_primeira + totais.proventos.decimo_terceiro_vantagens_segunda + 
            totais.proventos.decimo_terceiro_integral + totais.proventos.vantagens_13 + 
            totais.proventos.decimo_terceiro_rescisao + totais.proventos.decimo_terceiro_vantagens_rescisao + 
            totais.proventos.ferias_rescisao + totais.proventos.um_terco_ferias_rescisao + totais.proventos.plr_rescisao;

        // Calcular total de descontos usando valores salvos
        totais.descontos.total_descontos = folhas.reduce((sum: number, f: any) => sum + (f.total_descontos || 0), 0);

        // Calcular total de benefícios usando calcBeneficiosFuncionario (inclui eventos excepcionais)
        totais.beneficios.total_beneficios = folhas.reduce((sum: number, f: any) => sum + calcBeneficiosFuncionario(f), 0);

        totais.resumo_lancamentos = totais.salario_liquido_beneficios + totais.encargos.total_encargos;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório Detalhado - ${nomePostoParam} - ${meses[mes - 1]}/${ano}</title>
                <style>
                    @media print {
                        @page { size: landscape; margin: 10mm; }
                        body { margin: 0; }
                    }
                    body { font-family: Arial, sans-serif; font-size: 11px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 2px; text-align: center; }
                    th { background-color: #f3e0aaff; font-weight: bold; text-align: center; }
                    .section-header { background-color: #90bbf1ff; font-weight: bold; text-align: left; }
                    .total-row { background-color: #f3e0aaff; font-weight: bold; }
                    .text-left { text-align: left; }
                    .highlight { background-color: #f2c54aff; }
                </style>
            </head>
            <body>
                <h2>RESUMO DOS LANÇAMENTOS - ${nomePostoParam.toUpperCase()}</h2>
                <h3>${meses[mes - 1]}/${ano}</h3>
                
                <table>
                    <colgroup>
                        <col style="width: 90px;">
                        ${folhas.map(() => `<col style="width: 40px;">`).join('')}
                        <col style="width: 40px;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th class="text-left">Funcionário</th>
                            ${folhas.map(f => {
                                const nomeCompleto = f.funcionario?.nome_completo || 'N/A';
                                const partes = nomeCompleto.split(' ');
                                const primeiroNome = partes[0] || 'N/A';
                                const inicialSobrenome = partes[1] ? partes[1][0] + '.' : '';
                                return `<th>${primeiroNome} ${inicialSobrenome}</th>`;
                            }).join('')}
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- LANÇAMENTOS DETALHADOS -->
                        <!-- TOTAL A DEPOSITAR (5º DIA ÚTIL) -->
                        <tr style="background-color: #5957afff; font-weight: bold; font-size: 12px; color: white;">
                            <td class="text-left">TOTAL A DEPOSITAR (5º DIA ÚTIL)</td>
                            ${(() => {
                                let totalLinha = 0;
                                const celulas = folhas.map(f => {
                                    const proventos = f.total_proventos || 0;
                                    const descontos = f.total_descontos || 0;
                                    const beneficios = calcBeneficiosFuncionario(f);
                                    const valor = proventos - descontos + beneficios;
                                    totalLinha += valor;
                                    return `<td style="color: white;">${formatarMoeda(valor)}</td>`;
                                }).join('');
                                return celulas + `<td class="total-row" style="background-color: #5957afff; color: white;">${formatarMoeda(totalLinha)}</td>`;
                            })()}
                        </tr>

                        <!-- ADIANTAMENTO QUINZENAL (DIA 20) -->
                        <tr style="background-color: #5957afff; font-weight: bold; font-size: 13px;color: white">
                            <td class="text-left">Adiantamento Quinzenal (dia 20)</td>
                            ${folhas.map(f => {
                                const valorAdiantamento = f.desconto_adiantamento_quinzenal || 0;
                                return `<td>${valorAdiantamento > 0 ? formatarMoeda(valorAdiantamento) : '-'}</td>`;
                            }).join('')}
                            <td style="background-color: #5957afff !important; color: white !important; font-weight: bold;">${formatarMoeda(totais.descontos.adiantamento)}</td>
                        </tr>
                        <tr class="section-header">
                            <td colspan="${folhas.length + 2}">PROVENTOS</td>
                        </tr>
                        ${totais.proventos.salario > 0 ? `
                        <tr>
                            <td class="text-left">Salário</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.salario_base || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.salario)}</td>
                        </tr>` : ''}
                        ${totais.proventos.intrajornada_50 > 0 ? `
                        <tr>
                            <td class="text-left">Intrajornada 50%</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.intrajornada_50 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.intrajornada_50)}</td>
                        </tr>` : ''}
                        ${totais.proventos.intrajornada_100 > 0 ? `
                        <tr>
                            <td class="text-left">Intrajornada 100%</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.intrajornada_100 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.intrajornada_100)}</td>
                        </tr>` : ''}
                        ${totais.proventos.he_50 > 0 ? `
                        <tr>
                            <td class="text-left">H.E. 50%</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.horas_extras_50 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.he_50)}</td>
                        </tr>` : ''}
                        ${totais.proventos.he_100 > 0 ? `
                        <tr>
                            <td class="text-left">H.E. 100%</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.horas_extras_100 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.he_100)}</td>
                        </tr>` : ''}
                        ${totais.proventos.dsr_he > 0 ? `
                        <tr>
                            <td class="text-left">D.S.R. s/ H. Extras</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.dsr_horas_extras || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.dsr_he)}</td>
                        </tr>` : ''}
                        ${totais.proventos.dsr_noturno > 0 ? `
                        <tr>
                            <td class="text-left">D.S.R. s/ Adicional Noturno</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.dsr_adicional_noturno || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.dsr_noturno)}</td>
                        </tr>` : ''}
                        ${totais.proventos.adicional_noturno > 0 ? `
                        <tr>
                            <td class="text-left">Adicional Noturno</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.adicional_noturno || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.adicional_noturno)}</td>
                        </tr>` : ''}
                        ${totais.proventos.insalubridade > 0 ? `
                        <tr>
                            <td class="text-left">Insalubridade</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.adicional_insalubridade || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.insalubridade)}</td>
                        </tr>` : ''}
                        ${totais.proventos.acumulo_funcao > 0 ? `
                        <tr>
                            <td class="text-left">Acúmulo de Função</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.adicional_acumulo_funcao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.acumulo_funcao)}</td>
                        </tr>` : ''}
                        ${totais.proventos.salario_familia > 0 ? `
                        <tr>
                            <td class="text-left">Salário Família</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.salario_familia || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.salario_familia)}</td>
                        </tr>` : ''}
                        ${totais.proventos.complemento_salario > 0 ? `
                        <tr>
                            <td class="text-left">Complemento Salarial</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.complemento_salario || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.complemento_salario)}</td>
                        </tr>` : ''}
                        
                        <!-- EVENTOS EXCEPCIONAIS DE PROVENTOS (CAMPOS ESPECÍFICOS) -->
                        <!-- FT (Folga Trabalhada) removido: exibido apenas na seção BENEFÍCIOS para evitar duplicação -->

                        ${totais.proventos.servicos_externos_folhas > 0 ? `
                        <tr>
                            <td class="text-left">Folhas de Pagamento</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.servicos_externos_folhas_pagamento || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.servicos_externos_folhas)}</td>
                        </tr>` : ''}
                        ${totais.proventos.servicos_externos_rondas > 0 ? `
                        <tr>
                            <td class="text-left">Controle de Rondas Palmeiras</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.servicos_externos_controle_rondas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.servicos_externos_rondas)}</td>
                        </tr>` : ''}
                        ${totais.proventos.supervisao_palmeiras > 0 ? `
                        <tr>
                            <td class="text-left">Supervisão Palmeiras</td>
                            ${folhas.map(f => {
                                let val = f.supervisao_palmeiras || 0;
                                if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                    f.eventos_excepcionais.forEach((ev: any) => {
                                        if (ev.tipo === 'provento' && ev.descricao === 'Supervisão Palmeiras') val += ev.valor || 0;
                                    });
                                }
                                return `<td>${formatarMoeda(val)}</td>`;
                            }).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.supervisao_palmeiras)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_integral > 0 ? `
                        <tr>
                            <td class="text-left">13º Salário</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_integral || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_integral)}</td>
                        </tr>` : ''}
                        ${totais.proventos.vantagens_13 > 0 ? `
                        <tr>
                            <td class="text-left">Vantagens 13º</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.vantagens_13 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.vantagens_13)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_primeira > 0 ? `
                        <tr>
                            <td class="text-left">13º Salário 1ª Parcela</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_primeira_parcela || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_primeira)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_segunda > 0 ? `
                        <tr>
                            <td class="text-left">13º Salário 2ª Parcela</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_segunda_parcela || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_segunda)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_vantagens_primeira > 0 ? `
                        <tr>
                            <td class="text-left">13º Salário Vantagens 1ª Parcela</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_vantagens_primeira_parcela || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_vantagens_primeira)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_vantagens_segunda > 0 ? `
                        <tr>
                            <td class="text-left">13º Salário Vantagens 2ª Parcela</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_vantagens_segunda_parcela || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_vantagens_segunda)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_rescisao > 0 ? `
                        <tr>
                            <td class="text-left">13º Proporc. Rescisão</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_proporcional_rescisao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_rescisao)}</td>
                        </tr>` : ''}
                        ${totais.proventos.decimo_terceiro_vantagens_rescisao > 0 ? `
                        <tr>
                            <td class="text-left">13º Proporc. Vantagens Rescisão</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.decimo_terceiro_vantagens_rescisao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.decimo_terceiro_vantagens_rescisao)}</td>
                        </tr>` : ''}
                        ${totais.proventos.ferias_rescisao > 0 ? `
                        <tr>
                            <td class="text-left">Férias Proporc. Rescisão</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.ferias_proporcionais_rescisao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.ferias_rescisao)}</td>
                        </tr>` : ''}
                        ${totais.proventos.um_terco_ferias_rescisao > 0 ? `
                        <tr>
                            <td class="text-left">1/3 Férias Rescisão</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.um_terco_ferias_proporcional_rescisao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.um_terco_ferias_rescisao)}</td>
                        </tr>` : ''}
                        ${totais.proventos.plr_rescisao > 0 ? `
                        <tr>
                            <td class="text-left">PLR Proporc. Rescisão</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.plr_proporcional_rescisao || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.proventos.plr_rescisao)}</td>
                        </tr>` : ''}
                        
                        <!-- EVENTOS EXCEPCIONAIS - PROVENTOS (JSON) -->
                        ${(() => {
                            // Coletar todos os eventos excepcionais únicos de proventos
                            // ⚠️ FILTRAR eventos que já possuem campos específicos para evitar duplicação
                            const eventosParaIgnorar = [
                                'Folhas de Pagamento',
                                'Controle de Rondas Palmeiras',
                                'Supervisão Palmeiras',
                                '13º Salário',
                                'Vantagens 13º',
                                '13º Salário 1ª Parcela',
                                '13º Salário 2ª Parcela',
                                '13º Salário Vantagens 1ª Parcela',
                                '13º Salário Vantagens 2ª Parcela',
                                '13º Proporc. Rescisão',
                                '13º Proporc. Vantagens Rescisão',
                                'Férias Proporc. Rescisão',
                                '1/3 Férias proporc. Rescisão',
                                'PLR Proporc. Rescisão'
                            ];
                            const eventosUnicos = new Map();
                            folhas.forEach(f => {
                                if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                    f.eventos_excepcionais.forEach((evento: any) => {
                                        if (evento.tipo === 'provento' && !eventosParaIgnorar.includes(evento.descricao)) {
                                            if (!eventosUnicos.has(evento.descricao)) {
                                                eventosUnicos.set(evento.descricao, []);
                                            }
                                        }
                                    });
                                }
                            });
                            
                            // Gerar linhas para cada evento único
                            let linhasEventos = '';
                            eventosUnicos.forEach((_, descricao) => {
                                let totalEvento = 0;
                                const valoresPorFolha = folhas.map(f => {
                                    let valorFolha = 0;
                                    if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                        f.eventos_excepcionais.forEach((evento: any) => {
                                            if (evento.tipo === 'provento' && evento.descricao === descricao) {
                                                valorFolha += evento.valor || 0;
                                            }
                                        });
                                    }
                                    totalEvento += valorFolha;
                                    return `<td>${formatarMoeda(valorFolha)}</td>`;
                                }).join('');
                                
                                linhasEventos += `
                                    <tr>
                                        <td class="text-left">${descricao}</td>
                                        ${valoresPorFolha}
                                        <td class="total-row">${formatarMoeda(totalEvento)}</td>
                                    </tr>
                                `;
                            });
                            
                            return linhasEventos;
                        })()}
                        
                        <tr style="background-color: #90bbf1ff; font-weight: bold;">
                            <td class="text-left">Salário Bruto</td>
                            ${folhas.map(f => {
                                let salarioBruto = (f.salario_base || 0) + (f.intrajornada_50 || 0) + (f.intrajornada_100 || 0) + 
                                    (f.horas_extras_50 || 0) + (f.horas_extras_100 || 0) + (f.dsr_horas_extras || 0) + 
                                    (f.dsr_adicional_noturno || 0) + (f.adicional_noturno || 0) + (f.adicional_insalubridade || 0) + 
                                    (f.adicional_acumulo_funcao || 0) + (f.salario_familia || 0) + (f.complemento_salario || 0) +
                                    // Campos específicos de proventos excepcionais (FT é benefício, não provento)
                                    (f.servicos_externos_folhas_pagamento || 0) + (f.servicos_externos_controle_rondas || 0) +
                                    (f.supervisao_palmeiras || 0) +
                                    (f.decimo_terceiro_primeira_parcela || 0) + (f.decimo_terceiro_segunda_parcela || 0) +
                                    (f.decimo_terceiro_vantagens_primeira_parcela || 0) + (f.decimo_terceiro_vantagens_segunda_parcela || 0) +
                                    (f.decimo_terceiro_integral || 0) + (f.vantagens_13 || 0) +
                                    (f.decimo_terceiro_proporcional_rescisao || 0) + (f.decimo_terceiro_vantagens_rescisao || 0) +
                                    (f.ferias_proporcionais_rescisao || 0) + (f.um_terco_ferias_proporcional_rescisao || 0) + (f.plr_proporcional_rescisao || 0);
                                
                                // Adicionar eventos excepcionais do JSON (APENAS os que não têm campos específicos)
                                const eventosProventosIgnorar = [
                                    'Folhas de Pagamento',
                                    'Controle de Rondas Palmeiras',
                                    '13º Salário',
                                    'Vantagens 13º',
                                    '13º Salário 1ª Parcela',
                                    '13º Salário 2ª Parcela',
                                    '13º Salário Vantagens 1ª Parcela',
                                    '13º Salário Vantagens 2ª Parcela',
                                    '13º Proporc. Rescisão',
                                    '13º Proporc. Vantagens Rescisão',
                                    'Férias Proporc. Rescisão',
                                    '1/3 Férias proporc. Rescisão',
                                    'PLR Proporc. Rescisão',
                                    'FT (Folga Trabalhada)',
                                    'Folga Trabalhada'
                                ];
                                if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                    f.eventos_excepcionais.forEach((evento: any) => {
                                        if (evento.tipo === 'provento' && !eventosProventosIgnorar.includes(evento.descricao)) {
                                            salarioBruto += evento.valor || 0;
                                        }
                                    });
                                }
                                
                                return `<td>${formatarMoeda(salarioBruto)}</td>`;
                            }).join('')}
                            <td class="total-row" style="background-color: #90bbf1ff">${formatarMoeda(totais.proventos.salario_bruto)}</td>
                        </tr>

                        <!-- DESCONTOS -->
                        <tr class="section-header" style="background-color: #f3e0aaff;">
                            <td colspan="${folhas.length + 2}">DESCONTOS</td>
                        </tr>
                        ${totais.descontos.inss > 0 ? `
                        <tr>
                            <td class="text-left">INSS</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_inss || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.inss)}</td>
                        </tr>` : ''}
                        ${totais.descontos.irrf > 0 ? `
                        <tr>
                            <td class="text-left">IRRF</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_irrf || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.irrf)}</td>
                        </tr>` : ''}
                        ${totais.descontos.vt > 0 ? `
                        <tr>
                            <td class="text-left">Vale Transporte</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_vt || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.vt)}</td>
                        </tr>` : ''}
                        ${totais.descontos.contribuicao_assistencial > 0 ? `
                        <tr>
                            <td class="text-left">Contribuição Assistencial</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_contribuicao_assistencial || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.contribuicao_assistencial)}</td>
                        </tr>` : ''}
                        ${totais.descontos.pensao > 0 ? `
                        <tr>
                            <td class="text-left">Pensão Alimentícia</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_pensao_alimenticia || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.pensao)}</td>
                        </tr>` : ''}
                        ${totais.descontos.faltas > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Faltas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_faltas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.faltas)}</td>
                        </tr>` : ''}
                        ${totais.descontos.dsr_faltas > 0 ? `
                        <tr>
                            <td class="text-left">Desc. DSR s/ Faltas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_dsr_faltas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.dsr_faltas)}</td>
                        </tr>` : ''}
                        ${totais.descontos.atrasos > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Atrasos</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_atrasos || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.atrasos)}</td>
                        </tr>` : ''}
                        ${totais.descontos.adiantamento > 0 ? `
                        <tr>
                            <td class="text-left">Adiantamento Quinzenal</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_adiantamento_quinzenal || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.adiantamento)}</td>
                        </tr>` : ''}
                        ${totais.descontos.adiantamento_salario > 0 ? `
                        <tr>
                            <td class="text-left">Adiantam. de Salário</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_adiantamento_salario || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.adiantamento_salario)}</td>
                        </tr>` : ''}
                        ${totais.descontos.plr > 0 ? `
                        <tr>
                            <td class="text-left">Desc. PLR</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_plr || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.plr)}</td>
                        </tr>` : ''}
                        ${totais.descontos.seguro_vida > 0 ? `
                        <tr>
                            <td class="text-left">Seguro de Vida</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_seguro_vida || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.seguro_vida)}</td>
                        </tr>` : ''}
                        ${totais.descontos.convenio_odonto > 0 ? `
                        <tr>
                            <td class="text-left">Convênio Odonto</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_convenio_odonto || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.convenio_odonto)}</td>
                        </tr>` : ''}
                        ${totais.descontos.rondas > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Rondas não Realizadas (Salário)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_rondas_nao_realizadas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.rondas)}</td>
                        </tr>` : ''}
                        ${totais.descontos.rondas_benef > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Rondas não Realizadas (Benefício)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desc_rondas_nao_realizadas_benef || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.rondas_benef)}</td>
                        </tr>` : ''}
                        ${totais.descontos.avaria_utilitario > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Avaria Utilitário (Parcela)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desc_avaria_utilitario || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.avaria_utilitario)}</td>
                        </tr>` : ''}
                        ${totais.descontos.complemento_anterior > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Complemento Anterior</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_complemento_anterior || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.complemento_anterior)}</td>
                        </tr>` : ''}
                        ${totais.descontos.vt_faltas > 0 ? `
                        <tr>
                            <td class="text-left">Desc. VT por Faltas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_vt_faltas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.vt_faltas)}</td>
                        </tr>` : ''}
                        ${totais.descontos.va_faltas > 0 ? `
                        <tr>
                            <td class="text-left">Desc. VA por Faltas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.desconto_va_faltas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.va_faltas)}</td>
                        </tr>` : ''}
                        
                        <!-- EVENTOS EXCEPCIONAIS DE DESCONTOS (CAMPOS ESPECÍFICOS) -->
                        ${totais.descontos.inss_13 > 0 ? `
                        <tr>
                            <td class="text-left">INSS 13º</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.inss_13 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.inss_13)}</td>
                        </tr>` : ''}
                        ${totais.descontos.inss_ferias > 0 ? `
                        <tr>
                            <td class="text-left">INSS Férias</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.inss_ferias || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.inss_ferias)}</td>
                        </tr>` : ''}
                        ${totais.descontos.adiantamento_13_salario > 0 ? `
                        <tr>
                            <td class="text-left">Adiantam. 13º Salário</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.adiantamento_13_salario || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.adiantamento_13_salario)}</td>
                        </tr>` : ''}
                        ${totais.descontos.adiantamento_vantagens_13 > 0 ? `
                        <tr>
                            <td class="text-left">Adiantam. Vantagens 13º</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.adiantamento_vantagens_13 || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.adiantamento_vantagens_13)}</td>
                        </tr>` : ''}
                        
                        <!-- EVENTOS EXCEPCIONAIS - DESCONTOS (JSON) -->
                        ${(() => {
                            // Coletar todos os eventos excepcionais únicos de descontos
                            // ⚠️ FILTRAR eventos que já possuem campos específicos para evitar duplicação
                            const eventosParaIgnorar = [
                                'Adiantam. de Salário',
                                'Adiantam. 13º Salário',
                                'Adiantam. Vantagens 13º',
                                'Desc. Avaria Utilitário',
                                'Desc. Avaria Utilitário (Parcela)'
                            ];
                            const eventosUnicos = new Map();
                            folhas.forEach(f => {
                                if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                    f.eventos_excepcionais.forEach((evento: any) => {
                                        if (evento.tipo === 'desconto' && !eventosParaIgnorar.includes(evento.descricao)) {
                                            if (!eventosUnicos.has(evento.descricao)) {
                                                eventosUnicos.set(evento.descricao, []);
                                            }
                                        }
                                    });
                                }
                            });
                            
                            // Gerar linhas para cada evento único
                            let linhasEventos = '';
                            eventosUnicos.forEach((_, descricao) => {
                                let totalEvento = 0;
                                const valoresPorFolha = folhas.map(f => {
                                    let valorFolha = 0;
                                    if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                        f.eventos_excepcionais.forEach((evento: any) => {
                                            if (evento.tipo === 'desconto' && evento.descricao === descricao) {
                                                valorFolha += evento.valor || 0;
                                            }
                                        });
                                    }
                                    totalEvento += valorFolha;
                                    return '<td>' + formatarMoeda(valorFolha) + '</td>';
                                }).join('');
                                
                                if (totalEvento > 0) {
                                    linhasEventos += 
                                        '<tr>' +
                                            '<td class="text-left">' + descricao + '</td>' +
                                            valoresPorFolha +
                                            '<td class="total-row">' + formatarMoeda(totalEvento) + '</td>' +
                                        '</tr>';
                                }
                            });
                            
                            return linhasEventos;
                        })()}
                        <tr style="background-color: #f3e0aaff; font-weight: bold;">
                            <td class="text-left">Total Descontos</td>
                            ${folhas.map(f => {
                                const totalDesc = f.total_descontos || 0; // Usar valor salvo
                                return `<td>${formatarMoeda(totalDesc)}</td>`;
                            }).join('')}
                            <td class="total-row">${formatarMoeda(totais.descontos.total_descontos)}</td>
                        </tr>

                        <!-- SALÁRIO LÍQUIDO -->
                        <tr style="background-color: #c5e0b4; font-weight: bold; font-size: 11px;">
                            <td class="text-left">Salário Líquido</td>
                            ${folhas.map(f => {
                                // Usar valores salvos
                                const salarioLiquido = (f.total_proventos || 0) - (f.total_descontos || 0);
                                return `<td>${formatarMoeda(salarioLiquido)}</td>`;
                            }).join('')}
                            <td class="total-row" style="background-color: #c5e0b4">${formatarMoeda(totais.proventos.salario_bruto - totais.descontos.total_descontos)}</td>
                        </tr>

                        <!-- BENEFÍCIOS -->
                        <tr style="background-color: #d9e1f2; font-weight: bold;">
                            <td colspan="${folhas.length + 2}">BENEFÍCIOS</td>
                        </tr>
                        ${totais.beneficios.vt_mes_anterior > 0 ? `
                        <tr>
                            <td class="text-left">VT Mês Anterior</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.vale_transporte_mes_anterior || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.vt_mes_anterior)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.va_mes_anterior > 0 ? `
                        <tr>
                            <td class="text-left">VA Mês Anterior</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.vale_alimentacao_mes_anterior || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.va_mes_anterior)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.vt_mes_atual > 0 ? `
                        <tr>
                            <td class="text-left">VT Mês Atual</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.vale_transporte_mes_atual || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.vt_mes_atual)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.va_mes_atual > 0 ? `
                        <tr>
                            <td class="text-left">VA Mês Atual</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.vale_alimentacao_mes_atual || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.va_mes_atual)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.vt_folgas_trabalhadas > 0 ? `
                        <tr>
                            <td class="text-left">VT Folgas Trabalhadas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.valor_vt_folgas_trabalhadas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.vt_folgas_trabalhadas)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.va_folgas_trabalhadas > 0 ? `
                        <tr>
                            <td class="text-left">VA Folgas Trabalhadas</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.valor_va_folgas_trabalhadas || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.va_folgas_trabalhadas)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.cesta_basica > 0 ? `
                        <tr>
                            <td class="text-left">Cesta Básica</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.cesta_basica || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.cesta_basica)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.premio_permanencia > 0 ? `
                        <tr>
                            <td class="text-left">Prêmio de Permanência</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.premio_permanencia || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.premio_permanencia)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.reembolsos_uber > 0 ? `
                        <tr>
                            <td class="text-left">Reembolsos</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.reembolsos_uber || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.reembolsos_uber)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.folga_trabalhada > 0 ? `
                        <tr>
                            <td class="text-left">Folga(s) Trabalhada(s)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.folga_trabalhada || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.beneficios.folga_trabalhada)}</td>
                        </tr>` : ''}
                        ${folhas.some(f => (f.desconto_vt_faltas || 0) > 0) ? `
                        <tr>
                            <td class="text-left">Desc. VT por Faltas</td>
                            ${folhas.map(f => `<td style="color: red;">${formatarMoeda(-(f.desconto_vt_faltas || 0))}</td>`).join('')}
                            <td class="total-row" style="color: red;">${formatarMoeda(-folhas.reduce((sum, f) => sum + (f.desconto_vt_faltas || 0), 0))}</td>
                        </tr>` : ''}
                        ${folhas.some(f => (f.desconto_va_faltas || 0) > 0) ? `
                        <tr>
                            <td class="text-left">Desc. VA por Faltas</td>
                            ${folhas.map(f => `<td style="color: red;">${formatarMoeda(-(f.desconto_va_faltas || 0))}</td>`).join('')}
                            <td class="total-row" style="color: red;">${formatarMoeda(-folhas.reduce((sum, f) => sum + (f.desconto_va_faltas || 0), 0))}</td>
                        </tr>` : ''}
                        ${totais.beneficios.rondas_benef > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Rondas (Benefício)</td>
                            ${folhas.map(f => `<td style="color: red;">${formatarMoeda(-(f.desc_rondas_nao_realizadas_benef || 0))}</td>`).join('')}
                            <td class="total-row" style="color: red;">${formatarMoeda(-totais.beneficios.rondas_benef)}</td>
                        </tr>` : ''}
                        ${totais.beneficios.desc_ajuste_beneficios > 0 ? `
                        <tr>
                            <td class="text-left">Desc. Ajuste dos Benefícios</td>
                            ${folhas.map(f => `<td style="color: red;">${formatarMoeda(-(f.desc_ajuste_beneficios || 0))}</td>`).join('')}
                            <td class="total-row" style="color: red;">${formatarMoeda(-totais.beneficios.desc_ajuste_beneficios)}</td>
                        </tr>` : ''}
                        
                        <!-- EVENTOS EXCEPCIONAIS - BENEFÍCIOS (JSON) -->
                        ${(() => {
                            // Coletar todos os eventos excepcionais únicos de benefícios
                            const eventosParaIgnorar = [
                                'Reembolsos', 'Reembolsos (Uber)',
                                'Desc. Ajuste dos Benefícios',
                                'Desc. Rondas não Realizadas',
                                'PLR'
                            ];
                            const eventosUnicos = new Map();
                            folhas.forEach(f => {
                                if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                    f.eventos_excepcionais.forEach((evento: any) => {
                                        if (evento.tipo === 'beneficio' && !eventosParaIgnorar.includes(evento.descricao)) {
                                            if (!eventosUnicos.has(evento.descricao)) {
                                                eventosUnicos.set(evento.descricao, true);
                                            }
                                        }
                                    });
                                }
                            });
                            
                            let linhasEventos = '';
                            eventosUnicos.forEach((_, descricao) => {
                                let totalEvento = 0;
                                const valoresPorFolha = folhas.map(f => {
                                    let valorFolha = 0;
                                    if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
                                        f.eventos_excepcionais.forEach((evento: any) => {
                                            if (evento.tipo === 'beneficio' && evento.descricao === descricao) {
                                                valorFolha += evento.valor || 0;
                                            }
                                        });
                                    }
                                    totalEvento += valorFolha;
                                    return '<td>' + formatarMoeda(valorFolha) + '</td>';
                                }).join('');
                                
                                if (totalEvento !== 0) {
                                    const isNegativo = totalEvento < 0;
                                    linhasEventos += 
                                        '<tr>' +
                                            '<td class="text-left">' + descricao + '</td>' +
                                            valoresPorFolha +
                                            '<td class="total-row"' + (isNegativo ? ' style="color: red;"' : '') + '>' + formatarMoeda(totalEvento) + '</td>' +
                                        '</tr>';
                                }
                            });
                            
                            return linhasEventos;
                        })()}
                        <tr style="background-color: #d9e1f2; font-weight: bold;">
                            <td class="text-left">Total Benefícios</td>
                            ${folhas.map(f => `<td>${formatarMoeda(calcBeneficiosFuncionario(f))}</td>`).join('')}
                            <td class="total-row" style="background-color: #d9e1f2">${formatarMoeda(totais.beneficios.total_beneficios)}</td>
                        </tr>

                        <!-- SALÁRIO LÍQUIDO + BENEFÍCIOS -->
                        <tr style="background-color: #90bbf1ff; font-weight: bold; font-size: 11px;">
                            <td class="text-left">Salário Líquido + Benefícios</td>
                            ${folhas.map(f => {
                                // Recalcular: Proventos - Descontos + Benefícios (com descontos aplicados corretamente)
                                const proventos = f.total_proventos || 0;
                                const descontos = f.total_descontos || 0;
                                const beneficios = calcBeneficiosFuncionario(f);
                                const liquidoComBeneficios = proventos - descontos + beneficios;
                                return `<td>${formatarMoeda(liquidoComBeneficios)}</td>`;
                            }).join('')}
                            <td class="total-row"style="background-color: #90bbf1ff">${formatarMoeda((totais.proventos.salario_bruto - totais.descontos.total_descontos) + totais.beneficios.total_beneficios)}</td>
                        </tr>

                        <!-- ENCARGOS PATRONAIS (GESTÃO FISCAL) -->
                        <tr style="background-color: #f09d9dff; font-weight: bold;">
                            <td colspan="${folhas.length + 2}">ENCARGOS PATRONAIS (Gestão Fiscal)</td>
                        </tr>
                        ${totais.encargos.fgts > 0 ? `
                        <tr>
                            <td class="text-left">FGTS (8%)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.fgts || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.encargos.fgts)}</td>
                        </tr>` : ''}
                        ${totais.encargos.inss_patronal > 0 ? `
                        <tr>
                            <td class="text-left">INSS Patronal (estimativa)</td>
                            ${folhas.map(f => `<td>${formatarMoeda(f.inss_patronal || 0)}</td>`).join('')}
                            <td class="total-row">${formatarMoeda(totais.encargos.inss_patronal)}</td>
                        </tr>` : ''}
                        <tr style="background-color: #f09d9dff; font-weight: bold;">
                            <td class="text-left">TOTAL INSS</td>
                            ${folhas.map(f => `<td>${formatarMoeda((f.fgts || 0) + (f.inss_patronal || 0))}</td>`).join('')}
                            <td class="total-row" style="background-color: #f09d9dff">${formatarMoeda(totais.encargos.total_encargos)}</td>
                        </tr>


                    </tbody>
                </table>
            </body>
            </html>
        `;

        if (paraImpressao && printWindow) {
            escreverEExibirJanela(printWindow, html, 'Relatório de Evolução Salarial');
        } else {
            // Retornar HTML para exibição na tela
            return html;
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer />
            {(loading || loadingRelatorioPostos || loadingRelatorioIndividual) && (
                <ProgressBar
                    overlay
                    label={
                        loadingRelatorioPostos ? 'Gerando relatório detalhado...' :
                        loadingRelatorioIndividual ? 'Gerando relatório individual...' :
                        'Gerando relatório mensal...'
                    }
                    current={1}
                    total={2}
                    color="purple"
                    icon="📊"
                />
            )}
            <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>

            {/* Relatório Detalhado por Posto */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                <h2 className="text-xl font-semibold mb-4 text-blue-900">📊 Relatório Detalhado por Posto de Trabalho</h2>
                <p className="text-sm text-gray-600 mb-4">Gera relatório completo com proventos, descontos, benefícios e encargos (similar ao Excel)</p>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Select
                        label="Empresa"
                        value={empresaSelecionada}
                        onChange={(e) => {
                            setEmpresaSelecionada(e.target.value);
                            setPostoSelecionado(''); // Reset posto ao mudar empresa
                        }}
                    >
                        <option value="">Todas as Empresas</option>
                        {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                        ))}
                    </Select>

                    <Select
                        label="Posto de Trabalho"
                        value={postoSelecionado}
                        onChange={(e) => setPostoSelecionado(e.target.value)}
                    >
                        <option value="">Todos os Postos</option>
                        {postosFiltrados.map(posto => (
                            <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                        ))}
                    </Select>

                    <Select
                        label="Mês"
                        value={mes.toString()}
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {meses.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
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

                    <div className="flex items-end">
                        <Button 
                            onClick={gerarRelatorioDetalhadoPosto} 
                            disabled={loadingRelatorioPostos}
                            className="w-full"
                        >
                            {loadingRelatorioPostos ? 'Gerando...' : '📄 Gerar Relatório'}
                        </Button>
                    </div>
                </div>
            </Card>


            {/* Relatório Individual de Funcionário */}
            <Card>
                <h2 className="text-xl font-semibold mb-4">📋 Relatório Individual - Valores Discriminados</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <Select
                            label="Funcionário"
                            value={funcionarioSelecionado}
                            onChange={(e) => setFuncionarioSelecionado(e.target.value)}
                        >
                            <option value="">-- Selecione um funcionário --</option>
                            {funcionarios
                                .filter(f => f.cargo_id)
                                .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))
                                .map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.nome_completo} - {f.cargo?.nome_cargo || 'Sem cargo'}
                                    </option>
                                ))}
                        </Select>
                    </div>

                    <Select
                        label="Mês"
                        value={mesIndividual.toString()}
                        onChange={(e) => setMesIndividual(Number(e.target.value))}
                    >
                        {meses.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                        ))}
                    </Select>

                    <Input
                        label="Ano"
                        type="number"
                        value={anoIndividual.toString()}
                        onChange={(e) => setAnoIndividual(Number(e.target.value))}
                        min="2020"
                        max="2030"
                    />

                    <div className="flex items-end">
                        <Button 
                            onClick={gerarRelatorioIndividual} 
                            disabled={loadingRelatorioIndividual || !funcionarioSelecionado}
                            className="w-full"
                        >
                            {loadingRelatorioIndividual ? 'Gerando...' : '📄 Gerar Relatório'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Exibição do Relatório Individual */}
            {relatorioIndividualGerado && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">
                            Valores Discriminados - {relatorioIndividualGerado.funcionario.nome_completo}
                        </h3>
                        <div className="flex gap-2">
                            <Button onClick={() => setAuditoriaAberta(true)} variant="secondary">
                                🔍 Auditar Cálculo
                            </Button>
                            <Button onClick={imprimirRelatorioIndividual} variant="primary">
                                🖨️ Imprimir
                            </Button>
                            <Button onClick={() => setRelatorioIndividualGerado(null)} variant="secondary">
                                ✕ Fechar
                            </Button>
                        </div>
                    </div>
                    
                    {/* Preview do Relatório */}
                    <div className="bg-white border rounded-lg p-6 max-w-4xl mx-auto">
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-bold">VALORES DISCRIMINADOS</h2>
                            <p className="text-sm">
                                Admissão: {new Date(relatorioIndividualGerado.funcionario.data_admissao).toLocaleDateString('pt-BR')} | Fechamento: {relatorioIndividualGerado.ultimoDia > 0 ? `${relatorioIndividualGerado.ultimoDia.toString().padStart(2, '0')}/${relatorioIndividualGerado.mes.toString().padStart(2, '0')}/${relatorioIndividualGerado.ano}` : `${new Date(relatorioIndividualGerado.ano, relatorioIndividualGerado.mes, 0).getDate().toString().padStart(2, '0')}/${relatorioIndividualGerado.mes.toString().padStart(2, '0')}/${relatorioIndividualGerado.ano}`}
                            </p>
                            <p className="text-sm">
                                Período de cálculo das verbas salariais e benefícios: de 01/{relatorioIndividualGerado.mes.toString().padStart(2, '0')}/{relatorioIndividualGerado.ano} a {relatorioIndividualGerado.ultimoDia > 0 ? `${relatorioIndividualGerado.ultimoDia.toString().padStart(2, '0')}/${relatorioIndividualGerado.mes.toString().padStart(2, '0')}/${relatorioIndividualGerado.ano}` : `${new Date(relatorioIndividualGerado.ano, relatorioIndividualGerado.mes, 0).getDate().toString().padStart(2, '0')}/${relatorioIndividualGerado.mes.toString().padStart(2, '0')}/${relatorioIndividualGerado.ano}`}
                            </p>
                        </div>
                        
                        <div className="text-sm mb-4">
                            <strong>FUNCIONÁRIO:</strong> {relatorioIndividualGerado.funcionario.nome_completo}
                        </div>
                        
                        <div className="font-bold text-base mb-6">
                            SALÁRIO BASE: R$ {formatarMoeda(relatorioIndividualGerado.funcionario.cargo?.salario_base || relatorioIndividualGerado.funcionario.salario_base || relatorioIndividualGerado.folhaCalculada.salario_base || 0)}
                        </div>
                        
{(() => {
                            const folha = relatorioIndividualGerado.folhaCalculada;
                            const { proventos, beneficios, descontos, totalProventos, totalBeneficios, totalDescontos, totalLiquido } =
                                buildLinhasDiscriminadas(folha, relatorioIndividualGerado.diasTrabalhados);

                            
                            return (
                                <>
                                    {/* 1) VENCIMENTOS */}
                                    <div className="font-bold mb-2">Vencimentos:</div>
                                    <div className="space-y-1 pl-4 mb-2">
                                        {proventos.map((item, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>{item.descricao}</span>
                                                <span>R$ {formatarMoeda(item.valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between font-bold border-t pt-2 mb-6 text-green-700">
                                        <span>Total Bruto a Receber:</span>
                                        <span>R$ {formatarMoeda(totalProventos)}</span>
                                    </div>
                                    
                                    {/* 2) BENEFÍCIOS */}
                                    {beneficios.length > 0 && (
                                        <>
                                            <div className="font-bold mb-2">Benefícios:</div>
                                            <div className="space-y-1 pl-4 mb-2">
                                                {beneficios.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between">
                                                        <span>{item.descricao}</span>
                                                        <span>R$ {formatarMoeda(item.valor)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between font-bold border-t pt-2 mb-6 text-blue-700">
                                                <span>Total de Benefícios:</span>
                                                <span>R$ {formatarMoeda(totalBeneficios)}</span>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* 3) DESCONTOS */}
                                    {descontos.length > 0 && (
                                        <>
                                            <div className="font-bold mb-2">Descontos:</div>
                                            <div className="space-y-1 pl-4 mb-2">
                                                {descontos.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between">
                                                        <span>{item.descricao}</span>
                                                        <span>R$ {formatarMoeda(item.valor)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between font-bold border-t pt-2 mb-6 text-red-700">
                                                <span>Total dos Descontos:</span>
                                                <span>R$ {formatarMoeda(totalDescontos)}</span>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* 4) TOTAL LÍQUIDO A RECEBER */}
                                    <div className="flex justify-between font-bold border-t-2 pt-3 text-lg text-blue-800">
                                        <span>Total Líquido a Receber:</span>
                                        <span>R$ {formatarMoeda(totalLiquido)}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </Card>
            )}

            {relatorioIndividualGerado && (
                <AuditoriaCalculoModal
                    isOpen={auditoriaAberta}
                    onClose={() => setAuditoriaAberta(false)}
                    funcionario={relatorioIndividualGerado.funcionario}
                    folha={relatorioIndividualGerado.folhaCalculada}
                    mes={relatorioIndividualGerado.mes}
                    ano={relatorioIndividualGerado.ano}
                />
            )}

            {/* Atalho para Relatório de Faltas */}
            <Card className="bg-rose-50 border-rose-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <ClipboardList className="w-6 h-6 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-rose-900">Relatório de Faltas</h2>
                            <p className="text-sm text-rose-700">Novo relatório detalhado por período (mensal, semestral e anual).</p>
                        </div>
                    </div>
                    <Button onClick={() => window.location.hash = '#/relatorio-evolucao?tipo=faltas'} className="bg-rose-600 hover:bg-rose-700 text-white border-none whitespace-nowrap">
                        Acessar Relatório
                    </Button>
                </div>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <ClipboardList className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-emerald-900">Evolução Anual de Vencimentos</h2>
                            <p className="text-sm text-emerald-700">Evolução mês a mês de proventos, descontos, benefícios e líquido por funcionário.</p>
                        </div>
                    </div>
                    <Button onClick={() => window.location.hash = '#/relatorio-evolucao'} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none whitespace-nowrap">
                        Acessar Relatório
                    </Button>
                </div>
            </Card>

            {/* Filtros */}
            <Card>
                <h2 className="text-xl font-semibold mb-4">Relatório Mensal de Folhas de Ponto</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                        label="Mês"
                        value={mes.toString()}
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {meses.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                        ))}
                    </Select>

                    <Input
                        label="Ano"
                        type="number"
                        value={ano.toString()}
                        onChange={(e) => setAno(Number(e.target.value))}
                        min="2020"
                        max="2030"
                    />

                    <div className="flex items-end">
                        <Button onClick={handleGerarRelatorio} disabled={loading}>
                            {loading ? 'Gerando...' : '📊 Gerar Relatório'}
                        </Button>
                    </div>

                    {resumo && (
                        <div className="flex items-end">
                            <Button onClick={exportarRelatorioCSV} variant="secondary">
                                📥 Exportar CSV
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Resumo Geral */}
            {resumo && (
                <Card className="bg-blue-50 border border-blue-200">
                    <h3 className="text-lg font-semibold mb-4">📈 Resumo Geral - {meses[mes - 1]}/{ano}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{resumo.total_funcionarios}</div>
                            <div className="text-gray-600">Funcionários</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{resumo.total_horas_normais.toFixed(0)}h</div>
                            <div className="text-gray-600">Horas Normais</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600">{(resumo.total_horas_extras_50 + resumo.total_horas_extras_100).toFixed(0)}h</div>
                            <div className="text-gray-600">Horas Extras</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">{resumo.total_horas_noturnas.toFixed(0)}h</div>
                            <div className="text-gray-600">Horas Noturnas</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{resumo.media_horas_por_funcionario.toFixed(1)}h</div>
                            <div className="text-gray-600">Média/Funcionário</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{resumo.funcionarios_com_extras}</div>
                            <div className="text-gray-600">Com Horas Extras</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{resumo.funcionarios_com_faltas}</div>
                            <div className="text-gray-600">Com Faltas</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{resumo.total_faltas_justificadas + resumo.total_faltas_injustificadas}</div>
                            <div className="text-gray-600">Total Faltas</div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Tabela Detalhada */}
            {folhas.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Detalhamento por Funcionário</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionário</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">H.Normais</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Extras 50%</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Extras 100%</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Noturnas</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Intras 50%</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Intras 100%</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Atrasos</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Atestados</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Faltas Injust.</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {folhas.map((folha, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">{folha.funcionario?.nome_completo || 'N/A'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_horas_normais?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_horas_extras_50?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_horas_extras_100?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_horas_noturnas?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_intrajornada_50?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_intrajornada_100?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_atrasos || 0}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_atestados || 0}</td>
                                        <td className="px-4 py-3 text-center">{folha.total_faltas_injustificadas || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {folhas.length === 0 && !loading && !relatorioGerado && (
                <Card className="text-center py-12 text-gray-500">
                    <p className="text-lg">Selecione um período e clique em "Gerar Relatório"</p>
                </Card>
            )}

            {/* Visualização do Relatório Detalhado */}
            {relatorioGerado && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">
                            Relatório Detalhado - {nomePosto} - {meses[mes - 1]}/{ano}
                        </h3>
                        <div className="flex gap-2">
                            <Button onClick={exportarParaExcel} variant="primary">
                                📊 Exportar Excel
                            </Button>
                            <Button onClick={imprimirRelatorioPostos} variant="secondary">
                                🖨️ Imprimir Relatório
                            </Button>
                            <Button onClick={() => setRelatorioGerado(null)} variant="secondary">
                                ✕ Fechar
                            </Button>
                        </div>
                    </div>
                    <div 
                        className="overflow-x-auto border border-gray-300 rounded"
                        dangerouslySetInnerHTML={{ __html: gerarExcelRelatorioPostos(relatorioGerado, nomePosto, false) || '' }}
                    />
                </Card>
            )}
        </div>
    );
};

export default Reports;
