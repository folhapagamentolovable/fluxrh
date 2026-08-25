import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Download, Loader2, Check } from 'lucide-react';
import Button from './ui/Button';
import Select from './ui/Select';
import { exportarFolhasExcel, exportarBeneficiosExcel, gerarPDFLote } from '../utils/exportarLote';
import { useToast } from '../hooks/useToast';

interface FolhaExport {
  funcionario: {
    id: string;
    nome_completo: string;
    cpf?: string;
    cargo?: { nome_cargo?: string };
    data_admissao?: string;
    funcionario_registrado?: boolean;
  };
  resultado: any;
  dadosFolha: any;
  empresa?: { nome_empresa?: string; id?: string };
  posto_trabalho?: { nome_posto?: string; id?: string };
}

interface ExportacaoLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  folhas: FolhaExport[];
  mes: number;
  ano: number;
  parametros: any;
  eventosExcepcionais: Record<string, any[]>;
  empresas?: Array<{ id: string; nome_empresa: string }>;
  postos?: Array<{ id: string; nome_posto: string }>;
}

const ExportacaoLoteModal: React.FC<ExportacaoLoteModalProps> = ({
  isOpen,
  onClose,
  folhas,
  mes,
  ano,
  parametros,
  eventosExcepcionais,
  empresas = [],
  postos = []
}) => {
  const { showToast } = useToast();
  const [tipoExportacao, setTipoExportacao] = useState<'excel_folha' | 'excel_beneficios' | 'pdf_holerite' | 'pdf_beneficios'>('excel_folha');
  const [filtro, setFiltro] = useState<'todos' | 'empresa' | 'posto'>('todos');
  const [filtroRegistro, setFiltroRegistro] = useState<'todos' | 'registrados' | 'nao_registrados'>('todos');
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportacaoCompleta, setExportacaoCompleta] = useState(false);

  if (!isOpen) return null;

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtrar folhas
  const folhasFiltradas = folhas.filter(f => {
    // Filtro por empresa/posto
    if (filtro === 'empresa' && empresaSelecionada) {
      if (f.empresa?.id !== empresaSelecionada) return false;
    }
    if (filtro === 'posto' && postoSelecionado) {
      if (f.posto_trabalho?.id !== postoSelecionado) return false;
    }
    
    // Filtro por status de registro
    // funcionario_registrado: true = registrado, false = não registrado, null/undefined = registrado (padrão)
    const isRegistrado = f.funcionario?.funcionario_registrado !== false;
    
    if (filtroRegistro === 'registrados' && !isRegistrado) {
      return false;
    }
    if (filtroRegistro === 'nao_registrados' && isRegistrado) {
      return false;
    }
    
    return true;
  });

  const handleExportar = async () => {
    if (folhasFiltradas.length === 0) {
      showToast('Nenhuma folha selecionada para exportar', 'error');
      return;
    }

    setExportando(true);
    setExportacaoCompleta(false);

    try {
      switch (tipoExportacao) {
        case 'excel_folha':
          await exportarFolhasExcel(folhasFiltradas, mes, ano, parametros);
          showToast(`${folhasFiltradas.length} folhas exportadas para Excel`, 'success');
          break;
        case 'excel_beneficios':
          await exportarBeneficiosExcel(folhasFiltradas, mes, ano);
          showToast(`Benefícios de ${folhasFiltradas.length} funcionários exportados`, 'success');
          break;
        case 'pdf_holerite':
          gerarPDFLote(folhasFiltradas, mes, ano, 'holerite', parametros, eventosExcepcionais);
          showToast(`Preparando PDF de ${folhasFiltradas.length} holerites`, 'success');
          break;
        case 'pdf_beneficios':
          gerarPDFLote(folhasFiltradas, mes, ano, 'beneficios', parametros, eventosExcepcionais);
          showToast(`Preparando PDF de ${folhasFiltradas.length} recibos de benefícios`, 'success');
          break;
      }
      setExportacaoCompleta(true);
    } catch (error: any) {
      showToast(error.message || 'Erro ao exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  // Calcular totais
  const totalSalarios = folhasFiltradas.reduce((sum, f) => sum + (f.resultado?.salario_liquido || 0), 0);
  const totalBeneficios = folhasFiltradas.reduce((sum, f) => sum + (f.resultado?.total_beneficios || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exportação em Lote</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{meses[mes - 1]} {ano}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Tipo de exportação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Exportação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipoExportacao('excel_folha')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  tipoExportacao === 'excel_folha'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-xs font-medium">Excel - Folhas</span>
              </button>
              <button
                onClick={() => setTipoExportacao('excel_beneficios')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  tipoExportacao === 'excel_beneficios'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-xs font-medium">Excel - Benefícios</span>
              </button>
              <button
                onClick={() => setTipoExportacao('pdf_holerite')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  tipoExportacao === 'pdf_holerite'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-medium">PDF - Holerites</span>
              </button>
              <button
                onClick={() => setTipoExportacao('pdf_beneficios')}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  tipoExportacao === 'pdf_beneficios'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-medium">PDF - Benefícios</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          {/* Filtro por Status de Registro */}
          <Select
            label="Status de Registro"
            value={filtroRegistro}
            onChange={(e) => setFiltroRegistro(e.target.value as any)}
          >
            <option value="todos">Todos (Registrados e Não Registrados)</option>
            <option value="registrados">Apenas Registrados</option>
            <option value="nao_registrados">Apenas Não Registrados</option>
          </Select>

          <Select
            label="Filtrar por"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value as any);
              setEmpresaSelecionada('');
              setPostoSelecionado('');
            }}
          >
            <option value="todos">Todos os funcionários</option>
            <option value="empresa">Por Empresa</option>
            <option value="posto">Por Posto de Trabalho</option>
          </Select>

          {filtro === 'empresa' && (
            <Select label="Empresa" value={empresaSelecionada} onChange={(e) => setEmpresaSelecionada(e.target.value)}>
              <option value="">Selecione a empresa...</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
              ))}
            </Select>
          )}

          {filtro === 'posto' && (
            <Select label="Posto de Trabalho" value={postoSelecionado} onChange={(e) => setPostoSelecionado(e.target.value)}>
              <option value="">Selecione o posto...</option>
              {postos.map((posto) => (
                <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
              ))}
            </Select>
          )}

          {/* Resumo */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resumo da Exportação</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Funcionários:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{folhasFiltradas.length}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Líquido:</span>
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                  {totalSalarios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              {(tipoExportacao === 'excel_beneficios' || tipoExportacao === 'pdf_beneficios') && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Total Benefícios:</span>
                  <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                    {totalBeneficios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status de conclusão */}
          {exportacaoCompleta && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Exportação concluída com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExportar} 
            disabled={exportando || folhasFiltradas.length === 0}
            className="flex items-center gap-2"
          >
            {exportando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar ({folhasFiltradas.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportacaoLoteModal;
