import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FixedMaskedInput from '../../components/ui/FixedMaskedInput';
import { usePostosTrabalho, useEmpresas } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import Select from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { Building, Hash, MapPin, Map, Navigation, Phone, User, DollarSign, ChevronUp, ChevronDown, Power } from 'lucide-react';

const Workstations: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: postos, loading, error, insert, update, remove } = usePostosTrabalho();
    const { data: empresas } = useEmpresas();
    const [formData, setFormData] = React.useState({
        nome_posto: '',
        cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        telefone: '',
        nome_contato: '',
        valor_contrato: '',
        empresa_id: ''
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    
    // Estados para ordenação
    const [sortField, setSortField] = React.useState<string>('nome_posto');
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
    const sortedPostos = React.useMemo(() => {
        if (!postos) return [];
        
        return [...postos].sort((a, b) => {
            let aValue = (a as Record<string, any>)[sortField];
            let bValue = (b as Record<string, any>)[sortField];
            
            // Tratar valores nulos/undefined
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            // Converter para string para comparação
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            
            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }, [postos, sortField, sortDirection]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Converter valor_contrato para número
        const dataToSubmit = {
            nome_posto: formData.nome_posto,
            cnpj: formData.cnpj,
            endereco: formData.endereco,
            cidade: formData.cidade,
            estado: formData.estado,
            telefone: formData.telefone,
            nome_contato: formData.nome_contato,
            valor_contrato: formData.valor_contrato ? Number.parseFloat(formData.valor_contrato) : undefined,
            // Só inclui empresa_id se foi selecionada uma empresa
            ...(formData.empresa_id && { empresa_id: formData.empresa_id })
        };

        const result = await insert(dataToSubmit);

        if (result.success) {
            setFormData({
                nome_posto: '',
                cnpj: '',
                endereco: '',
                cidade: '',
                estado: '',
                telefone: '',
                nome_contato: '',
                valor_contrato: '',
                empresa_id: ''
            });
            showToast('Posto de trabalho cadastrado com sucesso!', 'success');
        } else {
            showToast(`Erro ao cadastrar posto: ${result.error}`, 'error');
        }

        setSubmitting(false);
    };

    const handleEdit = (posto: any) => {
        setFormData({
            nome_posto: posto.nome_posto,
            cnpj: posto.cnpj,
            endereco: posto.endereco || '',
            cidade: posto.cidade || '',
            estado: posto.estado || '',
            telefone: posto.telefone || '',
            nome_contato: posto.nome_contato || '',
            valor_contrato: posto.valor_contrato ? posto.valor_contrato.toString() : '',
            empresa_id: posto.empresa_id || ''
        });
        setEditingId(posto.id);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setFormData({
            nome_posto: '',
            cnpj: '',
            endereco: '',
            cidade: '',
            estado: '',
            telefone: '',
            nome_contato: '',
            valor_contrato: '',
            empresa_id: ''
        });
        setEditingId(null);
        setIsEditing(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        
        setSubmitting(true);

        // Validações básicas
        if (!formData.nome_posto.trim()) {
            showToast('Nome do posto é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        if (!formData.empresa_id) {
            showToast('Empresa é obrigatória', 'error');
            setSubmitting(false);
            return;
        }

        // Converter valor_contrato para número
        const dataToSubmit = {
            nome_posto: formData.nome_posto,
            cnpj: formData.cnpj,
            endereco: formData.endereco,
            cidade: formData.cidade,
            estado: formData.estado,
            telefone: formData.telefone,
            nome_contato: formData.nome_contato,
            valor_contrato: formData.valor_contrato ? Number.parseFloat(formData.valor_contrato) : undefined,
            // Só inclui empresa_id se foi selecionada uma empresa
            ...(formData.empresa_id && { empresa_id: formData.empresa_id })
        };


        const result = await update(editingId, dataToSubmit);
        
        if (result.success) {
            handleCancelEdit();
            showToast('Posto de trabalho atualizado com sucesso!', 'success');
        } else {
            showToast(`Erro ao atualizar posto: ${result.error}`, 'error');
        }
        
        setSubmitting(false);
    };

    const handleCancel = () => {
        setFormData({
            nome_posto: '',
            cnpj: '',
            endereco: '',
            cidade: '',
            estado: '',
            telefone: '',
            nome_contato: '',
            valor_contrato: '',
            empresa_id: ''
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Postos de Trabalho</h1>
            {canShowForm() && (
            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">
                    {isEditing ? 'Editar Posto de Trabalho' : 'Cadastrar Novo Posto de Trabalho'}
                </h2>
                <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Select 
                        label="Empresa Contratante" 
                        name="empresa_id"
                        value={formData.empresa_id}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Selecione uma empresa</option>
                        {empresas.map(empresa => (
                            <option key={empresa.id} value={empresa.id}>
                                {empresa.nome_empresa}
                            </option>
                        ))}
                    </Select>
                    
                    <Input
                        label="Nome do Posto"
                        name="nome_posto"
                        value={formData.nome_posto}
                        onChange={handleInputChange}
                        placeholder="Ex: Edifício Central"
                        required
                        icon={<Building className="w-5 h-5 text-gray-400" />}
                    />

                    <FixedMaskedInput
                        label="CNPJ"
                        name="cnpj"
                        mask="cnpj"
                        value={formData.cnpj}
                        onChange={handleInputChange}
                        placeholder="00.000.000/0001-00"
                        storeUnmasked={true}
                        icon={<Hash className="w-5 h-5 text-gray-400" />}
                    />

                    <Input
                        label="Endereço"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleInputChange}
                        placeholder="Av. Principal, 456"
                        icon={<MapPin className="w-5 h-5 text-gray-400" />}
                    />

                    <Input
                        label="Cidade"
                        name="cidade"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        placeholder="Rio de Janeiro"
                        icon={<Map className="w-5 h-5 text-gray-400" />}
                    />

                    <Input
                        label="Estado"
                        name="estado"
                        value={formData.estado}
                        onChange={handleInputChange}
                        placeholder="RJ"
                        icon={<Navigation className="w-5 h-5 text-gray-400" />}
                    />

                    <FixedMaskedInput
                        label="Telefone"
                        name="telefone"
                        mask="phone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="(21) 98888-8888"
                        storeUnmasked={true}
                        icon={<Phone className="w-5 h-5 text-gray-400" />}
                    />

                    <Input
                        label="Nome do Contato"
                        name="nome_contato"
                        value={formData.nome_contato}
                        onChange={handleInputChange}
                        placeholder="Maria Santos"
                        icon={<User className="w-5 h-5 text-gray-400" />}
                    />

                    <Input
                        label="Valor do Contrato"
                        name="valor_contrato"
                        type="number"
                        step="0.01"
                        value={formData.valor_contrato}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        icon={<DollarSign className="w-5 h-5 text-gray-400" />}
                    />


                    <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
                        <Button type="button" variant="secondary" onClick={isEditing ? handleCancelEdit : handleCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : (isEditing ? 'Atualizar Posto' : 'Salvar Posto')}
                        </Button>
                    </div>
                </form>
            </Card>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            <Card>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Postos Cadastrados</h2>
                {loading ? (
                    <p>Carregando postos...</p>
                ) : postos.length === 0 ? (
                    <p className="text-gray-500">Nenhum posto cadastrado ainda.</p>
                ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_posto')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nome
                                            {sortField === 'nome_posto' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('cnpj')}
                                    >
                                        <div className="flex items-center gap-1">
                                            CNPJ
                                            {sortField === 'cnpj' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('cidade')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Cidade
                                            {sortField === 'cidade' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_contato')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Contato
                                            {sortField === 'nome_contato' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('valor_contrato')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Valor Contrato
                                            {sortField === 'valor_contrato' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('ativo')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {sortField === 'ativo' && (
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
                                {sortedPostos.map((posto) => (
                                    <tr key={posto.id} className={`${editingId === posto.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''} ${posto.ativo === false ? 'opacity-50' : ''}`}>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                            {posto.nome_posto}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                                            {posto.cnpj}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                            {posto.cidade}, {posto.estado}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                                            {posto.nome_contato}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                            {posto.valor_contrato ? `R$ ${posto.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${posto.ativo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                <Power className="w-3 h-3" />
                                                {posto.ativo !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        {canShowActions() && (
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => handleEdit(posto)}
                                                    disabled={isEditing}
                                                    className="text-xs px-2 sm:px-3 py-1"
                                                >
                                                    <span className="sm:hidden">✏️</span>
                                                    <span className="hidden sm:inline">✏️ Editar</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={async () => {
                                                        const novoStatus = posto.ativo !== false ? false : true;
                                                        const acao = novoStatus ? 'ativar' : 'desativar';
                                                        const msg = novoStatus 
                                                            ? `Deseja ATIVAR o posto "${posto.nome_posto}"?`
                                                            : `Deseja DESATIVAR o posto "${posto.nome_posto}"?\n\nTodos os funcionários alocados serão marcados como INATIVOS.`;
                                                        if (window.confirm(msg)) {
                                                            const result = await update(posto.id, { ativo: novoStatus } as any);
                                                            if (result.success) {
                                                                // Cascata: desativar/ativar funcionários do posto
                                                                const { error: funcErr } = await supabase
                                                                    .from('funcionarios')
                                                                    .update({ ativo: novoStatus })
                                                                    .eq('posto_trabalho_id', posto.id);
                                                                if (funcErr) {
                                                                }
                                                                showToast(`Posto ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                                                            } else {
                                                                showToast(`Erro ao ${acao} posto: ${result.error}`, 'error');
                                                            }
                                                        }
                                                    }}
                                                    disabled={isEditing}
                                                    className={`text-xs px-2 sm:px-3 py-1 ${posto.ativo !== false ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                                                >
                                                    <span className="sm:hidden">{posto.ativo !== false ? '⏸️' : '▶️'}</span>
                                                    <span className="hidden sm:inline">{posto.ativo !== false ? '⏸️ Desativar' : '▶️ Ativar'}</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (window.confirm(`Tem certeza que deseja excluir o posto "${posto.nome_posto}"?`)) {
                                                            const result = await remove(posto.id);
                                                            if (result.success) {
                                                                showToast('Posto excluído com sucesso!', 'success');
                                                            } else {
                                                                showToast(`Erro ao excluir posto: ${result.error}`, 'error');
                                                            }
                                                        }
                                                    }}
                                                    disabled={isEditing}
                                                    className="text-xs px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    <span className="sm:hidden">🗑️</span>
                                                    <span className="hidden sm:inline">🗑️ Excluir</span>
                                                </Button>
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

export default Workstations