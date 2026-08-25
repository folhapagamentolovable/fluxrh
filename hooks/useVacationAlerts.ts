import { useState, useEffect } from 'react';
import { useFuncionarios } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AlertaDismissed {
    funcionario_id: string;
    periodo: number;
    tipo: 'atingido' | 'proximo';
    data_dismissal: Date;
}

interface FeriasUsufruidas {
    funcionario_id: string;
    periodo: number;
    data_usufruto: Date;
    nova_data_limite: Date;
}

export const useVacationAlerts = () => {
    const { data: allFuncionarios } = useFuncionarios();
    const { isClient, user } = useAuth();
    const [alertCount, setAlertCount] = useState(0);
    const [clientPostos, setClientPostos] = useState<string[]>([]);

    // Carregar postos vinculados ao cliente
    useEffect(() => {
        if (isClient && user) {
            supabase
                .from('client_postos')
                .select('posto_trabalho_id')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    setClientPostos((data || []).map((d: any) => d.posto_trabalho_id));
                });
        }
    }, [isClient, user]);

    // Filtrar funcionários pelos postos do cliente
    const funcionarios = isClient
        ? allFuncionarios?.filter((f: any) => f.posto_trabalho_id && clientPostos.includes(f.posto_trabalho_id))
        : allFuncionarios;

    useEffect(() => {
        if (!funcionarios || funcionarios.length === 0) {
            setAlertCount(0);
            return;
        }

        const contarAlertas = () => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Carregar alertas dismissed
            const stored = localStorage.getItem('vacation_alerts_dismissed');
            const alertasDismissed: AlertaDismissed[] = stored 
                ? JSON.parse(stored).map((a: any) => ({
                    ...a,
                    data_dismissal: new Date(a.data_dismissal)
                }))
                : [];

            // Carregar férias usufruídas
            const storedFerias = localStorage.getItem('vacation_taken');
            const feriasUsufruidas: FeriasUsufruidas[] = storedFerias
                ? JSON.parse(storedFerias).map((f: any) => ({
                    ...f,
                    data_usufruto: new Date(f.data_usufruto),
                    nova_data_limite: new Date(f.nova_data_limite)
                }))
                : [];

            let count = 0;

            for (const funcionario of funcionarios) {
                // Ignorar funcionários sem data de admissão, demitidos ou inativos
                if (!funcionario.data_admissao || funcionario.demitido || !funcionario.ativo) continue;

                const dataAdmissao = new Date(funcionario.data_admissao + 'T00:00:00');
                const anosDesdeAdmissao = hoje.getFullYear() - dataAdmissao.getFullYear();

                for (let periodo = 1; periodo <= anosDesdeAdmissao + 1; periodo++) {
                    // Verificar se as férias deste período foram usufruídas
                    const feriasUsufruida = feriasUsufruidas.find(
                        f => f.funcionario_id === funcionario.id && f.periodo === periodo
                    );

                    // Se foram usufruídas, usar a nova data limite
                    let dataLimite: Date;
                    if (feriasUsufruida) {
                        dataLimite = feriasUsufruida.nova_data_limite;
                    } else {
                        dataLimite = new Date(dataAdmissao);
                        dataLimite.setFullYear(dataAdmissao.getFullYear() + periodo);
                        dataLimite.setDate(dataLimite.getDate() - 1);
                    }

                    const diffTime = dataLimite.getTime() - hoje.getTime();
                    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    const jaDismissed = alertasDismissed.find(
                        d => d.funcionario_id === funcionario.id && d.periodo === periodo
                    );

                    // Alerta ATINGIDO
                    if (diasRestantes <= 0 && diasRestantes >= -365) {
                        const dismissedAtingido = jaDismissed?.tipo === 'atingido';
                        const diasDesdeDismissal = dismissedAtingido 
                            ? Math.ceil((hoje.getTime() - jaDismissed!.data_dismissal.getTime()) / (1000 * 60 * 60 * 24))
                            : 999;

                        if (!dismissedAtingido || diasDesdeDismissal >= 7) {
                            count++;
                        }
                    }
                    // Alerta PRÓXIMO
                    else if (diasRestantes > 0 && diasRestantes <= 30) {
                        const dismissedProximo = jaDismissed?.tipo === 'proximo';
                        const diasDesdeDismissal = dismissedProximo
                            ? Math.ceil((hoje.getTime() - jaDismissed!.data_dismissal.getTime()) / (1000 * 60 * 60 * 24))
                            : 999;

                        if (!dismissedProximo || diasDesdeDismissal >= 7) {
                            count++;
                        }
                    }
                }
            }

            setAlertCount(count);
        };

        contarAlertas();

        // Atualizar a cada hora
        const interval = setInterval(contarAlertas, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [funcionarios]);

    return alertCount;
};
