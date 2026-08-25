import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FixedMaskedInput from '../../components/ui/FixedMaskedInput';
import { useEmpresas } from '../../hooks/useSupabase';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { Building2, Hash, MapPin, Map, Navigation, Phone, User, ChevronUp, ChevronDown } from 'lucide-react';

const Companies: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: empresas, loading, error, insert, update, remove } = useEmpresas();
    const [formData, setFormData] = useState({
        nome_empresa: '',
        cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        telefone: '',
        nome_contato: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para ordenação
    const [sortField, setSortField] = useState<string>('nome_empresa');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    const sortedEmpresas = React.useMemo(() => {
        if (!empresas) return [];
        
        return [...empresas].sort((a, b) => {
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
    }, [empresas, sortField, sortDirection]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações básicas
        if (!formData.nome_empresa.trim()) {
            showToast('Nome da empresa é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        if (!formData.cnpj.trim()) {
            showToast('CNPJ é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        // Log dos dados que serão enviados

        const result = await insert(formData);
        
        if (result.success) {
            // Limpar formulário
            setFormData({
                nome_empresa: '',
                cnpj: '',
                endereco: '',
                cidade: '',
                estado: '',
                telefone: '',
                nome_contato: ''
            });
            showToast('Empresa cadastrada com sucesso!', 'success');
        } else {
            showToast(`Erro ao cadastrar empresa: ${result.error}`, 'error');
        }
        
        setSubmitting(false);
    };

    const handleCancel = () => {
        setFormData({
            nome_empresa: '',
            cnpj: '',
            endereco: '',
            cidade: '',
            estado: '',
            telefone: '',
            nome_contato: ''
        });
    };

    const handleEdit = (empresa: any) => {
        setFormData({
            nome_empresa: empresa.nome_empresa,
            cnpj: empresa.cnpj,
            endereco: empresa.endereco || '',
            cidade: empresa.cidade || '',
            estado: empresa.estado || '',
            telefone: empresa.telefone || '',
            nome_contato: empresa.nome_contato || ''
        });
        setEditingId(empresa.id);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setFormData({
            nome_empresa: '',
            cnpj: '',
            endereco: '',
            cidade: '',
            estado: '',
            telefone: '',
            nome_contato: ''
        });
        setEditingId(null);
        setIsEditing(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        
        setSubmitting(true);

        // Validações básicas
        if (!formData.nome_empresa.trim()) {
            showToast('Nome da empresa é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        if (!formData.cnpj.trim()) {
            showToast('CNPJ é obrigatório', 'error');
            setSubmitting(false);
            return;
        }


        const result = await update(editingId, formData);
        
        if (result.success) {
            handleCancelEdit();
            showToast('Empresa atualizada com sucesso!', 'error');
        } else {
            showToast(`Erro ao atualizar empresa: ${result.error}`, 'error');
        }
        
        setSubmitting(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Empresas</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    <strong>Erro:</strong> {error}
                    <br />
                    <small>Verifique se as tabelas foram criadas no Supabase usando o arquivo supabase-tables.sql</small>
                </div>
            )}

            {canShowForm() && (
            <Card className="p-3 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">
                    {isEditing ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                </h2>
                <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Input 
                        label="Nome da Empresa" 
                        name="nome_empresa"
                        value={formData.nome_empresa}
                        onChange={handleInputChange}
                        placeholder="Ex: Soluções Inovadoras Ltda." 
                        required
                        icon={<Building2 className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="CNPJ" 
                        name="cnpj"
                        mask="cnpj"
                        value={formData.cnpj}
                        onChange={handleInputChange}
                        placeholder="00.000.000/0001-00" 
                        storeUnmasked={true}
                        required
                        icon={<Hash className="w-5 h-5 text-gray-400" />}
                    />
                    <Input 
                        label="Endereço" 
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleInputChange}
                        placeholder="Rua das Flores, 123"
                        icon={<MapPin className="w-5 h-5 text-gray-400" />}
                    />
                    <Input 
                        label="Cidade" 
                        name="cidade"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        placeholder="São Paulo"
                        icon={<Map className="w-5 h-5 text-gray-400" />}
                    />
                    <Input 
                        label="Estado" 
                        name="estado"
                        value={formData.estado}
                        onChange={handleInputChange}
                        placeholder="SP"
                        icon={<Navigation className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="Telefone" 
                        name="telefone"
                        mask="phone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="(11) 99999-9999" 
                        storeUnmasked={true}
                        icon={<Phone className="w-5 h-5 text-gray-400" />}
                    />
                    <Input 
                        label="Nome do Contato" 
                        name="nome_contato"
                        value={formData.nome_contato}
                        onChange={handleInputChange}
                        placeholder="João da Silva"
                        icon={<User className="w-5 h-5 text-gray-400" />}
                    />
                    <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
                        <Button type="button" variant="secondary" onClick={isEditing ? handleCancelEdit : handleCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : (isEditing ? 'Atualizar Empresa' : 'Salvar Empresa')}
                        </Button>
                    </div>
                </form>
            </Card>
            )}

            <Card className="p-3 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Empresas Cadastradas</h2>
                {loading ? (
                    <p className="text-sm">Carregando empresas...</p>
                ) : empresas.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhuma empresa cadastrada ainda.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_empresa')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nome
                                            {sortField === 'nome_empresa' && (
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
                                    {canShowActions() && (
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedEmpresas.map((empresa) => (
                                    <tr key={empresa.id} className={editingId === empresa.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">
                                            <div>
                                                <span className="block">{empresa.nome_empresa}</span>
                                                <span className="block sm:hidden text-xs text-gray-500">{empresa.cnpj}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 hidden sm:table-cell">
                                            {empresa.cnpj}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 hidden md:table-cell">
                                            {empresa.cidade}, {empresa.estado}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 hidden lg:table-cell">
                                            {empresa.nome_contato}
                                        </td>
                                        {canShowActions() && (
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => handleEdit(empresa)}
                                                    disabled={isEditing}
                                                    className="text-xs px-2 sm:px-3 py-1"
                                                >
                                                    ✏️ <span className="hidden sm:inline">Editar</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (window.confirm(`Tem certeza que deseja excluir a empresa "${empresa.nome_empresa}"?`)) {
                                                            const result = await remove(empresa.id);
                                                            if (result.success) {
                                                                showToast('Empresa excluída com sucesso!', 'success');
                                                            } else {
                                                                showToast(`Erro ao excluir empresa: ${result.error}`, 'error');
                                                            }
                                                        }
                                                    }}
                                                    disabled={isEditing}
                                                    className="text-xs px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    🗑️ <span className="hidden sm:inline">Excluir</span>
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

export default Companies;
