import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  Coffee,
  LogIn,
  LogOut,
  Building2,
  Calendar,
  History,
  X,
  Loader2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PortalLayout from '../../components/portal/PortalLayout';
import QRCodeScanner from '../../components/QRCodeScanner';
import ConfirmacaoInconsistenciaModal from '../../components/ConfirmacaoInconsistenciaModal';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  useFolhaPontoAutomatica, 
  usePostoTrabalhoQR,
  calcularDistanciaMetros,
  type FolhaPontoAutomatica 
} from '../../hooks/useFolhaPontoAutomatica';
import { 
  validarRegistroPonto, 
  type Inconsistencia, 
  type ResultadoValidacao 
} from '../../hooks/useValidacaoHorarioPonto';

interface FuncionarioData {
  id: string;
  nome_completo: string;
  posto_trabalho_id: string | null;
  empresa_id: string | null;
}

interface DadosPendentes {
  posto: {
    id: string;
    nome_posto: string;
    latitude: number | null;
    longitude: number | null;
    raio_validacao_metros: number | null;
  };
  position: GeolocationPosition | null;
  distancia: number | undefined;
  validacaoGeo: boolean;
  inconsistencias: Inconsistencia[];
}

export default function PortalRegistroPonto() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { registrarPonto, finalizarDiaSemRefeicao, fetchRegistros, registros, loading } = useFolhaPontoAutomatica();
  const { buscarPosto } = usePostoTrabalhoQR();

  const [funcionario, setFuncionario] = useState<FuncionarioData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [registroHoje, setRegistroHoje] = useState<FolhaPontoAutomatica | null>(null);
  const [geolocalizacao, setGeolocalizacao] = useState<{
    latitude: number;
    longitude: number;
    precisao: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  // Estados para modal de confirmação de inconsistência
  const [showModalInconsistencia, setShowModalInconsistencia] = useState(false);
  const [dadosPendentes, setDadosPendentes] = useState<DadosPendentes | null>(null);

  // Buscar dados do funcionário
  useEffect(() => {
    const fetchFuncionario = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('id, nome_completo, posto_trabalho_id, empresa_id')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setFuncionario(data);
      } catch (error: any) {
        showToast('Erro ao carregar dados do funcionário', 'error');
      }
    };

    fetchFuncionario();
  }, [user]);

  // Buscar registros do dia (e de ontem para turnos noturnos)
  useEffect(() => {
    if (funcionario) {
      const hoje = new Date().toISOString().split('T')[0];
      const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      fetchRegistros({ 
        funcionario_id: funcionario.id,
        data_inicio: ontem,
        data_fim: hoje
      });
    }
  }, [funcionario]);

  // Atualizar registro de hoje quando registros mudam (considerar turno noturno)
  useEffect(() => {
    if (registros.length > 0) {
      const hoje = new Date().toISOString().split('T')[0];
      const horaAtual = new Date().getHours();
      
      // Primeiro procurar registro de hoje
      const regHoje = registros.find(r => r.data_registro === hoje);
      
      if (regHoje) {
        setRegistroHoje(regHoje);
      } else if (horaAtual < 12) {
        // Se não há registro hoje e estamos antes das 12h, verificar registro aberto de ontem (turno noturno)
        const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const regOntemAberto = registros.find(r => r.data_registro === ontem && r.status === 'aberto');
        setRegistroHoje(regOntemAberto || null);
      } else {
        setRegistroHoje(null);
      }
    }
  }, [registros]);

  // Determinar próximo tipo de registro (apenas entrada e saída)
  const getProximoTipoRegistro = (): 'entrada' | 'saida' => {
    if (!registroHoje) return 'entrada';
    return 'saida';
  };

  // Obter geolocalização
  const obterGeolocalizacao = useCallback(async (): Promise<GeolocationPosition | null> => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada neste dispositivo');
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        });
      });
      
      setGeolocalizacao({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precisao: position.coords.accuracy
      });
      setGeoError(null);
      return position;
    } catch (error: any) {
      let msg = 'Erro ao obter localização';
      if (error.code === 1) msg = 'Permissão de localização negada';
      if (error.code === 2) msg = 'Localização indisponível';
      if (error.code === 3) msg = 'Tempo esgotado ao obter localização';
      setGeoError(msg);
      return null;
    }
  }, []);

  // Executar o registro de ponto (chamado após confirmação ou se não houver inconsistências)
  // Retorna true se sucesso, false se falhou
  const executarRegistro = async (dados: DadosPendentes): Promise<boolean> => {
    if (!funcionario) return false;
    
    try {
      
      const resultado = await registrarPonto({
        posto_trabalho_id: dados.posto.id,
        nome_posto: dados.posto.nome_posto,
        funcionario_id: funcionario.id,
        nome_funcionario: funcionario.nome_completo,
        latitude: dados.position?.coords.latitude,
        longitude: dados.position?.coords.longitude,
        precisao_metros: dados.position?.coords.accuracy,
        distancia_posto_metros: dados.distancia,
        validacao_geolocalizacao: dados.validacaoGeo,
        inconsistencias: dados.inconsistencias.length > 0 ? dados.inconsistencias : undefined
      });


      if (resultado.success && resultado.registro) {
        const tipoLabels: Record<string, string> = {
          'entrada': dados.inconsistencias.length > 0 
            ? '⚠️ Entrada registrada com inconsistências' 
            : '✅ Entrada registrada',
          'inicio_refeicao': '🍽️ Início de refeição registrado',
          'fim_refeicao': '🍽️ Fim de refeição registrado',
          'saida': dados.inconsistencias.length > 0 
            ? '⚠️ Saída registrada com inconsistências' 
            : '✅ Saída registrada - Dia finalizado!'
        };

        showToast(tipoLabels[resultado.tipo || 'entrada'] || 'Ponto registrado!', 'success');
        setRegistroHoje(resultado.registro);
        
        // Recarregar registros incluindo ontem (para turnos noturnos)
        const hoje = new Date().toISOString().split('T')[0];
        const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        fetchRegistros({ 
          funcionario_id: funcionario.id,
          data_inicio: ontem,
          data_fim: hoje
        });
        return true;
      } else {
        showToast(resultado.error || 'Erro ao registrar ponto', 'error');
        return false;
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao registrar ponto', 'error');
      return false;
    }
  };

  // Handler quando QR Code é lido
  const handleQRCodeScanned = async (data: string) => {
    setShowScanner(false);
    setProcessando(true);

    try {
      // Parsear dados do QR Code
      let qrData: { type: string; id: string; nome: string; cnpj: string; area?: string };
      try {
        qrData = JSON.parse(data);
      } catch {
        throw new Error('QR Code inválido. Este não é um QR Code do FluxPay.');
      }

      if (qrData.type !== 'FLUXPAY_POSTO') {
        throw new Error('QR Code inválido. Este não é um QR Code de posto de trabalho.');
      }

      if (!funcionario) {
        throw new Error('Dados do funcionário não carregados.');
      }

      // Buscar dados do posto lido. Se o QR for de uma área/setor com outro ID,
      // o funcionário pode não ter permissão para ler essa linha específica via RLS.
      // Nesse caso, usamos o posto vinculado ao próprio funcionário quando o CNPJ coincide.
      let posto = await buscarPosto(qrData.id);

      if (!posto && funcionario.posto_trabalho_id) {
        const { data: postoFuncionario, error: postoFuncionarioError } = await supabase
          .from('postos_trabalho')
          .select('id, nome_posto, cnpj, endereco, cidade, estado, latitude, longitude, raio_validacao_metros, empresa_id')
          .eq('id', funcionario.posto_trabalho_id)
          .maybeSingle();

        if (!postoFuncionarioError && postoFuncionario?.cnpj === qrData.cnpj) {
          posto = postoFuncionario;
        }
      }

      if (!posto) {
        throw new Error(`Posto não encontrado ou sem permissão de leitura. ID: ${qrData.id} | CNPJ: ${qrData.cnpj} | Nome: ${qrData.nome}`);
      }

      // Se o funcionário está vinculado a outro ID mas mesmo CNPJ (QR de área),
      // usar o posto_trabalho_id do funcionário para validação evitar falso "POSTO_DIFERENTE"
      let postoIdParaValidacao = posto.id;
      if (funcionario.posto_trabalho_id && funcionario.posto_trabalho_id !== posto.id) {
        const { data: postoFuncionario } = await supabase
          .from('postos_trabalho').select('cnpj').eq('id', funcionario.posto_trabalho_id).single();
        if (postoFuncionario?.cnpj === posto.cnpj) {
          postoIdParaValidacao = funcionario.posto_trabalho_id;
        }
      }

      // Obter geolocalização
      const position = await obterGeolocalizacao();
      
      let validacaoGeo = false;
      let distancia: number | undefined;

      if (position && posto.latitude && posto.longitude) {
        distancia = calcularDistanciaMetros(
          position.coords.latitude,
          position.coords.longitude,
          posto.latitude,
          posto.longitude
        );
        
        const raioValidacao = posto.raio_validacao_metros || 100;
        validacaoGeo = distancia <= raioValidacao;

        if (!validacaoGeo) {
          showToast(
            `Você está a ${Math.round(distancia)}m do posto (limite: ${raioValidacao}m)`,
            'info'
          );
        }
      }

      // Obter horário atual
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // Determinar tipo de registro
      const tipoRegistro = getProximoTipoRegistro();

      // Validar horário e local
      const validacao = await validarRegistroPonto(
        funcionario.id,
        postoIdParaValidacao,
        funcionario.posto_trabalho_id,
        horaAtual,
        tipoRegistro
      );

      // Preparar dados para registro
      const dadosRegistro: DadosPendentes = {
        posto: {
          id: postoIdParaValidacao,
          nome_posto: posto.nome_posto,
          latitude: posto.latitude,
          longitude: posto.longitude,
          raio_validacao_metros: posto.raio_validacao_metros
        },
        position,
        distancia,
        validacaoGeo,
        inconsistencias: validacao.inconsistencias
      };

      // Se houver inconsistências, mostrar modal de confirmação
      if (!validacao.valido && validacao.inconsistencias.length > 0) {
        setDadosPendentes(dadosRegistro);
        setShowModalInconsistencia(true);
        setProcessando(false);
        return;
      }

      // Sem inconsistências - registrar diretamente
      const sucesso = await executarRegistro(dadosRegistro);
      if (!sucesso) {
      }

    } catch (error: any) {
      const msg = error?.message || 'Erro desconhecido ao processar QR Code';
      showToast(msg, 'error');
    } finally {
      if (!showModalInconsistencia) {
        setProcessando(false);
      }
    }
  };

  // Confirmar registro com inconsistências
  const handleConfirmarInconsistencia = async () => {
    if (!dadosPendentes) return;
    
    setProcessando(true);
    try {
      const sucesso = await executarRegistro(dadosPendentes);
      if (sucesso) {
        setShowModalInconsistencia(false);
        setDadosPendentes(null);
      }
      // Se falhou, mantém o modal aberto para o usuário tentar novamente
    } finally {
      setProcessando(false);
    }
  };

  // Cancelar registro com inconsistências
  const handleCancelarInconsistencia = () => {
    setShowModalInconsistencia(false);
    setDadosPendentes(null);
    setProcessando(false);
  };

  // Finalizar dia sem refeição
  const handleFinalizarSemRefeicao = async () => {
    if (!registroHoje) return;
    
    setProcessando(true);
    try {
      const result = await finalizarDiaSemRefeicao(registroHoje.id);
      if (result.success) {
        showToast('Dia finalizado com sucesso!', 'success');
        // Recarregar registros
        if (funcionario) {
          fetchRegistros({ 
            funcionario_id: funcionario.id,
            data_inicio: new Date().toISOString().split('T')[0],
            data_fim: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setProcessando(false);
    }
  };

  // Determinar próximo registro (apenas entrada e saída)
  const getProximoRegistro = () => {
    if (!registroHoje) return { tipo: 'entrada', label: 'Registrar Entrada', icon: LogIn };
    if (!registroHoje.quarto_registro) return { tipo: 'saida', label: 'Registrar Saída', icon: LogOut };
    return null;
  };

  const proximoRegistro = getProximoRegistro();
  const diaFinalizado = registroHoje?.status === 'finalizado';

  return (
    <PortalLayout employeeName={funcionario?.nome_completo}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Registro de Ponto</h1>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code do posto de trabalho
              </p>
            </div>
          </div>
        </Card>

        {/* Status do Dia */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h2>
          </div>

          {registroHoje ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{registroHoje.nome_posto}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TimeSlot 
                  label="Entrada" 
                  time={registroHoje.primeiro_registro} 
                  icon={<LogIn className="w-4 h-4" />}
                />
                <TimeSlot 
                  label="Saída" 
                  time={registroHoje.quarto_registro} 
                  icon={<LogOut className="w-4 h-4" />}
                />
              </div>

              {registroHoje.validacao_geolocalizacao ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <MapPin className="w-4 h-4" />
                  <span>Localização validada</span>
                </div>
              ) : registroHoje.latitude_registro && (
                <div className="flex items-center gap-2 text-sm text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Localização fora do raio ({Math.round(registroHoje.distancia_posto_metros || 0)}m)
                  </span>
                </div>
              )}

              {diaFinalizado && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Dia finalizado</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro hoje</p>
            </div>
          )}
        </Card>

        {/* Scanner e Ações */}
        {showScanner ? (
          <Card>
            <QRCodeScanner 
              onScan={handleQRCodeScanned}
              onError={(err) => showToast(err, 'error')}
              onClose={() => setShowScanner(false)}
            />
          </Card>
        ) : (
          <Card>
            {processando ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Processando registro...</p>
              </div>
            ) : diaFinalizado ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Você já finalizou o dia!
                </p>
                <p className="text-muted-foreground">
                  Volte amanhã para um novo registro
                </p>
              </div>
            ) : proximoRegistro ? (
              <div className="text-center py-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full max-w-xs h-16 text-lg flex items-center justify-center gap-3"
                >
                  <QrCode className="w-6 h-6" />
                  {proximoRegistro.label}
                </Button>

              </div>
            ) : null}

            {geoError && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{geoError}</span>
              </div>
            )}
          </Card>
        )}

        {/* Histórico */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-5 h-5" />
              Últimos Registros
            </h3>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/portal/historico-ponto')}
            >
              Ver todos
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : registros.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum registro encontrado
            </p>
          ) : (
            <div className="space-y-2">
              {registros.slice(0, 5).map(reg => (
                <div 
                  key={reg.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(reg.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">{reg.nome_posto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {reg.primeiro_registro || '--:--'} - {reg.quarto_registro || '--:--'}
                    </p>
                    <p className={`text-xs ${
                      reg.status === 'finalizado' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {reg.status === 'finalizado' ? 'Finalizado' : 'Em aberto'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Confirmação de Inconsistência */}
      {showModalInconsistencia && dadosPendentes && (
        <ConfirmacaoInconsistenciaModal
          inconsistencias={dadosPendentes.inconsistencias}
          onConfirmar={handleConfirmarInconsistencia}
          onCancelar={handleCancelarInconsistencia}
          processando={processando}
        />
      )}
    </PortalLayout>
  );
}

// Componente auxiliar para slots de horário
function TimeSlot({ 
  label, 
  time, 
  icon 
}: { 
  label: string; 
  time: string | null; 
  icon: React.ReactNode;
}) {
  return (
    <div className={`p-2 rounded-lg text-center ${
      time ? 'bg-green-500/10' : 'bg-muted/50'
    }`}>
      <div className={`flex justify-center mb-1 ${
        time ? 'text-green-600' : 'text-muted-foreground'
      }`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm ${
        time ? 'text-green-600 font-semibold' : 'text-muted-foreground'
      }`}>
        {time || '--:--'}
      </p>
    </div>
  );
}
