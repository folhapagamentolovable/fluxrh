import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCargosCompletos } from '../../hooks/useSupabase';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { Briefcase, Hash, DollarSign, ChevronUp, ChevronDown, History, TrendingUp, Calendar } from 'lucide-react';
import HistoricoSalarioCargoModal from '../../components/HistoricoSalarioCargoModal';
import RelatorioEvolucaoSalarial from '../../components/RelatorioEvolucaoSalarial';
import { adicionarReajusteCargo } from '../../hooks/useSalarioCargo';

const Positions: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: cargos, loading, error, insert, update, remove } = useCargosCompletos();
    const [regrasEscalas, setRegrasEscalas] = React.useState<any[]>([]);

    // Carregar regras de escalas
    React.useEffect(() => {
        const carregarRegrasEscalas = async () => {
            const { data, error } = await supabase
                .from('regras_escalas')
                .select('id, codigo_escala, nome_escala')
                .eq('ativa', true)
                .order('codigo_escala');
            
            if (!error && data) {
                setRegrasEscalas(data);
            }
        };
        carregarRegrasEscalas();
    }, []);
    const [formData, setFormData] = React.useState({
        nome_cargo: '',
        cbo: '',
        escala_id: '',
        salario_base: '',
        data_vigencia: new Date().toISOString().split('T')[0]
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editData, setEditData] = React.useState<{ [key: string]: any }>({});
    const [salarioOriginal, setSalarioOriginal] = React.useState<number | null>(null);
    
    // Estado para modal de histórico de salários
    const [historicoModalCargo, setHistoricoModalCargo] = React.useState<any>(null);
    const [showRelatorioEvolucao, setShowRelatorioEvolucao] = React.useState(false);
    
    // Estados para ordenação
    const [sortField, setSortField] = React.useState<string>('nome_cargo');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

    // Função para lidar com ordenação
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Função para ordenar os dados
    const sortedCargos = React.useMemo(() => {
        if (!cargos) return [];
        
        return [...cargos].sort((a, b) => {
            let aValue = (a as Record<string, any>)[sortField];
            let bValue = (b as Record<string, any>)[sortField];
            
            // Tratar valores nulos/undefined
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            // Para campos numéricos como salario_base
            if (sortField === 'salario_base') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            // Converter para string para comparação
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            
            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }, [cargos, sortField, sortDirection]);

    // Função para formatar valor monetário
    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        });
    };

    // Função para aplicar máscara CBO (0000-00)
    const applyCBOMask = (value: string): string => {
        // Remove tudo que não é número
        const cleaned = value.replace(/\D/g, '');
        
        // Aplica a máscara 0000-00
        if (cleaned.length <= 4) {
            return cleaned;
        } else {
            return cleaned.substring(0, 4) + '-' + cleaned.substring(4, 6);
        }
    };

    // Função para remover máscara CBO (para salvar no banco)
    const removeCBOMask = (value: string): string => {
        return value.replace(/\D/g, '');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Aplicar máscara CBO
        if (name === 'cbo') {
            const maskedValue = applyCBOMask(value);
            setFormData(prev => ({ ...prev, [name]: maskedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const salarioNumerico = Number.parseFloat(formData.salario_base);
        
        const dataToSubmit = {
            nome_cargo: formData.nome_cargo,
            cbo: formData.cbo ? removeCBOMask(formData.cbo) : undefined,
            salario_base: salarioNumerico,
            escala_id: formData.escala_id || undefined
        };

        const result = await insert(dataToSubmit);

        if (result.success && result.data) {
            // Criar registro inicial no histórico de salários
            const cargoId = result.data.id;
            await adicionarReajusteCargo(
                cargoId,
                salarioNumerico,
                formData.data_vigencia,
                'Salário inicial'
            );
            
            setFormData({
                nome_cargo: '',
                cbo: '',
                escala_id: '',
                salario_base: '',
                data_vigencia: new Date().toISOString().split('T')[0]
            });
            showToast('Cargo cadastrado com sucesso!', 'success');
        } else {
            showToast(`Erro ao cadastrar cargo: ${result.error}`, 'error');
        }

        setSubmitting(false);
    };

    const handleCancel = () => {
        setFormData({
            nome_cargo: '',
            cbo: '',
            escala_id: '',
            salario_base: '',
            data_vigencia: new Date().toISOString().split('T')[0]
        });
    };

    const handleEdit = (cargo: any) => {
        setEditingId(cargo.id);
        setSalarioOriginal(cargo.salario_base);
        setEditData({
            nome_cargo: cargo.nome_cargo,
            cbo: cargo.cbo ? applyCBOMask(cargo.cbo) : '',
            escala_id: cargo.escala_id || '',
            salario_base: cargo.salario_base.toString(),
            data_vigencia: new Date().toISOString().split('T')[0]
        });
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Aplicar máscara CBO durante edição
        if (name === 'cbo') {
            const maskedValue = applyCBOMask(value);
            setEditData(prev => ({ ...prev, [name]: maskedValue }));
        } else {
            setEditData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveEdit = async (id: string) => {
        setSubmitting(true);

        try {
            const novoSalario = Number.parseFloat(editData.salario_base);
            const salarioMudou = salarioOriginal !== null && Math.abs(novoSalario - salarioOriginal) > 0.01;
            
            // Se o salário mudou, registrar no histórico
            if (salarioMudou) {
                const percentualReajuste = salarioOriginal ? ((novoSalario - salarioOriginal) / salarioOriginal) * 100 : 0;
                
                const resultHistorico = await adicionarReajusteCargo(
                    id,
                    novoSalario,
                    editData.data_vigencia,
                    'Reajuste salarial',
                    percentualReajuste
                );
                
                if (!resultHistorico.success) {
                    showToast(`Erro ao registrar histórico: ${resultHistorico.error}`, 'error');
                    setSubmitting(false);
                    return;
                }
            }
            
            const dataToUpdate = {
                nome_cargo: editData.nome_cargo,
                cbo: editData.cbo ? removeCBOMask(editData.cbo) : undefined,
                escala_id: editData.escala_id || undefined,
                salario_base: novoSalario
            };

            const result = await update(id, dataToUpdate);

            if (result.success) {
                setEditingId(null);
                setEditData({});
                setSalarioOriginal(null);
                showToast(salarioMudou ? 'Cargo atualizado e histórico registrado!' : 'Cargo atualizado com sucesso!', 'success');
            } else {
                showToast(`Erro ao atualizar cargo: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Erro inesperado ao atualizar cargo', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
        setSalarioOriginal(null);
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Cargos</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {canShowForm() && (
            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Cadastrar Novo Cargo</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Input
                        label="Nome do Cargo"
                        name="nome_cargo"
                        value={formData.nome_cargo}
                        onChange={handleInputChange}
                        placeholder="Ex: Auxiliar de Limpeza 'Posto' T1"
                        required
                        icon={<Briefcase className="w-5 h-5 text-gray-400" />}
                    />
                    <Input
                        label="CBO"
                        name="cbo"
                        value={formData.cbo}
                        onChange={handleInputChange}
                        placeholder="0000-00"
                        maxLength={7}
                        icon={<Hash className="w-5 h-5 text-gray-400" />}
                    />
                    <Select
                        label="Escala"
                        name="escala_id"
                        value={formData.escala_id}
                        onChange={handleInputChange}
                    >
                        <option value="">Selecione uma escala</option>
                        {regrasEscalas.map(regra => (
                            <option key={regra.id} value={regra.id}>
                                {regra.codigo_escala} - {regra.nome_escala}
                            </option>
                        ))}
                    </Select>
                    <Input
                        label="Salário Base"
                        name="salario_base"
                        type="number"
                        step="0.01"
                        value={formData.salario_base}
                        onChange={handleInputChange}
                        placeholder="3500.00"
                        required
                        icon={<DollarSign className="w-5 h-5 text-gray-400" />}
                    />
                    <Input
                        label="Início da Vigência"
                        name="data_vigencia"
                        type="date"
                        value={formData.data_vigencia}
                        onChange={handleInputChange}
                        required
                        icon={<Calendar className="w-5 h-5 text-gray-400" />}
                    />
                    <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                        <Button type="button" variant="secondary" onClick={handleCancel} className="w-full sm:w-auto">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                            {submitting ? 'Salvando...' : 'Salvar Cargo'}
                        </Button>
                    </div>
                </form>
            </Card>
            )}

            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold">Cargos Cadastrados</h2>
                    <Button
                        onClick={() => setShowRelatorioEvolucao(true)}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Relatório de Evolução Salarial
                    </Button>
                </div>
                {loading ? (
                    <p>Carregando cargos...</p>
                ) : cargos.length === 0 ? (
                    <p className="text-gray-500">Nenhum cargo cadastrado ainda.</p>
                ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_cargo')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nome
                                            {sortField === 'nome_cargo' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('cbo')}
                                    >
                                        <div className="flex items-center gap-1">
                                            CBO
                                            {sortField === 'cbo' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                        Escala
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('salario_base')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Salário
                                            {sortField === 'salario_base' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    {canShowActions() && (
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedCargos.map((cargo) => (
                                    <tr key={cargo.id}>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                            {editingId === cargo.id ? (
                                                <input
                                                    type="text"
                                                    name="nome_cargo"
                                                    value={editData.nome_cargo || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                />
                                            ) : (
                                                <span className="block truncate max-w-[120px] sm:max-w-none">{cargo.nome_cargo}</span>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                            {editingId === cargo.id ? (
                                                <input
                                                    type="text"
                                                    name="cbo"
                                                    value={editData.cbo || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                    placeholder="0000-00"
                                                    maxLength={7}
                                                />
                                            ) : (
                                                cargo.cbo ? applyCBOMask(cargo.cbo) : '-'
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                                            {editingId === cargo.id ? (
                                                <select
                                                    name="escala_id"
                                                    value={editData.escala_id || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {regrasEscalas.map(regra => (
                                                        <option key={regra.id} value={regra.id}>
                                                            {regra.codigo_escala}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                cargo.escala?.codigo_escala || '-'
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                            {editingId === cargo.id ? (
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        name="salario_base"
                                                        value={editData.salario_base || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                        placeholder="3500.00"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-gray-400" />
                                                        <input
                                                            type="date"
                                                            name="data_vigencia"
                                                            value={editData.data_vigencia || ''}
                                                            onChange={handleEditChange}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                            title="Data de vigência do novo salário"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                formatCurrency(cargo.salario_base)
                                            )}
                                        </td>
                                        {canShowActions() && (
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                            {editingId === cargo.id ? (
                                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleSaveEdit(cargo.id)}
                                                        disabled={submitting}
                                                        className="text-xs px-2 py-1 w-full sm:w-auto"
                                                    >
                                                        {submitting ? '...' : 'Salvar'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={handleCancelEdit}
                                                        className="text-xs px-2 py-1 w-full sm:w-auto"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => setHistoricoModalCargo(cargo)}
                                                        className="text-xs px-2 py-1 w-full sm:w-auto"
                                                        title="Histórico de Salários"
                                                    >
                                                        <History className="w-3 h-3 sm:mr-1" />
                                                        <span className="hidden sm:inline">Salários</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => handleEdit(cargo)}
                                                        className="text-xs px-2 py-1 w-full sm:w-auto"
                                                    >
                                                        <span className="sm:hidden">✏️</span>
                                                        <span className="hidden sm:inline">✏️ Editar</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (globalThis.confirm(`Tem certeza que deseja excluir o cargo "${cargo.nome_cargo}"?`)) {
                                                                const result = await remove(cargo.id);
                                                                if (result.success) {
                                                                    showToast('Cargo excluído com sucesso!', 'success');
                                                                } else {
                                                                    showToast(`Erro ao excluir cargo: ${result.error}`, 'error');
                                                                }
                                                            }
                                                        }}
                                                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                                                    >
                                                        <span className="sm:hidden">🗑️</span>
                                                        <span className="hidden sm:inline">🗑️ Excluir</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal de Histórico de Salários */}
            <HistoricoSalarioCargoModal
                cargo={historicoModalCargo}
                isOpen={!!historicoModalCargo}
                onClose={() => setHistoricoModalCargo(null)}
                onSuccess={() => {
                    showToast('Reajuste registrado com sucesso!', 'success');
                }}
            />

            {/* Relatório de Evolução Salarial */}
            <RelatorioEvolucaoSalarial
                isOpen={showRelatorioEvolucao}
                onClose={() => setShowRelatorioEvolucao(false)}
            />
        </div>
    );
};

export default Positions;