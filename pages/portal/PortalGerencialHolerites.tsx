import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Eye, Calendar, Gift, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Holerite from '../../components/Holerite';
import ReciboBeneficios from '../../components/ReciboBeneficios';
import { supabase } from '../../lib/supabase';

interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_admissao: string;
  nome_cargo: string | null;
  nome_empresa: string | null;
  nome_posto: string | null;
  cargo_id: string | null;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  codigo_escala: string | null;
  cargo?: any;
  empresa?: any;
  posto_trabalho?: any;
}

const PortalGerencialHolerites: React.FC = () => {
  const { funcionarioId } = useParams<{ funcionarioId: string }>();
  const navigate = useNavigate();
  const { isAdminOrManager } = useAuth();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [holerites, setHolerites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [selectedHolerite, setSelectedHolerite] = useState<any | null>(null);
  const [selectedReciboBeneficios, setSelectedReciboBeneficios] = useState<any | null>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [parametros, setParametros] = useState<any>(null);

  useEffect(() => {
    if (!isAdminOrManager) {
      navigate('/');
      return;
    }
    loadData();
  }, [funcionarioId, selectedAno, isAdminOrManager]);

  const loadData = async () => {
    if (!funcionarioId) return;
    setLoading(true);

    try {
      // Carregar funcionário
      const { data: func, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .eq('id', funcionarioId)
        .single();

      if (funcError) throw funcError;
      
      // Normalizar dados
      if (Array.isArray(func.cargo)) func.cargo = func.cargo[0] || null;
      if (Array.isArray(func.empresa)) func.empresa = func.empresa[0] || null;
      if (Array.isArray(func.posto_trabalho)) func.posto_trabalho = func.posto_trabalho[0] || null;
      
      setFuncionario(func);
      setEmpresa(func.empresa);

      // Carregar holerites
      const { data: holeriteData } = await supabase
        .from('folha_calculada')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('ano', selectedAno)
        .order('mes', { ascending: false });

      setHolerites(holeriteData || []);

      // Carregar parâmetros para o ano selecionado
      const { data: parametrosData } = await supabase
        .from('parametros_calculo')
        .select('*')
        .eq('ativo', true)
        .eq('ano_vigencia', selectedAno)
        .single();
      setParametros(parametrosData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]} de ${ano}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const temBeneficios = (holerite: any) => {
    const total = 
      (holerite.vale_transporte || 0) +
      (holerite.vale_transporte_mes_anterior || 0) +
      (holerite.vale_transporte_mes_atual || 0) +
      (holerite.vale_alimentacao || 0) +
      (holerite.vale_alimentacao_mes_anterior || 0) +
      (holerite.vale_alimentacao_mes_atual || 0) +
      (holerite.cesta_basica || 0) +
      (holerite.premio_permanencia || 0);
    return total > 0;
  };

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Funcionário não encontrado</h2>
          <Button onClick={() => navigate('/portal-gerencial')}>Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Gerencial */}
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Visualizando holerites de: <strong>{funcionario.nome_completo}</strong>
            </span>
          </div>
          <Button
            onClick={() => navigate(`/portal-gerencial/funcionario/${funcionarioId}`)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Holerites</h1>
            <p className="text-gray-600">Visualizar contracheques e recibos de benefícios</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
            >
              {anos.map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Holerites */}
        {holerites.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Nenhum holerite encontrado
            </h3>
            <p className="text-gray-600">
              Não há holerites disponíveis para {selectedAno}.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holerites.map((holerite) => (
              <Card key={holerite.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {formatMesAno(holerite.mes, holerite.ano)}
                    </h3>
                    <p className="text-sm text-gray-500">Holerite</p>
                  </div>
                  <div className="flex gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Salário Base</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(holerite.salario_base)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Proventos</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(holerite.total_proventos)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Descontos</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(holerite.total_descontos)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-medium text-gray-700">Líquido</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(holerite.salario_liquido)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedHolerite(holerite)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Holerite
                  </Button>
                  {temBeneficios(holerite) && (
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedReciboBeneficios(holerite)}
                      className="flex-1"
                    >
                      <Gift className="w-4 h-4 mr-1" />
                      Benefícios
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Holerite */}
        {selectedHolerite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-800">
                  Holerite - {formatMesAno(selectedHolerite.mes, selectedHolerite.ano)}
                </h2>
                <Button variant="secondary" onClick={() => setSelectedHolerite(null)}>
                  Fechar
                </Button>
              </div>
              <div className="p-6">
                <Holerite
                  funcionario={funcionario}
                  empresa={empresa}
                  resultado={selectedHolerite}
                  mes={selectedHolerite.mes}
                  ano={selectedHolerite.ano}
                  eventosExcepcionais={selectedHolerite.eventos_excepcionais || []}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Recibo Benefícios */}
        {selectedReciboBeneficios && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-800">
                  Recibo de Benefícios - {formatMesAno(selectedReciboBeneficios.mes, selectedReciboBeneficios.ano)}
                </h2>
                <Button variant="secondary" onClick={() => setSelectedReciboBeneficios(null)}>
                  Fechar
                </Button>
              </div>
              <div className="p-6">
                <ReciboBeneficios
                  funcionario={funcionario}
                  empresa={empresa}
                  resultado={selectedReciboBeneficios}
                  mes={selectedReciboBeneficios.mes}
                  ano={selectedReciboBeneficios.ano}
                  eventosExcepcionais={selectedReciboBeneficios.eventos_excepcionais || []}
                  diasTrabalhados={0}
                  diasATrabalharVA={0}
                  diasATrabalharVT={0}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalGerencialHolerites;
