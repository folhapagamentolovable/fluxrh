import React, { useState } from 'react';
import { X, Building2, Download, Loader2, AlertCircle, Check, FileText } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { gerarCNAB240Itau, downloadCNAB, folhasParaFavorecidos } from '../utils/cnabItau';
import { useToast } from '../hooks/useToast';

interface FolhaExport {
  funcionario: {
    id: string;
    nome_completo: string;
    cpf?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
    digito_conta?: string;
  };
  resultado: any;
  empresa?: { nome_empresa?: string; cnpj?: string; endereco?: string; cidade?: string; estado?: string; id?: string };
  posto_trabalho?: { nome_posto?: string; id?: string };
}

interface CNABModalProps {
  isOpen: boolean;
  onClose: () => void;
  folhas: FolhaExport[];
  mes: number;
  ano: number;
  empresas?: Array<{ id: string; nome_empresa: string; cnpj?: string }>;
  postos?: Array<{ id: string; nome_posto: string }>;
}

const CNABModal: React.FC<CNABModalProps> = ({
  isOpen,
  onClose,
  folhas,
  mes,
  ano,
  empresas = [],
  postos = []
}) => {
  const { showToast } = useToast();
  
  // Dados da empresa pagadora
  const [dadosEmpresa, setDadosEmpresa] = useState({
    razaoSocial: '',
    cnpj: '',
    agencia: '',
    conta: '',
    digitoConta: '',
    endereco: '',
    cidade: '',
    cep: '',
    estado: ''
  });
  
  // Filtros
  const [filtro, setFiltro] = useState<'todos' | 'empresa' | 'posto'>('todos');
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState('');
  const [tipoServico, setTipoServico] = useState<'pagamento_salario' | 'credito_conta'>('pagamento_salario');
  
  const [gerando, setGerando] = useState(false);
  const [geracaoCompleta, setGeracaoCompleta] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  if (!isOpen) return null;

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtrar folhas
  const folhasFiltradas = folhas.filter(f => {
    if (filtro === 'empresa' && empresaSelecionada) {
      return f.empresa?.id === empresaSelecionada;
    }
    if (filtro === 'posto' && postoSelecionado) {
      return f.posto_trabalho?.id === postoSelecionado;
    }
    return true;
  });

  // Validar dados antes de gerar
  const validarDados = (): string[] => {
    const erros: string[] = [];
    
    if (!dadosEmpresa.razaoSocial) erros.push('Razão Social é obrigatória');
    if (!dadosEmpresa.cnpj || dadosEmpresa.cnpj.length < 14) erros.push('CNPJ inválido');
    if (!dadosEmpresa.agencia) erros.push('Agência é obrigatória');
    if (!dadosEmpresa.conta) erros.push('Conta é obrigatória');
    
    // Verificar se há funcionários sem CPF
    const semCPF = folhasFiltradas.filter(f => !f.funcionario.cpf);
    if (semCPF.length > 0) {
      erros.push(`${semCPF.length} funcionário(s) sem CPF cadastrado`);
    }
    
    return erros;
  };

  const handleGerarCNAB = () => {
    const validationErrors = validarDados();
    if (validationErrors.length > 0) {
      setErros(validationErrors);
      return;
    }
    
    setErros([]);
    setGerando(true);
    setGeracaoCompleta(false);

    try {
      const favorecidos = folhasParaFavorecidos(folhasFiltradas);
      
      if (favorecidos.length === 0) {
        showToast('Nenhum funcionário válido para gerar CNAB', 'error');
        setGerando(false);
        return;
      }

      const config = {
        empresa: {
          razaoSocial: dadosEmpresa.razaoSocial,
          cnpj: dadosEmpresa.cnpj,
          banco: '341',
          agencia: dadosEmpresa.agencia,
          conta: dadosEmpresa.conta,
          digitoConta: dadosEmpresa.digitoConta || '0',
          endereco: dadosEmpresa.endereco,
          cidade: dadosEmpresa.cidade,
          cep: dadosEmpresa.cep,
          estado: dadosEmpresa.estado
        },
        favorecidos,
        tipoServico,
        dataGeracao: new Date()
      };

      const conteudoCNAB = gerarCNAB240Itau(config);
      const nomeArquivo = `CNAB240_ITAU_${mes.toString().padStart(2, '0')}${ano}_${Date.now()}.rem`;
      
      downloadCNAB(conteudoCNAB, nomeArquivo);
      
      setGeracaoCompleta(true);
      showToast(`Arquivo CNAB gerado com ${favorecidos.length} pagamentos`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao gerar arquivo CNAB', 'error');
    } finally {
      setGerando(false);
    }
  };

  // Preencher dados da empresa selecionada
  const handleEmpresaChange = (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa) {
      setDadosEmpresa(prev => ({
        ...prev,
        razaoSocial: empresa.nome_empresa || '',
        cnpj: empresa.cnpj || ''
      }));
    }
    setEmpresaSelecionada(empresaId);
  };

  // Calcular total
  const totalPagamento = folhasFiltradas.reduce((sum, f) => sum + (f.resultado?.salario_liquido || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gerar CNAB 240 - Itaú</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pagamentos de {meses[mes - 1]} {ano}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Dados da empresa pagadora */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dados da Empresa Pagadora
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Select
                  label="Razão Social *"
                  value={dadosEmpresa.razaoSocial ? empresas.find(e => e.nome_empresa === dadosEmpresa.razaoSocial)?.id || '' : ''}
                  onChange={(e) => {
                    const empresa = empresas.find(emp => emp.id === e.target.value);
                    if (empresa) {
                      setDadosEmpresa(prev => ({
                        ...prev,
                        razaoSocial: empresa.nome_empresa || '',
                        cnpj: (empresa.cnpj || '').replace(/\D/g, '')
                      }));
                    } else {
                      setDadosEmpresa(prev => ({
                        ...prev,
                        razaoSocial: '',
                        cnpj: ''
                      }));
                    }
                  }}
                >
                  <option value="">Selecione uma empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                  ))}
                </Select>
              </div>
              <Input
                label="CNPJ *"
                value={dadosEmpresa.cnpj}
                onChange={(e) => setDadosEmpresa(prev => ({ ...prev, cnpj: e.target.value.replace(/\D/g, '') }))}
                placeholder="00000000000000"
                maxLength={14}
              />
              <Select label="Tipo de Serviço" value={tipoServico} onChange={(e) => setTipoServico(e.target.value as any)}>
                <option value="pagamento_salario">Pagamento de Salários</option>
                <option value="credito_conta">Crédito em Conta</option>
              </Select>
              <Input
                label="Agência *"
                value={dadosEmpresa.agencia}
                onChange={(e) => setDadosEmpresa(prev => ({ ...prev, agencia: e.target.value.replace(/\D/g, '') }))}
                placeholder="0000"
                maxLength={5}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Conta *"
                    value={dadosEmpresa.conta}
                    onChange={(e) => setDadosEmpresa(prev => ({ ...prev, conta: e.target.value.replace(/\D/g, '') }))}
                    placeholder="000000"
                    maxLength={12}
                  />
                </div>
                <div className="w-20">
                  <Input
                    label="Dígito"
                    value={dadosEmpresa.digitoConta}
                    onChange={(e) => setDadosEmpresa(prev => ({ ...prev, digitoConta: e.target.value }))}
                    placeholder="0"
                    maxLength={1}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-3 gap-2">
            <Select label="Filtrar por" value={filtro} onChange={(e) => setFiltro(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="empresa">Por Empresa</option>
              <option value="posto">Por Posto</option>
            </Select>
            {filtro === 'empresa' && (
              <div className="col-span-2">
                <Select 
                  label="Empresa"
                  value={empresaSelecionada} 
                  onChange={(e) => handleEmpresaChange(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                  ))}
                </Select>
              </div>
            )}
            {filtro === 'posto' && (
              <div className="col-span-2">
                <Select 
                  label="Posto"
                  value={postoSelecionado} 
                  onChange={(e) => setPostoSelecionado(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {postos.map((posto) => (
                    <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Erros */}
          {erros.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Corrija os seguintes erros:</span>
              </div>
              <ul className="text-sm text-red-600 dark:text-red-300 list-disc list-inside">
                {erros.map((erro, idx) => (
                  <li key={idx}>{erro}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Resumo do Arquivo CNAB
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Funcionários:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{folhasFiltradas.length}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Pagamento:</span>
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                  {totalPagamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Formato:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">CNAB 240 - Itaú (Layout Pagamentos)</span>
              </div>
            </div>
          </div>

          {/* Status de conclusão */}
          {geracaoCompleta && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Arquivo CNAB gerado com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGerarCNAB} 
            disabled={gerando || folhasFiltradas.length === 0}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {gerando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gerar CNAB ({folhasFiltradas.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CNABModal;
