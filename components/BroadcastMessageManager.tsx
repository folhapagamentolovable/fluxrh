import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { useToast } from '../hooks/useToast';
import { Send, Trash2, Eye, EyeOff, Bell, AlertTriangle, CheckCircle, Info, AlertCircle, Users, RefreshCw, Building2, MapPin, User } from 'lucide-react';

interface BroadcastMessage {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  criado_por: string | null;
  ativo: boolean;
  created_at: string;
  leituras_count?: number;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  funcionario_id: string | null;
  empresa?: { nome_empresa: string } | null;
  posto?: { nome_posto: string } | null;
  funcionario?: { nome_completo: string } | null;
}

interface Empresa {
  id: string;
  nome_empresa: string;
}

interface PostoTrabalho {
  id: string;
  nome_posto: string;
  empresa_id: string | null;
}

interface Funcionario {
  id: string;
  nome_completo: string;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
}

interface BroadcastMessageManagerProps {
  adminName?: string;
}

const BroadcastMessageManager: React.FC<BroadcastMessageManagerProps> = ({ adminName }) => {
  const { showToast, ToastContainer } = useToast();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  
  // Data for filters
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('info');
  const [targetType, setTargetType] = useState<'todos' | 'empresa' | 'posto' | 'funcionario'>('todos');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [selectedPosto, setSelectedPosto] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState('');

  useEffect(() => {
    loadMessages();
    loadTotalFuncionarios();
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    const [empresasRes, postosRes, funcionariosRes] = await Promise.all([
      supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
      supabase.from('postos_trabalho').select('id, nome_posto, empresa_id').is('local_area', null).order('nome_posto'),
      supabase.from('funcionarios')
        .select('id, nome_completo, empresa_id, posto_trabalho_id')
        .eq('ativo', true)
        .eq('demitido', false)
        .order('nome_completo')
    ]);

    if (empresasRes.data) setEmpresas(empresasRes.data);
    if (postosRes.data) setPostos(postosRes.data);
    if (funcionariosRes.data) setFuncionarios(funcionariosRes.data);
  };

  // Filtered lists based on selection
  const filteredPostos = useMemo(() => {
    if (!selectedEmpresa) return postos;
    return postos.filter(p => p.empresa_id === selectedEmpresa);
  }, [postos, selectedEmpresa]);

  const filteredFuncionarios = useMemo(() => {
    let filtered = funcionarios;
    if (selectedEmpresa) {
      filtered = filtered.filter(f => f.empresa_id === selectedEmpresa);
    }
    if (selectedPosto) {
      filtered = filtered.filter(f => f.posto_trabalho_id === selectedPosto);
    }
    return filtered;
  }, [funcionarios, selectedEmpresa, selectedPosto]);

  // Calculate target count
  const targetCount = useMemo(() => {
    switch (targetType) {
      case 'funcionario':
        return selectedFuncionario ? 1 : 0;
      case 'posto':
        if (!selectedPosto) return 0;
        return funcionarios.filter(f => f.posto_trabalho_id === selectedPosto).length;
      case 'empresa':
        if (!selectedEmpresa) return 0;
        return funcionarios.filter(f => f.empresa_id === selectedEmpresa).length;
      default:
        return totalFuncionarios;
    }
  }, [targetType, selectedFuncionario, selectedPosto, selectedEmpresa, funcionarios, totalFuncionarios]);

  const loadTotalFuncionarios = async () => {
    const { count } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .eq('demitido', false);
    
    setTotalFuncionarios(count || 0);
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Buscar mensagens com relacionamentos
      const { data: messagesData, error: messagesError } = await supabase
        .from('mensagens_broadcast')
        .select(`
          *,
          empresa:empresas(nome_empresa),
          posto:postos_trabalho(nome_posto),
          funcionario:funcionarios(nome_completo)
        `)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Para cada mensagem, buscar contagem de leituras
      const messagesWithCount = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { count } = await supabase
            .from('mensagens_broadcast_lidas')
            .select('*', { count: 'exact', head: true })
            .eq('mensagem_id', msg.id);
          
          return { ...msg, leituras_count: count || 0 };
        })
      );

      setMessages(messagesWithCount);
    } catch (error) {
      showToast('Erro ao carregar mensagens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !mensagem.trim()) {
      showToast('Preencha o título e a mensagem', 'error');
      return;
    }

    // Validate target selection
    if (targetType === 'empresa' && !selectedEmpresa) {
      showToast('Selecione uma empresa', 'error');
      return;
    }
    if (targetType === 'posto' && !selectedPosto) {
      showToast('Selecione um posto de trabalho', 'error');
      return;
    }
    if (targetType === 'funcionario' && !selectedFuncionario) {
      showToast('Selecione um funcionário', 'error');
      return;
    }

    setSending(true);
    try {
      const insertData: any = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        tipo,
        criado_por: adminName || 'Administrador'
      };

      // Add targeting based on selection
      if (targetType === 'empresa') {
        insertData.empresa_id = selectedEmpresa;
      } else if (targetType === 'posto') {
        insertData.posto_trabalho_id = selectedPosto;
      } else if (targetType === 'funcionario') {
        insertData.funcionario_id = selectedFuncionario;
      }

      const { error } = await supabase
        .from('mensagens_broadcast')
        .insert(insertData);

      if (error) throw error;

      const targetLabel = targetType === 'todos' 
        ? 'todos os funcionários'
        : targetType === 'funcionario'
          ? 'funcionário selecionado'
          : targetType === 'posto'
            ? 'funcionários do posto selecionado'
            : 'funcionários da empresa selecionada';

      showToast(`Mensagem enviada para ${targetLabel}!`, 'success');
      setTitulo('');
      setMensagem('');
      setTipo('info');
      setTargetType('todos');
      setSelectedEmpresa('');
      setSelectedPosto('');
      setSelectedFuncionario('');
      loadMessages();
    } catch (error) {
      showToast('Erro ao enviar mensagem', 'error');
    } finally {
      setSending(false);
    }
  };

  const toggleMessageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('mensagens_broadcast')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(currentStatus ? 'Mensagem desativada' : 'Mensagem reativada', 'success');
      loadMessages();
    } catch (error) {
      showToast('Erro ao alterar status', 'error');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.')) return;

    try {
      // Primeiro excluir leituras relacionadas
      await supabase
        .from('mensagens_broadcast_lidas')
        .delete()
        .eq('mensagem_id', id);

      const { error } = await supabase
        .from('mensagens_broadcast')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Mensagem excluída com sucesso', 'success');
      loadMessages();
    } catch (error) {
      showToast('Erro ao excluir mensagem', 'error');
    }
  };

  const getTypeConfig = (tipo: string) => {
    switch (tipo) {
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Aviso' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Urgente' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Positivo' };
      default:
        return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Informativo' };
    }
  };

  const getTargetLabel = (msg: BroadcastMessage) => {
    if (msg.funcionario?.nome_completo) {
      return { icon: User, label: msg.funcionario.nome_completo, color: 'text-purple-600 bg-purple-50' };
    }
    if (msg.posto?.nome_posto) {
      return { icon: MapPin, label: msg.posto.nome_posto, color: 'text-orange-600 bg-orange-50' };
    }
    if (msg.empresa?.nome_empresa) {
      return { icon: Building2, label: msg.empresa.nome_empresa, color: 'text-blue-600 bg-blue-50' };
    }
    return { icon: Users, label: 'Todos', color: 'text-green-600 bg-green-50' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (targetType === 'todos') {
      setSelectedEmpresa('');
      setSelectedPosto('');
      setSelectedFuncionario('');
    } else if (targetType === 'empresa') {
      setSelectedPosto('');
      setSelectedFuncionario('');
    } else if (targetType === 'posto') {
      setSelectedFuncionario('');
    }
  }, [targetType]);

  useEffect(() => {
    if (selectedEmpresa && targetType === 'posto') {
      // Keep posto if still valid, otherwise reset
      if (selectedPosto && !filteredPostos.find(p => p.id === selectedPosto)) {
        setSelectedPosto('');
      }
    }
  }, [selectedEmpresa, targetType, filteredPostos, selectedPosto]);

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      {/* Formulário de Nova Mensagem */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Enviar Mensagem Broadcast</h2>
            <p className="text-sm text-gray-500">
              Envie uma mensagem direcionada para funcionários específicos ou para todos
            </p>
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="space-y-4">
          {/* Target Selection */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Destinatários
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTargetType('todos')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  targetType === 'todos' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-medium">Todos</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('empresa')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  targetType === 'empresa' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-xs font-medium">Empresa</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('posto')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  targetType === 'posto' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span className="text-xs font-medium">Posto</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('funcionario')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  targetType === 'funcionario' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs font-medium">Individual</span>
              </button>
            </div>

            {/* Conditional filters */}
            {targetType !== 'todos' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(targetType === 'empresa' || targetType === 'posto' || targetType === 'funcionario') && (
                  <Select
                    label="Empresa"
                    value={selectedEmpresa}
                    onChange={(e) => setSelectedEmpresa(e.target.value)}
                    required={targetType === 'empresa'}
                  >
                    <option value="">
                      {targetType === 'empresa' ? 'Selecione a empresa...' : 'Todas as empresas'}
                    </option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                    ))}
                  </Select>
                )}

                {(targetType === 'posto' || targetType === 'funcionario') && (
                  <Select
                    label="Posto de Trabalho"
                    value={selectedPosto}
                    onChange={(e) => setSelectedPosto(e.target.value)}
                    required={targetType === 'posto'}
                  >
                    <option value="">
                      {targetType === 'posto' ? 'Selecione o posto...' : 'Todos os postos'}
                    </option>
                    {filteredPostos.map(posto => (
                      <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                    ))}
                  </Select>
                )}

                {targetType === 'funcionario' && (
                  <Select
                    label="Funcionário"
                    value={selectedFuncionario}
                    onChange={(e) => setSelectedFuncionario(e.target.value)}
                    required
                  >
                    <option value="">Selecione o funcionário...</option>
                    {filteredFuncionarios.map(func => (
                      <option key={func.id} value={func.id}>{func.nome_completo}</option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            {/* Target count indicator */}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {targetCount === 0 ? (
                  <span className="text-amber-600">Nenhum destinatário selecionado</span>
                ) : targetCount === 1 ? (
                  <span className="text-green-600">1 funcionário receberá a mensagem</span>
                ) : (
                  <span className="text-green-600">{targetCount} funcionários receberão a mensagem</span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Título da Mensagem"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Aviso Importante sobre Férias"
                required
              />
            </div>
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="info">ℹ️ Informativo</option>
              <option value="warning">⚠️ Aviso</option>
              <option value="success">✅ Positivo</option>
              <option value="error">🚨 Urgente</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite a mensagem que será exibida para os funcionários..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[100px] resize-y"
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={sending || targetCount === 0}>
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enviar para {targetCount === 1 ? '1 funcionário' : `${targetCount} funcionários`}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista de Mensagens Enviadas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Mensagens Enviadas</h2>
          <Button variant="outline" size="sm" onClick={loadMessages}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma mensagem enviada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const config = getTypeConfig(msg.tipo);
              const Icon = config.icon;
              const target = getTargetLabel(msg);
              const TargetIcon = target.icon;
              
              // Calculate read percentage based on target
              let targetTotal = totalFuncionarios;
              if (msg.funcionario_id) targetTotal = 1;
              else if (msg.posto_trabalho_id) {
                targetTotal = funcionarios.filter(f => f.posto_trabalho_id === msg.posto_trabalho_id).length;
              } else if (msg.empresa_id) {
                targetTotal = funcionarios.filter(f => f.empresa_id === msg.empresa_id).length;
              }
              
              const readPercentage = targetTotal > 0 
                ? Math.round((msg.leituras_count || 0) / targetTotal * 100)
                : 0;

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border ${msg.ativo ? config.bg : 'bg-gray-50'} ${msg.ativo ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${msg.ativo ? config.bg : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${msg.ativo ? config.color : 'text-gray-400'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{msg.titulo}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${msg.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {msg.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${target.color}`}>
                          <TargetIcon className="w-3 h-3" />
                          {target.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.mensagem}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatDate(msg.created_at)}</span>
                        {msg.criado_por && <span>por {msg.criado_por}</span>}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {msg.leituras_count}/{targetTotal} ({readPercentage}%)
                        </span>
                      </div>

                      {/* Barra de progresso de leitura */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(readPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleMessageStatus(msg.id, msg.ativo)}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title={msg.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {msg.ativo ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BroadcastMessageManager;
