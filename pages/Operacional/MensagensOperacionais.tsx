import React, { useState } from 'react';
import { MessageSquare, Umbrella, Wrench } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useFuncionariosAtivos } from '../../hooks/useSupabase';
import SugestoesManagement from '../../components/SugestoesManagement';

const MensagensOperacionais: React.FC = () => {
  const { data: funcionarios } = useFuncionariosAtivos();
  const [activeTab, setActiveTab] = useState('operacional');

  const funcsMap = funcionarios?.map(f => ({
    id: f.id,
    nome_completo: f.nome_completo,
    nome_empresa: f.nome_empresa,
    nome_cargo: f.nome_cargo,
    nome_posto: f.nome_posto,
  })) || [];

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
          <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          Mensagens
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Sugestões, reclamações e comunicações dos funcionários
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger value="operacional" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Operacionais
          </TabsTrigger>
          <TabsTrigger value="ferias" className="flex items-center gap-2">
            <Umbrella className="w-4 h-4" />
            Férias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operacional">
          <SugestoesManagement
            funcionarios={funcsMap}
            tipoFiltro="operacional"
          />
        </TabsContent>

        <TabsContent value="ferias">
          <SugestoesManagement
            funcionarios={funcsMap}
            tipoFiltro="ferias"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MensagensOperacionais;
