import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseDiagnostic: React.FC = () => {
    const [status, setStatus] = useState<{[key: string]: any}>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const testConnection = async () => {
            const results: {[key: string]: any} = {};
            
            // Testar conexão básica
            try {
                const { data, error } = await supabase.from('empresas').select('count').limit(1);
                results.connection = error ? `Erro: ${error.message}` : 'OK';
            } catch (err) {
                results.connection = `Erro de rede: ${err}`;
            }

            // Testar cada tabela
            const tables = ['empresas', 'funcionarios', 'cargos', 'regras_escalas', 'escala_mensal', 'feriados', 'postos_trabalho'];
            
            for (const table of tables) {
                try {
                    const { data, error } = await supabase.from(table).select('*').limit(1);
                    results[table] = error ? `Erro: ${error.message}` : `OK (${data?.length || 0} registros testados)`;
                } catch (err) {
                    results[table] = `Erro de rede: ${err}`;
                }
            }

            // Verificar variáveis de ambiente (sem expor valores)
            const url = import.meta.env.VITE_SUPABASE_URL;
            const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            results.supabaseUrl = url ? '✅ Configurada' : '❌ NÃO CONFIGURADA - Crie arquivo .env';
            results.supabaseKey = key ? '✅ Configurada' : '❌ NÃO CONFIGURADA - Adicione VITE_SUPABASE_ANON_KEY';
            
            // Status geral
            const hasConfig = url && key;
            const hasConnection = results.connection === 'OK';
            
            if (!hasConfig) {
                results.status = '❌ CONFIGURAÇÃO PENDENTE - Veja SETUP-SUPABASE.md';
            } else if (!hasConnection) {
                results.status = '⚠️ CONFIGURADO MAS SEM CONEXÃO - Execute fix-cors-simple.sql';
            } else {
                results.status = '✅ TUDO FUNCIONANDO';
            }

            setStatus(results);
            setLoading(false);
        };

        testConnection();
    }, []);

    if (loading) {
        return <div className="p-4 bg-yellow-100 rounded">Testando conexão com Supabase...</div>;
    }

    const getStatusColor = (value: string) => {
        if (value.includes('❌') || value.includes('Erro') || value.includes('NÃO')) return 'text-red-600';
        if (value.includes('⚠️')) return 'text-yellow-600';
        if (value.includes('✅') || value === 'OK') return 'text-green-600';
        return 'text-gray-600';
    };

    const getBackgroundColor = () => {
        const statusValue = status.status || '';
        if (statusValue.includes('❌')) return 'bg-red-50 border-red-200';
        if (statusValue.includes('⚠️')) return 'bg-yellow-50 border-yellow-200';
        if (statusValue.includes('✅')) return 'bg-green-50 border-green-200';
        return 'bg-gray-100';
    };

    return (
        <div className={`p-4 rounded border mb-4 ${getBackgroundColor()}`}>
            <h3 className="font-bold mb-3 text-lg">🔍 Diagnóstico Supabase</h3>
            
            {/* Status principal */}
            {status.status && (
                <div className="mb-3 p-2 bg-white rounded border">
                    <span className={`font-bold ${getStatusColor(status.status)}`}>
                        {status.status}
                    </span>
                </div>
            )}
            
            {/* Detalhes */}
            <div className="space-y-1">
                {Object.entries(status).filter(([key]) => key !== 'status').map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 text-sm">
                        <span className={`font-medium capitalize ${(key === 'regras_escalas' || key === 'escala_mensal') ? 'font-mono text-blue-700 font-bold' : ''}`}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                        </span>
                        <span className={`${getStatusColor(value)} font-mono text-xs ${(key === 'regras_escalas' || key === 'escala_mensal') ? 'font-bold' : ''}`}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
            
            {/* Instruções */}
            {status.status?.includes('❌') && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                        📖 <strong>Próximos passos:</strong> Consulte o arquivo <code>SETUP-SUPABASE.md</code> para instruções detalhadas.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SupabaseDiagnostic;