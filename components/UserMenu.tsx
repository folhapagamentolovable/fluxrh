import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, ChevronDown } from 'lucide-react';

const UserMenu: React.FC = () => {
  const { user, profile, roles, isAdmin, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair?')) {
      await signOut();
    }
  };

  if (!user) return null;

  const displayName = profile?.user_name || user.email?.split('@')[0] || 'Usuário';
  const displayEmail = profile?.email || user.email || '';

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão do Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold text-white">{displayName}</p>
          <p className="text-xs text-blue-200">{isAdmin ? 'Administrador' : 'Usuário'}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Informações do Usuário */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
              </div>
            </div>
            
            {/* Badge de Role */}
            <div className="mt-2">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                  <Shield className="w-3 h-3" />
                  Administrador
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                  <User className="w-3 h-3" />
                  Usuário
                </span>
              )}
            </div>
          </div>

          {/* Opções do Menu */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Implementar página de perfil
                alert('Página de perfil em desenvolvimento');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Meu Perfil
            </button>
            
            {/* Botão de Diagnóstico */}
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Diagnóstico enviado para o console (F12)');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Diagnóstico de Roles
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-200 pt-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
