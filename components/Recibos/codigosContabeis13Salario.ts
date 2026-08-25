// Códigos contábeis para HOLERITE DE 13° SALÁRIO
// Este arquivo mapeia TODOS os itens de 13° excluídos do holerite de salário
import { normalizarDescricao } from '../../utils/eventosExcepcionaisValidator';

export interface LancamentoHolerite13 {
  codigo: string;
  descricao: string;
  referencia?: string;
  unidade?: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}

// Lista COMPLETA de descrições válidas para holerite de 13° salário
// Estes são exatamente os itens excluídos do holerite de salário regular
const ITENS_13_SALARIO = [
  // Proventos de 13°
  '13º Salário',
  'Vantagens 13º',
  '13º Salário 1ª Parcela',
  '13º Salário 2ª Parcela',
  '13º Salário Vantagens 1ª Parcela',
  '13º Salário Vantagens 2ª Parcela',
  'Diferença Media Hora 13º Salário',
  // Descontos de 13°
  'INSS 13º',
  'INSS Férias',
  'INSS Diferença 13º Salário',
  'Adiantam. 13º Salário',
  'Adiantam. Vantagens 13º',
];

/**
 * Verifica se um item é relacionado ao 13° salário
 */
export function isItem13Salario(descricao: string): boolean {
  const descNormalizada = normalizarDescricao(descricao);
  return ITENS_13_SALARIO.some(
    item => normalizarDescricao(item) === descNormalizada
  );
}

/**
 * Mapeia os dados calculados para lançamentos do holerite de 13° SALÁRIO
 * Inclui TODOS os itens de 13° que foram excluídos do holerite de salário regular
 */
export function mapearFolhaParaHolerite13Salario(
  resultado: any,
  eventosExcepcionais?: any[]
): LancamentoHolerite13[] {
  const lancamentos: LancamentoHolerite13[] = [];

  // ========================================
  // PROVENTOS DE 13° (campos específicos do resultado)
  // ========================================

  // 13º Salário (Integral)
  if (resultado.decimo_terceiro_integral > 0) {
    lancamentos.push({
      codigo: '0520',
      descricao: '13º Salário',
      referencia: '',
      unidade: 'R$',
      valor: resultado.decimo_terceiro_integral,
      tipo: 'provento'
    });
  }

  // Vantagens 13º
  if (resultado.vantagens_13 > 0) {
    lancamentos.push({
      codigo: '0521',
      descricao: 'Vantagens 13º',
      referencia: '',
      unidade: 'R$',
      valor: resultado.vantagens_13,
      tipo: 'provento'
    });
  }

  // 13º Salário 1ª Parcela
  if (resultado.decimo_terceiro_primeira_parcela > 0) {
    lancamentos.push({
      codigo: '0522',
      descricao: '13º Salário 1ª Parcela',
      referencia: '',
      unidade: 'R$',
      valor: resultado.decimo_terceiro_primeira_parcela,
      tipo: 'provento'
    });
  }

  // 13º Salário 2ª Parcela
  if (resultado.decimo_terceiro_segunda_parcela > 0) {
    lancamentos.push({
      codigo: '0523',
      descricao: '13º Salário 2ª Parcela',
      referencia: '',
      unidade: 'R$',
      valor: resultado.decimo_terceiro_segunda_parcela,
      tipo: 'provento'
    });
  }

  // 13º Salário Vantagens 1ª Parcela
  if (resultado.decimo_terceiro_vantagens_primeira_parcela > 0) {
    lancamentos.push({
      codigo: '0524',
      descricao: '13º Salário Vantagens 1ª Parcela',
      referencia: '',
      unidade: 'R$',
      valor: resultado.decimo_terceiro_vantagens_primeira_parcela,
      tipo: 'provento'
    });
  }

  // 13º Salário Vantagens 2ª Parcela
  if (resultado.decimo_terceiro_vantagens_segunda_parcela > 0) {
    lancamentos.push({
      codigo: '0525',
      descricao: '13º Salário Vantagens 2ª Parcela',
      referencia: '',
      unidade: 'R$',
      valor: resultado.decimo_terceiro_vantagens_segunda_parcela,
      tipo: 'provento'
    });
  }

  // ========================================
  // DESCONTOS DE 13° (campos específicos do resultado)
  // ========================================

  // INSS 13º
  if (resultado.inss_13 > 0) {
    lancamentos.push({
      codigo: '5018',
      descricao: 'INSS 13º',
      referencia: '',
      unidade: 'R$',
      valor: resultado.inss_13,
      tipo: 'desconto'
    });
  }

  // INSS Férias
  if (resultado.inss_ferias > 0) {
    lancamentos.push({
      codigo: '5019',
      descricao: 'INSS Férias',
      referencia: '',
      unidade: 'R$',
      valor: resultado.inss_ferias,
      tipo: 'desconto'
    });
  }

  // Adiantamento 13º Salário
  if (resultado.adiantamento_13_salario > 0) {
    lancamentos.push({
      codigo: '5015',
      descricao: 'Adiantam. 13º Salário',
      referencia: '',
      unidade: 'R$',
      valor: resultado.adiantamento_13_salario,
      tipo: 'desconto'
    });
  }

  // Adiantamento Vantagens 13º
  if (resultado.adiantamento_vantagens_13 > 0) {
    lancamentos.push({
      codigo: '5016',
      descricao: 'Adiantam. Vantagens 13º',
      referencia: '',
      unidade: 'R$',
      valor: resultado.adiantamento_vantagens_13,
      tipo: 'desconto'
    });
  }

  // ========================================
  // EVENTOS EXCEPCIONAIS (APENAS ITENS DE 13°)
  // Processa eventos que vieram da lista de eventos excepcionais
  // que correspondem aos itens de 13° salário
  // ========================================
  if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach(evento => {
      // Ignorar benefícios
      if (evento.tipo === 'beneficio') return;
      
      // Apenas processar itens de 13° salário
      if (!isItem13Salario(evento.descricao)) return;
      
      const descricaoNormalizada = normalizarDescricao(evento.descricao);
      
      // Verificar se já foi adicionado pelos campos do resultado (evitar duplicação)
      const jaExiste = lancamentos.some(l => 
        normalizarDescricao(l.descricao) === descricaoNormalizada
      );
      if (jaExiste) return;
      
      // Definir código contábil baseado no tipo e descrição
      let codigo = evento.tipo === 'provento' ? '0525' : '5017';
      
      // Mapear descrição para código contábil específico
      if (evento.tipo === 'provento') {
        if (descricaoNormalizada === '13º Salário') codigo = '0520';
        else if (descricaoNormalizada === 'Vantagens 13º') codigo = '0521';
        else if (descricaoNormalizada === '13º Salário 1ª Parcela') codigo = '0522';
        else if (descricaoNormalizada === '13º Salário 2ª Parcela') codigo = '0523';
        else if (descricaoNormalizada === '13º Salário Vantagens 1ª Parcela') codigo = '0524';
        else if (descricaoNormalizada === '13º Salário Vantagens 2ª Parcela') codigo = '0525';
        else if (descricaoNormalizada === 'Diferença Media Hora 13º Salário') codigo = '0526';
      } else if (evento.tipo === 'desconto') {
        if (descricaoNormalizada === 'INSS 13º') codigo = '5018';
        else if (descricaoNormalizada === 'INSS Férias') codigo = '5019';
        else if (descricaoNormalizada === 'INSS Diferença 13º Salário') codigo = '5021';
        else if (descricaoNormalizada === 'Adiantam. 13º Salário') codigo = '5015';
        else if (descricaoNormalizada === 'Adiantam. Vantagens 13º') codigo = '5016';
      }
      
      lancamentos.push({
        codigo,
        descricao: descricaoNormalizada,
        referencia: '',
        unidade: 'R$',
        valor: Math.abs(evento.valor),
        tipo: evento.tipo
      });
    });
  }

  // ========================================
  // ORDENAÇÃO: Proventos primeiro (por código), depois Descontos (por código)
  // ========================================
  const proventos = lancamentos.filter(l => l.tipo === 'provento');
  const descontos = lancamentos.filter(l => l.tipo === 'desconto');
  
  proventos.sort((a, b) => a.codigo.localeCompare(b.codigo));
  descontos.sort((a, b) => a.codigo.localeCompare(b.codigo));
  
  return [...proventos, ...descontos];
}

/**
 * Formata valor monetário no padrão brasileiro
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}
