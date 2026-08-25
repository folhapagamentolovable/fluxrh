import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Edit3, Save, X, Calendar, Clock, Users, Building2,
  Filter, CheckCircle, AlertTriangle, History,
  ChevronDown, ChevronUp, Trash2, CheckSquare, Square, Plus
} from 'lucide-react';

interface RegistroPonto {
  id: string;
  funcionario_id: string;
  posto_trabalho_id: string;
  nome_funcionario: string;
  nome_posto: string;
  data_registro: string;
  primeiro_registro: string | null;
  segundo_registro: string | null;
  terceiro_registro: string | null;
  quarto_registro: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface Funcionario { id: string; nome_completo: string }
interface PostoTrabalho { id: string; nome_posto: string }

// Edições em lote: mapa de id → campos alterados
type LoteEdits = Record<string, Partial<RegistroPonto>>;

const EdicaoRegistrosPonto: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Modo lote
  const [modoLote, setModoLote] = useState(false);
  const [loteEdits, setLoteEdits] = useState<LoteEdits>({});
  const [salvandoLote, setSalvandoLote] = useState(false);

  // Modo edição individual (legado)
  const [editando, setEditando] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RegistroPonto>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  // Histórico
  const [historicoExpandido, setHistoricoExpandido] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Record<string, any[]>>({});

  // Modal de novo registro
  const [showModalNovo, setShowModalNovo] = useState(false);
  const [novoRegistro, setNovoRegistro] = useState({
    funcionario_id: '',
    posto_trabalho_id: '',
    data_registro: new Date().toISOString().split('T')[0],
    primeiro_registro: '',
    segundo_registro: '',
    terceiro_registro: '',
    quarto_registro: '',
    observacoes: '',
  });
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [funcResult, postosResult, registrosResult] = await Promise.all([
        supabase.from('funcionarios').select('id, nome_completo').eq('ativo', true).order('nome_completo'),
        supabase.from('postos_trabalho').select('id, nome_posto').eq('ativo', true).is('local_area', null).order('nome_posto'),
        supabase.from('folha_ponto_automatica')
          .select('*').order('data_registro', { ascending: false }).order('nome_funcionario').limit(500)
      ]);
      if (funcResult.data) setFuncionarios(funcResult.data);
      if (postosResult.data) setPostos(postosResult.data);
      if (registrosResult.data) setRegistros(registrosResult.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getAdminInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data: profile } = await supabase.from('profiles').select('user_name, email').eq('id', user.id).single();
    return { userId: user.id, nome: profile?.user_name || profile?.email || user.email || 'Admin' };
  };

  const criarRegistro = async () => {
    if (!novoRegistro.funcionario_id) { setMensagem({ tipo: 'error', texto: 'Selecione um funcionário.' }); return; }
    if (!novoRegistro.posto_trabalho_id) { setMensagem({ tipo: 'error', texto: 'Selecione um posto.' }); return; }
    if (!novoRegistro.data_registro) { setMensagem({ tipo: 'error', texto: 'Informe a data.' }); return; }
    if (!novoRegistro.primeiro_registro) { setMensagem({ tipo: 'error', texto: 'Informe ao menos o horário de entrada.' }); return; }

    setSalvandoNovo(true);
    setMensagem(null);
    try {
      const func = funcionarios.find(f => f.id === novoRegistro.funcionario_id);
      const posto = postos.find(p => p.id === novoRegistro.posto_trabalho_id);
      const { userId, nome } = await getAdminInfo();

      const status = novoRegistro.quarto_registro ? 'finalizado' : 'aberto';

      const { data: criado, error } = await supabase
        .from('folha_ponto_automatica')
        .insert({
          funcionario_id: novoRegistro.funcionario_id,
          posto_trabalho_id: novoRegistro.posto_trabalho_id,
          nome_funcionario: func?.nome_completo || '',
          nome_posto: posto?.nome_posto || '',
          data_registro: novoRegistro.data_registro,
          primeiro_registro: novoRegistro.primeiro_registro || null,
          segundo_registro: novoRegistro.segundo_registro || null,
          terceiro_registro: novoRegistro.terceiro_registro || null,
          quarto_registro: novoRegistro.quarto_registro || null,
          status,
          observacoes: novoRegistro.observacoes || 'Registro manual pelo administrador',
          validacao_geolocalizacao: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Log da criação manual
      await supabase.from('folha_ponto_alteracoes').insert({
        registro_ponto_id: criado.id,
        campo_alterado: 'CRIACAO_MANUAL',
        valor_anterior: '',
        valor_novo: JSON.stringify({
          primeiro_registro: novoRegistro.primeiro_registro,
          quarto_registro: novoRegistro.quarto_registro,
          status,
        }),
        alterado_por: userId,
        alterado_por_nome: nome,
        motivo: 'Criação manual pelo administrador',
        nome_funcionario: func?.nome_completo || null,
        data_registro: novoRegistro.data_registro || null,
      });

      setMensagem({ tipo: 'success', texto: `Registro criado para ${func?.nome_completo} em ${novoRegistro.data_registro.split('-').reverse().join('/')}!` });
      setShowModalNovo(false);
      setNovoRegistro({
        funcionario_id: '', posto_trabalho_id: '',
        data_registro: new Date().toISOString().split('T')[0],
        primeiro_registro: '', segundo_registro: '',
        terceiro_registro: '', quarto_registro: '', observacoes: '',
      });
      carregarDados();
    } catch (e: any) {
      setMensagem({ tipo: 'error', texto: `Erro ao criar: ${e.message}` });
    } finally {
      setSalvandoNovo(false);
    }
  };

  const registrarAlteracoes = async (
    registroId: string,
    original: RegistroPonto,
    atualizado: Partial<RegistroPonto>,
    userId: string,
    nomeAdmin: string
  ) => {
    const campos = ['primeiro_registro', 'segundo_registro', 'terceiro_registro', 'quarto_registro', 'status', 'observacoes'] as const;
    for (const campo of campos) {
      if (original[campo] !== atualizado[campo] && atualizado[campo] !== undefined) {
        await supabase.from('folha_ponto_alteracoes').insert({
          registro_ponto_id: registroId,
          campo_alterado: campo,
          valor_anterior: String(original[campo] || ''),
          valor_novo: String(atualizado[campo] || ''),
          alterado_por: userId,
          alterado_por_nome: nomeAdmin,
          motivo: 'Ajuste manual pelo administrador',
          nome_funcionario: original.nome_funcionario || null,
          data_registro: original.data_registro || null,
        });
      }
    }
  };

  // ── Edição individual ──────────────────────────────────────
  const iniciarEdicao = (registro: RegistroPonto) => {
    setEditando(registro.id);
    setFormData({
      primeiro_registro: registro.primeiro_registro,
      segundo_registro: registro.segundo_registro,
      terceiro_registro: registro.terceiro_registro,
      quarto_registro: registro.quarto_registro,
      status: registro.status,
      observacoes: registro.observacoes
    });
  };

  const cancelarEdicao = () => { setEditando(null); setFormData({}); };

  const salvarEdicao = async (registroId: string) => {
    setSalvando(registroId);
    setMensagem(null);
    try {
      const original = registros.find(r => r.id === registroId)!;
      const { userId, nome } = await getAdminInfo();
      const novoStatus = (formData.primeiro_registro && formData.quarto_registro) ? 'finalizado' : (formData.status || original.status);
      const updateData = {
        primeiro_registro: formData.primeiro_registro || null,
        segundo_registro: formData.segundo_registro || null,
        terceiro_registro: formData.terceiro_registro || null,
        quarto_registro: formData.quarto_registro || null,
        status: novoStatus,
        observacoes: formData.observacoes || null
      };
      const { error } = await supabase.from('folha_ponto_automatica').update(updateData).eq('id', registroId);
      if (error) throw error;
      await registrarAlteracoes(registroId, original, updateData, userId, nome);
      setMensagem({ tipo: 'success', texto: 'Registro atualizado!' });
      setEditando(null);
      setFormData({});
      carregarDados();
    } catch (e: any) {
      setMensagem({ tipo: 'error', texto: `Erro: ${e.message}` });
    } finally {
      setSalvando(null);
    }
  };

  // ── Excluir ────────────────────────────────────────────────
  const excluirRegistro = async (registro: RegistroPonto) => {
    if (!confirm(`Excluir o registro de ${registro.nome_funcionario} em ${formatarData(registro.data_registro)}?\n\nEsta ação não pode ser desfeita.`)) return;
    setMensagem(null);
    try {
      const { userId, nome } = await getAdminInfo();
      // Log antes de excluir
      await supabase.from('folha_ponto_alteracoes').insert({
        registro_ponto_id: registro.id,
        campo_alterado: 'EXCLUSAO',
        valor_anterior: JSON.stringify({
          primeiro_registro: registro.primeiro_registro,
          quarto_registro: registro.quarto_registro,
          status: registro.status
        }),
        valor_novo: 'EXCLUÍDO',
        alterado_por: userId,
        alterado_por_nome: nome,
        motivo: 'Exclusão manual pelo administrador',
        nome_funcionario: registro.nome_funcionario || null,
        data_registro: registro.data_registro || null,
      });
      const { error } = await supabase.from('folha_ponto_automatica').delete().eq('id', registro.id);
      if (error) throw error;
      setMensagem({ tipo: 'success', texto: 'Registro excluído.' });
      carregarDados();
    } catch (e: any) {
      setMensagem({ tipo: 'error', texto: `Erro ao excluir: ${e.message}` });
    }
  };

  // ── Edição em lote ─────────────────────────────────────────
  const toggleModoLote = () => {
    setModoLote(v => !v);
    setLoteEdits({});
    setEditando(null);
  };

  const updateLote = (id: string, campo: keyof RegistroPonto, valor: string | null) => {
    setLoteEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [campo]: valor }
    }));
  };

  const getLoteValue = (registro: RegistroPonto, campo: keyof RegistroPonto): string => {
    const edit = loteEdits[registro.id];
    const val = edit && campo in edit ? edit[campo] : registro[campo];
    return (val as string) || '';
  };

  const salvarLote = async () => {
    const ids = Object.keys(loteEdits);
    if (ids.length === 0) { setMensagem({ tipo: 'error', texto: 'Nenhuma alteração para salvar.' }); return; }
    setSalvandoLote(true);
    setMensagem(null);
    try {
      const { userId, nome } = await getAdminInfo();
      let salvos = 0;
      for (const id of ids) {
        const original = registros.find(r => r.id === id)!;
        const edits = loteEdits[id];
        const novoStatus = (edits.primeiro_registro && edits.quarto_registro) ? 'finalizado' : (edits.status || original.status);
        const updateData = {
          primeiro_registro: edits.primeiro_registro !== undefined ? (edits.primeiro_registro || null) : original.primeiro_registro,
          segundo_registro: edits.segundo_registro !== undefined ? (edits.segundo_registro || null) : original.segundo_registro,
          terceiro_registro: edits.terceiro_registro !== undefined ? (edits.terceiro_registro || null) : original.terceiro_registro,
          quarto_registro: edits.quarto_registro !== undefined ? (edits.quarto_registro || null) : original.quarto_registro,
          status: novoStatus,
          observacoes: edits.observacoes !== undefined ? (edits.observacoes || null) : original.observacoes,
        };
        const { error } = await supabase.from('folha_ponto_automatica').update(updateData).eq('id', id);
        if (error) throw error;
        await registrarAlteracoes(id, original, updateData, userId, nome);
        salvos++;
      }
      setMensagem({ tipo: 'success', texto: `${salvos} registro(s) salvos com sucesso!` });
      setLoteEdits({});
      carregarDados();
    } catch (e: any) {
      setMensagem({ tipo: 'error', texto: `Erro ao salvar lote: ${e.message}` });
    } finally {
      setSalvandoLote(false);
    }
  };

  // ── Histórico ──────────────────────────────────────────────
  const carregarHistorico = async (registroId: string) => {
    if (historicoExpandido === registroId) { setHistoricoExpandido(null); return; }
    const { data } = await supabase.from('folha_ponto_alteracoes').select('*')
      .eq('registro_ponto_id', registroId).order('created_at', { ascending: false });
    setHistorico(prev => ({ ...prev, [registroId]: data || [] }));
    setHistoricoExpandido(registroId);
  };

  const registrosFiltrados = registros.filter(r => {
    if (filtroFuncionario && r.funcionario_id !== filtroFuncionario) return false;
    if (filtroPosto && r.posto_trabalho_id !== filtroPosto) return false;
    if (filtroDataInicio && r.data_registro < filtroDataInicio) return false;
    if (filtroDataFim && r.data_registro > filtroDataFim) return false;
    if (filtroStatus && r.status !== filtroStatus) return false;
    return true;
  });

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const formatarHora = (hora: string | null) => hora ? hora.substring(0, 5) : '-';
  const getStatusBadge = (status: string) => ({
    aberto: 'bg-blue-100 text-blue-800', finalizado: 'bg-green-100 text-green-800',
    invalido: 'bg-red-100 text-red-800', rejeitado: 'bg-gray-100 text-gray-800'
  }[status] || 'bg-gray-100 text-gray-800');

  const alteracoesLote = Object.keys(loteEdits).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edição de Registros de Ponto</h1>
          <p className="text-gray-600 dark:text-gray-400">Ajustar, excluir e editar registros em lote</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModalNovo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Registro
          </button>
          <button
            onClick={toggleModoLote}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modoLote
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            {modoLote ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {modoLote ? 'Sair do modo lote' : 'Edição em lote'}
          </button>
          {modoLote && alteracoesLote > 0 && (
            <button
              onClick={salvarLote}
              disabled={salvandoLote}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {salvandoLote ? 'Salvando...' : `Salvar ${alteracoesLote} registro(s)`}
            </button>
          )}
        </div>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          mensagem.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{mensagem.texto}</span>
          <button onClick={() => setMensagem(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Banner modo lote */}
      {modoLote && (
        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-800 dark:text-purple-300">
          <CheckSquare className="w-4 h-4 flex-shrink-0" />
          <span>Modo lote ativo — edite os campos diretamente nas linhas. Clique em "Salvar N registro(s)" quando terminar.</span>
          {alteracoesLote > 0 && <span className="ml-auto font-semibold">{alteracoesLote} linha(s) modificada(s)</span>}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Funcionário', value: filtroFuncionario, onChange: setFiltroFuncionario, options: funcionarios.map(f => ({ value: f.id, label: f.nome_completo })) },
            { label: 'Posto', value: filtroPosto, onChange: setFiltroPosto, options: postos.map(p => ({ value: p.id, label: p.nome_posto })) },
          ].map(({ label, value, onChange, options }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">Todos</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="finalizado">Finalizado</option>
              <option value="invalido">Inválido</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">{registrosFiltrados.length} registro(s) encontrado(s)</h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {registrosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
          ) : registrosFiltrados.map(registro => {
            const emEdicaoIndividual = editando === registro.id;
            const temEdicaoLote = !!loteEdits[registro.id];

            return (
              <div key={registro.id} className={`p-4 transition-colors ${temEdicaoLote ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{registro.nome_funcionario}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Building2 className="w-4 h-4" /><span>{registro.nome_posto}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" /><span>{formatarData(registro.data_registro)}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(registro.status)}`}>
                      {registro.status}
                    </span>
                    {temEdicaoLote && <span className="text-xs text-purple-600 font-medium">● modificado</span>}
                  </div>

                  {/* Botões de ação */}
                  {!modoLote && (
                    <div className="flex gap-2">
                      {!emEdicaoIndividual ? (
                        <>
                          <button onClick={() => iniciarEdicao(registro)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                            <Edit3 className="w-4 h-4" /> Editar
                          </button>
                          <button onClick={() => carregarHistorico(registro.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                            <History className="w-4 h-4" />
                            {historicoExpandido === registro.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button onClick={() => excluirRegistro(registro)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => salvarEdicao(registro.id)} disabled={!!salvando}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
                            <Save className="w-4 h-4" />{salvando === registro.id ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={cancelarEdicao}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                            <X className="w-4 h-4" /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Campos de horário */}
                {(modoLote || emEdicaoIndividual) ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {([
                      { campo: 'primeiro_registro', label: 'Entrada' },
                      { campo: 'segundo_registro', label: 'Iní. Ref.' },
                      { campo: 'terceiro_registro', label: 'Fim Ref.' },
                      { campo: 'quarto_registro', label: 'Saída' },
                    ] as const).map(({ campo, label }) => (
                      <div key={campo}>
                        <label className="block text-xs text-gray-500 mb-1">{label}</label>
                        <input type="time"
                          value={modoLote ? getLoteValue(registro, campo) : (formData[campo] || '')}
                          onChange={e => modoLote
                            ? updateLote(registro.id, campo, e.target.value || null)
                            : setFormData(prev => ({ ...prev, [campo]: e.target.value || null }))
                          }
                          className={`w-full px-2 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            modoLote && loteEdits[registro.id]?.[campo] !== undefined
                              ? 'border-purple-400 ring-1 ring-purple-300'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Observações</label>
                      <input type="text"
                        value={modoLote ? getLoteValue(registro, 'observacoes') : (formData.observacoes || '')}
                        onChange={e => modoLote
                          ? updateLote(registro.id, 'observacoes', e.target.value || null)
                          : setFormData(prev => ({ ...prev, observacoes: e.target.value }))
                        }
                        placeholder="Motivo"
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          modoLote && loteEdits[registro.id]?.observacoes !== undefined
                            ? 'border-purple-400 ring-1 ring-purple-300'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Entrada', hora: registro.primeiro_registro, color: 'text-green-500' },
                      { label: 'Iní. Ref.', hora: registro.segundo_registro, color: 'text-yellow-500' },
                      { label: 'Fim Ref.', hora: registro.terceiro_registro, color: 'text-orange-500' },
                      { label: 'Saída', hora: registro.quarto_registro, color: 'text-red-500' },
                    ].map(({ label, hora, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${color}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{label}: <strong>{formatarHora(hora)}</strong></span>
                      </div>
                    ))}
                  </div>
                )}

                {registro.observacoes && !emEdicaoIndividual && !modoLote && (
                  <p className="mt-2 text-xs text-gray-500 italic">📝 {registro.observacoes}</p>
                )}

                {/* Histórico */}
                {historicoExpandido === registro.id && historico[registro.id] && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <History className="w-4 h-4" /> Histórico de Alterações
                    </h4>
                    {historico[registro.id].length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhuma alteração registrada.</p>
                    ) : historico[registro.id].map((alt: any) => (
                      <div key={alt.id} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 mb-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{alt.campo_alterado}</span>
                          <span className="text-gray-400">{new Date(alt.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {(alt.nome_funcionario || alt.data_registro) && (
                          <div className="text-gray-500 mt-0.5">
                            {alt.nome_funcionario && <span className="font-medium text-gray-600">{alt.nome_funcionario}</span>}
                            {alt.nome_funcionario && alt.data_registro && <span className="mx-1">·</span>}
                            {alt.data_registro && <span>{new Date(alt.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          </div>
                        )}
                        <div className="text-gray-500 mt-1">
                          <span className="text-red-500 line-through">{alt.valor_anterior || '-'}</span>
                          {' → '}
                          <span className="text-green-600">{alt.valor_novo || '-'}</span>
                        </div>
                        <div className="text-gray-400 mt-1">Por: {alt.alterado_por_nome} | {alt.motivo}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Novo Registro Manual */}
      {showModalNovo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Novo Registro de Ponto
              </h3>
              <button onClick={() => setShowModalNovo(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funcionário *</label>
                <select
                  value={novoRegistro.funcionario_id}
                  onChange={e => setNovoRegistro(p => ({ ...p, funcionario_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Selecione...</option>
                  {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posto *</label>
                <select
                  value={novoRegistro.posto_trabalho_id}
                  onChange={e => setNovoRegistro(p => ({ ...p, posto_trabalho_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Selecione...</option>
                  {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                <input
                  type="date"
                  value={novoRegistro.data_registro}
                  onChange={e => setNovoRegistro(p => ({ ...p, data_registro: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { campo: 'primeiro_registro', label: 'Entrada *' },
                  { campo: 'segundo_registro',  label: 'Início Refeição' },
                  { campo: 'terceiro_registro', label: 'Fim Refeição' },
                  { campo: 'quarto_registro',   label: 'Saída' },
                ].map(({ campo, label }) => (
                  <div key={campo}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="time"
                      value={(novoRegistro as any)[campo] || ''}
                      onChange={e => setNovoRegistro(p => ({ ...p, [campo]: e.target.value || null }))}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <input
                  type="text"
                  value={novoRegistro.observacoes}
                  onChange={e => setNovoRegistro(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Motivo do registro manual..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={criarRegistro}
                disabled={salvandoNovo}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {salvandoNovo ? 'Salvando...' : 'Criar Registro'}
              </button>
              <button
                onClick={() => setShowModalNovo(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EdicaoRegistrosPonto;
