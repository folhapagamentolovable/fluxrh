import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';
import { UserPlus, Shield, User, Trash2, Mail, CheckCircle, Loader2, Eye, EyeOff, Building2, Briefcase, Pencil, X, Save, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

type AppRole = 'admin' | 'user' | 'manager' | 'client';

interface Empresa {
  id: string;
  nome_empresa: string;
}

interface PostoTrabalho {
  id: string;
  nome_posto: string;
}

interface ManagerEmpresa {
  empresa_id: string;
}

interface ClientPosto {
  posto_id: string;
}

interface UserData {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  profile: {
    user_name: string | null;
  } | null;
  roles: Array<{ role: AppRole }>;
  manager_empresas?: ManagerEmpresa[];
  client_postos?: ClientPosto[];
}

const UserManagement: React.FC = () => {
  const { isAdmin, session } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [selectedPostos, setSelectedPostos] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    userName: '',
    role: 'user' as AppRole,
    empresaIds: [] as string[],
    postoIds: [] as string[],
  });
  
  // Estado para edição de usuário
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', userName: '' });

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadEmpresas();
      loadPostos();
    }
  }, [isAdmin]);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_empresa')
        .order('nome_empresa');
      
      if (!error && data) {
        setEmpresas(data);
      }
    } catch (error) {
    }
  };

  const loadPostos = async () => {
    try {
      const { data, error } = await supabase
        .from('postos_trabalho')
        .select('id, nome_posto')
        .is('local_area', null)
        .order('nome_posto');
      
      if (!error && data) {
        setPostos(data);
      }
    } catch (error) {
    }
  };

  const callEdgeFunction = async (action: string, params: any) => {
    const response = await supabase.functions.invoke('manage-users', {
      body: { action, ...params },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro na operação');
    }

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await callEdgeFunction('list', {});
      
      // Para cada manager, buscar suas empresas vinculadas
      const usersWithEmpresas = await Promise.all(
        (data.users || []).map(async (user: UserData) => {
          let enriched = { ...user };
          if (user.roles.some(r => r.role === 'manager')) {
            const { data: managerEmpresas } = await supabase
              .from('manager_empresas')
              .select('empresa_id')
              .eq('user_id', user.id);
            enriched.manager_empresas = managerEmpresas || [];
          }
          if (user.roles.some(r => r.role === 'client')) {
            const { data: clientPostos } = await supabase
              .from('client_postos')
              .select('posto_id')
              .eq('user_id', user.id);
            enriched.client_postos = clientPostos || [];
          }
          return enriched;
        })
      );
      
      setUsers(usersWithEmpresas);
    } catch (error: any) {
      showToast(error.message || 'Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    if (!newUser.email || !newUser.userName) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    if (newUser.role === 'manager' && newUser.empresaIds.length === 0) {
      showToast('Selecione pelo menos uma empresa para o Gerente', 'error');
      return;
    }

    if (newUser.role === 'client' && newUser.postoIds.length === 0) {
      showToast('Selecione pelo menos um posto de trabalho para o Cliente', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const result = await callEdgeFunction('create', {
        email: newUser.email,
        password: newUser.password,
        userName: newUser.userName,
        role: newUser.role,
      });

      // Se for manager, vincular às empresas selecionadas
      if (newUser.role === 'manager' && result.userId && newUser.empresaIds.length > 0) {
        const managerEmpresas = newUser.empresaIds.map(empresaId => ({
          user_id: result.userId,
          empresa_id: empresaId,
        }));
        
        await supabase.from('manager_empresas').insert(managerEmpresas);
      }

      // Se for client, vincular aos postos selecionados
      if (newUser.role === 'client' && result.userId && newUser.postoIds.length > 0) {
        const clientPostos = newUser.postoIds.map(postoId => ({
          user_id: result.userId,
          posto_id: postoId,
        }));
        
        await supabase.from('client_postos').insert(clientPostos);
      }

      showToast('Usuário criado com sucesso!', 'success');
      setShowCreateForm(false);
      setNewUser({ email: '', password: '', userName: '', role: 'user', empresaIds: [], postoIds: [] });
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar usuário', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Deseja realmente excluir o usuário ${userName}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await callEdgeFunction('delete', { userId });
      showToast('Usuário excluído com sucesso!', 'success');
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir usuário', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    const roleNames: Record<AppRole, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      user: 'Usuário',
      client: 'Cliente'
    };
    
    // Se mudar para manager, abrir modal de seleção de empresas
    if (newRole === 'manager') {
      setEditingManagerId(userId);
      const { data: existingEmpresas } = await supabase
        .from('manager_empresas')
        .select('empresa_id')
        .eq('user_id', userId);
      setSelectedEmpresas(existingEmpresas?.map(e => e.empresa_id) || []);
      return;
    }

    // Se mudar para client, abrir modal de seleção de postos
    if (newRole === 'client') {
      setEditingClientId(userId);
      const { data: existingPostos } = await supabase
        .from('client_postos')
        .select('posto_id')
        .eq('user_id', userId);
      setSelectedPostos(existingPostos?.map(p => p.posto_id) || []);
      return;
    }
    
    if (!window.confirm(`Alterar permissão para ${roleNames[newRole]}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await callEdgeFunction('updateRole', { userId, newRole });
      
      // Remover vínculos antigos
      await supabase.from('manager_empresas').delete().eq('user_id', userId);
      await supabase.from('client_postos').delete().eq('user_id', userId);
      
      showToast(`Permissão alterada para ${roleNames[newRole]}`, 'success');
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao alterar permissão', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveManagerEmpresas = async () => {
    if (!editingManagerId) return;
    
    if (selectedEmpresas.length === 0) {
      showToast('Selecione pelo menos uma empresa', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      // Atualizar role para manager
      await callEdgeFunction('updateRole', { userId: editingManagerId, newRole: 'manager' });
      
      // Remover vínculos antigos
      await supabase.from('manager_empresas').delete().eq('user_id', editingManagerId);
      
      // Inserir novos vínculos
      const managerEmpresas = selectedEmpresas.map(empresaId => ({
        user_id: editingManagerId,
        empresa_id: empresaId,
      }));
      
      await supabase.from('manager_empresas').insert(managerEmpresas);
      
      showToast('Empresas do gerente atualizadas com sucesso!', 'success');
      setEditingManagerId(null);
      setSelectedEmpresas([]);
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar empresas', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveClientPostos = async () => {
    if (!editingClientId) return;
    
    if (selectedPostos.length === 0) {
      showToast('Selecione pelo menos um posto de trabalho', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await callEdgeFunction('updateRole', { userId: editingClientId, newRole: 'client' });
      
      await supabase.from('client_postos').delete().eq('user_id', editingClientId);
      
      const clientPostos = selectedPostos.map(postoId => ({
        user_id: editingClientId,
        posto_id: postoId,
      }));
      
      await supabase.from('client_postos').insert(clientPostos);
      
      showToast('Postos do cliente atualizados com sucesso!', 'success');
      setEditingClientId(null);
      setSelectedPostos([]);
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar postos', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (user: UserData) => {
    setEditingUserId(user.id);
    setEditForm({
      email: user.email,
      userName: user.profile?.user_name || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ email: '', userName: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;
    
    if (!editForm.email || !editForm.userName) {
      showToast('E-mail e nome são obrigatórios', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await callEdgeFunction('updateUser', { 
        userId: editingUserId, 
        email: editForm.email,
        userName: editForm.userName 
      });
      
      showToast('Usuário atualizado com sucesso!', 'success');
      setEditingUserId(null);
      setEditForm({ email: '', userName: '' });
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar usuário', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      {/* Modal de seleção de empresas para Manager */}
      {editingManagerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg m-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              Empresas do Gerente
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Selecione as empresas que este gerente poderá visualizar:
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto mb-4">
              {empresas.map(empresa => (
                <label key={empresa.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded border hover:bg-amber-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmpresas.includes(empresa.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmpresas([...selectedEmpresas, empresa.id]);
                      } else {
                        setSelectedEmpresas(selectedEmpresas.filter(id => id !== empresa.id));
                      }
                    }}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{empresa.nome_empresa}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setEditingManagerId(null); setSelectedEmpresas([]); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveManagerEmpresas} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de seleção de postos para Client */}
      {editingClientId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg m-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              Postos de Trabalho do Cliente
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Selecione os postos de trabalho que este cliente poderá visualizar:
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto mb-4">
              {postos.map(posto => (
                <label key={posto.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded border hover:bg-green-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPostos.includes(posto.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPostos([...selectedPostos, posto.id]);
                      } else {
                        setSelectedPostos(selectedPostos.filter(id => id !== posto.id));
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>{posto.nome_posto}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setEditingClientId(null); setSelectedPostos([]); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClientPostos} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 text-sm mt-1">Crie, edite e gerencie usuários do sistema</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} disabled={actionLoading}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Formulário de Criar Usuário */}
      {showCreateForm && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome Completo *"
                value={newUser.userName}
                onChange={(e) => setNewUser({ ...newUser, userName: e.target.value })}
                required
                placeholder="Nome do usuário"
                icon={<User className="w-5 h-5 text-gray-400" />}
              />
              <Input
                label="Email *"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                placeholder="email@empresa.com"
                icon={<Mail className="w-5 h-5 text-gray-400" />}
              />
              <div className="relative">
                <Input
                  label="Senha *"
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                  icon={<Shield className="w-5 h-5 text-gray-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Select
                label="Permissão"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AppRole })}
              >
                <option value="user">Usuário (Portal do Funcionário)</option>
                <option value="manager">Gerente (Leitura da sua empresa)</option>
                <option value="client">Cliente (Escalas/Férias/Banco Horas)</option>
                <option value="admin">Administrador (CRUD Completo)</option>
              </Select>
            </div>
            
            {/* Seleção de empresas para Gerentes */}
            {newUser.role === 'manager' && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label className="block text-sm font-medium text-amber-800 mb-3">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Empresas que o Gerente pode visualizar:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {empresas.map(empresa => (
                    <label key={empresa.id} className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-amber-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.empresaIds.includes(empresa.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUser({ ...newUser, empresaIds: [...newUser.empresaIds, empresa.id] });
                          } else {
                            setNewUser({ ...newUser, empresaIds: newUser.empresaIds.filter(id => id !== empresa.id) });
                          }
                        }}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm">{empresa.nome_empresa}</span>
                    </label>
                  ))}
                </div>
                {empresas.length === 0 && (
                  <p className="text-sm text-amber-600 italic">Nenhuma empresa cadastrada</p>
                )}
              </div>
            )}

            {/* Seleção de postos para Clientes */}
            {newUser.role === 'client' && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-green-800 mb-3">
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  Postos de Trabalho que o Cliente pode visualizar:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {postos.map(posto => (
                    <label key={posto.id} className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-green-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.postoIds.includes(posto.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUser({ ...newUser, postoIds: [...newUser.postoIds, posto.id] });
                          } else {
                            setNewUser({ ...newUser, postoIds: newUser.postoIds.filter(id => id !== posto.id) });
                          }
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm">{posto.nome_posto}</span>
                    </label>
                  ))}
                </div>
                {postos.length === 0 && (
                  <p className="text-sm text-green-600 italic">Nenhum posto de trabalho cadastrado</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)} disabled={actionLoading}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      {/* Lista de Usuários */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Usuários Cadastrados</h2>
          <Button variant="secondary" onClick={loadUsers} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄 Atualizar'}
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum usuário encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                   <th className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                      <span className="inline-flex items-center gap-1">
                        Nome
                        {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                      </span>
                    </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Permissão</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[180px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                 {[...users].sort((a, b) => {
                   if (!sortOrder) return 0;
                   const nameA = (a.profile?.user_name || '').toLowerCase();
                   const nameB = (b.profile?.user_name || '').toLowerCase();
                   return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                 }).map((user) => {
                  const userRole = user.roles[0]?.role || 'user';
                  const isCurrentUser = user.id === session?.user?.id;
                  
                  const roleConfig: Record<AppRole, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
                    admin: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Shield className="w-3 h-3" />, label: 'Administrador' },
                    manager: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Briefcase className="w-3 h-3" />, label: 'Gerente' },
                    client: { bg: 'bg-green-100', text: 'text-green-700', icon: <Building2 className="w-3 h-3" />, label: 'Cliente' },
                    user: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <User className="w-3 h-3" />, label: 'Usuário' }
                  };
                  
                  const config = roleConfig[userRole];
                  
                  const isEditing = editingUserId === user.id;
                  
                  return (
                    <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isCurrentUser ? 'bg-blue-50' : ''} ${isEditing ? 'bg-yellow-50' : ''}`}>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.userName}
                            onChange={(e) => setEditForm({ ...editForm, userName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="Nome do usuário"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                              userRole === 'admin' ? 'bg-purple-600' : userRole === 'client' ? 'bg-green-600' : userRole === 'manager' ? 'bg-amber-600' : 'bg-blue-600'
                            }`}>
                              {user.profile?.user_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <span className="font-medium">{user.profile?.user_name || 'Sem nome'}</span>
                              {isCurrentUser && <span className="ml-2 text-xs text-blue-600">(você)</span>}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="email@empresa.com"
                          />
                        ) : (
                          <span className="text-gray-600">{user.email}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded-full`}>
                          {config.icon}
                          {config.label}
                        </span>
                        {/* Mostrar postos vinculados para clientes */}
                        {userRole === 'client' && (
                          <div className="mt-1">
                            {user.client_postos && user.client_postos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.client_postos.map(cp => {
                                  const posto = postos.find(p => p.id === cp.posto_id);
                                  return posto ? (
                                    <span key={cp.posto_id} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                                      {posto.nome_posto}
                                    </span>
                                  ) : null;
                                })}
                                <button
                                  onClick={() => {
                                    setEditingClientId(user.id);
                                    setSelectedPostos(user.client_postos?.map(p => p.posto_id) || []);
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-300 hover:bg-green-200 cursor-pointer"
                                  title="Editar postos vinculados"
                                >
                                  ✏️
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingClientId(user.id);
                                  setSelectedPostos([]);
                                }}
                                className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 cursor-pointer"
                              >
                                ⚠️ Sem postos vinculados - Clique para vincular
                              </button>
                            )}
                          </div>
                        )}
                        {/* Mostrar empresas vinculadas para managers */}
                        {userRole === 'manager' && user.manager_empresas && user.manager_empresas.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {user.manager_empresas.map(me => {
                              const empresa = empresas.find(e => e.id === me.empresa_id);
                              return empresa ? (
                                <span key={me.empresa_id} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                                  {empresa.nome_empresa}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-600 text-sm">
                            <Mail className="w-4 h-4" />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                disabled={actionLoading}
                                className="p-2 rounded text-green-600 hover:bg-green-50 transition-colors"
                                title="Salvar alterações"
                              >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={actionLoading}
                                className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Cancelar edição"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(user)}
                                disabled={actionLoading || isCurrentUser}
                                className={`p-2 rounded transition-colors ${
                                  isCurrentUser 
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title={isCurrentUser ? 'Não é possível editar sua própria conta' : 'Editar usuário'}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <select
                                value={userRole}
                                onChange={(e) => handleChangeRole(user.id, e.target.value as AppRole)}
                                disabled={actionLoading || isCurrentUser}
                                className={`px-2 py-1 text-sm rounded border ${
                                  isCurrentUser 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                    : 'bg-white border-gray-300 hover:border-gray-400'
                                }`}
                                title={isCurrentUser ? 'Não é possível alterar sua própria permissão' : 'Alterar permissão'}
                              >
                              <option value="user">👤 Usuário</option>
                                <option value="manager">📋 Gerente</option>
                                <option value="client">🏢 Cliente</option>
                                <option value="admin">👑 Admin</option>
                              </select>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.profile?.user_name || user.email)}
                                disabled={actionLoading || isCurrentUser}
                                className={`p-2 rounded transition-colors ${
                                  isCurrentUser 
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title={isCurrentUser ? 'Não é possível excluir sua própria conta' : 'Excluir usuário'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Legenda */}
      <Card>
        <h3 className="font-semibold mb-3">Sobre as Permissões</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full whitespace-nowrap">
              <Shield className="w-3 h-3" />
              Admin
            </span>
            <p className="text-gray-600">Acesso completo: CRUD em todas as tabelas.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full whitespace-nowrap">
              <Shield className="w-3 h-3" />
              Gerente
            </span>
            <p className="text-gray-600">CRUD no Portal Gerencial; leitura nas demais páginas.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
              <Building2 className="w-3 h-3" />
              Cliente
            </span>
            <p className="text-gray-600">Leitura em Escalas, Alertas Férias e Banco de Horas.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
              <User className="w-3 h-3" />
              Usuário
            </span>
            <p className="text-gray-600">Acesso ao Portal do Funcionário.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;
