import React, { useEffect, useState } from 'react';
import {
  Building2,
  Wrench,
  Users,
  ClipboardList,
  Shield,
  Heart,
  Star,
  HelpCircle,
  Send,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Bell,
  Umbrella,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

interface SugestaoReclamacao {
  id: string;
  data_registro: string;
  tema: string;
  sugestao: string | null;
  reclamacao: string | null;
  resposta_empresa: string | null;
  data_resposta: string | null;
  status: string;
}

type TipoMensagem = 'sugestao' | 'reclamacao' | 'ferias';

const temas = [
  { id: 'local_trabalho',         label: 'Local de Trabalho',       icon: Building2,    color: 'bg-blue-100   border-blue-300   text-blue-700   dark:bg-blue-900/30   dark:border-blue-600'   },
  { id: 'materiais_equipamentos', label: 'Materiais e Equipamentos', icon: Wrench,       color: 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-600' },
  { id: 'time_chefes',            label: 'Time e Chefes',            icon: Users,        color: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600' },
  { id: 'como_trabalhamos',       label: 'Como Trabalhamos',         icon: ClipboardList, color: 'bg-cyan-100  border-cyan-300   text-cyan-700   dark:bg-cyan-900/30   dark:border-cyan-600'   },
  { id: 'direitos_beneficios',    label: 'Direitos e Benefícios',    icon: Shield,       color: 'bg-green-100  border-green-300  text-green-700  dark:bg-green-900/30  dark:border-green-600'  },
  { id: 'respeito_saude',         label: 'Respeito e Saúde',         icon: Heart,        color: 'bg-rose-100   border-rose-300   text-rose-700   dark:bg-rose-900/30   dark:border-rose-600'   },
  { id: 'elogios',                label: 'Elogios!',                 icon: Star,         color: 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600' },
  { id: 'outro',                  label: 'Outro Assunto',            icon: HelpCircle,   color: 'bg-gray-100   border-gray-300   text-gray-600   dark:bg-gray-800      dark:border-gray-600'   },
] as const;

const MAX_MESSAGE_LEN = 2000;

const PortalSugestoes: React.FC = () => {
  const { funcionario, loading, error } = useEmployeePortal();
  const { showToast, ToastContainer } = useToast();
  const { unreadMessages, markAsRead } = useUnreadMessages(funcionario?.id || null);

  const [temaSelecionado, setTemaSelecionado] = useState<string | null>(null);
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagem>('sugestao');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false);

  const [historico, setHistorico] = useState<SugestaoReclamacao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Set de IDs de mensagens não lidas para verificação rápida
  const unreadIds = new Set(unreadMessages.map(m => m.id));

  useEffect(() => {
    if (funcionario) {
      fetchHistorico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionario]);

  const fetchHistorico = async () => {
    if (!funcionario) return;

    setLoadingHistorico(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id, data_registro, tema, sugestao, reclamacao, resposta_empresa, data_resposta, status')
        .eq('funcionario_id', funcionario.id)
        .order('data_registro', { ascending: false });

      if (fetchError) throw fetchError;
      setHistorico((data || []) as SugestaoReclamacao[]);
    } catch (err) {
    } finally {
      setLoadingHistorico(false);
    }
  };

  const resetForm = () => {
    setEnviadoComSucesso(false);
    setTemaSelecionado(null);
    setTipoMensagem('sugestao');
    setMensagem('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!temaSelecionado && tipoMensagem !== 'ferias') {
      showToast('Por favor, selecione um tema.', 'error');
      return;
    }

    const msg = mensagem.trim();
    if (!msg) {
      showToast('Por favor, descreva sua sugestão/reclamação.', 'error');
      return;
    }

    if (msg.length > MAX_MESSAGE_LEN) {
      showToast(`Mensagem muito longa (máx. ${MAX_MESSAGE_LEN} caracteres).`, 'error');
      return;
    }

    if (!funcionario) return;

    setEnviando(true);
    try {
      // Mensagens sobre férias usam tema fixo 'ferias' (aparecem em Mensagens Férias no admin)
      // Demais mensagens usam o tema de assunto selecionado
      const temaFinal = tipoMensagem === 'ferias'
        ? 'ferias'
        : temas.find((t) => t.id === temaSelecionado)?.label || temaSelecionado;

      const payload = {
        funcionario_id: funcionario.id,
        nome_funcionario: funcionario.nome_completo,
        tema: temaFinal,
        sugestao: tipoMensagem === 'sugestao' || tipoMensagem === 'ferias' ? msg : null,
        reclamacao: tipoMensagem === 'reclamacao' ? msg : null,
      };

      const { error: insertError } = await supabase.from('sugestoes_reclamacoes').insert(payload);

      if (insertError) throw insertError;

      showToast('Sua mensagem foi enviada com sucesso!', 'success');
      setEnviadoComSucesso(true);
      resetForm();
      fetchHistorico();
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar mensagem.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error || !funcionario) {
    return (
      <PortalLayout>
        <main className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Acesso não disponível</h1>
          <p className="text-muted-foreground max-w-md">{error || 'Seu usuário ainda não está vinculado a um funcionário.'}</p>
        </main>
      </PortalLayout>
    );
  }

  if (enviadoComSucesso) {
    return (
      <PortalLayout employeeName={funcionario.nome_completo}>
        <main className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Mensagem Enviada!</h1>
            <p className="text-muted-foreground mb-6">
              Sua sugestão/reclamação foi registrada com sucesso. A empresa irá analisar e responder em breve.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={resetForm}>Enviar Nova Mensagem</Button>
              <Button variant="outline" onClick={() => setMostrarHistorico(true)} className="text-red-600">
                Ver Histórico
              </Button>
              <Link to="/portal">
                <Button variant="outline">Voltar ao Início</Button>
              </Link>
            </div>
          </Card>
        </main>
      </PortalLayout>
    );
  }

  if (mostrarHistorico) {
    return (
      <PortalLayout employeeName={funcionario.nome_completo}>
        <main className="max-w-4xl mx-auto">
          <header className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => setMostrarHistorico(false)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Mensagens</h1>
          </header>

          {loadingHistorico ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : historico.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Você ainda não enviou nenhuma mensagem.</p>
            </Card>
          ) : (
            <section className="space-y-4" aria-label="Histórico de sugestões e reclamações">
              {historico.map((item) => {
                const tipo = item.sugestao ? 'Sugestão' : 'Reclamação';
                const conteudo = item.sugestao || item.reclamacao || '';
                const isUnread = unreadIds.has(item.id);

                return (
                  <Card 
                    key={item.id} 
                    className={`p-4 sm:p-6 transition-all ${
                      isUnread 
                        ? 'ring-2 ring-amber-400 bg-amber-50/50 dark:bg-amber-900/10' 
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                            <Bell className="w-3 h-3" />
                            NOVA RESPOSTA
                          </span>
                        )}
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                          {item.tema}
                        </span>
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                          {tipo}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(item.data_registro)}</span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-foreground mb-1">{tipo}:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{conteudo}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium text-blue-600 mb-2">Resposta da Empresa:</p>
                      {item.resposta_empresa ? (
                        <div className={`rounded-lg p-3 ${isUnread ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-blue-50'}`}>
                          <p className={`text-sm whitespace-pre-wrap ${isUnread ? 'text-amber-800 dark:text-amber-200 font-medium' : 'text-blue-700'}`}>
                            {item.resposta_empresa}
                          </p>
                          {item.data_resposta && (
                            <p className={`text-xs mt-2 ${isUnread ? 'text-amber-600 dark:text-amber-400' : 'text-blue-500'}`}>
                              Respondido em: {formatDate(item.data_resposta)}
                            </p>
                          )}
                          {isUnread && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markAsRead(item.id)}
                              className="mt-3 text-xs border-amber-500 text-amber-700 hover:bg-amber-100"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aguardando resposta...</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.status === 'respondida'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.status === 'respondida' ? 'Respondida' : 'Pendente'}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </section>
          )}
        </main>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario.nome_completo}>
      <ToastContainer />
      <main className="max-w-3xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link to="/portal">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sugestões e Reclamações</h1>
              <p className="text-sm text-muted-foreground">Sua opinião é muito importante para nós!</p>
            </div>
          </div>

          {historico.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setMostrarHistorico(true)} 
              className={`flex items-center gap-2 ${unreadMessages.length > 0 ? 'border-amber-500 text-amber-700 animate-pulse' : 'text-red-600'}`}
            >
              <MessageSquare className="w-4 h-4" />
              Ver Histórico ({historico.length})
              {unreadMessages.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  {unreadMessages.length} nova{unreadMessages.length > 1 ? 's' : ''}
                </span>
              )}
            </Button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Formulário de sugestão/reclamação">
          <Card className="p-4">
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <input
              type="text"
              value={funcionario.nome_completo}
              disabled
              className="w-full px-3 py-2 rounded-md bg-muted text-foreground border border-border cursor-not-allowed"
            />
          </Card>

          {tipoMensagem !== 'ferias' && (
          <Card className="p-4">
            <label className="block text-sm font-medium text-foreground mb-4">Marque um assunto:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {temas.map((tema) => {
                const IconComponent = tema.icon;
                const isSelected = temaSelecionado === tema.id;

                return (
                  <button
                    key={tema.id}
                    type="button"
                    onClick={() => setTemaSelecionado(tema.id)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${tema.color} ring-2 ring-offset-1`
                        : 'border-border bg-background hover:opacity-80'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <CheckCircle className="absolute top-2 right-2 w-4 h-4" />}
                    <IconComponent className="w-6 h-6 mb-2" />
                    <span className="text-xs sm:text-sm text-center font-medium">{tema.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          )}

          <Card className="p-4">
            <label className="block text-sm font-medium text-foreground mb-3">Teor da mensagem</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTipoMensagem('sugestao')}
                className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  tipoMensagem === 'sugestao'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-700 ring-2 ring-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-500'
                    : 'border-border bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/10'
                }`}
                aria-pressed={tipoMensagem === 'sugestao'}
              >
                {tipoMensagem === 'sugestao' && <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-indigo-600" />}
                <MessageSquare className={`w-6 h-6 mb-2 ${tipoMensagem === 'sugestao' ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium text-foreground">Sugestão</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoMensagem('reclamacao')}
                className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  tipoMensagem === 'reclamacao'
                    ? 'bg-red-100 border-red-400 text-red-700 ring-2 ring-red-300 dark:bg-red-900/30 dark:border-red-500'
                    : 'border-border bg-red-50 hover:bg-red-100 dark:bg-red-900/10'
                }`}
                aria-pressed={tipoMensagem === 'reclamacao'}
              >
                {tipoMensagem === 'reclamacao' && <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-red-600" />}
                <AlertCircle className={`w-6 h-6 mb-2 ${tipoMensagem === 'reclamacao' ? 'text-red-600' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium text-foreground">Reclamação</span>
              </button>
              <button
                type="button"
                onClick={() => { setTipoMensagem('ferias'); setTemaSelecionado(null); }}
                className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  tipoMensagem === 'ferias'
                    ? 'bg-teal-100 border-teal-400 text-teal-700 ring-2 ring-teal-300 dark:bg-teal-900/30 dark:border-teal-500'
                    : 'border-border bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/10'
                }`}
                aria-pressed={tipoMensagem === 'ferias'}
              >
                {tipoMensagem === 'ferias' && <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-teal-600" />}
                <Umbrella className={`w-6 h-6 mb-2 ${tipoMensagem === 'ferias' ? 'text-teal-600' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium text-foreground">Férias</span>
              </button>
            </div>
            {tipoMensagem === 'ferias' && (
              <p className="mt-3 text-xs text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg px-3 py-2">
                Dúvidas ou solicitações sobre férias serão encaminhadas diretamente ao setor responsável.
              </p>
            )}
          </Card>

          <Card className="p-4">
            <label className="block text-sm font-medium text-foreground mb-2">Texto da mensagem</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder={
                tipoMensagem === 'sugestao'
                  ? 'Descreva sua sugestão aqui...'
                  : tipoMensagem === 'ferias'
                    ? 'Descreva sua dúvida ou solicitação sobre férias...'
                    : 'Descreva sua reclamação aqui...'
              }
              rows={5}
              maxLength={MAX_MESSAGE_LEN}
              className="w-full px-3 py-2 rounded-md bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <div className="mt-2 text-xs text-muted-foreground text-right">{mensagem.length}/{MAX_MESSAGE_LEN}</div>
          </Card>

          <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={enviando}>
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </form>
      </main>
    </PortalLayout>
  );
};

export default PortalSugestoes;
