import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import BroadcastMessageManager from '../../components/BroadcastMessageManager';
import BroadcastReadHistory from '../../components/BroadcastReadHistory';
import { Search, Users, Eye, ArrowLeft, Building2, Briefcase, UserCheck, Bell, List, History, Gift } from 'lucide-react';

interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_admissao: string;
  ativo: boolean;
  demitido: boolean;
  nome_cargo: string | null;
  nome_empresa: string | null;
  nome_posto: string | null;
  cargo_id: string | null;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
}

interface BeneficioInfo {
  total_beneficios: number;
  mes: number;
  ano: number;
}

const PortalGerencial: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isAdminOrManager, profile } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filteredFuncionarios, setFilteredFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [postoFilter, setPostoFilter] = useState('');
  const [empresas, setEmpresas] = useState<{ id: string; nome_empresa: string }[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome_posto: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'funcionarios' | 'mensagens' | 'historico'>('funcionarios');
  const [beneficiosMap, setBeneficiosMap] = useState<Record<string, BeneficioInfo>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFuncionarios();
  }, [searchTerm, empresaFilter, postoFilter, funcionarios]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar funcionários ativos
      const { data: funcs, error: funcsError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('ativo', true)
        .eq('demitido', false)
        .order('nome_completo');

      if (funcsError) throw funcsError;
      setFuncionarios(funcs || []);

      // Carregar benefícios mais recentes de cada funcionário
      const { data: beneficiosData } = await supabase
        .from('folha_calculada')
        .select('funcionario_id, total_beneficios, mes, ano')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (beneficiosData) {
        const map: Record<string, BeneficioInfo> = {};
        for (const b of beneficiosData) {
          if (!map[b.funcionario_id]) {
            map[b.funcionario_id] = {
              total_beneficios: b.total_beneficios || 0,
              mes: b.mes,
              ano: b.ano,
            };
          }
        }
        setBeneficiosMap(map);
      }

      // Carregar empresas
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome_empresa')
        .order('nome_empresa');
      setEmpresas(empresasData || []);

      // Carregar postos
      const { data: postosData } = await supabase
        .from('postos_trabalho')
        .select('id, nome_posto')
        .is('local_area', null)
        .order('nome_posto');
      setPostos(postosData || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filterFuncionarios = () => {
    let filtered = [...funcionarios];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.nome_completo.toLowerCase().includes(term) ||
        f.cpf?.includes(term) ||
        f.nome_cargo?.toLowerCase().includes(term)
      );
    }

    if (empresaFilter) {
      filtered = filtered.filter(f => f.empresa_id === empresaFilter);
    }

    if (postoFilter) {
      filtered = filtered.filter(f => f.posto_trabalho_id === postoFilter);
    }

    setFilteredFuncionarios(filtered);
  };

  const handleViewPortal = (funcionarioId: string) => {
    // Navegar para o portal com o ID do funcionário como parâmetro
    navigate(`/portal-gerencial/funcionario/${funcionarioId}`);
  };

  if (!isAdminOrManager) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar o Portal Gerencial.
          </p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              Portal Gerencial
            </h1>
            <p className="text-gray-600">
              Gerencie funcionários e envie mensagens broadcast
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">
            {funcionarios.length} funcionários ativos
          </span>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('funcionarios')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'funcionarios'
              ? 'text-primary border-primary'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          Funcionários
        </button>
        <button
          onClick={() => setActiveTab('mensagens')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'mensagens'
              ? 'text-primary border-primary'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Mensagens Broadcast
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'historico'
              ? 'text-primary border-primary'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Leituras
        </button>
      </div>

      {/* Conteúdo baseado na Tab */}
      {activeTab === 'historico' ? (
        <BroadcastReadHistory />
      ) : activeTab === 'mensagens' ? (
        <BroadcastMessageManager adminName={profile?.user_name || 'Administrador'} />
      ) : (
        <>
          {/* Filtros */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-[38px] -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <Input
                    label="Buscar"
                    placeholder="Buscar por nome, CPF ou cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                label="Empresa"
                value={empresaFilter}
                onChange={(e) => setEmpresaFilter(e.target.value)}
              >
                <option value="">Todas as Empresas</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome_empresa}
                  </option>
                ))}
              </Select>
              <Select
                label="Posto"
                value={postoFilter}
                onChange={(e) => setPostoFilter(e.target.value)}
              >
                <option value="">Todos os Postos</option>
                {postos.map((posto) => (
                  <option key={posto.id} value={posto.id}>
                    {posto.nome_posto}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Lista de Funcionários */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredFuncionarios.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum funcionário encontrado</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFuncionarios.map((func) => (
                <div
                  key={func.id}
                  className="bg-white rounded-2xl shadow-md p-4 border border-transparent hover:border-green-500 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleViewPortal(func.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg group-hover:bg-green-200 transition-colors">
                        {func.nome_completo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                          {func.nome_completo}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {func.nome_cargo || 'Sem cargo'}
                        </p>
                      </div>
                    </div>
                    <button
                      className="p-2 rounded-lg bg-green-50 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPortal(func.id);
                      }}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    {func.nome_empresa && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {func.nome_empresa}
                      </div>
                    )}
                    {func.nome_posto && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        {func.nome_posto}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <UserCheck className="w-4 h-4 text-gray-400" />
                      Admissão: {new Date(func.data_admissao).toLocaleDateString('pt-BR')}
                    </div>
                    {beneficiosMap[func.id] && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-green-700 font-medium">
                          <Gift className="w-4 h-4 text-green-500" />
                          Benefícios: R$ {beneficiosMap[func.id].total_beneficios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs text-gray-400">
                          {String(beneficiosMap[func.id].mes).padStart(2, '0')}/{beneficiosMap[func.id].ano}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PortalGerencial;
