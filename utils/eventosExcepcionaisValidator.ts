/**
 * Validador e Padronizador de Eventos Excepcionais
 * 
 * Este arquivo centraliza todas as descrições oficiais de eventos excepcionais
 * usados no sistema de folha de pagamento, garantindo consistência entre:
 * - Adição de eventos na interface
 * - Salvamento no banco de dados
 * - Mapeamento para códigos contábeis no holerite
 */

// ============================================
// TIPOS
// ============================================

export type TipoEvento = 'provento' | 'beneficio' | 'desconto';

export interface DescricaoEvento {
  codigo: string;           // Código contábil
  descricao: string;        // Descrição oficial padronizada
  tipo: TipoEvento;
  categoria: string;
  permitePersonalizacao?: boolean; // Se true, permite digitação livre
}

export interface EventoExcepcional {
  descricao: string;
  valor: number;
  tipo: TipoEvento;
  descricao_personalizada?: string; // Para eventos "Outros"
}

// ============================================
// DESCRIÇÕES OFICIAIS PADRONIZADAS
// ============================================

export const EVENTOS_PADRONIZADOS: DescricaoEvento[] = [
  // ========== PROVENTOS ==========
  // Adicionais
  { codigo: '0305', descricao: 'Folhas de Pagamento', tipo: 'provento', categoria: 'Adicionais' },
  { codigo: '0306', descricao: 'Controle de Rondas Palmeiras', tipo: 'provento', categoria: 'Adicionais' },
  { codigo: '0307', descricao: 'Supervisão Palmeiras', tipo: 'provento', categoria: 'Adicionais' },
  { codigo: '0308', descricao: 'Outros Serviços', tipo: 'provento', categoria: 'Adicionais', permitePersonalizacao: true },
  
  // Rescisão
  { codigo: '0510', descricao: '13º Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  { codigo: '0511', descricao: '13º Proporc. Vantagens Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  { codigo: '0512', descricao: 'Férias Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  { codigo: '0513', descricao: '1/3 Férias proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  { codigo: '0514', descricao: 'PLR Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  
  // 13º Salário
  { codigo: '0520', descricao: '13º Salário', tipo: 'provento', categoria: '13º Salário' },
  { codigo: '0521', descricao: 'Vantagens 13º', tipo: 'provento', categoria: '13º Salário' },
  { codigo: '0522', descricao: '13º Salário 1ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  { codigo: '0523', descricao: '13º Salário 2ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  { codigo: '0524', descricao: '13º Salário Vantagens 1ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  { codigo: '0525', descricao: '13º Salário Vantagens 2ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  
  // ========== DESCONTOS ==========
  // Diversos
  { codigo: '5011', descricao: 'Desc. Rondas Não Realizadas', tipo: 'desconto', categoria: 'Diversos' },
  { codigo: '5012', descricao: 'Desc. Avaria Utilitário (Parcela)', tipo: 'desconto', categoria: 'Diversos' },
  { codigo: '5013', descricao: 'Outros Descontos', tipo: 'desconto', categoria: 'Diversos', permitePersonalizacao: true },
  
  // Legais
  { codigo: '5018', descricao: 'INSS 13º', tipo: 'desconto', categoria: 'Legais' },
  { codigo: '5019', descricao: 'INSS Férias', tipo: 'desconto', categoria: 'Legais' },
  
  // Adiantamentos
  { codigo: '5014', descricao: 'Adiantam. de Salário', tipo: 'desconto', categoria: 'Adiantamentos' },
  { codigo: '5015', descricao: 'Adiantam. 13º Salário', tipo: 'desconto', categoria: 'Adiantamentos' },
  { codigo: '5016', descricao: 'Adiantam. Vantagens 13º', tipo: 'desconto', categoria: 'Adiantamentos' },
  { codigo: '5017', descricao: 'Outros Adiantamentos', tipo: 'desconto', categoria: 'Adiantamentos', permitePersonalizacao: true },
  
  // ========== BENEFÍCIOS ==========
  // Descontos de Benefício
  { codigo: 'B001', descricao: 'Desc. Rondas Não Realizadas', tipo: 'beneficio', categoria: 'Descontos de Benefício' },
  { codigo: 'B002', descricao: 'Desc. Ajuste dos Benefícios', tipo: 'beneficio', categoria: 'Descontos de Benefício' },
  { codigo: 'B003', descricao: 'Desc. Outros Benefícios', tipo: 'beneficio', categoria: 'Descontos de Benefício', permitePersonalizacao: true },
  
  // Reembolsos
  { codigo: 'B010', descricao: 'Reembolsos', tipo: 'beneficio', categoria: 'Reembolsos' },
  { codigo: 'B011', descricao: 'Outros Reembolsos', tipo: 'beneficio', categoria: 'Reembolsos', permitePersonalizacao: true },
];

// ============================================
// MAPA DE NORMALIZAÇÃO (variações → padrão)
// ============================================

const MAPA_NORMALIZACAO: Record<string, string> = {
  // Variações de "Adiantam. de Salário"
  'adiantamento de salário': 'Adiantam. de Salário',
  'adiantamento de salario': 'Adiantam. de Salário',
  'adiantam de salário': 'Adiantam. de Salário',
  'adiantam de salario': 'Adiantam. de Salário',
  'adiantam. salário': 'Adiantam. de Salário',
  'adiantam. salario': 'Adiantam. de Salário',
  'adiant. de salário': 'Adiantam. de Salário',
  'adiant. de salario': 'Adiantam. de Salário',
  'adiant. salário': 'Adiantam. de Salário',
  'adiant. salario': 'Adiantam. de Salário',
  
  // Variações de "Adiantam. 13º Salário"
  'adiantamento 13º salário': 'Adiantam. 13º Salário',
  'adiantamento 13 salário': 'Adiantam. 13º Salário',
  'adiantamento 13º salario': 'Adiantam. 13º Salário',
  'adiantamento 13 salario': 'Adiantam. 13º Salário',
  'adiantam. 13 salário': 'Adiantam. 13º Salário',
  'adiantam. 13 salario': 'Adiantam. 13º Salário',
  'adiantam 13º salário': 'Adiantam. 13º Salário',
  'adiantam 13 salário': 'Adiantam. 13º Salário',
  
  // Variações de "Adiantam. Vantagens 13º"
  'adiantamento vantagens 13º': 'Adiantam. Vantagens 13º',
  'adiantamento vantagens 13': 'Adiantam. Vantagens 13º',
  'adiantam vantagens 13º': 'Adiantam. Vantagens 13º',
  'adiantam vantagens 13': 'Adiantam. Vantagens 13º',
  
  // Variações de "INSS 13º"
  'inss 13': 'INSS 13º',
  'inss 13o': 'INSS 13º',
  'inss décimo terceiro': 'INSS 13º',
  'inss decimo terceiro': 'INSS 13º',
  
  // Variações de "INSS Férias"
  'inss ferias': 'INSS Férias',
  'inss de férias': 'INSS Férias',
  'inss de ferias': 'INSS Férias',
  
  // Variações de Serviços
  'folhas de pagamento': 'Folhas de Pagamento',
  'serviços externos folhas': 'Folhas de Pagamento',
  'serviços externos (folhas de pagamento)': 'Folhas de Pagamento',
  'serv. externos folhas': 'Folhas de Pagamento',
  'controle de rondas': 'Controle de Rondas Palmeiras',
  'serviços externos rondas': 'Controle de Rondas Palmeiras',
  'serviços externos (controle de rondas)': 'Controle de Rondas Palmeiras',
  'serv. externos rondas': 'Controle de Rondas Palmeiras',
  'supervisão palmeiras': 'Supervisão Palmeiras',
  'supervisao palmeiras': 'Supervisão Palmeiras',
  'supervisão (palmeiras)': 'Supervisão Palmeiras',
  
  // Variações de 13º Salário
  '13 salário': '13º Salário',
  '13º salario': '13º Salário',
  '13 salario': '13º Salário',
  'decimo terceiro salário': '13º Salário',
  '13 salário 1ª parcela': '13º Salário 1ª Parcela',
  '13º salario 1ª parcela': '13º Salário 1ª Parcela',
  '13 salario 1ª parcela': '13º Salário 1ª Parcela',
  '13º salário primeira parcela': '13º Salário 1ª Parcela',
  '13 salário 2ª parcela': '13º Salário 2ª Parcela',
  '13º salario 2ª parcela': '13º Salário 2ª Parcela',
  '13 salario 2ª parcela': '13º Salário 2ª Parcela',
  '13º salário segunda parcela': '13º Salário 2ª Parcela',
  
  // Variações de Vantagens 13º
  'vantagens 13': 'Vantagens 13º',
  'vantagens décimo terceiro': 'Vantagens 13º',
  'vantagens decimo terceiro': 'Vantagens 13º',
  
  // Variações de Rescisão
  '13 proporc. rescisão': '13º Proporc. Rescisão',
  '13º proporc rescisão': '13º Proporc. Rescisão',
  '13º proporcional rescisão': '13º Proporc. Rescisão',
  'decimo terceiro proporcional rescisão': '13º Proporc. Rescisão',
  'férias proporc. rescisão': 'Férias Proporc. Rescisão',
  'ferias proporc. rescisão': 'Férias Proporc. Rescisão',
  'férias proporcional rescisão': 'Férias Proporc. Rescisão',
  '1/3 férias proporc. rescisão': '1/3 Férias proporc. Rescisão',
  '1/3 ferias proporc. rescisão': '1/3 Férias proporc. Rescisão',
  'um terço férias rescisão': '1/3 Férias proporc. Rescisão',
  'plr proporc. rescisão': 'PLR Proporc. Rescisão',
  'plr proporcional rescisão': 'PLR Proporc. Rescisão',
  
  // Variações de Descontos
  'desc rondas não realizadas': 'Desc. Rondas Não Realizadas',
  'desconto rondas não realizadas': 'Desc. Rondas Não Realizadas',
  'rondas não realizadas': 'Desc. Rondas Não Realizadas',
  'desc avaria utilitário': 'Desc. Avaria Utilitário (Parcela)',
  'desconto avaria utilitário': 'Desc. Avaria Utilitário (Parcela)',
  'avaria utilitário': 'Desc. Avaria Utilitário (Parcela)',
  'desc. ajuste dos benefícios': 'Desc. Ajuste dos Benefícios',
  'desc ajuste dos benefícios': 'Desc. Ajuste dos Benefícios',
  'desconto ajuste benefícios': 'Desc. Ajuste dos Benefícios',
  
  // Variações de Benefícios
  'reembolso uber': 'Reembolsos',
  'reembolso (uber)': 'Reembolsos',
  'reembolsos (uber)': 'Reembolsos',
  'reembolsos uber': 'Reembolsos',
  'reembolso': 'Reembolsos',
  'uber': 'Reembolsos',
};

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Normaliza uma descrição para o padrão oficial.
 * Retorna a descrição padronizada se encontrada, ou a original caso contrário.
 */
export function normalizarDescricao(descricao: string): string {
  if (!descricao) return descricao;
  
  const descricaoLower = descricao.trim().toLowerCase();
  
  // Primeiro, verificar se já está no padrão
  const eventoExato = EVENTOS_PADRONIZADOS.find(
    e => e.descricao.toLowerCase() === descricaoLower
  );
  if (eventoExato) return eventoExato.descricao;
  
  // Segundo, verificar no mapa de normalização
  const descricaoPadrao = MAPA_NORMALIZACAO[descricaoLower];
  if (descricaoPadrao) return descricaoPadrao;
  
  // Terceiro, buscar por similaridade (contém palavras-chave)
  const descricaoSimilar = buscarPorSimilaridade(descricaoLower);
  if (descricaoSimilar) return descricaoSimilar;
  
  // Se não encontrar, retornar a original (evento personalizado)
  return descricao.trim();
}

/**
 * Busca descrição por similaridade usando palavras-chave
 */
function buscarPorSimilaridade(descricaoLower: string): string | null {
  // Adiantamento de Salário
  if (
    descricaoLower.includes('adiant') && 
    descricaoLower.includes('sal') &&
    !descricaoLower.includes('13')
  ) {
    return 'Adiantam. de Salário';
  }
  
  // Adiantamento 13º Salário
  if (
    descricaoLower.includes('adiant') && 
    descricaoLower.includes('13') &&
    !descricaoLower.includes('vantag')
  ) {
    return 'Adiantam. 13º Salário';
  }
  
  // Adiantamento Vantagens 13º
  if (
    descricaoLower.includes('adiant') && 
    descricaoLower.includes('vantag') &&
    descricaoLower.includes('13')
  ) {
    return 'Adiantam. Vantagens 13º';
  }
  
  // INSS 13º
  if (descricaoLower.includes('inss') && descricaoLower.includes('13')) {
    return 'INSS 13º';
  }
  
  // INSS Férias
  if (descricaoLower.includes('inss') && descricaoLower.includes('fer')) {
    return 'INSS Férias';
  }
  
  return null;
}

/**
 * Valida se uma descrição é reconhecida pelo sistema
 */
export function isDescricaoValida(descricao: string): boolean {
  if (!descricao) return false;
  
  const normalizada = normalizarDescricao(descricao);
  const descricaoLower = normalizada.toLowerCase();
  
  return EVENTOS_PADRONIZADOS.some(
    e => e.descricao.toLowerCase() === descricaoLower
  );
}

/**
 * Retorna o código contábil para uma descrição
 */
export function getCodigoContabil(descricao: string, tipo: TipoEvento): string {
  const normalizada = normalizarDescricao(descricao);
  const evento = EVENTOS_PADRONIZADOS.find(
    e => e.descricao === normalizada && e.tipo === tipo
  );
  
  if (evento) return evento.codigo;
  
  // Códigos padrão para eventos personalizados
  switch (tipo) {
    case 'provento': return '0308';  // Outros Serviços
    case 'desconto': return '5013';  // Outros Descontos
    case 'beneficio': return 'B003'; // Desc. Outros Benefícios
    default: return '0000';
  }
}

/**
 * Retorna lista de eventos por tipo (para uso em selects/menus)
 */
export function getEventosPorTipo(tipo: TipoEvento): DescricaoEvento[] {
  return EVENTOS_PADRONIZADOS.filter(e => e.tipo === tipo);
}

/**
 * Normaliza um evento excepcional completo
 */
export function normalizarEvento(evento: EventoExcepcional): EventoExcepcional {
  return {
    ...evento,
    descricao: normalizarDescricao(evento.descricao),
    valor: Math.abs(evento.valor) // Garantir valor positivo
  };
}

/**
 * Normaliza um array de eventos excepcionais
 */
export function normalizarEventos(eventos: EventoExcepcional[]): EventoExcepcional[] {
  if (!eventos || !Array.isArray(eventos)) return [];
  return eventos.map(normalizarEvento);
}

/**
 * Verifica se dois eventos são duplicados (mesma descrição normalizada e tipo)
 */
export function isDuplicado(evento1: EventoExcepcional, evento2: EventoExcepcional): boolean {
  const desc1 = normalizarDescricao(evento1.descricao);
  const desc2 = normalizarDescricao(evento2.descricao);
  return desc1 === desc2 && evento1.tipo === evento2.tipo;
}

/**
 * Remove eventos duplicados de um array, mantendo o primeiro
 */
export function removerDuplicados(eventos: EventoExcepcional[]): EventoExcepcional[] {
  if (!eventos || !Array.isArray(eventos)) return [];
  
  const vistos = new Set<string>();
  return eventos.filter(evento => {
    const chave = `${normalizarDescricao(evento.descricao)}:${evento.tipo}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}
