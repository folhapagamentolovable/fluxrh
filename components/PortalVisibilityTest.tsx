import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getVisibilityConfigs, filterDocumentsByVisibility, getVisibilityInfo } from '../utils/portalVisibility';

const PortalVisibilityTest: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Teste 1: Verificar se a tabela existe
      console.log('=== TESTE 1: Verificar tabela ===');
      const { error: tableError } = await supabase
        .from('portal_visibility_config')
        .select('*')
        .limit(1);
      
      results.tableExists = !tableError;
      results.tableError = tableError?.message;
      console.log('Tabela existe:', results.tableExists, tableError);

      // Teste 2: Buscar todas as configurações
      console.log('=== TESTE 2: Buscar configurações ===');
      const { data: allConfigs, error: configError } = await supabase
        .from('portal_visibility_config')
        .select('*');
      
      results.allConfigs = allConfigs;
      results.configError = configError?.message;
      setConfigs(allConfigs || []);
      console.log('Todas as configurações:', allConfigs, configError);

      // Teste 3: Usar função utilitária
      console.log('=== TESTE 3: Função getVisibilityConfigs ===');
      const utilConfigs = await getVisibilityConfigs();
      results.utilConfigs = utilConfigs;
      console.log('Configurações via utilitário:', utilConfigs);

      // Teste 4: Testar filtro de documentos
      console.log('=== TESTE 4: Filtro de documentos ===');
      const testDocs = [
        { mes: 12, ano: 2024 },
        { mes: 1, ano: 2025 },
        { mes: 6, ano: 2025 },
        { mes: 11, ano: 2025 },
        { mes: 12, ano: 2025 }
      ];
      
      const filteredHolerites = await filterDocumentsByVisibility(testDocs, 'holerites');
      const filteredBeneficios = await filterDocumentsByVisibility(testDocs, 'beneficios');
      
      results.testDocs = testDocs;
      results.filteredHolerites = filteredHolerites;
      results.filteredBeneficios = filteredBeneficios;
      console.log('Documentos de teste:', testDocs);
      console.log('Holerites filtrados:', filteredHolerites);
      console.log('Benefícios filtrados:', filteredBeneficios);

      // Teste 5: Informações de visibilidade
      console.log('=== TESTE 5: Informações de visibilidade ===');
      const holeriteInfo = await getVisibilityInfo('holerites');
      const beneficiosInfo = await getVisibilityInfo('beneficios');
      
      results.holeriteInfo = holeriteInfo;
      results.beneficiosInfo = beneficiosInfo;
      console.log('Info holerites:', holeriteInfo);
      console.log('Info benefícios:', beneficiosInfo);

    } catch (error) {
      console.error('Erro nos testes:', error);
      results.generalError = (error as Error).message;
    }

    setTestResults(results);
    setLoading(false);
  };

  const testUpdate = async () => {
    try {
      console.log('=== TESTE DE ATUALIZAÇÃO ===');
      
      if (configs.length === 0) {
        alert('Nenhuma configuração encontrada para testar');
        return;
      }

      const config = configs[0];
      const newObservacao = `Teste de atualização - ${new Date().toISOString()}`;
      
      console.log('Atualizando configuração:', config.id, 'com observação:', newObservacao);
      
      const { data, error } = await supabase
        .from('portal_visibility_config')
        .update({ observacoes: newObservacao })
        .eq('id', config.id)
        .select();

      console.log('Resultado da atualização:', { data, error });
      
      if (error) {
        alert(`Erro na atualização: ${error.message}`);
      } else {
        alert('Atualização realizada com sucesso!');
        runTests(); // Recarregar testes
      }
    } catch (error) {
      console.error('Erro no teste de atualização:', error);
      alert(`Erro: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Teste de Configurações do Portal</h2>
        <div className="space-x-2">
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testando...' : 'Executar Testes'}
          </button>
          <button
            onClick={testUpdate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Testar Atualização
          </button>
        </div>
      </div>

      {/* Resultados dos Testes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold mb-2">Configurações Encontradas</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(configs, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold mb-2">Resultados dos Testes</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>

      {/* Status dos Testes */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-bold mb-2">Status dos Testes</h3>
        <div className="space-y-2">
          <div className={`p-2 rounded ${testResults.tableExists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Tabela existe: {testResults.tableExists ? '✅ Sim' : '❌ Não'}
            {testResults.tableError && <div className="text-sm">Erro: {testResults.tableError}</div>}
          </div>
          
          <div className={`p-2 rounded ${testResults.allConfigs?.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Configurações carregadas: {testResults.allConfigs?.length || 0}
          </div>
          
          <div className={`p-2 rounded ${testResults.utilConfigs?.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Função utilitária: {testResults.utilConfigs?.length > 0 ? '✅ Funcionando' : '❌ Erro'}
          </div>
          
          <div className={`p-2 rounded ${testResults.filteredHolerites?.length >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Filtro de holerites: {testResults.filteredHolerites?.length >= 0 ? '✅ Funcionando' : '❌ Erro'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalVisibilityTest;