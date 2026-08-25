import React, { useState } from 'react';
import { Bell, Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface BulkNotificationButtonProps {
  mes: number;
  ano: number;
  funcionarioIds?: string[];
}

const BulkNotificationButton: React.FC<BulkNotificationButtonProps> = ({
  mes,
  ano,
  funcionarioIds
}) => {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { showToast } = useToast();

  const enviarNotificacoes = async () => {
    setSending(true);
    setResult(null);

    try {
      // Se não tiver IDs específicos, buscar todos os funcionários com holerite no período
      let idsParaNotificar = funcionarioIds || [];

      if (idsParaNotificar.length === 0) {
        const { data: folhas, error } = await supabase
          .from('folha_calculada')
          .select('funcionario_id')
          .eq('mes', mes)
          .eq('ano', ano);

        if (error) {
          throw new Error('Erro ao buscar funcionários: ' + error.message);
        }

        idsParaNotificar = folhas?.map(f => f.funcionario_id) || [];
      }

      if (idsParaNotificar.length === 0) {
        setResult({
          success: false,
          message: 'Nenhum funcionário encontrado com holerite neste período'
        });
        showToast('Nenhum funcionário encontrado', 'info');
        return;
      }

      // Chamar edge function para enviar notificações
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          funcionarioIds: idsParaNotificar,
          title: '📄 Novo Holerite Disponível',
          body: `Seu holerite de ${mes.toString().padStart(2, '0')}/${ano} está disponível para consulta.`,
          data: { mes, ano, type: 'new_holerite' }
        }
      });

      if (error) {
        throw new Error('Erro ao enviar notificações: ' + error.message);
      }

      const notificados = data?.notificados || idsParaNotificar.length;
      setResult({
        success: true,
        message: `Notificações enviadas para ${notificados} funcionário(s)`
      });
      showToast(`Notificações enviadas para ${notificados} funcionário(s)`, 'success');

    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro ao enviar notificações'
      });
      showToast(error.message || 'Erro ao enviar notificações', 'error');
    } finally {
      setSending(false);
    }
  };

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={enviarNotificacoes}
        disabled={sending}
        variant="secondary"
        className="flex items-center gap-2"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Enviando...</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">
              Notificar {funcionarioIds?.length ? `(${funcionarioIds.length})` : 'Todos'}
            </span>
          </>
        )}
      </Button>
      
      {result && (
        <div className={`text-xs flex items-center gap-1 ${
          result.success ? 'text-green-600' : 'text-red-600'
        }`}>
          {result.success ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
};

export default BulkNotificationButton;
