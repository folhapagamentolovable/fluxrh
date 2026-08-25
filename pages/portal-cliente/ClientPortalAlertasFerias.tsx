import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import ClientPortalLayout from '../../components/portal/ClientPortalLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AlertaFerias {
  funcionario_id: string;
  nome_funcionario: string;
  data_admissao: string;
  periodo_aquisitivo: number;
  data_limite: Date;
  data_limite_2?: Date;
  dias_restantes: number;
  tipo: 'atingido' | 'proximo';
  empresa?: string;
  cargo?: string;
}

const ClientPortalAlertasFerias: React.FC = () => {
  const { profile, user } = useAuth();
  const [alertas, setAlertas] = useState<AlertaFerias[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientPostos, setClientPostos] = useState<string[]>([]);
  const [postoNome, setPostoNome] = useState<string>('');
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('client_postos').select('posto_id').eq('user_id', user.id)
        .then(({ data }) => {
          const postoIds = (data || []).map((d: any) => d.posto_id);
          setClientPostos(postoIds);
          
          // Buscar nome do primeiro posto
          if (postoIds.length > 0) {
            supabase.from('postos_trabalho').select('nome_posto').eq('id', postoIds[0]).single()
              .then(({ data: posto }) => {
                if (posto) setPostoNome(posto.nome_posto);
              });
          }
        });
    }
  }, [user]);

  useEffect(() => {
    if (clientPostos.length > 0) carregarFuncionarios();
  }, [clientPostos]);

  useEffect(() => {
    if (funcionarios.length > 0) calcularAlertas();
  }, [funcionarios]);

  const carregarFuncionarios = async () => {
    const { data } = await supabase.from('funcionarios')
      .select('id, nome_completo, data_admissao, nome_empresa, nome_cargo, posto_trabalho_id, ativo, demitido')
      .in('posto_trabalho_id', clientPostos)
      .eq('ativo', true).eq('demitido', false);
    setFuncionarios(data || []);
  };

  const calcularAlertas = () => {
    setLoading(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alertasEncontrados: AlertaFerias[] = [];

    for (const func of funcionarios) {
      if (!func.data_admissao) continue;
      const dataAdmissao = new Date(func.data_admissao + 'T00:00:00');
      const anosDesdeAdmissao = hoje.getFullYear() - dataAdmissao.getFullYear();

      for (let periodo = 1; periodo <= anosDesdeAdmissao + 1; periodo++) {
        const dataLimite = new Date(dataAdmissao);
        dataLimite.setFullYear(dataAdmissao.getFullYear() + periodo);
        dataLimite.setDate(dataLimite.getDate() - 1);

        const diffTime = dataLimite.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Calcular data limite do segundo período (período + 1 ano)
        const dataLimite2 = new Date(dataAdmissao);
        dataLimite2.setFullYear(dataAdmissao.getFullYear() + periodo + 1);
        dataLimite2.setDate(dataLimite2.getDate() - 1);

        if (diasRestantes <= 0 && diasRestantes >= -365) {
          alertasEncontrados.push({
            funcionario_id: func.id,
            nome_funcionario: func.nome_completo,
            data_admissao: func.data_admissao,
            periodo_aquisitivo: periodo,
            data_limite: dataLimite,
            data_limite_2: dataLimite2,
            dias_restantes: diasRestantes,
            tipo: 'atingido',
            empresa: func.nome_empresa,
            cargo: func.nome_cargo,
          });
        } else if (diasRestantes > 0 && diasRestantes <= 30) {
          alertasEncontrados.push({
            funcionario_id: func.id,
            nome_funcionario: func.nome_completo,
            data_admissao: func.data_admissao,
            periodo_aquisitivo: periodo,
            data_limite: dataLimite,
            data_limite_2: dataLimite2,
            dias_restantes: diasRestantes,
            tipo: 'proximo',
            empresa: func.nome_empresa,
            cargo: func.nome_cargo,
          });
        }
      }
    }

    alertasEncontrados.sort((a, b) => {
      if (a.tipo === 'atingido' && b.tipo !== 'atingido') return -1;
      if (a.tipo !== 'atingido' && b.tipo === 'atingido') return 1;
      return a.dias_restantes - b.dias_restantes;
    });

    setAlertas(alertasEncontrados);
    setLoading(false);
  };

  const formatarData = (data: Date) => data.toLocaleDateString('pt-BR');

  return (
    <ClientPortalLayout clientName={profile?.user_name || profile?.email || 'Cliente'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" /> Alertas de Férias
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitoramento de períodos aquisitivos dos funcionários do {postoNome || 'condomínio'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Verificando períodos aquisitivos...</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum alerta de férias</h3>
            <p className="text-gray-600 dark:text-gray-400">Todos os períodos aquisitivos estão em dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertas.map((alerta) => (
              <div key={`${alerta.funcionario_id}-${alerta.periodo_aquisitivo}-${alerta.tipo}`}
                className={`bg-white dark:bg-gray-800 border-l-4 rounded-lg p-5 shadow-sm ${
                  alerta.tipo === 'atingido' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                    : 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'
                }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {alerta.tipo === 'atingido' 
                      ? <AlertTriangle className="w-6 h-6 text-red-600" />
                      : <Calendar className="w-6 h-6 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{alerta.nome_funcionario}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        alerta.tipo === 'atingido' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {alerta.tipo === 'atingido' ? '🚨 PERÍODO ATINGIDO' : '⚠️ PERÍODO PRÓXIMO'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Período Aquisitivo</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{alerta.periodo_aquisitivo}º ano</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Data Admissão</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatarData(new Date(alerta.data_admissao + 'T00:00:00'))}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Data Limite 1</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatarData(alerta.data_limite)}</p>
                      </div>
                      {alerta.data_limite_2 && (
                        <div>
                          <p className="text-gray-500">Data Limite 2</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{formatarData(alerta.data_limite_2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">{alerta.tipo === 'atingido' ? 'Dias Vencidos' : 'Dias Restantes'}</p>
                        <p className={`font-bold text-lg ${alerta.tipo === 'atingido' ? 'text-red-600' : 'text-amber-600'}`}>
                          {Math.abs(alerta.dias_restantes)} dias
                        </p>
                      </div>
                      {alerta.cargo && (
                        <div>
                          <p className="text-gray-500">Cargo</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{alerta.cargo}</p>
                        </div>
                      )}
                      {alerta.empresa && (
                        <div>
                          <p className="text-gray-500">Empresa</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{alerta.empresa}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default ClientPortalAlertasFerias;
