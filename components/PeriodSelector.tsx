import React, { useState, useEffect } from 'react';
import Button from './ui/Button';

interface PeriodSelectorProps {
  onGenerate: (periods: Array<{ mes: number; ano: number }>) => void;
  loading?: boolean;
  buttonLabel?: string;
  buttonIcon?: string;
  minYear?: number;
  maxYear?: number;
}

interface Period {
  mes: number;
  ano: number;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  'Novembro 13º', 'Dezembro 13º'
];

/**
 * Gera array de períodos (mês/ano) entre início e fim, em ordem cronológica
 */
export function generatePeriodRange(inicio: Period, fim: Period): Period[] {
  const result: Period[] = [];
  
  let currentMes = inicio.mes;
  let currentAno = inicio.ano;
  
  while (currentAno < fim.ano || (currentAno === fim.ano && currentMes <= fim.mes)) {
    result.push({ mes: currentMes, ano: currentAno });
    
    currentMes++;
    if (currentMes > 12) {
      currentMes = 1;
      currentAno++;
    }
  }
  
  return result;
}

/**
 * Formata mês/ano para exibição
 */
export function formatMonthYear(mes: number, ano: number): string {
  return `${MESES[mes - 1]}/${ano}`;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  onGenerate,
  loading = false,
  buttonLabel = 'Gerar Período',
  buttonIcon = '📅',
  minYear = 2024,
  maxYear = 2030
}) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [mesInicial, setMesInicial] = useState(1);
  const [anoInicial, setAnoInicial] = useState(currentYear);
  const [mesFinal, setMesFinal] = useState(currentMonth);
  const [anoFinal, setAnoFinal] = useState(currentYear);
  const [erro, setErro] = useState<string | null>(null);

  // Validar período
  useEffect(() => {
    const inicioValue = anoInicial * 100 + mesInicial;
    const fimValue = anoFinal * 100 + mesFinal;
    
    if (inicioValue > fimValue) {
      setErro('Período inicial não pode ser maior que o final');
    } else {
      setErro(null);
    }
  }, [mesInicial, anoInicial, mesFinal, anoFinal]);

  const handleGenerate = () => {
    if (erro) return;
    
    const periods = generatePeriodRange(
      { mes: mesInicial, ano: anoInicial },
      { mes: mesFinal, ano: anoFinal }
    );
    
    onGenerate(periods);
  };

  // Gerar opções de anos
  const anos = [];
  for (let ano = minYear; ano <= maxYear; ano++) {
    anos.push(ano);
  }

  // Calcular quantos meses serão gerados
  const totalMeses = erro ? 0 : generatePeriodRange(
    { mes: mesInicial, ano: anoInicial },
    { mes: mesFinal, ano: anoFinal }
  ).length;

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-border">
      <div className="flex flex-col gap-4">
        {/* Período Inicial */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Período Inicial:
          </span>
          <div className="flex gap-2 flex-1">
            <select
              value={mesInicial.toString()}
              onChange={(e) => setMesInicial(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
            >
              {MESES.map((mes, index) => (
                <option key={index} value={index + 1}>
                  {mes}
                </option>
              ))}
            </select>
            <select
              value={anoInicial.toString()}
              onChange={(e) => setAnoInicial(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
            >
              {anos.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Período Final */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Período Final:
          </span>
          <div className="flex gap-2 flex-1">
            <select
              value={mesFinal.toString()}
              onChange={(e) => setMesFinal(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
            >
              {MESES.map((mes, index) => (
                <option key={index} value={index + 1}>
                  {mes}
                </option>
              ))}
            </select>
            <select
              value={anoFinal.toString()}
              onChange={(e) => setAnoFinal(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
            >
              {anos.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Erro ou Info */}
        {erro ? (
          <p className="text-sm text-destructive">{erro}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {totalMeses} mês(es) selecionado(s): {formatMonthYear(mesInicial, anoInicial)} a {formatMonthYear(mesFinal, anoFinal)}
          </p>
        )}

        {/* Botão */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !!erro}
          className="w-full sm:w-auto !bg-primary !text-primary-foreground hover:!bg-primary/90"
        >
          {loading ? (
            <>⏳ Processando...</>
          ) : (
            <>{buttonIcon} {buttonLabel}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PeriodSelector;
