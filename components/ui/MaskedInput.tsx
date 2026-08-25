import React from 'react';
import { applyMask, removeMask } from '../../utils/masks';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  mask: 'phone' | 'cnpj' | 'cpf' | 'ctps-number' | 'ctps-serie';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  storeUnmasked?: boolean; // Se true, armazena valor sem máscara
}

const MaskedInput: React.FC<MaskedInputProps> = ({ 
  label, 
  mask, 
  value, 
  onChange, 
  icon, 
  id, 
  storeUnmasked = false,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maskedValue = applyMask(inputValue, mask);
    
    // Cria um novo evento com o valor mascarado ou sem máscara
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: storeUnmasked ? removeMask(maskedValue) : maskedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(newEvent);
  };

  // Exibe o valor com máscara, mas pode armazenar sem máscara
  const displayValue = storeUnmasked ? applyMask(value, mask) : value;

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          value={displayValue}
          onChange={handleChange}
          className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            icon ? 'pl-10' : ''
          }`}
          {...props}
        />
      </div>
    </div>
  );
};

export default MaskedInput;