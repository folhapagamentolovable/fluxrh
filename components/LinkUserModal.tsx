import React, { useState, useEffect } from 'react';
import { X, Link2, Unlink, User, Mail, Search } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

interface LinkUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  funcionario: {
    id: string;
    nome_completo: string;
    user_id?: string | null;
  };
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  email: string;
}

const LinkUserModal: React.FC<LinkUserModalProps> = ({
  isOpen,
  onClose,
  funcionario,
  onSuccess
}) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [linkedUserEmail, setLinkedUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (funcionario.user_id) {
        loadLinkedUser();
      }
    }
  }, [isOpen, funcionario.user_id]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Buscar usuários via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        return;
      }

      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      });

      if (response.error) {
        return;
      }

      const usersData = response.data?.users || [];
      // Filtrar para mostrar apenas usuários não vinculados a outros funcionários
      const { data: linkedFuncionarios } = await supabase
        .from('funcionarios')
        .select('user_id')
        .not('user_id', 'is', null);

      const linkedUserIds = new Set(
        linkedFuncionarios
          ?.filter(f => f.user_id !== funcionario.user_id)
          .map(f => f.user_id) || []
      );

      const availableUsers = usersData.filter(
        (u: UserOption) => !linkedUserIds.has(u.id)
      );

      setUsers(availableUsers);
    } catch (error) {
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLinkedUser = async () => {
    if (!funcionario.user_id) return;
    
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      });

      if (response.data?.users) {
        const linkedUser = response.data.users.find(
          (u: UserOption) => u.id === funcionario.user_id
        );
        setLinkedUserEmail(linkedUser?.email || null);
      }
    } catch (error) {
    }
  };

  const handleLink = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ user_id: selectedUserId })
        .eq('id', funcionario.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao vincular usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Deseja realmente desvincular este usuário do funcionário?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ user_id: null })
        .eq('id', funcionario.id);

      if (error) throw error;

      setLinkedUserEmail(null);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao desvincular usuário');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Vincular Usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Funcionário Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Funcionário:</span>
            </div>
            <p className="font-medium mt-1">{funcionario.nome_completo}</p>
          </div>

          {/* Current Link */}
          {funcionario.user_id && linkedUserEmail && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Mail className="w-4 h-4" />
                    <span>Vinculado a:</span>
                  </div>
                  <p className="font-medium text-green-800 mt-1">{linkedUserEmail}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUnlink}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Desvincular
                </Button>
              </div>
            </div>
          )}

          {/* Search and Select User */}
          {!funcionario.user_id && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Selecione um usuário para vincular:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-4 text-muted-foreground">
                  Carregando usuários...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                  {filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedUserId === user.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="user"
                        value={user.id}
                        checked={selectedUserId === user.id}
                        onChange={() => setSelectedUserId(user.id)}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {!funcionario.user_id && (
            <Button
              type="button"
              onClick={handleLink}
              disabled={!selectedUserId || loading}
            >
              {loading ? 'Vinculando...' : 'Vincular Usuário'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkUserModal;
