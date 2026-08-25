import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useThemeContext();

  const getIcon = () => {
    return isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (theme === 'dark') return 'Escuro';
    return 'Claro';
  };

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-all duration-200 
          text-blue-300 
          hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900 ${className}`}
        title={`Tema: ${getLabel()}`}
        aria-label={`Alterar tema. Atual: ${getLabel()}`}
      >
        {getIcon()}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
        text-gray-600 dark:text-gray-300 
        hover:bg-gray-100 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900 ${className}`}
      aria-label={`Alterar tema. Atual: ${getLabel()}`}
    >
      {getIcon()}
      <span className="text-sm">{getLabel()}</span>
    </button>
  );
}
