import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Bell, Clock } from 'lucide-react';
import ClientPortalLayout from '../../components/portal/ClientPortalLayout';
import { useAuth } from '../../contexts/AuthContext';

const ClientPortalHome: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const cards = [
    {
      title: 'Escalas',
      description: 'Visualize as escalas mensais dos funcionários dos seus postos de trabalho',
      icon: Calendar,
      color: 'from-teal-500 to-teal-600',
      path: '/portal-cliente/escalas',
    },
    {
      title: 'Alertas de Férias',
      description: 'Monitoramento de períodos aquisitivos de férias dos funcionários',
      icon: Bell,
      color: 'from-amber-500 to-amber-600',
      path: '/portal-cliente/alertas-ferias',
    },
    {
      title: 'Banco de Horas',
      description: 'Relatório consolidado de horas excedentes por funcionário',
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      path: '/portal-cliente/banco-horas',
    },
  ];

  return (
    <ClientPortalLayout clientName={profile?.user_name || profile?.email || 'Cliente'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portal do Cliente</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Acompanhe as informações dos seus postos de trabalho</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden text-left group hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
            >
              <div className={`bg-gradient-to-r ${card.color} p-6 flex items-center justify-center`}>
                <card.icon className="w-12 h-12 text-white" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientPortalHome;
