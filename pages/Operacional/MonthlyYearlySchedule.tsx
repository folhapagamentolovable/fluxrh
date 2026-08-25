import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { Sparkles } from 'lucide-react';
import { useFuncionariosAtivos, useCargos, useEmpresas, usePostosTrabalho, useFeriados, useEscalasMensais } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { interpretarRegraEscala } from '../../utils/interpretadorRegrasEscala';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import PeriodSelector, { formatMonthYear } from '../../components/PeriodSelector';
import { abreviarNome } from '../../utils/formatarNome';

const MonthlyYearlySchedule: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { isClient, user } = useAuth();
    const [regrasEscalas, setRegrasEscalas] = React.useState<any[]>([]);
    const { data: allFuncionarios } = useFuncionariosAtivos();
    const { data: cargos } = useCargos();
    const { data: empresas } = useEmpresas();
    const { data: postos } = usePostosTrabalho();
    const { data: feriados } = useFeriados();
    const { insert: insertEscalaMensal, update: updateEscalaMensal, remove: removeEscalaMensal } = useEscalasMensais();
    const [clientPostos, setClientPostos] = React.useState<string[]>([]);

    // Carregar postos vinculados ao cliente
    React.useEffect(() => {
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

    // Filtrar funcionários pelos postos do cliente
    const funcionarios = isClient && clientPostos.length > 0
        ? allFuncionarios?.filter((f: any) => f.posto_trabalho_id && clientPostos.includes(f.posto_trabalho_id))
        : allFuncionarios;

    // Log dos feriados carregados (apenas informativo)
    React.useEffect(() => {
        if (feriados && feriados.length > 0) {
        }
    }, [feriados]);

    // Carregar regras de escalas
    React.useEffect(() => {
        const carregarRegrasEscalas = async () => {
            const { data, error } = await supabase
                .from('regras_escalas')
                .select('*')
                .eq('ativa', true)
                .order('codigo_escala');
            
            if (!error && data) {
                setRegrasEscalas(data);
            }
        };
        carregarRegrasEscalas();
    }, []);

    const [generatorData, setGeneratorData] = React.useState({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        funcionario_id: '',
        escala_id: ''
    });
    
    const [generatedSchedule, setGeneratedSchedule] = React.useState<any>(null);
    const [scheduleData, setScheduleData] = React.useState<{[key: string]: any}>({});
    const [submitting, setSubmitting] = React.useState(false);
    const [allSchedules, setAllSchedules] = React.useState<any[]>([]);
    const [activeTab, setActiveTab] = React.useState<string>('');
    const [ordenacao, setOrdenacao] = React.useState<'nome' | 'empresa' | 'posto' | 'escala'>('nome');
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [modoEdicao, setModoEdicao] = React.useState(false);
    const [modoEdicaoAbas, setModoEdicaoAbas] = React.useState<Record<string, boolean>>({});
    
    // Cache global de escalas interpretadas (useState para causar re-render)
    const [escalasCache, setEscalasCache] = React.useState<{[key: string]: any[]}>({});
    
    // Estado de progresso para geração dos últimos 12 meses
    const [progressoGeracao, setProgressoGeracao] = React.useState<{
        ativo: boolean;
        mesAtual: string;
        progresso: number;
        total: number;
    }>({
        ativo: false,
        mesAtual: '',
        progresso: 0,
        total: 0
    });

    // Estado para mostrar seletor de período
    const [mostrarSeletorPeriodo, setMostrarSeletorPeriodo] = React.useState(false);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Carregar escalas salvas ao montar o componente ou mudar mês/ano
    React.useEffect(() => {
        carregarEscalasSalvas();
    }, [generatorData.mes, generatorData.ano]);

    const carregarEscalasSalvas = async () => {
        try {
            
            // Buscar escalas mensais sem os JOINs problemáticos
            const { data: escalasSalvas, error } = await supabase
                .from('escala_mensal')
                .select(`
                    *,
                    funcionario:funcionarios(*,cargo:cargos(*)),
                    empresa:empresas(*),
                    posto:postos_trabalho(*),
                    cargo:cargos(*)
                `)
                .eq('mes', generatorData.mes)
                .eq('ano', generatorData.ano);

            if (error) throw error;
            
            
            if (!escalasSalvas || escalasSalvas.length === 0) {
                setAllSchedules([]);
                setActiveTab('');
                return;
            }

            // Buscar todas as regras de escalas
            const { data: regrasData } = await supabase
                .from('regras_escalas')
                .select('id, codigo_escala, nome_escala');


            // Fazer JOIN manual com escalas
            if (escalasSalvas && regrasData) {
                escalasSalvas.forEach(escala => {
                    // Adicionar escala ao cargo do funcionário
                    if (escala.funcionario?.cargo?.escala_id) {
                        escala.funcionario.cargo.escala = regrasData.find(r => r.id === escala.funcionario.cargo.escala_id) || null;
                    }
                    // Adicionar escala ao cargo direto
                    if (escala.cargo?.escala_id) {
                        escala.cargo.escala = regrasData.find(r => r.id === escala.cargo.escala_id) || null;
                    }
                    // Adicionar escala direta
                    if (escala.escala_id) {
                        escala.escala = regrasData.find(r => r.id === escala.escala_id) || null;
                    }
                });
            }

            if (escalasSalvas && escalasSalvas.length > 0) {
                const escalasProcessadas = escalasSalvas.map(escala => {
                    const diasTrabalhados = JSON.parse(escala.dias_trabalhados);
                    const dias = Object.keys(diasTrabalhados).map(diaKey => {
                        const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
                        const diaData = diasTrabalhados[diaKey];
                        const dataCompleta = new Date(generatorData.ano, generatorData.mes - 1, numeroDia);
                        
                        // Montar objeto de horários
                        const horarios = (!diaData.folga && diaData.entrada) ? {
                            entrada: diaData.entrada || '',
                            inicio_refeicao: diaData.inicio_refeicao || '',
                            termino_refeicao: diaData.termino_refeicao || '',
                            saida: diaData.saida || ''
                        } : null;
                        
                        return {
                            dia: numeroDia,
                            diaSemana: diasSemana[dataCompleta.getDay()],
                            trabalha: !diaData.folga,
                            folga: diaData.folga || false,
                            feriado: diaData.feriado || false,
                            horarios
                        };
                    });

                    return {
                        funcionario: escala.funcionario,
                        empresa: escala.empresa,
                        posto: escala.posto,
                        cargo: escala.cargo,
                        escala: escala.escala,
                        mes: escala.mes,
                        ano: escala.ano,
                        dias
                    };
                });

                setAllSchedules(escalasProcessadas);
                if (escalasProcessadas.length > 0) {
                    setActiveTab(escalasProcessadas[0].funcionario.id);
                } else {
                    setActiveTab('');
                }
            }
        } catch (error) {
            showToast('Erro ao carregar escalas salvas', 'error');
        }
    };

    const handleGeneratorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setGeneratorData(prev => ({ ...prev, [name]: value }));
    };

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month, 0).getDate();
    };

    const getWeekday = (day: number, month: number, year: number) => {
        const date = new Date(year, month - 1, day);
        return diasSemana[date.getDay()];
    };

    // Função para geração local usando as regras
    const interpretarEscalaLocal = async (escala: any, mes: number, ano: number, posto?: any) => {
        const diasNoMes = getDaysInMonth(mes, ano);
        const dias = [];
        
        // ✅ BUSCAR FERIADOS DIRETAMENTE DO BANCO (evitar problemas de cache/timing)
        let feriadosDoMes: any[] = [];
        try {
            const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
            const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(diasNoMes).padStart(2, '0')}`;
            
            const { data: feriadosData, error: feriadosError } = await supabase
                .from('feriados')
                .select('*')
                .gte('data_feriado', dataInicio)
                .lte('data_feriado', dataFim);
            
            if (!feriadosError && feriadosData) {
                // Filtrar feriados pela cidade/estado do posto
                const { filtrarFeriadosPorLocalidade } = await import('../../utils/feriadosFilter');
                feriadosDoMes = filtrarFeriadosPorLocalidade(feriadosData, posto?.cidade, posto?.estado);
            } else {
            }
        } catch (err) {
        }
        
        // ✅ SEMPRE BUSCAR REGRAS VISUAIS PRIMEIRO (prioridade máxima)
        let regrasJSON = null;
        
        // Tentar buscar da tabela regras_escalas SEMPRE
        if (escala?.codigo_escala) {
            try {
                const { data: regraVisual, error } = await supabase
                    .from('regras_escalas')
                    .select('*')
                    .eq('codigo_escala', escala.codigo_escala)
                    .eq('ativa', true)
                    .maybeSingle();
                
                if (error) {
                } else if (regraVisual) {
                    // Converter regra visual para regras_json em tempo real
                    const { converterRegraVisualParaJSON } = await import('../../utils/converterRegraVisualParaJSON');
                    regrasJSON = converterRegraVisualParaJSON(regraVisual);
                } else {
                }
            } catch (err) {
            }
        }
        
        // Fallback: usar regras_json se não encontrou regra visual
        if (!regrasJSON && escala?.regras_json) {
            regrasJSON = escala.regras_json;
        }
        
        // Se ainda não tem regras, não pode gerar escala
        if (!regrasJSON) {
            return [];
        }
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataCompleta = new Date(ano, mes - 1, dia);
            const diaSemana = diasSemana[dataCompleta.getDay()];
            
            // ✅ VERIFICAR FERIADO USANDO A LISTA BUSCADA DO BANCO
            const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const feriado = feriadosDoMes.find(f => f.data_feriado === dataString);
            const ehFeriado = !!feriado;
            
            if (ehFeriado) {
            }
            
            // ✅ USAR INTERPRETADOR DE REGRAS para calcular horários corretos
            const interpretacao = interpretarRegraEscala(regrasJSON, dia, mes, ano, diaSemana, ehFeriado);
            
            // Se não conseguiu interpretar, usar lógica de fallback
            if (!interpretacao) {
                dias.push({
                    dia,
                    diaSemana,
                    trabalha: false,
                    folga: true,
                    feriado: ehFeriado,
                    nomeFeriado: feriado?.nome_feriado || null,
                    horarios: null
                });
                continue;
            }
            
            // Montar objeto de horários
            let horarios = null;
            if (interpretacao.trabalha && !interpretacao.folga) {
                horarios = {
                    entrada: interpretacao.horarios.entrada,
                    inicio_refeicao: interpretacao.horarios.inicio_refeicao,
                    termino_refeicao: interpretacao.horarios.termino_refeicao,
                    saida: interpretacao.horarios.saida
                };
            }
            
            dias.push({
                dia,
                diaSemana,
                trabalha: interpretacao.trabalha,
                folga: interpretacao.folga,
                feriado: ehFeriado,
                nomeFeriado: feriado?.nome_feriado || null,
                horarios
            });
        }
        
        return dias;
    };

    const interpretarEscala = async (escala: any, mes: number, ano: number, funcionario: any) => {
        // Buscar dados relacionados pelos IDs
        const cargo = cargos?.find(c => c.id === funcionario.cargo_id);
        const empresa = empresas?.find(e => e.id === funcionario.empresa_id);
        const posto = postos?.find(p => p.id === funcionario.posto_trabalho_id);

        // Cache key inclui cidade/estado do posto para refletir feriados municipais/estaduais corretos
        const localidadeKey = `${posto?.cidade || ''}_${posto?.estado || ''}`;
        const cacheKey = `${escala.codigo_escala}_${mes}_${ano}_${localidadeKey}`;
        
        let dias: any[] = [];

        // Verificar cache primeiro
        if (escalasCache[cacheKey]) {
            dias = escalasCache[cacheKey];
        } else {
            
            // Usar interpretador baseado em regras JSON
            dias = await interpretarEscalaLocal(escala, mes, ano, posto);
            
            // Armazenar no cache
            setEscalasCache(prev => ({...prev, [cacheKey]: dias}));
        }

        return {
            funcionario,
            escala,
            empresa: empresa || null,
            posto: posto || null,
            cargo: cargo || null,
            mes,
            ano,
            dias
        };
    };

    const handleGenerate = async () => {
        try {
            setIsAnalyzing(true);
            
            const funcionario = funcionarios?.find(f => f.id === generatorData.funcionario_id);
            if (!funcionario) {
                showToast('Selecione um funcionário', 'error');
                return;
            }

            // ✅ VERIFICAR SE FUNCIONÁRIO NÃO ESTÁ DEMITIDO
            if (funcionario.demitido === true) {
                showToast('Não é possível gerar escala para funcionário demitido', 'error');
                return;
            }

            const cargo = cargos?.find(c => c.id === funcionario.cargo_id);
            // Prioridade: codigo_escala do funcionário (override individual) > escala_id do cargo
            let escala = funcionario.codigo_escala
                ? regrasEscalas?.find(e => e.codigo_escala === funcionario.codigo_escala)
                : null;
            if (!escala && cargo?.escala_id) {
                escala = regrasEscalas?.find(e => e.id === cargo.escala_id);
            }
            if (!escala) {
                showToast('Funcionário não possui escala definida', 'error');
                return;
            }


            const schedule = await interpretarEscala(escala, Number(generatorData.mes), Number(generatorData.ano), funcionario);

            // ✅ Atualiza o card de informações (Escala Individual)
            setGeneratedSchedule(schedule);

            // ✅ Atualiza a mesma estrutura usada por "Gerar Todas" para exibir a tabela na página
            setAllSchedules(prev => {
                const next = Array.isArray(prev) ? [...prev] : [];
                const idx = next.findIndex((s: any) => s?.funcionario?.id === schedule.funcionario.id);
                if (idx >= 0) next[idx] = schedule;
                else next.unshift(schedule);
                return next;
            });
            setActiveTab(schedule.funcionario.id);

            // Inicializar dados de edição
            const initialData: {[key: string]: any} = {};
            schedule.dias.forEach((dia: any) => {
                initialData[`dia_${dia.dia}`] = {
                    feriado: dia.feriado,
                    folga: dia.folga,
                    entrada: dia.horarios?.entrada || '',
                    inicio_refeicao: dia.horarios?.inicio_refeicao || '',
                    termino_refeicao: dia.horarios?.termino_refeicao || '',
                    saida: dia.horarios?.saida || ''
                };
            });
            setScheduleData(initialData);
            showToast('Escala gerada com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao gerar escala. Verifique o console para mais detalhes.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateAll = async () => {
        const funcionariosComEscala = funcionarios?.filter(f => {
            if (f.demitido === true) return false;
            if (f.codigo_escala && regrasEscalas?.some(e => e.codigo_escala === f.codigo_escala)) return true;
            const cargo = cargos?.find(c => c.id === f.cargo_id);
            return cargo && cargo.escala_id;
        }) || [];

        if (funcionariosComEscala.length === 0) {
            showToast('Nenhum funcionário ativo possui escala definida', 'error');
            return;
        }


        const schedules = [];
        
        for (const funcionario of funcionariosComEscala) {
            const cargo = cargos?.find(c => c.id === funcionario.cargo_id);
            const escala = (funcionario.codigo_escala
                ? regrasEscalas?.find(e => e.codigo_escala === funcionario.codigo_escala)
                : null) || regrasEscalas?.find(e => e.id === cargo?.escala_id);
            
            
            if (escala) {
                try {
                    const schedule = await interpretarEscala(escala, generatorData.mes, generatorData.ano, funcionario);
                    schedules.push(schedule);
                } catch (error) {
                    showToast(`Erro ao processar ${funcionario.nome_completo}`, 'error');
                }
            } else {
            }
        }

        setAllSchedules(schedules);
        
        if (schedules.length > 0) {
            setActiveTab(schedules[0].funcionario.id);
        }
    };

    const handleClearAll = () => {
        setAllSchedules([]);
        setActiveTab('');
    };

    const handleSaveIndividualEscala = async (schedule: any) => {
        setSubmitting(true);
        try {
            const escalaMensalData = {
                funcionario_id: schedule.funcionario.id,
                mes: schedule.mes,
                ano: schedule.ano,
                escala_id: schedule.escala?.id || null,
                empresa_id: schedule.empresa?.id || null,
                posto_trabalho_id: schedule.posto?.id || null,
                cargo_id: schedule.cargo?.id || null,
                dias_trabalhados: JSON.stringify(schedule.dias.reduce((acc: any, dia: any) => {
                    acc[`dia_${dia.dia}`] = dia;
                    return acc;
                }, {})),
                total_dias_trabalho: schedule.dias.filter((d: any) => d.trabalha).length,
                total_dias_folga: schedule.dias.filter((d: any) => d.folga).length,
                total_feriados: schedule.dias.filter((d: any) => d.feriado).length
            };

            // 🔍 DEBUG: Log dos dados ANTES de salvar

            // UPSERT: Atualiza se existir, insere se não existir
            const { data: savedData, error } = await supabase
                .from('escala_mensal')
                .upsert(escalaMensalData, {
                    onConflict: 'funcionario_id,mes,ano'
                })
                .select();

            // 🔍 DEBUG: Log do resultado APÓS salvar
            if (savedData && savedData.length > 0) {
            }

            if (error) {
                showToast(`❌ ${schedule.funcionario.nome_completo} - Erro: ${error.message}`, 'error');
            } else {
                showToast(`💾 ${schedule.funcionario.nome_completo} - Salva com sucesso!`, 'success');
            }
            
            // Recarregar escalas salvas para atualizar a visualização
            await carregarEscalasSalvas();
        } catch (error) {
            showToast(`❌ Erro ao salvar ${schedule.funcionario.nome_completo}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAllEscalas = async () => {
        if (allSchedules.length === 0) {
            showToast('Nenhuma escala para salvar', 'error');
            return;
        }

        const confirmSave = globalThis.confirm(
            `Deseja salvar ${allSchedules.length} escala(s) mensal(is)?\n\n` +
            `Escalas existentes serão atualizadas.`
        );

        if (!confirmSave) return;

        setSubmitting(true);
        let sucessos = 0;
        let erros = 0;

        try {
            for (const schedule of allSchedules) {
                try {
                    // Preparar dados de cada dia
                    const diasData: {[key: string]: any} = {};
                    schedule.dias.forEach((dia: any) => {
                        diasData[`dia_${dia.dia}`] = {
                            feriado: dia.feriado,
                            folga: dia.folga,
                            entrada: dia.horarios?.entrada || '',
                            inicio_refeicao: dia.horarios?.inicio_refeicao || '',
                            termino_refeicao: dia.horarios?.termino_refeicao || '',
                            saida: dia.horarios?.saida || ''
                        };
                    });

                    // Calcular totais
                    const totalDiasTrabalho = schedule.dias.filter((d: any) => d.trabalha).length;
                    const totalDiasFolga = schedule.dias.filter((d: any) => d.folga).length;
                    const totalFeriados = schedule.dias.filter((d: any) => d.feriado).length;

                    const escalaMensalData = {
                        funcionario_id: schedule.funcionario.id,
                        mes: schedule.mes,
                        ano: schedule.ano,
                        escala_id: schedule.escala?.id || null,
                        empresa_id: schedule.empresa?.id || null,
                        posto_trabalho_id: schedule.posto?.id || null,
                        cargo_id: schedule.cargo?.id || null,
                        dias_trabalhados: JSON.stringify(diasData),
                        total_dias_trabalho: totalDiasTrabalho,
                        total_dias_folga: totalDiasFolga,
                        total_feriados: totalFeriados
                    };

                    // UPSERT: Atualiza se existir, insere se não existir
                    const { error } = await supabase
                        .from('escala_mensal')
                        .upsert(escalaMensalData, {
                            onConflict: 'funcionario_id,mes,ano'
                        });

                    if (error) throw error;

                    sucessos++;
                } catch (error) {
                    erros++;
                }
            }

            showToast(
                `✅ Processo concluído! Sucessos: ${sucessos} | Erros: ${erros} | Total: ${allSchedules.length}`,
                erros > 0 ? 'info' : 'success'
            );
            
            // Recarregar escalas salvas para atualizar a visualização
            await carregarEscalasSalvas();

        } catch (error) {
            showToast('Erro inesperado ao salvar escalas', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleScheduleDataChange = (dia: number, field: string, value: any) => {
        setScheduleData(prev => ({
            ...prev,
            [`dia_${dia}`]: {
                ...prev[`dia_${dia}`],
                [field]: value
            }
        }));
    };

    const handleSaveEscalaMensal = async () => {
        if (!generatedSchedule) return;
        
        setSubmitting(true);
        try {
            // Calcular totais
            const totalDiasTrabalho = generatedSchedule.dias.filter((d: any) => d.trabalha).length;
            const totalDiasFolga = generatedSchedule.dias.filter((d: any) => d.folga).length;
            const totalFeriados = generatedSchedule.dias.filter((d: any) => d.feriado).length;
            
            const escalaMensalData = {
                funcionario_id: generatedSchedule.funcionario.id,
                mes: generatedSchedule.mes,
                ano: generatedSchedule.ano,
                escala_id: generatedSchedule.escala?.id || null,
                empresa_id: generatedSchedule.empresa?.id || null,
                posto_trabalho_id: generatedSchedule.posto?.id || null,
                cargo_id: generatedSchedule.cargo?.id || null,
                dias_trabalhados: JSON.stringify(scheduleData),
                total_dias_trabalho: totalDiasTrabalho,
                total_dias_folga: totalDiasFolga,
                total_feriados: totalFeriados
            };
            
            // 🔍 DEBUG: Log dos dados ANTES de salvar
            
            // Verificar se já existe uma escala para este funcionário/mês/ano
            const { data: existing } = await supabase
                .from('escala_mensal')
                .select('id')
                .eq('funcionario_id', generatedSchedule.funcionario.id)
                .eq('mes', generatedSchedule.mes)
                .eq('ano', generatedSchedule.ano)
                .single();
            
            let result;
            if (existing) {
                // Atualizar existente
                result = await updateEscalaMensal(existing.id, escalaMensalData);
                
                // 🔍 DEBUG: Log do resultado APÓS salvar
                
                if (result.success) {
                    showToast('Escala atualizada com sucesso!', 'success');
                } else {
                    showToast(`Erro ao atualizar: ${result.error}`, 'error');
                }
            } else {
                // Inserir nova
                result = await insertEscalaMensal(escalaMensalData);
                
                // 🔍 DEBUG: Log do resultado APÓS salvar
                
                if (result.success) {
                    showToast('Escala salva com sucesso!', 'success');
                } else {
                    showToast(`Erro ao salvar: ${result.error}`, 'error');
                }
            }
            
            // Recarregar escalas salvas para atualizar a visualização
            await carregarEscalasSalvas();
        } catch (error) {
            showToast('Erro inesperado ao salvar', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Filtrar escalas por postos do cliente
    const escalasFiltradas = isClient && clientPostos.length > 0
        ? allSchedules.filter((s: any) => s.posto?.id && clientPostos.includes(s.posto.id))
        : allSchedules;

    // Função para ordenar as escalas
    const escalasOrdenadas = [...escalasFiltradas].sort((a, b) => {
        switch (ordenacao) {
            case 'nome':
                return (a.funcionario.nome_completo || '').localeCompare(b.funcionario.nome_completo || '');
            case 'empresa':
                const empresaA = a.empresa?.nome_empresa || '';
                const empresaB = b.empresa?.nome_empresa || '';
                return empresaA.localeCompare(empresaB);
            case 'posto':
                const postoA = a.posto?.nome_posto || '';
                const postoB = b.posto?.nome_posto || '';
                return postoA.localeCompare(postoB);
            case 'escala':
                const escalaA = a.escala?.codigo_escala || '';
                const escalaB = b.escala?.codigo_escala || '';
                return escalaA.localeCompare(escalaB);
            default:
                return 0;
        }
    });

    return (
        <div className="space-y-6">
            <ToastContainer />
            <h1 className="text-2xl font-bold">Escalas Mensais e Anuais</h1>

            {isClient && clientPostos.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span>
                        <strong>Visualização restrita</strong> — Exibindo dados dos postos:{' '}
                        {postos
                            ?.filter(p => clientPostos.includes(p.id))
                            .map(p => p.nome_posto)
                            .join(', ') || 'Carregando...'}
                    </span>
                </div>
            )}
            
            {/* Seção: Escala Individual */}
            <Card>
                <h2 className="text-xl font-semibold mb-4">📋 Escala Individual</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Select 
                        label="Funcionário" 
                        name="funcionario_id" 
                        value={generatorData.funcionario_id} 
                        onChange={handleGeneratorChange}
                    >
                        <option value="">Selecione um funcionário</option>
                        {funcionarios
                            ?.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''))
                            ?.map(funcionario => (
                                <option key={funcionario.id} value={funcionario.id}>
                                    {abreviarNome(funcionario.nome_completo)}
                                </option>
                            ))}
                    </Select>
                    
                    <Select 
                        label="Mês" 
                        name="mes" 
                        value={generatorData.mes.toString()} 
                        onChange={handleGeneratorChange}
                    >
                        {meses.map((mes, index) => (
                            <option key={index} value={index + 1}>{mes}</option>
                        ))}
                    </Select>
                    
                    <Select 
                        label="Ano" 
                        name="ano" 
                        value={generatorData.ano.toString()} 
                        onChange={handleGeneratorChange}
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        <Button 
                            onClick={handleGenerate} 
                            disabled={!generatorData.funcionario_id || isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                    Analisando...
                                </>
                            ) : (
                                '📋 Gerar Escala'
                            )}
                        </Button>
                        <Button 
                            onClick={async () => {
                                if (!generatorData.funcionario_id) {
                                    showToast('Selecione um funcionário', 'error');
                                    return;
                                }
                                
                                const funcionario = funcionarios?.find(f => f.id === generatorData.funcionario_id);
                                if (!funcionario) {
                                    showToast('Funcionário não encontrado', 'error');
                                    return;
                                }
                                
                                if (!globalThis.confirm(`Deseja gerar e salvar as escalas dos ÚLTIMOS 12 MESES para ${funcionario.nome_completo}?\n\nIsso pode levar alguns minutos.`)) {
                                    return;
                                }
                                
                                setSubmitting(true);
                                setProgressoGeracao({
                                    ativo: true,
                                    mesAtual: 'Iniciando...',
                                    progresso: 0,
                                    total: 12
                                });
                                
                                try {
                                    const hoje = new Date();
                                    const mesAtual = hoje.getMonth() + 1;
                                    const anoAtual = hoje.getFullYear();
                                    
                                    let totalSucessos = 0;
                                    let totalErros = 0;
                                    
                                    for (let i = 11; i >= 0; i--) {
                                        let mesCalc = mesAtual - i;
                                        let anoCalc = anoAtual;
                                        
                                        while (mesCalc <= 0) {
                                            mesCalc += 12;
                                            anoCalc -= 1;
                                        }
                                        
                                        const mesIndex = 12 - i;
                                        setProgressoGeracao({
                                            ativo: true,
                                            mesAtual: `${meses[mesCalc - 1]}/${anoCalc}`,
                                            progresso: mesIndex,
                                            total: 12
                                        });
                                        
                                        try {
                                            const cargo = cargos?.find(c => c.id === funcionario.cargo_id);
                                            const escala = (funcionario.codigo_escala
                                                ? regrasEscalas?.find(e => e.codigo_escala === funcionario.codigo_escala)
                                                : null) || (cargo?.escala_id ? regrasEscalas?.find(e => e.id === cargo.escala_id) : null);
                                            if (!escala) {
                                                continue;
                                            }
                                            
                                            const schedule = await interpretarEscala(escala, mesCalc, anoCalc, funcionario);
                                            
                                            const diasData: {[key: string]: any} = {};
                                            schedule.dias.forEach((dia: any) => {
                                                diasData[`dia_${dia.dia}`] = {
                                                    feriado: dia.feriado,
                                                    folga: dia.folga,
                                                    entrada: dia.horarios?.entrada || '',
                                                    inicio_refeicao: dia.horarios?.inicio_refeicao || '',
                                                    termino_refeicao: dia.horarios?.termino_refeicao || '',
                                                    saida: dia.horarios?.saida || ''
                                                };
                                            });
                                            
                                            const escalaMensalData = {
                                                funcionario_id: funcionario.id,
                                                mes: mesCalc,
                                                ano: anoCalc,
                                                escala_id: escala.id,
                                                empresa_id: funcionario.empresa_id,
                                                posto_trabalho_id: funcionario.posto_trabalho_id,
                                                cargo_id: funcionario.cargo_id,
                                                dias_trabalhados: JSON.stringify(diasData),
                                                total_dias_trabalho: schedule.dias.filter((d: any) => d.trabalha).length,
                                                total_dias_folga: schedule.dias.filter((d: any) => d.folga).length,
                                                total_feriados: schedule.dias.filter((d: any) => d.feriado).length
                                            };
                                            
                                            const { data: existing } = await supabase
                                                .from('escala_mensal')
                                                .select('id')
                                                .eq('funcionario_id', funcionario.id)
                                                .eq('mes', mesCalc)
                                                .eq('ano', anoCalc)
                                                .maybeSingle();
                                            
                                            if (existing) {
                                                await updateEscalaMensal(existing.id, escalaMensalData);
                                            } else {
                                                await insertEscalaMensal(escalaMensalData);
                                            }
                                            
                                            totalSucessos++;
                                        } catch (error) {
                                            totalErros++;
                                        }
                                    }
                                    
                                    showToast(`✅ Processo concluído!\n\nMeses: 12\nEscalas geradas: ${totalSucessos}\nErros: ${totalErros}`, 'success');
                                    await carregarEscalasSalvas();
                                } catch (error) {
                                    showToast('Erro ao gerar últimos 12 meses', 'error');
                                } finally {
                                    setSubmitting(false);
                                    setProgressoGeracao({
                                        ativo: false,
                                        mesAtual: '',
                                        progresso: 0,
                                        total: 12
                                    });
                                }
                            }}
                            disabled={!generatorData.funcionario_id || submitting || isAnalyzing}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {submitting ? 'Gerando...' : '📅 Gerar Últimos 12 Meses'}
                        </Button>
                        <Button 
                            onClick={() => {
                                setGeneratedSchedule(null);
                                showToast('Escala individual limpa', 'success');
                            }}
                            variant="secondary"
                            disabled={!generatedSchedule}
                        >
                            Limpar Individual
                        </Button>
                        <Button 
                            onClick={async () => {
                                if (!generatedSchedule) {
                                    showToast('Gere uma escala primeiro', 'error');
                                    return;
                                }
                                await handleSaveIndividualEscala(generatedSchedule);
                            }}
                            disabled={!generatedSchedule || submitting}
                        >
                            {submitting ? 'Salvando...' : '💾 Salvar Individual'}
                        </Button>
                        <Button 
                            onClick={async () => {
                                if (!generatorData.funcionario_id) {
                                    showToast('Selecione um funcionário', 'error');
                                    return;
                                }
                                
                                const funcionario = funcionarios?.find(f => f.id === generatorData.funcionario_id);
                                if (!funcionario) {
                                    showToast('Funcionário não encontrado', 'error');
                                    return;
                                }
                                
                                if (!globalThis.confirm(`Tem certeza que deseja excluir a escala de ${funcionario.nome_completo} do mês ${meses[generatorData.mes - 1]}/${generatorData.ano}?`)) {
                                    return;
                                }
                                
                                setSubmitting(true);
                                try {
                                    const { error } = await supabase
                                        .from('escala_mensal')
                                        .delete()
                                        .eq('funcionario_id', funcionario.id)
                                        .eq('mes', generatorData.mes)
                                        .eq('ano', generatorData.ano);
                                    
                                    if (error) throw error;
                                    
                                    showToast('Escala excluída com sucesso!', 'success');
                                    setGeneratedSchedule(null);
                                    await carregarEscalasSalvas();
                                } catch (error) {
                                    showToast(`Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                            disabled={!generatorData.funcionario_id || submitting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {submitting ? 'Excluindo...' : '🗑️ Excluir Individual'}
                        </Button>
                    </div>
                    
                    {progressoGeracao.ativo && (
                        <div className="bg-purple-50 border border-purple-300 rounded px-4 py-3 mt-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-800">
                                    📅 Gerando escalas: {progressoGeracao.mesAtual}
                                </span>
                                <span className="text-sm font-semibold text-purple-700">
                                    {progressoGeracao.progresso}/{progressoGeracao.total}
                                </span>
                            </div>
                            <div className="w-full bg-purple-200 rounded-full h-2.5">
                                <div 
                                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(progressoGeracao.progresso / progressoGeracao.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Seção: Todas as Escalas */}
            <Card className="bg-green-50 border border-green-200">
                <h2 className="text-xl font-semibold mb-4 text-green-800">📚 Todas as Escalas</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <Select 
                        label="Mês" 
                        name="mes" 
                        value={generatorData.mes.toString()} 
                        onChange={handleGeneratorChange}
                    >
                        {meses.map((mes, index) => (
                            <option key={index} value={index + 1}>{mes}</option>
                        ))}
                    </Select>
                    
                    <Select 
                        label="Ano" 
                        name="ano" 
                        value={generatorData.ano.toString()} 
                        onChange={handleGeneratorChange}
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>
                    
                    <Select 
                        label="Escala (Filtro)" 
                        name="escala_id" 
                        value={generatorData.escala_id} 
                        onChange={handleGeneratorChange}
                    >
                        <option value="">Todas as escalas</option>
                        {regrasEscalas
                            ?.sort((a, b) => (a.codigo_escala || '').localeCompare(b.codigo_escala || ''))
                            ?.map(escala => (
                                <option key={escala.id} value={escala.id}>
                                    {escala.codigo_escala} - {escala.nome_escala}
                                </option>
                            ))}
                    </Select>
                </div>
                
                {Object.keys(escalasCache).length > 0 && (
                    <div className="mb-4">
                        <button
                            onClick={() => {
                                setEscalasCache({});
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-700 w-fit"
                            title="Limpar cache de escalas interpretadas"
                        >
                            🗑️ Limpar cache ({Object.keys(escalasCache).length})
                        </button>
                    </div>
                )}
                
                {canShowActions() ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <Button onClick={handleGenerateAll} disabled={isAnalyzing}>
                        {isAnalyzing ? 'Processando...' : '📋 Gerar Todas'}
                    </Button>
                    <Button 
                            onClick={() => setMostrarSeletorPeriodo(!mostrarSeletorPeriodo)}
                            disabled={submitting || isAnalyzing}
                            className="!bg-primary !text-primary-foreground hover:!bg-primary/90"
                        >
                            {submitting ? 'Gerando...' : '📅 Gerar Período'}
                        </Button>
                    <Button onClick={handleClearAll} variant="secondary" disabled={submitting}>
                        Limpar Todas
                    </Button>
                    <Button onClick={handleSaveAllEscalas} disabled={submitting}>
                        {submitting ? 'Salvando...' : `💾 Salvar Todas (${allSchedules.length})`}
                    </Button>
                    <Button 
                        onClick={async () => {
                            if (globalThis.confirm(`Tem certeza que deseja excluir TODAS as escalas mensais de ${meses[generatorData.mes - 1]}/${generatorData.ano}?`)) {
                                setSubmitting(true);
                                try {
                                    const { error } = await supabase
                                        .from('escala_mensal')
                                        .delete()
                                        .eq('mes', generatorData.mes)
                                        .eq('ano', generatorData.ano);
                                    
                                    if (error) throw error;
                                    showToast('Todas as escalas mensais foram excluídas!', 'success');
                                    setAllSchedules([]);
                                    setActiveTab('');
                                } catch (error) {
                                    showToast(`Erro ao excluir escalas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }
                        }}
                        disabled={submitting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        🗑️ Excluir Todas
                    </Button>
                </div>
                ) : (
                    <div className="text-center py-2 text-sm text-gray-500 italic">
                        Modo somente leitura - Ações em lote desabilitadas
                    </div>
                )}
                
                {/* Seletor de Período */}
                {mostrarSeletorPeriodo && (
                    <div className="mt-4">
                        <PeriodSelector
                            loading={submitting}
                            buttonLabel="Gerar Escalas"
                            buttonIcon="📅"
                            onGenerate={async (periods) => {
                                const funcionariosComCargo = funcionarios?.filter(f => !f.demitido && f.cargo_id) || [];
                                if (funcionariosComCargo.length === 0) { showToast('Nenhum funcionário ativo', 'error'); return; }
                                if (!globalThis.confirm(`Gerar escalas de ${periods.length} mês(es) para ${funcionariosComCargo.length} funcionário(s)?`)) return;
                                
                                setSubmitting(true);
                                setProgressoGeracao({ ativo: true, mesAtual: 'Iniciando...', progresso: 0, total: periods.length });
                                let totalSucessos = 0, totalErros = 0, mesIndex = 0;
                                
                                try {
                                    for (const { mes: mesCalc, ano: anoCalc } of periods) {
                                        mesIndex++;
                                        setProgressoGeracao({ ativo: true, mesAtual: formatMonthYear(mesCalc, anoCalc), progresso: mesIndex, total: periods.length });
                                        
                                        for (const funcionario of funcionariosComCargo) {
                                            try {
                                                const cargo = cargos?.find(c => c.id === funcionario.cargo_id);
                                                const escala = (funcionario.codigo_escala
                                                    ? regrasEscalas?.find(e => e.codigo_escala === funcionario.codigo_escala)
                                                    : null) || (cargo?.escala_id ? regrasEscalas?.find(e => e.id === cargo.escala_id) : null);
                                                if (!escala) continue;
                                                
                                                const schedule = await interpretarEscala(escala, mesCalc, anoCalc, funcionario);
                                                const diasData: {[key: string]: any} = {};
                                                schedule.dias.forEach((dia: any) => {
                                                    diasData[`dia_${dia.dia}`] = {
                                                        feriado: dia.feriado, folga: dia.folga,
                                                        entrada: dia.horarios?.entrada || '', inicio_refeicao: dia.horarios?.inicio_refeicao || '',
                                                        termino_refeicao: dia.horarios?.termino_refeicao || '', saida: dia.horarios?.saida || ''
                                                    };
                                                });
                                                
                                                const escalaMensalData = {
                                                    funcionario_id: funcionario.id, mes: mesCalc, ano: anoCalc, escala_id: escala.id,
                                                    empresa_id: funcionario.empresa_id, posto_trabalho_id: funcionario.posto_trabalho_id,
                                                    cargo_id: funcionario.cargo_id, dias_trabalhados: JSON.stringify(diasData),
                                                    total_dias_trabalho: schedule.dias.filter((d: any) => d.trabalha).length,
                                                    total_dias_folga: schedule.dias.filter((d: any) => d.folga).length,
                                                    total_feriados: schedule.dias.filter((d: any) => d.feriado).length
                                                };
                                                
                                                const { data: existing } = await supabase.from('escala_mensal').select('id')
                                                    .eq('funcionario_id', funcionario.id).eq('mes', mesCalc).eq('ano', anoCalc).maybeSingle();
                                                
                                                const result = existing 
                                                    ? await updateEscalaMensal(existing.id, escalaMensalData) 
                                                    : await insertEscalaMensal(escalaMensalData);
                                                if (result?.success) totalSucessos++; else totalErros++;
                                            } catch { totalErros++; }
                                        }
                                    }
                                    showToast(`${periods.length} meses: ${totalSucessos} escalas, ${totalErros} erros`, 'success');
                                    await carregarEscalasSalvas();
                                    setMostrarSeletorPeriodo(false);
                                } finally {
                                    setSubmitting(false);
                                    setProgressoGeracao({ ativo: false, mesAtual: '', progresso: 0, total: 0 });
                                }
                            }}
                        />
                    </div>
                )}
                
                {progressoGeracao.ativo && (
                    <div className="bg-green-50 border border-green-300 rounded px-4 py-3 mt-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-800">
                                📅 Gerando escalas: {progressoGeracao.mesAtual}
                            </span>
                            <span className="text-sm font-semibold text-green-700">
                                {progressoGeracao.progresso}/{progressoGeracao.total}
                            </span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2.5">
                            <div 
                                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(progressoGeracao.progresso / progressoGeracao.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}
                
                {Object.keys(escalasCache).length > 0 && (
                    <div className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200 mt-2">
                        ⚡ {Object.keys(escalasCache).length} escala(s) em cache - próximas gerações serão instantâneas!
                    </div>
                )}
            </Card>

            {/* Container de Informações */}
            {generatedSchedule && (
                <Card className="bg-blue-50 border border-blue-200">
                    <h3 className="text-lg font-semibold mb-3">Informações da Escala</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                        <div><span className="font-semibold">Funcionário:</span> {generatedSchedule.funcionario.nome_completo}</div>
                        <div><span className="font-semibold">Empresa:</span> {generatedSchedule.empresa?.nome_empresa || 'N/A'}</div>
                        <div><span className="font-semibold">Posto:</span> {generatedSchedule.posto?.nome_posto || 'N/A'}</div>
                        <div><span className="font-semibold">Cargo:</span> {generatedSchedule.cargo?.nome_cargo || 'N/A'}</div>
                        <div><span className="font-semibold">Escala:</span> {generatedSchedule.escala?.codigo_escala || 'N/A'}</div>
                        <div><span className="font-semibold">Período:</span> {meses[generatedSchedule.mes - 1]}/{generatedSchedule.ano}</div>
                        <div>
                            <span className="font-semibold">Status:</span>{' '}
                            <span className={`font-semibold ${generatedSchedule.funcionario.ativo !== false ? 'text-green-600' : 'text-red-600'}`}>
                                {generatedSchedule.funcionario.ativo !== false ? '🟢 ATIVO' : '🔴 INATIVO'}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold">Funcionário Registrado:</span>{' '}
                            <span className={`font-semibold ${generatedSchedule.funcionario.funcionario_registrado !== false ? 'text-blue-600' : 'text-orange-600'}`}>
                                {generatedSchedule.funcionario.funcionario_registrado !== false ? '✅ SIM' : '❌ NÃO'}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Todas as Escalas Geradas */}
            {allSchedules.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Todas as Escalas Geradas - {meses[generatorData.mes - 1]}/{generatorData.ano}</h3>
                    
                    {/* Layout com Abas à Esquerda */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Abas dos Funcionários - À Esquerda */}
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
                                        onChange={(e) => setOrdenacao(e.target.value as 'nome' | 'empresa' | 'posto' | 'escala')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="nome">Nome</option>
                                        <option value="empresa">Empresa</option>
                                        <option value="posto">Posto</option>
                                        <option value="escala">Escala</option>
                                    </select>
                                </div>

                                <nav className="space-y-2">
                                    {escalasOrdenadas.map((schedule) => (
                                        <button
                                            key={schedule.funcionario.id}
                                            onClick={() => setActiveTab(schedule.funcionario.id)}
                                            className={`w-full text-left py-3 px-4 border-l-4 font-medium text-sm transition-colors ${
                                                activeTab === schedule.funcionario.id
                                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium">{abreviarNome(schedule.funcionario.nome_completo)}</div>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${schedule.funcionario.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {schedule.funcionario.ativo !== false ? '✓' : '✗'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {ordenacao === 'empresa' && (
                                                    <div className="font-semibold text-blue-600">
                                                        🏢 {schedule.empresa?.nome_empresa || 'Sem empresa'}
                                                    </div>
                                                )}
                                                {ordenacao === 'posto' && (
                                                    <div className="font-semibold text-purple-600">
                                                        📍 {schedule.posto?.nome_posto || 'Sem posto'}
                                                    </div>
                                                )}
                                                {ordenacao === 'escala' && (
                                                    <div className="font-semibold text-green-600">
                                                        📋 {schedule.escala?.codigo_escala || 'Sem escala'}
                                                    </div>
                                                )}
                                                {ordenacao !== 'escala' && schedule.escala && (
                                                    <div className="bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                                                        {schedule.escala.codigo_escala}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Conteúdo da Aba Ativa - À Direita */}
                        <div className="flex-1 min-w-0">
                    {allSchedules.map((schedule) => (
                        activeTab === schedule.funcionario.id && (
                            <div key={schedule.funcionario.id}>
                                {/* Informações do Funcionário */}
                                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-lg font-semibold text-blue-900">
                                            {schedule.funcionario.nome_completo}
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                        <div><span className="font-semibold">Funcionário:</span> {schedule.funcionario.nome_completo}</div>
                                        <div><span className="font-semibold">Empresa:</span> {schedule.empresa?.nome_empresa || 'N/A'}</div>
                                        <div><span className="font-semibold">Posto:</span> {schedule.posto?.nome_posto || 'N/A'}</div>
                                        <div><span className="font-semibold">Cargo:</span> {schedule.cargo?.nome_cargo || 'N/A'}</div>
                                        <div><span className="font-semibold">Escala:</span> {schedule.escala?.codigo_escala || 'N/A'}</div>
                                        <div><span className="font-semibold">Período:</span> {meses[generatorData.mes - 1]}/{generatorData.ano}</div>
                                        <div>
                                            <span className="font-semibold">Status:</span>{' '}
                                            <span className={`font-semibold ${schedule.funcionario.ativo !== false ? 'text-green-600' : 'text-red-600'}`}>
                                                {schedule.funcionario.ativo !== false ? '🟢 ATIVO' : '🔴 INATIVO'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="font-semibold">Funcionário Registrado:</span>{' '}
                                            <span className={`font-semibold ${schedule.funcionario.funcionario_registrado !== false ? 'text-blue-600' : 'text-orange-600'}`}>
                                                {schedule.funcionario.funcionario_registrado !== false ? '✅ SIM' : '❌ NÃO'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela da Escala */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dia</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sem.</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entrada</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Início Refeição</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Término Refeição</th>
                                                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saída</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {schedule.dias.map((dia: any) => (
                                                <tr key={dia.dia} className={
                                                    dia.feriado ? 'bg-red-50' : 
                                                    dia.folga ? 'bg-gray-50' : 
                                                    'hover:bg-gray-50'
                                                }>
                                                    <td className="px-1 py-2 text-center font-semibold">{String(dia.dia).padStart(2, '0')}</td>
                                                    <td className="px-1 py-2 text-center">{dia.diaSemana}</td>
                                                    <td className="px-1 py-2 text-center">
                                                        {dia.feriado ? (
                                                            <span className="text-red-600 font-medium">Feriado</span>
                                                        ) : dia.folga ? (
                                                            <span className="text-gray-600">Folga</span>
                                                        ) : (
                                                            <span className="text-green-600">Trabalha</span>
                                                        )}
                                                        {dia.nomeFeriado && (
                                                            <div className="text-xs text-red-500">{dia.nomeFeriado}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-1 py-2 text-center">{dia.horarios?.entrada || '-'}</td>
                                                    <td className="px-1 py-2 text-center">{dia.horarios?.inicio_refeicao || '-'}</td>
                                                    <td className="px-1 py-2 text-center">{dia.horarios?.termino_refeicao || '-'}</td>
                                                    <td className="px-1 py-2 text-center">{dia.horarios?.saida || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Resumo da Escala */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded">
                                    <div>
                                        <span className="font-semibold">Dias de Trabalho:</span> {schedule.dias.filter((d: any) => d.trabalha).length}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Dias de Folga:</span> {schedule.dias.filter((d: any) => d.folga).length}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Feriados:</span> {schedule.dias.filter((d: any) => d.feriado).length}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Sábados Trabalhados:</span> {schedule.dias.filter((d: any) => d.diaSemana === 'Sáb' && d.trabalha).length}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Sábados Não Trabalhados:</span> {schedule.dias.filter((d: any) => d.diaSemana === 'Sáb' && !d.trabalha).length}
                                    </div>
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

export default MonthlyYearlySchedule;