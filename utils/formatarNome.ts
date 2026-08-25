/**
 * Retorna os dois primeiros nomes significativos (ignorando preposições).
 * Ex: "João Carlos de Oliveira Santos" → "João Carlos"
 */
const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function abreviarNome(nomeCompleto: string): string {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  const significativas: string[] = [];
  for (const parte of partes) {
    if (significativas.length >= 2) break;
    if (!PREPOSICOES.has(parte.toLowerCase())) {
      significativas.push(parte);
    }
  }
  return significativas.join(' ');
}
