import React from 'react';

interface DateInputProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    className?: string;
    placeholder?: string;
}

/**
 * Componente de input para datas com formatação brasileira
 * Permite digitar e exibe datas no formato dd/mm/aaaa
 */
const DateInput: React.FC<DateInputProps> = ({
    label,
    name,
    value,
    onChange,
    required = false,
    className = '',
    placeholder = 'dd/mm/aaaa'
}) => {
    // Converte valor ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
    const formatToBrazilian = (isoDate: string): string => {
        if (!isoDate) return '';
        
        // Se é uma data ISO válida (yyyy-mm-dd)
        if (isoDate.includes('-') && isoDate.length === 10) {
            const [year, month, day] = isoDate.split('-');
            return `${day}/${month}/${year}`;
        }
        
        // Se é um valor parcial sendo digitado, aplicar máscara
        return applyMask(isoDate);
    };

    // Converte formato brasileiro (dd/mm/yyyy) para ISO (yyyy-mm-dd)
    const formatToISO = (brazilianDate: string): string => {
        if (!brazilianDate) return '';
        const cleaned = brazilianDate.replace(/\D/g, '');
        
        // Permitir digitação parcial - só converter quando tiver data completa
        if (cleaned.length < 8) return '';
        
        const day = cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        const year = cleaned.substring(4, 8);
        
        // Validar se é uma data válida
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date.getFullYear() != parseInt(year) || 
            date.getMonth() != parseInt(month) - 1 || 
            date.getDate() != parseInt(day)) {
            return '';
        }
        
        return `${year}-${month}-${day}`;
    };

    // Aplica máscara dd/mm/aaaa
    const applyMask = (value: string): string => {
        const cleaned = value.replace(/\D/g, '');
        let masked = cleaned;
        
        if (cleaned.length >= 2) {
            masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
        }
        if (cleaned.length >= 4) {
            masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4) + '/' + cleaned.substring(4, 8);
        }
        
        return masked;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const maskedValue = applyMask(inputValue);
        
        // Tentar converter para ISO, mas manter valor original se não conseguir
        const isoValue = formatToISO(maskedValue);
        
        // Criar evento sintético
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                name,
                value: isoValue || maskedValue // Usar ISO se disponível, senão manter o valor digitado
            }
        };
        
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    };

    return (
        <div className={className}>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type="text"
                id={name}
                name={name}
                value={formatToBrazilian(value)}
                onChange={handleInputChange}
                required={required}
                placeholder={placeholder}
                maxLength={10}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
    );
};

export default DateInput;