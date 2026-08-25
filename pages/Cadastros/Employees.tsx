import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DateInput from '../../components/ui/DateInput';
import FixedMaskedInput from '../../components/ui/FixedMaskedInput';
import Checkbox from '../../components/ui/Checkbox';
import LinkUserModal from '../../components/LinkUserModal';
import { ChevronUp, ChevronDown, ChevronsUpDown, User, CreditCard, FileText, Users, Link2, Mail, Phone, Printer, FileSpreadsheet, X } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useFuncionariosCompletos, useEmpresas, useCargos, usePostosTrabalho } from '../../hooks/useSupabase';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';

// Função para formatar nome: exibe apenas primeiro e segundo nome, ignorando preposições
const formatarNomeAbreviado = (nomeCompleto: string): string => {
    if (!nomeCompleto) return '';
    const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e', 'del', 'di', 'la', 'le', 'van', 'von'];
    const partes = nomeCompleto.trim().split(/\s+/);
    const nomesFiltrados = partes.filter(parte => !preposicoes.includes(parte.toLowerCase()));
    return nomesFiltrados.slice(0, 2).join(' ');
};

const Employees: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: funcionarios, loading, error, insert, update, remove, refetch } = useFuncionariosCompletos();
    const { data: empresas } = useEmpresas();
    const { data: cargos } = useCargos();
    const { data: postos } = usePostosTrabalho();
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
    
    // Estados para ordenação
    const [sortField, setSortField] = React.useState<string>('nome_completo');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

    // Refs para barra de rolagem horizontal sincronizada (topo + base)
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const mainScrollRef = React.useRef<HTMLDivElement>(null);
    const tableRef = React.useRef<HTMLTableElement>(null);
    const syncingRef = React.useRef(false);
    const [tableScrollWidth, setTableScrollWidth] = React.useState(0);

    React.useEffect(() => {
        const update = () => {
            if (tableRef.current) {
                setTableScrollWidth(tableRef.current.scrollWidth);
            }
        };
        update();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        if (ro && tableRef.current) ro.observe(tableRef.current);
        window.addEventListener('resize', update);
        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', update);
        };
    });


    
    const [formData, setFormData] = React.useState({
        nome_completo: '',
        cpf: '',
        email: '',
        telefone: '',
        numero_ctps: '',
        serie_ctps: '',
        data_nascimento: '',
        data_admissao: '',
        quantidade_filhos: '',
        empresa_id: '',
        posto_trabalho_id: '',
        cargo_id: '',
        escala_id: '',
        nome_empresa: '',
        nome_posto: '',
        nome_cargo: '',
        codigo_escala: '',
        recebe_vt: false,
        faixa_vt: 1,
        recebe_seguro_vida: false,
        funcionario_registrado: true,
        adicional_insalubridade: false,
        acumulo_funcao: false,
        recebe_adiantamento_quinzenal: true,
        banco_horas_ativo: false,
        ronda: false,
        ativo: true,
        demitido: false
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editData, setEditData] = React.useState<{[key: string]: any}>({});
    const [linkModalOpen, setLinkModalOpen] = React.useState(false);
    const [selectedFuncionarioForLink, setSelectedFuncionarioForLink] = React.useState<any>(null);

    const handleOpenLinkModal = (funcionario: any) => {
        setSelectedFuncionarioForLink(funcionario);
        setLinkModalOpen(true);
    };

    const handleCloseLinkModal = () => {
        setLinkModalOpen(false);
        setSelectedFuncionarioForLink(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        let updatedData: any = { [name]: value };

        // Atualizar automaticamente os nomes baseados na seleção
        if (name === 'empresa_id') {
            const empresa = empresas.find(emp => emp.id === value);
            updatedData.nome_empresa = empresa?.nome_empresa || '';
        } else if (name === 'posto_trabalho_id') {
            const posto = postos.find(p => p.id === value);
            updatedData.nome_posto = posto?.nome_posto || '';
        } else if (name === 'cargo_id') {
            const cargo = cargos.find(c => c.id === value);
            updatedData.nome_cargo = cargo?.nome_cargo || '';
        } else if (name === 'escala_id') {
            const escala = regrasEscalas.find(esc => esc.id === value);
            updatedData.codigo_escala = escala?.codigo_escala || '';
        }

        setFormData(prev => ({ ...prev, ...updatedData }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Validação básica
            if (!formData.nome_completo || formData.nome_completo.trim() === '') {
                showToast('Nome completo é obrigatório', 'error');
                return;
            }

            // Preparar dados mínimos para inserção
            const dataToSubmit: any = {
                nome_completo: formData.nome_completo.trim(),
                cpf: formData.cpf && formData.cpf.trim() ? formData.cpf.trim() : null,
                quantidade_filhos: formData.quantidade_filhos ? Number.parseInt(formData.quantidade_filhos.toString()) : 0,
                recebe_vt: Boolean(formData.recebe_vt),
                faixa_vt: formData.faixa_vt || 1,
                recebe_seguro_vida: Boolean(formData.recebe_seguro_vida),
                funcionario_registrado: formData.funcionario_registrado !== undefined ? Boolean(formData.funcionario_registrado) : true,
                adicional_insalubridade: Boolean(formData.adicional_insalubridade),
                acumulo_funcao: Boolean(formData.acumulo_funcao),
                banco_horas_ativo: Boolean(formData.banco_horas_ativo),
                ronda: Boolean(formData.ronda),
                ativo: formData.ativo !== undefined ? Boolean(formData.ativo) : true,
                demitido: Boolean(formData.demitido)
            };

            // Campos opcionais - só adicionar se tiverem valor válido
            if (formData.email && formData.email.trim()) {
                dataToSubmit.email = formData.email.trim();
            }
            if (formData.telefone && formData.telefone.trim()) {
                dataToSubmit.telefone = formData.telefone.trim();
            }
            if (formData.numero_ctps && formData.numero_ctps.trim()) {
                dataToSubmit.numero_ctps = formData.numero_ctps;
            }
            if (formData.serie_ctps && formData.serie_ctps.trim()) {
                dataToSubmit.serie_ctps = formData.serie_ctps;
            }
            if (formData.data_nascimento && formData.data_nascimento.trim()) {
                dataToSubmit.data_nascimento = formData.data_nascimento;
            }
            if (formData.data_admissao && formData.data_admissao.trim()) {
                dataToSubmit.data_admissao = formData.data_admissao;
            }
            
            // IDs de relacionamento - só se tiverem valor
            if (formData.empresa_id) {
                dataToSubmit.empresa_id = formData.empresa_id;
            }
            if (formData.posto_trabalho_id) {
                dataToSubmit.posto_trabalho_id = formData.posto_trabalho_id;
            }
            if (formData.cargo_id) {
                dataToSubmit.cargo_id = formData.cargo_id;
            }


            const result = await insert(dataToSubmit);
        
            if (result.success) {
                setFormData({
                    nome_completo: '',
                    cpf: '',
                    email: '',
                    telefone: '',
                    numero_ctps: '',
                    serie_ctps: '',
                    data_nascimento: '',
                    data_admissao: '',
                    quantidade_filhos: '',
                    empresa_id: '',
                    posto_trabalho_id: '',
                    cargo_id: '',
                    escala_id: '',
                    nome_empresa: '',
                    nome_posto: '',
                    nome_cargo: '',
                    codigo_escala: '',
                    recebe_vt: false,
                    faixa_vt: 1,
                    recebe_seguro_vida: false,
                    funcionario_registrado: true,
                    adicional_insalubridade: false,
                    acumulo_funcao: false,
                    recebe_adiantamento_quinzenal: true,
                    banco_horas_ativo: false,
                    ronda: false,
                    ativo: true,
                    demitido: false
                });
                showToast('Funcionário cadastrado com sucesso!', 'error');
            } else {
                
                // Tratamento específico para erros comuns
                let errorMessage = 'Erro ao cadastrar funcionário';
                if (result.error && typeof result.error === 'string') {
                    if (result.error.includes('duplicate') || result.error.includes('unique')) {
                        if (result.error.includes('cpf')) {
                            errorMessage = 'CPF já cadastrado no sistema';
                        } else {
                            errorMessage = 'Dados duplicados - verifique se o funcionário já existe';
                        }
                    } else {
                        errorMessage = `Erro: ${result.error}`;
                    }
                }
                
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            
            let errorMessage = 'Erro inesperado ao cadastrar funcionário';
            if (error instanceof Error) {
                errorMessage = `Erro: ${error.message}`;
            }
            
            showToast(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            nome_completo: '',
            cpf: '',
            email: '',
            telefone: '',
            numero_ctps: '',
            serie_ctps: '',
            data_nascimento: '',
            data_admissao: '',
            quantidade_filhos: '',
            empresa_id: '',
            posto_trabalho_id: '',
            cargo_id: '',
            escala_id: '',
            nome_empresa: '',
            nome_posto: '',
            nome_cargo: '',
            codigo_escala: '',
            recebe_vt: false,
            faixa_vt: 1,
            recebe_seguro_vida: false,
            funcionario_registrado: true,
            adicional_insalubridade: false,
            acumulo_funcao: false,
            recebe_adiantamento_quinzenal: true,
            banco_horas_ativo: false,
            ronda: false,
            ativo: true,
            demitido: false
        });
    };

    const handleEdit = (funcionario: any) => {
        setEditingId(funcionario.id);
        setEditData({
            nome_completo: funcionario.nome_completo,
            cpf: funcionario.cpf,
            email: funcionario.email || '',
            telefone: funcionario.telefone || '',
            numero_ctps: funcionario.numero_ctps || '',
            serie_ctps: funcionario.serie_ctps || '',
            data_nascimento: funcionario.data_nascimento || '',
            data_admissao: funcionario.data_admissao || '',
            quantidade_filhos: funcionario.quantidade_filhos || 0,
            empresa_id: funcionario.empresa_id || '',
            posto_trabalho_id: funcionario.posto_trabalho_id || '',
            cargo_id: funcionario.cargo_id || '',
            escala_id: funcionario.cargo?.escala_id || funcionario.escala_id || '',
            nome_empresa: funcionario.empresa?.nome_empresa || funcionario.nome_empresa || '',
            nome_posto: funcionario.posto_trabalho?.nome_posto || funcionario.nome_posto || '',
            nome_cargo: funcionario.cargo?.nome_cargo || funcionario.nome_cargo || '',
            codigo_escala: funcionario.cargo?.escala?.codigo_escala || funcionario.codigo_escala || '',
            recebe_vt: funcionario.recebe_vt || false,
            faixa_vt: funcionario.faixa_vt || 1,
            recebe_seguro_vida: funcionario.recebe_seguro_vida || false,
            funcionario_registrado: funcionario.funcionario_registrado !== undefined ? funcionario.funcionario_registrado : true,
            adicional_insalubridade: funcionario.adicional_insalubridade || false,
            acumulo_funcao: funcionario.acumulo_funcao || false,
            banco_horas_ativo: funcionario.banco_horas_ativo || false,
            ronda: funcionario.ronda || false,
            ativo: funcionario.ativo !== undefined ? funcionario.ativo : true,
            demitido: funcionario.demitido || false
        });
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const { type, checked } = e.target as HTMLInputElement;
        
        let updatedData: any = { [name]: type === 'checkbox' ? checked : value };

        // Atualizar automaticamente os nomes baseados na seleção (para edição)
        if (name === 'empresa_id') {
            const empresa = empresas.find(emp => emp.id === value);
            updatedData.nome_empresa = empresa?.nome_empresa || '';
        } else if (name === 'posto_trabalho_id') {
            const posto = postos.find(p => p.id === value);
            updatedData.nome_posto = posto?.nome_posto || '';
        } else if (name === 'cargo_id') {
            const cargo = cargos.find(c => c.id === value);
            updatedData.nome_cargo = cargo?.nome_cargo || '';
            
            // Quando muda o cargo na edição, sugerir a escala padrão apenas se não houver uma já selecionada
            if (cargo && cargo.escala_id && !editData.escala_id) {
                const escala = regrasEscalas.find(esc => esc.id === cargo.escala_id);
                updatedData.escala_id = cargo.escala_id;
                updatedData.codigo_escala = escala?.codigo_escala || '';
            }
        } else if (name === 'escala_id') {
            const escala = regrasEscalas.find(esc => esc.id === value);
            updatedData.codigo_escala = escala?.codigo_escala || '';
        }

        setEditData(prev => ({ ...prev, ...updatedData }));
    };

    // Funções de ordenação
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortedFuncionarios = () => {
        if (!sortField) return funcionarios;

        return [...funcionarios].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'nome_completo':
                    aValue = a.nome_completo || '';
                    bValue = b.nome_completo || '';
                    break;
                case 'cpf':
                    aValue = a.cpf || '';
                    bValue = b.cpf || '';
                    break;
                case 'numero_ctps':
                    aValue = a.numero_ctps || '';
                    bValue = b.numero_ctps || '';
                    break;
                case 'serie_ctps':
                    aValue = a.serie_ctps || '';
                    bValue = b.serie_ctps || '';
                    break;
                case 'data_nascimento':
                    aValue = a.data_nascimento ? new Date(a.data_nascimento) : new Date(0);
                    bValue = b.data_nascimento ? new Date(b.data_nascimento) : new Date(0);
                    break;
                case 'empresa':
                    aValue = a.empresa?.nome_empresa || a.nome_empresa || '';
                    bValue = b.empresa?.nome_empresa || b.nome_empresa || '';
                    break;
                case 'posto':
                    aValue = a.posto_trabalho?.nome_posto || a.nome_posto || '';
                    bValue = b.posto_trabalho?.nome_posto || b.nome_posto || '';
                    break;
                case 'cargo':
                    aValue = a.cargo?.nome_cargo || a.nome_cargo || '';
                    bValue = b.cargo?.nome_cargo || b.nome_cargo || '';
                    break;
                case 'escala':
                    aValue = a.cargo?.escala?.codigo_escala || a.codigo_escala || '';
                    bValue = b.cargo?.escala?.codigo_escala || b.codigo_escala || '';
                    break;
                case 'data_admissao':
                    aValue = a.data_admissao ? new Date(a.data_admissao) : new Date(0);
                    bValue = b.data_admissao ? new Date(b.data_admissao) : new Date(0);
                    break;
                default:
                    return 0;
            }

            // Comparação
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const getSortIcon = (field: string) => {
        if (sortField !== field) {
            return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
        }
        return sortDirection === 'asc' 
            ? <ChevronUp className="w-4 h-4 ml-1 text-blue-500" />
            : <ChevronDown className="w-4 h-4 ml-1 text-blue-500" />;
    };

    const handleSaveEdit = async (id: string) => {
        setSubmitting(true);
        
        try {
            // Preparar apenas campos básicos que existem na tabela
            const dataToUpdate: any = {};
            
            // Campos obrigatórios
            if (editData.nome_completo) dataToUpdate.nome_completo = editData.nome_completo;
            if (editData.cpf) dataToUpdate.cpf = editData.cpf;
            
            // Campos opcionais
            if (editData.email) dataToUpdate.email = editData.email;
            if (editData.telefone) dataToUpdate.telefone = editData.telefone;
            if (editData.numero_ctps) dataToUpdate.numero_ctps = editData.numero_ctps;
            if (editData.serie_ctps) dataToUpdate.serie_ctps = editData.serie_ctps;
            if (editData.data_nascimento) dataToUpdate.data_nascimento = editData.data_nascimento;
            if (editData.data_admissao) dataToUpdate.data_admissao = editData.data_admissao;
            
            // Campos numéricos e booleanos
            dataToUpdate.quantidade_filhos = editData.quantidade_filhos ? Number.parseInt(editData.quantidade_filhos.toString()) : 0;
            dataToUpdate.recebe_vt = Boolean(editData.recebe_vt);
            dataToUpdate.faixa_vt = editData.faixa_vt || 1;
            dataToUpdate.recebe_seguro_vida = Boolean(editData.recebe_seguro_vida);
            dataToUpdate.funcionario_registrado = editData.funcionario_registrado !== undefined ? Boolean(editData.funcionario_registrado) : true;
            dataToUpdate.adicional_insalubridade = Boolean(editData.adicional_insalubridade);
            dataToUpdate.acumulo_funcao = Boolean(editData.acumulo_funcao);
            dataToUpdate.banco_horas_ativo = Boolean(editData.banco_horas_ativo);
            dataToUpdate.ronda = Boolean(editData.ronda);
            dataToUpdate.ativo = editData.ativo !== undefined ? Boolean(editData.ativo) : true;
            dataToUpdate.demitido = Boolean(editData.demitido);
            
            // IDs de relacionamento (apenas se tiverem valor)
            if (editData.empresa_id) dataToUpdate.empresa_id = editData.empresa_id;
            if (editData.posto_trabalho_id) dataToUpdate.posto_trabalho_id = editData.posto_trabalho_id;
            if (editData.cargo_id) dataToUpdate.cargo_id = editData.cargo_id;
            
            // Campos de nome para exibição (necessários para a tabela)
            if (editData.nome_empresa) dataToUpdate.nome_empresa = editData.nome_empresa;
            if (editData.nome_posto) dataToUpdate.nome_posto = editData.nome_posto;
            if (editData.nome_cargo) dataToUpdate.nome_cargo = editData.nome_cargo;
            if (editData.codigo_escala) dataToUpdate.codigo_escala = editData.codigo_escala;
            
            
            const result = await update(id, dataToUpdate);
            
            if (result.success) {
                setEditingId(null);
                setEditData({});
                showToast(' Funcionário atualizado com sucesso! A página será recarregada.', 'success');
                
                // Dados atualizados com sucesso
            } else {
                showToast(`Erro ao atualizar funcionário: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Erro inesperado ao atualizar funcionário', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // Função para atualizar rapidamente campos booleanos
    const handleQuickToggle = async (funcionarioId: string, field: string, currentValue: boolean) => {
        try {
            const result = await update(funcionarioId, { [field]: !currentValue });
            if (!result.success) {
                showToast(`Erro ao atualizar: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Erro ao atualizar campo', 'error');
        }
    };

    // Função para atualizar rapidamente campos numéricos (como faixa_vt)
    const handleQuickUpdate = async (funcionarioId: string, field: string, newValue: number) => {
        try {
            const result = await update(funcionarioId, { [field]: newValue });
            if (!result.success) {
                showToast(`Erro ao atualizar: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Erro ao atualizar campo', 'error');
        }
    };

    // Auto-save genérico (texto/data/select) — dispara no onBlur ou onChange dos selects
    const [savingField, setSavingField] = React.useState<string | null>(null);

    // ── Impressão / Exportação ────────────────────────────────────────────────
    type ColKey = 'nome_completo' | 'cpf' | 'email' | 'telefone' | 'numero_ctps' | 'serie_ctps'
        | 'data_nascimento' | 'data_admissao' | 'empresa' | 'posto' | 'cargo' | 'escala'
        | 'recebe_vt' | 'faixa_vt' | 'recebe_seguro_vida' | 'funcionario_registrado'
        | 'adicional_insalubridade' | 'acumulo_funcao' | 'recebe_adiantamento_quinzenal'
        | 'banco_horas_ativo' | 'ronda' | 'ativo' | 'demitido' | 'quantidade_filhos';

    const TODAS_COLUNAS: Array<{ key: ColKey; label: string }> = [
        { key: 'nome_completo',              label: 'Nome Completo' },
        { key: 'cpf',                        label: 'CPF' },
        { key: 'data_nascimento',            label: 'Nascimento' },
        { key: 'data_admissao',              label: 'Admissão' },
        { key: 'email',                      label: 'E-mail' },
        { key: 'telefone',                   label: 'Telefone' },
        { key: 'numero_ctps',               label: 'CTPS Nº' },
        { key: 'serie_ctps',                label: 'CTPS Série' },
        { key: 'empresa',                    label: 'Empresa' },
        { key: 'posto',                      label: 'Posto' },
        { key: 'cargo',                      label: 'Cargo' },
        { key: 'escala',                     label: 'Escala' },
        { key: 'quantidade_filhos',          label: 'Filhos < 14 anos' },
        { key: 'recebe_vt',                  label: 'Recebe VT' },
        { key: 'faixa_vt',                   label: 'Faixa VT' },
        { key: 'recebe_seguro_vida',         label: 'Seguro de Vida' },
        { key: 'funcionario_registrado',     label: 'Registrado' },
        { key: 'adicional_insalubridade',    label: 'Insalubridade' },
        { key: 'acumulo_funcao',             label: 'Acúmulo de Função' },
        { key: 'recebe_adiantamento_quinzenal', label: 'Adiantamento Quinzenal' },
        { key: 'banco_horas_ativo',          label: 'Banco de Horas' },
        { key: 'ronda',                      label: 'Ronda' },
        { key: 'ativo',                      label: 'Ativo' },
        { key: 'demitido',                   label: 'Demitido' },
    ];

    const COLUNAS_PADRAO: ColKey[] = ['nome_completo', 'cpf', 'data_admissao', 'empresa', 'posto', 'cargo', 'escala'];

    const [modalExport, setModalExport] = React.useState<'print' | 'xlsx' | null>(null);
    const [colsSelecionadas, setColsSelecionadas] = React.useState<ColKey[]>(COLUNAS_PADRAO);
    const [orientacao, setOrientacao] = React.useState<'landscape' | 'portrait'>('landscape');

    const getValorCelula = (f: any, key: ColKey): string => {
        const sim = 'Sim', nao = 'Não';
        switch (key) {
            case 'nome_completo':       return f.nome_completo || '';
            case 'cpf':                 return f.cpf || '';
            case 'email':               return f.email || '';
            case 'telefone':            return f.telefone || '';
            case 'numero_ctps':        return f.numero_ctps || '';
            case 'serie_ctps':         return f.serie_ctps || '';
            case 'data_nascimento':     return f.data_nascimento ? formatDateForDisplay(f.data_nascimento) : '';
            case 'data_admissao':       return f.data_admissao ? formatDateForDisplay(f.data_admissao) : '';
            case 'empresa':             return f.empresa?.nome_empresa || f.nome_empresa || '';
            case 'posto':               return f.posto_trabalho?.nome_posto || f.nome_posto || '';
            case 'cargo':               return f.cargo?.nome_cargo || f.nome_cargo || '';
            case 'escala':              return f.cargo?.escala?.codigo_escala || f.codigo_escala || '';
            case 'quantidade_filhos':   return String(f.quantidade_filhos || 0);
            case 'recebe_vt':           return f.recebe_vt ? sim : nao;
            case 'faixa_vt':            return f.recebe_vt ? `Faixa ${f.faixa_vt || 1}` : '-';
            case 'recebe_seguro_vida':  return f.recebe_seguro_vida ? sim : nao;
            case 'funcionario_registrado': return f.funcionario_registrado ? sim : nao;
            case 'adicional_insalubridade': return f.adicional_insalubridade ? sim : nao;
            case 'acumulo_funcao':      return f.acumulo_funcao ? sim : nao;
            case 'recebe_adiantamento_quinzenal': return f.recebe_adiantamento_quinzenal ? sim : nao;
            case 'banco_horas_ativo':   return f.banco_horas_ativo ? sim : nao;
            case 'ronda':               return f.ronda ? sim : nao;
            case 'ativo':               return f.ativo ? sim : nao;
            case 'demitido':            return f.demitido ? sim : nao;
            default:                    return '';
        }
    };

    const handleImprimir = () => {
        if (colsSelecionadas.length === 0) return;
        const cols = TODAS_COLUNAS.filter(c => colsSelecionadas.includes(c.key));
        const linhas = getSortedFuncionarios();
        const rows = linhas.map(f =>
            `<tr>${cols.map(c => `<td>${getValorCelula(f, c.key)}</td>`).join('')}</tr>`
        ).join('');
        const orient = orientacao; // captura o valor atual fora do closure
        const html = [
            '<!DOCTYPE html><html><head><meta charset="UTF-8">',
            '<title>Funcionários</title>',
            '<style>',
            `@page { size: A4 ${orient}; margin: 10mm; }`,
            'body { font-family: Arial, sans-serif; font-size: 9px; }',
            'h1 { font-size: 13px; margin: 0 0 6px; }',
            'table { width: 100%; border-collapse: collapse; }',
            'th, td { border: 1px solid #aaa; padding: 2px 4px; text-align: left; }',
            'th { background: #dce6f1; font-weight: bold; }',
            'tr:nth-child(even) { background: #f2f2f2; }',
            '</style></head><body>',
            `<h1>Funcionários — ${new Date().toLocaleDateString('pt-BR')}</h1>`,
            '<table>',
            `<thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>`,
            `<tbody>${rows}</tbody>`,
            '</table></body></html>',
        ].join('\n');

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 1000);
            }, 300);
        };
        setModalExport(null);
    };

    const handleExportarXlsx = async () => {
        if (colsSelecionadas.length === 0) return;
        const cols = TODAS_COLUNAS.filter(c => colsSelecionadas.includes(c.key));
        const linhas = getSortedFuncionarios();
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Funcionários');
        ws.addRow([`Funcionários — ${new Date().toLocaleDateString('pt-BR')}`]);
        ws.addRow([]);
        ws.addRow(cols.map(c => c.label));
        ws.getRow(3).font = { bold: true };
        ws.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
        linhas.forEach(f => ws.addRow(cols.map(c => getValorCelula(f, c.key))));
        ws.columns.forEach(col => { col.width = 20; });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `funcionarios-${new Date().toISOString().slice(0, 10)}.xlsx`);
        setModalExport(null);
    };
    const handleAutoSaveField = async (
        funcionarioId: string,
        field: string,
        newValue: any,
        originalValue: any,
        extra?: Record<string, any>
    ) => {
        const norm = (v: any) => (v === '' || v === undefined ? null : v);
        if (norm(newValue) === norm(originalValue) && !extra) return;
        const key = `${funcionarioId}:${field}`;
        setSavingField(key);
        try {
            const payload: Record<string, any> = { [field]: norm(newValue), ...(extra || {}) };
            const result = await update(funcionarioId, payload);
            if (!result.success) {
                showToast(`Erro ao salvar: ${result.error}`, 'error');
            } else {
                showToast('Alteração salva automaticamente', 'success');
            }
        } catch {
            showToast('Erro ao salvar alteração', 'error');
        } finally {
            setSavingField(prev => (prev === key ? null : prev));
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer />
            <h1 className="text-3xl font-bold text-gray-800">Funcionários</h1>
            {canShowForm() && (
            <Card>
                <h2 className="text-xl font-semibold mb-4">Cadastrar Novo Funcionário</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <Input 
                        label="Nome Completo" 
                        name="nome_completo"
                        value={formData.nome_completo}
                        onChange={handleInputChange}
                        placeholder="Ana Clara"
                        icon={<User className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="CPF" 
                        name="cpf"
                        mask="cpf"
                        value={formData.cpf}
                        onChange={handleInputChange}
                        placeholder="123.456.789-00" 
                        storeUnmasked={true}
                        icon={<CreditCard className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="CTPS nº" 
                        name="numero_ctps"
                        mask="ctps-number"
                        value={formData.numero_ctps}
                        onChange={handleInputChange}
                        placeholder="12.345" 
                        storeUnmasked={true}
                        icon={<FileText className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="CTPS Série" 
                        name="serie_ctps"
                        mask="ctps-serie"
                        value={formData.serie_ctps}
                        onChange={handleInputChange}
                        placeholder="001" 
                        storeUnmasked={true}
                        icon={<FileText className="w-5 h-5 text-gray-400" />}
                    />
                    <Input 
                        label="Email" 
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="funcionario@email.com"
                        icon={<Mail className="w-5 h-5 text-gray-400" />}
                    />
                    <FixedMaskedInput 
                        label="Telefone" 
                        name="telefone"
                        mask="phone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="(11) 99999-9999" 
                        storeUnmasked={false}
                        icon={<Phone className="w-5 h-5 text-gray-400" />}
                    />
                    <DateInput 
                        label="Data de Nascimento" 
                        name="data_nascimento"
                        value={formData.data_nascimento}
                        onChange={handleInputChange}
                    />
                    <DateInput 
                        label="Data de Admissão" 
                        name="data_admissao"
                        value={formData.data_admissao}
                        onChange={handleInputChange}
                    />
                    <Input 
                        label="Qtde de Filhos < 14 anos" 
                        name="quantidade_filhos"
                        type="number"
                        value={formData.quantidade_filhos}
                        onChange={handleInputChange}
                        placeholder="0"
                        icon={<Users className="w-5 h-5 text-gray-400" />}
                    />
                    <Select 
                        label="Empresa" 
                        name="empresa_id"
                        value={formData.empresa_id}
                        onChange={handleSelectChange}
                    >
                        <option value="">Selecione uma empresa...</option>
                        {empresas.map(empresa => (
                            <option key={empresa.id} value={empresa.id}>
                                {empresa.nome_empresa}
                            </option>
                        ))}
                    </Select>
                    <Select 
                        label="Posto de Trabalho" 
                        name="posto_trabalho_id"
                        value={formData.posto_trabalho_id}
                        onChange={handleSelectChange}
                    >
                        <option value="">Selecione um posto...</option>
                        {postos.map(posto => (
                            <option key={posto.id} value={posto.id}>
                                {posto.nome_posto}
                            </option>
                        ))}
                    </Select>
                    <Select 
                        label="Cargo" 
                        name="cargo_id"
                        value={formData.cargo_id}
                        onChange={handleSelectChange}
                    >
                        <option value="">Selecione um cargo...</option>
                        {cargos.map(cargo => (
                            <option key={cargo.id} value={cargo.id}>
                                {cargo.nome_cargo}
                            </option>
                        ))}
                    </Select>
                    <Select 
                        label="Escala" 
                        name="escala_id"
                        value={formData.escala_id}
                        onChange={handleSelectChange}
                    >
                        <option value="">Selecione uma escala...</option>
                        {regrasEscalas.map(escala => (
                            <option key={escala.id} value={escala.id}>
                                {escala.codigo_escala} - {escala.nome_escala}
                            </option>
                        ))}
                    </Select>
                    <div className="sm:col-span-2 lg:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                                <Checkbox 
                                    label="Funcionário Ativo?" 
                                    name="ativo"
                                    checked={formData.ativo}
                                    onChange={handleInputChange}
                                />
                                <Checkbox 
                                    label="Funcionário Registrado?" 
                                    name="funcionario_registrado"
                                    checked={formData.funcionario_registrado}
                                    onChange={handleInputChange}
                                />
                                <Checkbox 
                                    label="Demitido?" 
                                    name="demitido"
                                    checked={formData.demitido}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Benefícios</h4>
                                <Checkbox 
                                    label="Recebe VT?" 
                                    name="recebe_vt"
                                    checked={formData.recebe_vt}
                                    onChange={handleInputChange}
                                />
                                {formData.recebe_vt && (
                                    <div className="ml-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Faixa VT</label>
                                        <select
                                            name="faixa_vt"
                                            value={formData.faixa_vt}
                                            onChange={(e) => setFormData(prev => ({ ...prev, faixa_vt: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value={1}>Faixa 1 - Campinas</option>
                                            <option value={2}>Faixa 2 - Valinhos</option>
                                        </select>
                                    </div>
                                )}
                                <Checkbox 
                                    label="Seguro de Vida em Grupo?" 
                                    name="recebe_seguro_vida"
                                    checked={formData.recebe_seguro_vida}
                                    onChange={handleInputChange}
                                />
                                <Checkbox 
                                    label="Recebe Adiantamento Quinzenal?" 
                                    name="recebe_adiantamento_quinzenal"
                                    checked={formData.recebe_adiantamento_quinzenal}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Adicionais</h4>
                                <Checkbox 
                                    label="Adicional Insalubridade?" 
                                    name="adicional_insalubridade"
                                    checked={formData.adicional_insalubridade}
                                    onChange={handleInputChange}
                                />
                                <Checkbox 
                                    label="Adicional Acúmulo de Função?" 
                                    name="acumulo_funcao"
                                    checked={formData.acumulo_funcao}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Banco de Horas</h4>
                                <Checkbox 
                                    label="Banco de Horas?" 
                                    name="banco_horas_ativo"
                                    checked={formData.banco_horas_ativo}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Se ativado, exibe o card "Banco de Horas" nos portais do Funcionário e do Cliente
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Ronda</h4>
                                <Checkbox 
                                    label="Ronda?" 
                                    name="ronda"
                                    checked={formData.ronda}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Se ativado, o funcionário aparece na seleção de rondas do seu posto
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : 'Salvar Funcionário'}
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

            <Card className="p-3 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold">Funcionários Cadastrados</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setModalExport('xlsx')}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                        >
                            <FileSpreadsheet size={15} /> Excel
                        </button>
                        <button
                            onClick={() => setModalExport('print')}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                            <Printer size={15} /> Imprimir
                        </button>
                    </div>
                </div>
                {loading ? (
                    <p className="text-sm">Carregando funcionários...</p>
                ) : funcionarios.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum funcionário cadastrado ainda.</p>
                ) : (
                    <div className="border border-gray-200 rounded-lg">
                        <div
                            ref={topScrollRef}
                            onScroll={() => {
                                if (mainScrollRef.current && topScrollRef.current && !syncingRef.current) {
                                    syncingRef.current = true;
                                    mainScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
                                    syncingRef.current = false;
                                }
                            }}
                            className="sticky top-0 z-40 scrollbar-x-always bg-gray-50"
                            style={{ overflowX: 'scroll', overflowY: 'hidden', height: 14 }}
                        >
                            <div style={{ width: tableScrollWidth, height: 1 }} />
                        </div>
                        <div
                            ref={mainScrollRef}
                            onScroll={() => {
                                if (mainScrollRef.current && topScrollRef.current && !syncingRef.current) {
                                    syncingRef.current = true;
                                    topScrollRef.current.scrollLeft = mainScrollRef.current.scrollLeft;
                                    syncingRef.current = false;
                                }
                            }}
                            className="overflow-y-auto max-h-[70vh] scrollbar-x-always"
                            style={{ overflowX: 'scroll' }}
                        >
                        <table ref={tableRef} className="min-w-full divide-y divide-gray-200">

                            <thead className="bg-gray-50 sticky top-0 z-20">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none sticky left-0 z-30 bg-gray-50"
                                        onClick={() => handleSort('nome_completo')}
                                    >
                                        <div className="flex items-center">
                                            Nome
                                            {getSortIcon('nome_completo')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('cpf')}
                                    >
                                        <div className="flex items-center">
                                            CPF
                                            {getSortIcon('cpf')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('email')}
                                    >
                                        <div className="flex items-center">
                                            Email
                                            {getSortIcon('email')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('telefone')}
                                    >
                                        <div className="flex items-center">
                                            Telefone
                                            {getSortIcon('telefone')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('numero_ctps')}
                                    >
                                        <div className="flex items-center">
                                            CTPS Nº
                                            {getSortIcon('numero_ctps')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('serie_ctps')}
                                    >
                                        <div className="flex items-center">
                                            CTPS Série
                                            {getSortIcon('serie_ctps')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('data_nascimento')}
                                    >
                                        <div className="flex items-center">
                                            Nascimento
                                            {getSortIcon('data_nascimento')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('empresa')}
                                    >
                                        <div className="flex items-center">
                                            Empresa
                                            {getSortIcon('empresa')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('posto')}
                                    >
                                        <div className="flex items-center">
                                            Posto
                                            {getSortIcon('posto')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('cargo')}
                                    >
                                        <div className="flex items-center">
                                            Cargo
                                            {getSortIcon('cargo')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('escala')}
                                    >
                                        <div className="flex items-center">
                                            Escala
                                            {getSortIcon('escala')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('data_admissao')}
                                    >
                                        <div className="flex items-center">
                                            Admissão
                                            {getSortIcon('data_admissao')}
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        VT
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Faixa VT
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Seguro Vida
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Registrado
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Insalub.
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acúmulo
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Adiant.
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Banco Hrs
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ronda
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ativo
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Demitido
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Portal
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getSortedFuncionarios().map((funcionario) => (
                                    <tr key={funcionario.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 z-10 bg-white">
                                            <input
                                                key={`nome-${funcionario.id}-${funcionario.nome_completo || ''}`}
                                                type="text"
                                                defaultValue={funcionario.nome_completo || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'nome_completo', e.target.value, funcionario.nome_completo)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                                title={funcionario.nome_completo}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`cpf-${funcionario.id}-${funcionario.cpf || ''}`}
                                                type="text"
                                                defaultValue={funcionario.cpf || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'cpf', e.target.value, funcionario.cpf)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`ctps-${funcionario.id}-${funcionario.numero_ctps || ''}`}
                                                type="text"
                                                defaultValue={funcionario.numero_ctps || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'numero_ctps', e.target.value, funcionario.numero_ctps)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                                placeholder="Número CTPS"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`email-${funcionario.id}-${funcionario.email || ''}`}
                                                type="email"
                                                defaultValue={funcionario.email || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'email', e.target.value, funcionario.email)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                                placeholder="Email"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`tel-${funcionario.id}-${funcionario.telefone || ''}`}
                                                type="text"
                                                defaultValue={funcionario.telefone || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'telefone', e.target.value, funcionario.telefone)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                                placeholder="Telefone"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`serie-${funcionario.id}-${funcionario.serie_ctps || ''}`}
                                                type="text"
                                                defaultValue={funcionario.serie_ctps || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'serie_ctps', e.target.value, funcionario.serie_ctps)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                                placeholder="Série CTPS"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`nasc-${funcionario.id}-${funcionario.data_nascimento || ''}`}
                                                type="date"
                                                defaultValue={funcionario.data_nascimento || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'data_nascimento', e.target.value, funcionario.data_nascimento)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <select
                                                value={funcionario.empresa_id || ''}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const emp = empresas.find(x => x.id === id);
                                                    handleAutoSaveField(funcionario.id, 'empresa_id', id, funcionario.empresa_id, emp ? { nome_empresa: emp.nome_empresa } : undefined);
                                                }}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            >
                                                <option value="">Selecione...</option>
                                                {empresas.map(empresa => (
                                                    <option key={empresa.id} value={empresa.id}>{empresa.nome_empresa}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <select
                                                value={funcionario.posto_trabalho_id || ''}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const p = postos.find(x => x.id === id);
                                                    handleAutoSaveField(funcionario.id, 'posto_trabalho_id', id, funcionario.posto_trabalho_id, p ? { nome_posto: p.nome_posto } : undefined);
                                                }}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            >
                                                <option value="">Selecione...</option>
                                                {postos.map(posto => (
                                                    <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <select
                                                value={funcionario.cargo_id || ''}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const c = cargos.find(x => x.id === id);
                                                    handleAutoSaveField(funcionario.id, 'cargo_id', id, funcionario.cargo_id, c ? { nome_cargo: c.nome_cargo } : undefined);
                                                }}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            >
                                                <option value="">Selecione...</option>
                                                {cargos.map(cargo => (
                                                    <option key={cargo.id} value={cargo.id}>{cargo.nome_cargo}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <select
                                                value={funcionario.codigo_escala || ''}
                                                onChange={(e) => {
                                                    const codigo = e.target.value;
                                                    handleAutoSaveField(funcionario.id, 'codigo_escala', codigo, funcionario.codigo_escala);
                                                }}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            >
                                                <option value="">Selecione...</option>
                                                {regrasEscalas.map(escala => (
                                                    <option key={escala.id} value={escala.codigo_escala}>{escala.codigo_escala}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                key={`adm-${funcionario.id}-${funcionario.data_admissao || ''}`}
                                                type="date"
                                                defaultValue={funcionario.data_admissao || ''}
                                                onBlur={(e) => handleAutoSaveField(funcionario.id, 'data_admissao', e.target.value, funcionario.data_admissao)}
                                                className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm bg-transparent"
                                            />
                                        </td>

                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.recebe_vt || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'recebe_vt', funcionario.recebe_vt)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Recebe Vale Transporte"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            {funcionario.recebe_vt ? (
                                                <select
                                                    value={funcionario.faixa_vt || 1}
                                                    onChange={(e) => handleQuickUpdate(funcionario.id, 'faixa_vt', Number(e.target.value))}
                                                    className={`text-xs px-2 py-1 rounded-full font-semibold cursor-pointer border-0 appearance-none text-center ${
                                                        funcionario.faixa_vt === 2 
                                                            ? 'bg-blue-100 text-blue-700' 
                                                            : 'bg-green-100 text-green-700'
                                                    }`}
                                                    title="Faixa de Vale Transporte"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value={1}>F1</option>
                                                    <option value={2}>F2</option>
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.recebe_seguro_vida || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'recebe_seguro_vida', funcionario.recebe_seguro_vida)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Recebe Seguro de Vida em Grupo"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.funcionario_registrado !== false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'funcionario_registrado', funcionario.funcionario_registrado !== false)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Funcionário já Registrado"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.adicional_insalubridade || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'adicional_insalubridade', funcionario.adicional_insalubridade)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Adicional de Insalubridade"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.acumulo_funcao || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'acumulo_funcao', funcionario.acumulo_funcao)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Acúmulo de Função"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.recebe_adiantamento_quinzenal !== false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'recebe_adiantamento_quinzenal', funcionario.recebe_adiantamento_quinzenal !== false)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Recebe Adiantamento Quinzenal"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.banco_horas_ativo || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'banco_horas_ativo', funcionario.banco_horas_ativo || false)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                                title="Banco de Horas Ativo (marcado = exibe card nos portais)"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.ronda || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'ronda', funcionario.ronda || false)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                title="Ronda (marcado = aparece na seleção de rondas)"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.ativo !== false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'ativo', funcionario.ativo !== false)}
                                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                                title="Funcionário Ativo (desmarcado = suspenso/afastado)"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <input
                                                type="checkbox"
                                                checked={funcionario.demitido || false}
                                                onChange={() => handleQuickToggle(funcionario.id, 'demitido', funcionario.demitido || false)}
                                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                                title="Funcionário Demitido (marcado = não processará escalas, folhas e relatórios)"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handleOpenLinkModal(funcionario)}
                                                className={`p-1 rounded transition-colors ${
                                                    funcionario.user_id 
                                                        ? 'text-green-600 hover:bg-green-50' 
                                                        : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                                title={funcionario.user_id ? 'Vinculado ao Portal' : 'Vincular ao Portal'}
                                            >
                                                <Link2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {canShowActions() ? (
                                                <div className="flex items-center space-x-2">
                                                    {savingField?.startsWith(`${funcionario.id}:`) && (
                                                        <span className="text-xs text-blue-600 italic">salvando…</span>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!window.confirm(`Tem certeza que deseja excluir o funcionário "${funcionario.nome_completo}"?`)) return;
                                                            const result = await remove(funcionario.id);
                                                            if (result.success) {
                                                                showToast('Funcionário excluído com sucesso!', 'success');
                                                                return;
                                                            }
                                                            const msg = String(result.error || '');
                                                            const isFk = msg.includes('23503') || msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('violates');
                                                            if (isFk) {
                                                                const confirmar = window.confirm(
                                                                    `Não é possível excluir "${funcionario.nome_completo}" porque existem registros vinculados (folhas de ponto, escalas, folhas calculadas, férias, etc.).\n\nDeseja marcá-lo como DEMITIDO e INATIVO em vez de excluir?`
                                                                );
                                                                if (confirmar) {
                                                                    const upd = await update(funcionario.id, { demitido: true, ativo: false } as any);
                                                                    if (upd.success) {
                                                                        showToast('Funcionário marcado como demitido.', 'success');
                                                                    } else {
                                                                        showToast(`Erro ao marcar como demitido: ${upd.error}`, 'error');
                                                                    }
                                                                }
                                                            } else {
                                                                showToast(`Erro ao excluir funcionário: ${msg}`, 'error');
                                                            }
                                                        }}
                                                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        🗑️ Excluir
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Somente leitura</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>

                )}
            </Card>

            {/* Modal de vinculação de usuário */}
            {selectedFuncionarioForLink && (
                <LinkUserModal
                    isOpen={linkModalOpen}
                    onClose={handleCloseLinkModal}
                    funcionario={selectedFuncionarioForLink}
                    onSuccess={() => refetch()}
                />
            )}

            {/* Modal de seleção de colunas para impressão / exportação */}
            {modalExport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                                {modalExport === 'print' ? '🖨️ Selecionar colunas para impressão' : '📊 Selecionar colunas para Excel'}
                            </h2>
                            <button onClick={() => setModalExport(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            <div className="flex gap-2 text-xs mb-2">
                                <button
                                    onClick={() => setColsSelecionadas(TODAS_COLUNAS.map(c => c.key))}
                                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                >Selecionar todas</button>
                                <button
                                    onClick={() => setColsSelecionadas([])}
                                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                >Limpar</button>
                                <button
                                    onClick={() => setColsSelecionadas(COLUNAS_PADRAO)}
                                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                >Padrão</button>
                            </div>
                            {modalExport === 'print' && (
                                <div className="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Orientação:</span>
                                    <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="orientacao"
                                            value="landscape"
                                            checked={orientacao === 'landscape'}
                                            onChange={() => setOrientacao('landscape')}
                                        />
                                        Paisagem (A4 horizontal)
                                    </label>
                                    <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="orientacao"
                                            value="portrait"
                                            checked={orientacao === 'portrait'}
                                            onChange={() => setOrientacao('portrait')}
                                        />
                                        Retrato (A4 vertical)
                                    </label>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {TODAS_COLUNAS.map(c => (
                                    <label key={c.key} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={colsSelecionadas.includes(c.key)}
                                            onChange={e => setColsSelecionadas(prev =>
                                                e.target.checked ? [...prev, c.key] : prev.filter(k => k !== c.key)
                                            )}
                                            className="rounded"
                                        />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setModalExport(null)}
                                className="px-3 py-2 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
                            >Cancelar</button>
                            <button
                                onClick={modalExport === 'print' ? handleImprimir : handleExportarXlsx}
                                disabled={colsSelecionadas.length === 0}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded text-white text-sm disabled:opacity-50
                                    bg-blue-600 hover:bg-blue-700"
                            >
                                {modalExport === 'print'
                                    ? <><Printer size={15} /> Imprimir</>
                                    : <><FileSpreadsheet size={15} /> Exportar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
