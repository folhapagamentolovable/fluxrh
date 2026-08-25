import React, { useEffect, useState } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { FileText, Eye, Calendar, Gift, Info, Printer, WifiOff, RefreshCw } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Holerite from '../../components/Holerite';
import ReciboBeneficios from '../../components/ReciboBeneficios';
import { supabase } from '../../lib/supabase';
import { getVisibilityInfo } from '../../utils/portalVisibility';
import { calcularTotaisItensFolhaCalculada } from '../../utils/normalizarFolhaCalculada';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const HOLERITES_CACHE_KEY = 'holerites-cache';

// Componente modal para ReciboBeneficios com cálculos async
const ReciboBeneficiosModal: React.FC<{
  selectedReciboBeneficios: any;
  setSelectedReciboBeneficios: (value: any) => void;
  funcionario: any;
  empresa: any;
  calcularDiasTrabalhados: (holerite: any) => Promise<number>;
  calcularDiasVA: (holerite: any, isProximoMes: boolean) => Promise<number>;
  calcularDiasATrabalhar: (holerite: any) => Promise<number>;
  formatMesAno: (mes: number, ano: number) => string;
}> = ({
  selectedReciboBeneficios,
  setSelectedReciboBeneficios,
  funcionario,
  empresa,
  calcularDiasTrabalhados,
  calcularDiasVA,
  calcularDiasATrabalhar,
  formatMesAno
}) => {
  const [diasCalculados, setDiasCalculados] = useState<{
    diasTrabalhados: number;
    diasATrabalharVA: number;
    diasATrabalharVT: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calcularDias = async () => {
      if (!selectedReciboBeneficios) return;
      
      
      setLoading(true);
      try {
        
        const [diasTrab, diasVA, diasVT] = await Promise.all([
          calcularDiasTrabalhados(selectedReciboBeneficios),
          calcularDiasVA(selectedReciboBeneficios, true),
          calcularDiasATrabalhar(selectedReciboBeneficios)
        ]);
        
        
        // ⭐ FALLBACK: Se os cálculos retornaram 0, tentar calcular baseado nos valores dos benefícios
        let diasTrabFinal = diasTrab;
        let diasVAFinal = diasVA;
        let diasVTFinal = diasVT;
        
        if (diasTrab === 0 || diasVA === 0 || diasVT === 0) {
          
          // ⭐ BUSCAR PARÂMETROS DE CÁLCULO PARA VALORES UNITÁRIOS CORRETOS
          const { data: parametrosData } = await supabase
            .from('parametros_calculo')
            .select('vale_alimentacao, vale_transporte')
            .eq('ativo', true)
            .eq('ano_vigencia', selectedReciboBeneficios.ano)
            .single();
          
          if (!parametrosData) {
            setDiasCalculados({
              diasTrabalhados: 0,
              diasATrabalharVA: 0,
              diasATrabalharVT: 0
            });
            return;
          }
          
          // Calcular baseado nos valores de VA/VT e valores unitários da tabela parametros_calculo
          const valorVAUnitario = parametrosData.vale_alimentacao;
          const valorVTUnitario = parametrosData.vale_transporte * 2; // VT = ida + volta
          
          
          if (diasTrab === 0 && (selectedReciboBeneficios.vale_alimentacao_mes_anterior > 0 || selectedReciboBeneficios.vale_transporte_mes_anterior > 0)) {
            const diasPorVA = selectedReciboBeneficios.vale_alimentacao_mes_anterior > 0 && valorVAUnitario > 0 
              ? Math.round(selectedReciboBeneficios.vale_alimentacao_mes_anterior / valorVAUnitario) 
              : 0;
            const diasPorVT = selectedReciboBeneficios.vale_transporte_mes_anterior > 0 && valorVTUnitario > 0 
              ? Math.round(selectedReciboBeneficios.vale_transporte_mes_anterior / valorVTUnitario) 
              : 0;
            diasTrabFinal = Math.max(diasPorVA, diasPorVT);
          }
          
          if (diasVA === 0 && selectedReciboBeneficios.vale_alimentacao_mes_atual > 0 && valorVAUnitario > 0) {
            diasVAFinal = Math.round(selectedReciboBeneficios.vale_alimentacao_mes_atual / valorVAUnitario);
          }
          
          if (diasVT === 0 && selectedReciboBeneficios.vale_transporte_mes_atual > 0 && valorVTUnitario > 0) {
            diasVTFinal = Math.round(selectedReciboBeneficios.vale_transporte_mes_atual / valorVTUnitario);
          }
          
        }
        
        setDiasCalculados({
          diasTrabalhados: diasTrabFinal,
          diasATrabalharVA: diasVAFinal,
          diasATrabalharVT: diasVTFinal
        });
      } catch (error) {
        
        // ⭐ FALLBACK DE EMERGÊNCIA: Calcular baseado nos valores dos benefícios
        
        // ⭐ BUSCAR PARÂMETROS DE CÁLCULO PARA VALORES UNITÁRIOS CORRETOS
        const { data: parametrosEmergencia } = await supabase
          .from('parametros_calculo')
          .select('vale_alimentacao, vale_transporte')
          .eq('ativo', true)
          .eq('ano_vigencia', selectedReciboBeneficios.ano)
          .single();
        
        if (!parametrosEmergencia) {
          setDiasCalculados({
            diasTrabalhados: 0,
            diasATrabalharVA: 0,
            diasATrabalharVT: 0
          });
          return;
        }
        
        const valorVAUnitario = parametrosEmergencia.vale_alimentacao;
        const valorVTUnitario = parametrosEmergencia.vale_transporte * 2; // VT = ida + volta
        
        const diasTrabEmergencia = selectedReciboBeneficios.vale_alimentacao_mes_anterior > 0 && valorVAUnitario > 0
          ? Math.round(selectedReciboBeneficios.vale_alimentacao_mes_anterior / valorVAUnitario) 
          : (selectedReciboBeneficios.vale_transporte_mes_anterior > 0 && valorVTUnitario > 0
              ? Math.round(selectedReciboBeneficios.vale_transporte_mes_anterior / valorVTUnitario)
              : 0);
        const diasVAEmergencia = selectedReciboBeneficios.vale_alimentacao_mes_atual > 0 && valorVAUnitario > 0
          ? Math.round(selectedReciboBeneficios.vale_alimentacao_mes_atual / valorVAUnitario) 
          : 0;
        const diasVTEmergencia = selectedReciboBeneficios.vale_transporte_mes_atual > 0 && valorVTUnitario > 0
          ? Math.round(selectedReciboBeneficios.vale_transporte_mes_atual / valorVTUnitario) 
          : 0;
        
        
        setDiasCalculados({
          diasTrabalhados: diasTrabEmergencia,
          diasATrabalharVA: diasVAEmergencia,
          diasATrabalharVT: diasVTEmergencia
        });
      } finally {
        setLoading(false);
      }
    };

    calcularDias();
  }, [selectedReciboBeneficios]);

  if (loading || !diasCalculados) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Calculando benefícios...</span>
          </div>
        </div>
      </div>
    );
  }

  const handlePrintBeneficios = () => {
    const printContent = document.getElementById('recibo-beneficios-print');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <html>
            <head>
              <title>Recibo de Benefícios</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                table { border-collapse: collapse; width: 90%; margin: 2mm auto; }
                td { font-size: 8px; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .text-base { font-size: 14px; }
                .text-xs { font-size: 8px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
              </style>
            </head>
            <body>${printContent.innerHTML}</body>
          </html>
        `;
        escreverEExibirJanela(printWindow, htmlContent, 'Recibo de Benefícios');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between z-10">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-800">
            Recibo de Benefícios - {formatMesAno(selectedReciboBeneficios.mes, selectedReciboBeneficios.ano)}
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePrintBeneficios} className="flex items-center gap-1">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button variant="secondary" onClick={() => setSelectedReciboBeneficios(null)}>
              Fechar
            </Button>
          </div>
        </div>
        <div className="p-3 sm:p-6 overflow-x-auto">
          {/* DEBUG: Mostrar dados calculados */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
              <strong>DEBUG:</strong> Dias calculados - Trabalhados: {diasCalculados.diasTrabalhados}, VA: {diasCalculados.diasATrabalharVA}, VT: {diasCalculados.diasATrabalharVT}
            </div>
          )}
          
          <ReciboBeneficios
            funcionario={funcionario}
            empresa={empresa}
            resultado={selectedReciboBeneficios}
            mes={selectedReciboBeneficios.mes}
            ano={selectedReciboBeneficios.ano}
            eventosExcepcionais={selectedReciboBeneficios.eventos_excepcionais || []}
            diasTrabalhados={diasCalculados.diasTrabalhados}
            diasATrabalharVA={diasCalculados.diasATrabalharVA}
            diasATrabalharVT={diasCalculados.diasATrabalharVT}
            folgasTrabalhadasVT={selectedReciboBeneficios.folgas_trabalhadas_vt || 0}
            folgasTrabalhadasVA={selectedReciboBeneficios.folgas_trabalhadas_va || 0}
          />
        </div>
      </div>
    </div>
  );
};

const PortalHolerites: React.FC = () => {
  const { funcionario, loading, fetchHolerites } = useEmployeePortal();
  const { isOnline, cacheData, getCachedData } = useOfflineSync();
  const [holerites, setHolerites] = useState<any[]>([]);
  const [folhasPonto, setFolhasPonto] = useState<{ [key: string]: any }>({});
  const [loadingHolerites, setLoadingHolerites] = useState(true);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [selectedHolerite, setSelectedHolerite] = useState<any | null>(null);
  const [selectedReciboBeneficios, setSelectedReciboBeneficios] = useState<any | null>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [parametros, setParametros] = useState<any>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [visibilityInfo, setVisibilityInfo] = useState<{
    holerites: any;
    beneficios: any;
  }>({ holerites: null, beneficios: null });

  // Função para gerar chave de cache
  const getCacheKey = (funcionarioId: string, ano: number) => 
    `${HOLERITES_CACHE_KEY}-${funcionarioId}-${ano}`;

  // Buscar informações da escala na tabela escala_mensal
  const buscarInfoEscala = async (funcionarioId: number, mes: number, ano: number) => {
    try {
      const { data: escalaMensal, error } = await supabase
        .from('escala_mensal')
        .select(`
          *,
          escala:escala_id (
            id,
            codigo_escala,
            nome_escala,
            regras_json
          )
        `)
        .eq('funcionario_id', funcionarioId)
        .eq('mes', mes)
        .eq('ano', ano)
        .single();

      if (error) {
        return null;
      }

      if (!escalaMensal) {
        return null;
      }

      return escalaMensal.escala;
    } catch (err) {
      return null;
    }
  };

  // Buscar escala alternativa (caso não exista escala_mensal)
  const buscarEscalaAlternativa = async (funcionarioId: number) => {
    try {
      // Tentar buscar do funcionário diretamente
      const { data: funcionarioData, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          id,
          nome_completo,
          codigo_escala,
          cargo_id,
          cargo:cargo_id (
            id,
            nome_cargo,
            escala_id
          )
        `)
        .eq('id', funcionarioId)
        .single();

      // Se tem cargo com escala_id, buscar a escala
      let cargoData: any = funcionarioData?.cargo;
      if (Array.isArray(cargoData) && cargoData.length > 0) {
        cargoData = cargoData[0];
      }
      
      if (cargoData && (cargoData as any).escala_id) {
        const { data: escalaCargo, error: escalaCargoError } = await supabase
          .from('regras_escalas')
          .select('*')
          .eq('id', (cargoData as any).escala_id)
          .single();

        if (escalaCargo) {
          return escalaCargo;
        }
      }

      // Se não tem escala no cargo, tentar buscar por codigo_escala
      if (funcionarioData?.codigo_escala) {
        const { data: escalaDireta, error: escalaError } = await supabase
          .from('regras_escalas')
          .select('*')
          .eq('codigo_escala', funcionarioData.codigo_escala)
          .single();

        if (escalaDireta) {
          return escalaDireta;
        }
      }

      return null;
    } catch (err) {
      return null;
    }
  };
  const calcularDiasPorTipoEscala = (escala: any, diasNoMes: number) => {
    // Verificar se tem regras JSON definidas
    if (escala.regras_json) {
      try {
        const regras = typeof escala.regras_json === 'string' 
          ? JSON.parse(escala.regras_json) 
          : escala.regras_json;
        
        // Se tem padrão de alternância definido
        if (regras.tipo_alternancia === '12x36' || regras.padrao_trabalho === '12x36') {
          return Math.floor(diasNoMes / 2);
        }
        if (regras.tipo_alternancia === '6x1' || regras.padrao_trabalho === '6x1') {
          const semanas = Math.floor(diasNoMes / 7);
          return semanas * 6 + Math.min(diasNoMes % 7, 6);
        }
        if (regras.tipo_alternancia === '5x2' || regras.padrao_trabalho === '5x2') {
          const semanas = Math.floor(diasNoMes / 7);
          return semanas * 5 + Math.min(diasNoMes % 7, 5);
        }
      } catch (err) {
      }
    }

    // Fallback: verificar pelo nome da escala
    const nomeEscala = escala.nome_escala?.toUpperCase() || escala.codigo_escala?.toUpperCase() || '';
    
    if (nomeEscala.includes('12X36') || nomeEscala.includes('12H36')) {
      return Math.floor(diasNoMes / 2);
    }
    if (nomeEscala.includes('6X1')) {
      const semanas = Math.floor(diasNoMes / 7);
      return semanas * 6 + Math.min(diasNoMes % 7, 6);
    }
    if (nomeEscala.includes('5X2')) {
      const semanas = Math.floor(diasNoMes / 7);
      return semanas * 5 + Math.min(diasNoMes % 7, 5);
    }

    // Se não conseguiu determinar o tipo
    return null;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!funcionario) return;

      setLoadingHolerites(true);
      setUsingCachedData(false);
      
      const cacheKey = getCacheKey(funcionario.id, selectedAno);
      
      // Se offline, tentar usar cache
      if (!isOnline) {
        const cachedHolerites = getCachedData<any[]>(cacheKey);
        const cachedEmpresa = getCachedData<any>(`empresa-${funcionario.empresa_id}`);
        const cachedParametros = getCachedData<any>(`parametros-${selectedAno}`);
        
        if (cachedHolerites && cachedHolerites.length > 0) {
          setHolerites(cachedHolerites);
          setUsingCachedData(true);
          
          if (cachedEmpresa) setEmpresa(cachedEmpresa);
          if (cachedParametros) setParametros(cachedParametros);
          
          setLoadingHolerites(false);
          return;
        }
      }
      
      try {
        // Carregar holerites e informações de visibilidade
        const [data, holeriteVisibility, beneficiosVisibility] = await Promise.all([
          fetchHolerites(selectedAno),
          getVisibilityInfo('holerites'),
          getVisibilityInfo('beneficios')
        ]);
        
        setHolerites(data);
        setVisibilityInfo({
          holerites: holeriteVisibility,
          beneficios: beneficiosVisibility
        });
        
        // Salvar no cache para uso offline (expira em 7 dias)
        if (data.length > 0) {
          cacheData(cacheKey, data, 60 * 24 * 7);
        }

        // Carregar folhas de ponto para cada holerite
        if (data.length > 0) {
          const folhasMap: { [key: string]: any } = {};
          for (const holerite of data) {
            const { data: folhaPonto } = await supabase
              .from('folhas_ponto')
              .select('*')
              .eq('funcionario_id', funcionario.id)
              .eq('mes', holerite.mes)
              .eq('ano', holerite.ano)
              .maybeSingle();
            
            if (folhaPonto) {
              folhasMap[`${holerite.mes}-${holerite.ano}`] = folhaPonto;
            }
          }
          setFolhasPonto(folhasMap);
        }

        // Usar empresa do funcionário (já carregada via join) ou buscar separadamente
        if (funcionario.empresa) {
          setEmpresa(funcionario.empresa);
          cacheData(`empresa-${funcionario.empresa_id}`, funcionario.empresa, 60 * 24 * 7);
        } else if (funcionario.empresa_id) {
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', funcionario.empresa_id)
            .single();
          setEmpresa(empresaData);
          if (empresaData) {
            cacheData(`empresa-${funcionario.empresa_id}`, empresaData, 60 * 24 * 7);
          }
        }

        const { data: parametrosData } = await supabase
          .from('parametros_calculo')
          .select('*')
          .eq('ativo', true)
          .eq('ano_vigencia', selectedAno)
          .single();
        setParametros(parametrosData);
        if (parametrosData) {
          cacheData(`parametros-${selectedAno}`, parametrosData, 60 * 24 * 7);
        }
      } catch (error) {
        
        // Fallback para cache em caso de erro
        const cachedHolerites = getCachedData<any[]>(cacheKey);
        if (cachedHolerites) {
          setHolerites(cachedHolerites);
          setUsingCachedData(true);
        }
      } finally {
        setLoadingHolerites(false);
      }
    };

    loadData();
  }, [funcionario, selectedAno, isOnline]);


  const formatMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]} de ${ano}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Verificar se há benefícios para exibir
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

  // Verificar se uma escala é necessária para o cálculo de benefícios
  const isEscalaNecessaria = (mes: number, ano: number, isParaBeneficios: boolean = false, isProximoMes: boolean = false) => {
    // Se é para benefícios do próximo mês (antecipação), não é crítico se não existir
    if (isParaBeneficios && isProximoMes) {
      return false; // Não mostrar erro para escalas futuras
    }
    
    // Para o mês atual dos benefícios, a escala é necessária
    if (isParaBeneficios && !isProximoMes) {
      return true;
    }
    
    return true; // Para outros casos, a escala é necessária
  };

  // Calcular dias trabalhados no mês (para VT/VA)
  const calcularDiasTrabalhados = async (holerite: any) => {
    const folhaPonto = folhasPonto[`${holerite.mes}-${holerite.ano}`];
    if (folhaPonto?.dados_dias) {
      const dados = typeof folhaPonto.dados_dias === 'string' 
        ? JSON.parse(folhaPonto.dados_dias) 
        : folhaPonto.dados_dias;
      
      // Contar dias efetivamente trabalhados (com entrada e saída, sem faltas)
      return Object.values(dados).filter((d: any) => 
        d.entrada && d.saida && !d.falta_injustificada && !d.atestado && !d.folga
      ).length;
    }
    
    // ⭐ FALLBACK: Calcular baseado na escala quando não há folha de ponto
    if (!funcionario?.id) {
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    // Buscar informações da escala na tabela escala_mensal
    let escala = await buscarInfoEscala(Number(funcionario.id), Number(holerite.mes), Number(holerite.ano));
    
    // Se não encontrou na escala_mensal, tentar buscar escala alternativa
    if (!escala) {
      escala = await buscarEscalaAlternativa(Number(funcionario.id));
    }
    
    if (!escala) {
      // Só mostrar erro se a escala for realmente necessária
      if (isEscalaNecessaria(holerite.mes, holerite.ano, false, false)) {
      }
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    const diasNoMes = new Date(holerite.ano, holerite.mes, 0).getDate();
    const diasCalculados = calcularDiasPorTipoEscala(escala, diasNoMes);
    
    if (diasCalculados === null) {
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    return diasCalculados;
  };

  // Calcular dias a trabalhar no próximo mês (para VT/VA antecipado)
  const calcularDiasATrabalhar = async (holerite: any) => {
    const mesProximo = holerite.mes === 12 ? 1 : holerite.mes + 1;
    const anoProximo = holerite.mes === 12 ? holerite.ano + 1 : holerite.ano;
    const folhaPontoProximo = folhasPonto[`${mesProximo}-${anoProximo}`];
    
    if (folhaPontoProximo?.dados_dias) {
      const dados = typeof folhaPontoProximo.dados_dias === 'string' 
        ? JSON.parse(folhaPontoProximo.dados_dias) 
        : folhaPontoProximo.dados_dias;
      
      // Contar dias efetivamente trabalhados (com entrada e saída, sem faltas)
      return Object.values(dados).filter((d: any) => 
        d.entrada && d.saida && !d.falta_injustificada && !d.atestado && !d.folga
      ).length;
    }
    
    // ⭐ FALLBACK: Calcular baseado na escala quando não há folha do próximo mês
    if (!funcionario?.id) {
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    // Buscar informações da escala na tabela escala_mensal
    let escala = await buscarInfoEscala(Number(funcionario.id), Number(mesProximo), Number(anoProximo));
    
    // Se não encontrou na escala_mensal, tentar buscar escala alternativa
    if (!escala) {
      escala = await buscarEscalaAlternativa(Number(funcionario.id));
    }
    
    if (!escala) {
      // Para benefícios antecipados, não mostrar erro se a escala do próximo mês não existir ainda
      // Isso é comum quando estamos no final do ano e a escala do próximo ano ainda não foi criada
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    const diasNoMes = new Date(anoProximo, mesProximo, 0).getDate();
    const diasCalculados = calcularDiasPorTipoEscala(escala, diasNoMes);
    
    if (diasCalculados === null) {
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    return diasCalculados;
  };

  // Calcular dias de VA especificamente (apenas dias com ≥6h trabalhadas)
  const calcularDiasVA = async (holerite: any, isProximoMes: boolean = false) => {
    const mesVA = isProximoMes ? (holerite.mes === 12 ? 1 : holerite.mes + 1) : holerite.mes;
    const anoVA = isProximoMes ? (holerite.mes === 12 ? holerite.ano + 1 : holerite.ano) : holerite.ano;
    const folhaPonto = folhasPonto[`${mesVA}-${anoVA}`];
    
    if (folhaPonto?.dados_dias) {
      const dados = typeof folhaPonto.dados_dias === 'string' 
        ? JSON.parse(folhaPonto.dados_dias) 
        : folhaPonto.dados_dias;
      
      let diasVA = 0;
      Object.values(dados).forEach((d: any) => {
        if (d.entrada && d.saida && !d.falta_injustificada && !d.atestado && !d.folga) {
          // Calcular horas trabalhadas
          const [hE, mE] = d.entrada.split(':').map(Number);
          const [hS, mS] = d.saida.split(':').map(Number);
          const [hIR, mIR] = (d.inicio_refeicao || '00:00').split(':').map(Number);
          const [hTR, mTR] = (d.termino_refeicao || '00:00').split(':').map(Number);
          
          const minutosEntrada = hE * 60 + mE;
          const minutosSaida = hS * 60 + mS;
          const minutosInicioRef = hIR * 60 + mIR;
          const minutosTerminoRef = hTR * 60 + mTR;
          
          let totalMinutos = minutosSaida - minutosEntrada;
          if (totalMinutos < 0) totalMinutos += 24 * 60;
          
          const intervalo = minutosTerminoRef - minutosInicioRef;
          totalMinutos -= intervalo;
          
          const horas = totalMinutos / 60;
          if (horas >= 6) diasVA++; // Apenas dias ≥6h
        }
      });
      
      return diasVA;
    }
    
    // ⭐ FALLBACK: Para escalas de segurança/vigilância, todos os dias trabalhados são ≥6h
    if (!funcionario?.id) {
      return 0; // Retornar 0 em vez de mostrar alert
    }
    
    // Buscar informações da escala na tabela escala_mensal
    let escala = await buscarInfoEscala(Number(funcionario.id), Number(mesVA), Number(anoVA));
    
    // Se não encontrou na escala_mensal, tentar buscar escala alternativa
    if (!escala) {
      escala = await buscarEscalaAlternativa(Number(funcionario.id));
    }
    
    if (!escala) {
      // Para VA antecipado, não mostrar erro se a escala do próximo mês não existir ainda
      if (isProximoMes) {
        return 0; // Retornar 0 em vez de mostrar alert
      } else {
        // Para o mês atual, a escala é necessária
        if (isEscalaNecessaria(mesVA, anoVA, true, false)) {
        }
        return 0; // Retornar 0 em vez de mostrar alert
      }
    }
    
    // Para escalas de segurança/vigilância, todos os dias trabalhados são ≥6h
    return isProximoMes ? await calcularDiasATrabalhar(holerite) : await calcularDiasTrabalhados(holerite);
  };

  // Obter folha de ponto para um holerite
  const getFolhaPonto = (holerite: any) => {
    return folhasPonto[`${holerite.mes}-${holerite.ano}`] || null;
  };

  if (loading) {
    return (
      <PortalLayout employeeName={funcionario?.nome_completo}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario?.nome_completo}>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full">
        {/* Indicador de modo offline */}
        {usingCachedData && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">
              Modo offline - Exibindo dados salvos anteriormente
            </span>
            {isOnline && (
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="ml-auto flex items-center gap-1 text-amber-700 text-sm px-2 py-1"
              >
                <RefreshCw className="w-3 h-3" />
                Atualizar
              </Button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meus Holerites</h1>
            <p className="text-sm text-muted-foreground">
              Consulte e imprima seus contracheques e benefícios
            </p>
          </div>

          <select
            value={selectedAno}
            onChange={(e) => setSelectedAno(Number(e.target.value))}
            className="w-full sm:w-32 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm"
          >
            {anos.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>

        {/* Informações de Visibilidade */}
        {(visibilityInfo.holerites || visibilityInfo.beneficios) && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-medium text-blue-800">Período de Disponibilidade</h3>
                {visibilityInfo.holerites && (
                  <p className="text-sm text-blue-700">
                    <strong>Holerites:</strong> {visibilityInfo.holerites.periodoInicio} até {visibilityInfo.holerites.periodoFim}
                  </p>
                )}
                {visibilityInfo.beneficios && (
                  <p className="text-sm text-blue-700">
                    <strong>Recibos de Benefícios:</strong> {visibilityInfo.beneficios.periodoInicio} até {visibilityInfo.beneficios.periodoFim}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Modal de Visualização do Holerite */}
        {selectedHolerite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between z-10">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-800">
                  Holerite - {formatMesAno(selectedHolerite.mes, selectedHolerite.ano)}
                </h2>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      const printContent = document.getElementById('holerite-print');
                      if (printContent) {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const htmlContent = `
                            <html>
                              <head>
                                <title>Holerite</title>
                                <style>
                                  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                                  table { border-collapse: collapse; width: 90%; margin: 2mm auto; }
                                  td { font-size: 8px; }
                                  .font-bold { font-weight: bold; }
                                  .font-semibold { font-weight: 600; }
                                  .text-base { font-size: 14px; }
                                  .text-xs { font-size: 8px; }
                                  .text-right { text-align: right; }
                                  .text-center { text-align: center; }
                                  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                                </style>
                              </head>
                              <body>${printContent.innerHTML}</body>
                            </html>
                          `;
                          escreverEExibirJanela(printWindow, htmlContent, 'Holerite');
                        }
                      }
                    }} 
                    className="flex items-center gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedHolerite(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
              <div className="p-3 sm:p-6 overflow-x-auto">
                <Holerite
                  funcionario={funcionario}
                  empresa={empresa}
                  resultado={selectedHolerite}
                  mes={selectedHolerite.mes}
                  ano={selectedHolerite.ano}
                  eventosExcepcionais={selectedHolerite.eventos_excepcionais || []}
                  folhaPonto={getFolhaPonto(selectedHolerite)}
                  parametros={parametros}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização do Recibo de Benefícios */}
        {selectedReciboBeneficios && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between z-10">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-800">
                  Recibo de Benefícios - {formatMesAno(selectedReciboBeneficios.mes, selectedReciboBeneficios.ano)}
                </h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => {
                    const printContent = document.getElementById('recibo-beneficios-print');
                    if (printContent) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const htmlContent = `
                          <html>
                            <head>
                              <title>Recibo de Benefícios</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                                table { border-collapse: collapse; width: 90%; margin: 2mm auto; }
                                td { font-size: 8px; }
                                .font-bold { font-weight: bold; }
                                .font-semibold { font-weight: 600; }
                                .text-base { font-size: 14px; }
                                .text-xs { font-size: 8px; }
                                .text-right { text-align: right; }
                                .text-center { text-align: center; }
                                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                              </style>
                            </head>
                            <body>${printContent.innerHTML}</body>
                          </html>
                        `;
                        escreverEExibirJanela(printWindow, htmlContent, 'Recibo de Benefícios');
                      }
                    }
                  }} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedReciboBeneficios(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
              <div className="p-3 sm:p-6 overflow-x-auto">
                <ReciboBeneficios
                  funcionario={funcionario}
                  empresa={empresa}
                  resultado={selectedReciboBeneficios}
                  mes={selectedReciboBeneficios.mes}
                  ano={selectedReciboBeneficios.ano}
                  eventosExcepcionais={selectedReciboBeneficios.eventos_excepcionais || []}
                  diasTrabalhados={(() => {
                    // ⭐ CÁLCULO CORRETO: Usando os valores reais da tabela parametros_calculo
                    
                    if (!parametros) {
                      return 0;
                    }
                    
                    const valorVAUnitario = parametros.vale_alimentacao;
                    const valorVTUnitario = parametros.vale_transporte * 2; // VT = ida + volta
                    
                    
                    // Calcular baseado no VA primeiro (mais preciso), depois VT como fallback
                    let diasCalculados = 0;
                    if (selectedReciboBeneficios.vale_alimentacao_mes_anterior > 0 && valorVAUnitario > 0) {
                      diasCalculados = Math.round(selectedReciboBeneficios.vale_alimentacao_mes_anterior / valorVAUnitario);
                    } else if (selectedReciboBeneficios.vale_transporte_mes_anterior > 0 && valorVTUnitario > 0) {
                      diasCalculados = Math.round(selectedReciboBeneficios.vale_transporte_mes_anterior / valorVTUnitario);
                    }
                    
                    return diasCalculados;
                  })()}
                  diasATrabalharVA={(() => {
                    if (!parametros) return 0;
                    
                    const valorVAUnitario = parametros.vale_alimentacao;
                    const resultado = selectedReciboBeneficios.vale_alimentacao_mes_atual > 0 && valorVAUnitario > 0
                      ? Math.round(selectedReciboBeneficios.vale_alimentacao_mes_atual / valorVAUnitario) 
                      : 0;
                    return resultado;
                  })()}
                  diasATrabalharVT={(() => {
                    if (!parametros) return 0;
                    
                    const valorVTUnitario = parametros.vale_transporte * 2; // VT = ida + volta
                    const resultado = selectedReciboBeneficios.vale_transporte_mes_atual > 0 && valorVTUnitario > 0
                      ? Math.round(selectedReciboBeneficios.vale_transporte_mes_atual / valorVTUnitario) 
                      : 0;
                    return resultado;
                  })()}
                  folgasTrabalhadasVT={selectedReciboBeneficios.folgas_trabalhadas_vt || 0}
                  folgasTrabalhadasVA={selectedReciboBeneficios.folgas_trabalhadas_va || 0}
                  vtDia={parametros?.vale_transporte || 0}
                  vaDia={parametros?.vale_alimentacao || 0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de Holerites */}
        {loadingHolerites ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : holerites.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum holerite encontrado
            </h3>
            <p className="text-muted-foreground">
              Não há holerites disponíveis para o ano de {selectedAno}.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {holerites.map((holerite) => (
              <Card key={holerite.id} className="p-3 sm:p-4 hover:border-primary transition-colors">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">
                        {formatMesAno(holerite.mes, holerite.ano)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Competência: {String(holerite.mes).padStart(2, '0')}/{holerite.ano}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  {(() => {
                    // Portal apenas ESPELHA os valores já calculados e salvos em folha_calculada.
                    // A única transposição feita aqui é apresentacional: os descontos de VT/VA por
                    // faltas pertencem ao Recibo de Benefícios (e não ao Holerite), então saem do
                    // "Salário Líquido" e entram no bloco "Benefícios". O total não muda.
                    // Os totais são recalculados a partir dos MESMOS campos usados no
                    // holerite/recibo (fonte única: calcularTotaisItensFolhaCalculada), evitando
                    // divergências com totais antigos gravados no banco.
                    const totais = calcularTotaisItensFolhaCalculada(holerite);
                    const totalProventos = totais.totalProventos;
                    const totalDescontos = totais.totalDescontos;
                    const descontosBeneficios =
                      (holerite.desconto_vt_faltas || 0) + (holerite.desconto_va_faltas || 0);
                    const totalBeneficios = totais.totalBeneficios - descontosBeneficios;
                    const salarioLiquidoSemBeneficios =
                      totalProventos - totalDescontos + descontosBeneficios;
                    const liquidoAReceber = salarioLiquidoSemBeneficios + totalBeneficios;


                    return (
                      <>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Salário Líquido</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(salarioLiquidoSemBeneficios)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Benefícios</span>
                          <span className="text-blue-600 font-medium">
                            {formatCurrency(totalBeneficios)}
                          </span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between">
                          <span className="font-medium text-foreground text-sm">Total a Receber</span>
                          <span className="font-bold text-primary text-base sm:text-lg">
                            {formatCurrency(liquidoAReceber)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>


                {/* Botões de ação */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs sm:text-sm py-2"
                      onClick={() => setSelectedHolerite(holerite)}
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Ver Holerite</span>
                      <span className="sm:hidden">Holerite</span>
                    </Button>
                  </div>
                  
                  {/* Botão de Benefícios (se houver) */}
                  {temBeneficios(holerite) && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1 text-xs sm:text-sm py-2"
                        onClick={() => setSelectedReciboBeneficios(holerite)}
                      >
                        <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Ver Benefícios</span>
                        <span className="sm:hidden">Benefícios</span>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default PortalHolerites;
