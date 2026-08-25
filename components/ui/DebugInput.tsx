import React from 'react';

interface DebugInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

const DebugInput: React.FC<DebugInputProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder,
  required,
  name
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('DebugInput - Input recebido:', e.target.value);
    console.log('DebugInput - Name:', e.target.name);
    
    // Apenas permitir números para CNPJ e telefone
    let cleanValue = e.target.value;
    if (name === 'cnpj' || name === 'telefone') {
      cleanValue = e.target.value.replace(/\D/g, '');
      console.log('DebugInput - Valor limpo:', cleanValue);
    }
    
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: cleanValue,
        name: name || ''
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(newEvent);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} (DEBUG - apenas números)
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="block w-full px-3 py-2 border border-red-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
      />
      <small className="text-gray-500">Valor atual: "{value}" (length: {value.length})</small>
    </div>
  );
};

export default DebugInput;