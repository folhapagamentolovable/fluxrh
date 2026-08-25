import React, { useState } from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { BroadcastMessage } from '../../hooks/useBroadcastMessages';

interface BroadcastMessageAlertProps {
  messages: BroadcastMessage[];
  onMarkAsRead: (messageId: string) => void;
  onMarkAllAsRead: () => void;
}

const BroadcastMessageAlert: React.FC<BroadcastMessageAlertProps> = ({
  messages,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(messages[0]?.id || null);

  if (messages.length === 0) return null;

  const getTypeConfig = (tipo: string) => {
    switch (tipo) {
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-500',
          titleColor: 'text-amber-800',
          badgeColor: 'bg-amber-100 text-amber-700'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-800',
          badgeColor: 'bg-red-100 text-red-700'
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          titleColor: 'text-green-800',
          badgeColor: 'bg-green-100 text-green-700'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-700'
        };
    }
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

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Header com contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10 animate-pulse">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-foreground">
            {messages.length} {messages.length === 1 ? 'Nova Mensagem' : 'Novas Mensagens'}
          </span>
        </div>
        {messages.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Lista de mensagens */}
      {messages.map((message) => {
        const config = getTypeConfig(message.tipo);
        const Icon = config.icon;
        const isExpanded = expandedId === message.id;

        return (
          <Card
            key={message.id}
            className={`p-4 ${config.bgColor} ${config.borderColor} border-2 transition-all duration-300`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${config.bgColor}`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-semibold ${config.titleColor} text-base`}>
                    {message.titulo}
                  </h3>
                  <button
                    onClick={() => onMarkAsRead(message.id)}
                    className="p-1 hover:bg-white/50 rounded-full transition-colors flex-shrink-0"
                    title="Marcar como lida"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(message.created_at)}
                  {message.criado_por && ` • ${message.criado_por}`}
                </p>

                {/* Mensagem expandível */}
                <div className="mt-2">
                  <p className={`text-sm text-gray-700 ${!isExpanded && message.mensagem.length > 150 ? 'line-clamp-2' : ''}`}>
                    {message.mensagem}
                  </p>
                  
                  {message.mensagem.length > 150 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : message.id)}
                      className="flex items-center gap-1 text-xs text-primary font-medium mt-1 hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Ver mais
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Botão de confirmação */}
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkAsRead(message.id)}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default BroadcastMessageAlert;
