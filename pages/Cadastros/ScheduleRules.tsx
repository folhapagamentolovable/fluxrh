import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';
import { supabase } from '../../lib/supabase';
import { useEmpresas, usePostosTrabalho, useCargos } from '../../hooks/useSupabase';
import { useToast } from '../../hooks/useToast';
import { usePermissions } from '../../hooks/usePermissions';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { sincronizarRegraComEscalas, converterRegraVisualParaJSON } from '../../utils/converterRegraVisualParaJSON';
import { interpretarRegraEscala } from '../../utils/interpretadorRegrasEscala';

interface HorariosConfig {
    entrada: string;
    inicio_almoco: string;
    termino_almoco: string;
    saida: string;
}

interface RegraEscala {
    id?: string;
    codigo_escala: string;
    nome_escala: string;
    empresa_id: string | null;
    posto_trabalho_id: string | null;
    cargo_id: string | null;
    turno: string;
    data_vigencia: string;
    trabalha_segunda: boolean;
    trabalha_terca: boolean;
    trabalha_quarta: boolean;
    trabalha_quinta: boolean;
    trabalha_sexta: boolean;
    trabalha_sabado: boolean;
    trabalha_domingo: boolean;
    trabalha_feriado: boolean;
    tipo_alternancia: string;
    horarios_segunda: HorariosConfig;
    horarios_terca: HorariosConfig;
    horarios_quarta: HorariosConfig;
    horarios_quinta: HorariosConfig;
    horarios_sexta: HorariosConfig;
    horarios_sabado: HorariosConfig;
    horarios_domingo: HorariosConfig;
    horarios_feriado: HorariosConfig;
    observacoes: string;
    ativa: boolean;
}

const ScheduleRules: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { canShowForm, canShowActions } = usePermissions();
    const { data: empresas } = useEmpresas();
    const { data: postos } = usePostosTrabalho();
    const { data: cargos } = useCargos();

    const [regras, setRegras] = useState<RegraEscala[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Estados para ordenação
    const [sortField, setSortField] = useState<string>('codigo_escala');
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
    const sortedRegras = React.useMemo(() => {
        if (!regras) return [];
        
        return [...regras].sort((a, b) => {
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
    }, [regras, sortField, sortDirection]);

    const horariosPadrao: HorariosConfig = {
        entrada: '08:00',
        inicio_almoco: '12:00',
        termino_almoco: '13:00',
        saida: '17:00'
    };

    const [formData, setFormData] = useState<RegraEscala>({
        codigo_escala: '',
        nome_escala: '',
        empresa_id: null,
        posto_trabalho_id: null,
        cargo_id: null,
        turno: 'DIURNO',
        data_vigencia: '2025-01-01',
        trabalha_segunda: true,
        trabalha_terca: true,
        trabalha_quarta: true,
        trabalha_quinta: true,
        trabalha_sexta: true,
        trabalha_sabado: false,
        trabalha_domingo: false,
        trabalha_feriado: false,
        tipo_alternancia: 'NENHUMA',
        horarios_segunda: { ...horariosPadrao },
        horarios_terca: { ...horariosPadrao },
        horarios_quarta: { ...horariosPadrao },
        horarios_quinta: { ...horariosPadrao },
        horarios_sexta: { ...horariosPadrao },
        horarios_sabado: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '12:00', saida: '12:00' },
        horarios_domingo: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' },
        horarios_feriado: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' },
        observacoes: '',
        ativa: true
    });

    React.useEffect(() => {
        carregarRegras();
    }, []);

    const carregarRegras = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('regras_escalas')
                .select('*')
                .order('codigo_escala');

            if (error) {
                throw error;
            }
            
            setRegras(data || []);
        } catch (error) {
            showToast('Erro ao carregar regras de escalas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleHorarioChange = (dia: keyof RegraEscala, campo: keyof HorariosConfig, valor: string) => {
        setFormData(prev => ({
            ...prev,
            [dia]: {
                ...(prev[dia] as HorariosConfig),
                [campo]: valor
            }
        }));
    };

    const copiarHorarios = (diaOrigem: keyof RegraEscala) => {
        const horarios = formData[diaOrigem] as HorariosConfig;
        setFormData(prev => ({
            ...prev,
            horarios_segunda: { ...horarios },
            horarios_terca: { ...horarios },
            horarios_quarta: { ...horarios },
            horarios_quinta: { ...horarios },
            horarios_sexta: { ...horarios }
        }));
        showToast('Horários copiados para dias úteis!', 'success');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Converter a regra para JSON para salvar no banco
            const regrasJSON = converterRegraVisualParaJSON(formData as any);
            const dataToSave = {
                ...formData,
                regras_json: regrasJSON
            };

            let savedRegra: RegraEscala;

            if (editingId) {
                const { data, error } = await supabase
                    .from('regras_escalas')
                    .update(dataToSave)
                    .eq('id', editingId)
                    .select()
                    .single();

                if (error) throw error;
                savedRegra = data;
                showToast('Regra atualizada com sucesso!', 'success');
            } else {
                const { data, error } = await supabase
                    .from('regras_escalas')
                    .insert([dataToSave])
                    .select()
                    .single();

                if (error) throw error;
                savedRegra = data;
                showToast('Regra criada com sucesso!', 'success');
            }

            // 🔄 Sincronização automática com escalas mensais
            try {
                // Notificar usuário que a sincronização começou
                showToast('Sincronizando com escalas mensais...', 'info');
                
                // Chamamos a função de regeneração para a regra recém-salva
                // Passamos o parâmetro 'true' para indicar que é silencioso (sem confirm)
                await regenerarEscalasMensais(savedRegra, true);
            } catch (syncError: any) {
                showToast(`Aviso: Regra salva mas houve erro na sincronização: ${syncError.message}`, 'error');
            }

            resetForm();
            carregarRegras();
        } catch (error: any) {
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (regra: RegraEscala) => {
        setFormData(regra);
        setEditingId(regra.id || null);
        globalThis.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!globalThis.confirm('Deseja realmente excluir esta regra?')) return;

        try {
            const { error } = await supabase
                .from('regras_escalas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Regra excluída com sucesso!', 'success');
            carregarRegras();
        } catch (error: any) {
            showToast(`Erro ao excluir: ${error.message}`, 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            codigo_escala: '',
            nome_escala: '',
            empresa_id: null,
            posto_trabalho_id: null,
            cargo_id: null,
            turno: 'DIURNO',
            data_vigencia: '2025-01-01',
            trabalha_segunda: true,
            trabalha_terca: true,
            trabalha_quarta: true,
            trabalha_quinta: true,
            trabalha_sexta: true,
            trabalha_sabado: false,
            trabalha_domingo: false,
            trabalha_feriado: false,
            tipo_alternancia: 'NENHUMA',
            horarios_segunda: { ...horariosPadrao },
            horarios_terca: { ...horariosPadrao },
            horarios_quarta: { ...horariosPadrao },
            horarios_quinta: { ...horariosPadrao },
            horarios_sexta: { ...horariosPadrao },
            horarios_sabado: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '12:00', saida: '12:00' },
            horarios_domingo: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' },
            horarios_feriado: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' },
            observacoes: '',
            ativa: true
        });
        setEditingId(null);
    };

    const [regenerando, setRegenerando] = useState<string | null>(null);

    const regenerarEscalasMensais = async (regra: RegraEscala, silencioso = false) => {
        if (!regra.id) return;
        
        if (!silencioso) {
            const confirmar = globalThis.confirm(
                `Regenerar escalas mensais para "${regra.nome_escala}"?\n\n` +
                `Isso atualizará os horários de todos os funcionários com esta escala em todos os meses salvos.`
            );
            if (!confirmar) return;
        }

        setRegenerando(regra.id);
        showToast('Regenerando escalas...', 'info');

        try {
            // 1. Buscar todas as escala_mensal que usam esta regra
            const { data: escalasMensais, error } = await supabase
                .from('escala_mensal')
                .select('id, funcionario_id, mes, ano')
                .eq('escala_id', regra.id);

            if (error) throw error;
            if (!escalasMensais || escalasMensais.length === 0) {
                showToast('Nenhuma escala mensal encontrada para esta regra.', 'info');
                return;
            }

            // 2. Converter a regra atualizada para JSON
            const regrasJSON = converterRegraVisualParaJSON(regra as any);

            // 3. Para cada escala mensal, regenerar os dias_trabalhados
            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            let sucessos = 0;
            let erros = 0;

            for (const escalaMensal of escalasMensais) {
                try {
                    const { mes, ano } = escalaMensal;
                    const diasNoMes = new Date(ano, mes, 0).getDate();

                    // Buscar feriados do mês
                    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
                    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(diasNoMes).padStart(2, '0')}`;
                    const { data: feriados } = await supabase
                        .from('feriados')
                        .select('data_feriado')
                        .gte('data_feriado', dataInicio)
                        .lte('data_feriado', dataFim);

                    const feriadosSet = new Set((feriados || []).map((f: any) => f.data_feriado));

                    // Regenerar cada dia
                    const diasData: Record<string, any> = {};
                    let totalTrabalho = 0, totalFolga = 0, totalFeriados = 0;

                    for (let dia = 1; dia <= diasNoMes; dia++) {
                        const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                        const diaSemana = diasSemana[new Date(ano, mes - 1, dia).getDay()];
                        const ehFeriado = feriadosSet.has(dataStr);

                        const interpretacao = interpretarRegraEscala(regrasJSON, dia, mes, ano, diaSemana, ehFeriado);

                        if (interpretacao?.trabalha) {
                            diasData[`dia_${dia}`] = {
                                feriado: ehFeriado,
                                folga: false,
                                entrada: interpretacao.horarios.entrada,
                                inicio_refeicao: interpretacao.horarios.inicio_refeicao,
                                termino_refeicao: interpretacao.horarios.termino_refeicao,
                                saida: interpretacao.horarios.saida
                            };
                            totalTrabalho++;
                        } else {
                            diasData[`dia_${dia}`] = {
                                feriado: ehFeriado,
                                folga: true,
                                entrada: '',
                                inicio_refeicao: '',
                                termino_refeicao: '',
                                saida: ''
                            };
                            if (ehFeriado) totalFeriados++;
                            else totalFolga++;
                        }
                    }

                    const { error: updateError } = await supabase
                        .from('escala_mensal')
                        .update({
                            dias_trabalhados: JSON.stringify(diasData),
                            total_dias_trabalho: totalTrabalho,
                            total_dias_folga: totalFolga,
                            total_feriados: totalFeriados
                        })
                        .eq('id', escalaMensal.id);

                    if (updateError) throw updateError;
                    sucessos++;
                } catch (err) {
                    erros++;
                }
            }

            showToast(
                `Regeneração concluída: ${sucessos} escalas atualizadas${erros > 0 ? `, ${erros} erros` : ''}.`,
                erros > 0 ? 'info' : 'success'
            );
        } catch (error: any) {
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            setRegenerando(null);
        }
    };

    const renderHorarioInputs = (dia: keyof RegraEscala, label: string) => {
        const horarios = formData[dia] as HorariosConfig;
        
        return (
            <div className="border rounded-lg p-2.5 bg-gray-50">
                <div className="flex justify-between items-center mb-1.5">
                    <h4 className="font-semibold text-sm text-gray-700">{label}</h4>
                    {dia === 'horarios_segunda' && (
                        <button
                            type="button"
                            onClick={() => copiarHorarios(dia)}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Copiar para dias úteis
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Input
                        label="Entrada"
                        type="time"
                        value={horarios.entrada}
                        onChange={(e) => handleHorarioChange(dia, 'entrada', e.target.value)}
                    />
                    <Input
                        label="Início Refeição"
                        type="time"
                        value={horarios.inicio_almoco}
                        onChange={(e) => handleHorarioChange(dia, 'inicio_almoco', e.target.value)}
                    />
                    <Input
                        label="Término Refeição"
                        type="time"
                        value={horarios.termino_almoco}
                        onChange={(e) => handleHorarioChange(dia, 'termino_almoco', e.target.value)}
                    />
                    <Input
                        label="Saída"
                        type="time"
                        value={horarios.saida}
                        onChange={(e) => handleHorarioChange(dia, 'saida', e.target.value)}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <ToastContainer />
            
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Configurador de Escalas</h1>
            </div>

            <Card>
                <h2 className="text-xl font-semibold mb-4">
                    {editingId ? 'Editar Regra de Escala' : 'Nova Regra de Escala'}
                </h2>

                {/* Ajuda Visual */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Tipos de Escala</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white p-3 rounded border border-blue-100">
                            <div className="font-semibold text-blue-800">🔒 Escala Fixa</div>
                            <div className="text-gray-600 text-xs mt-1">
                                Trabalha sempre nos mesmos dias (ex: Segunda a Sábado)
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded border border-blue-100">
                            <div className="font-semibold text-blue-800">🔄 Dias Alternados (12x36)</div>
                            <div className="text-gray-600 text-xs mt-1">
                                Trabalha 1 dia, folga 1 dia (ex: Vigias, Porteiros)
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded border border-blue-100">
                            <div className="font-semibold text-blue-800">📅 Sábados Alternados</div>
                            <div className="text-gray-600 text-xs mt-1">
                                Trabalha em sábados alternados (ex: Limpeza)
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Identificação */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Código da Escala *"
                            value={formData.codigo_escala}
                            onChange={(e) => handleInputChange('codigo_escala', e.target.value.toUpperCase())}
                            required
                            placeholder="Ex: ZELADOR01"
                        />
                        <Input
                            label="Nome da Escala *"
                            value={formData.nome_escala}
                            onChange={(e) => handleInputChange('nome_escala', e.target.value)}
                            required
                            placeholder="Ex: Zelador Segunda a Sábado"
                        />
                    </div>

                    {/* Relacionamentos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select
                            label="Empresa (opcional)"
                            value={formData.empresa_id || ''}
                            onChange={(e) => handleInputChange('empresa_id', e.target.value || null)}
                        >
                            <option value="">Todas</option>
                            {empresas?.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                            ))}
                        </Select>

                        <Select
                            label="Posto (opcional)"
                            value={formData.posto_trabalho_id || ''}
                            onChange={(e) => handleInputChange('posto_trabalho_id', e.target.value || null)}
                        >
                            <option value="">Todos</option>
                            {postos?.map(posto => (
                                <option key={posto.id} value={posto.id}>{posto.nome_posto}</option>
                            ))}
                        </Select>

                        <Select
                            label="Cargo (opcional)"
                            value={formData.cargo_id || ''}
                            onChange={(e) => handleInputChange('cargo_id', e.target.value || null)}
                        >
                            <option value="">Todos</option>
                            {cargos?.map(cargo => (
                                <option key={cargo.id} value={cargo.id}>{cargo.nome_cargo}</option>
                            ))}
                        </Select>
                    </div>

                    {/* Configurações Gerais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select
                            label="Turno"
                            value={formData.turno}
                            onChange={(e) => handleInputChange('turno', e.target.value)}
                        >
                            <option value="DIURNO">Diurno</option>
                            <option value="NOTURNO">Noturno</option>
                            <option value="MISTO">Misto</option>
                        </Select>

                        <Input
                            label="Data de Vigência"
                            type="date"
                            value={formData.data_vigencia}
                            onChange={(e) => handleInputChange('data_vigencia', e.target.value)}
                        />

                        <div>
                            <Select
                                label="Tipo de Alternância"
                                value={formData.tipo_alternancia}
                                onChange={(e) => handleInputChange('tipo_alternancia', e.target.value)}
                            >
                                <option value="NENHUMA">🔒 Escala Fixa (sem alternância)</option>
                                <option value="DIAS_ALTERNADOS_T1">🔄 Dias Alternados T1 - Trabalha 01/01/25 (12x36)</option>
                                <option value="DIAS_ALTERNADOS_T2">🔄 Dias Alternados T2 - Folga 01/01/25 (12x36)</option>
                                <option value="SABADOS_ALTERNADOS_T1">📅 Sábados Alternados T1 - Trabalha 1º sábado</option>
                                <option value="SABADOS_ALTERNADOS_T2">📅 Sábados Alternados T2 - Folga 1º sábado</option>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.tipo_alternancia === 'NENHUMA' && '✓ Escala fixa: trabalha sempre nos mesmos dias'}
                                {formData.tipo_alternancia === 'DIAS_ALTERNADOS_T1' && '✓ Trabalha 1 dia, folga 1 dia (começa trabalhando)'}
                                {formData.tipo_alternancia === 'DIAS_ALTERNADOS_T2' && '✓ Trabalha 1 dia, folga 1 dia (começa folgando)'}
                                {formData.tipo_alternancia === 'SABADOS_ALTERNADOS_T1' && '✓ Trabalha em sábados alternados (1º, 3º, 5º...)'}
                                {formData.tipo_alternancia === 'SABADOS_ALTERNADOS_T2' && '✓ Trabalha em sábados alternados (2º, 4º, 6º...)'}
                            </p>
                        </div>
                    </div>

                    {/* Dias que Trabalha */}
                    <div className="border rounded-lg p-4 bg-blue-50">
                        <h3 className="font-semibold mb-3 text-gray-700">Dias que Trabalha</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Checkbox
                                label="Segunda-feira"
                                checked={formData.trabalha_segunda}
                                onChange={(e) => handleInputChange('trabalha_segunda', e.target.checked)}
                            />
                            <Checkbox
                                label="Terça-feira"
                                checked={formData.trabalha_terca}
                                onChange={(e) => handleInputChange('trabalha_terca', e.target.checked)}
                            />
                            <Checkbox
                                label="Quarta-feira"
                                checked={formData.trabalha_quarta}
                                onChange={(e) => handleInputChange('trabalha_quarta', e.target.checked)}
                            />
                            <Checkbox
                                label="Quinta-feira"
                                checked={formData.trabalha_quinta}
                                onChange={(e) => handleInputChange('trabalha_quinta', e.target.checked)}
                            />
                            <Checkbox
                                label="Sexta-feira"
                                checked={formData.trabalha_sexta}
                                onChange={(e) => handleInputChange('trabalha_sexta', e.target.checked)}
                            />
                            <Checkbox
                                label="Sábado"
                                checked={formData.trabalha_sabado}
                                onChange={(e) => handleInputChange('trabalha_sabado', e.target.checked)}
                            />
                            <Checkbox
                                label="Domingo"
                                checked={formData.trabalha_domingo}
                                onChange={(e) => handleInputChange('trabalha_domingo', e.target.checked)}
                            />
                            <Checkbox
                                label="Feriados"
                                checked={formData.trabalha_feriado}
                                onChange={(e) => handleInputChange('trabalha_feriado', e.target.checked)}
                            />
                        </div>
                    </div>

                    {/* Horários */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-gray-700">Horários de Trabalho</h3>
                        {renderHorarioInputs('horarios_segunda', 'Segunda-feira')}
                        {renderHorarioInputs('horarios_terca', 'Terça-feira')}
                        {renderHorarioInputs('horarios_quarta', 'Quarta-feira')}
                        {renderHorarioInputs('horarios_quinta', 'Quinta-feira')}
                        {renderHorarioInputs('horarios_sexta', 'Sexta-feira')}
                        {renderHorarioInputs('horarios_sabado', 'Sábado')}
                        {renderHorarioInputs('horarios_domingo', 'Domingo')}
                        {renderHorarioInputs('horarios_feriado', 'Feriados')}
                    </div>

                    {/* Observações */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações
                        </label>
                        <textarea
                            value={formData.observacoes}
                            onChange={(e) => handleInputChange('observacoes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Informações adicionais sobre esta escala..."
                        />
                    </div>

                    {/* Ativa */}
                    <Checkbox
                        label="Escala Ativa"
                        checked={formData.ativa}
                        onChange={(e) => handleInputChange('ativa', e.target.checked)}
                    />

                    {/* Botões */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Regra'}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={resetForm} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                        )}
                    </div>
                </form>
            </Card>

            {/* Lista de Regras */}
            <Card>
                <h2 className="text-xl font-semibold mb-4">Regras Cadastradas</h2>
                
                {loading ? (
                    <p>Carregando...</p>
                ) : regras.length === 0 ? (
                    <p className="text-gray-500">Nenhuma regra cadastrada ainda.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('codigo_escala')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Código
                                            {sortField === 'codigo_escala' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('nome_escala')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nome
                                            {sortField === 'nome_escala' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('turno')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Turno
                                            {sortField === 'turno' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('tipo_alternancia')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Alternância
                                            {sortField === 'tipo_alternancia' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('ativa')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {sortField === 'ativa' && (
                                                sortDirection === 'asc' ? 
                                                <ChevronUp className="w-4 h-4" /> : 
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedRegras.map(regra => (
                                    <tr key={regra.id}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{regra.codigo_escala}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{regra.nome_escala}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{regra.turno}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{regra.tipo_alternancia}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs ${regra.ativa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {regra.ativa ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                                                <button
                                                    onClick={() => handleEdit(regra)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => regenerarEscalasMensais(regra)}
                                                    disabled={regenerando === regra.id}
                                                    className="text-green-600 hover:text-green-800 text-xs sm:text-sm disabled:opacity-50 flex items-center gap-1"
                                                    title="Regenerar escalas mensais com os horários atualizados"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${regenerando === regra.id ? 'animate-spin' : ''}`} />
                                                    {regenerando === regra.id ? 'Regenerando...' : 'Regenerar'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(regra.id!)}
                                                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
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

export default ScheduleRules;
