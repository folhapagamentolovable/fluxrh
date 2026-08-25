import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useParametrosCalculo } from '../../hooks/useSupabase';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { Copy, Plus, Calendar, ArrowLeftRight, X } from 'lucide-react';

const SupportTables: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { data: parametros, loading, error, insert, update, refetch } = useParametrosCalculo();
    const [anoSelecionado, setAnoSelecionado] = React.useState<number>(new Date().getFullYear());
    const [anosDisponiveis, setAnosDisponiveis] = React.useState<number[]>([]);
    const [copiando, setCopiando] = React.useState(false);
    const [modoComparacao, setModoComparacao] = React.useState(false);
    const [anoComparacao, setAnoComparacao] = React.useState<number | null>(null);
    
    const [formData, setFormData] = React.useState({
        salario_minimo: '',
        isencao_irpf: '',
        salario_familia: '',
        vale_transporte: '',
        vale_transporte_faixa2: '',
        vale_alimentacao: '',
        cesta_basica: '',
        plr_base: '',
        plr_desconto_falta_justificada: '',
        plr_desconto_falta_injustificada: '',
        plr_desconto_advertencia: '',
        plr_desconto_suspensao: '',
        plr_dias_minimos_mes: '',
        plr_taxa_negociacao: '',
        premio_permanencia_base: '',
        percentual_fgts: '',
        percentual_insalubridade: '',
        percentual_acumulo_funcao: '',
        percentual_desconto_vt: '',
        desconto_seguro_vida: '',
        inss_faixa1_limite: '',
        inss_faixa1_aliquota: '',
        inss_faixa1_deducao: '',
        inss_faixa2_limite: '',
        inss_faixa2_aliquota: '',
        inss_faixa2_deducao: '',
        inss_faixa3_limite: '',
        inss_faixa3_aliquota: '',
        inss_faixa3_deducao: '',
        inss_faixa4_limite: '',
        inss_faixa4_aliquota: '',
        inss_faixa4_deducao: '',
        irrf_faixa1_limite: '',
        irrf_faixa1_aliquota: '',
        irrf_faixa1_deducao: '',
        irrf_faixa2_limite: '',
        irrf_faixa2_aliquota: '',
        irrf_faixa2_deducao: '',
        irrf_faixa3_limite: '',
        irrf_faixa3_aliquota: '',
        irrf_faixa3_deducao: '',
        irrf_faixa4_limite: '',
        irrf_faixa4_aliquota: '',
        irrf_faixa4_deducao: '',
        irrf_faixa5_limite: '',
        irrf_faixa5_aliquota: '',
        irrf_faixa5_deducao: '',
        percentual_inss_patronal: '',
        desconto_plr: '',
        convenio_odontologico: '',
        contribuicao_assistencial: '',
        percentual_adiantamento_quinzenal: '',
        ft_diaria_vigia: '',
        ft_diaria_aux_limpeza: '',
        ft_diaria_zelador: ''
    });
    const [submitting, setSubmitting] = React.useState(false);

    const fields = [
        { label: "💰 Salário Mínimo Nacional", name: "salario_minimo", type: "number", placeholder: "1412.00", section: "Valores Base" },
        { label: "📊 Faixa Isenção IRPF", name: "isencao_irpf", type: "number", placeholder: "2259.20", section: "Valores Base" },
        { label: "Salário Família (por filho)", name: "salario_familia", type: "number", placeholder: "65.00", section: "Benefícios", help: "R$ 65,00 por filho < 14 anos (se salário bruto <= R$ 1.906,04)" },
        { label: "Vale Transporte (Campinas)", name: "vale_transporte", type: "number", placeholder: "6.20", section: "Benefícios", help: "Valor padrão do VT para funcionários do município local" },
        { label: "Vale Transporte (Valinhos)", name: "vale_transporte_faixa2", type: "number", placeholder: "9.30", section: "Benefícios", help: "Valor do VT para funcionários de outro município" },
        { label: "Vale Alimentação", name: "vale_alimentacao", type: "number", placeholder: "24.50", section: "Benefícios" },
        { label: "Cesta Básica", name: "cesta_basica", type: "number", placeholder: "193.80", section: "Benefícios" },
        { label: "PLR Base", name: "plr_base", type: "number", placeholder: "306.86", section: "Benefícios" },
        { label: "PLR - Desc. Falta Justificada (%)", name: "plr_desconto_falta_justificada", type: "number", placeholder: "20", section: "Benefícios" },
        { label: "PLR - Desc. Falta Injustificada (%)", name: "plr_desconto_falta_injustificada", type: "number", placeholder: "25", section: "Benefícios" },
        { label: "PLR - Desc. Advertência (%)", name: "plr_desconto_advertencia", type: "number", placeholder: "20", section: "Benefícios" },
        { label: "PLR - Desc. Suspensão (%)", name: "plr_desconto_suspensao", type: "number", placeholder: "25", section: "Benefícios" },
        { label: "PLR - Dias mínimos por mês", name: "plr_dias_minimos_mes", type: "number", placeholder: "15", section: "Benefícios" },
        { label: "PLR - Taxa Negociação (R$)", name: "plr_taxa_negociacao", type: "number", placeholder: "12.00", section: "Benefícios" },
        { label: "Prêmio de Permanência Base", name: "premio_permanencia_base", type: "number", placeholder: "100.00", section: "Benefícios" },
        { label: "FGTS (%)", name: "percentual_fgts", type: "number", placeholder: "8.00", section: "Percentuais" },
        { label: "Adicional Insalubridade (%)", name: "percentual_insalubridade", type: "number", placeholder: "40.00", section: "Percentuais" },
        { label: "Adicional Acúmulo Função (%)", name: "percentual_acumulo_funcao", type: "number", placeholder: "20.00", section: "Percentuais" },
        { label: "Desconto Vale Transporte (%)", name: "percentual_desconto_vt", type: "number", placeholder: "6.00", section: "Descontos" },
        { label: "Desconto Seguro de Vida em Grupo", name: "desconto_seguro_vida", type: "number", placeholder: "3.72", section: "Descontos" },
        
        // INSS Empregado - Faixa 1
        { label: "INSS Faixa 1 - Limite (R$)", name: "inss_faixa1_limite", type: "number", placeholder: "1518.00", section: "INSS Empregado" },
        { label: "INSS Faixa 1 - Alíquota (%)", name: "inss_faixa1_aliquota", type: "number", placeholder: "7.50", section: "INSS Empregado" },
        { label: "INSS Faixa 1 - Dedução (R$)", name: "inss_faixa1_deducao", type: "number", placeholder: "0.00", section: "INSS Empregado" },
        
        // INSS Empregado - Faixa 2
        { label: "INSS Faixa 2 - Limite (R$)", name: "inss_faixa2_limite", type: "number", placeholder: "2793.88", section: "INSS Empregado" },
        { label: "INSS Faixa 2 - Alíquota (%)", name: "inss_faixa2_aliquota", type: "number", placeholder: "9.00", section: "INSS Empregado" },
        { label: "INSS Faixa 2 - Dedução (R$)", name: "inss_faixa2_deducao", type: "number", placeholder: "22.77", section: "INSS Empregado" },
        
        // INSS Empregado - Faixa 3
        { label: "INSS Faixa 3 - Limite (R$)", name: "inss_faixa3_limite", type: "number", placeholder: "4190.83", section: "INSS Empregado" },
        { label: "INSS Faixa 3 - Alíquota (%)", name: "inss_faixa3_aliquota", type: "number", placeholder: "12.00", section: "INSS Empregado" },
        { label: "INSS Faixa 3 - Dedução (R$)", name: "inss_faixa3_deducao", type: "number", placeholder: "106.59", section: "INSS Empregado" },
        
        // INSS Empregado - Faixa 4
        { label: "INSS Faixa 4 - Limite (R$)", name: "inss_faixa4_limite", type: "number", placeholder: "8157.41", section: "INSS Empregado" },
        { label: "INSS Faixa 4 - Alíquota (%)", name: "inss_faixa4_aliquota", type: "number", placeholder: "14.00", section: "INSS Empregado" },
        { label: "INSS Faixa 4 - Dedução (R$)", name: "inss_faixa4_deducao", type: "number", placeholder: "190.40", section: "INSS Empregado" },
        
        // IRRF - Faixa 1 (Isenta)
        { label: "IRRF Faixa 1 - Limite (R$)", name: "irrf_faixa1_limite", type: "number", placeholder: "2259.21", section: "IRRF", help: "Limite superior da faixa isenta" },
        { label: "IRRF Faixa 1 - Alíquota (%)", name: "irrf_faixa1_aliquota", type: "number", placeholder: "0.00", section: "IRRF" },
        { label: "IRRF Faixa 1 - Dedução (R$)", name: "irrf_faixa1_deducao", type: "number", placeholder: "0.00", section: "IRRF" },
        
        // IRRF - Faixa 2
        { label: "IRRF Faixa 2 - Limite (R$)", name: "irrf_faixa2_limite", type: "number", placeholder: "2826.66", section: "IRRF" },
        { label: "IRRF Faixa 2 - Alíquota (%)", name: "irrf_faixa2_aliquota", type: "number", placeholder: "7.50", section: "IRRF" },
        { label: "IRRF Faixa 2 - Dedução (R$)", name: "irrf_faixa2_deducao", type: "number", placeholder: "169.44", section: "IRRF" },
        
        // IRRF - Faixa 3
        { label: "IRRF Faixa 3 - Limite (R$)", name: "irrf_faixa3_limite", type: "number", placeholder: "3751.06", section: "IRRF" },
        { label: "IRRF Faixa 3 - Alíquota (%)", name: "irrf_faixa3_aliquota", type: "number", placeholder: "15.00", section: "IRRF" },
        { label: "IRRF Faixa 3 - Dedução (R$)", name: "irrf_faixa3_deducao", type: "number", placeholder: "381.44", section: "IRRF" },
        
        // IRRF - Faixa 4
        { label: "IRRF Faixa 4 - Limite (R$)", name: "irrf_faixa4_limite", type: "number", placeholder: "4664.68", section: "IRRF" },
        { label: "IRRF Faixa 4 - Alíquota (%)", name: "irrf_faixa4_aliquota", type: "number", placeholder: "22.50", section: "IRRF" },
        { label: "IRRF Faixa 4 - Dedução (R$)", name: "irrf_faixa4_deducao", type: "number", placeholder: "662.77", section: "IRRF" },
        
        // IRRF - Faixa 5
        { label: "IRRF Faixa 5 - Limite (R$)", name: "irrf_faixa5_limite", type: "number", placeholder: "999999999.99", section: "IRRF", help: "Acima de todas as faixas anteriores" },
        { label: "IRRF Faixa 5 - Alíquota (%)", name: "irrf_faixa5_aliquota", type: "number", placeholder: "27.50", section: "IRRF" },
        { label: "IRRF Faixa 5 - Dedução (R$)", name: "irrf_faixa5_deducao", type: "number", placeholder: "896.00", section: "IRRF" },
        
        { label: "INSS Patronal (%)", name: "percentual_inss_patronal", type: "number", placeholder: "20.00", section: "Encargos", help: "Percentual sobre salário bruto (padrão: 20%)" },
        { label: "Desconto PLR (Taxa Sindical)", name: "desconto_plr", type: "number", placeholder: "12.00", section: "Descontos", help: "R$ 12,00 aplicado em SETEMBRO para quem recebeu PLR" },
        { label: "Convênio Odontológico", name: "convenio_odontologico", type: "number", placeholder: "0.00", section: "Descontos" },
        { label: "Contribuição Assistencial", name: "contribuicao_assistencial", type: "number", placeholder: "0.00", section: "Descontos" },
        { label: "Adiantamento Quinzenal (%)", name: "percentual_adiantamento_quinzenal", type: "number", placeholder: "40.00", section: "Descontos" },

        // 🔁 Folga Trabalhada (FT) - Valor diário por função (lançado em Benefícios)
        { label: "FT Diária - Vigia (R$)", name: "ft_diaria_vigia", type: "number", placeholder: "150.00", section: "Folga Trabalhada (FT)", help: "Valor diário pago ao Vigia/Vigilante por cada FT marcada manualmente na folha de ponto" },
        { label: "FT Diária - Auxiliar de Limpeza (R$)", name: "ft_diaria_aux_limpeza", type: "number", placeholder: "100.00", section: "Folga Trabalhada (FT)", help: "Valor diário pago ao Auxiliar de Limpeza por cada FT marcada manualmente" },
        { label: "FT Diária - Zelador (R$)", name: "ft_diaria_zelador", type: "number", placeholder: "120.00", section: "Folga Trabalhada (FT)", help: "Valor diário pago ao Zelador por cada FT marcada manualmente" },
    ];

    // Carregar anos disponíveis
    React.useEffect(() => {
        const carregarAnos = async () => {
            const { data } = await supabase
                .from('parametros_calculo')
                .select('ano_vigencia')
                .eq('ativo', true)
                .order('ano_vigencia', { ascending: false });
            
            if (data) {
                const anos = [...new Set(data.map(d => d.ano_vigencia))] as number[];
                if (anos.length === 0) {
                    anos.push(new Date().getFullYear());
                }
                setAnosDisponiveis(anos);
                if (!anos.includes(anoSelecionado)) {
                    setAnoSelecionado(anos[0] as number);
                }
            }
        };
        carregarAnos();
    }, [parametros]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Converter valores para números
            const dataToSubmit = Object.keys(formData).reduce((acc: any, key) => {
                const value = (formData as any)[key];
                acc[key] = value ? Number.parseFloat(value) : 0;
                return acc;
            }, {});

            // Percentuais PLR: o usuário digita em % (ex: 20), salva como decimal (0.20)
            const camposPercentualPLR = ['plr_desconto_falta_justificada', 'plr_desconto_falta_injustificada', 'plr_desconto_advertencia', 'plr_desconto_suspensao'];
            for (const campo of camposPercentualPLR) {
                if (dataToSubmit[campo]) {
                    dataToSubmit[campo] = dataToSubmit[campo] / 100;
                }
            }

            dataToSubmit.ativo = true;
            dataToSubmit.ano_vigencia = anoSelecionado;

            // Buscar registro existente para o ano selecionado
            const parametroAno = parametros.find(p => p.ano_vigencia === anoSelecionado);

            const result = parametroAno 
                ? await update(parametroAno.id, dataToSubmit)
                : await insert(dataToSubmit);
            
            if (result.success) {
                showToast(`Parâmetros de ${anoSelecionado} salvos com sucesso!`, 'success');
                refetch();
            } else {
                showToast(`Erro ao salvar parâmetros: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Erro inesperado ao salvar parâmetros', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Copiar parâmetros do ano anterior para criar novo ano
    const copiarParaNovoAno = async () => {
        const novoAno = anoSelecionado + 1;
        
        // Verificar se já existe parâmetro para o novo ano
        const jaExiste = parametros.find(p => p.ano_vigencia === novoAno);
        if (jaExiste) {
            showToast(`Já existem parâmetros para ${novoAno}. Selecione o ano para editá-los.`, 'info');
            setAnoSelecionado(novoAno);
            return;
        }

        setCopiando(true);
        try {
            // Buscar parâmetros do ano atual
            const parametroAtual = parametros.find(p => p.ano_vigencia === anoSelecionado);
            if (!parametroAtual) {
                showToast('Não há parâmetros para copiar. Salve os parâmetros atuais primeiro.', 'error');
                return;
            }

            // Criar cópia para o novo ano
            const { id, created_at, updated_at, ...dadosCopia } = parametroAtual;
            dadosCopia.ano_vigencia = novoAno;

            const { error } = await supabase
                .from('parametros_calculo')
                .insert(dadosCopia);

            if (error) throw error;

            showToast(`Parâmetros copiados para ${novoAno}. Atualize os valores conforme o dissídio.`, 'success');
            refetch();
            setAnoSelecionado(novoAno);
        } catch (error: any) {
            showToast(`Erro ao copiar parâmetros: ${error.message}`, 'error');
        } finally {
            setCopiando(false);
        }
    };

    // Carregar dados existentes para o ano selecionado
    React.useEffect(() => {
        const parametroAno = parametros.find(p => p.ano_vigencia === anoSelecionado);
        if (parametroAno) {
            const param = parametroAno;
            setFormData({
                salario_minimo: param.salario_minimo?.toString() || '',
                isencao_irpf: param.isencao_irpf?.toString() || '',
                salario_familia: param.salario_familia?.toString() || '',
                vale_transporte: param.vale_transporte?.toString() || '',
                vale_transporte_faixa2: (param as any).vale_transporte_faixa2?.toString() || '',
                vale_alimentacao: param.vale_alimentacao?.toString() || '',
                cesta_basica: param.cesta_basica?.toString() || '',
                plr_base: param.plr_base?.toString() || '',
                plr_desconto_falta_justificada: param.plr_desconto_falta_justificada != null ? (Number(param.plr_desconto_falta_justificada) * 100).toString() : '',
                plr_desconto_falta_injustificada: param.plr_desconto_falta_injustificada != null ? (Number(param.plr_desconto_falta_injustificada) * 100).toString() : '',
                plr_desconto_advertencia: param.plr_desconto_advertencia != null ? (Number(param.plr_desconto_advertencia) * 100).toString() : '',
                plr_desconto_suspensao: param.plr_desconto_suspensao != null ? (Number(param.plr_desconto_suspensao) * 100).toString() : '',
                plr_dias_minimos_mes: param.plr_dias_minimos_mes?.toString() || '',
                plr_taxa_negociacao: param.plr_taxa_negociacao?.toString() || '',
                premio_permanencia_base: param.premio_permanencia_base?.toString() || '',
                percentual_fgts: param.percentual_fgts?.toString() || '',
                percentual_insalubridade: param.percentual_insalubridade?.toString() || '',
                percentual_acumulo_funcao: param.percentual_acumulo_funcao?.toString() || '',
                percentual_desconto_vt: param.percentual_desconto_vt?.toString() || '',
                desconto_seguro_vida: param.desconto_seguro_vida?.toString() || '',
                inss_faixa1_limite: param.inss_faixa1_limite?.toString() || '1518.00',
                inss_faixa1_aliquota: param.inss_faixa1_aliquota?.toString() || '7.50',
                inss_faixa1_deducao: param.inss_faixa1_deducao?.toString() || '0.00',
                inss_faixa2_limite: param.inss_faixa2_limite?.toString() || '2793.88',
                inss_faixa2_aliquota: param.inss_faixa2_aliquota?.toString() || '9.00',
                inss_faixa2_deducao: param.inss_faixa2_deducao?.toString() || '22.77',
                inss_faixa3_limite: param.inss_faixa3_limite?.toString() || '4190.83',
                inss_faixa3_aliquota: param.inss_faixa3_aliquota?.toString() || '12.00',
                inss_faixa3_deducao: param.inss_faixa3_deducao?.toString() || '106.59',
                inss_faixa4_limite: param.inss_faixa4_limite?.toString() || '8157.41',
                inss_faixa4_aliquota: param.inss_faixa4_aliquota?.toString() || '14.00',
                inss_faixa4_deducao: param.inss_faixa4_deducao?.toString() || '190.40',
                irrf_faixa1_limite: (param as any).irrf_faixa1_limite?.toString() || '2259.21',
                irrf_faixa1_aliquota: (param as any).irrf_faixa1_aliquota?.toString() || '0.00',
                irrf_faixa1_deducao: (param as any).irrf_faixa1_deducao?.toString() || '0.00',
                irrf_faixa2_limite: (param as any).irrf_faixa2_limite?.toString() || '2826.66',
                irrf_faixa2_aliquota: (param as any).irrf_faixa2_aliquota?.toString() || '7.50',
                irrf_faixa2_deducao: (param as any).irrf_faixa2_deducao?.toString() || '169.44',
                irrf_faixa3_limite: (param as any).irrf_faixa3_limite?.toString() || '3751.06',
                irrf_faixa3_aliquota: (param as any).irrf_faixa3_aliquota?.toString() || '15.00',
                irrf_faixa3_deducao: (param as any).irrf_faixa3_deducao?.toString() || '381.44',
                irrf_faixa4_limite: (param as any).irrf_faixa4_limite?.toString() || '4664.68',
                irrf_faixa4_aliquota: (param as any).irrf_faixa4_aliquota?.toString() || '22.50',
                irrf_faixa4_deducao: (param as any).irrf_faixa4_deducao?.toString() || '662.77',
                irrf_faixa5_limite: (param as any).irrf_faixa5_limite?.toString() || '999999999.99',
                irrf_faixa5_aliquota: (param as any).irrf_faixa5_aliquota?.toString() || '27.50',
                irrf_faixa5_deducao: (param as any).irrf_faixa5_deducao?.toString() || '896.00',
                percentual_inss_patronal: param.percentual_inss_patronal?.toString() || '20',
                desconto_plr: param.desconto_plr?.toString() || '12.00',
                convenio_odontologico: param.convenio_odontologico?.toString() || '',
                contribuicao_assistencial: param.contribuicao_assistencial?.toString() || '',
                percentual_adiantamento_quinzenal: param.percentual_adiantamento_quinzenal?.toString() || '',
                ft_diaria_vigia: (param as any).ft_diaria_vigia?.toString() || '',
                ft_diaria_aux_limpeza: (param as any).ft_diaria_aux_limpeza?.toString() || '',
                ft_diaria_zelador: (param as any).ft_diaria_zelador?.toString() || ''
            });
        } else {
            // Limpar formulário se não há parâmetros para o ano
            setFormData({
                salario_minimo: '',
                isencao_irpf: '',
                salario_familia: '',
                vale_transporte: '',
                vale_transporte_faixa2: '',
                vale_alimentacao: '',
                cesta_basica: '',
                plr_base: '',
                plr_desconto_falta_justificada: '',
                plr_desconto_falta_injustificada: '',
                plr_desconto_advertencia: '',
                plr_desconto_suspensao: '',
                plr_dias_minimos_mes: '',
                plr_taxa_negociacao: '',
                premio_permanencia_base: '',
                percentual_fgts: '',
                percentual_insalubridade: '',
                percentual_acumulo_funcao: '',
                percentual_desconto_vt: '',
                desconto_seguro_vida: '',
                inss_faixa1_limite: '',
                inss_faixa1_aliquota: '',
                inss_faixa1_deducao: '',
                inss_faixa2_limite: '',
                inss_faixa2_aliquota: '',
                inss_faixa2_deducao: '',
                inss_faixa3_limite: '',
                inss_faixa3_aliquota: '',
                inss_faixa3_deducao: '',
                inss_faixa4_limite: '',
                inss_faixa4_aliquota: '',
                inss_faixa4_deducao: '',
                irrf_faixa1_limite: '',
                irrf_faixa1_aliquota: '',
                irrf_faixa1_deducao: '',
                irrf_faixa2_limite: '',
                irrf_faixa2_aliquota: '',
                irrf_faixa2_deducao: '',
                irrf_faixa3_limite: '',
                irrf_faixa3_aliquota: '',
                irrf_faixa3_deducao: '',
                irrf_faixa4_limite: '',
                irrf_faixa4_aliquota: '',
                irrf_faixa4_deducao: '',
                irrf_faixa5_limite: '',
                irrf_faixa5_aliquota: '',
                irrf_faixa5_deducao: '',
                percentual_inss_patronal: '',
                desconto_plr: '',
                convenio_odontologico: '',
                contribuicao_assistencial: '',
                percentual_adiantamento_quinzenal: '',
                ft_diaria_vigia: '',
                ft_diaria_aux_limpeza: '',
                ft_diaria_zelador: ''
            });
        }
    }, [parametros, anoSelecionado]);

    // Gerar opções de anos (ano atual + próximos 2 anos + anos existentes)
    const anoAtual = new Date().getFullYear();
    const opcoesAnos = [...new Set([...anosDisponiveis, anoAtual, anoAtual + 1])].sort((a, b) => b - a);

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Tabelas de Apoio</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            <Card>
                <div className="flex flex-col gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold">Parâmetros de Cálculo</h2>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Seletor de Ano */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            <select
                                value={anoSelecionado}
                                onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                {opcoesAnos.map(ano => (
                                    <option key={ano} value={ano}>
                                        {ano} {anosDisponiveis.includes(ano) ? '' : '(novo)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Botão Copiar para Novo Ano */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={copiarParaNovoAno}
                            disabled={copiando}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">{copiando ? 'Copiando...' : `Copiar para ${anoSelecionado + 1}`}</span>
                            <span className="sm:hidden">{copiando ? '...' : `→ ${anoSelecionado + 1}`}</span>
                        </Button>

                        {/* Botão Comparar Anos */}
                        {anosDisponiveis.length > 1 && (
                            <Button
                                type="button"
                                variant={modoComparacao ? "primary" : "outline"}
                                onClick={() => {
                                    if (modoComparacao) {
                                        setModoComparacao(false);
                                        setAnoComparacao(null);
                                    } else {
                                        setModoComparacao(true);
                                        const outroAno = anosDisponiveis.find(a => a !== anoSelecionado);
                                        setAnoComparacao(outroAno || null);
                                    }
                                }}
                                className="flex items-center gap-2 text-sm"
                            >
                                {modoComparacao ? <X className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                                <span className="hidden sm:inline">{modoComparacao ? 'Fechar Comparação' : 'Comparar Anos'}</span>
                                <span className="sm:hidden">{modoComparacao ? 'Fechar' : 'Comparar'}</span>
                            </Button>
                        )}
                    </div>

                    {/* Seletor de Ano para Comparação */}
                    {modoComparacao && (
                        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700 font-medium">Comparar com:</span>
                            <select
                                value={anoComparacao || ''}
                                onChange={(e) => setAnoComparacao(Number(e.target.value))}
                                className="border border-purple-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            >
                                {anosDisponiveis.filter(a => a !== anoSelecionado).map(ano => (
                                    <option key={ano} value={ano}>{ano}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Indicador do ano */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-800 text-sm sm:text-base">
                            Editando: <strong>{anoSelecionado}</strong>
                        </span>
                        {!anosDisponiveis.includes(anoSelecionado) && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                Novo
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                        Os cálculos usarão esses valores para {anoSelecionado}.
                    </p>
                </div>

                {/* Tabela de Comparação Lado a Lado */}
                {modoComparacao && anoComparacao && (() => {
                    const param1 = parametros.find(p => p.ano_vigencia === anoSelecionado);
                    const param2 = parametros.find(p => p.ano_vigencia === anoComparacao);
                    
                    const camposComparacao = [
                        { label: 'Salário Mínimo', key: 'salario_minimo', prefix: 'R$ ' },
                        { label: 'Vale Transporte', key: 'vale_transporte', prefix: 'R$ ' },
                        { label: 'Vale Alimentação', key: 'vale_alimentacao', prefix: 'R$ ' },
                        { label: 'Cesta Básica', key: 'cesta_basica', prefix: 'R$ ' },
                        { label: 'PLR Base', key: 'plr_base', prefix: 'R$ ' },
                        { label: 'Prêmio Permanência', key: 'premio_permanencia_base', prefix: 'R$ ' },
                        { label: 'Salário Família', key: 'salario_familia', prefix: 'R$ ' },
                        { label: 'FGTS', key: 'percentual_fgts', suffix: '%' },
                        { label: 'Insalubridade', key: 'percentual_insalubridade', suffix: '%' },
                        { label: 'Acúmulo Função', key: 'percentual_acumulo_funcao', suffix: '%' },
                        { label: 'Desconto VT', key: 'percentual_desconto_vt', suffix: '%' },
                        { label: 'Seguro de Vida', key: 'desconto_seguro_vida', prefix: 'R$ ' },
                        { label: 'INSS Patronal', key: 'percentual_inss_patronal', suffix: '%' },
                    ];
                    
                    const formatValue = (value: any, prefix?: string, suffix?: string) => {
                        if (value === null || value === undefined) return '-';
                        const num = Number(value);
                        return `${prefix || ''}${num.toFixed(2)}${suffix || ''}`;
                    };
                    
                    const getDiff = (val1: any, val2: any) => {
                        if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return null;
                        const diff = Number(val1) - Number(val2);
                        if (diff === 0) return null;
                        return diff;
                    };
                    
                    return (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                                <ArrowLeftRight className="w-5 h-5" />
                                Comparação: {anoSelecionado} vs {anoComparacao}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-purple-200">
                                            <th className="text-left py-2 px-3 font-medium text-purple-700">Parâmetro</th>
                                            <th className="text-right py-2 px-3 font-medium text-purple-700">{anoSelecionado}</th>
                                            <th className="text-right py-2 px-3 font-medium text-purple-700">{anoComparacao}</th>
                                            <th className="text-right py-2 px-3 font-medium text-purple-700">Diferença</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {camposComparacao.map(campo => {
                                            const val1 = param1?.[campo.key as keyof typeof param1];
                                            const val2 = param2?.[campo.key as keyof typeof param2];
                                            const diff = getDiff(val1, val2);
                                            
                                            return (
                                                <tr key={campo.key} className="border-b border-purple-100 hover:bg-purple-100/50">
                                                    <td className="py-2 px-3 text-gray-700">{campo.label}</td>
                                                    <td className="py-2 px-3 text-right font-mono">{formatValue(val1, campo.prefix, campo.suffix)}</td>
                                                    <td className="py-2 px-3 text-right font-mono">{formatValue(val2, campo.prefix, campo.suffix)}</td>
                                                    <td className={`py-2 px-3 text-right font-mono ${diff && diff > 0 ? 'text-green-600' : diff && diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                        {diff ? `${diff > 0 ? '+' : ''}${campo.prefix || ''}${diff.toFixed(2)}${campo.suffix || ''}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}

                {loading ? (
                    <p>Carregando parâmetros...</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                        {/* Valores Base */}
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-700 border-b pb-2">📋 Valores Base</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                {fields.filter(f => f.section === 'Valores Base').map(field => (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        step="0.01"
                                        min="0"
                                        value={(formData as any)[field.name]}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Benefícios */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-green-700 border-b pb-2">🎁 Benefícios</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {fields.filter(f => f.section === 'Benefícios').map(field => (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        step="0.01"
                                        min="0"
                                        value={(formData as any)[field.name]}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Percentuais */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-purple-700 border-b pb-2">📊 Percentuais</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {fields.filter(f => f.section === 'Percentuais').map(field => (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        step="0.01"
                                        min="0"
                                        value={(formData as any)[field.name]}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Descontos */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b pb-2">💳 Descontos</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {fields.filter(f => f.section === 'Descontos').map(field => (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        step="0.01"
                                        min="0"
                                        value={(formData as any)[field.name]}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* INSS Empregado - Tabela Progressiva */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-indigo-700 border-b pb-2">📊 INSS Empregado (Tabela Progressiva)</h3>
                            <div className="space-y-4">
                                {/* Faixa 1 */}
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-indigo-800 mb-3">Faixa 1</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'INSS Empregado' && f.name.includes('faixa1')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 2 */}
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-indigo-800 mb-3">Faixa 2</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'INSS Empregado' && f.name.includes('faixa2')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 3 */}
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-indigo-800 mb-3">Faixa 3</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'INSS Empregado' && f.name.includes('faixa3')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 4 */}
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-indigo-800 mb-3">Faixa 4</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'INSS Empregado' && f.name.includes('faixa4')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* IRRF - Tabela Progressiva */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-amber-700 border-b pb-2">📊 IRRF (Tabela Progressiva)</h3>
                            <div className="space-y-4">
                                {/* Faixa 1 (Isenta) */}
                                <div className="bg-amber-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-3">Faixa 1 (Isenta)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'IRRF' && f.name.includes('faixa1')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 2 */}
                                <div className="bg-amber-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-3">Faixa 2</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'IRRF' && f.name.includes('faixa2')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 3 */}
                                <div className="bg-amber-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-3">Faixa 3</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'IRRF' && f.name.includes('faixa3')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 4 */}
                                <div className="bg-amber-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-3">Faixa 4</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'IRRF' && f.name.includes('faixa4')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Faixa 5 */}
                                <div className="bg-amber-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-3">Faixa 5</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {fields.filter(f => f.section === 'IRRF' && f.name.includes('faixa5')).map(field => (
                                            <Input
                                                key={field.name}
                                                label={field.label}
                                                name={field.name}
                                                type={field.type}
                                                step="0.01"
                                                min="0"
                                                value={(formData as any)[field.name]}
                                                onChange={handleInputChange}
                                                placeholder={field.placeholder}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Encargos */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-orange-700 border-b pb-2">💼 Encargos Patronais</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {fields.filter(f => f.section === 'Encargos').map(field => (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        step="0.01"
                                        min="0"
                                        value={(formData as any)[field.name]}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Folga Trabalhada (FT) - Diárias por Função */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-teal-700 border-b pb-2">🔁 Folga Trabalhada (FT) — Diárias por Função</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Valor diário pago como <strong>benefício</strong> por cada FT marcada manualmente na Folha de Ponto.
                                A FT é usada quando um funcionário trabalha em sua folga substituindo outro colaborador.
                            </p>
                            <div className="bg-teal-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {fields.filter(f => f.section === 'Folga Trabalhada (FT)').map(field => (
                                        <Input
                                            key={field.name}
                                            label={field.label}
                                            name={field.name}
                                            type={field.type}
                                            step="0.01"
                                            min="0"
                                            value={(formData as any)[field.name]}
                                            onChange={handleInputChange}
                                            placeholder={field.placeholder}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center sm:justify-end pt-4 border-t">
                            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                                {submitting ? 'Salvando...' : `💾 Salvar Parâmetros de ${anoSelecionado}`}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default SupportTables;
