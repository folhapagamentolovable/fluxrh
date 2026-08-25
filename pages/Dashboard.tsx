
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SupabaseDiagnostic from '../components/SupabaseDiagnostic';
import CriticalVacationAlert from '../components/CriticalVacationAlert';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

const Dashboard: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { isAdmin, isAdminOrManager, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [testing, setTesting] = useState(false);
    const [tableStatus, setTableStatus] = useState<Record<string, { status: 'success' | 'error' | 'testing', error?: string }>>({});
    const [showContent, setShowContent] = useState(false);

    // Timeout de segurança: após 2 segundos, mostra o conteúdo independente do loading
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowContent(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Aguardar carregamento da autenticação (com timeout)
    if (authLoading && !showContent) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando permissões...</p>
                </div>
            </div>
        );
    }

    // Verificar se é admin - mostrar acesso negado se não for
    if (!isAdminOrManager) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                    <p className="text-gray-600 mb-6">
                        Esta área é exclusiva para administradores do sistema.
                    </p>
                    <div className="space-y-3">
                        <Button
                            onClick={() => navigate('/portal')}
                            className="w-full"
                        >
                            Ir para o Portal do Funcionário
                        </Button>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Fazer login como administrador
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const testTableReadOnly = async (tableName: string) => {
        
        try {
            const { error: selectError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (selectError) {
                return { success: false, error: selectError.message };
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
    };

    const testTableWithInsert = async (tableName: string, testData: any, idField: string = 'id') => {
        
        try {
            // Verificar se a tabela existe
            const { error: selectError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (selectError) {
                return { success: false, error: selectError.message };
            }

            // Tentar inserir dados de teste
            const { data: insertData, error: insertError } = await supabase
                .from(tableName)
                .insert(testData)
                .select()
                .single();

            if (insertError) {
                return { success: false, error: insertError.message };
            }

            // Limpar dados de teste
            await supabase.from(tableName).delete().eq(idField, insertData[idField]);
            
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTableStatus({});
        
        // Tabelas com teste de inserção (sem foreign keys obrigatórias)
        const tablesWithInsert = [
            { 
                name: 'empresas', 
                data: { nome_empresa: 'Teste ' + Date.now(), cnpj: String(Date.now()).slice(0, 14).padEnd(14, '0') } 
            },
            { 
                name: 'cargos', 
                data: { 
                    nome_cargo: 'Teste Cargo ' + Date.now(),
                    cbo: '999999',
                    salario_base: 1500
                } 
            },
            { 
                name: 'postos_trabalho', 
                data: { 
                    nome_posto: 'Teste Posto ' + Date.now(),
                    cnpj: '12345678000190'
                } 
            },
            { 
                name: 'feriados', 
                data: { 
                    data_feriado: new Date().toISOString().split('T')[0],
                    nome_feriado: 'Teste Feriado ' + Date.now(),
                    tipo_feriado: 'nacional'
                } 
            },
            { 
                name: 'regras_escalas', 
                data: { 
                    codigo_escala: 'TEST' + Date.now(),
                    nome_escala: 'Teste Regra ' + Date.now(),
                    turno: 'DIURNO',
                    data_vigencia: new Date().toISOString().split('T')[0]
                } 
            }
        ];

        // Tabelas apenas com teste de leitura (têm foreign keys obrigatórias ou estrutura complexa)
        const tablesReadOnly = [
            'funcionarios',
            'folhas_ponto',
            'escala_mensal',
            'folha_calculada',
            'parametros_calculo'
        ];

        const results: Record<string, 'success' | 'error'> = {};

        // Testar tabelas com inserção
        for (const table of tablesWithInsert) {
            setTableStatus(prev => ({ ...prev, [table.name]: { status: 'testing' } }));
            const result = await testTableWithInsert(table.name, table.data);
            results[table.name] = result.success ? 'success' : 'error';
            setTableStatus(prev => ({ 
                ...prev, 
                [table.name]: { 
                    status: results[table.name],
                    error: result.error 
                } 
            }));
            
            if (!result.success) {
            }
        }

        // Testar tabelas apenas leitura
        for (const tableName of tablesReadOnly) {
            setTableStatus(prev => ({ ...prev, [tableName]: { status: 'testing' } }));
            const result = await testTableReadOnly(tableName);
            results[tableName] = result.success ? 'success' : 'error';
            setTableStatus(prev => ({ 
                ...prev, 
                [tableName]: { 
                    status: results[tableName],
                    error: result.error 
                } 
            }));
            
            if (!result.success) {
            }
        }

        const successCount = Object.values(results).filter(r => r === 'success').length;
        const totalCount = tablesWithInsert.length + tablesReadOnly.length;

        if (successCount === totalCount) {
            showToast(`✅ Todas as ${totalCount} tabelas testadas com sucesso!`, 'success');
        } else {
            showToast(`⚠️ ${successCount}/${totalCount} tabelas OK. Verifique o console para detalhes.`, 'error');
        }
        
        setTesting(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <CriticalVacationAlert />
            <ToastContainer />
            <div className="responsive-header">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Dashboard</h1>
                <Button 
                    onClick={handleTest} 
                    disabled={testing}
                    variant="secondary"
                    className="w-full sm:w-auto"
                >
                    {testing ? 'Testando...' : '🧪 Testar Todas as Tabelas'}
                </Button>
            </div>
            
            <SupabaseDiagnostic />

            {Object.keys(tableStatus).length > 0 && (
                <Card>
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Status das Tabelas</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3">
                        Algumas tabelas são testadas com inserção, outras apenas com leitura (devido a foreign keys)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {Object.entries(tableStatus).map(([table, info]) => (
                            <div 
                                key={table}
                                className={`p-2 sm:p-3 rounded-lg border-2 ${
                                    info.status === 'success' ? 'bg-green-50 border-green-500' :
                                    info.status === 'error' ? 'bg-red-50 border-red-500' :
                                    'bg-yellow-50 border-yellow-500'
                                }`}
                                title={info.error || ''}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700 text-xs sm:text-sm truncate">{table}</span>
                                    <span className="text-lg sm:text-xl ml-2">
                                        {info.status === 'success' ? '✅' :
                                         info.status === 'error' ? '❌' :
                                         '⏳'}
                                    </span>
                                </div>
                                {info.error && (
                                    <div className="mt-2 text-xs text-red-600 truncate">
                                        {info.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Bem-vindo ao FluxPay!</h2>
                <p className="text-sm sm:text-base text-gray-600">
                    Gerencie suas folhas de pagamento de forma eficiente e automatizada. Use o menu superior para navegar entre as funcionalidades do sistema.
                </p>
            </Card>
        </div>
    );
};

export default Dashboard;
