import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Clock, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  validacao_geolocalizacao: boolean;
  distancia_posto_metros: number | null;
  observacoes: string | null;
}

interface Alteracao {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  motivo: string;
  alterado_por_nome: string;
  created_at: string;
}

interface Props {
  registro: RegistroPonto;
  onClose: () => void;
  onSave: () => void;
}

const EditarRegistroPontoModal: React.FC<Props> = ({ registro, onClose, onSave }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [historico, setHistorico] = useState<Alteracao[]>([]);
  const [activeTab, setActiveTab] = useState<'editar' | 'historico'>('editar');
  
  // Form state
  const [primeiroRegistro, setPrimeiroRegistro] = useState(registro.primeiro_registro?.substring(0, 5) || '');
  const [segundoRegistro, setSegundoRegistro] = useState(registro.segundo_registro?.substring(0, 5) || '');
  const [terceiroRegistro, setTerceiroRegistro] = useState(registro.terceiro_registro?.substring(0, 5) || '');
  const [quartoRegistro, setQuartoRegistro] = useState(registro.quarto_registro?.substring(0, 5) || '');
  const [status, setStatus] = useState(registro.status);
  const [observacoes, setObservacoes] = useState(registro.observacoes || '');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    carregarHistorico();
  }, [registro.id]);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const { data, error } = await supabase
        .from('folha_ponto_alteracoes')
        .select('*')
        .eq('registro_ponto_id', registro.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
    } finally {
      setLoadingHistorico(false);
    }
  };

  const formatarHora = (hora: string | null) => {
    if (!hora) return '';
    return hora.substring(0, 5);
  };

  const getNomeCampo = (campo: string) => {
    const nomes: Record<string, string> = {
      primeiro_registro: 'Entrada',
      segundo_registro: 'Início Refeição',
      terceiro_registro: 'Fim Refeição',
      quarto_registro: 'Saída',
      status: 'Status',
      observacoes: 'Observações'
    };
    return nomes[campo] || campo;
  };

  const registrarAlteracao = async (campo: string, valorAnterior: string | null, valorNovo: string | null) => {
    if (valorAnterior === valorNovo) return;
    
    await supabase.from('folha_ponto_alteracoes').insert({
      registro_ponto_id: registro.id,
      campo_alterado: campo,
      valor_anterior: valorAnterior || null,
      valor_novo: valorNovo || null,
      motivo,
      alterado_por: user?.id || '',
      alterado_por_nome: profile?.user_name || profile?.email || user?.email || 'Administrador'
    });
  };

  const handleSave = async () => {
    if (!motivo.trim()) {
      alert('É obrigatório informar o motivo da alteração.');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<RegistroPonto> = {};
      const alteracoes: { campo: string; anterior: string | null; novo: string | null }[] = [];

      // Verificar cada campo alterado
      if (primeiroRegistro !== formatarHora(registro.primeiro_registro)) {
        updates.primeiro_registro = primeiroRegistro || null;
        alteracoes.push({
          campo: 'primeiro_registro',
          anterior: registro.primeiro_registro,
          novo: primeiroRegistro || null
        });
      }

      if (segundoRegistro !== formatarHora(registro.segundo_registro)) {
        updates.segundo_registro = segundoRegistro || null;
        alteracoes.push({
          campo: 'segundo_registro',
          anterior: registro.segundo_registro,
          novo: segundoRegistro || null
        });
      }

      if (terceiroRegistro !== formatarHora(registro.terceiro_registro)) {
        updates.terceiro_registro = terceiroRegistro || null;
        alteracoes.push({
          campo: 'terceiro_registro',
          anterior: registro.terceiro_registro,
          novo: terceiroRegistro || null
        });
      }

      if (quartoRegistro !== formatarHora(registro.quarto_registro)) {
        updates.quarto_registro = quartoRegistro || null;
        alteracoes.push({
          campo: 'quarto_registro',
          anterior: registro.quarto_registro,
          novo: quartoRegistro || null
        });
      }

      if (status !== registro.status) {
        updates.status = status;
        alteracoes.push({
          campo: 'status',
          anterior: registro.status,
          novo: status
        });
      }

      if (observacoes !== (registro.observacoes || '')) {
        updates.observacoes = observacoes || null;
        alteracoes.push({
          campo: 'observacoes',
          anterior: registro.observacoes,
          novo: observacoes || null
        });
      }

      if (Object.keys(updates).length === 0) {
        alert('Nenhuma alteração foi feita.');
        return;
      }

      // Atualizar o registro
      const { error: updateError } = await supabase
        .from('folha_ponto_automatica')
        .update(updates)
        .eq('id', registro.id);

      if (updateError) throw updateError;

      // Registrar todas as alterações
      for (const alt of alteracoes) {
        await registrarAlteracao(alt.campo, alt.anterior, alt.novo);
      }

      onSave();
    } catch (error: any) {
      alert('Erro ao salvar alterações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editar Registro de Ponto</h2>
            <p className="text-sm text-gray-600">
              {registro.nome_funcionario} - {new Date(registro.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('editar')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'editar'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Editar Horários
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'historico'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Histórico ({historico.length})
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'editar' ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entrada
                  </label>
                  <input
                    type="time"
                    value={primeiroRegistro}
                    onChange={(e) => setPrimeiroRegistro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Início Refeição
                  </label>
                  <input
                    type="time"
                    value={segundoRegistro}
                    onChange={(e) => setSegundoRegistro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fim Refeição
                  </label>
                  <input
                    type="time"
                    value={terceiroRegistro}
                    onChange={(e) => setTerceiroRegistro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saída
                  </label>
                  <input
                    type="time"
                    value={quartoRegistro}
                    onChange={(e) => setQuartoRegistro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="aberto">Aberto</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="invalido">Inválido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Observações sobre o registro..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Motivo da alteração *</p>
                    <p className="text-xs text-amber-700 mb-2">
                      É obrigatório informar o motivo para rastreabilidade.
                    </p>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      placeholder="Ex: Correção de horário informado errado pelo funcionário"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma alteração registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((alt) => (
                    <div key={alt.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {getNomeCampo(alt.campo_alterado)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatarDataHora(alt.created_at)}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="text-red-600 line-through">{alt.valor_anterior || '(vazio)'}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-medium">{alt.valor_novo || '(vazio)'}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Motivo:</span> {alt.motivo}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Por: {alt.alterado_por_nome}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'editar' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !motivo.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditarRegistroPontoModal;
