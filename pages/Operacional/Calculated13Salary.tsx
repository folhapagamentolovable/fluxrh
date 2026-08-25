import React, { useState, useEffect } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { Calculator, Printer, FileText, Loader2, Building2, X } from 'lucide-react';
import { useFuncionariosAtivos, useEmpresas, usePostosTrabalho } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { formatarMoeda } from '../../utils/calcularFolhaPagamento';
import Holerite13Salario from '../../components/Recibos/Holerite13Salario';
import { mapearFolhaParaHolerite13Salario } from '../../components/Recibos/codigosContabeis13Salario';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';

interface EventoExcepcional {
  descricao: string;
  valor: number;
  tipo: 'provento' | 'beneficio' | 'desconto';
}

interface Folha13SalarioCompleta {
  funcionario: any;
  resultado: any;
  dadosFolha?: any;
  empresa?: any;
  posto_trabalho?: any;
  eventosExcepcionais?: EventoExcepcional[];
}

const Calculated13Salary: React.FC = () => {
  const { showToast, ToastContainer } = useToast();
  const { isAdmin, canShowForm, canShowActions } = usePermissions();
  const { data: funcionarios } = useFuncionariosAtivos();
  const { data: empresas } = useEmpresas();
  const { data: postos } = usePostosTrabalho();
  
  const [ano, setAno] = useState(new Date().getFullYear());
  const [tipoParcela, setTipoParcela] = useState<'1a_parcela' | '2a_parcela' | 'integral'>('integral');
  const [loading, setLoading] = useState(false);
  const [todasFolhas, setTodasFolhas] = useState<Folha13SalarioCompleta[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'nome' | 'empresa' | 'posto'>('nome');
  
  // Estados para modais
  const [mostrarHolerite, setMostrarHolerite] = useState(false);
  const [folhaSelecionada, setFolhaSelecionada] = useState<Folha13SalarioCompleta | null>(null);
  
  // Filtros para impressão em lote
  const [filtroImpressao, setFiltroImpressao] = useState<'todos' | 'posto' | 'empresa'>('todos');
  const [postoFiltro, setPostoFiltro] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  
  // Visualização em lote
  const [mostrarVisualizacaoLote, setMostrarVisualizacaoLote] = useState(false);
  const [folhasVisualizacaoLote, setFolhasVisualizacaoLote] = useState<Folha13SalarioCompleta[]>([]);
  
  // Indicador de progresso
  const [imprimindo, setImprimindo] = useState(false);
  const [progressoImpressao, setProgressoImpressao] = useState({ atual: 0, total: 0, tipo: '' });

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Carregar dados ao montar ou mudar ano/tipo
  useEffect(() => {
    carregarDados13Salario();
  }, [ano, tipoParcela]);

  const carregarDados13Salario = async () => {
    setLoading(true);
    try {
      
      // Buscar folhas calculadas do ano (mês 11 para 1a parcela, 12 para 2a parcela/integral)
      let mesReferencia = 12;
      if (tipoParcela === '1a_parcela') mesReferencia = 11;
      
      const { data: folhasSalvas, error } = await supabase
        .from('folha_calculada')
        .select(`
          funcionario_id,
          nome_funcionario,
          mes,
          ano,
          empresa_id,
          posto_trabalho_id,
          salario_base,
          decimo_terceiro_primeira_parcela,
          decimo_terceiro_segunda_parcela,
          decimo_terceiro_vantagens_primeira_parcela,
          decimo_terceiro_vantagens_segunda_parcela,
          decimo_terceiro_integral,
          vantagens_13,
          inss_13,
          adiantamento_13_salario,
          adiantamento_vantagens_13,
          eventos_excepcionais,
          funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .eq('ano', ano)
        .eq('mes', mesReferencia);

      if (error) {
        throw error;
      }

      if (folhasSalvas && folhasSalvas.length > 0) {
        
        // Normalizar relacionamentos
        folhasSalvas.forEach((folha: any) => {
          if (Array.isArray(folha.funcionario)) {
            folha.funcionario = folha.funcionario[0] || null;
          }
          if (Array.isArray(folha.empresa)) {
            folha.empresa = folha.empresa[0] || null;
          }
          if (Array.isArray(folha.posto_trabalho)) {
            folha.posto_trabalho = folha.posto_trabalho[0] || null;
          }
        });

        // Filtrar apenas folhas que tenham dados de 13° salário
        const folhasComDados13 = folhasSalvas.filter(folha => {
          const tem13 = (
            (folha.decimo_terceiro_primeira_parcela || 0) > 0 ||
            (folha.decimo_terceiro_segunda_parcela || 0) > 0 ||
            (folha.decimo_terceiro_integral || 0) > 0 ||
            (folha.vantagens_13 || 0) > 0
          );
          return tem13;
        });

        const folhasProcessadas = folhasComDados13.map(folha => ({
          funcionario: folha.funcionario,
          resultado: {
            salario_base: folha.salario_base,
            decimo_terceiro_primeira_parcela: folha.decimo_terceiro_primeira_parcela || 0,
            decimo_terceiro_segunda_parcela: folha.decimo_terceiro_segunda_parcela || 0,
            decimo_terceiro_vantagens_primeira_parcela: folha.decimo_terceiro_vantagens_primeira_parcela || 0,
            decimo_terceiro_vantagens_segunda_parcela: folha.decimo_terceiro_vantagens_segunda_parcela || 0,
            decimo_terceiro_integral: folha.decimo_terceiro_integral || 0,
            vantagens_13: folha.vantagens_13 || 0,
            inss_13: folha.inss_13 || 0,
            adiantamento_13_salario: folha.adiantamento_13_salario || 0,
            adiantamento_vantagens_13: folha.adiantamento_vantagens_13 || 0,
          },
          dadosFolha: folha,
          empresa: folha.empresa,
          posto_trabalho: folha.posto_trabalho,
          eventosExcepcionais: folha.eventos_excepcionais || []
        }));

        setTodasFolhas(folhasProcessadas);
        
        if (folhasProcessadas.length > 0 && !activeTab) {
          const primeiroFuncionario = folhasProcessadas[0].funcionario as any;
          const funcId = Array.isArray(primeiroFuncionario) ? primeiroFuncionario[0]?.id : primeiroFuncionario?.id;
          setActiveTab(funcId || '');
        }
      } else {
        setTodasFolhas([]);
        setActiveTab('');
      }
    } catch (error) {
      showToast('Erro ao carregar dados de 13° salário', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Ordenar folhas
  const folhasOrdenadas = [...todasFolhas].sort((a, b) => {
    switch (ordenacao) {
      case 'empresa':
        return (a.empresa?.nome_empresa || '').localeCompare(b.empresa?.nome_empresa || '');
      case 'posto':
        return (a.posto_trabalho?.nome_posto || '').localeCompare(b.posto_trabalho?.nome_posto || '');
      default:
        return (a.funcionario?.nome_completo || '').localeCompare(b.funcionario?.nome_completo || '');
    }
  });

  // Calcular totais de 13°
  const calcularTotais13 = (resultado: any) => {
    const proventos = (
      (resultado.decimo_terceiro_primeira_parcela || 0) +
      (resultado.decimo_terceiro_segunda_parcela || 0) +
      (resultado.decimo_terceiro_vantagens_primeira_parcela || 0) +
      (resultado.decimo_terceiro_vantagens_segunda_parcela || 0) +
      (resultado.decimo_terceiro_integral || 0) +
      (resultado.vantagens_13 || 0)
    );
    const descontos = (
      (resultado.inss_13 || 0) +
      (resultado.adiantamento_13_salario || 0) +
      (resultado.adiantamento_vantagens_13 || 0)
    );
    return { proventos, descontos, liquido: proventos - descontos };
  };

  const folhaAtiva = folhasOrdenadas.find(f => f.funcionario?.id === activeTab);

  // Função para visualização em lote
  const visualizarLote = () => {
    let folhasFiltradas = todasFolhas;

    if (filtroImpressao === 'posto' && postoFiltro) {
      folhasFiltradas = todasFolhas.filter(f => f.funcionario?.posto_trabalho_id === postoFiltro);
    } else if (filtroImpressao === 'empresa' && empresaFiltro) {
      folhasFiltradas = todasFolhas.filter(f => f.funcionario?.empresa_id === empresaFiltro);
    }

    if (folhasFiltradas.length === 0) {
      showToast('Nenhuma folha encontrada com os filtros selecionados', 'info');
      return;
    }

    setFolhasVisualizacaoLote(folhasFiltradas);
    setMostrarVisualizacaoLote(true);
  };

  // Função para imprimir em lote
  const imprimirLote = async () => {
    let folhasFiltradas = todasFolhas;

    if (filtroImpressao === 'posto' && postoFiltro) {
      folhasFiltradas = todasFolhas.filter(f => f.funcionario?.posto_trabalho_id === postoFiltro);
    } else if (filtroImpressao === 'empresa' && empresaFiltro) {
      folhasFiltradas = todasFolhas.filter(f => f.funcionario?.empresa_id === empresaFiltro);
    }

    if (folhasFiltradas.length === 0) {
      showToast('Nenhuma folha encontrada com os filtros selecionados', 'info');
      return;
    }

    setImprimindo(true);
    setProgressoImpressao({ atual: 0, total: folhasFiltradas.length, tipo: 'Holerites 13°' });

    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) {
      setImprimindo(false);
      showToast('Não foi possível abrir a janela de impressão', 'error');
      return;
    }

    const getTitulo = () => {
      switch (tipoParcela) {
        case '1a_parcela': return 'RECIBO DE PAGAMENTO - 13º SALÁRIO (1ª PARCELA)';
        case '2a_parcela': return 'RECIBO DE PAGAMENTO - 13º SALÁRIO (2ª PARCELA)';
        default: return 'RECIBO DE PAGAMENTO - 13º SALÁRIO';
      }
    };

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${getTitulo()} - ${ano}</title>
        <style>
          @media print {
            @page { size: A4 portrait; margin: 5mm; }
            .page-break { page-break-after: always; }
          }
          body { font-family: Arial, sans-serif; font-size: 10px; }
          table { width: 90%; border-collapse: collapse; margin: 2mm auto; }
          td { padding: 2px 4px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border { border: 1px solid black; }
        </style>
      </head>
      <body>
    `;

    folhasFiltradas.forEach((folha, index) => {
      setProgressoImpressao(prev => ({ ...prev, atual: index + 1 }));
      
      const lancamentos = mapearFolhaParaHolerite13Salario(folha.resultado, folha.eventosExcepcionais);
      const eventosComDados = lancamentos.filter(l => l && l.valor !== 0);
      const totalProventos = eventosComDados.filter(l => l.tipo === 'provento').reduce((sum, l) => sum + l.valor, 0);
      const totalDescontos = eventosComDados.filter(l => l.tipo === 'desconto').reduce((sum, l) => sum + l.valor, 0);
      const valorLiquido = totalProventos - totalDescontos;
      const isRegistrado = folha.funcionario?.registrado === true || folha.funcionario?.funcionario_registrado === true;
      const mesRef = tipoParcela === '1a_parcela' ? 11 : 12;

      htmlContent += `
        <div class="${index < folhasFiltradas.length - 1 ? 'page-break' : ''}">
          <table>
            <tbody>
              <tr>
                <td colspan="12" class="border font-bold text-center" style="padding: 8px;">
                  ${getTitulo()} - ${mesRef.toString().padStart(2, '0')}/${ano}
                </td>
              </tr>
              ${isRegistrado ? `
              <tr>
                <td colspan="12" class="border" style="padding: 4px;">
                  ${folha.empresa?.nome_empresa || 'Empresa'} | CNPJ: ${folha.empresa?.cnpj || 'N/A'}
                </td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="12" class="border" style="padding: 4px;">
                  <strong>Empregado:</strong> ${folha.funcionario?.nome_completo || 'N/A'} | 
                  <strong>Cargo:</strong> ${folha.funcionario?.cargo?.nome_cargo || 'N/A'} |
                  <strong>CPF:</strong> ${folha.funcionario?.cpf || 'N/A'}
                </td>
              </tr>
              <tr>
                <td colspan="2" class="border font-bold text-center">Código</td>
                <td colspan="4" class="border font-bold text-center">Descrição</td>
                <td colspan="3" class="border font-bold text-center">Proventos</td>
                <td colspan="3" class="border font-bold text-center">Descontos</td>
              </tr>
              ${eventosComDados.map(evento => `
              <tr>
                <td colspan="2" class="border text-center">${evento.codigo}</td>
                <td colspan="4" class="border">${evento.descricao}</td>
                <td colspan="3" class="border text-right">${evento.tipo === 'provento' ? formatarMoeda(evento.valor) : ''}</td>
                <td colspan="3" class="border text-right">${evento.tipo === 'desconto' ? formatarMoeda(evento.valor) : ''}</td>
              </tr>
              `).join('')}
              <tr>
                <td colspan="6" class="border font-bold">13º Salário - Exercício ${ano}</td>
                <td colspan="3" class="border text-right font-bold">${formatarMoeda(totalProventos)}</td>
                <td colspan="3" class="border text-right font-bold">${formatarMoeda(totalDescontos)}</td>
              </tr>
              <tr>
                <td colspan="6" class="border"></td>
                <td colspan="3" class="border text-right font-bold">Total Líquido</td>
                <td colspan="3" class="border text-right font-bold">${formatarMoeda(valorLiquido)}</td>
              </tr>
              <tr>
                <td colspan="12" class="border" style="padding: 8px;">
                  Declaro ter recebido a importância líquida discriminada neste recibo.
                </td>
              </tr>
              <tr>
                <td colspan="6" class="border" style="padding: 16px;">
                  Data: ______/______/____________
                </td>
                <td colspan="6" class="border" style="padding: 16px;">
                  Assinatura: _______________________________________
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    htmlContent += '</body></html>';

    escreverEExibirJanela(printWindow, htmlContent, '13º Salário em Lote');

    setImprimindo(false);
    setProgressoImpressao({ atual: 0, total: 0, tipo: '' });
  };

  return (
    <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
      <ToastContainer />
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">13° Salário Calculado</h1>

      {/* Seção de Controles */}
      <Card>
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Visualizar 13° Salário</h2>
        <div className="space-y-4">
          {/* Linha 1: Selects */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Select
              label="Ano"
              value={ano.toString()}
              onChange={(e) => setAno(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>

            <Select
              label="Tipo de Parcela"
              value={tipoParcela}
              onChange={(e) => setTipoParcela(e.target.value as any)}
            >
              <option value="1a_parcela">1ª Parcela</option>
              <option value="2a_parcela">2ª Parcela</option>
              <option value="integral">Integral</option>
            </Select>

            <div className="col-span-2 flex items-end">
              <Button 
                onClick={carregarDados13Salario} 
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                Atualizar
              </Button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                📊 {todasFolhas.length} funcionário(s) com 13° salário calculado para {ano}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Seção de Impressão em Lote */}
      <Card>
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Visualizar/Imprimir em Lote</h2>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Filtrar por"
              value={filtroImpressao}
              onChange={(e) => setFiltroImpressao(e.target.value as 'todos' | 'posto' | 'empresa')}
            >
              <option value="todos">Todos os Funcionários</option>
              <option value="posto">Por Posto de Trabalho</option>
              <option value="empresa">Por Empresa</option>
            </Select>

            {filtroImpressao === 'posto' && (
              <Select
                label="Posto de Trabalho"
                value={postoFiltro}
                onChange={(e) => setPostoFiltro(e.target.value)}
              >
                <option value="">Selecione um posto</option>
                {postos.map(posto => (
                  <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                ))}
              </Select>
            )}

            {filtroImpressao === 'empresa' && (
              <Select
                label="Empresa"
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
              >
                <option value="">Selecione uma empresa</option>
                {empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nome_empresa}</option>
                ))}
              </Select>
            )}
          </div>

          {/* Indicador de Progresso */}
          {imprimindo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Gerando {progressoImpressao.tipo}...
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {progressoImpressao.atual} / {progressoImpressao.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${progressoImpressao.total > 0 ? (progressoImpressao.atual / progressoImpressao.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={visualizarLote} disabled={todasFolhas.length === 0 || imprimindo}>
              <FileText className="h-4 w-4 mr-2" />
              Visualizar Holerites
            </Button>
            <Button onClick={imprimirLote} disabled={todasFolhas.length === 0 || imprimindo}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Holerites
            </Button>
          </div>
        </div>
      </Card>

      {/* Folhas Calculadas */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-primary mr-2" />
            <span>Carregando dados...</span>
          </div>
        </Card>
      ) : todasFolhas.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum dado de 13° salário encontrado</h3>
          <p className="text-muted-foreground">
            Primeiro calcule a folha de pagamento de novembro ou dezembro para gerar os dados de 13°.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Lista de Funcionários - À Esquerda */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <Card>
              <div className="sticky top-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Funcionários ({folhasOrdenadas.length})
                </h2>

                <div className="mb-4">
                  <label htmlFor="ordenacao-select" className="block text-sm font-medium text-muted-foreground mb-2">
                    Ordenar por:
                  </label>
                  <select
                    id="ordenacao-select"
                    value={ordenacao}
                    onChange={(e) => setOrdenacao(e.target.value as 'nome' | 'empresa' | 'posto')}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
                  >
                    <option value="nome">Nome</option>
                    <option value="empresa">Empresa</option>
                    <option value="posto">Posto</option>
                  </select>
                </div>

                <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:max-h-[600px] lg:overflow-y-auto pb-2 lg:pb-0">
                  {folhasOrdenadas.map((folha) => {
                    const totais = calcularTotais13(folha.resultado);
                    return (
                      <button
                        key={folha.funcionario?.id}
                        onClick={() => setActiveTab(folha.funcionario?.id)}
                        className={`flex-shrink-0 lg:flex-shrink lg:w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors ${
                          activeTab === folha.funcionario?.id
                            ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{folha.funcionario?.nome_completo}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {ordenacao === 'empresa' && (
                            <div className="font-semibold text-blue-600">
                              🏢 {folha.empresa?.nome_empresa || 'Sem empresa'}
                            </div>
                          )}
                          {ordenacao === 'posto' && (
                            <div className="font-semibold text-purple-600">
                              📍 {folha.posto_trabalho?.nome_posto || 'Sem posto'}
                            </div>
                          )}
                          {folha.funcionario?.cargo?.nome_cargo || 'Sem cargo'}
                        </div>
                        <div className="text-xs font-semibold text-primary mt-1">
                          💰 Líquido: {formatarMoeda(totais.liquido)}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </Card>
          </div>

          {/* Conteúdo da Folha Selecionada - À Direita */}
          <div className="flex-1">
            {folhaAtiva && (
              <>
                {/* Header do Funcionário */}
                <Card className="bg-primary/5 border border-primary/20">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 text-sm flex-1 w-full">
                      <div><span className="font-semibold">Funcionário:</span> {folhaAtiva.funcionario?.nome_completo}</div>
                      <div><span className="font-semibold">Empresa:</span> {folhaAtiva.empresa?.nome_empresa || 'N/A'}</div>
                      <div><span className="font-semibold">Posto:</span> {folhaAtiva.posto_trabalho?.nome_posto || 'N/A'}</div>
                      <div><span className="font-semibold">Cargo:</span> {folhaAtiva.funcionario?.cargo?.nome_cargo || 'N/A'}</div>
                      <div><span className="font-semibold">Tipo:</span> {tipoParcela === '1a_parcela' ? '1ª Parcela' : tipoParcela === '2a_parcela' ? '2ª Parcela' : 'Integral'}</div>
                      <div><span className="font-semibold">Exercício:</span> {ano}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <Button 
                        onClick={() => {
                          setFolhaSelecionada(folhaAtiva);
                          setMostrarHolerite(true);
                        }}
                        variant="secondary"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Containers de Valores */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* PROVENTOS 13° (Verde) */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold mb-3 text-green-800 dark:text-green-300">💰 Proventos 13°</h4>
                    <ul className="space-y-2 text-sm">
                      {folhaAtiva.resultado.decimo_terceiro_primeira_parcela > 0 && (
                        <li className="flex justify-between">
                          <span>13° Salário 1ª Parcela</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_primeira_parcela)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela > 0 && (
                        <li className="flex justify-between">
                          <span>Vantagens 13° 1ª Parcela</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_vantagens_primeira_parcela)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.decimo_terceiro_segunda_parcela > 0 && (
                        <li className="flex justify-between">
                          <span>13° Salário 2ª Parcela</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_segunda_parcela)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela > 0 && (
                        <li className="flex justify-between">
                          <span>Vantagens 13° 2ª Parcela</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_vantagens_segunda_parcela)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.decimo_terceiro_integral > 0 && (
                        <li className="flex justify-between">
                          <span>13° Salário Integral</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.decimo_terceiro_integral)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.vantagens_13 > 0 && (
                        <li className="flex justify-between">
                          <span>Vantagens 13°</span>
                          <span>{formatarMoeda(folhaAtiva.resultado.vantagens_13)}</span>
                        </li>
                      )}
                    </ul>
                    <div className="flex justify-between font-bold border-t border-green-300 dark:border-green-700 mt-2 pt-2 text-green-700 dark:text-green-300">
                      <span>Total Proventos</span>
                      <span>{formatarMoeda(calcularTotais13(folhaAtiva.resultado).proventos)}</span>
                    </div>
                  </div>

                  {/* DESCONTOS 13° (Vermelho) */}
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold mb-3 text-red-800 dark:text-red-300">📉 Descontos 13°</h4>
                    <ul className="space-y-2 text-sm">
                      {folhaAtiva.resultado.inss_13 > 0 && (
                        <li className="flex justify-between">
                          <span>INSS 13°</span>
                          <span>-{formatarMoeda(folhaAtiva.resultado.inss_13)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.adiantamento_13_salario > 0 && (
                        <li className="flex justify-between">
                          <span>Adiant. 13° Salário</span>
                          <span>-{formatarMoeda(folhaAtiva.resultado.adiantamento_13_salario)}</span>
                        </li>
                      )}
                      {folhaAtiva.resultado.adiantamento_vantagens_13 > 0 && (
                        <li className="flex justify-between">
                          <span>Adiant. Vantagens 13°</span>
                          <span>-{formatarMoeda(folhaAtiva.resultado.adiantamento_vantagens_13)}</span>
                        </li>
                      )}
                    </ul>
                    <div className="flex justify-between font-bold border-t border-red-300 dark:border-red-700 mt-2 pt-2 text-red-700 dark:text-red-300">
                      <span>Total Descontos</span>
                      <span>-{formatarMoeda(calcularTotais13(folhaAtiva.resultado).descontos)}</span>
                    </div>
                  </div>

                  {/* RESUMO (Azul) */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">📊 Resumo</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Total Proventos</span>
                        <span className="text-green-600">{formatarMoeda(calcularTotais13(folhaAtiva.resultado).proventos)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Total Descontos</span>
                        <span className="text-red-600">-{formatarMoeda(calcularTotais13(folhaAtiva.resultado).descontos)}</span>
                      </li>
                    </ul>
                    <div className="flex justify-between font-bold border-t border-blue-300 dark:border-blue-700 mt-2 pt-2 text-blue-700 dark:text-blue-300 text-lg">
                      <span>Valor Líquido</span>
                      <span>{formatarMoeda(calcularTotais13(folhaAtiva.resultado).liquido)}</span>
                    </div>
                  </div>
                </div>

                {/* Preview do Holerite */}
                <Card className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">📄 Prévia do Recibo</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Holerite13Salario
                      funcionario={folhaAtiva.funcionario}
                      empresa={folhaAtiva.empresa}
                      resultado={folhaAtiva.resultado}
                      mes={tipoParcela === '1a_parcela' ? 11 : 12}
                      ano={ano}
                      eventosExcepcionais={folhaAtiva.eventosExcepcionais}
                      tipoRecibo={tipoParcela}
                    />
                  </div>
                </Card>
              </>
            )}

            {!folhaAtiva && todasFolhas.length > 0 && (
              <Card className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um funcionário para ver os detalhes</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal de Impressão Individual */}
      {mostrarHolerite && folhaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h3 className="font-semibold">Recibo de 13° Salário - {folhaSelecionada.funcionario?.nome_completo}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMostrarHolerite(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 print:p-0">
              <Holerite13Salario
                funcionario={folhaSelecionada.funcionario}
                empresa={folhaSelecionada.empresa}
                resultado={folhaSelecionada.resultado}
                mes={tipoParcela === '1a_parcela' ? 11 : 12}
                ano={ano}
                eventosExcepcionais={folhaSelecionada.eventosExcepcionais}
                tipoRecibo={tipoParcela}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização em Lote */}
      {mostrarVisualizacaoLote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h3 className="font-semibold">Visualização em Lote - {folhasVisualizacaoLote.length} Holerites</h3>
              <div className="flex gap-2">
                <Button onClick={imprimirLote}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Todos
                </Button>
                <Button variant="outline" onClick={() => setMostrarVisualizacaoLote(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-8">
              {folhasVisualizacaoLote.map((folha, index) => (
                <div key={folha.funcionario?.id || index} className="border rounded-lg overflow-hidden">
                  <Holerite13Salario
                    funcionario={folha.funcionario}
                    empresa={folha.empresa}
                    resultado={folha.resultado}
                    mes={tipoParcela === '1a_parcela' ? 11 : 12}
                    ano={ano}
                    eventosExcepcionais={folha.eventosExcepcionais}
                    tipoRecibo={tipoParcela}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculated13Salary;
