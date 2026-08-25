import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { useToast } from '../hooks/useToast';
import { 
  History, 
  Search, 
  RefreshCw, 
  User, 
  Bell, 
  CheckCircle, 
  Clock, 
  Building2, 
  MapPin,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';

interface ReadRecord {
  id: string;
  lida_em: string;
  funcionario_id: string;
  mensagem_id: string;
  funcionario: {
    nome_completo: string;
    nome_empresa: string | null;
    nome_posto: string | null;
    empresa_id: string | null;
    posto_trabalho_id: string | null;
  };
  mensagem: {
    titulo: string;
    tipo: string;
    created_at: string;
  };
}

interface MessageSummary {
  id: string;
  titulo: string;
  tipo: string;
  created_at: string;
  criado_por: string | null;
  total_target: number;
  total_read: number;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  funcionario_id: string | null;
  readers: {
    funcionario_id: string;
    nome_completo: string;
    nome_empresa: string | null;
    nome_posto: string | null;
    lida_em: string;
  }[];
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

const BroadcastReadHistory: React.FC = () => {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [messageSummaries, setMessageSummaries] = useState<MessageSummary[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  
  // Filter data
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [postoFilter, setPostoFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [messagesRes, leiturasRes, empresasRes, postosRes, funcionariosRes] = await Promise.all([
        supabase
          .from('mensagens_broadcast')
          .select('id, titulo, tipo, created_at, criado_por, empresa_id, posto_trabalho_id, funcionario_id')
          .order('created_at', { ascending: false }),
        supabase
          .from('mensagens_broadcast_lidas')
          .select(`
            id,
            lida_em,
            funcionario_id,
            mensagem_id,
            funcionario:funcionarios(
              nome_completo,
              nome_empresa,
              nome_posto,
              empresa_id,
              posto_trabalho_id
            )
          `)
          .order('lida_em', { ascending: false }),
        supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
        supabase.from('postos_trabalho').select('id, nome_posto, empresa_id').is('local_area', null).order('nome_posto'),
        supabase
          .from('funcionarios')
          .select('id, nome_completo, empresa_id, posto_trabalho_id')
          .eq('ativo', true)
          .eq('demitido', false)
      ]);

      if (empresasRes.data) setEmpresas(empresasRes.data);
      if (postosRes.data) setPostos(postosRes.data);
      if (funcionariosRes.data) setFuncionarios(funcionariosRes.data);

      // Build message summaries with readers
      const messages = messagesRes.data || [];
      const leituras = leiturasRes.data || [];
      const allFuncionarios = funcionariosRes.data || [];

      const summaries: MessageSummary[] = messages.map(msg => {
        // Calculate target count
        let targetCount = allFuncionarios.length;
        if (msg.funcionario_id) {
          targetCount = 1;
        } else if (msg.posto_trabalho_id) {
          targetCount = allFuncionarios.filter(f => f.posto_trabalho_id === msg.posto_trabalho_id).length;
        } else if (msg.empresa_id) {
          targetCount = allFuncionarios.filter(f => f.empresa_id === msg.empresa_id).length;
        }

        // Get readers for this message
        const msgLeituras = leituras.filter(l => l.mensagem_id === msg.id);
        const readers = msgLeituras.map(l => ({
          funcionario_id: l.funcionario_id,
          nome_completo: (l.funcionario as any)?.nome_completo || 'Desconhecido',
          nome_empresa: (l.funcionario as any)?.nome_empresa || null,
          nome_posto: (l.funcionario as any)?.nome_posto || null,
          lida_em: l.lida_em
        }));

        return {
          id: msg.id,
          titulo: msg.titulo,
          tipo: msg.tipo,
          created_at: msg.created_at,
          criado_por: msg.criado_por,
          total_target: targetCount,
          total_read: readers.length,
          empresa_id: msg.empresa_id,
          posto_trabalho_id: msg.posto_trabalho_id,
          funcionario_id: msg.funcionario_id,
          readers
        };
      });

      setMessageSummaries(summaries);
    } catch (error) {
      showToast('Erro ao carregar histórico de leituras', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    let filtered = messageSummaries;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(msg => new Date(msg.created_at) >= startDate);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.titulo.toLowerCase().includes(term) ||
        msg.readers.some(r => r.nome_completo.toLowerCase().includes(term))
      );
    }

    // Enterprise filter on readers
    if (empresaFilter) {
      filtered = filtered.map(msg => ({
        ...msg,
        readers: msg.readers.filter(r => {
          const func = funcionarios.find(f => f.id === r.funcionario_id);
          return func?.empresa_id === empresaFilter;
        })
      })).filter(msg => msg.readers.length > 0 || msg.empresa_id === empresaFilter);
    }

    // Posto filter on readers
    if (postoFilter) {
      filtered = filtered.map(msg => ({
        ...msg,
        readers: msg.readers.filter(r => {
          const func = funcionarios.find(f => f.id === r.funcionario_id);
          return func?.posto_trabalho_id === postoFilter;
        })
      })).filter(msg => msg.readers.length > 0 || msg.posto_trabalho_id === postoFilter);
    }

    return filtered;
  }, [messageSummaries, searchTerm, empresaFilter, postoFilter, dateFilter, funcionarios]);

  // Filtered postos based on empresa
  const filteredPostos = useMemo(() => {
    if (!empresaFilter) return postos;
    return postos.filter(p => p.empresa_id === empresaFilter);
  }, [postos, empresaFilter]);

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'success': return 'bg-green-100 text-green-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  // Statistics
  const totalMessages = filteredMessages.length;
  const totalReads = filteredMessages.reduce((acc, msg) => acc + msg.total_read, 0);
  const avgReadRate = totalMessages > 0 
    ? Math.round(filteredMessages.reduce((acc, msg) => acc + (msg.total_read / msg.total_target * 100), 0) / totalMessages)
    : 0;

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Histórico de Visualizações</h2>
              <p className="text-sm text-gray-500">
                Acompanhe quais funcionários leram cada mensagem broadcast
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">Mensagens</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{totalMessages}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Total de Leituras</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{totalReads}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Média de Leitura</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{avgReadRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-[38px] -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              label="Buscar"
              placeholder="Mensagem ou funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            label="Período"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Todos os períodos</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </Select>
          <Select
            label="Empresa"
            value={empresaFilter}
            onChange={(e) => {
              setEmpresaFilter(e.target.value);
              setPostoFilter('');
            }}
          >
            <option value="">Todas as empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
            ))}
          </Select>
          <Select
            label="Posto"
            value={postoFilter}
            onChange={(e) => setPostoFilter(e.target.value)}
          >
            <option value="">Todos os postos</option>
            {filteredPostos.map(posto => (
              <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Messages List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card className="p-8 text-center">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma mensagem encontrada</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const isExpanded = expandedMessages.has(msg.id);
            const readPercentage = msg.total_target > 0 
              ? Math.round((msg.total_read / msg.total_target) * 100)
              : 0;

            return (
              <Card key={msg.id} className="overflow-hidden">
                {/* Message Header */}
                <button
                  onClick={() => toggleMessageExpand(msg.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${getTypeColor(msg.tipo)}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{msg.titulo}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(msg.created_at)}
                        </span>
                        {msg.criado_por && <span>por {msg.criado_por}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Read progress */}
                    <div className="hidden md:flex flex-col items-end min-w-[120px]">
                      <span className="text-sm font-medium text-gray-700">
                        {msg.total_read}/{msg.total_target} leituras
                      </span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${
                            readPercentage >= 80 ? 'bg-green-500' :
                            readPercentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(readPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-1.5 rounded-full transition-colors ${
                      isExpanded ? 'bg-primary/10' : 'hover:bg-gray-100'
                    }`}>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Readers List */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {msg.readers.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Nenhuma leitura registrada ainda</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                        {msg.readers.map((reader, idx) => (
                          <div key={`${reader.funcionario_id}-${idx}`} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium text-sm flex-shrink-0">
                              {reader.nome_completo.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{reader.nome_completo}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {reader.nome_empresa && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {reader.nome_empresa}
                                  </span>
                                )}
                                {reader.nome_posto && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {reader.nome_posto}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex-shrink-0">
                              <CheckCircle className="w-3 h-3" />
                              {formatDateShort(reader.lida_em)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BroadcastReadHistory;
