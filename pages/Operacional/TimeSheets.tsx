import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { useFuncionariosAtivos, useFolhasPonto, useFeriados, usePostosTrabalho } from '../../hooks/useSupabase';
import { buscarEscalaSalva } from '../../utils/carregarEscalaSalva';
import { calcularHorasDia, calcularTotaisMes, gerarHorariosPadraoEscala } from '../../utils/calcularHoras';
import { filtrarFeriadosPorLocalidade } from '../../utils/feriadosFilter';
import { exportarParaImpressao } from '../../utils/exportarFolhaPonto';
import { supabase } from '../../lib/supabase';
import { interpretarRegrasEscala, interpretarRegraEscala } from '../../utils/interpretadorRegrasEscala';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import PeriodSelector, { formatMonthYear } from '../../components/PeriodSelector';
import ProgressBar from '../../components/ui/ProgressBar';


const TimeSheets: React.FC = () => {
    
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: funcionarios } = useFuncionariosAtivos();
    const { insert: insertFolha, update: updateFolha } = useFolhasPonto();
    const { data: feriados } = useFeriados();
    const { data: postos } = usePostosTrabalho();

    // Helper: retorna feriados aplicáveis ao posto do funcionário (filtra municipal/estadual)
    const getFeriadosFuncionario = React.useCallback((funcionarioParam: any) => {
        const posto = postos?.find((p: any) => p.id === funcionarioParam?.posto_trabalho_id);
        return filtrarFeriadosPorLocalidade(feriados || [], posto?.cidade, posto?.estado);
    }, [feriados, postos]);



    // Log para debug de feriados
    React.useEffect(() => {
        if (feriados && feriados.length > 0) {
            for (const f of feriados) {
            }
        }
    }, [feriados]);

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [todasFolhas, setTodasFolhas] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>('');
    const [ordenacao, setOrdenacao] = useState<'nome' | 'empresa' | 'posto'>('nome');
    const [periodoParcial, setPeriodoParcial] = useState(false);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [dataInicioTemp, setDataInicioTemp] = useState('');
    const [dataFimTemp, setDataFimTemp] = useState('');
    const [progressoGeracao, setProgressoGeracao] = useState({ atual: 0, total: 0 });
    const [modoEdicao, setModoEdicao] = useState<Record<string, boolean>>({});
    const [observacoes, setObservacoes] = useState<Record<string, string>>({});
    
    // Estado para mostrar seletor de período
    const [mostrarSeletorPeriodo, setMostrarSeletorPeriodo] = useState(false);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Inicializar datas ao montar o componente
    React.useEffect(() => {
        const primeiroDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);
        const dataInicioISO = primeiroDia.toISOString().split('T')[0];
        const dataFimISO = ultimoDia.toISOString().split('T')[0];
        setDataInicio(dataInicioISO);
        setDataFim(dataFimISO);
        
        // Sincronizar estados temporários
        const [anoI, mesI, diaI] = dataInicioISO.split('-');
        const [anoF, mesF, diaF] = dataFimISO.split('-');
        setDataInicioTemp(`${diaI}/${mesI}/${anoI}`);
        setDataFimTemp(`${diaF}/${mesF}/${anoF}`);
    }, []); // Executa apenas uma vez ao montar

    // Atualizar datas quando mês/ano mudar (apenas se não for período parcial)
    React.useEffect(() => {
        if (!periodoParcial) {
            const primeiroDia = new Date(ano, mes - 1, 1);
            const ultimoDia = new Date(ano, mes, 0);
            const dataInicioISO = primeiroDia.toISOString().split('T')[0];
            const dataFimISO = ultimoDia.toISOString().split('T')[0];
            setDataInicio(dataInicioISO);
            setDataFim(dataFimISO);
            
            // Sincronizar estados temporários
            const [anoI, mesI, diaI] = dataInicioISO.split('-');
            const [anoF, mesF, diaF] = dataFimISO.split('-');
            setDataInicioTemp(`${diaI}/${mesI}/${anoI}`);
            setDataFimTemp(`${diaF}/${mesF}/${anoF}`);
        }
    }, [mes, ano, periodoParcial]);

    // Carregar folhas de ponto salvas ao montar o componente ou mudar mês/ano
    React.useEffect(() => {
        carregarFolhasSalvas();
    }, [mes, ano]);

    const carregarFolhasSalvas = async () => {
        setLoading(true);
        try {
            // Buscar folhas sem os JOINs problemáticos
            const { data: folhasSalvas, error } = await supabase
                .from('folhas_ponto')
                .select(`
                    *,
                    funcionario:funcionarios(*,cargo:cargos(*)),
                    empresa:empresas(*),
                    posto_trabalho:postos_trabalho(*),
                    cargo:cargos(*)
                `)
                .eq('mes', mes)
                .eq('ano', ano);

            if (error) throw error;

            // Buscar todas as regras de escalas
            const { data: regrasData } = await supabase
                .from('regras_escalas')
                .select('id, codigo_escala, nome_escala');

            // Fazer JOIN manual com escalas
            if (folhasSalvas && regrasData) {
                folhasSalvas.forEach(folha => {
                    // Adicionar escala ao cargo do funcionário
                    if (folha.funcionario?.cargo?.escala_id) {
                        folha.funcionario.cargo.escala = regrasData.find(r => r.id === folha.funcionario.cargo.escala_id) || null;
                    }
                    // Adicionar escala ao cargo direto
                    if (folha.cargo?.escala_id) {
                        folha.cargo.escala = regrasData.find(r => r.id === folha.cargo.escala_id) || null;
                    }
                    // Adicionar escala direta
                    if (folha.escala_id) {
                        folha.escala = regrasData.find(r => r.id === folha.escala_id) || null;
                    }
                });
            }

            if (folhasSalvas && folhasSalvas.length > 0) {
                // Buscar escalas mensais para reconstruir horariosPrevistos
                const funcionarioIds = folhasSalvas.map(f => f.funcionario_id);
                const { data: escalasMensais } = await supabase
                    .from('escala_mensal')
                    .select('funcionario_id, dias_trabalhados')
                    .in('funcionario_id', funcionarioIds)
                    .eq('mes', mes)
                    .eq('ano', ano);
                
                // Criar mapa de escalas por funcionario
                const escalasMap: Record<string, any> = {};
                escalasMensais?.forEach(escala => {
                    try {
                        const diasTrabalhados = typeof escala.dias_trabalhados === 'string' 
                            ? JSON.parse(escala.dias_trabalhados) 
                            : escala.dias_trabalhados;
                        
                        const horariosPrevistos: Record<string, any> = {};
                        
                        // Se é array (formato antigo)
                        if (Array.isArray(diasTrabalhados)) {
                            diasTrabalhados.forEach((dia: any) => {
                                const diaKey = `dia_${dia.dia}`;
                                horariosPrevistos[diaKey] = {
                                    entrada: dia.horarios?.entrada || dia.entrada || '',
                                    inicio_refeicao: dia.horarios?.inicio_refeicao || dia.inicio_refeicao || '',
                                    termino_refeicao: dia.horarios?.termino_refeicao || dia.termino_refeicao || '',
                                    saida: dia.horarios?.saida || dia.saida || ''
                                };
                            });
                        } 
                        // Se é objeto (formato dia_X)
                        else if (diasTrabalhados && typeof diasTrabalhados === 'object') {
                            Object.keys(diasTrabalhados).filter(k => k.startsWith('dia_')).forEach(diaKey => {
                                const dia = diasTrabalhados[diaKey];
                                horariosPrevistos[diaKey] = {
                                    entrada: dia.horarios?.entrada || dia.entrada || '',
                                    inicio_refeicao: dia.horarios?.inicio_refeicao || dia.inicio_refeicao || '',
                                    termino_refeicao: dia.horarios?.termino_refeicao || dia.termino_refeicao || '',
                                    saida: dia.horarios?.saida || dia.saida || ''
                                };
                            });
                        }
                        
                        escalasMap[escala.funcionario_id] = horariosPrevistos;
                    } catch (e) {
                    }
                });
                
                const folhasProcessadas = folhasSalvas.map(folha => {
                    const dadosDias = folha.dados_dias ? JSON.parse(folha.dados_dias) : {};
                    
                    // Reconstruir horariosPrevistos a partir da escala mensal
                    const horariosPrevistos = escalasMap[folha.funcionario_id] || {};
                    
                    return {
                        funcionario: folha.funcionario,
                        empresa: folha.empresa,
                        posto_trabalho: folha.posto_trabalho,
                        cargo: folha.cargo,
                        escala: folha.escala,
                        mes: folha.mes,
                        ano: folha.ano,
                        data_inicio: folha.data_inicio,
                        data_fim: folha.data_fim,
                        dadosDias,
                        horariosPrevistos, // ✅ Agora incluímos os horários previstos da escala
                        totais: calcularTotaisMes(dadosDias)
                    };
                });

                // Carregar observações
                const novasObservacoes: Record<string, string> = {};
                folhasSalvas.forEach(folha => {
                    if (folha.observacoes) {
                        novasObservacoes[folha.funcionario_id] = folha.observacoes;
                    }
                });
                setObservacoes(novasObservacoes);

                setTodasFolhas(folhasProcessadas);
                if (folhasProcessadas.length > 0) {
                    setActiveTab(folhasProcessadas[0].funcionario.id);
                }
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month, 0).getDate();
    };

    const getWeekday = (day: number, month: number, year: number) => {
        const date = new Date(year, month - 1, day);
        return diasSemana[date.getDay()];
    };

    // Gerar folha individual
    const handleGerarFolhaIndividual = async (funcionarioId: string) => {
        if (!funcionarioId) {
            showToast('Selecione um funcionário', 'error');
            return;
        }

        const funcionario = funcionarios?.find(f => f.id === funcionarioId);
        if (!funcionario) {
            showToast('Funcionário não encontrado', 'error');
            return;
        }

        // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
        if (funcionario.demitido === true) {
            showToast('Não é possível gerar folha de ponto para funcionário demitido', 'error');
            return;
        }

        // Validar datas se período parcial estiver marcado
        if (periodoParcial) {
            if (!dataInicio || !dataFim) {
                showToast('Preencha as datas de início e fim para período parcial', 'error');
                return;
            }
            
            const inicio = new Date(dataInicio + 'T00:00:00');
            const fim = new Date(dataFim + 'T00:00:00');
            
            if (inicio > fim) {
                showToast('Data de início não pode ser maior que data de fim', 'error');
                return;
            }
        }

        const periodoTexto = periodoParcial 
            ? `período de ${(() => {
                const [ano, mes, dia] = dataInicio.split('-');
                return `${dia}/${mes}/${ano}`;
            })()} a ${(() => {
                const [ano, mes, dia] = dataFim.split('-');
                return `${dia}/${mes}/${ano}`;
            })()}`
            : 'mês completo';
        
        
        // Verificar se funcionário está inativo
        
        const funcionarioInativo = funcionario.ativo === false;
        if (funcionarioInativo) {
        }
        
        setLoading(true);

        try {
            // Buscar folha existente ou criar nova
            const { data: folhaExistente } = await supabase
                .from('folhas_ponto')
                .select(`
                    *,
                    funcionario:funcionarios(*),
                    empresa:empresas(*),
                    posto_trabalho:postos_trabalho(*),
                    cargo:cargos(*)
                `)
                .eq('funcionario_id', funcionario.id)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();

            const dadosExistentes = folhaExistente?.dados_dias ? JSON.parse(folhaExistente.dados_dias) : {};
            const folhaExistenteVazia = !folhaExistente || Object.keys(dadosExistentes).length === 0;

            if (folhaExistente && !folhaExistenteVazia) {
                const dados = dadosExistentes;
                
                // Criar objeto de escala a partir do codigo_escala do funcionário
                const escalaInfo = folhaExistente.escala || {
                    codigo_escala: folhaExistente.funcionario?.codigo_escala || '',
                    nome_escala: folhaExistente.funcionario?.codigo_escala || ''
                };
                
                // Remover folha existente e adicionar nova
                const novasFolhas = todasFolhas.filter(f => f.funcionario.id !== funcionarioId);
                novasFolhas.push({
                    ...folhaExistente,
                    escala: escalaInfo,
                    dadosDias: dados,
                    totais: calcularTotaisMes(dados),
                    data_inicio: periodoParcial ? dataInicio : folhaExistente.data_inicio,
                    data_fim: periodoParcial ? dataFim : folhaExistente.data_fim
                });
                setTodasFolhas(novasFolhas);
            } else {
                // ✅ BUSCAR ESCALA MENSAL COM REGRAS JSON (usando mesma função do "Gerar Todas")
                const escalaMensal = await buscarEscalaSalva(funcionario.id, mes, ano);
                
                if (escalaMensal) {
                    try {
                        // ✅ VALIDAR E PARSEAR dias_trabalhados
                    
                    const diasEscala = JSON.parse(escalaMensal.dias_trabalhados);
                    const novosDados: any = {};
                    
                    // ✅ COPIAR DADOS DA ESCALA MENSAL PARA FOLHA DE PONTO
                    // Calcular intervalo de dias (para período parcial)
                    let diaInicio = 1;
                    let diaFim = getDaysInMonth(mes, ano);
                    
                    if (periodoParcial) {
                        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
                        const dataFimObj = new Date(dataFim + 'T00:00:00');
                        diaInicio = dataInicioObj.getDate();
                        diaFim = dataFimObj.getDate();
                    }
                    
                    // Log para funcionário inativo
                    if (funcionarioInativo) {
                    }
                    
                    // ✅ BUSCAR REGRAS DA ESCALA COM regras_json (agora disponível via buscarEscalaSalva)
                    const nomeEscala = escalaMensal.escala?.codigo_escala || escalaMensal.codigo_escala || funcionario.codigo_escala || '';
                    const regrasJSON = escalaMensal.escala?.regras_json;
                    
                    
                    // Copiar cada dia da escala mensal (formato objeto dia_X igual ao "Gerar Todas")
                    Object.keys(diasEscala).forEach(diaKey => {
                        const diaEscala = diasEscala[diaKey];
                        const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                        
                        // Verificar se está no período
                        if (periodoParcial && (numeroDia < diaInicio || numeroDia > diaFim)) {
                            return; // Pular dias fora do período
                        }
                        
                        // Calcular dia da semana
                        const dataCompleta = new Date(ano, mes - 1, numeroDia);
                        const diaSemana = dataCompleta.getDay();
                        const diasSemanaTexto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        const diaSemanaTexto = diasSemanaTexto[diaSemana];
                        
                        // Verificar se é feriado
                        const ehFeriado = getFeriadosFuncionario(funcionario).some((feriado: any) => {
                            const dataFeriado = new Date(feriado.data_feriado + 'T00:00:00');
                            return dataFeriado.getDate() === numeroDia &&
                                   dataFeriado.getMonth() === mes - 1 &&
                                   dataFeriado.getFullYear() === ano;
                        }) || false;
                        
                        // ✅ USAR INTERPRETADOR DE REGRAS para calcular horários corretos (igual ao "Gerar Todas")
                        const interpretacao = interpretarRegraEscala(regrasJSON, numeroDia, mes, ano, diaSemanaTexto, ehFeriado);
                        
                        // ✅ Se funcionário INATIVO, marcar falta em TODOS os dias (inclusive folgas/feriados)
                        const marcarFalta = funcionarioInativo;
                        
                        // Usar horários interpretados das regras JSON (se disponível) ou fallback para dados salvos
                        let entrada = interpretacao?.horarios.entrada || diaEscala.entrada || '';
                        let inicioRefeicao = interpretacao?.horarios.inicio_refeicao || diaEscala.inicio_refeicao || '';
                        let terminoRefeicao = interpretacao?.horarios.termino_refeicao || diaEscala.termino_refeicao || '';
                        let saida = interpretacao?.horarios.saida || diaEscala.saida || '';
                        let folga = interpretacao?.folga ?? diaEscala.folga ?? false;
                        
                        // Limpar horários e folga se marcar falta
                        if (marcarFalta) {
                            entrada = '';
                            inicioRefeicao = '';
                            terminoRefeicao = '';
                            saida = '';
                            folga = false; // Inativo não tem folga, só falta
                        }
                        
                        novosDados[diaKey] = {
                            feriado: ehFeriado,
                            folga,
                            atestado: false,
                            falta_injustificada: marcarFalta,
                            entrada,
                            inicio_refeicao: inicioRefeicao,
                            termino_refeicao: terminoRefeicao,
                            saida,
                            calculo: null
                        };
                        
                        if (marcarFalta) {
                        } else if (numeroDia === 2) {
                        }
                    });

                    // Recalcular todos os dias - jornada será calculada dinamicamente
                    for (const diaKey of Object.keys(novosDados)) {
                        const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                        
                        // Bug fix: usar horários interpretados (não raw diasEscala) como previsto
                        const dataD = new Date(ano, mes - 1, numeroDia);
                        const dsTexto = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dataD.getDay()];
                        const ehFeriadoD = getFeriadosFuncionario(funcionario).some((f: any) => {
                            const df = new Date(f.data_feriado + 'T00:00:00');
                            return df.getDate() === numeroDia && df.getMonth() === mes - 1 && df.getFullYear() === ano;
                        });
                        const interpD = interpretarRegraEscala(regrasJSON, numeroDia, mes, ano, dsTexto, ehFeriadoD);
                        const horariosPrevistos = interpD?.trabalha ? {
                            entrada: interpD.horarios.entrada,
                            inicio_refeicao: interpD.horarios.inicio_refeicao,
                            termino_refeicao: interpD.horarios.termino_refeicao,
                            saida: interpD.horarios.saida
                        } : diasEscala[diaKey] ? {
                            entrada: diasEscala[diaKey].entrada || '',
                            inicio_refeicao: diasEscala[diaKey].inicio_refeicao || '',
                            termino_refeicao: diasEscala[diaKey].termino_refeicao || '',
                            saida: diasEscala[diaKey].saida || ''
                        } : undefined;
                        
                        recalcularDiaStatic(novosDados, diaKey, mes, ano, 8, nomeEscala, horariosPrevistos);
                    }
                    
                    // Verificar quantos feriados foram marcados
                    const feriadosMarcados = Object.keys(novosDados).filter(k => novosDados[k].feriado).length;

                    // Buscar dados completos do funcionário
                    const { data: funcionarioCompleto } = await supabase
                        .from('funcionarios')
                        .select(`
                            *,
                            cargo:cargos(*),
                            empresa:empresas(*),
                            posto_trabalho:postos_trabalho(*)
                        `)
                        .eq('id', funcionario.id)
                        .single();
                    
                    // Criar objeto de escala a partir do codigo_escala do funcionário
                    const escalaInfo = {
                        id: escalaMensal.escala_id || escalaMensal.escala?.id || null,
                        codigo_escala: escalaMensal.escala?.codigo_escala || funcionarioCompleto?.codigo_escala || escalaMensal.codigo_escala || '',
                        nome_escala: escalaMensal.escala?.nome_escala || funcionarioCompleto?.codigo_escala || escalaMensal.codigo_escala || ''
                    };
                    

                    // Remover folha existente e adicionar nova
                    const novasFolhas = todasFolhas.filter(f => f.funcionario.id !== funcionarioId);
                    
                    // Bug fix: horariosPrevistosPorDia usando horários interpretados (não raw diasEscala)
                    const horariosPrevistosPorDia: Record<string, any> = {};
                    Object.keys(diasEscala).forEach((diaKey) => {
                        const numD = Number.parseInt(diaKey.replace('dia_', ''));
                        const dtD = new Date(ano, mes - 1, numD);
                        const dsT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dtD.getDay()];
                        const ehFerD = getFeriadosFuncionario(funcionario).some((f: any) => {
                            const df = new Date(f.data_feriado + 'T00:00:00');
                            return df.getDate() === numD && df.getMonth() === mes - 1 && df.getFullYear() === ano;
                        });
                        const intD = interpretarRegraEscala(regrasJSON, numD, mes, ano, dsT, ehFerD);
                        const dE = diasEscala[diaKey];
                        horariosPrevistosPorDia[diaKey] = intD?.trabalha ? {
                            entrada: intD.horarios.entrada,
                            inicio_refeicao: intD.horarios.inicio_refeicao,
                            termino_refeicao: intD.horarios.termino_refeicao,
                            saida: intD.horarios.saida
                        } : {
                            entrada: dE?.entrada || '',
                            inicio_refeicao: dE?.inicio_refeicao || '',
                            termino_refeicao: dE?.termino_refeicao || '',
                            saida: dE?.saida || ''
                        };
                    });
                    
                    novasFolhas.push({
                        funcionario: funcionarioCompleto,
                        empresa: funcionarioCompleto?.empresa,
                        posto_trabalho: funcionarioCompleto?.posto_trabalho,
                        cargo: funcionarioCompleto?.cargo,
                        escala: escalaInfo,
                        mes,
                        ano,
                        dadosDias: novosDados,
                        horariosPrevistos: horariosPrevistosPorDia, // Armazenar horários previstos para recálculo de atrasos
                        totais: calcularTotaisMes(novosDados),
                        data_inicio: periodoParcial ? dataInicio : null,
                        data_fim: periodoParcial ? dataFim : null
                    });
                    setTodasFolhas(novasFolhas);
                    
                    } catch (innerError) {
                        throw innerError; // Re-throw para o catch externo
                    }
                } else {
                    showToast(`❌ Nenhuma escala mensal encontrada para ${funcionario.nome_completo} em ${meses[mes - 1]}/${ano}. Gere a escala mensal primeiro!`, 'error');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            showToast(`Erro ao gerar folha de ponto: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Salvar folha individual
    const handleSalvarFolhaIndividual = async (funcionarioId: string) => {
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        
        if (!folha) {
            showToast('Folha não encontrada', 'error');
            return;
        }

        const confirmar = window.confirm(
            `Deseja salvar a folha de ponto de ${folha.funcionario.nome_completo}?\n\n` +
            `Mês: ${meses[mes - 1]}/${ano}`
        );

        if (!confirmar) return;

        setSubmitting(true);

        try {
            
            const folhaParaSalvar = {
                funcionario_id: folha.funcionario.id,
                nome_funcionario: folha.funcionario.nome_completo, // ✅ Nome para facilitar consultas
                mes,
                ano,
                empresa_id: folha.empresa?.id || null,
                posto_trabalho_id: folha.posto_trabalho?.id || null,
                cargo_id: folha.cargo?.id || null,
                escala_id: folha.escala?.id || null,
                dados_dias: JSON.stringify(folha.dadosDias),
                data_inicio: folha.data_inicio || null,
                data_fim: folha.data_fim || null,
                observacoes: observacoes[funcionarioId] || null,
                horas_trabalhadas: folha.totais.total_horas_normais || 0,
                horas_extras: (folha.totais.total_horas_extras_50 || 0) + (folha.totais.total_horas_extras_100 || 0),
                total_horas_normais: folha.totais.total_horas_normais || 0,
                total_horas_extras_50: folha.totais.total_horas_extras_50 || 0,
                total_horas_extras_100: folha.totais.total_horas_extras_100 || 0,
                total_horas_noturnas: folha.totais.total_horas_noturnas || 0,
                total_intrajornada_50: folha.totais.total_intrajornada_50 || 0,
                total_intrajornada_100: folha.totais.total_intrajornada_100 || 0,
                faltas: (folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0),
                total_faltas_justificadas: folha.totais.total_faltas_justificadas || 0,
                total_faltas_injustificadas: folha.totais.total_faltas_injustificadas || 0,
                total_suspensoes: folha.totais.total_suspensoes || 0, // NOVO: Total de suspensões
                atrasos: folha.totais.total_atrasos || 0,
                total_atrasos: folha.totais.total_atrasos || 0,
                folgas_trabalhadas: folha.totais.folgas_trabalhadas || 0 // ✅ Nova coluna
            };

            // 🔍 DEBUG: Log dos dados ANTES de salvar

            // UPSERT: Atualiza se existir, insere se não existir
            const { data: savedData, error } = await supabase
                .from('folhas_ponto')
                .upsert(folhaParaSalvar, {
                    onConflict: 'funcionario_id,mes,ano'
                })
                .select();

            // 🔍 DEBUG: Log do resultado APÓS salvar
            if (savedData && savedData.length > 0) {
            }

            if (error) {
                throw error;
            }
            
            showToast('💾 Folha de ponto salva com sucesso!', 'success');
        } catch (error) {
            showToast('❌ Erro ao salvar folha de ponto', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Excluir folha individual
    const handleExcluirFolhaIndividual = async (funcionarioId: string) => {
        const folha = todasFolhas.find(f => f.funcionario.id === funcionarioId);
        
        if (!folha) {
            showToast('Folha não encontrada', 'error');
            return;
        }

        const confirmar = window.confirm(
            `⚠️ ATENÇÃO: Deseja EXCLUIR a folha de ponto de ${folha.funcionario.nome_completo}?\n\n` +
            `Período: ${meses[mes - 1]}/${ano}\n` +
            `Horas Trabalhadas: ${folha.totais.total_horas_normais?.toFixed(2) || '0.00'}h\n` +
            `Faltas: ${(folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0)}\n\n` +
            `Esta ação NÃO pode ser desfeita!`
        );

        if (!confirmar) return;

        setSubmitting(true);

        try {
            // Verificar se existe folha salva
            const { data: existing } = await supabase
                .from('folhas_ponto')
                .select('id')
                .eq('funcionario_id', folha.funcionario.id)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();

            if (existing) {
                // Excluir do banco
                const { error } = await supabase
                    .from('folhas_ponto')
                    .delete()
                    .eq('id', existing.id);

                if (error) {
                    throw error;
                }
                
                showToast(' Folha de ponto excluída com sucesso!', 'success');
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
            showToast('❌ Erro ao excluir folha de ponto', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Gerar todas as folhas
    const handleGerarTodasFolhas = async () => {
        
        const funcionariosComCargo = funcionarios?.filter(f => {
            // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
            if (f.demitido === true) {
                return false;
            }
            
            // Verificar se tem cargo (necessário para ter escala)
            return f.cargo_id;
        }) || [];

        if (funcionariosComCargo.length === 0) {
            showToast('Nenhum funcionário ativo com cargo definido', 'error');
            return;
        }

        setLoading(true);
        setProgressoGeracao({ atual: 0, total: funcionariosComCargo.length });

        const folhas = [];
        let contador = 0;

        for (const funcionario of funcionariosComCargo) {
            try {
                contador++;
                setProgressoGeracao({ atual: contador, total: funcionariosComCargo.length });
                
                // Verificar se funcionário está inativo
                
                const funcionarioInativo = funcionario.ativo === false;
                if (funcionarioInativo) {
                }
                
                // Buscar folha existente ou criar nova
                const { data: folhaExistente } = await supabase
                    .from('folhas_ponto')
                    .select(`
                        *,
                        funcionario:funcionarios(*),
                        empresa:empresas(*),
                        posto_trabalho:postos_trabalho(*),
                        cargo:cargos(*)
                    `)
                    .eq('funcionario_id', funcionario.id)
                    .eq('mes', mes)
                    .eq('ano', ano)
                    .single();

                if (folhaExistente) {
                    const dados = folhaExistente.dados_dias ? JSON.parse(folhaExistente.dados_dias) : {};
                    
                    // Criar objeto de escala a partir do codigo_escala do funcionário
                    const escalaInfo = folhaExistente.escala || {
                        codigo_escala: folhaExistente.funcionario?.codigo_escala || '',
                        nome_escala: folhaExistente.funcionario?.codigo_escala || ''
                    };
                    
                    // Bug fix: horariosPrevistosPorDia usando horários interpretados da escala
                    let horariosPrevistosPorDia: Record<string, any> = {};
                    const escalaMensal = await buscarEscalaSalva(funcionario.id, mes, ano);
                    if (escalaMensal) {
                        const diasEscala = typeof escalaMensal.dias_trabalhados === 'string'
                            ? JSON.parse(escalaMensal.dias_trabalhados)
                            : escalaMensal.dias_trabalhados;
                        const regrasJSONSalva = escalaMensal.escala?.regras_json;
                        Object.keys(diasEscala).forEach((diaKey) => {
                            const numDS = Number.parseInt(diaKey.replace('dia_', ''));
                            const dtDS = new Date(ano, mes - 1, numDS);
                            const dsTS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dtDS.getDay()];
                            const intDS = interpretarRegraEscala(regrasJSONSalva, numDS, mes, ano, dsTS, false);
                            const dES = diasEscala[diaKey];
                            horariosPrevistosPorDia[diaKey] = intDS?.trabalha ? {
                                entrada: intDS.horarios.entrada,
                                inicio_refeicao: intDS.horarios.inicio_refeicao,
                                termino_refeicao: intDS.horarios.termino_refeicao,
                                saida: intDS.horarios.saida
                            } : {
                                entrada: dES?.entrada || '',
                                inicio_refeicao: dES?.inicio_refeicao || '',
                                termino_refeicao: dES?.termino_refeicao || '',
                                saida: dES?.saida || ''
                            };
                        });
                    }
                    
                    folhas.push({
                        ...folhaExistente,
                        escala: escalaInfo,
                        dadosDias: dados,
                        horariosPrevistos: horariosPrevistosPorDia, // Adicionar horários previstos para cálculo de atrasos
                        totais: calcularTotaisMes(dados),
                        data_inicio: folhaExistente.data_inicio,
                        data_fim: folhaExistente.data_fim
                    });
                } else {
                    // Tentar carregar escala salva
                    const escala = await buscarEscalaSalva(funcionario.id, mes, ano);
                    
                    if (escala) {
                        const diasEscala = JSON.parse(escala.dias_trabalhados);
                        const novosDados: any = {};

                        // ✅ SISTEMA UNIFICADO: Usa interpretador de regras JSON
                        const nomeEscala = escala.escala?.codigo_escala || '';
                        const regrasJSON = escala.escala?.regras_json;
                        
                        // Interpretar regras da escala
                        const regrasInterpretadas = interpretarRegrasEscala(regrasJSON);
                        const naoTrabalhaFeriado = regrasInterpretadas.naoTrabalhaFeriado;
                        
                        
                        // Log para funcionário inativo
                        if (funcionarioInativo) {
                        }

                        Object.keys(diasEscala).forEach(diaKey => {
                            const diaEscala = diasEscala[diaKey];
                            const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                            
                            // Calcular dia da semana
                            const dataCompleta = new Date(ano, mes - 1, numeroDia);
                            const diaSemana = dataCompleta.getDay(); // 0=Dom, 6=Sáb
                            const diasSemanaTexto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                            const diaSemanaTexto = diasSemanaTexto[diaSemana];
                            const isDomingo = diaSemana === 0;
                            
                            // Verificar se é feriado
                            const ehFeriado = getFeriadosFuncionario(funcionario).some((feriado: any) => {
                                const dataFeriado = new Date(feriado.data_feriado + 'T00:00:00');
                                const match = dataFeriado.getDate() === numeroDia &&
                                       dataFeriado.getMonth() === mes - 1 &&
                                       dataFeriado.getFullYear() === ano;
                                
                                if (match && nomeEscala === 'GALZELADT1') {
                                }
                                
                                return match;
                            }) || false;
                            
                            // ✅ USAR INTERPRETADOR DE REGRAS para calcular horários corretos
                            const interpretacao = interpretarRegraEscala(regrasJSON, numeroDia, mes, ano, diaSemanaTexto, ehFeriado);
                            
                            // ✅ Se funcionário INATIVO, marcar falta em TODOS os dias (inclusive folgas/feriados)
                            const marcarFalta = funcionarioInativo;
                            
                            // Usar horários interpretados das regras JSON (se disponível) ou fallback para dados salvos
                            let entrada = interpretacao?.horarios.entrada || diaEscala.entrada || '';
                            let inicioRefeicao = interpretacao?.horarios.inicio_refeicao || diaEscala.inicio_refeicao || '';
                            let terminoRefeicao = interpretacao?.horarios.termino_refeicao || diaEscala.termino_refeicao || '';
                            let saida = interpretacao?.horarios.saida || diaEscala.saida || '';
                            let folga = interpretacao?.folga ?? diaEscala.folga ?? false;
                            
                            // Limpar horários e folga se marcar falta
                            if (marcarFalta) {
                                entrada = '';
                                inicioRefeicao = '';
                                terminoRefeicao = '';
                                saida = '';
                                folga = false; // Inativo não tem folga, só falta
                            }
                            
                            novosDados[diaKey] = {
                                feriado: ehFeriado,
                                folga,
                                atestado: false,
                                falta_injustificada: marcarFalta,
                                entrada,
                                inicio_refeicao: inicioRefeicao,
                                termino_refeicao: terminoRefeicao,
                                saida,
                                calculo: null
                            };
                        });

                        // Marcar feriados automaticamente e recalcular todos os dias
                        // Jornada será calculada dinamicamente baseada nos horários da escala
                        
                        
                        for (const diaKey of Object.keys(novosDados)) {
                            const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                            
                            const ehFeriado = getFeriadosFuncionario(funcionario).some((feriado: any) => {
                                const dataFeriado = new Date(feriado.data_feriado + 'T00:00:00');
                                const diaFeriado = dataFeriado.getDate();
                                const mesFeriado = dataFeriado.getMonth();
                                const anoFeriado = dataFeriado.getFullYear();
                                
                                // Log detalhado apenas para o primeiro funcionário e primeiro dia
                                if (numeroDia === 1) {
                                }
                                
                                const match = diaFeriado === numeroDia &&
                                       mesFeriado === mes - 1 &&
                                       anoFeriado === ano;
                                       
                                if (match) {
                                }
                                
                                return match;
                            }) || false;
                            
                            // Marcar como feriado se for
                            if (ehFeriado) {
                                novosDados[diaKey].feriado = true;
                            }
                            
                            // Bug fix: usar horários interpretados como previsto
                            const dtG = new Date(ano, mes - 1, numeroDia);
                            const dsTextoG = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dtG.getDay()];
                            const interpG = interpretarRegraEscala(regrasJSON, numeroDia, mes, ano, dsTextoG, ehFeriado);
                            const horariosPrevistos = interpG?.trabalha ? {
                                entrada: interpG.horarios.entrada,
                                inicio_refeicao: interpG.horarios.inicio_refeicao,
                                termino_refeicao: interpG.horarios.termino_refeicao,
                                saida: interpG.horarios.saida
                            } : diasEscala[diaKey] ? {
                                entrada: diasEscala[diaKey].entrada || '',
                                inicio_refeicao: diasEscala[diaKey].inicio_refeicao || '',
                                termino_refeicao: diasEscala[diaKey].termino_refeicao || '',
                                saida: diasEscala[diaKey].saida || ''
                            } : undefined;
                            
                            if (numeroDia === 2) {
                            }
                            
                            recalcularDiaStatic(novosDados, diaKey, mes, ano, 8, nomeEscala, horariosPrevistos);
                        }

                        // Verificar quantos feriados foram marcados
                        const feriadosMarcados = Object.keys(novosDados).filter(k => novosDados[k].feriado).length;
                        
                        // Criar objeto de escala a partir dos dados do funcionário
                        // O codigo_escala já está no objeto funcionario
                        const escalaInfo = escala.escala || {
                            codigo_escala: escala.funcionario?.codigo_escala || escala.codigo_escala || '',
                            nome_escala: escala.funcionario?.codigo_escala || escala.codigo_escala || ''
                        };
                        
                        
                        // Bug fix: horariosPrevistosPorDia usando horários interpretados
                        const horariosPrevistosPorDia: Record<string, any> = {};
                        Object.keys(diasEscala).forEach((diaKey) => {
                            const numDG = Number.parseInt(diaKey.replace('dia_', ''));
                            const dtDG = new Date(ano, mes - 1, numDG);
                            const dsTG = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dtDG.getDay()];
                            const ehFerDG = getFeriadosFuncionario(funcionario).some((f: any) => {
                                const df = new Date(f.data_feriado + 'T00:00:00');
                                return df.getDate() === numDG && df.getMonth() === mes - 1 && df.getFullYear() === ano;
                            });
                            const intDG = interpretarRegraEscala(regrasJSON, numDG, mes, ano, dsTG, ehFerDG);
                            const dEG = diasEscala[diaKey];
                            horariosPrevistosPorDia[diaKey] = intDG?.trabalha ? {
                                entrada: intDG.horarios.entrada,
                                inicio_refeicao: intDG.horarios.inicio_refeicao,
                                termino_refeicao: intDG.horarios.termino_refeicao,
                                saida: intDG.horarios.saida
                            } : {
                                entrada: dEG?.entrada || '',
                                inicio_refeicao: dEG?.inicio_refeicao || '',
                                termino_refeicao: dEG?.termino_refeicao || '',
                                saida: dEG?.saida || ''
                            };
                        });
                        
                        folhas.push({
                            funcionario: escala.funcionario,
                            empresa: escala.empresa,
                            posto_trabalho: escala.posto_trabalho,
                            cargo: escala.cargo,
                            escala: escalaInfo,
                            mes,
                            ano,
                            dadosDias: novosDados,
                            horariosPrevistos: horariosPrevistosPorDia, // Armazenar horários previstos para recálculo de atrasos
                            totais: calcularTotaisMes(novosDados),
                            data_inicio: null,
                            data_fim: null
                        });
                    }
                }
            } catch (error) {
            }
        }

        setTodasFolhas(folhas);
        if (folhas.length > 0) {
            setActiveTab(folhas[0].funcionario.id);
        }
        setLoading(false);
    };

    // Função auxiliar para recalcular dia (versão estática)
    const recalcularDiaStatic = (dados: any, diaKey: string, mes: number, ano: number, jornadaPadrao: number = 8, nomeEscala: string = '', horariosPrevistos?: any) => {

        
        const dia = dados[diaKey];
        
        // Só pula se não tem horários
        if (!dia.entrada || !dia.saida) {
            dia.calculo = null;
            return;
        }

        // Extrair número do dia do diaKey (ex: "dia_15" -> 15)
        const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
        
        // Calcular dia da semana (0=Dom, 1=Seg, ..., 6=Sáb)
        const dataCompleta = new Date(ano, mes - 1, numeroDia);
        const diaSemana = dataCompleta.getDay();

        // ========================================
        // REGRA: TROCA DE TURNO (apenas vigias)
        // Quando 'troca' está marcado, o funcionário inverteu o turno (ex: diurno virou noturno).
        // Para não gerar atrasos/saídas antecipadas falsos, invertemos os horários previstos
        // (entrada <-> saída) antes do cálculo. A jornada total continua igual.
        // ========================================
        let horariosPrevistosEfetivos = horariosPrevistos;
        let nomeEscalaEfetivo = nomeEscala;
        if (dia.troca === true) {
            // Se não temos horários previstos explícitos, gerar a partir do código da escala
            let base = horariosPrevistos;
            if ((!base || !base.entrada || !base.saida) && nomeEscala) {
                const gerado = gerarHorariosPadraoEscala(nomeEscala, diaSemana);
                if (gerado) base = gerado;
            }
            if (base && base.entrada && base.saida) {
                horariosPrevistosEfetivos = {
                    entrada: base.saida,
                    inicio_refeicao: base.termino_refeicao || '',
                    termino_refeicao: base.inicio_refeicao || '',
                    saida: base.entrada
                };
            }
            // Limpar nomeEscala para evitar que calcularHorasDia regenere o previsto original
            // (gerarHorariosPadraoEscala dentro de calcularHorasDia) e calcule atrasos errados.
            nomeEscalaEfetivo = '';
        }

        // Cálculo normal usando a função calcularHorasDia
        const calculo = calcularHorasDia(
            {
                entrada: dia.entrada,
                inicio_refeicao: dia.inicio_refeicao,
                termino_refeicao: dia.termino_refeicao,
                saida: dia.saida
            },
            jornadaPadrao,
            dia.feriado,
            dia.folga,
            diaSemana,
            nomeEscalaEfetivo,
            horariosPrevistosEfetivos
        );

        dia.calculo = calculo;
    };

    // Salvar todas as folhas
    const handleSalvarTodasFolhas = async () => {
        if (todasFolhas.length === 0) {
            showToast('Nenhuma folha para salvar', 'error');
            return;
        }

        const confirmar = window.confirm(
            `Deseja salvar ${todasFolhas.length} folha(s) de ponto?\n\n` +
            `Folhas existentes serão atualizadas.`
        );

        if (!confirmar) return;

        setSubmitting(true);
        let sucessos = 0;
        let erros = 0;

        try {
            for (const folha of todasFolhas) {
                try {
                    const folhaParaSalvar = {
                        funcionario_id: folha.funcionario.id,
                        nome_funcionario: folha.funcionario.nome_completo, // ✅ NOVO: Nome para facilitar consultas
                        mes,
                        ano,
                        empresa_id: folha.empresa?.id || null,
                        posto_trabalho_id: folha.posto_trabalho?.id || null,
                        cargo_id: folha.cargo?.id || null,
                        escala_id: folha.escala?.id || null,
                        dados_dias: JSON.stringify(folha.dadosDias),
                        data_inicio: folha.data_inicio || null,
                        data_fim: folha.data_fim || null,
                        horas_trabalhadas: folha.totais.total_horas_normais || 0,
                        horas_extras: (folha.totais.total_horas_extras_50 || 0) + (folha.totais.total_horas_extras_100 || 0),
                        total_horas_normais: folha.totais.total_horas_normais || 0,
                        total_horas_extras_50: folha.totais.total_horas_extras_50 || 0,
                        total_horas_extras_100: folha.totais.total_horas_extras_100 || 0,
                        total_horas_noturnas: folha.totais.total_horas_noturnas || 0,
                        total_intrajornada_50: folha.totais.total_intrajornada_50 || 0,
                        total_intrajornada_100: folha.totais.total_intrajornada_100 || 0,
                        faltas: (folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0),
                        total_faltas_justificadas: folha.totais.total_faltas_justificadas || 0,
                        total_faltas_injustificadas: folha.totais.total_faltas_injustificadas || 0,
                        total_suspensoes: folha.totais.total_suspensoes || 0, // NOVO: Total de suspensões
                        atrasos: folha.totais.total_atrasos || 0,
                        total_atrasos: folha.totais.total_atrasos || 0,
                        folgas_trabalhadas: folha.totais.folgas_trabalhadas || 0 // ✅ Nova coluna
                    };

                    // UPSERT: Atualiza se existir, insere se não existir
                    const { error } = await supabase
                        .from('folhas_ponto')
                        .upsert(folhaParaSalvar, {
                            onConflict: 'funcionario_id,mes,ano'
                        });

                    if (error) throw error;

                    sucessos++;
                } catch (error) {
                    erros++;
                }
            }

            showToast(`✅ Processo concluído! Sucessos: ${sucessos} | Erros: ${erros} | Total: ${todasFolhas.length}`,
                erros > 0 ? 'info' : 'success'
            );

        } catch (error) {
            showToast('Erro inesperado ao salvar folhas', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Gerar últimos 12 meses (salva automaticamente)
    const handleGerarUltimos12Meses = async () => {
        const funcionariosComCargo = funcionarios?.filter(f => {
            // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
            if (f.demitido === true) {
                return false;
            }
            
            return f.cargo_id;
        }) || [];
        
        if (funcionariosComCargo.length === 0) {
            showToast('Nenhum funcionário ativo com cargo definido', 'error');
            return;
        }
        
        if (!window.confirm(`Deseja gerar e salvar as folhas de ponto dos ÚLTIMOS 12 MESES para ${funcionariosComCargo.length} funcionário(s)?\n\nIsso pode levar alguns minutos.`)) {
            return;
        }
        
        setSubmitting(true);
        setLoading(true);
        
        try {
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();
            
            let totalSucessos = 0;
            let totalErros = 0;
            
            // Gerar últimos 12 meses
            for (let i = 11; i >= 0; i--) {
                let mesCalc = mesAtual - i;
                let anoCalc = anoAtual;
                
                while (mesCalc <= 0) {
                    mesCalc += 12;
                    anoCalc -= 1;
                }
                
                setProgressoGeracao({ atual: 12 - i, total: 12 });
                
                for (const funcionario of funcionariosComCargo) {
                    try {
                        // Verificar se já existe folha
                        const { data: folhaExistente } = await supabase
                            .from('folhas_ponto')
                            .select('id')
                            .eq('funcionario_id', funcionario.id)
                            .eq('mes', mesCalc)
                            .eq('ano', anoCalc)
                            .maybeSingle();
                        
                        // Se já existe, pular
                        if (folhaExistente) {
                            continue;
                        }
                        
                        // Buscar escala salva
                        const escala = await buscarEscalaSalva(funcionario.id, mesCalc, anoCalc);
                        
                        if (!escala) {
                            totalErros++;
                            continue;
                        }
                        
                        const diasEscala = JSON.parse(escala.dias_trabalhados);
                        const novosDados: any = {};
                        const funcionarioInativo = funcionario.ativo === false;
                        const regrasJSON = escala.escala?.regras_json;
                        
                        // Gerar dados dos dias
                        Object.keys(diasEscala).forEach(diaKey => {
                            const diaEscala = diasEscala[diaKey];
                            const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                            const dataCompleta = new Date(anoCalc, mesCalc - 1, numeroDia);
                            const diaSemana = dataCompleta.getDay();
                            const diasSemanaTexto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                            const diaSemanaTexto = diasSemanaTexto[diaSemana];
                            
                            const ehFeriado = getFeriadosFuncionario(funcionario).some((feriado: any) => {
                                const dataFeriado = new Date(feriado.data_feriado + 'T00:00:00');
                                return dataFeriado.getDate() === numeroDia &&
                                       dataFeriado.getMonth() === mesCalc - 1 &&
                                       dataFeriado.getFullYear() === anoCalc;
                            }) || false;
                            
                            const interpretacao = interpretarRegraEscala(regrasJSON, numeroDia, mesCalc, anoCalc, diaSemanaTexto, ehFeriado);
                            const marcarFalta = funcionarioInativo;
                            
                            let entrada = interpretacao?.horarios.entrada || diaEscala.entrada || '';
                            let inicioRefeicao = interpretacao?.horarios.inicio_refeicao || diaEscala.inicio_refeicao || '';
                            let terminoRefeicao = interpretacao?.horarios.termino_refeicao || diaEscala.termino_refeicao || '';
                            let saida = interpretacao?.horarios.saida || diaEscala.saida || '';
                            let folga = interpretacao?.folga ?? diaEscala.folga ?? false;
                            
                            if (marcarFalta) {
                                entrada = '';
                                inicioRefeicao = '';
                                terminoRefeicao = '';
                                saida = '';
                                folga = false;
                            }
                            
                            novosDados[diaKey] = {
                                feriado: ehFeriado,
                                folga,
                                atestado: false,
                                falta_injustificada: marcarFalta,
                                entrada,
                                inicio_refeicao: inicioRefeicao,
                                termino_refeicao: terminoRefeicao,
                                saida,
                                calculo: null
                            };
                        });
                        
                        // Calcular horas - jornada será calculada dinamicamente
                        Object.keys(novosDados).forEach(diaKey => {
                            const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                            const diaEscalaOriginal = diasEscala[diaKey];
                            
                            // Extrair horários previstos da escala para cálculo de atrasos
                            const horariosPrevistos = diaEscalaOriginal ? {
                                entrada: diaEscalaOriginal.entrada || '',
                                inicio_refeicao: diaEscalaOriginal.inicio_refeicao || '',
                                termino_refeicao: diaEscalaOriginal.termino_refeicao || '',
                                saida: diaEscalaOriginal.saida || ''
                            } : undefined;
                            
                            recalcularDiaStatic(novosDados, diaKey, mesCalc, anoCalc, 8, escala.escala?.codigo_escala || '', horariosPrevistos);
                        });
                        
                        const totais = calcularTotaisMes(novosDados);
                        const primeiroDia = new Date(anoCalc, mesCalc - 1, 1);
                        const ultimoDia = new Date(anoCalc, mesCalc, 0);
                        
                        // Salvar folha
                        const folhaData = {
                            funcionario_id: funcionario.id,
                            mes: mesCalc,
                            ano: anoCalc,
                            empresa_id: funcionario.empresa_id,
                            posto_trabalho_id: funcionario.posto_trabalho_id,
                            cargo_id: funcionario.cargo_id,
                            escala_id: escala.escala_id,
                            data_inicio: primeiroDia.toISOString().split('T')[0],
                            data_fim: ultimoDia.toISOString().split('T')[0],
                            dados_dias: JSON.stringify(novosDados),
                            horas_trabalhadas: totais.total_horas_normais,
                            total_horas_normais: totais.total_horas_normais,
                            total_horas_extras_50: totais.total_horas_extras_50,
                            total_horas_extras_100: totais.total_horas_extras_100,
                            total_horas_noturnas: totais.total_horas_noturnas,
                            total_intrajornada_50: totais.total_intrajornada_50,
                            total_intrajornada_100: totais.total_intrajornada_100,
                            total_atrasos: totais.total_atrasos,
                            total_faltas_justificadas: totais.total_faltas_justificadas,
                            total_faltas_injustificadas: totais.total_faltas_injustificadas,
                            total_suspensoes: totais.total_suspensoes || 0, // NOVO: Total de suspensões
                            folgas_trabalhadas: totais.folgas_trabalhadas || 0 // NOVO: Folgas trabalhadas
                        };
                        
                        const result = await insertFolha(folhaData);
                        
                        if (result.success) {
                            totalSucessos++;
                        } else {
                            totalErros++;
                        }
                        
                    } catch (error) {
                        totalErros++;
                    }
                }
            }
            
            showToast(`✅ Processo concluído!\n\nMeses: 12\nFolhas geradas: ${totalSucessos}\nErros: ${totalErros}`, 'success');
            
            // Recarregar folhas do mês atual
            await carregarFolhasSalvas();
            
        } catch (error) {
            showToast('Erro ao gerar últimos 12 meses', 'error');
        } finally {
            setSubmitting(false);
            setLoading(false);
            setProgressoGeracao({ atual: 0, total: 0 });
        }
    };

    // Limpar todas as folhas
    const handleLimparTodas = () => {
        setTodasFolhas([]);
        setActiveTab('');
    };

    // Atualizar campo de um dia específico
    const handleAtualizarDia = (funcionarioId: string, dia: number, campo: string, valor: any) => {
        const novasFolhas = todasFolhas.map(folha => {
            if (folha.funcionario.id === funcionarioId) {
                const diaKey = `dia_${dia}`;
                const diaAtual = folha.dadosDias[diaKey] || {};
                
                // Criar objeto com a atualização
                const atualizacao: any = { [campo]: valor };
                
                // REGRA DE EXCLUSÃO MÚTUA: Folga, Atestado, Falta e Suspensão não podem coexistir
                const camposExclusivos = ['folga', 'atestado', 'falta_injustificada', 'suspensao'];
                if (camposExclusivos.includes(campo) && valor === true) {
                    // Desmarcar todos os outros campos exclusivos
                    camposExclusivos.forEach(c => {
                        if (c !== campo) {
                            atualizacao[c] = false;
                        }
                    });
                }
                
                // REGRA 2: Se marcou Atestado, Falta ou Suspensão, zerar horários
                if ((campo === 'atestado' || campo === 'falta_injustificada' || campo === 'suspensao') && valor === true) {
                    atualizacao.entrada = '';
                    atualizacao.inicio_refeicao = '';
                    atualizacao.termino_refeicao = '';
                    atualizacao.saida = '';
                }
                
                const novosDados = {
                    ...folha.dadosDias,
                    [diaKey]: {
                        ...diaAtual,
                        ...atualizacao
                    }
                };

                // Se mudou horário OU status (folga, feriado, etc), recalcular
                if (['entrada', 'inicio_refeicao', 'termino_refeicao', 'saida', 'folga', 'feriado', 'atestado', 'falta_injustificada', 'suspensao', 'troca'].includes(campo)) {
                    // Jornada será calculada dinamicamente baseada nos horários da escala
                    const nomeEscala = folha.escala?.codigo_escala || '';
                    
                    // Pegar horários previstos se disponíveis
                    
                    const horariosPrevistos = folha.horariosPrevistos?.[diaKey] ? {
                        entrada: folha.horariosPrevistos[diaKey].entrada || '',
                        inicio_refeicao: folha.horariosPrevistos[diaKey].inicio_refeicao || '',
                        termino_refeicao: folha.horariosPrevistos[diaKey].termino_refeicao || '',
                        saida: folha.horariosPrevistos[diaKey].saida || ''
                    } : undefined;
                    
                    recalcularDiaStatic(novosDados, diaKey, folha.mes, folha.ano, 8, nomeEscala, horariosPrevistos);
                }

                // Recalcular totais
                const novosTotais = calcularTotaisMes(novosDados);

                return {
                    ...folha,
                    dadosDias: novosDados,
                    totais: novosTotais
                };
            }
            return folha;
        });

        setTodasFolhas(novasFolhas);
    };

    // Excluir dia específico da folha
    const handleExcluirDia = (funcionarioId: string, dia: number) => {
        const confirmar = window.confirm(`Deseja excluir o dia ${dia}/${mes}/${ano} desta folha?`);
        if (!confirmar) return;

        const novasFolhas = todasFolhas.map(folha => {
            if (folha.funcionario.id === funcionarioId) {
                const diaKey = `dia_${dia}`;
                const novosDados = { ...folha.dadosDias };
                delete novosDados[diaKey];

                // Recalcular totais
                const novosTotais = calcularTotaisMes(novosDados);

                return {
                    ...folha,
                    dadosDias: novosDados,
                    totais: novosTotais
                };
            }
            return folha;
        });

        setTodasFolhas(novasFolhas);
        showToast(`Dia ${dia} excluído com sucesso`, 'success');
    };

    // Alternar modo de edição
    const handleToggleEdicao = (funcionarioId: string) => {
        setModoEdicao(prev => ({
            ...prev,
            [funcionarioId]: !prev[funcionarioId]
        }));
    };

    // Atualizar observações
    const handleAtualizarObservacoes = (funcionarioId: string, valor: string) => {
        setObservacoes(prev => ({
            ...prev,
            [funcionarioId]: valor
        }));
    };

    const diasNoMes = getDaysInMonth(mes, ano);
    const days = Array.from({ length: diasNoMes }, (_, i) => i + 1);

    // Renderizar tabela de ponto
    const renderTabelaPonto = (folha: any) => {
        return (
            <div>
                <div className="mb-2 flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-50 border border-red-200"></div>
                        <span>Feriado</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-50 border border-gray-200"></div>
                        <span>Folga</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500"></div>
                        <span className="font-semibold text-blue-700">Trabalhou em Folga/Feriado (Convocação)</span>
                    </div>
                </div>
                {/* Resumo Mobile */}
                <div className="lg:hidden bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                    <h5 className="font-semibold text-blue-800 mb-3">📊 Resumo Rápido</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded p-2">
                            <div className="text-gray-600">Horas Normais</div>
                            <div className="font-bold text-blue-600">{folha.totais.total_horas_normais?.toFixed(2) || '0.00'}h</div>
                        </div>
                        <div className="bg-white rounded p-2">
                            <div className="text-gray-600">Extras 50%</div>
                            <div className="font-bold text-green-600">{folha.totais.total_horas_extras_50?.toFixed(2) || '0.00'}h</div>
                        </div>
                        <div className="bg-white rounded p-2">
                            <div className="text-gray-600">Faltas</div>
                            <div className="font-bold text-red-600">{(folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0)}</div>
                        </div>
                        <div className="bg-white rounded p-2">
                            <div className="text-gray-600">Atrasos</div>
                            <div className="font-bold text-orange-600">{folha.totais.total_atrasos?.toFixed(2) || '0.00'}h</div>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800 text-sm">
                            <span>📱</span>
                            <span>Deslize horizontalmente para ver todas as colunas da tabela</span>
                        </div>
                    </div>
                </div>
                
                <div className="timesheet-scroll-container border border-gray-200 rounded-lg" style={{ overflowX: 'scroll', maxHeight: '70vh', overflowY: 'auto' }}>
                    <table className="min-w-full divide-y divide-gray-200 text-xs" style={{ minWidth: '1200px' }}>
                    <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th colSpan={7} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Status</th>
                            <th colSpan={2} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Dia</th>
                            <th colSpan={4} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Horários</th>
                            <th colSpan={10} className="px-2 py-2 text-center font-medium text-gray-500 uppercase bg-gray-100">Horas Calculadas</th>
                        </tr>
                        <tr>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Fer.</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Folga</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-blue-700 bg-blue-100" title="Folga Trabalhada (manual): funcionário trabalhou substituindo outro. Gera benefício diário conforme função.">FT</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-amber-700 bg-amber-100" title="Troca de turno (apenas vigias): funcionário inverteu seu turno (diurno↔noturno). Não gera atrasos/saídas antecipadas.">Troca</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Atst.</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Falta</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-purple-700 bg-purple-100" title="Suspensão disciplinar">Susp.</th>
                            <th className="sticky left-0 z-30 bg-gray-50 px-1 py-2 text-center text-xs font-medium text-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] border-r border-gray-300">Dia</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Sem</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Entrada</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Iníc Refeição</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Fim Refeição</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Saída</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Normal</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Extra 50%</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Extra 100%</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Noturna</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Intra 50%</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Intra 100%</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-red-100">Atrasos</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-yellow-100">Atestados</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-orange-100">Faltas Injustif.</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-purple-100">Suspensões</th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-blue-100">Folg. Trab.</th>
                            {modoEdicao[folha.funcionario.id] && (
                                <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-red-200">Ações</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {days.map(day => {
                            const diaKey = `dia_${day}`;
                            const dia = folha.dadosDias[diaKey];
                            
                            // ✅ CORREÇÃO: Suprimir dias fora do período parcial
                            if (!dia) {
                                return null; // Dia não existe nos dados = não exibir
                            }
                            
                            const calculo = dia.calculo || {};

                            const horasNormais = calculo.horas_normais || 0;
                            const horasExtras = (calculo.horas_extras_50 || 0) + (calculo.horas_extras_100 || 0);
                            const folgaTrabalhada = dia.ft_manual === true;

                            // Detectar se trabalhou em folga/feriado (convocação)
                            const trabalhouEmFolgaOuFeriado = (dia.folga || dia.feriado) && dia.entrada && dia.saida;
                            
                            return (
                                <tr 
                                    key={day} 
                                    className={
                                        trabalhouEmFolgaOuFeriado ? 'bg-blue-50 border-l-4 border-blue-500' :
                                        dia.feriado ? 'bg-red-50' : 
                                        dia.folga ? 'bg-gray-50' : 
                                        'hover:bg-gray-50'
                                    }
                                >
                                    <td className="px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={dia.feriado || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'feriado', e.target.checked)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={dia.folga || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'folga', e.target.checked)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center bg-blue-50">
                                        <input
                                            type="checkbox"
                                            checked={dia.ft_manual || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'ft_manual', e.target.checked)}
                                            className="rounded"
                                            title="FT - Folga Trabalhada (manual). Marque quando o funcionário trabalhou em folga substituindo outro. Gera diária em Benefícios."
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center bg-amber-50">
                                        {(() => {
                                            const codigoEscala = (folha.escala?.codigo_escala || folha.funcionario?.codigo_escala || '').toUpperCase();
                                            const nomeCargo = (folha.funcionario?.nome_cargo || folha.funcionario?.cargo?.nome_cargo || '').toUpperCase();
                                            const isVigia = codigoEscala.includes('VIG') || nomeCargo.includes('VIGIA');
                                            return (
                                                <input
                                                    type="checkbox"
                                                    checked={dia.troca || false}
                                                    disabled={!isVigia}
                                                    onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'troca', e.target.checked)}
                                                    className="rounded"
                                                    title={isVigia
                                                        ? "Troca - Marque quando o vigia inverteu seu turno (diurno↔noturno). Não gera atrasos."
                                                        : "Troca disponível apenas para vigias."}
                                                />
                                            );
                                        })()}
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={dia.atestado || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'atestado', e.target.checked)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={dia.falta_injustificada || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'falta_injustificada', e.target.checked)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={dia.suspensao || false}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'suspensao', e.target.checked)}
                                            className="rounded"
                                            title="Suspensão disciplinar - conta como falta injustificada para férias e benefícios"
                                        />
                                    </td>
                                    <td className={`sticky left-0 z-10 px-1 py-1 text-center font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] border-r border-gray-300 ${
                                        trabalhouEmFolgaOuFeriado ? 'bg-blue-50' :
                                        dia.feriado ? 'bg-red-50' :
                                        dia.folga ? 'bg-gray-50' :
                                        'bg-white'
                                    }`}>{String(day).padStart(2, '0')}/{String(mes).padStart(2, '0')}</td>
                                    <td className="px-1 py-1 text-center">{getWeekday(day, mes, ano)}</td>
                                    <td className="px-1 py-1">
                                        <input
                                            type="time"
                                            value={dia.entrada || ''}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'entrada', e.target.value)}
                                            className="w-20 text-center border-gray-200 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <input
                                            type="time"
                                            value={dia.inicio_refeicao || ''}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'inicio_refeicao', e.target.value)}
                                            className="w-20 text-center border-gray-200 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <input
                                            type="time"
                                            value={dia.termino_refeicao || ''}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'termino_refeicao', e.target.value)}
                                            className="w-20 text-center border-gray-200 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <input
                                            type="time"
                                            value={dia.saida || ''}
                                            onChange={(e) => handleAtualizarDia(folha.funcionario.id, day, 'saida', e.target.value)}
                                            className="w-20 text-center border-gray-200 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_normais?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_extras_50?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_extras_100?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_noturnas?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.intrajornada_50?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.intrajornada_100?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-red-50 text-xs">{calculo.atrasos?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-1 text-center bg-yellow-50 text-xs">{dia.atestado ? '1' : '0'}</td>
                                    <td className="px-1 py-1 text-center bg-orange-50 text-xs">{dia.falta_injustificada ? '1' : '0'}</td>
                                    <td className="px-1 py-1 text-center bg-purple-50 text-xs">{dia.suspensao ? '1' : '0'}</td>
                                    <td className="px-1 py-1 text-center bg-blue-50 text-xs">{folgaTrabalhada ? '1' : '0'}</td>
                                    {modoEdicao[folha.funcionario.id] && (
                                        <td className="px-1 py-1 text-center bg-red-50">
                                            <button
                                                onClick={() => handleExcluirDia(folha.funcionario.id, day)}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold"
                                                title="Excluir este dia"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {/* Linha de Totais */}
                        <tr className="bg-blue-100 font-bold">
                            <td colSpan={13} className="px-2 py-2 text-right">TOTAIS DO MÊS:</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_horas_normais?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_horas_extras_50?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_horas_extras_100?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_horas_noturnas?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_intrajornada_50?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center">{folha.totais.total_intrajornada_100?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center bg-red-100">{folha.totais.total_atrasos?.toFixed(2) || '0.00'}</td>
                            <td className="px-1 py-2 text-center bg-yellow-100">{folha.totais.total_faltas_justificadas || '0'}</td>
                            <td className="px-1 py-2 text-center bg-orange-100">{folha.totais.total_faltas_injustificadas || '0'}</td>
                            <td className="px-1 py-2 text-center bg-purple-100">{folha.totais.total_suspensoes || '0'}</td>
                            <td className="px-1 py-2 text-center bg-blue-200">{folha.totais.folgas_trabalhadas || '0'}</td>
                            {modoEdicao[folha.funcionario.id] && (
                                <td className="px-1 py-2"></td>
                            )}
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>
        );
    };

    // Função para ordenar as folhas
    const folhasOrdenadas = [...todasFolhas].sort((a, b) => {
        switch (ordenacao) {
            case 'nome':
                return (a.funcionario.nome_completo || '').localeCompare(b.funcionario.nome_completo || '');
            case 'empresa':
                const empresaA = a.empresa?.nome_empresa || '';
                const empresaB = b.empresa?.nome_empresa || '';
                return empresaA.localeCompare(empresaB);
            case 'posto':
                const postoA = a.funcionario?.nome_posto || a.posto_trabalho?.nome_posto || '';
                const postoB = b.funcionario?.nome_posto || b.posto_trabalho?.nome_posto || '';
                return postoA.localeCompare(postoB);
            default:
                return 0;
        }
    });

    return (
        <div className="space-y-6">
            <ToastContainer />
            <h1 className="text-2xl font-bold">Folhas de Ponto</h1>
            
            {/* Seção: Folha Individual */}
            <Card>
                <h2 className="text-xl font-semibold mb-4">📋 Folha Individual</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Select
                        label="Funcionário"
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                    >
                        <option value="">Selecione um funcionário</option>
                        {funcionarios
                            ?.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''))
                            .map((func) => (
                                <option key={func.id} value={func.id}>{func.nome_completo}</option>
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
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={periodoParcial}
                                onChange={(e) => setPeriodoParcial(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Período personalizado</span>
                        </label>
                    </div>
                </div>

                {periodoParcial && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Início
                            </label>
                            <input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                value={dataInicioTemp}
                                onChange={(e) => {
                                    let valor = e.target.value.replace(/\D/g, '');
                                    
                                    // Aplicar máscara enquanto digita
                                    let valorFormatado = valor;
                                    if (valor.length >= 2) {
                                        valorFormatado = valor.substring(0, 2) + '/' + valor.substring(2);
                                    }
                                    if (valor.length >= 4) {
                                        valorFormatado = valorFormatado.substring(0, 5) + '/' + valor.substring(4, 8);
                                    }
                                    
                                    // Atualizar estado temporário (permite digitação)
                                    setDataInicioTemp(valorFormatado);
                                    
                                    // Só atualizar o state ISO quando tiver data completa
                                    if (valor.length === 8) {
                                        const dia = valor.substring(0, 2);
                                        const mes = valor.substring(2, 4);
                                        const ano = valor.substring(4, 8);
                                        setDataInicio(`${ano}-${mes}-${dia}`);
                                    }
                                }}
                                maxLength={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Fim
                            </label>
                            <input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                value={dataFimTemp}
                                onChange={(e) => {
                                    let valor = e.target.value.replace(/\D/g, '');
                                    
                                    // Aplicar máscara enquanto digita
                                    let valorFormatado = valor;
                                    if (valor.length >= 2) {
                                        valorFormatado = valor.substring(0, 2) + '/' + valor.substring(2);
                                    }
                                    if (valor.length >= 4) {
                                        valorFormatado = valorFormatado.substring(0, 5) + '/' + valor.substring(4, 8);
                                    }
                                    
                                    // Atualizar estado temporário (permite digitação)
                                    setDataFimTemp(valorFormatado);
                                    
                                    // Só atualizar o state ISO quando tiver data completa
                                    if (valor.length === 8) {
                                        const dia = valor.substring(0, 2);
                                        const mes = valor.substring(2, 4);
                                        const ano = valor.substring(4, 8);
                                        setDataFim(`${ano}-${mes}-${dia}`);
                                    }
                                }}
                                maxLength={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="col-span-2 text-xs text-yellow-700">
                            💡 Use para admissão, demissão, afastamento ou qualquer período parcial
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        <Button 
                            onClick={() => handleGerarFolhaIndividual(activeTab)} 
                            disabled={!activeTab || loading}
                        >
                            {loading ? 'Gerando...' : '📋 Gerar Folha'}
                        </Button>
                        <Button 
                            onClick={() => setMostrarSeletorPeriodo(!mostrarSeletorPeriodo)} 
                            disabled={loading || submitting}
                            className="!bg-primary !text-primary-foreground hover:!bg-primary/90"
                        >
                            📅 Gerar Período
                        </Button>
                        <Button 
                            onClick={handleLimparTodas} 
                            variant="secondary" 
                            disabled={submitting || loading}
                        >
                            Limpar Individual
                        </Button>
                        <Button 
                            onClick={() => handleSalvarFolhaIndividual(activeTab)} 
                            disabled={!activeTab || submitting || !todasFolhas.some(f => f.funcionario.id === activeTab)}
                            className="!bg-blue-600 !text-white hover:!bg-blue-700 focus:!ring-blue-500"
                        >
                            💾 Salvar Individual
                        </Button>
                        <Button 
                            onClick={() => handleExcluirFolhaIndividual(activeTab)}
                            disabled={!activeTab || submitting || !todasFolhas.some(f => f.funcionario.id === activeTab)}
                            className="!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500"
                        >
                            🗑️ Excluir Individual
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Seção: Todas as Folhas */}
            <Card className="bg-green-50 border border-green-200">
                <h2 className="text-xl font-semibold mb-4 text-green-800">📚 Todas as Folhas</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <Select 
                        label="Mês" 
                        value={mes.toString()} 
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {meses.map((mesNome, index) => (
                            <option key={index} value={index + 1}>{mesNome}</option>
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
                    
                    <Select 
                        label="Escala (Filtro)" 
                        value={ordenacao} 
                        onChange={(e) => setOrdenacao(e.target.value as 'nome' | 'empresa' | 'posto')}
                    >
                        <option value="nome">Todas as escalas</option>
                        <option value="empresa">Por Empresa</option>
                        <option value="posto">Por Posto</option>
                    </Select>
                </div>
                
                {canShowActions() ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <Button 
                        onClick={handleGerarTodasFolhas} 
                        disabled={loading}
                        className="!bg-green-600 !text-white hover:!bg-green-700 focus:!ring-green-500"
                    >
                        {loading ? 'Gerando...' : '📋 Gerar Todas'}
                    </Button>
                    <Button 
                        onClick={() => setMostrarSeletorPeriodo(!mostrarSeletorPeriodo)}
                        disabled={loading}
                        className="!bg-primary !text-primary-foreground hover:!bg-primary/90"
                    >
                        📅 Gerar Período
                    </Button>
                    <Button 
                        onClick={handleLimparTodas} 
                        variant="secondary" 
                        disabled={submitting || loading}
                    >
                        Limpar Todas
                    </Button>
                    <Button 
                        onClick={handleSalvarTodasFolhas} 
                        disabled={todasFolhas.length === 0 || submitting}
                        className="!bg-blue-600 !text-white hover:!bg-blue-700 focus:!ring-blue-500"
                    >
                        {submitting ? 'Salvando...' : `💾 Salvar Todas (${todasFolhas.length})`}
                    </Button>
                    <Button 
                        onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja excluir TODAS as folhas de ponto de ${meses[mes - 1]}/${ano}?`)) {
                                setSubmitting(true);
                                try {
                                    const { error } = await supabase
                                        .from('folhas_ponto')
                                        .delete()
                                        .eq('mes', mes)
                                        .eq('ano', ano);
                                    
                                    if (error) throw error;
                                    showToast('Todas as folhas de ponto foram excluídas!', 'success');
                                    setTodasFolhas([]);
                                    setActiveTab('');
                                } catch (error) {
                                    showToast(`Erro ao excluir folhas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }
                        }}
                        disabled={submitting}
                        className="!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500"
                    >
                        🗑️ Excluir Todas
                    </Button>
                </div>
                ) : (
                    <div className="text-center py-2 text-sm text-gray-500 italic">
                        Modo somente leitura - Ações em lote desabilitadas
                    </div>
                )}

                {progressoGeracao.total > 0 && (
                    <div className="mt-4">
                        <ProgressBar
                            label="Gerando folhas de ponto"
                            current={progressoGeracao.atual}
                            total={progressoGeracao.total}
                            color="green"
                            icon="📋"
                        />
                    </div>
                )}
            </Card>

            {/* Seletor de Período para Geração em Lote */}
            {mostrarSeletorPeriodo && (
                <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                    <h3 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200">📅 Gerar Folhas de Ponto por Período</h3>
                    <PeriodSelector
                        loading={loading || submitting}
                        buttonLabel="Gerar Folhas de Ponto"
                        buttonIcon="📋"
                        onGenerate={async (periods) => {
                            const funcionariosComCargo = funcionarios?.filter(f => !f.demitido && f.cargo_id) || [];
                            if (funcionariosComCargo.length === 0) {
                                showToast('Nenhum funcionário ativo com cargo definido', 'error');
                                return;
                            }
                            if (!window.confirm(`Gerar folhas de ${periods.length} mês(es) para ${funcionariosComCargo.length} funcionário(s)?`)) return;
                            
                            setLoading(true);
                            setProgressoGeracao({ atual: 0, total: periods.length });
                            let totalSucessos = 0, totalErros = 0, mesIndex = 0;
                            
                            try {
                                for (const { mes: mesCalc, ano: anoCalc } of periods) {
                                    mesIndex++;
                                    setProgressoGeracao({ atual: mesIndex, total: periods.length });
                                    
                                    for (const funcionario of funcionariosComCargo) {
                                        try {
                                            const { data: folhaExistente } = await supabase
                                                .from('folhas_ponto')
                                                .select('id')
                                                .eq('funcionario_id', funcionario.id)
                                                .eq('mes', mesCalc)
                                                .eq('ano', anoCalc)
                                                .maybeSingle();
                                            
                                            if (folhaExistente) continue;
                                            
                                            const escala = await buscarEscalaSalva(funcionario.id, mesCalc, anoCalc);
                                            if (!escala) { totalErros++; continue; }
                                            
                                            const diasEscala = JSON.parse(escala.dias_trabalhados);
                                            const novosDados: any = {};
                                            
                                            Object.keys(diasEscala).forEach(diaKey => {
                                                const diaEscala = diasEscala[diaKey];
                                                novosDados[diaKey] = {
                                                    feriado: diaEscala.feriado || false,
                                                    folga: diaEscala.folga || false,
                                                    atestado: false,
                                                    falta_injustificada: false,
                                                    entrada: diaEscala.entrada || '',
                                                    inicio_refeicao: diaEscala.inicio_refeicao || '',
                                                    termino_refeicao: diaEscala.termino_refeicao || '',
                                                    saida: diaEscala.saida || '',
                                                    calculo: null
                                                };
                                            });
                                            
                                            const totais = calcularTotaisMes(novosDados);
                                            const primeiroDia = new Date(anoCalc, mesCalc - 1, 1);
                                            const ultimoDia = new Date(anoCalc, mesCalc, 0);
                                            
                                            const result = await insertFolha({
                                                funcionario_id: funcionario.id,
                                                mes: mesCalc,
                                                ano: anoCalc,
                                                empresa_id: funcionario.empresa_id,
                                                posto_trabalho_id: funcionario.posto_trabalho_id,
                                                cargo_id: funcionario.cargo_id,
                                                escala_id: escala.escala_id,
                                                dados_dias: JSON.stringify(novosDados),
                                                horas_trabalhadas: totais.total_horas_normais,
                                                total_horas_normais: totais.total_horas_normais,
                                                total_horas_extras_50: totais.total_horas_extras_50,
                                                total_horas_extras_100: totais.total_horas_extras_100,
                                                total_faltas_justificadas: totais.total_faltas_justificadas,
                                                total_faltas_injustificadas: totais.total_faltas_injustificadas
                                            });
                                            
                                            if (result.success) totalSucessos++; else totalErros++;
                                        } catch { totalErros++; }
                                    }
                                }
                                showToast(`${periods.length} meses: ${totalSucessos} folhas, ${totalErros} erros`, totalErros > 0 ? 'error' : 'success');
                                await carregarFolhasSalvas();
                                setMostrarSeletorPeriodo(false);
                            } finally {
                                setLoading(false);
                                setProgressoGeracao({ atual: 0, total: 0 });
                            }
                        }}
                    />
                </Card>
            )}

            {/* Container de Todas as Folhas Geradas */}
            {todasFolhas.length > 0 && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Todas as Folhas Geradas - {meses[mes - 1]}/{ano}</h3>
                    </div>

                    {/* Layout Responsivo */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Abas dos Funcionários */}
                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="lg:border-r border-gray-200 lg:pr-4">
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

                                {/* Desktop Navigation */}
                                <nav className="hidden lg:block space-y-2">
                                    {folhasOrdenadas.map((folha) => (
                                        <button
                                            key={folha.funcionario.id}
                                            onClick={() => setActiveTab(folha.funcionario.id)}
                                            className={`w-full text-left py-3 px-4 border-l-4 font-medium text-sm transition-colors ${
                                                activeTab === folha.funcionario.id
                                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium">{folha.funcionario.nome_completo}</div>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${folha.funcionario.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {folha.funcionario.ativo !== false ? '✓' : '✗'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {ordenacao === 'empresa' && (
                                                    <div className="font-semibold text-blue-600">
                                                        🏢 {folha.empresa?.nome_empresa || 'Sem empresa'}
                                                    </div>
                                                )}
                                                {ordenacao === 'posto' && (
                                                    <div className="font-semibold text-purple-600">
                                                        📍 {folha.funcionario?.nome_posto || folha.posto_trabalho?.nome_posto || 'Sem posto'}
                                                    </div>
                                                )}
                                                {folha.cargo?.nome_cargo || 'Sem cargo'}
                                            </div>
                                        </button>
                                    ))}
                                </nav>

                                {/* Mobile Navigation */}
                                <div className="lg:hidden space-y-4">
                                    {/* Dropdown Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Selecionar Funcionário:
                                        </label>
                                        <select
                                            value={activeTab}
                                            onChange={(e) => setActiveTab(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {folhasOrdenadas.map((folha) => (
                                                <option key={folha.funcionario.id} value={folha.funcionario.id}>
                                                    {folha.funcionario.nome_completo} - {folha.cargo?.nome_cargo || 'Sem cargo'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Horizontal Scroll Tabs */}
                                    <div className="overflow-x-auto pb-2">
                                        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                                            {folhasOrdenadas.map((folha) => (
                                                <button
                                                    key={folha.funcionario.id}
                                                    onClick={() => setActiveTab(folha.funcionario.id)}
                                                    className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-xs transition-colors border-2 ${
                                                        activeTab === folha.funcionario.id
                                                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                    style={{ minWidth: '100px' }}
                                                >
                                                    <div className="text-center">
                                                        <div className="font-medium truncate">{folha.funcionario.nome_completo.split(' ')[0]}</div>
                                                        <span className={`text-xs px-1 py-0.5 rounded ${folha.funcionario.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {folha.funcionario.ativo !== false ? '✓' : '✗'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo da Aba Ativa */}
                        <div className="flex-1 min-w-0">
                            {todasFolhas.map((folha) => (
                                activeTab === folha.funcionario.id && (
                                    <div key={folha.funcionario.id}>
                                        {/* Informações do Funcionário - STICKY */}
                                        <div className="sticky top-0 z-30 bg-blue-50 border border-blue-200 rounded p-4 mb-4 shadow-md">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                                <div><span className="font-semibold">Funcionário:</span> {folha.funcionario.nome_completo}</div>
                                                <div><span className="font-semibold">Empresa:</span> {folha.empresa?.nome_empresa || folha.funcionario?.nome_empresa || 'N/A'}</div>
                                                <div><span className="font-semibold">Posto:</span> {folha.posto_trabalho?.nome_posto || folha.funcionario?.nome_posto || 'N/A'}</div>
                                                <div><span className="font-semibold">Cargo:</span> {folha.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}</div>
                                                <div><span className="font-semibold">Escala:</span> {folha.escala?.codigo_escala || folha.funcionario?.codigo_escala || 'N/A'}</div>
                                                <div><span className="font-semibold">Período:</span> {meses[mes - 1]}/{ano}</div>
                                                <div>
                                                    <span className="font-semibold">Status:</span>{' '}
                                                    <span className={`font-semibold ${folha.funcionario.ativo !== false ? 'text-green-600' : 'text-red-600'}`}>
                                                        {folha.funcionario.ativo !== false ? '🟢 ATIVO' : '🔴 INATIVO'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-semibold">Funcionário Registrado:</span>{' '}
                                                    <span className={`font-semibold ${folha.funcionario.funcionario_registrado !== false ? 'text-blue-600' : 'text-orange-600'}`}>
                                                        {folha.funcionario.funcionario_registrado !== false ? '✅ SIM' : '❌ NÃO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Período Trabalhado (para meses parciais) */}
                                        <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-4">
                                            <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Período Trabalhado (Mês Parcial)</h4>
                                            <div className="text-sm text-yellow-700 mb-3">
                                                Use estes campos se o funcionário NÃO trabalhou o mês inteiro (ex: admissão, demissão, afastamento)
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Data Início
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="DD/MM/AAAA"
                                                        defaultValue={(() => {
                                                            const dataISO = folha.data_inicio || `${ano}-${mes.toString().padStart(2, '0')}-01`;
                                                            const [anoStr, mesStr, diaStr] = dataISO.split('-');
                                                            return `${diaStr}/${mesStr}/${anoStr}`;
                                                        })()}
                                                        onBlur={(e) => {
                                                            const valor = e.target.value;
                                                            if (valor.length === 10) {
                                                                const [dia, mes, ano] = valor.split('/');
                                                                const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                                                                const novasFolhas = todasFolhas.map(f => 
                                                                    f.funcionario.id === folha.funcionario.id 
                                                                        ? { ...f, data_inicio: dataISO }
                                                                        : f
                                                                );
                                                                setTodasFolhas(novasFolhas);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                        onInput={(e) => {
                                                            const input = e.currentTarget;
                                                            let valor = input.value.replace(/\D/g, '');
                                                            
                                                            if (valor.length >= 2) {
                                                                valor = valor.substring(0, 2) + '/' + valor.substring(2);
                                                            }
                                                            if (valor.length >= 5) {
                                                                valor = valor.substring(0, 5) + '/' + valor.substring(5, 9);
                                                            }
                                                            
                                                            input.value = valor;
                                                        }}
                                                        maxLength={10}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Data Fim
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="DD/MM/AAAA"
                                                        defaultValue={(() => {
                                                            const dataISO = folha.data_fim || `${ano}-${mes.toString().padStart(2, '0')}-${getDaysInMonth(mes, ano)}`;
                                                            const [anoStr, mesStr, diaStr] = dataISO.split('-');
                                                            return `${diaStr}/${mesStr}/${anoStr}`;
                                                        })()}
                                                        onBlur={(e) => {
                                                            const valor = e.target.value;
                                                            if (valor.length === 10) {
                                                                const [dia, mes, ano] = valor.split('/');
                                                                const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                                                                const novasFolhas = todasFolhas.map(f => 
                                                                    f.funcionario.id === folha.funcionario.id 
                                                                        ? { ...f, data_fim: dataISO }
                                                                        : f
                                                                );
                                                                setTodasFolhas(novasFolhas);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                        onInput={(e) => {
                                                            const input = e.currentTarget;
                                                            let valor = input.value.replace(/\D/g, '');
                                                            
                                                            if (valor.length >= 2) {
                                                                valor = valor.substring(0, 2) + '/' + valor.substring(2);
                                                            }
                                                            if (valor.length >= 5) {
                                                                valor = valor.substring(0, 5) + '/' + valor.substring(5, 9);
                                                            }
                                                            
                                                            input.value = valor;
                                                        }}
                                                        maxLength={10}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <div className="text-sm">
                                                        <div className="font-semibold text-gray-700">Dias Trabalhados:</div>
                                                        <div className="text-2xl font-bold text-blue-600">
                                                            {(() => {
                                                                const inicio = new Date(folha.data_inicio || `${ano}-${mes.toString().padStart(2, '0')}-01`);
                                                                const fim = new Date(folha.data_fim || `${ano}-${mes.toString().padStart(2, '0')}-${getDaysInMonth(mes, ano)}`);
                                                                const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                                return dias;
                                                            })()}
                                                            <span className="text-sm text-gray-500"> / {getDaysInMonth(mes, ano)} dias</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações Individuais */}
                                        <div className="mb-4 flex flex-col sm:flex-row gap-2">
                                            <Button 
                                                onClick={() => handleToggleEdicao(folha.funcionario.id)}
                                                variant={modoEdicao[folha.funcionario.id] ? "primary" : "secondary"}
                                                className="w-full sm:w-auto"
                                            >
                                                {modoEdicao[folha.funcionario.id] ? '✅ Concluir Edição' : '✏️ Editar'}
                                            </Button>
                                            <Button 
                                                onClick={() => handleSalvarFolhaIndividual(folha.funcionario.id)}
                                                disabled={submitting}
                                                variant="secondary"
                                                className="w-full sm:w-auto"
                                            >
                                                {submitting ? 'Salvando...' : '💾 Salvar Individual'}
                                            </Button>
                                            <Button 
                                                onClick={() => handleExcluirFolhaIndividual(folha.funcionario.id)}
                                                disabled={submitting}
                                                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                                            >
                                                {submitting ? 'Excluindo...' : '🗑️ Excluir Individual'}
                                            </Button>
                                            <Button 
                                                onClick={() => {
                                                    exportarParaImpressao(
                                                        {
                                                            funcionario: folha.funcionario,
                                                            empresa: folha.empresa,
                                                            cargo: folha.cargo
                                                        },
                                                        folha.dadosDias,
                                                        folha.totais,
                                                        mes,
                                                        ano
                                                    );
                                                }} 
                                                variant="secondary"
                                            >
                                                👁️ Visualizar
                                            </Button>
                                        </div>

                                        {/* Campo de Observações */}
                                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                📝 Observações (afastamentos, suspensões, etc.)
                                            </label>
                                            <textarea
                                                value={observacoes[folha.funcionario.id] || ''}
                                                onChange={(e) => handleAtualizarObservacoes(folha.funcionario.id, e.target.value)}
                                                placeholder="Ex: Afastado de 10/10 a 15/10 por motivo de saúde..."
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            />
                                        </div>

                                        {/* Tabela de Ponto */}
                                        {renderTabelaPonto(folha)}

                                        {/* Resumo */}
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm bg-gray-50 p-4 rounded">
                                            <div><span className="font-semibold">Faltas Justificadas:</span> {folha.totais.total_faltas_justificadas || 0}</div>
                                            <div><span className="font-semibold">Faltas Injustificadas:</span> {folha.totais.total_faltas_injustificadas || 0}</div>
                                            <div><span className="font-semibold text-purple-700">Suspensões:</span> <span className="text-purple-700">{folha.totais.total_suspensoes || 0}</span></div>
                                            <div><span className="font-semibold">Total de Atrasos:</span> {folha.totais.total_atrasos?.toFixed(2) || '0.00'}h</div>
                                            <div><span className="font-semibold">Total Geral de Horas:</span> {(
                                                (folha.totais.total_horas_normais || 0) +
                                                (folha.totais.total_horas_extras_50 || 0) +
                                                (folha.totais.total_horas_extras_100 || 0)
                                            ).toFixed(2)}h</div>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default TimeSheets;


