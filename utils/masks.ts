// Utilitários para máscaras de formatação

// Máscara para telefone: (00) 0000-0000 ou (00) 00000-0000
export const phoneMask = (value: string): string => {
  if (!value) return '';
  
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita o tamanho máximo
  const limitedNumbers = numbers.substring(0, 11);
  
  // Aplica a máscara baseada no tamanho
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return limitedNumbers.replace(/(\d{2})(\d+)/, '($1) $2');
  } else if (limitedNumbers.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return limitedNumbers.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  } else {
    // Celular: (00) 00000-0000
    return limitedNumbers.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
  }
};

// Máscara para CNPJ: 00.000.000/0000-00
export const cnpjMask = (value: string): string => {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  const limitedNumbers = numbers.substring(0, 14);
  
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 5) {
    return limitedNumbers.replace(/(\d{2})(\d+)/, '$1.$2');
  } else if (limitedNumbers.length <= 8) {
    return limitedNumbers.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  } else if (limitedNumbers.length <= 12) {
    return limitedNumbers.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  } else {
    return limitedNumbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
  }
};

// Máscara para CPF: 000.000.000-00
export const cpfMask = (value: string): string => {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  const limitedNumbers = numbers.substring(0, 11);
  
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return limitedNumbers.replace(/(\d{3})(\d+)/, '$1.$2');
  } else if (limitedNumbers.length <= 9) {
    return limitedNumbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  } else {
    return limitedNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
  }
};

// Máscara para CTPS número: 00.000
export const ctpsNumberMask = (value: string): string => {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  const limitedNumbers = numbers.substring(0, 5);
  
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else {
    return limitedNumbers.replace(/(\d{2})(\d+)/, '$1.$2');
  }
};

// Máscara para CTPS série: 000
export const ctpsSerieMask = (value: string): string => {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  
  return numbers.substring(0, 3); // Limita a 3 dígitos
};

// Função para remover máscara (manter apenas números)
export const removeMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Função para aplicar máscara baseada no tipo
export const applyMask = (value: string, type: 'phone' | 'cnpj' | 'cpf' | 'ctps-number' | 'ctps-serie'): string => {
  switch (type) {
    case 'phone':
      return phoneMask(value);
    case 'cnpj':
      return cnpjMask(value);
    case 'cpf':
      return cpfMask(value);
    case 'ctps-number':
      return ctpsNumberMask(value);
    case 'ctps-serie':
      return ctpsSerieMask(value);
    default:
      return value;
  }
};