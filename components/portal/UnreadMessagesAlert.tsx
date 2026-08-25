import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, X, ChevronRight, CheckCheck } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface UnreadMessage {
  id: string;
  tema: string;
  resposta_empresa: string;
  data_resposta: string;
}

interface UnreadMessagesAlertProps {
  messages: UnreadMessage[];
  onMarkAsRead: (messageId: string) => void;
  onMarkAllAsRead: () => void;
}

const UnreadMessagesAlert: React.FC<UnreadMessagesAlertProps> = ({
  messages,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  if (messages.length === 0 || isDismissed) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDismiss = () => {
    onMarkAllAsRead();
    setIsDismissed(true);
  };

  return (
    <div className="animate-fade-in">
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-lg">
        {/* Animated border glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse pointer-events-none" />
        
        {/* Header */}
        <div className="relative p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              {/* Badge com contador */}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center animate-bounce">
                {messages.length}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base sm:text-lg">
                🎉 Você tem {messages.length === 1 ? 'uma resposta' : `${messages.length} respostas`} nova{messages.length > 1 ? 's' : ''}!
              </h3>
              <p className="text-sm text-muted-foreground">
                Sua{messages.length > 1 ? 's' : ''} mensage{messages.length > 1 ? 'ns foram respondidas' : 'm foi respondida'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar alerta"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        {isExpanded && (
          <div className="relative px-4 pb-4 space-y-3">
            {messages.slice(0, 3).map((message) => (
              <div
                key={message.id}
                className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-primary truncate">
                        {message.tema}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(message.data_resposta)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.resposta_empresa}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {messages.length > 3 && (
              <p className="text-sm text-center text-muted-foreground">
                E mais {messages.length - 3} outra{messages.length - 3 > 1 ? 's' : ''} resposta{messages.length - 3 > 1 ? 's' : ''}...
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Link to="/portal/sugestoes" className="flex-1">
                <Button 
                  className="w-full gap-2"
                  onClick={onMarkAllAsRead}
                >
                  <MessageSquare className="w-4 h-4" />
                  Ver Todas as Respostas
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDismiss}
              >
                <CheckCheck className="w-4 h-4" />
                Marcar como Lidas
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UnreadMessagesAlert;
