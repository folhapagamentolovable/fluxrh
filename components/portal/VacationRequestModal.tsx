import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Calendar, AlertTriangle, Info, DollarSign, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import type { ParametrosCalculo } from '../../lib/supabase';
import { calcularINSS as calcINSS, calcularIRRF as calcIRRF } from '../../utils/calcularFolhaPagamento';
import { useToast } from '../../hooks/useToast';

// Componente de input de data com formato brasileiro
interface BrazilianDateInputProps {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

const BrazilianDateInput: React.FC<BrazilianDateInputProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className = ''
}) => {
  const formatToBrazilian = (isoDate: string): string => {
    if (!isoDate || !isoDate.includes('-')) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const applyMask = (val: string): string => {
    const cleaned = val.replace(/\D/g, '');
    let masked = cleaned;
    if (cleaned.length >= 2) masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    if (cleaned.length >= 4) masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4) + '/' + cleaned.substring(4, 8);
    return masked;
  };

  const formatToISO = (brazilianDate: string): string => {
    const cleaned = brazilianDate.replace(/\D/g, '');
    if (cleaned.length < 8) return '';
    const day = cleaned.substring(0, 2);
    const month = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() !== parseInt(year) || date.getMonth() !== parseInt(month) - 1 || date.getDate() !== parseInt(day)) return '';
    return `${year}-${month}-${day}`;
  };

  const [displayValue, setDisplayValue] = useState(formatToBrazilian(value));

  useEffect(() => {
    setDisplayValue(formatToBrazilian(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value);
    setDisplayValue(masked);
    const isoDate = formatToISO(masked);
    if (isoDate) onChange(isoDate);
    else if (masked.length === 0) onChange('');
  };

  return (
    <input type="text" value={displayValue} onChange={handleChange}
      placeholder={placeholder} maxLength={10} className={className} />
  );
};

interface Funcionario {
  id: string;
  nome_completo: string;
  data_admissao: string;
}

interface PeriodoAquisitivo {
  id: string;
  periodo_aquisitivo: number;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_concessivo: string;
  dias_gozados: number | null;
  status: string;
}

interface VacationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  funcionario: Funcionario;
  periodoAquisitivo: PeriodoAquisitivo;
}

interface PeriodoDesejado {
  inicio: string;
  fim: string;
}

interface EstimativaFinanceira {
  salarioBaseCalculo: number;
  salarioAtual: number;
  mediaHorasExtras: number;
  mediaAdicionalNoturno: number;
  valorFeriasBruto: number;
  valorTerco: number;
  valorAbono: number;
  descontoINSS: number;
  descontoIRRF: number;
  totalBruto: number;
  totalLiquido: number;
  loading: boolean;
  mesesEncontrados: number;
}

// Tabelas INSS e IRRF são agora calculadas usando as funções globais com parâmetros do banco

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const VacationRequestModal: React.FC<VacationRequestModalProps> = ({
  isOpen, onClose, onSave, funcionario, periodoAquisitivo
}) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [periodo1, setPeriodo1] = useState<PeriodoDesejado>({ inicio: '', fim: '' });
  const [periodo2, setPeriodo2] = useState<PeriodoDesejado>({ inicio: '', fim: '' });
  const [periodo3, setPeriodo3] = useState<PeriodoDesejado>({ inicio: '', fim: '' });
  const [desejaVenderDias, setDesejaVenderDias] = useState(false);
  const [diasAbono, setDiasAbono] = useState(0);
  const [estimativa, setEstimativa] = useState<EstimativaFinanceira>({
    salarioBaseCalculo: 0, salarioAtual: 0, mediaHorasExtras: 0, mediaAdicionalNoturno: 0,
    valorFeriasBruto: 0, valorTerco: 0, valorAbono: 0,
    descontoINSS: 0, descontoIRRF: 0, totalBruto: 0, totalLiquido: 0, loading: false, mesesEncontrados: 0
  });
  const [parametros, setParametros] = useState<any>(null);

  useEffect(() => {
    const fetchParams = async () => {
      const { data } = await supabase
        .from('parametros_calculo')
        .select('*')
        .eq('ativo', true)
        .order('ano_vigencia', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setParametros(data);
    };
    fetchParams();
  }, []);

  const diasDireito = periodoAquisitivo.dias_gozados || 30;

  const calcularDias = (inicio: string, fim: string): number => {
    if (!inicio || !fim) return 0;
    const diff = Math.ceil((new Date(fim + 'T00:00:00').getTime() - new Date(inicio + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
  };

  const diasPeriodo1 = calcularDias(periodo1.inicio, periodo1.fim);
  const diasPeriodo2 = calcularDias(periodo2.inicio, periodo2.fim);
  const diasPeriodo3 = calcularDias(periodo3.inicio, periodo3.fim);
  const totalDiasSolicitados = diasPeriodo1 + diasPeriodo2 + diasPeriodo3;
  const diasDisponiveis = diasDireito - diasAbono;
  const diasRestantes = diasDisponiveis - totalDiasSolicitados;
  const precisaFracionamento = diasPeriodo1 > 0 && diasPeriodo1 < diasDisponiveis;

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const verificarDataPassado = (data: string): boolean => {
    if (!data) return false;
    return new Date(data + 'T00:00:00') < hoje;
  };

  const verificarDatasInvertidas = (inicio: string, fim: string): boolean => {
    if (!inicio || !fim) return false;
    return new Date(inicio + 'T00:00:00') > new Date(fim + 'T00:00:00');
  };

  const verificarSobreposicao = (p1i: string, p1f: string, p2i: string, p2f: string): boolean => {
    if (!p1i || !p1f || !p2i || !p2f) return false;
    return !(new Date(p1f + 'T00:00:00').getTime() < new Date(p2i + 'T00:00:00').getTime() || 
             new Date(p2f + 'T00:00:00').getTime() < new Date(p1i + 'T00:00:00').getTime());
  };

  const verificarInicioVespera = (inicio: string): boolean => {
    if (!inicio) return false;
    const dataInicio = new Date(inicio + 'T00:00:00');
    const diaSemana = dataInicio.getDay();
    // Não pode iniciar em sábado(6), domingo(0), ou véspera de feriado — CLT art. 134 §3º
    return diaSemana === 0 || diaSemana === 6;
  };

  interface ErrosPeriodo {
    inicio: boolean;
    fim: boolean;
    mensagens: string[];
  }

  const validacoes = useMemo(() => {
    const erros: string[] = [];
    const avisos: string[] = [];
    const errosPeriodo1: ErrosPeriodo = { inicio: false, fim: false, mensagens: [] };
    const errosPeriodo2: ErrosPeriodo = { inicio: false, fim: false, mensagens: [] };
    const errosPeriodo3: ErrosPeriodo = { inicio: false, fim: false, mensagens: [] };

    if (!periodo1.inicio || !periodo1.fim) {
      erros.push('Preencha as datas do Período 1 — é obrigatório informar ao menos um período de gozo de férias.');
      if (!periodo1.inicio) errosPeriodo1.inicio = true;
      if (!periodo1.fim) errosPeriodo1.fim = true;
      return { erros, avisos, valido: false, errosPeriodo1, errosPeriodo2, errosPeriodo3 };
    }

    // Datas no passado
    const verificarPassado = (data: string, label: string, errosP: ErrosPeriodo, campo: 'inicio' | 'fim') => {
      if (verificarDataPassado(data)) {
        erros.push(`${label}: Não é possível solicitar férias com data retroativa. Escolha uma data futura.`);
        errosP[campo] = true;
        errosP.mensagens.push('Data retroativa');
      }
    };
    verificarPassado(periodo1.inicio, 'Período 1 (Início)', errosPeriodo1, 'inicio');
    verificarPassado(periodo1.fim, 'Período 1 (Término)', errosPeriodo1, 'fim');
    if (periodo2.inicio) verificarPassado(periodo2.inicio, 'Período 2 (Início)', errosPeriodo2, 'inicio');
    if (periodo2.fim) verificarPassado(periodo2.fim, 'Período 2 (Término)', errosPeriodo2, 'fim');
    if (periodo3.inicio) verificarPassado(periodo3.inicio, 'Período 3 (Início)', errosPeriodo3, 'inicio');
    if (periodo3.fim) verificarPassado(periodo3.fim, 'Período 3 (Término)', errosPeriodo3, 'fim');

    // Datas invertidas
    const verificarInversao = (inicio: string, fim: string, label: string, errosP: ErrosPeriodo) => {
      if (verificarDatasInvertidas(inicio, fim)) {
        erros.push(`${label}: A data de início é posterior à data de término. Verifique as datas informadas.`);
        errosP.inicio = true; errosP.fim = true;
        errosP.mensagens.push('Datas invertidas');
      }
    };
    verificarInversao(periodo1.inicio, periodo1.fim, 'Período 1', errosPeriodo1);
    if (periodo2.inicio && periodo2.fim) verificarInversao(periodo2.inicio, periodo2.fim, 'Período 2', errosPeriodo2);
    if (periodo3.inicio && periodo3.fim) verificarInversao(periodo3.inicio, periodo3.fim, 'Período 3', errosPeriodo3);

    // Início em fim de semana (CLT art. 134 §3º)
    if (verificarInicioVespera(periodo1.inicio)) {
      avisos.push('Período 1: As férias não podem se iniciar em sábado ou domingo (CLT art. 134 §3º). Escolha uma segunda a sexta-feira.');
      errosPeriodo1.inicio = true;
      errosPeriodo1.mensagens.push('Início em fim de semana');
    }
    if (periodo2.inicio && verificarInicioVespera(periodo2.inicio)) {
      avisos.push('Período 2: As férias não podem se iniciar em sábado ou domingo (CLT art. 134 §3º).');
      errosPeriodo2.inicio = true;
      errosPeriodo2.mensagens.push('Início em fim de semana');
    }
    if (periodo3.inicio && verificarInicioVespera(periodo3.inicio)) {
      avisos.push('Período 3: As férias não podem se iniciar em sábado ou domingo (CLT art. 134 §3º).');
      errosPeriodo3.inicio = true;
      errosPeriodo3.mensagens.push('Início em fim de semana');
    }

    // Sobreposição
    if (diasPeriodo1 > 0 && diasPeriodo2 > 0 && verificarSobreposicao(periodo1.inicio, periodo1.fim, periodo2.inicio, periodo2.fim)) {
      erros.push('Os períodos 1 e 2 possuem datas sobrepostas. Cada período deve ser em datas distintas.');
      errosPeriodo1.inicio = true; errosPeriodo1.fim = true; errosPeriodo2.inicio = true; errosPeriodo2.fim = true;
    }
    if (diasPeriodo1 > 0 && diasPeriodo3 > 0 && verificarSobreposicao(periodo1.inicio, periodo1.fim, periodo3.inicio, periodo3.fim)) {
      erros.push('Os períodos 1 e 3 possuem datas sobrepostas.');
      errosPeriodo1.inicio = true; errosPeriodo1.fim = true; errosPeriodo3.inicio = true; errosPeriodo3.fim = true;
    }
    if (diasPeriodo2 > 0 && diasPeriodo3 > 0 && verificarSobreposicao(periodo2.inicio, periodo2.fim, periodo3.inicio, periodo3.fim)) {
      erros.push('Os períodos 2 e 3 possuem datas sobrepostas.');
      errosPeriodo2.inicio = true; errosPeriodo2.fim = true; errosPeriodo3.inicio = true; errosPeriodo3.fim = true;
    }

    // Mínimo de dias por período
    const periodosPreenchidos: { dias: number; nome: string; erros: ErrosPeriodo }[] = [];
    if (diasPeriodo1 > 0) periodosPreenchidos.push({ dias: diasPeriodo1, nome: 'Período 1', erros: errosPeriodo1 });
    if (diasPeriodo2 > 0) periodosPreenchidos.push({ dias: diasPeriodo2, nome: 'Período 2', erros: errosPeriodo2 });
    if (diasPeriodo3 > 0) periodosPreenchidos.push({ dias: diasPeriodo3, nome: 'Período 3', erros: errosPeriodo3 });

    periodosPreenchidos.forEach(p => {
      if (p.dias > 0 && p.dias < 5) {
        erros.push(`${p.nome}: Possui apenas ${p.dias} dia(s). A CLT (art. 134 §1º) exige no mínimo 5 dias corridos por período.`);
        p.erros.inicio = true; p.erros.fim = true;
        p.erros.mensagens.push(`Mínimo 5 dias (tem ${p.dias})`);
      }
    });

    // Regra do fracionamento
    if (periodosPreenchidos.length > 1) {
      const temPeriodoMinimo14 = periodosPreenchidos.some(p => p.dias >= 14);
      if (!temPeriodoMinimo14) {
        erros.push('Ao fracionar as férias, pelo menos um dos períodos deve ter no mínimo 14 dias corridos (CLT art. 134 §1º).');
      }
    }

    // Período único < 14 dias
    if (periodosPreenchidos.length === 1 && diasPeriodo1 >= 5 && diasPeriodo1 < 14) {
      erros.push(`O período único possui ${diasPeriodo1} dias. Para gozo em período único, o mínimo é 14 dias corridos. Aumente o período ou adicione um 2º período para fracionar.`);
      errosPeriodo1.inicio = true; errosPeriodo1.fim = true;
      errosPeriodo1.mensagens.push('Mínimo 14 dias para período único');
    }

    // Excedeu dias
    if (totalDiasSolicitados > diasDisponiveis) {
      erros.push(`Total solicitado (${totalDiasSolicitados} dias) excede os ${diasDisponiveis} dias disponíveis. Reduza os períodos ou o abono pecuniário.`);
    }

    // Abono max
    if (diasAbono > 10) {
      erros.push('O abono pecuniário é limitado a no máximo 10 dias (1/3 do período de 30 dias, conforme CLT art. 143).');
    }

    // Aviso de dias restantes
    if (diasRestantes > 0 && periodosPreenchidos.length > 0) {
      avisos.push(`Ainda restam ${diasRestantes} dia(s) de férias para programar ou converter em abono pecuniário.`);
    }

    // Antecedência mínima (30 dias)
    if (periodo1.inicio) {
      const diasAteInicio = Math.ceil((new Date(periodo1.inicio + 'T00:00:00').getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diasAteInicio > 0 && diasAteInicio < 30) {
        avisos.push(`Atenção: A CLT recomenda comunicar as férias com pelo menos 30 dias de antecedência. Faltam apenas ${diasAteInicio} dia(s).`);
      }
    }

    return { erros, avisos, valido: erros.length === 0, errosPeriodo1, errosPeriodo2, errosPeriodo3 };
  }, [periodo1, periodo2, periodo3, diasPeriodo1, diasPeriodo2, diasPeriodo3, totalDiasSolicitados, diasAbono, diasDisponiveis, diasRestantes, hoje]);

  // Buscar salário atual e calcular médias de H.Extras e Ad. Noturno
  const calcularEstimativa = useCallback(async () => {
    if (totalDiasSolicitados <= 0 || !periodo1.inicio) return;

    setEstimativa(prev => ({ ...prev, loading: true }));
    try {
      const dataGozo = new Date(periodo1.inicio + 'T00:00:00');
      const dataLimite = new Date(dataGozo);
      dataLimite.setMonth(dataLimite.getMonth() - 12);

      const { data: folhas } = await supabase
        .from('folha_calculada')
        .select('salario_base, horas_extras_50, horas_extras_100, adicional_noturno, dsr_horas_extras, dsr_adicional_noturno, mes, ano')
        .eq('funcionario_id', funcionario.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      let salarioAtual = 0;
      let mediaHorasExtras = 0;
      let mediaAdicionalNoturno = 0;
      let mesesEncontrados = 0;

      if (folhas && folhas.length > 0) {
        // Salário atual = salário base mais recente
        salarioAtual = Number(folhas[0].salario_base) || 0;

        // Filtrar 12 meses anteriores para médias
        const folhasFiltradas = folhas.filter(f => {
          const dataFolha = new Date(f.ano, f.mes - 1, 1);
          return dataFolha >= dataLimite && dataFolha < dataGozo;
        });

        mesesEncontrados = folhasFiltradas.length;

        if (mesesEncontrados > 0) {
          const somaHExtras = folhasFiltradas.reduce((s, f) =>
            s + (Number(f.horas_extras_50) || 0) + (Number(f.horas_extras_100) || 0) + (Number(f.dsr_horas_extras) || 0), 0);
          const somaAdNoturno = folhasFiltradas.reduce((s, f) =>
            s + (Number(f.adicional_noturno) || 0) + (Number(f.dsr_adicional_noturno) || 0), 0);

          // CLT: variáveis sempre divididas por 12
          mediaHorasExtras = somaHExtras / 12;
          mediaAdicionalNoturno = somaAdNoturno / 12;
        }
      }

      // Fallback: buscar do cargo
      if (salarioAtual === 0) {
        const { data: func } = await supabase.from('funcionarios').select('cargo_id').eq('id', funcionario.id).single();
        if (func?.cargo_id) {
          const { data: cargo } = await supabase.from('cargos').select('salario_base').eq('id', func.cargo_id).single();
          salarioAtual = Number(cargo?.salario_base) || 0;
        }
      }

      const salarioBaseCalculo = salarioAtual + mediaHorasExtras + mediaAdicionalNoturno;
      const valorDiario = salarioBaseCalculo / 30;
      const valorFeriasBruto = valorDiario * totalDiasSolicitados;
      const valorTerco = valorFeriasBruto / 3;
      let valorAbono = 0;
      if (diasAbono > 0) {
        valorAbono = (valorDiario * diasAbono) + ((valorDiario * diasAbono) / 3);
      }
      const totalBruto = valorFeriasBruto + valorTerco + valorAbono;

      const baseTributavel = valorFeriasBruto + valorTerco;
      const descontoINSS = parametros ? calcINSS(baseTributavel, parametros) : 0;
      const descontoIRRF = parametros ? calcIRRF(baseTributavel, descontoINSS, parametros) : 0;
      const totalLiquido = totalBruto - descontoINSS - descontoIRRF;

      setEstimativa({
        salarioBaseCalculo, salarioAtual, mediaHorasExtras, mediaAdicionalNoturno,
        valorFeriasBruto, valorTerco, valorAbono,
        descontoINSS, descontoIRRF, totalBruto, totalLiquido,
        loading: false, mesesEncontrados
      });
    } catch {
      setEstimativa(prev => ({ ...prev, loading: false }));
    }
  }, [funcionario.id, periodo1.inicio, totalDiasSolicitados, diasAbono]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (totalDiasSolicitados > 0 && periodo1.inicio) {
        calcularEstimativa();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [calcularEstimativa, totalDiasSolicitados, periodo1.inicio]);

  const handlePeriodo1InicioChange = (data: string) => {
    setPeriodo1(prev => ({ ...prev, inicio: data }));
    if (data) {
      const dataInicio = new Date(data + 'T00:00:00');
      const diasSugeridos = Math.max(14, diasDisponiveis);
      const dataFimSugerida = new Date(dataInicio);
      dataFimSugerida.setDate(dataFimSugerida.getDate() + diasSugeridos - 1);
      setPeriodo1(prev => ({ ...prev, inicio: data, fim: dataFimSugerida.toISOString().split('T')[0] }));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const handleSubmit = async () => {
    if (!validacoes.valido) {
      showToast(`Corrija os erros antes de enviar: ${validacoes.erros[0]}`, 'error');
      return;
    }

    try {
      setSaving(true);
      let totalFracoes = 1;
      if (diasPeriodo2 > 0) totalFracoes = 2;
      if (diasPeriodo3 > 0) totalFracoes = 3;

      const solicitacaoData = {
        funcionario_id: funcionario.id,
        periodo_aquisitivo: periodoAquisitivo.periodo_aquisitivo,
        data_inicio_aquisitivo: periodoAquisitivo.data_inicio_aquisitivo,
        data_fim_aquisitivo: periodoAquisitivo.data_fim_aquisitivo,
        data_limite_concessivo: periodoAquisitivo.data_limite_concessivo,
        status: 'solicitado',
        data_inicio_gozo: periodo1.inicio,
        data_fim_gozo: periodo1.fim,
        dias_gozados: totalDiasSolicitados,
        periodo1_inicio: periodo1.inicio,
        periodo1_fim: periodo1.fim,
        periodo2_inicio: diasPeriodo2 > 0 ? periodo2.inicio : null,
        periodo2_fim: diasPeriodo2 > 0 ? periodo2.fim : null,
        periodo3_inicio: diasPeriodo3 > 0 ? periodo3.inicio : null,
        periodo3_fim: diasPeriodo3 > 0 ? periodo3.fim : null,
        fracionamento: 1,
        total_fracoes: totalFracoes,
        dias_abono: diasAbono,
        observacoes: `Solicitação de férias pelo Portal do Funcionário. Períodos solicitados: P1(${diasPeriodo1}d)${diasPeriodo2 > 0 ? `, P2(${diasPeriodo2}d)` : ''}${diasPeriodo3 > 0 ? `, P3(${diasPeriodo3}d)` : ''}${diasAbono > 0 ? `, Abono(${diasAbono}d)` : ''}`
      };

      const { error } = await supabase.from('ferias').insert(solicitacaoData);
      if (error) throw error;

      showToast('Solicitação de férias enviada com sucesso!', 'success');
      onSave();
    } catch {
      showToast('Erro ao enviar solicitação de férias', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderPeriodoInput = (
    periodo: PeriodoDesejado,
    setPeriodo: (fn: (prev: PeriodoDesejado) => PeriodoDesejado) => void,
    label: string,
    dias: number,
    erros: ErrosPeriodo,
    obrigatorio: boolean,
    useAutoFill?: boolean
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className={`w-5 h-5 ${obrigatorio ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="font-semibold text-foreground">{label} {obrigatorio && '*'}</h3>
        {dias > 0 && (
          <span className={`text-sm px-2 py-0.5 rounded ${
            erros.inicio || erros.fim ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'
          }`}>{dias} dias</span>
        )}
        {!obrigatorio && <span className="text-xs text-muted-foreground">(opcional)</span>}
      </div>
      {erros.mensagens.length > 0 && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {erros.mensagens.join(' | ')}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Data Início {obrigatorio && '*'}</label>
          <BrazilianDateInput
            value={periodo.inicio}
            onChange={(date) => useAutoFill ? handlePeriodo1InicioChange(date) : setPeriodo(prev => ({ ...prev, inicio: date }))}
            className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 ${
              erros.inicio ? 'border-red-500 focus:ring-red-500' : 'border-input focus:ring-primary'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Data Término {obrigatorio && '*'}</label>
          <BrazilianDateInput
            value={periodo.fim}
            onChange={(date) => setPeriodo(prev => ({ ...prev, fim: date }))}
            className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 ${
              erros.fim ? 'border-red-500 focus:ring-red-500' : 'border-input focus:ring-primary'
            }`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Solicitar Férias</h2>
            <p className="text-sm text-muted-foreground">{periodoAquisitivo.periodo_aquisitivo}º Período Aquisitivo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Dados do Funcionário */}
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-semibold text-foreground">{funcionario.nome_completo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Período Aquisitivo</p>
                <p className="font-semibold text-foreground">
                  {formatDate(periodoAquisitivo.data_inicio_aquisitivo)} a {formatDate(periodoAquisitivo.data_fim_aquisitivo)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Limite para Gozo</p>
                <p className="font-semibold text-foreground">{formatDate(periodoAquisitivo.data_limite_concessivo)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dias de Direito</p>
                <p className="font-semibold text-foreground">{diasDireito} dias</p>
              </div>
            </div>
          </Card>

          {/* Período 1 */}
          {renderPeriodoInput(periodo1, setPeriodo1, 'Período Desejado (1)', diasPeriodo1, validacoes.errosPeriodo1, true, true)}

          {/* Períodos 2 e 3 */}
          {precisaFracionamento && (
            <>
              {renderPeriodoInput(periodo2, setPeriodo2, 'Período Desejado (2)', diasPeriodo2, validacoes.errosPeriodo2, false)}
              {renderPeriodoInput(periodo3, setPeriodo3, 'Período Desejado (3)', diasPeriodo3, validacoes.errosPeriodo3, false)}
            </>
          )}

          {/* Abono Pecuniário */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="desejaVender" checked={desejaVenderDias}
                  onChange={(e) => { setDesejaVenderDias(e.target.checked); if (!e.target.checked) setDiasAbono(0); }}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />
                <label htmlFor="desejaVender" className="text-sm font-medium text-foreground">
                  Deseja "vender" parte das férias (Abono Pecuniário)?
                </label>
              </div>
              {desejaVenderDias && (
                <div className="pl-7">
                  <label className="block text-sm font-medium text-foreground mb-1">Quantos dias? (máximo 10 dias)</label>
                  <input type="number" min={1} max={10} value={diasAbono}
                    onChange={(e) => setDiasAbono(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-32 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Abono pecuniário: você recebe o valor correspondente aos dias vendidos + 1/3 constitucional, isento de INSS e IRRF.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Visualização dos Períodos */}
          {(diasPeriodo1 > 0 || diasPeriodo2 > 0 || diasPeriodo3 > 0) && (
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Visualização dos Períodos
              </h3>
              <div className="space-y-2">
                {diasPeriodo1 > 0 && periodo1.inicio && periodo1.fim && (
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${validacoes.errosPeriodo1.inicio || validacoes.errosPeriodo1.fim ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Período 1</span>
                        <span className="text-xs text-muted-foreground">{diasPeriodo1} dias</span>
                      </div>
                      <div className={`h-6 rounded-md mt-1 flex items-center justify-center text-xs font-medium ${
                        validacoes.errosPeriodo1.inicio || validacoes.errosPeriodo1.fim ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>
                        {formatDate(periodo1.inicio)} → {formatDate(periodo1.fim)}
                      </div>
                    </div>
                  </div>
                )}
                {diasPeriodo2 > 0 && periodo2.inicio && periodo2.fim && (
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${validacoes.errosPeriodo2.inicio || validacoes.errosPeriodo2.fim ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Período 2</span>
                        <span className="text-xs text-muted-foreground">{diasPeriodo2} dias</span>
                      </div>
                      <div className={`h-6 rounded-md mt-1 flex items-center justify-center text-xs font-medium ${
                        validacoes.errosPeriodo2.inicio || validacoes.errosPeriodo2.fim ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
                      }`}>
                        {formatDate(periodo2.inicio)} → {formatDate(periodo2.fim)}
                      </div>
                    </div>
                  </div>
                )}
                {diasPeriodo3 > 0 && periodo3.inicio && periodo3.fim && (
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${validacoes.errosPeriodo3.inicio || validacoes.errosPeriodo3.fim ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Período 3</span>
                        <span className="text-xs text-muted-foreground">{diasPeriodo3} dias</span>
                      </div>
                      <div className={`h-6 rounded-md mt-1 flex items-center justify-center text-xs font-medium ${
                        validacoes.errosPeriodo3.inicio || validacoes.errosPeriodo3.fim ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-purple-100 text-purple-700 border border-purple-300'
                      }`}>
                        {formatDate(periodo3.inicio)} → {formatDate(periodo3.fim)}
                      </div>
                    </div>
                  </div>
                )}
                {diasAbono > 0 && (
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-4 h-4 rounded bg-amber-500"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Abono Pecuniário</span>
                        <span className="text-xs text-muted-foreground">{diasAbono} dias vendidos</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total:</span>
                <span className={`text-sm font-bold ${totalDiasSolicitados + diasAbono === diasDireito ? 'text-green-600' : 'text-primary'}`}>
                  {totalDiasSolicitados} dias de gozo + {diasAbono} abono = {totalDiasSolicitados + diasAbono} / {diasDireito} dias
                </span>
              </div>
            </Card>
          )}

          {/* ===== ESTIMATIVA FINANCEIRA ===== */}
          {totalDiasSolicitados > 0 && estimativa.salarioBaseCalculo > 0 && (
            <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Estimativa de Valores a Receber
              </h3>
              {estimativa.loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                  <span className="ml-3 text-sm text-muted-foreground">Calculando...</span>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {/* Base de cálculo detalhada */}
                  <div className="pb-2 border-b border-emerald-200 dark:border-emerald-800 space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      Base de Cálculo
                    </div>
                    <div className="flex justify-between pl-6">
                      <span className="text-muted-foreground">Salário Atual</span>
                      <span className="text-foreground">{formatCurrency(estimativa.salarioAtual)}</span>
                    </div>
                    {estimativa.mediaHorasExtras > 0 && (
                      <div className="flex justify-between pl-6">
                        <span className="text-muted-foreground">Média H. Extras (÷12)</span>
                        <span className="text-foreground">{formatCurrency(estimativa.mediaHorasExtras)}</span>
                      </div>
                    )}
                    {estimativa.mediaAdicionalNoturno > 0 && (
                      <div className="flex justify-between pl-6">
                        <span className="text-muted-foreground">Média Ad. Noturno (÷12)</span>
                        <span className="text-foreground">{formatCurrency(estimativa.mediaAdicionalNoturno)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pl-6 font-medium pt-1 border-t border-emerald-100 dark:border-emerald-900">
                      <span className="text-foreground">Remuneração Base</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(estimativa.salarioBaseCalculo)}</span>
                    </div>
                  </div>

                  {/* Proventos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>Proventos</span>
                    </div>
                    <div className="flex justify-between pl-6">
                      <span className="text-muted-foreground">Férias ({totalDiasSolicitados} dias)</span>
                      <span className="text-foreground">{formatCurrency(estimativa.valorFeriasBruto)}</span>
                    </div>
                    <div className="flex justify-between pl-6">
                      <span className="text-muted-foreground">1/3 Constitucional</span>
                      <span className="text-foreground">{formatCurrency(estimativa.valorTerco)}</span>
                    </div>
                    {estimativa.valorAbono > 0 && (
                      <div className="flex justify-between pl-6">
                        <span className="text-muted-foreground">Abono Pecuniário ({diasAbono} dias + 1/3)</span>
                        <span className="text-foreground">{formatCurrency(estimativa.valorAbono)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pl-6 font-medium pt-1 border-t border-emerald-100 dark:border-emerald-900">
                      <span className="text-foreground">Total Bruto</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(estimativa.totalBruto)}</span>
                    </div>
                  </div>

                  {/* Descontos */}
                  {(estimativa.descontoINSS > 0 || estimativa.descontoIRRF > 0) && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                        <TrendingDown className="w-4 h-4" />
                        <span>Descontos</span>
                      </div>
                      {estimativa.descontoINSS > 0 && (
                        <div className="flex justify-between pl-6">
                          <span className="text-muted-foreground">INSS</span>
                          <span className="text-red-600 dark:text-red-400">- {formatCurrency(estimativa.descontoINSS)}</span>
                        </div>
                      )}
                      {estimativa.descontoIRRF > 0 && (
                        <div className="flex justify-between pl-6">
                          <span className="text-muted-foreground">IRRF</span>
                          <span className="text-red-600 dark:text-red-400">- {formatCurrency(estimativa.descontoIRRF)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total líquido */}
                  <div className="pt-3 mt-2 border-t-2 border-emerald-300 dark:border-emerald-700">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Valor Líquido Estimado
                      </span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(estimativa.totalLiquido)}
                      </span>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    * Base: Salário atual + médias de H. Extras e Ad. Noturno (soma dos últimos {estimativa.mesesEncontrados || 12} meses ÷ 12, conforme CLT). O valor final pode variar conforme processamento da folha.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Alertas de Validação */}
          {validacoes.erros.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive mb-1">Correções necessárias</p>
                  <ul className="text-sm text-destructive space-y-1.5">
                    {validacoes.erros.map((erro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>{erro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validacoes.avisos.length > 0 && validacoes.erros.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    {validacoes.avisos.map((aviso, idx) => (
                      <li key={idx}>• {aviso}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info CLT */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold text-foreground mb-2 text-sm">Regras de Fracionamento (CLT art. 134)</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• As férias podem ser fracionadas em até 3 períodos</li>
              <li>• Um dos períodos deve ter no mínimo 14 dias corridos</li>
              <li>• Nenhum período pode ter menos de 5 dias corridos</li>
              <li>• O abono pecuniário é limitado a 10 dias (1/3 do período — art. 143)</li>
              <li>• O início das férias não pode coincidir com sábados, domingos ou feriados (§3º)</li>
            </ul>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !validacoes.valido}>
            {saving ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VacationRequestModal;
