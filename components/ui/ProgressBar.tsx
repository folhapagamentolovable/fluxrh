import React from 'react';

export interface ProgressBarProps {
    /** Texto principal exibido (ex: "Gerando folhas de pagamento...") */
    label?: string;
    /** Subtexto / contexto atual (ex: nome do funcionário ou mês sendo processado) */
    sublabel?: string;
    /** Valor atual */
    current: number;
    /** Total */
    total: number;
    /** Cor da barra: 'blue' | 'green' | 'purple' | 'orange' | 'red' */
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    /** Renderizar como overlay flutuante centralizado */
    overlay?: boolean;
    /** Esconde o componente quando `total === 0` (default true) */
    hideWhenIdle?: boolean;
    /** Mostrar ícone */
    icon?: string;
}

const colorMap = {
    blue:   { bar: 'bg-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-800',   sub: 'text-blue-700' },
    green:  { bar: 'bg-green-600',  bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  sub: 'text-green-700' },
    purple: { bar: 'bg-purple-600', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', sub: 'text-purple-700' },
    orange: { bar: 'bg-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', sub: 'text-orange-700' },
    red:    { bar: 'bg-red-600',    bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    sub: 'text-red-700' },
};

const ProgressBar: React.FC<ProgressBarProps> = ({
    label = 'Processando...',
    sublabel,
    current,
    total,
    color = 'blue',
    overlay = false,
    hideWhenIdle = true,
    icon,
}) => {
    if (hideWhenIdle && total === 0) return null;

    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    const c = colorMap[color];

    const content = (
        <div className={`${c.bg} ${c.border} border rounded-lg px-4 py-3 shadow-sm w-full`}>
            <div className="flex items-center justify-between mb-2 gap-2">
                <span className={`text-sm font-medium ${c.text} truncate`}>
                    {icon && <span className="mr-1">{icon}</span>}
                    {label}
                </span>
                <span className={`text-sm font-semibold ${c.sub} whitespace-nowrap`}>
                    {total > 0 ? `${current} / ${total}` : ''}
                    {total > 0 && <span className="ml-2">({percent}%)</span>}
                </span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`${c.bar} h-2.5 rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {sublabel && (
                <div className={`mt-2 text-xs ${c.sub} truncate`}>
                    {sublabel}
                </div>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                <div className="max-w-md w-full">
                    {content}
                </div>
            </div>
        );
    }

    return content;
};

export default ProgressBar;
