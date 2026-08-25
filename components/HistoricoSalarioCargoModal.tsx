import React, { useState, useEffect } from 'react';
import { X, Plus, History, DollarSign, Calendar, Percent, FileText, Pencil, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { 
  getHistoricoSalarioCargo, 
  adicionarReajusteCargo,
  atualizarReajusteCargo,
  excluirReajusteCargo,
  validarDataVigencia,
  HistoricoSalarioCargo 
} from '../hooks/useSalarioCargo';

interface Cargo {
  id: string;
  nome_cargo: string;
  salario_base: number;
}

interface HistoricoSalarioCargoModalProps {
  cargo: Cargo | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HistoricoSalarioCargoModal: React.FC<HistoricoSalarioCargoModalProps> = ({
  cargo,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [historico, setHistorico] = useState<HistoricoSalarioCargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    novoSalario: '',
    dataInicioVigencia: '',
    motivo: 'Dissídio coletivo',
    percentualReajuste: '',
    observacoes: ''
  });

  // Pegar salário de referência baseado na data de vigência selecionada
  // Busca o registro anterior à data selecionada para calcular o percentual correto
  const getSalarioReferenciaPorData = (dataVigencia: string): number => {
    if (!dataVigencia || historico.length === 0) {
      return cargo?.salario_base || 0;
    }
    
    // Ordenar histórico por data de início (mais antigo primeiro)
    const historicoOrdenado = [...historico].sort((a, b) => 
      a.data_inicio_vigencia.localeCompare(b.data_inicio_vigencia)
    );
    
    // Encontrar o registro imediatamente anterior à data selecionada
    let salarioAnterior = 0;
    for (const item of historicoOrdenado) {
      if (item.data_inicio_vigencia < dataVigencia) {
        salarioAnterior = Number(item.salario_base);
      } else {
        break;
      }
    }
    
    // Se não encontrou registro anterior, usar o primeiro registro como referência
    if (salarioAnterior === 0 && historicoOrdenado.length > 0) {
      salarioAnterior = Number(historicoOrdenado[0].salario_base);
    }
    
    return salarioAnterior || cargo?.salario_base || 0;
  };

  // Pegar salário base de referência (último do histórico ou atual do cargo)
  const getSalarioReferencia = () => {
    // Usar a data de vigência do formulário para calcular
    if (formData.dataInicioVigencia) {
      return getSalarioReferenciaPorData(formData.dataInicioVigencia);
    }
    if (historico.length > 0) {
      return Number(historico[0].salario_base);
    }
    return cargo?.salario_base || 0;
  };

  useEffect(() => {
    if (isOpen && cargo) {
      carregarHistorico();
      // Preencher novo salário com o valor atual
      setFormData(prev => ({
        ...prev,
        novoSalario: cargo.salario_base.toFixed(2),
        dataInicioVigencia: new Date().toISOString().split('T')[0]
      }));
    }
  }, [isOpen, cargo]);

  const carregarHistorico = async () => {
    if (!cargo) return;
    
    setLoading(true);
    try {
      const data = await getHistoricoSalarioCargo(cargo.id);
      setHistorico(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = e.target.value;
    setFormData(prev => ({ ...prev, novoSalario: novoValor }));
    
    // Calcular percentual automaticamente baseado no salário de referência para a data
    const salarioReferencia = getSalarioReferenciaPorData(formData.dataInicioVigencia);
    if (salarioReferencia > 0 && novoValor) {
      const novoSalarioNum = parseFloat(novoValor);
      if (novoSalarioNum > 0) {
        const percentual = ((novoSalarioNum - salarioReferencia) / salarioReferencia) * 100;
        setFormData(prev => ({ ...prev, percentualReajuste: percentual.toFixed(2) }));
      }
    }
  };

  const handlePercentualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentual = e.target.value;
    setFormData(prev => ({ ...prev, percentualReajuste: percentual }));
    
    // Calcular novo salário automaticamente baseado no salário de referência para a data
    const salarioReferencia = getSalarioReferenciaPorData(formData.dataInicioVigencia);
    if (salarioReferencia > 0 && percentual) {
      const percentualNum = parseFloat(percentual);
      if (!isNaN(percentualNum)) {
        const novoSalario = salarioReferencia * (1 + percentualNum / 100);
        setFormData(prev => ({ ...prev, novoSalario: novoSalario.toFixed(2) }));
      }
    }
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaData = e.target.value;
    setFormData(prev => ({ ...prev, dataInicioVigencia: novaData }));
    
    // Recalcular percentual quando a data muda
    const salarioReferencia = getSalarioReferenciaPorData(novaData);
    if (salarioReferencia > 0 && formData.novoSalario) {
      const novoSalarioNum = parseFloat(formData.novoSalario);
      if (novoSalarioNum > 0) {
        const percentual = ((novoSalarioNum - salarioReferencia) / salarioReferencia) * 100;
        setFormData(prev => ({ ...prev, percentualReajuste: percentual.toFixed(2) }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargo) return;
    
    setValidationError(null);
    setSaving(true);
    
    try {
      // Validar sobreposição de datas
      const validacao = await validarDataVigencia(
        cargo.id,
        formData.dataInicioVigencia,
        editingId || undefined
      );
      
      if (!validacao.valido) {
        setValidationError(validacao.mensagem || 'Data de vigência inválida');
        setSaving(false);
        return;
      }
      
      let result;
      
      if (editingId) {
        // Modo edição
        result = await atualizarReajusteCargo(editingId, {
          salario_base: parseFloat(formData.novoSalario),
          data_inicio_vigencia: formData.dataInicioVigencia,
          motivo: formData.motivo,
          percentual_reajuste: formData.percentualReajuste ? parseFloat(formData.percentualReajuste) : null,
          observacoes: formData.observacoes || null
        });
      } else {
        // Novo registro
        result = await adicionarReajusteCargo(
          cargo.id,
          parseFloat(formData.novoSalario),
          formData.dataInicioVigencia,
          formData.motivo,
          formData.percentualReajuste ? parseFloat(formData.percentualReajuste) : undefined,
          formData.observacoes || undefined
        );
      }
      
      if (result.success) {
        await carregarHistorico();
        resetForm();
        onSuccess();
      } else {
        alert(`Erro ao salvar: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao salvar reajuste');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setValidationError(null);
    setFormData({
      novoSalario: '',
      dataInicioVigencia: new Date().toISOString().split('T')[0],
      motivo: 'Dissídio coletivo',
      percentualReajuste: '',
      observacoes: ''
    });
  };

  const handleEdit = (item: HistoricoSalarioCargo) => {
    setEditingId(item.id);
    setFormData({
      novoSalario: String(item.salario_base),
      dataInicioVigencia: item.data_inicio_vigencia,
      motivo: item.motivo,
      percentualReajuste: item.percentual_reajuste ? String(item.percentual_reajuste) : '',
      observacoes: item.observacoes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (item: HistoricoSalarioCargo) => {
    if (!cargo) return;
    
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o registro de ${formatCurrency(Number(item.salario_base))} (${formatDate(item.data_inicio_vigencia)})?`
    );
    
    if (!confirmacao) return;
    
    setDeletingId(item.id);
    try {
      const result = await excluirReajusteCargo(item.id, cargo.id);
      
      if (result.success) {
        await carregarHistorico();
        onSuccess();
      } else {
        alert(`Erro ao excluir: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao excluir registro');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  if (!isOpen || !cargo) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Histórico de Salários</h2>
              <p className="text-sm text-gray-500">{cargo.nome_cargo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Salário Atual - baseado no registro mais recente do histórico */}
          {(() => {
            // Encontrar o salário vigente mais recente (por data de início de vigência)
            const salarioAtual = historico.length > 0 
              ? Number(historico[0].salario_base) // historico já vem ordenado por data desc
              : cargo.salario_base;
            
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Salário Base Atual</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(salarioAtual)}</p>
                  </div>
                  <Button
                    onClick={() => {
                      if (showForm) {
                        resetForm();
                      } else {
                        setShowForm(true);
                      }
                    }}
                    variant={showForm ? 'secondary' : 'primary'}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {showForm ? 'Cancelar' : 'Novo Reajuste'}
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Form de Reajuste */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Editar Registro' : 'Registrar Salário / Reajuste'}
              </h3>
              <p className="text-sm text-gray-500">
                {editingId 
                  ? 'Atualize os dados do registro selecionado.'
                  : 'Você pode inserir salários de períodos anteriores para manter um histórico completo.'}
              </p>
              
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  ⚠️ {validationError}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Novo Salário (R$)"
                  type="number"
                  step="0.01"
                  value={formData.novoSalario}
                  onChange={handleSalarioChange}
                  required
                  icon={<DollarSign className="w-5 h-5 text-gray-400" />}
                />
                
                <Input
                  label="Percentual de Reajuste (%)"
                  type="number"
                  step="0.01"
                  value={formData.percentualReajuste}
                  onChange={handlePercentualChange}
                  icon={<Percent className="w-5 h-5 text-gray-400" />}
                />
                
                <div>
                  <Input
                    label="Data de Início da Vigência"
                    type="date"
                    value={formData.dataInicioVigencia}
                    onChange={handleDataChange}
                    required
                    icon={<Calendar className="w-5 h-5 text-gray-400" />}
                  />
                  {formData.dataInicioVigencia && (
                    <p className="text-xs text-gray-500 mt-1">
                      Referência: {formatCurrency(getSalarioReferenciaPorData(formData.dataInicioVigencia))}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <select
                    value={formData.motivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="Dissídio coletivo">Dissídio coletivo</option>
                    <option value="Promoção">Promoção</option>
                    <option value="Reajuste espontâneo">Reajuste espontâneo</option>
                    <option value="Correção de piso">Correção de piso</option>
                    <option value="Acordo coletivo">Acordo coletivo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Observações (opcional)
                  </span>
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Observações adicionais sobre o reajuste..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : (editingId ? 'Atualizar' : 'Salvar Reajuste')}
                </Button>
              </div>
            </form>
          )}

          {/* Histórico */}
          <div>
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Reajustes
            </h3>
            
            {loading ? (
              <p className="text-gray-500 text-center py-4">Carregando histórico...</p>
            ) : historico.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum histórico de reajuste registrado.</p>
                <p className="text-sm">Clique em "Novo Reajuste" para adicionar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((item, index) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 ${
                      index === 0 ? 'bg-green-50 border-green-200' : 'bg-white'
                    } ${editingId === item.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          index === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <div>
                          <p className="font-semibold text-gray-800">
                            {formatCurrency(Number(item.salario_base))}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(item.data_inicio_vigencia)}
                            {item.data_fim_vigencia && ` até ${formatDate(item.data_fim_vigencia)}`}
                            {!item.data_fim_vigencia && index === 0 && (
                              <span className="ml-2 text-green-600 font-medium">(Vigente)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          {item.percentual_reajuste && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              Number(item.percentual_reajuste) > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {Number(item.percentual_reajuste) > 0 ? '+' : ''}
                              {Number(item.percentual_reajuste).toFixed(2)}%
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{item.motivo}</p>
                        </div>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar registro"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.observacoes && (
                      <p className="text-xs text-gray-500 mt-2 pl-5 border-l-2 border-gray-200">
                        {item.observacoes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricoSalarioCargoModal;
