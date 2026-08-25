import React from 'react';

interface SimpleMaskedInputProps {
  label: string;
  mask: 'phone' | 'cnpj' | 'cpf' | 'ctps-number' | 'ctps-serie';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

const SimpleMaskedInput: React.FC<SimpleMaskedInputProps> = ({ 
  label, 
  mask, 
  value, 
  onChange, 
  placeholder,
  required,
  name
}) => {
  
  // Função de máscara simplificada
  const applySimpleMask = (inputValue: string, maskType: string): string => {
    const numbers = inputValue.replace(/\D/g, '');
    
    switch (maskType) {
      case 'cnpj':
        return numbers
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .substring(0, 18);
          
      case 'phone':
        if (numbers.length <= 10) {
          return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
        } else {
          return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);
        }
        
      case 'cpf':
        return numbers
          .replace(/^(\d{3})(\d)/, '$1.$2')
          .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1-$2')
          .substring(0, 14);
          
      default:
        return inputValue;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maskedValue = applySimpleMask(inputValue, mask);
    
    // Criar novo evento com valor mascarado
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: maskedValue,
        name: name || ''
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(newEvent);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>
  );
};

export default SimpleMaskedInput;