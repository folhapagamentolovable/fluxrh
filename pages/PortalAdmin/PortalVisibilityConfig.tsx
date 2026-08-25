import React, { useState, useEffect } from 'react';
import { Settings, Save, Eye, EyeOff, Calendar, FileText, Gift, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface VisibilityConfig {
  id: number;
  tipo_documento: 'holerites' | 'beneficios';
  mes_limite: number;
  ano_limite: number;
  meses_retroativos: number;
  ativo: boolean;
  observacoes: string | null;
}

const PortalVisibilityConfig: React.FC = () => {
  const [configs, setConfigs] = useState<VisibilityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('portal_visibility_config')
        .select('*')
        .order('tipo_documento');


      if (error) {
        throw error;
      }
      
      setConfigs(data || []);
    } catch (error) {
      showToast(`Erro ao carregar configurações: ${(error as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (id: number, field: keyof VisibilityConfig, value: any) => {
    setConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  const saveConfigs = async () => {
    try {
      setSaving(true);
      
      for (const config of configs) {
        
        const updateData = {
          mes_limite: config.mes_limite,
          ano_limite: config.ano_limite,
          meses_retroativos: config.meses_retroativos,
          ativo: config.ativo,
          observacoes: config.observacoes
        };
        
        
        const { data, error } = await supabase
          .from('portal_visibility_config')
          .update(updateData)
          .eq('id', config.id)
          .select();


        if (error) {
          throw error;
        }
      }

      showToast('Configurações salvas com sucesso!', 'success');
      
      // Recarregar as configurações para garantir que estão atualizadas
      await fetchConfigs();
    } catch (error) {
      showToast(`Erro ao salvar configurações: ${(error as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getDocumentIcon = (tipo: string) => {
    return tipo === 'holerites' ? FileText : Gift;
  };

  const getDocumentLabel = (tipo: string) => {
    return tipo === 'holerites' ? 'Holerites' : 'Recibos de Benefícios';
  };

  const calculateDateRange = (config: VisibilityConfig) => {
    const dataLimite = new Date(config.ano_limite, config.mes_limite - 1, 1);
    const dataInicio = new Date(dataLimite);
    dataInicio.setMonth(dataInicio.getMonth() - config.meses_retroativos + 1);
    
    return {
      inicio: `${String(dataInicio.getMonth() + 1).padStart(2, '0')}/${dataInicio.getFullYear()}`,
      fim: `${String(config.mes_limite).padStart(2, '0')}/${config.ano_limite}`
    };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-7 h-7" />
            Configurações do Portal do Funcionário
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle quais documentos são exibidos no portal dos funcionários
          </p>
        </div>
        
        <Button 
          onClick={saveConfigs} 
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Informações importantes */}
      <Card className="p-4 border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800 mb-1">Importante</h3>
            <p className="text-sm text-amber-700">
              Essas configurações controlam quais holerites e recibos de benefícios os funcionários 
              podem visualizar no portal. Os documentos serão exibidos do período inicial calculado 
              até o mês/ano limite definido.
            </p>
          </div>
        </div>
      </Card>

      {/* Configurações */}
      <div className="grid gap-6">
        {configs.map((config) => {
          const Icon = getDocumentIcon(config.tipo_documento);
          const dateRange = calculateDateRange(config);
          
          return (
            <Card key={config.id} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    config.tipo_documento === 'holerites' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {getDocumentLabel(config.tipo_documento)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Período visível: {dateRange.inicio} até {dateRange.fim}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => updateConfig(config.id, 'ativo', !config.ativo)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    config.ativo 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {config.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Mês Limite */}
                <div>
                  <label htmlFor={`mes-limite-${config.id}`} className="block text-sm font-medium text-foreground mb-2">
                    Mês Limite
                  </label>
                  <select
                    id={`mes-limite-${config.id}`}
                    value={config.mes_limite}
                    onChange={(e) => updateConfig(config.id, 'mes_limite', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={!config.ativo}
                  >
                    {meses.map(mes => (
                      <option key={mes.value} value={mes.value}>
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ano Limite */}
                <div>
                  <label htmlFor={`ano-limite-${config.id}`} className="block text-sm font-medium text-foreground mb-2">
                    Ano Limite
                  </label>
                  <select
                    id={`ano-limite-${config.id}`}
                    value={config.ano_limite}
                    onChange={(e) => updateConfig(config.id, 'ano_limite', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={!config.ativo}
                  >
                    {anos.map(ano => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Meses Retroativos */}
                <div>
                  <label htmlFor={`meses-retroativos-${config.id}`} className="block text-sm font-medium text-foreground mb-2">
                    Meses Retroativos
                  </label>
                  <input
                    id={`meses-retroativos-${config.id}`}
                    type="number"
                    min="1"
                    max="60"
                    value={config.meses_retroativos}
                    onChange={(e) => updateConfig(config.id, 'meses_retroativos', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={!config.ativo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Quantos meses para trás exibir
                  </p>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label htmlFor={`observacoes-${config.id}`} className="block text-sm font-medium text-foreground mb-2">
                  Observações
                </label>
                <textarea
                  id={`observacoes-${config.id}`}
                  value={config.observacoes || ''}
                  onChange={(e) => updateConfig(config.id, 'observacoes', e.target.value)}
                  placeholder="Observações sobre esta configuração..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                  rows={2}
                  disabled={!config.ativo}
                />
              </div>

              {/* Preview do período */}
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Período de exibição:</span>
                  <span className="text-muted-foreground">
                    {dateRange.inicio} até {dateRange.fim} ({config.meses_retroativos} meses)
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PortalVisibilityConfig;