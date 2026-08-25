import { supabase } from '../lib/supabase';

interface VisibilityConfig {
  id: number;
  tipo_documento: 'holerites' | 'beneficios';
  mes_limite: number;
  ano_limite: number;
  meses_retroativos: number;
  ativo: boolean;
  observacoes: string | null;
}

interface DateRange {
  dataInicio: Date;
  dataFim: Date;
}

/**
 * Busca as configurações de visibilidade do portal
 */
export async function getVisibilityConfigs(): Promise<VisibilityConfig[]> {
  try {
    const { data, error } = await supabase
      .from('portal_visibility_config')
      .select('*')
      .eq('ativo', true);

    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Calcula o período de visibilidade para um tipo de documento
 */
export function calculateVisibilityRange(config: VisibilityConfig): DateRange {
  // Data limite (último dia do mês/ano limite)
  const dataFim = new Date(config.ano_limite, config.mes_limite, 0);
  
  // Data início (primeiro dia do mês inicial calculado)
  const dataInicio = new Date(config.ano_limite, config.mes_limite - config.meses_retroativos, 1);
  
  return { dataInicio, dataFim };
}

/**
 * Verifica se um documento deve ser exibido no portal
 */
export function isDocumentVisible(
  mes: number, 
  ano: number, 
  config: VisibilityConfig
): boolean {
  if (!config.ativo) {
    return false;
  }
  
  const { dataInicio, dataFim } = calculateVisibilityRange(config);
  const documentDate = new Date(ano, mes - 1, 1);
  
  return documentDate >= dataInicio && documentDate <= dataFim;
}

/**
 * Filtra uma lista de documentos baseado nas configurações de visibilidade
 */
export async function filterDocumentsByVisibility<T extends { mes: number; ano: number }>(
  documents: T[],
  tipoDocumento: 'holerites' | 'beneficios'
): Promise<T[]> {
  try {
    const configs = await getVisibilityConfigs();
    const config = configs.find(c => c.tipo_documento === tipoDocumento);
    
    if (!config) {
      // Se não há configuração, exibir todos os documentos (comportamento padrão)
      return documents;
    }
    
    return documents.filter(doc => isDocumentVisible(doc.mes, doc.ano, config));
  } catch (error) {
    // Em caso de erro, retornar todos os documentos para não quebrar a funcionalidade
    return documents;
  }
}

/**
 * Obtém informações sobre o período de visibilidade para exibição ao usuário
 */
export async function getVisibilityInfo(tipoDocumento: 'holerites' | 'beneficios'): Promise<{
  ativo: boolean;
  periodoInicio: string;
  periodoFim: string;
  mesesRetroativos: number;
} | null> {
  try {
    const configs = await getVisibilityConfigs();
    const config = configs.find(c => c.tipo_documento === tipoDocumento);
    
    if (!config) return null;
    
    const { dataInicio, dataFim } = calculateVisibilityRange(config);
    
    return {
      ativo: config.ativo,
      periodoInicio: `${String(dataInicio.getMonth() + 1).padStart(2, '0')}/${dataInicio.getFullYear()}`,
      periodoFim: `${String(dataFim.getMonth() + 1).padStart(2, '0')}/${dataFim.getFullYear()}`,
      mesesRetroativos: config.meses_retroativos
    };
  } catch (error) {
    return null;
  }
}

/**
 * Verifica se há documentos disponíveis para um funcionário no período visível
 */
export async function hasVisibleDocuments(
  funcionarioId: string,
  tipoDocumento: 'holerites' | 'beneficios'
): Promise<boolean> {
  try {
    const configs = await getVisibilityConfigs();
    const config = configs.find(c => c.tipo_documento === tipoDocumento);
    
    if (!config) return true; // Se não há configuração, assumir que há documentos
    
    const { dataInicio, dataFim } = calculateVisibilityRange(config);
    
    const tableName = tipoDocumento === 'holerites' ? 'folha_calculada' : 'folha_calculada';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('mes, ano')
      .eq('funcionario_id', funcionarioId)
      .gte('ano', dataInicio.getFullYear())
      .lte('ano', dataFim.getFullYear())
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return false;
    
    // Verificar se pelo menos um documento está no período visível
    return data.some(doc => isDocumentVisible(doc.mes, doc.ano, config));
  } catch (error) {
    return true; // Em caso de erro, assumir que há documentos
  }
}