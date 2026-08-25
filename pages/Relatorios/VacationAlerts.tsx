import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AlertTriangle, Calendar, CheckCircle, X } from 'lucide-react';
import { useFuncionarios } from '../../hooks/useSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AlertaFerias {
    funcionario_id: string;
    nome_funcionario: string;
    data_admissao: string;
    periodo_aquisitivo: number;
    data_limite: Date;
    dias_restantes: number;
    tipo: 'atingido' | 'proximo';
    empresa?: string;
    cargo?: string;
}

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

const VacationAlerts: React.FC = () => {
    const { data: allFuncionarios } = useFuncionarios();
    const { isClient, user } = useAuth();
    const [clientPostos, setClientPostos] = useState<string[]>([]);
    const [alertas, setAlertas] = useState<AlertaFerias[]>([]);
    const [alertasDismissed, setAlertasDismissed] = useState<AlertaDismissed[]>([]);
    const [feriasUsufruidas, setFeriasUsufruidas] = useState<FeriasUsufruidas[]>([]);
    const [loading, setLoading] = useState(true);

    // Carregar postos vinculados ao cliente
    useEffect(() => {
        if (isClient && user) {
            supabase
                .from('client_postos')
                .select('posto_id')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    setClientPostos((data || []).map((d: any) => d.posto_id));
                });
        }
    }, [isClient, user]);

    // Filtrar funcionários pelos postos do cliente
    const funcionarios = isClient
        ? allFuncionarios?.filter((f: any) => f.posto_trabalho_id && clientPostos.includes(f.posto_trabalho_id))
        : allFuncionarios;

    useEffect(() => {
        carregarAlertas();
        carregarAlertasDismissed();
        carregarFeriasUsufruidas();
        
        // Verificar alertas a cada hora
        const interval = setInterval(() => {
            carregarAlertas();
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [funcionarios]);

    const carregarAlertasDismissed = () => {
        const stored = localStorage.getItem('vacation_alerts_dismissed');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Converter strings de data de volta para Date
            const withDates = parsed.map((a: any) => ({
                ...a,
                data_dismissal: new Date(a.data_dismissal)
            }));
            setAlertasDismissed(withDates);
        }
    };

    const salvarAlertasDismissed = (dismissed: AlertaDismissed[]) => {
        localStorage.setItem('vacation_alerts_dismissed', JSON.stringify(dismissed));
        setAlertasDismissed(dismissed);
    };

    const carregarFeriasUsufruidas = () => {
        const stored = localStorage.getItem('vacation_taken');
        if (stored) {
            const parsed = JSON.parse(stored);
            const withDates = parsed.map((f: any) => ({
                ...f,
                data_usufruto: new Date(f.data_usufruto),
                nova_data_limite: new Date(f.nova_data_limite)
            }));
            setFeriasUsufruidas(withDates);
        }
    };

    const salvarFeriasUsufruidas = (ferias: FeriasUsufruidas[]) => {
        localStorage.setItem('vacation_taken', JSON.stringify(ferias));
        setFeriasUsufruidas(ferias);
    };

    const carregarAlertas = async () => {
        if (!funcionarios || funcionarios.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const alertasEncontrados: AlertaFerias[] = [];

        for (const funcionario of funcionarios) {
            // Ignorar funcionários sem data de admissão, demitidos ou inativos
            if (!funcionario.data_admissao || funcionario.demitido || !funcionario.ativo) continue;

            const dataAdmissao = new Date(funcionario.data_admissao + 'T00:00:00');
            const anosDesdeAdmissao = hoje.getFullYear() - dataAdmissao.getFullYear();

            // Verificar cada período aquisitivo (1º, 2º, 3º ano, etc.)
            for (let periodo = 1; periodo <= anosDesdeAdmissao + 1; periodo++) {
                // Verificar se as férias deste período foram usufruídas
                const feriasUsufruida = feriasUsufruidas.find(
                    f => f.funcionario_id === funcionario.id && f.periodo === periodo
                );

                // Se foram usufruídas, usar a nova data limite (365 dias após o usufruto)
                let dataLimite: Date;
                if (feriasUsufruida) {
                    dataLimite = feriasUsufruida.nova_data_limite;
                } else {
                    // Data limite = 1 ano menos 1 dia após admissão (para cada período)
                    dataLimite = new Date(dataAdmissao);
                    dataLimite.setFullYear(dataAdmissao.getFullYear() + periodo);
                    dataLimite.setDate(dataLimite.getDate() - 1);
                }

                const diffTime = dataLimite.getTime() - hoje.getTime();
                const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Verificar se já foi dismissed
                const jaDismissed = alertasDismissed.find(
                    d => d.funcionario_id === funcionario.id && 
                         d.periodo === periodo
                );

                // Alerta ATINGIDO (data limite passou ou é hoje)
                if (diasRestantes <= 0 && diasRestantes >= -365) {
                    // Só mostrar se não foi dismissed ou se passou mais de 7 dias desde o dismissal
                    const dismissedAtingido = jaDismissed?.tipo === 'atingido';
                    const diasDesdeDismissal = dismissedAtingido 
                        ? Math.ceil((hoje.getTime() - jaDismissed!.data_dismissal.getTime()) / (1000 * 60 * 60 * 24))
                        : 999;

                    if (!dismissedAtingido || diasDesdeDismissal >= 7) {
                        alertasEncontrados.push({
                            funcionario_id: funcionario.id,
                            nome_funcionario: funcionario.nome_completo,
                            data_admissao: funcionario.data_admissao,
                            periodo_aquisitivo: periodo,
                            data_limite: dataLimite,
                            dias_restantes: diasRestantes,
                            tipo: 'atingido',
                            empresa: funcionario.nome_empresa,
                            cargo: funcionario.nome_cargo
                        });
                    }
                }
                // Alerta PRÓXIMO (30 dias antes)
                else if (diasRestantes > 0 && diasRestantes <= 30) {
                    // Mostrar uma vez por semana
                    const dismissedProximo = jaDismissed?.tipo === 'proximo';
                    const diasDesdeDismissal = dismissedProximo
                        ? Math.ceil((hoje.getTime() - jaDismissed!.data_dismissal.getTime()) / (1000 * 60 * 60 * 24))
                        : 999;

                    if (!dismissedProximo || diasDesdeDismissal >= 7) {
                        alertasEncontrados.push({
                            funcionario_id: funcionario.id,
                            nome_funcionario: funcionario.nome_completo,
                            data_admissao: funcionario.data_admissao,
                            periodo_aquisitivo: periodo,
                            data_limite: dataLimite,
                            dias_restantes: diasRestantes,
                            tipo: 'proximo',
                            empresa: funcionario.nome_empresa,
                            cargo: funcionario.nome_cargo
                        });
                    }
                }
            }
        }

        // Ordenar: atingidos primeiro, depois por dias restantes
        alertasEncontrados.sort((a, b) => {
            if (a.tipo === 'atingido' && b.tipo !== 'atingido') return -1;
            if (a.tipo !== 'atingido' && b.tipo === 'atingido') return 1;
            return a.dias_restantes - b.dias_restantes;
        });

        setAlertas(alertasEncontrados);
        setLoading(false);
    };

    const dismissAlert = (alerta: AlertaFerias) => {
        const novoDismissed: AlertaDismissed = {
            funcionario_id: alerta.funcionario_id,
            periodo: alerta.periodo_aquisitivo,
            tipo: alerta.tipo,
            data_dismissal: new Date()
        };

        const novaLista = [...alertasDismissed.filter(
            d => !(d.funcionario_id === alerta.funcionario_id && 
                   d.periodo === alerta.periodo_aquisitivo && 
                   d.tipo === alerta.tipo)
        ), novoDismissed];

        salvarAlertasDismissed(novaLista);
        
        // Remover da lista de alertas visíveis
        setAlertas(prev => prev.filter(
            a => !(a.funcionario_id === alerta.funcionario_id && 
                   a.periodo_aquisitivo === alerta.periodo_aquisitivo && 
                   a.tipo === alerta.tipo)
        ));
    };

    const marcarFeriasUsufruidas = (alerta: AlertaFerias) => {
        const confirmar = window.confirm(
            `Confirmar que ${alerta.nome_funcionario} usufruiu as férias do ${alerta.periodo_aquisitivo}º período?\n\n` +
            `Isso irá:\n` +
            `✓ Remover este alerta permanentemente\n` +
            `✓ Criar nova data limite: 365 dias a partir de hoje\n` +
            `✓ Registrar o usufruto das férias`
        );

        if (!confirmar) return;

        const hoje = new Date();
        const novaDataLimite = new Date(hoje);
        novaDataLimite.setDate(novaDataLimite.getDate() + 365);

        const novaFeriasUsufruida: FeriasUsufruidas = {
            funcionario_id: alerta.funcionario_id,
            periodo: alerta.periodo_aquisitivo,
            data_usufruto: hoje,
            nova_data_limite: novaDataLimite
        };

        // Remover registro anterior se existir
        const novaLista = [...feriasUsufruidas.filter(
            f => !(f.funcionario_id === alerta.funcionario_id && f.periodo === alerta.periodo_aquisitivo)
        ), novaFeriasUsufruida];

        salvarFeriasUsufruidas(novaLista);

        // Remover da lista de alertas visíveis
        setAlertas(prev => prev.filter(
            a => !(a.funcionario_id === alerta.funcionario_id && 
                   a.periodo_aquisitivo === alerta.periodo_aquisitivo)
        ));

        // Recarregar alertas para aplicar nova data limite
        setTimeout(() => carregarAlertas(), 500);
    };

    const formatarData = (data: Date) => {
        return data.toLocaleDateString('pt-BR');
    };

    const getCorAlerta = (tipo: 'atingido' | 'proximo') => {
        return tipo === 'atingido' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
    };

    const getIconeAlerta = (tipo: 'atingido' | 'proximo') => {
        return tipo === 'atingido' 
            ? <AlertTriangle className="w-6 h-6 text-red-600" />
            : <Calendar className="w-6 h-6 text-yellow-600" />;
    };

    if (loading) {
        return (
            <div className="p-6">
                <Card>
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Verificando períodos aquisitivos de férias...</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Alertas de Férias</h1>
                    <p className="text-gray-600 mt-1">
                        Monitoramento de períodos aquisitivos de férias dos funcionários
                    </p>
                </div>
            <Button onClick={carregarAlertas} variant="secondary">
                    🔄 Atualizar
                </Button>
            </div>

            {isClient && clientPostos.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                        <strong>Visualização restrita</strong> — Exibindo dados dos postos:{' '}
                        {(allFuncionarios || [])
                            .filter((f: any) => f.posto_trabalho_id && clientPostos.includes(f.posto_trabalho_id))
                            .map((f: any) => f.nome_posto)
                            .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
                            .join(', ') || 'Carregando...'}
                    </span>
                </div>
            )}

            {alertas.length === 0 ? (
                <Card>
                    <div className="p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Nenhum alerta de férias no momento
                        </h3>
                        <p className="text-gray-600">
                            Todos os períodos aquisitivos estão em dia ou foram reconhecidos.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {alertas.map((alerta, index) => (
                        <Card key={`${alerta.funcionario_id}-${alerta.periodo_aquisitivo}-${alerta.tipo}`}>
                            <div className={`p-6 border-l-4 ${getCorAlerta(alerta.tipo)}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="flex-shrink-0 mt-1">
                                            {getIconeAlerta(alerta.tipo)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {alerta.nome_funcionario}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    alerta.tipo === 'atingido' 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {alerta.tipo === 'atingido' 
                                                        ? '🚨 PERÍODO ATINGIDO' 
                                                        : '⚠️ PERÍODO PRÓXIMO'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Período Aquisitivo</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {alerta.periodo_aquisitivo}º ano
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Data de Admissão</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {formatarData(new Date(alerta.data_admissao + 'T00:00:00'))}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Data Limite</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {formatarData(alerta.data_limite)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">
                                                        {alerta.tipo === 'atingido' ? 'Dias Vencidos' : 'Dias Restantes'}
                                                    </p>
                                                    <p className={`font-bold text-lg ${
                                                        alerta.tipo === 'atingido' ? 'text-red-600' : 'text-yellow-600'
                                                    }`}>
                                                        {alerta.tipo === 'atingido' 
                                                            ? `${Math.abs(alerta.dias_restantes)} dias` 
                                                            : `${alerta.dias_restantes} dias`}
                                                    </p>
                                                </div>
                                                {alerta.empresa && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">Empresa</p>
                                                        <p className="font-semibold text-gray-900">{alerta.empresa}</p>
                                                    </div>
                                                )}
                                                {alerta.cargo && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">Cargo</p>
                                                        <p className="font-semibold text-gray-900">{alerta.cargo}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`mt-4 p-3 rounded-lg ${
                                                alerta.tipo === 'atingido' ? 'bg-red-100' : 'bg-yellow-100'
                                            }`}>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {alerta.tipo === 'atingido' 
                                                        ? '⚠️ O período aquisitivo de férias foi atingido! O funcionário tem direito a férias.'
                                                        : '📅 O período aquisitivo de férias está próximo. Planeje as férias do funcionário.'}
                                                </p>
                                            </div>

                                            {/* Botão de Férias Usufruídas */}
                                            <div className="mt-4 flex items-center space-x-3">
                                                <p className="text-sm font-semibold text-gray-700">
                                                    Férias usufruídas?
                                                </p>
                                                <Button
                                                    onClick={() => marcarFeriasUsufruidas(alerta)}
                                                    className="!bg-green-600 hover:!bg-green-700 !text-white !px-6 !py-2"
                                                >
                                                    ✓ Sim
                                                </Button>
                                                <span className="text-sm text-gray-500">
                                                    (Nova data limite: +365 dias)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => dismissAlert(alerta)}
                                        variant="secondary"
                                        className="ml-4 !p-2"
                                        title="Reconhecer alerta (reaparecerá em 7 dias)"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <div className="p-6 bg-blue-50">
                    <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Sobre os Alertas de Férias</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li>• <strong>Período Atingido:</strong> Aparece quando a data limite (1 ano - 1 dia após admissão) é atingida</li>
                        <li>• <strong>Período Próximo:</strong> Aparece nos 30 dias que antecedem a data limite</li>
                        <li>• <strong>Reconhecimento (X):</strong> Oculta o alerta por 7 dias (temporário)</li>
                        <li>• <strong>Férias Usufruídas (✓ Sim):</strong> Remove o alerta permanentemente e cria nova data limite (+365 dias)</li>
                        <li>• <strong>Verificação:</strong> Os alertas são verificados automaticamente a cada hora</li>
                        <li>• <strong>Múltiplos Períodos:</strong> Funcionários com mais de 1 ano podem ter múltiplos alertas (1º, 2º, 3º ano, etc.)</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default VacationAlerts;
