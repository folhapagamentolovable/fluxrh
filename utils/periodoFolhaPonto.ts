/**
 * Determina o período "Referente ao(s) dia(s) trabalhados no período de ..."
 * exibido em Holerites e Recibos de Benefícios.
 *
 * Fonte ÚNICA: dados da FOLHA DE PONTO do funcionário (folhas_ponto).
 *  1) Se `dados_dias` existir, usa o menor e o maior dia com conteúdo.
 *  2) Caso contrário, usa `data_inicio` / `data_fim` (compatibilidade).
 *  3) Fallback final: 01/mm/aaaa até o último dia do mês.
 *
 * NÃO consulta escalas nem qualquer outra tabela.
 */

const pad = (n: number) => n.toString().padStart(2, '0');

const formatar = (dia: number, mes: number, ano: number) =>
  `${pad(dia)}/${pad(mes)}/${ano}`;

export interface PeriodoFolhaPonto {
  inicio: string;
  fim: string;
}

export function obterPeriodoFolhaPonto(
  folhaPonto: any,
  mes: number,
  ano: number
): PeriodoFolhaPonto {
  const ultimoDiaMes = new Date(ano, mes, 0).getDate();
  const fallback: PeriodoFolhaPonto = {
    inicio: formatar(1, mes, ano),
    fim: formatar(ultimoDiaMes, mes, ano),
  };

  if (!folhaPonto) return fallback;

  // 1) dados_dias
  const raw = folhaPonto.dados_dias;
  if (raw) {
    try {
      const dados = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (dados && typeof dados === 'object') {
        const diasComConteudo = Object.keys(dados)
          .filter((k) => {
            const v = (dados as any)[k];
            if (v === null || v === undefined) return false;
            if (typeof v !== 'object') return !!v;
            return Object.values(v).some(
              (x) => x !== null && x !== undefined && x !== ''
            );
          })
          .map((k) => parseInt(k, 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31)
          .sort((a, b) => a - b);

        if (diasComConteudo.length > 0) {
          return {
            inicio: formatar(diasComConteudo[0], mes, ano),
            fim: formatar(diasComConteudo[diasComConteudo.length - 1], mes, ano),
          };
        }
      }
    } catch {
      // ignora e cai pro próximo
    }
  }

  // 2) data_inicio / data_fim
  if (folhaPonto.data_inicio || folhaPonto.data_fim) {
    const di = folhaPonto.data_inicio
      ? new Date(folhaPonto.data_inicio + 'T00:00:00')
      : new Date(ano, mes - 1, 1);
    const df = folhaPonto.data_fim
      ? new Date(folhaPonto.data_fim + 'T00:00:00')
      : new Date(ano, mes, 0);
    return {
      inicio: formatar(di.getDate(), di.getMonth() + 1, di.getFullYear()),
      fim: formatar(df.getDate(), df.getMonth() + 1, df.getFullYear()),
    };
  }

  return fallback;
}
