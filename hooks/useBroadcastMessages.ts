import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BroadcastMessage {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  criado_por: string | null;
  created_at: string;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  funcionario_id: string | null;
}

interface FuncionarioData {
  empresa_id: string | null;
  posto_trabalho_id: string | null;
}

export const useBroadcastMessages = (funcionarioId: string | null) => {
  const [unreadBroadcasts, setUnreadBroadcasts] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnreadBroadcasts = useCallback(async () => {
    if (!funcionarioId) {
      setUnreadBroadcasts([]);
      setLoading(false);
      return;
    }

    try {
      // Primeiro, buscar dados do funcionário para filtrar mensagens direcionadas
      const { data: funcionarioData, error: funcError } = await supabase
        .from('funcionarios')
        .select('empresa_id, posto_trabalho_id')
        .eq('id', funcionarioId)
        .single();

      if (funcError) {
        setLoading(false);
        return;
      }

      const funcData: FuncionarioData = funcionarioData || { empresa_id: null, posto_trabalho_id: null };

      // Buscar todas as mensagens ativas
      const { data: allMessages, error: messagesError } = await supabase
        .from('mensagens_broadcast')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (messagesError) {
        setLoading(false);
        return;
      }

      if (!allMessages || allMessages.length === 0) {
        setUnreadBroadcasts([]);
        setLoading(false);
        return;
      }

      // Filtrar mensagens que são destinadas a este funcionário
      const targetedMessages = allMessages.filter(msg => {
        // Se tem funcionario_id específico, só mostra para esse funcionário
        if (msg.funcionario_id) {
          return msg.funcionario_id === funcionarioId;
        }
        
        // Se tem posto_trabalho_id, só mostra para funcionários desse posto
        if (msg.posto_trabalho_id) {
          return msg.posto_trabalho_id === funcData.posto_trabalho_id;
        }
        
        // Se tem empresa_id, só mostra para funcionários dessa empresa
        if (msg.empresa_id) {
          return msg.empresa_id === funcData.empresa_id;
        }
        
        // Sem filtro = mensagem para todos
        return true;
      });

      // Buscar mensagens já lidas pelo funcionário
      const { data: readMessages, error: readError } = await supabase
        .from('mensagens_broadcast_lidas')
        .select('mensagem_id')
        .eq('funcionario_id', funcionarioId);

      if (readError) {
        setLoading(false);
        return;
      }

      const readIds = new Set(readMessages?.map(m => m.mensagem_id) || []);
      
      // Filtrar mensagens não lidas
      const unread = targetedMessages.filter(msg => !readIds.has(msg.id));
      setUnreadBroadcasts(unread);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [funcionarioId]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!funcionarioId) return;

    try {
      const { error } = await supabase
        .from('mensagens_broadcast_lidas')
        .insert({
          mensagem_id: messageId,
          funcionario_id: funcionarioId
        });

      if (error) {
        return;
      }

      setUnreadBroadcasts(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
    }
  }, [funcionarioId]);

  const markAllAsRead = useCallback(async () => {
    if (!funcionarioId || unreadBroadcasts.length === 0) return;

    try {
      const inserts = unreadBroadcasts.map(msg => ({
        mensagem_id: msg.id,
        funcionario_id: funcionarioId
      }));

      const { error } = await supabase
        .from('mensagens_broadcast_lidas')
        .insert(inserts);

      if (error) {
        return;
      }

      setUnreadBroadcasts([]);
    } catch (error) {
    }
  }, [funcionarioId, unreadBroadcasts]);

  useEffect(() => {
    fetchUnreadBroadcasts();
  }, [fetchUnreadBroadcasts]);

  return {
    unreadBroadcasts,
    unreadCount: unreadBroadcasts.length,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchUnreadBroadcasts
  };
};
