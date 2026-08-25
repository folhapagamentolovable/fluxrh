
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) => {
    const baseClasses = 'rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };
    
    const variantClasses = {
        primary: 'bg-[#001f3f] text-white hover:bg-blue-800 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted focus:ring-primary/50',
    };

    const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';

    return (
        <button 
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className}`} 
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
