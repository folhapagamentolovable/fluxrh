/**
 * Filtra feriados conforme a localidade (cidade/estado) de um posto/empresa.
 *
 * Regras:
 *  - Nacionais: sempre incluídos.
 *  - Estaduais: incluídos quando o estado do feriado coincide com o estado informado.
 *  - Municipais: incluídos quando cidade e estado do feriado coincidem com os informados.
 *
 * Quando cidade/estado não são informados, o feriado correspondente é IGNORADO
 * (para evitar que feriados municipais de outras cidades afetem postos sem cidade definida).
 * Feriados legados sem cidade/estado preenchidos no banco são tratados como Campinas/SP
 * apenas se forem do tipo municipal — esse backfill já foi aplicado na migração.
 */
export interface FeriadoLike {
  id?: string;
  data_feriado: string;
  nome_feriado?: string;
  tipo_feriado?: 'nacional' | 'estadual' | 'municipal' | string | null;
  cidade?: string | null;
  estado?: string | null;
  [k: string]: any;
}

const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();

export function filtrarFeriadosPorLocalidade<T extends FeriadoLike>(
  feriados: T[] | null | undefined,
  cidade?: string | null,
  estado?: string | null
): T[] {
  if (!feriados || feriados.length === 0) return [];

  const cidadePosto = norm(cidade);
  const estadoPosto = norm(estado);

  return feriados.filter(f => {
    const tipo = (f.tipo_feriado || 'nacional').toString().toLowerCase();
    if (tipo === 'nacional') return true;

    const estadoFeriado = norm(f.estado);
    const cidadeFeriado = norm(f.cidade);

    if (tipo === 'estadual') {
      if (!estadoFeriado) return true; // feriado sem UF definido — assume universal
      if (!estadoPosto) return false;   // posto sem UF — não aplica feriado estadual específico
      return estadoFeriado === estadoPosto;
    }

    if (tipo === 'municipal') {
      if (!cidadeFeriado) return false; // municipal sem cidade definida — não aplicar
      if (!cidadePosto) return false;   // posto sem cidade — não aplica feriado municipal
      const cidadeOk = cidadeFeriado === cidadePosto;
      const estadoOk = !estadoFeriado || !estadoPosto || estadoFeriado === estadoPosto;
      return cidadeOk && estadoOk;
    }

    return true;
  });
}
