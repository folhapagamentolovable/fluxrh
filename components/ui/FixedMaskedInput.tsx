import React from 'react';

interface FixedMaskedInputProps {
  label: string;
  mask: 'phone' | 'cnpj' | 'cpf' | 'ctps-number' | 'ctps-serie';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
  storeUnmasked?: boolean;
  icon?: React.ReactNode;
}

const FixedMaskedInput: React.FC<FixedMaskedInputProps> = ({ 
  label, 
  mask, 
  value, 
  onChange, 
  placeholder,
  required,
  name,
  storeUnmasked = false,
  icon
}) => {
  
  // Função para aplicar máscara
  const applyMask = (inputValue: string, maskType: string): string => {
    // Remove tudo que não é número
    const numbers = inputValue.replace(/\D/g, '');
    
    switch (maskType) {
      case 'cnpj': {
        const limited = numbers.substring(0, 14);
        if (limited.length <= 2) return limited;
        if (limited.length <= 5) return limited.replace(/^(\d{2})(\d+)/, '$1.$2');
        if (limited.length <= 8) return limited.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
        if (limited.length <= 12) return limited.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
        return limited.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
      }
      
      case 'phone': {
        const limited = numbers.substring(0, 11);
        if (limited.length <= 2) return limited;
        if (limited.length <= 6) return limited.replace(/^(\d{2})(\d+)/, '($1) $2');
        if (limited.length <= 10) return limited.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
        return limited.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
      }
      
      case 'cpf': {
        const limited = numbers.substring(0, 11);
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return limited.replace(/^(\d{3})(\d+)/, '$1.$2');
        if (limited.length <= 9) return limited.replace(/^(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
        return limited.replace(/^(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
      }
      
      case 'ctps-number': {
        const limited = numbers.substring(0, 5);
        if (limited.length <= 2) return limited;
        return limited.replace(/^(\d{2})(\d+)/, '$1.$2');
      }
      
      case 'ctps-serie': {
        return numbers.substring(0, 3);
      }
      
      default:
        return inputValue;
    }
  };

  // Função para remover máscara
  const removeMask = (maskedValue: string): string => {
    return maskedValue.replace(/\D/g, '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maskedValue = applyMask(inputValue, mask);
    
    // Se storeUnmasked for true, armazena apenas números
    const valueToStore = storeUnmasked ? removeMask(maskedValue) : maskedValue;
    
    // Criar novo evento com o valor correto
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: valueToStore,
        name: name || ''
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(newEvent);
  };

  // Valor a ser exibido no input
  const displayValue = storeUnmasked ? applyMask(value, mask) : value;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="text"
          name={name}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </div>
  );
};

export default FixedMaskedInput;