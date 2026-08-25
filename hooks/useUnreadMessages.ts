import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UnreadMessage {
  id: string;
  tema: string;
  resposta_empresa: string;
  data_resposta: string;
}

export const useUnreadMessages = (funcionarioId: string | null) => {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  const fetchUnreadMessages = useCallback(async () => {
    if (!funcionarioId) return;

    setLoading(true);
    try {
      // Buscar mensagens respondidas
      const { data: respondidas, error: respondidasError } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id, tema, resposta_empresa, data_resposta')
        .eq('funcionario_id', funcionarioId)
        .eq('status', 'respondida')
        .not('resposta_empresa', 'is', null)
        .order('data_resposta', { ascending: false });

      if (respondidasError) throw respondidasError;

      // Buscar mensagens já lidas do banco de dados
      const { data: lidas, error: lidasError } = await supabase
        .from('mensagens_lidas')
        .select('sugestao_id')
        .eq('funcionario_id', funcionarioId);

      if (lidasError) throw lidasError;

      // IDs das mensagens já lidas
      const lidasIds = new Set((lidas || []).map(l => l.sugestao_id));

      // Filtrar apenas mensagens não lidas
      const unread = (respondidas || []).filter(msg => !lidasIds.has(msg.id));
      setUnreadMessages(unread);

      // Tocar som se houver mensagens não lidas e ainda não tocou
      if (unread.length > 0 && !hasPlayedSound) {
        playNotificationSound();
        setHasPlayedSound(true);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [funcionarioId, hasPlayedSound]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!funcionarioId) return;

    try {
      // Inserir no banco de dados (upsert para evitar duplicatas)
      const { error } = await supabase
        .from('mensagens_lidas')
        .upsert({
          funcionario_id: funcionarioId,
          sugestao_id: messageId,
          lida_em: new Date().toISOString()
        }, {
          onConflict: 'funcionario_id,sugestao_id'
        });

      if (error) throw error;

      // Atualizar estado local
      setUnreadMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
    }
  }, [funcionarioId]);

  const markAllAsRead = useCallback(async () => {
    if (!funcionarioId || unreadMessages.length === 0) return;

    try {
      // Preparar dados para inserção em lote
      const records = unreadMessages.map(msg => ({
        funcionario_id: funcionarioId,
        sugestao_id: msg.id,
        lida_em: new Date().toISOString()
      }));

      // Inserir todas de uma vez (upsert)
      const { error } = await supabase
        .from('mensagens_lidas')
        .upsert(records, {
          onConflict: 'funcionario_id,sugestao_id'
        });

      if (error) throw error;

      // Limpar estado local
      setUnreadMessages([]);
    } catch (err) {
    }
  }, [funcionarioId, unreadMessages]);

  const playNotificationSound = () => {
    try {
      // Criar um som de notificação usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Criar oscilador para som de notificação
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar tom agradável (similar a notificação)
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Nota A5
      oscillator.type = 'sine';
      
      // Volume suave
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Segundo tom mais grave para efeito de notificação
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(660, audioContext.currentTime); // Nota E5
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchUnreadMessages();
  }, [fetchUnreadMessages]);

  return {
    unreadMessages,
    unreadCount: unreadMessages.length,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchUnreadMessages,
  };
};
