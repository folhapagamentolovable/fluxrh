// Utilitários para formatação de datas

/**
 * Corrige problema de fuso horário ao exibir datas
 * Adiciona 'T00:00:00' para forçar horário local
 */
export const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

/**
 * Formata data para exibição em formato brasileiro (dd/mm/aaaa)
 * Usado em formulários para melhor legibilidade
 */
export const formatDateBR = (dateString: string): string => {
    return formatDateForDisplay(dateString);
};

/**
 * Converte data do formato brasileiro para ISO (aaaa-mm-dd)
 * Usado ao enviar dados para o banco
 */
export const formatDateISO = (dateString: string): string => {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};