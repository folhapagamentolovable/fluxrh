import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verificar preferência salva no localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fluxpay-theme') as Theme | null;
      return saved || 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Função para determinar o tema resolvido
  const getResolvedTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Aplicar tema no documento
  const applyTheme = useCallback((resolved: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    setResolvedTheme(resolved);
  }, []);

  // Efeito para aplicar o tema quando muda
  useEffect(() => {
    const resolved = getResolvedTheme();
    applyTheme(resolved);
    
    // Salvar preferência
    localStorage.setItem('fluxpay-theme', theme);
  }, [theme, getResolvedTheme, applyTheme]);

  // Listener para mudanças na preferência do sistema
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Inicialização
  useEffect(() => {
    const resolved = getResolvedTheme();
    applyTheme(resolved);
  }, [getResolvedTheme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      return 'light';
    });
  }, []);

  const setThemeMode = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeMode,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
