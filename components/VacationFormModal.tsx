import React, { useState, useEffect, useMemo } from 'react';
import Button from './ui/Button';
import { X, Calculator, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { calcularINSS, calcularIRRF } from '../utils/calcularFolhaPagamento';
import type { ParametrosCalculo } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface Funcionario {
    id: string;
    nome_completo: string;
    data_admissao: string;
    nome_empresa?: string;
    nome_cargo?: string;
    cargo_id?: string;
}

interface Cargo {
    id: string;
    nome_cargo: string;
    salario_base: number;
}

interface FeriasExistente {
    id?: string;
    funcionario_id: string;
    periodo_aquisitivo: number;
    data_inicio_aquisitivo?: string;
    data_fim_aquisitivo?: string;
    data_limite_concessivo?: string;
    status?: string;
    data_inicio_gozo?: string | null;
    data_fim_gozo?: string | null;
    dias_gozados?: number;
    fracionamento?: number;
    total_fracoes?: number;
    salario_base_calculo?: number;
    valor_ferias?: number;
    valor_terco?: number;
    valor_total?: number;
    dias_abono?: number;
    valor_abono?: number;
    observacoes?: string | null;
}

interface FolhaCalculada {
    mes: number;
    ano: number;
    salario_base: number;
    horas_extras_50: number;
    horas_extras_100: number;
    intrajornada_50: number;
    intrajornada_100: number;
    adicional_noturno: number;
    adicional_insalubridade: number;
    adicional_acumulo_funcao: number;
    dsr_horas_extras: number;
    dsr_adicional_noturno: number;
    folga_trabalhada: number;
    desconto_faltas: number;
    desconto_rondas_nao_realizadas: number;
}

interface FolhaPonto {
    mes: number;
    ano: number;
    total_faltas_injustificadas: number;
}

// Tabela CLT Art. 130 - Redução de férias por faltas injustificadas
const calcularDiasDireitoFerias = (faltasInjustificadas: number): number => {
    if (faltasInjustificadas <= 5) return 30;
    if (faltasInjustificadas <= 14) return 24;
    if (faltasInjustificadas <= 23) return 18;
    if (faltasInjustificadas <= 32) return 12;
    return 0; // Perde o direito às férias
};

interface VacationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    funcionarioId: string;
    periodoAquisitivo: number;
    funcionarios: Funcionario[];
    cargos: Cargo[];
    feriasExistente?: FeriasExistente | null;
}

// Usando ParametrosCalculo importado de lib/supabase

// Função para calcular INSS com parâmetros configuráveis
const calcularINSSComParametros = (baseCalculo: number, parametros: ParametrosCalculo | null): number => {
    if (!parametros) return 0;
    return calcularINSS(baseCalculo, parametros);
};

// Função para calcular IRRF com parâmetros configuráveis
const calcularIRRFComParametros = (baseCalculo: number, parametros: ParametrosCalculo | null): number => {
    if (!parametros) return 0;
    return calcularIRRF(baseCalculo, 0, parametros); // INSS is usually 0 here if already deducted from base
};

const VacationFormModal: React.FC<VacationFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    funcionarioId,
    periodoAquisitivo,
    funcionarios,
    cargos,
    feriasExistente
}) => {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [loadingFolhas, setLoadingFolhas] = useState(true);
    const [folhasPeriodo, setFolhasPeriodo] = useState<FolhaCalculada[]>([]);
    const [folhasPonto, setFolhasPonto] = useState<FolhaPonto[]>([]);
    const [totalFaltasInjustificadas, setTotalFaltasInjustificadas] = useState(0);
    const [diasDireitoFerias, setDiasDireitoFerias] = useState(30);
    const [parametrosCalculo, setParametrosCalculo] = useState<ParametrosCalculo | null>(null);

    // Buscar parâmetros de cálculo
    useEffect(() => {
        const buscarParametros = async () => {
            try {
                const anoAtual = new Date().getFullYear();
                const { data, error } = await supabase
                    .from('parametros_calculo')
                    .select('*')
                    .eq('ativo', true)
                    .eq('ano_vigencia', anoAtual)
                    .single();

                if (error) {
                    return;
                }

                if (data) {
                    setParametrosCalculo(data as any);
                }
            } catch (error) {
            }
        };

        buscarParametros();
    }, []);

    // Encontrar funcionário
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    const cargo = cargos.find(c => c.id === funcionario?.cargo_id);

    // Calcular datas do período aquisitivo
    const datasCalculadas = useMemo(() => {
        if (!funcionario?.data_admissao) return null;

        const dataAdmissao = new Date(funcionario.data_admissao + 'T00:00:00');
        
        const dataInicio = new Date(dataAdmissao);
        dataInicio.setFullYear(dataAdmissao.getFullYear() + (periodoAquisitivo - 1));

        const dataFim = new Date(dataAdmissao);
        dataFim.setFullYear(dataAdmissao.getFullYear() + periodoAquisitivo);
        dataFim.setDate(dataFim.getDate() - 1);

        const dataLimite = new Date(dataFim);
        dataLimite.setFullYear(dataLimite.getFullYear() + 1);

        return {
            inicio: dataInicio,
            fim: dataFim,
            limite: dataLimite
        };
    }, [funcionario, periodoAquisitivo]);

    // Buscar folhas calculadas e folhas de ponto do período aquisitivo
    useEffect(() => {
        const buscarDadosPeriodo = async () => {
            if (!funcionarioId || !datasCalculadas) return;

            try {
                setLoadingFolhas(true);


                // Buscar folhas calculadas e folhas de ponto em paralelo
                const [folhasCalcResult, folhasPontoResult] = await Promise.all([
                    supabase
                        .from('folha_calculada')
                        .select(`
                            mes, ano, salario_base, 
                            horas_extras_50, horas_extras_100,
                            intrajornada_50, intrajornada_100,
                            adicional_noturno, adicional_insalubridade, adicional_acumulo_funcao,
                            dsr_horas_extras, dsr_adicional_noturno, folga_trabalhada,
                            desconto_faltas, desconto_rondas_nao_realizadas
                        `)
                        .eq('funcionario_id', funcionarioId)
                        .order('ano', { ascending: true })
                        .order('mes', { ascending: true }),
                    supabase
                        .from('folhas_ponto')
                        .select('mes, ano, total_faltas_injustificadas')
                        .eq('funcionario_id', funcionarioId)
                        .order('ano', { ascending: true })
                        .order('mes', { ascending: true })
                ]);

                if (folhasCalcResult.error) throw folhasCalcResult.error;
                if (folhasPontoResult.error) throw folhasPontoResult.error;

                // Filtrar folhas dentro do período aquisitivo
                const folhasCalcFiltradas = (folhasCalcResult.data || []).filter(f => {
                    const dataFolha = new Date(f.ano, f.mes - 1, 1);
                    return dataFolha >= datasCalculadas.inicio && dataFolha <= datasCalculadas.fim;
                });

                const folhasPontoFiltradas = (folhasPontoResult.data || []).filter(f => {
                    const dataFolha = new Date(f.ano, f.mes - 1, 1);
                    return dataFolha >= datasCalculadas.inicio && dataFolha <= datasCalculadas.fim;
                });

                // Calcular total de faltas injustificadas no período
                const totalFaltas = folhasPontoFiltradas.reduce(
                    (acc, fp) => acc + (fp.total_faltas_injustificadas || 0), 
                    0
                );

                // Calcular dias de direito a férias conforme CLT Art. 130
                const diasDireito = calcularDiasDireitoFerias(totalFaltas);


                setFolhasPeriodo(folhasCalcFiltradas);
                setFolhasPonto(folhasPontoFiltradas);
                setTotalFaltasInjustificadas(totalFaltas);
                setDiasDireitoFerias(diasDireito);
            } catch (error) {
                showToast('Erro ao carregar dados do período', 'error');
            } finally {
                setLoadingFolhas(false);
            }
        };

        buscarDadosPeriodo();
    }, [funcionarioId, datasCalculadas]);

    // Estado do formulário
    const [formData, setFormData] = useState({
        status: 'programada' as 'pendente' | 'programada' | 'em_andamento' | 'gozada' | 'vencida',
        data_inicio_gozo: '',
        dias_gozados: 30,
        dias_abono: 0,
        fracionamento: 1,
        total_fracoes: 1,
        observacoes: ''
    });

    // Inicializar com dados existentes
    useEffect(() => {
        if (feriasExistente) {
            setFormData({
                status: (feriasExistente.status as any) || 'programada',
                data_inicio_gozo: feriasExistente.data_inicio_gozo || '',
                dias_gozados: feriasExistente.dias_gozados || diasDireitoFerias,
                dias_abono: feriasExistente.dias_abono || 0,
                fracionamento: feriasExistente.fracionamento || 1,
                total_fracoes: feriasExistente.total_fracoes || 1,
                observacoes: feriasExistente.observacoes || ''
            });
        } else {
            // Novo registro: ajustar dias_gozados ao máximo permitido
            setFormData(prev => ({
                ...prev,
                dias_gozados: Math.min(prev.dias_gozados, diasDireitoFerias)
            }));
        }
    }, [feriasExistente, diasDireitoFerias]);

    // Calcular data fim do gozo
    const dataFimGozo = useMemo(() => {
        if (!formData.data_inicio_gozo || formData.dias_gozados <= 0) return null;
        const inicio = new Date(formData.data_inicio_gozo + 'T00:00:00');
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + formData.dias_gozados - 1);
        return fim;
    }, [formData.data_inicio_gozo, formData.dias_gozados]);

    // Calcular médias do período aquisitivo e valores de férias
    const valores = useMemo(() => {
        const diasGozo = formData.dias_gozados;
        const diasAbono = formData.dias_abono;

        // Se não tem folhas no período, usar salário base do cargo
        if (folhasPeriodo.length === 0) {
            const salarioBase = cargo?.salario_base || 0;
            const valorDia = salarioBase / 30;
            const valorFerias = valorDia * diasGozo;
            const valorTerco = valorFerias / 3;
            const baseINSS = valorFerias + valorTerco;
            const inssFerias = calcularINSSComParametros(baseINSS, parametrosCalculo);
            
            // IRRF: base = férias (sem 1/3) - INSS proporcional às férias
            const inssProporcionalFerias = calcularINSSComParametros(valorFerias, parametrosCalculo);
            const baseIRRF = valorFerias - inssProporcionalFerias;
            const irrfFerias = calcularIRRFComParametros(baseIRRF, parametrosCalculo);
            
            const valorAbono = valorDia * diasAbono;
            const tercoAbono = valorAbono / 3;
            const valorAbonomTotal = valorAbono + tercoAbono;
            const valorTotal = valorFerias + valorTerco + valorAbonomTotal - inssFerias - irrfFerias;

            return {
                mesesEncontrados: 0,
                mediaSalarioBase: salarioBase,
                mediaInsalubridade: 0,
                mediaAcumuloFuncao: 0,
                mediaHorasExtras: 0,
                mediaDSR: 0,
                baseMediaFerias: salarioBase,
                valorFerias,
                valorTerco,
                inssFerias,
                baseIRRF,
                irrfFerias,
                valorAbono: valorAbonomTotal,
                valorTotal,
                detalhamento: null
            };
        }

        // CÁLCULO CORRETO DE FÉRIAS:
        // Base: Salário Base + Adicional Insalubridade + Acúmulo de Função + Média de HE (com DSR)
        
        let somaSalarioBase = 0;
        let somaInsalubridade = 0;
        let somaAcumuloFuncao = 0;
        let somaHorasExtras = 0;  // HE 50% + HE 100% + Intrajornada
        let somaDSR = 0;          // DSR sobre HE e adicional noturno

        for (const folha of folhasPeriodo) {
            // Componentes fixos (proporcional ao mês)
            somaSalarioBase += (folha.salario_base || 0);
            somaInsalubridade += (folha.adicional_insalubridade || 0);
            somaAcumuloFuncao += (folha.adicional_acumulo_funcao || 0);
            
            // Componentes variáveis (horas extras)
            const heTotal = 
                (folha.horas_extras_50 || 0) +
                (folha.horas_extras_100 || 0) +
                (folha.intrajornada_50 || 0) +
                (folha.intrajornada_100 || 0) +
                (folha.folga_trabalhada || 0);
            somaHorasExtras += heTotal;

            // DSR sobre variáveis
            const dsrTotal = (folha.dsr_horas_extras || 0) + (folha.dsr_adicional_noturno || 0);
            somaDSR += dsrTotal;
        }

        const qtdMeses = folhasPeriodo.length;
        
        // Médias
        const mediaSalarioBase = somaSalarioBase / qtdMeses;
        const mediaInsalubridade = somaInsalubridade / qtdMeses;
        const mediaAcumuloFuncao = somaAcumuloFuncao / qtdMeses;
        const mediaHorasExtras = somaHorasExtras / qtdMeses;
        const mediaDSR = somaDSR / qtdMeses;

        // Base média para férias = Salário Base + Insalubridade + Acúmulo + Média HE + Média DSR
        const baseMediaFerias = mediaSalarioBase + mediaInsalubridade + mediaAcumuloFuncao + mediaHorasExtras + mediaDSR;

        // Valor por dia de férias (base média / 30)
        const valorDia = baseMediaFerias / 30;

        // Valor das férias proporcionais aos dias
        const valorFerias = valorDia * diasGozo;

        // 1/3 constitucional
        const valorTerco = valorFerias / 3;

        // Base para INSS sobre férias = férias + 1/3
        const baseINSS = valorFerias + valorTerco;

        // INSS sobre férias
        const inssFerias = calcularINSSComParametros(baseINSS, parametrosCalculo);

        // IRRF: Base = Férias (sem 1/3) - INSS proporcional às férias
        const inssProporcionalFerias = calcularINSSComParametros(valorFerias, parametrosCalculo);
        const baseIRRF = valorFerias - inssProporcionalFerias;
        const irrfFerias = calcularIRRFComParametros(baseIRRF, parametrosCalculo);

        // Abono pecuniário (venda de dias) - também recebe 1/3
        const valorAbono = valorDia * diasAbono;
        const tercoAbono = valorAbono / 3;
        const valorAbonomTotal = valorAbono + tercoAbono;

        // Total líquido = Férias + 1/3 + Abono - INSS - IRRF
        const valorTotal = valorFerias + valorTerco + valorAbonomTotal - inssFerias - irrfFerias;

        return {
            mesesEncontrados: qtdMeses,
            mediaSalarioBase,
            mediaInsalubridade,
            mediaAcumuloFuncao,
            mediaHorasExtras,
            mediaDSR,
            baseMediaFerias,
            valorFerias,
            valorTerco,
            inssFerias,
            baseIRRF,
            irrfFerias,
            valorAbono: valorAbonomTotal,
            valorTotal,
            detalhamento: {
                somaSalarioBase,
                somaInsalubridade,
                somaAcumuloFuncao,
                somaHorasExtras,
                somaDSR,
                qtdMeses
            }
        };
    }, [cargo, folhasPeriodo, formData.dias_gozados, formData.dias_abono, parametrosCalculo]);

    const handleSave = async () => {
        if (!formData.data_inicio_gozo && !['pendente', 'solicitado'].includes(formData.status)) {
            showToast('Informe a data de início do gozo', 'error');
            return;
        }

        if (formData.dias_gozados < 14 && formData.total_fracoes === 1) {
            showToast('O período mínimo de férias é 14 dias (exceto se fracionado)', 'error');
            return;
        }

        if (formData.dias_abono > 10) {
            showToast('O abono pecuniário é limitado a 10 dias', 'error');
            return;
        }

        if (formData.dias_gozados + formData.dias_abono > 30) {
            showToast('A soma de dias de gozo e abono não pode ultrapassar 30 dias', 'error');
            return;
        }

        try {
            setSaving(true);

            const feriasData = {
                funcionario_id: funcionarioId,
                periodo_aquisitivo: periodoAquisitivo,
                data_inicio_aquisitivo: datasCalculadas?.inicio.toISOString().split('T')[0],
                data_fim_aquisitivo: datasCalculadas?.fim.toISOString().split('T')[0],
                data_limite_concessivo: datasCalculadas?.limite.toISOString().split('T')[0],
                status: (() => {
                    // Se não tem data de início, respeitar o status escolhido manualmente
                    if (!formData.data_inicio_gozo) return formData.status;
                    // Calcular status correto baseado nas datas reais
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const inicio = new Date(formData.data_inicio_gozo + 'T00:00:00');
                    const fim = dataFimGozo;
                    if (fim && fim < hoje) return 'gozada';
                    if (inicio <= hoje) return 'em_andamento';
                    return 'programada';
                })(),
                data_inicio_gozo: formData.data_inicio_gozo,
                data_fim_gozo: dataFimGozo?.toISOString().split('T')[0],
                dias_gozados: formData.dias_gozados,
                fracionamento: formData.fracionamento,
                total_fracoes: formData.total_fracoes,
                salario_base_calculo: valores.baseMediaFerias,
                valor_ferias: valores.valorFerias,
                valor_terco: valores.valorTerco,
                valor_total: valores.valorTotal,
                dias_abono: formData.dias_abono,
                valor_abono: valores.valorAbono,
                observacoes: formData.observacoes || null
            };

            if (feriasExistente?.id) {
                const { error } = await supabase
                    .from('ferias')
                    .update(feriasData)
                    .eq('id', feriasExistente.id);

                if (error) throw error;
                showToast('Férias atualizadas com sucesso!', 'success');
            } else {
                const { error } = await supabase
                    .from('ferias')
                    .insert(feriasData);

                if (error) throw error;
                showToast('Férias programadas com sucesso!', 'success');
            }

            onSave();
        } catch (error) {
            showToast('Erro ao salvar férias', 'error');
        } finally {
            setSaving(false);
        }
    };

    const formatarData = (data: Date | null) => {
        if (!data) return '-';
        return data.toLocaleDateString('pt-BR');
    };

    const formatarMoeda = (valor: number) => {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    if (!isOpen || !funcionario) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {feriasExistente?.id ? 'Editar Férias' : 'Programar Férias'}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {funcionario.nome_completo} • {periodoAquisitivo}º Período
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* Info do Período */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Período Aquisitivo
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-blue-600">Início</p>
                                <p className="font-semibold text-blue-900">
                                    {formatarData(datasCalculadas?.inicio || null)}
                                </p>
                            </div>
                            <div>
                                <p className="text-blue-600">Fim</p>
                                <p className="font-semibold text-blue-900">
                                    {formatarData(datasCalculadas?.fim || null)}
                                </p>
                            </div>
                            <div>
                                <p className="text-blue-600">Limite para Gozo</p>
                                <p className="font-semibold text-blue-900">
                                    {formatarData(datasCalculadas?.limite || null)}
                                </p>
                            </div>
                            <div>
                                <p className="text-blue-600">Faltas Injustificadas</p>
                                <p className={`font-semibold ${totalFaltasInjustificadas > 5 ? 'text-red-600' : 'text-blue-900'}`}>
                                    {totalFaltasInjustificadas} dia(s)
                                </p>
                            </div>
                        </div>
                        
                        {/* Alerta de redução de férias por faltas */}
                        {diasDireitoFerias < 30 && (
                            <div className={`mt-3 p-2 rounded text-sm ${diasDireitoFerias === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                {diasDireitoFerias === 0 ? (
                                    <strong>⚠️ Funcionário perdeu o direito às férias (mais de 32 faltas injustificadas no período - CLT Art. 130)</strong>
                                ) : (
                                    <>
                                        <strong>⚠️ Redução de férias por faltas (CLT Art. 130):</strong> O funcionário tem direito a apenas {diasDireitoFerias} dias de férias 
                                        (ao invés de 30) devido às {totalFaltasInjustificadas} faltas injustificadas no período.
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Média Salarial do Período */}
                    {loadingFolhas ? (
                        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                            <span className="text-gray-600">Calculando médias do período...</span>
                        </div>
                    ) : (
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Base de Cálculo (Médias do Período Aquisitivo)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-purple-600">Meses Encontrados</p>
                                    <p className="font-semibold text-purple-900">
                                        {valores.mesesEncontrados} de 12
                                    </p>
                                </div>
                                <div>
                                    <p className="text-purple-600">Média Salário Base</p>
                                    <p className="font-semibold text-purple-900">
                                        {formatarMoeda(valores.mediaSalarioBase || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-purple-600">Média Insalub./Acúmulo</p>
                                    <p className="font-semibold text-purple-900">
                                        {formatarMoeda((valores.mediaInsalubridade || 0) + (valores.mediaAcumuloFuncao || 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-purple-600">Média Horas Extras</p>
                                    <p className="font-semibold text-purple-900">
                                        {formatarMoeda(valores.mediaHorasExtras || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-purple-600">Média DSRs</p>
                                    <p className="font-semibold text-purple-900">
                                        {formatarMoeda(valores.mediaDSR)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-purple-600">Base Férias</p>
                                    <p className="font-bold text-purple-900">
                                        {formatarMoeda(valores.baseMediaFerias)}
                                    </p>
                                </div>
                            </div>
                            {valores.mesesEncontrados === 0 && (
                                <p className="text-xs text-purple-600 mt-2">
                                    ⚠️ Sem folhas no período - usando salário base do cargo
                                </p>
                            )}
                            {valores.mesesEncontrados > 0 && valores.mesesEncontrados < 12 && (
                                <p className="text-xs text-purple-600 mt-2">
                                    ⚠️ Período incompleto - média calculada com {valores.mesesEncontrados} meses
                                </p>
                            )}
                            <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
                                <strong>Fórmula:</strong> Salário Base + Insalubridade + Acúmulo de Função + Média HE (50%+100%+Intrajornada) + Média DSR
                            </div>
                        </div>
                    )}

                    {/* Formulário */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pendente">Pendente</option>
                                <option value="solicitado">Em análise</option>
                                <option value="programada">Programada</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="gozada">Gozada</option>
                            </select>
                        </div>

                        {/* Data Início */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Início do Gozo *
                            </label>
                            <input
                                type="date"
                                value={formData.data_inicio_gozo}
                                onChange={(e) => setFormData(prev => ({ ...prev, data_inicio_gozo: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                lang="pt-BR"
                            />
                            {formData.data_inicio_gozo && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(formData.data_inicio_gozo + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </p>
                            )}
                        </div>

                        {/* Dias de Gozo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dias de Gozo {diasDireitoFerias < 30 && <span className="text-amber-600">(Máx: {diasDireitoFerias})</span>}
                            </label>
                            <input
                                type="number"
                                min={diasDireitoFerias === 0 ? 0 : 5}
                                max={diasDireitoFerias}
                                value={formData.dias_gozados}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    dias_gozados: Math.min(diasDireitoFerias, Math.max(diasDireitoFerias === 0 ? 0 : 5, parseInt(e.target.value) || 0))
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={diasDireitoFerias === 0}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Data fim: {dataFimGozo ? formatarData(dataFimGozo) : '-'}
                            </p>
                        </div>

                        {/* Abono Pecuniário */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Abono Pecuniário (venda de dias)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={10}
                                value={formData.dias_abono}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    dias_abono: Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Máximo: 10 dias (1/3 do período)
                            </p>
                        </div>

                        {/* Fracionamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fração
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    max={3}
                                    value={formData.fracionamento}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        fracionamento: Math.min(3, Math.max(1, parseInt(e.target.value) || 1))
                                    }))}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="flex items-center text-gray-500">de</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={3}
                                    value={formData.total_fracoes}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        total_fracoes: Math.min(3, Math.max(1, parseInt(e.target.value) || 1))
                                    }))}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Férias podem ser divididas em até 3 períodos
                            </p>
                        </div>

                        {/* Observações */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações
                            </label>
                            <textarea
                                value={formData.observacoes}
                                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Observações adicionais..."
                            />
                        </div>
                    </div>

                    {/* Cálculo de Valores */}
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Cálculo de Valores
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-green-600">Férias ({formData.dias_gozados} dias)</p>
                                <p className="font-semibold text-green-900">
                                    {formatarMoeda(valores.valorFerias)}
                                </p>
                            </div>
                            <div>
                                <p className="text-green-600">1/3 Constitucional</p>
                                <p className="font-semibold text-green-900">
                                    {formatarMoeda(valores.valorTerco)}
                                </p>
                            </div>
                            <div>
                                <p className="text-green-600">(-) INSS sobre Férias</p>
                                <p className="font-semibold text-red-600">
                                    - {formatarMoeda(valores.inssFerias)}
                                </p>
                            </div>
                            {valores.irrfFerias > 0 && (
                                <div>
                                    <p className="text-green-600">(-) IRRF sobre Férias</p>
                                    <p className="font-semibold text-red-600">
                                        - {formatarMoeda(valores.irrfFerias)}
                                    </p>
                                </div>
                            )}
                            {formData.dias_abono > 0 && (
                                <div>
                                    <p className="text-green-600">Abono ({formData.dias_abono} dias + 1/3)</p>
                                    <p className="font-semibold text-green-900">
                                        {formatarMoeda(valores.valorAbono)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-green-200">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-900">TOTAL LÍQUIDO A PAGAR</span>
                                <span className="text-xl font-bold text-green-700">
                                    {formatarMoeda(valores.valorTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Fórmula explicativa */}
                        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                            <strong>Fórmula:</strong> Férias + 1/3 + Abono - INSS - IRRF (IRRF: base = férias sem 1/3 - INSS, isento para bruto até R$ 5.000,00)
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving || loadingFolhas}>
                        {saving ? 'Salvando...' : feriasExistente?.id ? 'Atualizar' : 'Programar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VacationFormModal;
