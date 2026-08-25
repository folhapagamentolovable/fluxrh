import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

interface AlertaCritico {
    funcionario_id: string;
    nome_funcionario: string;
    data_admissao: string;
    data_limite: string;
    dias_restantes: number;
    periodo_aquisitivo: number;
    ferias_id?: string;
    status?: string;
}

interface Funcionario {
    id: string;
    nome_completo: string;
    data_admissao: string;
    ativo: boolean;
    demitido: boolean;
}

interface Ferias {
    id: string;
    funcionario_id: string;
    periodo_aquisitivo: number;
    data_limite_concessivo: string;
    status: string;
    data_inicio_gozo: string | null;
    data_fim_gozo: string | null;
}

const CriticalVacationAlert: React.FC = () => {
    const [alertas, setAlertas] = useState<AlertaCritico[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        carregarAlertasCriticos();
    }, []);

    const carregarAlertasCriticos = async () => {
        try {
            setLoading(true);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Buscar funcionários ativos
            const { data: funcionarios, error: funcError } = await supabase
                .from('funcionarios')
                .select('id, nome_completo, data_admissao, ativo, demitido')
                .eq('ativo', true)
                .eq('demitido', false);

            if (funcError) throw funcError;
            if (!funcionarios || funcionarios.length === 0) {
                setLoading(false);
                return;
            }

            // Buscar férias do 2º período (usar data_limite_concessivo do banco)
            const { data: feriasSegundoPeriodoList, error: feriasError } = await supabase
                .from('ferias')
                .select('id, funcionario_id, periodo_aquisitivo, data_limite_concessivo, status, data_inicio_gozo, data_fim_gozo')
                .eq('periodo_aquisitivo', 2);

            if (feriasError) throw feriasError;

            const alertasCriticos: AlertaCritico[] = [];

            for (const funcionario of funcionarios as Funcionario[]) {
                if (!funcionario.data_admissao) continue;

                const dataAdmissao = new Date(funcionario.data_admissao + 'T00:00:00');
                const periodo = 2;

                // Data fim do 2º período aquisitivo = 2 anos após admissão - 1 dia
                const fimSegundoPeriodo = new Date(dataAdmissao);
                fimSegundoPeriodo.setFullYear(dataAdmissao.getFullYear() + 2);
                fimSegundoPeriodo.setDate(fimSegundoPeriodo.getDate() - 1);

                // Se o 2º período ainda não foi adquirido, ignorar
                if (fimSegundoPeriodo > hoje) continue;

                const feriasSegundoPeriodo = (feriasSegundoPeriodoList as Ferias[])?.find(
                    (f) => f.funcionario_id === funcionario.id && f.periodo_aquisitivo === periodo
                );

                // Data limite: preferir a do banco; fallback para cálculo por admissão
                const dataLimite = feriasSegundoPeriodo?.data_limite_concessivo
                    ? new Date(feriasSegundoPeriodo.data_limite_concessivo + 'T00:00:00')
                    : (() => {
                          const fallback = new Date(fimSegundoPeriodo);
                          fallback.setFullYear(fallback.getFullYear() + 1);
                          return fallback;
                      })();

                const diffTime = dataLimite.getTime() - hoje.getTime();
                const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Só alertar se faltam 60 dias ou menos (e ainda não venceu há mais de 365 dias)
                if (diasRestantes > 60 || diasRestantes < -365) continue;

                // Regra: só parar de alertar quando estiver APROVADA e com gozo totalmente dentro do prazo legal
                if (feriasSegundoPeriodo) {
                    const status = (feriasSegundoPeriodo.status || '').toLowerCase();

                    // Se já foi gozada, não alertar
                    if (status === 'gozada') {
                        continue;
                    }

                    if (
                        status === 'aprovada' &&
                        feriasSegundoPeriodo.data_inicio_gozo &&
                        feriasSegundoPeriodo.data_fim_gozo
                    ) {
                        const dataFimGozo = new Date(feriasSegundoPeriodo.data_fim_gozo + 'T00:00:00');

                        // OK apenas se o gozo termina ANTES/NO limite (não pode atravessar o limite)
                        if (dataFimGozo <= dataLimite) {
                            continue;
                        }
                    }
                }

                // Adicionar alerta
                alertasCriticos.push({
                    funcionario_id: funcionario.id,
                    nome_funcionario: funcionario.nome_completo,
                    data_admissao: funcionario.data_admissao,
                    data_limite: dataLimite.toISOString().split('T')[0],
                    dias_restantes: diasRestantes,
                    periodo_aquisitivo: periodo,
                    ferias_id: feriasSegundoPeriodo?.id,
                    status: feriasSegundoPeriodo?.status,
                });
            }

            // Ordenar por dias restantes (mais urgentes primeiro)
            alertasCriticos.sort((a, b) => a.dias_restantes - b.dias_restantes);
            
            setAlertas(alertasCriticos);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const formatarData = (dataStr: string) => {
        const data = new Date(dataStr + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    };

    const handleGoToVacationManagement = () => {
        navigate('/vacation-management');
    };

    if (loading || alertas.length === 0 || dismissed) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">⚠️ ALERTA CRÍTICO DE FÉRIAS</h2>
                            <p className="text-red-100 text-sm">2º Período Aquisitivo - Ação Imediata Necessária</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setDismissed(true)}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                        <p className="text-red-800 font-medium">
                            {alertas.length === 1 
                                ? '1 funcionário com 2º período de férias próximo do vencimento!'
                                : `${alertas.length} funcionários com 2º período de férias próximo do vencimento!`
                            }
                        </p>
                        <p className="text-red-700 text-sm mt-1">
                            As férias devem ser agendadas e finalizadas ANTES da data limite para evitar penalidades legais.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {alertas.map((alerta) => (
                            <div 
                                key={alerta.funcionario_id}
                                className={`border rounded-lg p-4 ${
                                    alerta.dias_restantes <= 0 
                                        ? 'bg-red-100 border-red-300' 
                                        : alerta.dias_restantes <= 30 
                                            ? 'bg-orange-50 border-orange-300'
                                            : 'bg-yellow-50 border-yellow-300'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{alerta.nome_funcionario}</h4>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-600">Admissão:</span>
                                                <span className="ml-1 font-medium">{formatarData(alerta.data_admissao)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Limite 2º Período:</span>
                                                <span className="ml-1 font-bold text-red-600">{formatarData(alerta.data_limite)}</span>
                                            </div>
                                        </div>
                                        {alerta.status && (
                                            <div className="mt-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    alerta.status === 'pendente' ? 'bg-gray-100 text-gray-700' :
                                                    alerta.status === 'solicitado' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    Status: {alerta.status.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`text-right px-3 py-2 rounded-lg ${
                                        alerta.dias_restantes <= 0 
                                            ? 'bg-red-600 text-white' 
                                            : alerta.dias_restantes <= 30 
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-yellow-500 text-white'
                                    }`}>
                                        <div className="text-2xl font-bold">
                                            {alerta.dias_restantes <= 0 
                                                ? Math.abs(alerta.dias_restantes)
                                                : alerta.dias_restantes
                                            }
                                        </div>
                                        <div className="text-xs uppercase">
                                            {alerta.dias_restantes <= 0 ? 'dias vencido' : 'dias restantes'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Regra Legal
                        </h5>
                        <p className="text-sm text-gray-600">
                            As férias do 2º período devem ser <strong>concedidas e finalizadas</strong> antes da data limite.
                            Não é permitido agendar férias que iniciem antes e terminem após a data limite.
                        </p>
                        <p className="text-sm text-red-600 font-medium mt-2">
                            Exemplo: Limite 03/03/2026 → Férias de 10/02 a 11/03 = ❌ INVÁLIDO (ultrapassa o limite)
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-4">
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        Lembrar mais tarde
                    </button>
                    <Button
                        onClick={handleGoToVacationManagement}
                        className="flex items-center gap-2"
                    >
                        <Calendar className="w-4 h-4" />
                        Gerenciar Férias
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CriticalVacationAlert;
