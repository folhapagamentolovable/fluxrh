import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DateInput from '../../components/ui/DateInput';
import { useFeriados } from '../../hooks/useSupabase';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { Calendar, Flag, ChevronUp, ChevronDown } from 'lucide-react';

const Holidays: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: feriados, loading, error, insert, update, remove } = useFeriados();
    const [formData, setFormData] = React.useState({
        data_feriado: '',
        nome_feriado: '',
        dia_semana: '',
        tipo_feriado: 'nacional' as 'nacional' | 'estadual' | 'municipal',
        cidade: '',
        estado: '',
    });
    const [editingId, setEditingId] = React.useState<string | null>(null);
    
    // Estados para ordenação
    const [sortField, setSortField] = React.useState<string>('data_feriado');
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
    const sortedFeriados = React.useMemo(() => {
        if (!feriados) return [];
        
        return [...feriados].sort((a, b) => {
            let aValue = (a as Record<string, any>)[sortField];
            let bValue = (b as Record<string, any>)[sortField];
            
            // Tratar valores nulos/undefined
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            // Para campos de data
            if (sortField === 'data_feriado') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
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
    }, [feriados, sortField, sortDirection]);

    // Função para calcular o dia da semana
    const getDiaSemana = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return diasSemana[date.getDay()];
    };
    const [submitting, setSubmitting] = React.useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        // Se mudou a data, calcular automaticamente o dia da semana
        if (name === 'data_feriado') {
            const diaSemana = getDiaSemana(value);
            setFormData(prev => ({ ...prev, [name]: value, dia_semana: diaSemana }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        let result;
        if (editingId) {
            result = await update(editingId, formData);
        } else {
            result = await insert(formData);
        }

        if (result.success) {
            setFormData({
                data_feriado: '',
                nome_feriado: '',
                dia_semana: '',
                tipo_feriado: 'nacional',
                cidade: '',
                estado: '',
            });
            setEditingId(null);
            showToast(editingId ? 'Feriado atualizado com sucesso!' : 'Feriado cadastrado com sucesso!', 'success');
        } else {
            showToast(`Erro ao ${editingId ? 'atualizar' : 'cadastrar'} feriado: ${result.error}`, 'error');
        }

        setSubmitting(false);
    };

    const handleEdit = (feriado: any) => {
        setFormData({
            data_feriado: feriado.data_feriado,
            nome_feriado: feriado.nome_feriado,
            dia_semana: feriado.dia_semana || getDiaSemana(feriado.data_feriado),
            tipo_feriado: feriado.tipo_feriado,
            cidade: feriado.cidade || '',
            estado: feriado.estado || '',
        });
        setEditingId(feriado.id);
        globalThis.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, nome: string) => {
        if (!globalThis.confirm(`Deseja realmente excluir o feriado "${nome}"?`)) {
            return;
        }

        const result = await remove(id);
        if (result.success) {
            showToast('Feriado excluído com sucesso!', 'success');
        } else {
            showToast(`Erro ao excluir feriado: ${result.error}`, 'error');
        }
    };

    const handleCancel = () => {
        setFormData({
            data_feriado: '',
            nome_feriado: '',
            dia_semana: '',
            tipo_feriado: 'nacional',
            cidade: '',
            estado: '',
        });
        setEditingId(null);
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Feriados</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {canShowForm() && (
            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">
                    {editingId ? 'Editar Feriado' : 'Cadastrar Novo Feriado'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <DateInput
                        label="Data"
                        name="data_feriado"
                        value={formData.data_feriado}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Dia da Semana"
                        name="dia_semana"
                        value={formData.dia_semana}
                        onChange={handleInputChange}
                        placeholder="Calculado automaticamente"
                        disabled
                        className="bg-gray-100"
                    />
                    <Input
                        label="Nome do Feriado"
                        name="nome_feriado"
                        value={formData.nome_feriado}
                        onChange={handleInputChange}
                        placeholder="Ex: Confraternização Universal"
                        required
                        className="sm:col-span-2"
                        icon={<Flag className="w-5 h-5 text-gray-400" />}
                    />
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Feriado</label>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                            <div className="flex items-center">
                                <input id="nacional" name="tipo_feriado" type="radio" value="nacional"
                                    checked={formData.tipo_feriado === 'nacional'} onChange={handleInputChange}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" />
                                <label htmlFor="nacional" className="ml-2 block text-sm text-gray-900">Nacional</label>
                            </div>
                            <div className="flex items-center">
                                <input id="estadual" name="tipo_feriado" type="radio" value="estadual"
                                    checked={formData.tipo_feriado === 'estadual'} onChange={handleInputChange}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" />
                                <label htmlFor="estadual" className="ml-2 block text-sm text-gray-900">Estadual</label>
                            </div>
                            <div className="flex items-center">
                                <input id="municipal" name="tipo_feriado" type="radio" value="municipal"
                                    checked={formData.tipo_feriado === 'municipal'} onChange={handleInputChange}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" />
                                <label htmlFor="municipal" className="ml-2 block text-sm text-gray-900">Municipal</label>
                            </div>
                        </div>
                    </div>

                    {/* Campos de localidade — aparecem para estadual e municipal */}
                    {(formData.tipo_feriado === 'estadual' || formData.tipo_feriado === 'municipal') && (
                        <>
                            <Input
                                label="Estado (UF) *"
                                name="estado"
                                value={formData.estado}
                                onChange={handleInputChange}
                                placeholder="Ex: SP"
                                maxLength={2}
                                required
                            />
                            {formData.tipo_feriado === 'municipal' && (
                                <Input
                                    label="Cidade *"
                                    name="cidade"
                                    value={formData.cidade}
                                    onChange={handleInputChange}
                                    placeholder="Ex: Campinas"
                                    required
                                />
                            )}
                        </>
                    )}
                    <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                        <Button type="button" variant="secondary" onClick={handleCancel} className="w-full sm:w-auto">
                            {editingId ? 'Cancelar Edição' : 'Cancelar'}
                        </Button>
                        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                            {submitting ? 'Salvando...' : editingId ? 'Atualizar Feriado' : 'Salvar Feriado'}
                        </Button>
                    </div>
                </form>
            </Card>
            )}

            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Feriados Cadastrados</h2>
                {loading ? (
                    <p>Carregando feriados...</p>
                ) : feriados.length === 0 ? (
                    <p className="text-gray-500">Nenhum feriado cadastrado ainda.</p>
                ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('data_feriado')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Data
                                            {sortField === 'data_feriado' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('dia_semana')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Dia da Semana
                                            {sortField === 'dia_semana' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_feriado')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nome
                                            {sortField === 'nome_feriado' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('tipo_feriado')}>
                                        <div className="flex items-center gap-1">
                                            Tipo
                                            {sortField === 'tipo_feriado' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                        </div>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                        Localidade
                                    </th>
                                    {canShowActions() && (
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedFeriados.map((feriado) => (
                                    <tr key={feriado.id} className={editingId === feriado.id ? 'bg-blue-50' : ''}>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                            {formatDateForDisplay(feriado.data_feriado)}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                                            {feriado.dia_semana || getDiaSemana(feriado.data_feriado)}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                            {feriado.nome_feriado}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                            <span className={`px-2 py-1 text-xs rounded-full ${feriado.tipo_feriado === 'nacional' ? 'bg-blue-100 text-blue-800' :
                                                feriado.tipo_feriado === 'estadual' ? 'bg-green-100 text-green-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {feriado.tipo_feriado?.charAt(0).toUpperCase() + feriado.tipo_feriado?.slice(1) || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                                            {feriado.tipo_feriado === 'municipal' && feriado.cidade
                                                ? `${feriado.cidade}${feriado.estado ? ` / ${feriado.estado}` : ''}`
                                                : feriado.tipo_feriado === 'estadual' && feriado.estado
                                                    ? feriado.estado
                                                    : feriado.tipo_feriado === 'nacional'
                                                        ? <span className="text-gray-400 italic">Todo o Brasil</span>
                                                        : '—'
                                            }
                                        </td>
                                        {canShowActions() && (
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                            <div className="flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-4">
                                                <button
                                                    onClick={() => handleEdit(feriado)}
                                                    className="text-blue-600 hover:text-blue-900 text-xs"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(feriado.id, feriado.nome_feriado)}
                                                    className="text-red-600 hover:text-red-900 text-xs"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Holidays;