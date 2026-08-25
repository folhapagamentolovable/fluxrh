import React, { useState, useEffect, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { 
    MessageSquare, Search, Filter, Eye, Send, 
    CheckCircle, Clock, AlertCircle, MessageCircle, X, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';

interface SugestaoReclamacao {
    id: string;
    funcionario_id: string;
    nome_funcionario: string;
    tema: string;
    sugestao: string | null;
    reclamacao: string | null;
    resposta_empresa: string | null;
    data_registro: string;
    data_resposta: string | null;
    status: string;
    observacoes: string | null;
}

interface Funcionario {
    id: string;
    nome_completo: string;
    nome_empresa?: string;
    nome_cargo?: string;
    nome_posto?: string;
}

interface Props {
    funcionarios: Funcionario[];
    /** 'ferias' = só temas de férias | 'operacional' = todos os outros | undefined = todos */
    tipoFiltro?: 'ferias' | 'operacional';
}

const temaLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    'ferias': { label: 'Férias', icon: MessageSquare, color: 'bg-teal-100 text-teal-800' },
    'solicitacao_ferias': { label: 'Solicitação de Férias', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-800' },
    'ambiente_trabalho': { label: 'Ambiente de Trabalho', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' },
    'beneficios': { label: 'Benefícios', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
    'equipamentos': { label: 'Equipamentos', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
    'gestao': { label: 'Gestão', icon: MessageSquare, color: 'bg-orange-100 text-orange-800' },
    'salario': { label: 'Salário', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-800' },
    'escala': { label: 'Escala', icon: MessageSquare, color: 'bg-cyan-100 text-cyan-800' },
    'outros': { label: 'Outros', icon: MessageSquare, color: 'bg-gray-100 text-gray-800' },
};

// Temas que pertencem a "Férias"
const TEMAS_FERIAS = ['ferias', 'solicitacao_ferias'];
// Temas que pertencem a "Operacional" (todos os demais)

const SugestoesManagement: React.FC<Props> = ({ funcionarios, tipoFiltro }) => {
    const { showToast } = useToast();
    const { isAdmin } = useAuth();
    
    // Estados
    const [sugestoes, setSugestoes] = useState<SugestaoReclamacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('todas');
    const [filterTema, setFilterTema] = useState<string>('todos');
    const [filterEmpresa, setFilterEmpresa] = useState<string>('todas');
    const [deletando, setDeletando] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    
    // Modal de resposta
    const [showRespostaModal, setShowRespostaModal] = useState(false);
    const [selectedSugestao, setSelectedSugestao] = useState<SugestaoReclamacao | null>(null);
    const [resposta, setResposta] = useState('');
    const [enviando, setEnviando] = useState(false);

    // Carregar sugestões
    const carregarSugestoes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sugestoes_reclamacoes')
                .select('*')
                .order('data_registro', { ascending: false });

            if (error) throw error;
            
            let allMessages: SugestaoReclamacao[] = data || [];

            // Se filtro de férias, também buscar solicitações da tabela ferias
            if (tipoFiltro === 'ferias') {
                const { data: feriasData, error: feriasError } = await supabase
                    .from('ferias')
                    .select('id, funcionario_id, nome_funcionario, observacoes, status, resposta_empresa, created_at, data_inicio_gozo, data_fim_gozo, dias_gozados, dias_abono, periodo1_inicio, periodo1_fim, periodo2_inicio, periodo2_fim, periodo3_inicio, periodo3_fim')
                    .not('observacoes', 'is', null)
                    .order('created_at', { ascending: false });

                if (!feriasError && feriasData) {
                    const feriasMensagens: SugestaoReclamacao[] = feriasData
                        .filter(f => f.observacoes && f.observacoes.trim() !== '')
                        .map(f => {
                            // Construir detalhes dos períodos
                            const periodos: string[] = [];
                            if (f.periodo1_inicio && f.periodo1_fim) {
                                periodos.push(`P1: ${new Date(f.periodo1_inicio).toLocaleDateString('pt-BR')} a ${new Date(f.periodo1_fim).toLocaleDateString('pt-BR')}`);
                            }
                            if (f.periodo2_inicio && f.periodo2_fim) {
                                periodos.push(`P2: ${new Date(f.periodo2_inicio).toLocaleDateString('pt-BR')} a ${new Date(f.periodo2_fim).toLocaleDateString('pt-BR')}`);
                            }
                            if (f.periodo3_inicio && f.periodo3_fim) {
                                periodos.push(`P3: ${new Date(f.periodo3_inicio).toLocaleDateString('pt-BR')} a ${new Date(f.periodo3_fim).toLocaleDateString('pt-BR')}`);
                            }
                            
                            const detalhes = periodos.length > 0 
                                ? `${f.observacoes}\n\n📅 Períodos:\n${periodos.join('\n')}` 
                                : f.observacoes;

                            const statusMap: Record<string, string> = {
                                'pendente': 'pendente',
                                'em_andamento': 'pendente',
                                'aprovada': 'respondida',
                                'gozada': 'respondida',
                                'rejeitada': 'respondida',
                            };

                            return {
                                id: `ferias_${f.id}`,
                                funcionario_id: f.funcionario_id,
                                nome_funcionario: f.nome_funcionario || 'Funcionário',
                                tema: 'solicitacao_ferias',
                                sugestao: detalhes,
                                reclamacao: null,
                                resposta_empresa: f.resposta_empresa || null,
                                data_registro: f.created_at,
                                data_resposta: f.resposta_empresa ? f.created_at : null,
                                status: statusMap[f.status] || 'pendente',
                                observacoes: `Status: ${f.status}`,
                            };
                        });
                    
                    allMessages = [...allMessages, ...feriasMensagens];
                }
            }

            // Ordenar por data mais recente
            allMessages.sort((a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime());
            setSugestoes(allMessages);
        } catch (error) {
            showToast('Erro ao carregar mensagens', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarSugestoes();
    }, []);

    // Empresas para filtro
    const empresas = useMemo(() => {
        const set = new Set<string>();
        funcionarios?.forEach(f => {
            if (f.nome_empresa) set.add(f.nome_empresa);
        });
        return Array.from(set).sort();
    }, [funcionarios]);

    // Sugestões filtradas
    const sugestoesFiltradas = useMemo(() => {
        return sugestoes.filter(s => {
            // Filtro por tipo (férias vs operacional)
            if (tipoFiltro === 'ferias' && !TEMAS_FERIAS.includes(s.tema)) return false;
            if (tipoFiltro === 'operacional' && TEMAS_FERIAS.includes(s.tema)) return false;

            const matchSearch = s.nome_funcionario.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === 'todas' || 
                (filterStatus === 'pendentes' && s.status === 'pendente') ||
                (filterStatus === 'respondidas' && s.status === 'respondida');
            const matchTema = filterTema === 'todos' || s.tema === filterTema;
            
            // Buscar empresa do funcionário
            const func = funcionarios.find(f => f.id === s.funcionario_id);
            const matchEmpresa = filterEmpresa === 'todas' || func?.nome_empresa === filterEmpresa;
            
            return matchSearch && matchStatus && matchTema && matchEmpresa;
        });
    }, [sugestoes, searchTerm, filterStatus, filterTema, filterEmpresa, funcionarios, tipoFiltro]);

    // Estatísticas
    const stats = useMemo(() => ({
        total: sugestoes.length,
        pendentes: sugestoes.filter(s => s.status === 'pendente').length,
        respondidas: sugestoes.filter(s => s.status === 'respondida').length,
    }), [sugestoes]);

    // Handlers
    const handleOpenResposta = (sugestao: SugestaoReclamacao) => {
        setSelectedSugestao(sugestao);
        setResposta(sugestao.resposta_empresa || '');
        setShowRespostaModal(true);
    };

    const handleCloseResposta = () => {
        setShowRespostaModal(false);
        setSelectedSugestao(null);
        setResposta('');
    };

    const handleEnviarResposta = async () => {
        if (!selectedSugestao || !resposta.trim()) {
            showToast('Digite uma resposta', 'error');
            return;
        }

        try {
            setEnviando(true);
            
            const dataResposta = new Date().toISOString();
            
            // Check if this is a ferias entry
            if (selectedSugestao.id.startsWith('ferias_')) {
                const realFeriasId = selectedSugestao.id.replace('ferias_', '');
                const { error } = await supabase
                    .from('ferias')
                    .update({
                        resposta_empresa: resposta.trim(),
                    })
                    .eq('id', realFeriasId);

                if (error) throw error;

                showToast('Resposta enviada com sucesso!', 'success');
                handleCloseResposta();
                carregarSugestoes();
                return;
            }
            
            const { error } = await supabase
                .from('sugestoes_reclamacoes')
                .update({
                    resposta_empresa: resposta.trim(),
                    data_resposta: dataResposta,
                    status: 'respondida'
                })
                .eq('id', selectedSugestao.id);

            if (error) throw error;

            // Buscar email do funcionário para notificação
            let emailDestinatario: string | null = null;
            
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('email, user_id')
                .eq('id', selectedSugestao.funcionario_id)
                .single();
            
            if (funcData?.email) {
                emailDestinatario = funcData.email;
            } else if (funcData?.user_id) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', funcData.user_id)
                    .single();
                
                if (profileData?.email) {
                    emailDestinatario = profileData.email;
                }
            }
            
            if (emailDestinatario) {
                try {
                    const messageType = selectedSugestao.sugestao ? 'sugestao' : 'reclamacao';
                    const originalMessage = selectedSugestao.sugestao || selectedSugestao.reclamacao || '';
                    
                    await supabase.functions.invoke('send-notification-email', {
                        body: {
                            to: emailDestinatario,
                            employeeName: selectedSugestao.nome_funcionario,
                            messageType,
                            theme: selectedSugestao.tema,
                            originalMessage,
                            companyResponse: resposta.trim(),
                            responseDate: new Date(dataResposta).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                        }
                    });
                } catch (emailError) {
                    // Não falha a operação principal se o email falhar
                }
            }

            showToast('Resposta enviada com sucesso!', 'success');
            handleCloseResposta();
            carregarSugestoes();
        } catch (error) {
            showToast('Erro ao enviar resposta', 'error');
        } finally {
            setEnviando(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTemaInfo = (tema: string) => {
        return temaLabels[tema] || temaLabels['outros'];
    };

    const handleDeleteSugestao = async (id: string) => {
        try {
            setDeletando(id);
            
            // Verificar se é uma mensagem da tabela ferias
            if (id.startsWith('ferias_')) {
                // Não permite deletar solicitações de férias por aqui
                showToast('Solicitações de férias devem ser gerenciadas na Gestão de Férias', 'error');
                setConfirmDelete(null);
                return;
            }
            
            // Deletar leituras associadas primeiro
            await supabase
                .from('mensagens_lidas')
                .delete()
                .eq('sugestao_id', id);
            
            const { error } = await supabase
                .from('sugestoes_reclamacoes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('Mensagem excluída com sucesso!', 'success');
            setConfirmDelete(null);
            carregarSugestoes();
        } catch (error) {
            showToast('Erro ao excluir mensagem', 'error');
        } finally {
            setDeletando(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho da Seção */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        {tipoFiltro === 'ferias' ? 'Mensagens sobre Férias' : tipoFiltro === 'operacional' ? 'Mensagens Operacionais' : 'Gestão de Mensagens'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {tipoFiltro === 'ferias' ? 'Solicitações e dúvidas sobre férias' : tipoFiltro === 'operacional' ? 'Sugestões e reclamações operacionais' : 'Sugestões e reclamações dos funcionários'}
                    </p>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total de Mensagens</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                        </div>
                        <MessageSquare className="w-10 h-10 text-blue-500 opacity-80" />
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-600 font-medium">Pendentes</p>
                            <p className="text-2xl font-bold text-amber-900">{stats.pendentes}</p>
                        </div>
                        <Clock className="w-10 h-10 text-amber-500 opacity-80" />
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Respondidas</p>
                            <p className="text-2xl font-bold text-green-900">{stats.respondidas}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
                    </div>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por funcionário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="todas">Todos os Status</option>
                        <option value="pendentes">Pendentes</option>
                        <option value="respondidas">Respondidas</option>
                    </select>
                    <select
                        value={filterTema}
                        onChange={(e) => setFilterTema(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="todos">Todos os Temas</option>
                        {Object.entries(temaLabels)
                            .filter(([key]) => {
                                if (tipoFiltro === 'ferias') return TEMAS_FERIAS.includes(key);
                                if (tipoFiltro === 'operacional') return !TEMAS_FERIAS.includes(key);
                                return true;
                            })
                            .map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                    </select>
                    <select
                        value={filterEmpresa}
                        onChange={(e) => setFilterEmpresa(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="todas">Todas as Empresas</option>
                        {empresas.map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Lista de Mensagens */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Carregando mensagens...</p>
                    </div>
                ) : sugestoesFiltradas.length === 0 ? (
                    <div className="p-8 text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">Nenhuma mensagem encontrada</h3>
                        <p className="text-gray-600">
                            {searchTerm || filterStatus !== 'todas' || filterTema !== 'todos' 
                                ? 'Tente ajustar os filtros' 
                                : 'Ainda não há sugestões ou reclamações'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {sugestoesFiltradas.map((sugestao) => {
                            const temaInfo = getTemaInfo(sugestao.tema);
                            const func = funcionarios.find(f => f.id === sugestao.funcionario_id);
                            const TemaIcon = temaInfo.icon;
                            
                            return (
                                <div key={sugestao.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            {/* Cabeçalho */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${temaInfo.color}`}>
                                                    <TemaIcon className="w-3 h-3" />
                                                    {temaInfo.label}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                    sugestao.status === 'pendente' 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {sugestao.status === 'pendente' ? (
                                                        <><Clock className="w-3 h-3" /> Pendente</>
                                                    ) : (
                                                        <><CheckCircle className="w-3 h-3" /> Respondida</>
                                                    )}
                                                </span>
                                            </div>
                                            
                                            {/* Funcionário e Data */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                                <span className="font-semibold text-gray-900">{sugestao.nome_funcionario}</span>
                                                {func?.nome_empresa && (
                                                    <span className="text-gray-500">• {func.nome_empresa}</span>
                                                )}
                                                {func?.nome_cargo && (
                                                    <span className="text-gray-500">• {func.nome_cargo}</span>
                                                )}
                                                <span className="text-gray-400">• {formatDate(sugestao.data_registro)}</span>
                                            </div>
                                            
                                            {/* Mensagem */}
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {sugestao.sugestao || sugestao.reclamacao}
                                                </p>
                                            </div>
                                            
                                            {/* Resposta (se existir) */}
                                            {sugestao.resposta_empresa && (
                                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 ml-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Send className="w-4 h-4 text-blue-600" />
                                                        <span className="text-xs font-medium text-blue-700">Resposta da Empresa</span>
                                                        {sugestao.data_resposta && (
                                                            <span className="text-xs text-blue-500">• {formatDate(sugestao.data_resposta)}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                                        {sugestao.resposta_empresa}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Ações */}
                                        <div className="flex-shrink-0 flex flex-col gap-2">
                                            <Button
                                                variant={sugestao.status === 'pendente' ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => handleOpenResposta(sugestao)}
                                            >
                                                {sugestao.status === 'pendente' ? (
                                                    <><Send className="w-4 h-4 mr-1" /> Responder</>
                                                ) : (
                                                    <><Eye className="w-4 h-4 mr-1" /> Editar Resposta</>
                                                )}
                                            </Button>
                                            {isAdmin && (
                                                confirmDelete === sugestao.id ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="text-xs px-2"
                                                        >
                                                            Não
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleDeleteSugestao(sugestao.id)}
                                                            disabled={deletando === sugestao.id}
                                                            className="bg-red-600 hover:bg-red-700 text-xs px-2"
                                                        >
                                                            {deletando === sugestao.id ? 'Excluindo...' : 'Sim'}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setConfirmDelete(sugestao.id)}
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" /> Excluir
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Modal de Resposta */}
            {showRespostaModal && selectedSugestao && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Responder Mensagem</h3>
                                <button
                                    onClick={handleCloseResposta}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Info do funcionário */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTemaInfo(selectedSugestao.tema).color}`}>
                                        {getTemaInfo(selectedSugestao.tema).label}
                                    </span>
                                </div>
                                <p className="font-semibold text-gray-900">{selectedSugestao.nome_funcionario}</p>
                                <p className="text-sm text-gray-500">{formatDate(selectedSugestao.data_registro)}</p>
                            </div>
                            
                            {/* Mensagem original */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mensagem do Funcionário:
                                </label>
                                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        {selectedSugestao.sugestao || selectedSugestao.reclamacao}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Campo de resposta */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sua Resposta:
                                </label>
                                <textarea
                                    value={resposta}
                                    onChange={(e) => setResposta(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    placeholder="Digite sua resposta aqui..."
                                />
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="outline" onClick={handleCloseResposta}>
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={handleEnviarResposta}
                                disabled={enviando || !resposta.trim()}
                            >
                                {enviando ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar Resposta
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SugestoesManagement;
