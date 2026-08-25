import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FolhaPontoAutomatica {
  id: string;
  posto_trabalho_id: string;
  nome_posto: string;
  funcionario_id: string;
  nome_funcionario: string;
  data_registro: string;
  primeiro_registro: string | null;
  segundo_registro: string | null;
  terceiro_registro: string | null;
  quarto_registro: string | null;
  latitude_registro: number | null;
  longitude_registro: number | null;
  precisao_metros: number | null;
  validacao_geolocalizacao: boolean;
  distancia_posto_metros: number | null;
  status: 'aberto' | 'finalizado' | 'invalido';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostoTrabalhoQR {
  id: string;
  nome_posto: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  empresa_id: string | null;
}

export function useFolhaPontoAutomatica() {
  const [registros, setRegistros] = useState<FolhaPontoAutomatica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistros = useCallback(async (filtros?: {
    funcionario_id?: string;
    posto_trabalho_id?: string;
    data_inicio?: string;
    data_fim?: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('folha_ponto_automatica')
        .select('*')
        .order('data_registro', { ascending: false })
        .order('created_at', { ascending: false });

      if (filtros?.funcionario_id) {
        query = query.eq('funcionario_id', filtros.funcionario_id);
      }
      if (filtros?.posto_trabalho_id) {
        query = query.eq('posto_trabalho_id', filtros.posto_trabalho_id);
      }
      if (filtros?.data_inicio) {
        query = query.gte('data_registro', filtros.data_inicio);
      }
      if (filtros?.data_fim) {
        query = query.lte('data_registro', filtros.data_fim);
      }
      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRegistros(data as FolhaPontoAutomatica[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrarPonto = async (dados: {
    posto_trabalho_id: string;
    nome_posto: string;
    funcionario_id: string;
    nome_funcionario: string;
    latitude?: number;
    longitude?: number;
    precisao_metros?: number;
    distancia_posto_metros?: number;
    validacao_geolocalizacao?: boolean;
    inconsistencias?: any[];
  }): Promise<{ success: boolean; registro?: FolhaPontoAutomatica; error?: string; tipo?: string }> => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // Para turnos noturnos (ex: 18h-06h), verificar se há registro aberto de ontem
      const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const horaNum = parseInt(horaAtual.split(':')[0], 10);

      // Verificar se já existe registro para hoje (qualquer posto)
      const { data: registrosHoje, error: checkError } = await supabase
        .from('folha_ponto_automatica')
        .select('*')
        .eq('funcionario_id', dados.funcionario_id)
        .eq('data_registro', hoje)
        .order('created_at', { ascending: false });

      if (checkError) {
        throw checkError;
      }

      let registroExistente = registrosHoje && registrosHoje.length > 0 ? registrosHoje[0] : null;

      // Se não há registro hoje E estamos antes das 12h, verificar registro aberto de ontem (turno noturno)
      if (!registroExistente && horaNum < 12) {
        const { data: registrosOntem, error: checkOntemError } = await supabase
          .from('folha_ponto_automatica')
          .select('*')
          .eq('funcionario_id', dados.funcionario_id)
          .eq('data_registro', ontem)
          .eq('status', 'aberto')
          .order('created_at', { ascending: false });

        if (!checkOntemError && registrosOntem && registrosOntem.length > 0) {
          // Encontrou registro aberto de ontem - usar para registrar saída
          registroExistente = registrosOntem[0];
        }
      }

      if (registroExistente) {
        // Atualizar registro existente
        const registro = registroExistente as FolhaPontoAutomatica;
        
        let updateData: Partial<FolhaPontoAutomatica> = {};
        let tipoRegistro = '';

        if (!registro.primeiro_registro) {
          updateData.primeiro_registro = horaAtual;
          tipoRegistro = 'entrada';
        } else if (!registro.quarto_registro) {
          // Pular refeição, ir direto para saída
          updateData.quarto_registro = horaAtual;
          updateData.status = 'finalizado';
          tipoRegistro = 'saida';
        } else {
          return { success: false, error: 'Entrada e saída já foram registradas hoje.' };
        }

        // Atualizar geolocalização se fornecida
        if (dados.latitude !== undefined) updateData.latitude_registro = dados.latitude;
        if (dados.longitude !== undefined) updateData.longitude_registro = dados.longitude;
        if (dados.precisao_metros !== undefined) updateData.precisao_metros = dados.precisao_metros;
        if (dados.distancia_posto_metros !== undefined) updateData.distancia_posto_metros = dados.distancia_posto_metros;
        if (dados.validacao_geolocalizacao !== undefined) updateData.validacao_geolocalizacao = dados.validacao_geolocalizacao;

        const { data: updated, error: updateError } = await supabase
          .from('folha_ponto_automatica')
          .update(updateData)
          .eq('id', registro.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return { 
          success: true, 
          registro: updated as FolhaPontoAutomatica,
          tipo: tipoRegistro
        };
      } else {
        // Criar novo registro
        const novoRegistro: any = {
          posto_trabalho_id: dados.posto_trabalho_id,
          nome_posto: dados.nome_posto,
          funcionario_id: dados.funcionario_id,
          nome_funcionario: dados.nome_funcionario,
          data_registro: hoje,
          primeiro_registro: horaAtual,
          latitude_registro: dados.latitude,
          longitude_registro: dados.longitude,
          precisao_metros: dados.precisao_metros,
          distancia_posto_metros: dados.distancia_posto_metros,
          validacao_geolocalizacao: dados.validacao_geolocalizacao || false,
          status: 'aberto'
        };
        
        // Adicionar inconsistências se existirem
        if (dados.inconsistencias && dados.inconsistencias.length > 0) {
          novoRegistro.inconsistencias = dados.inconsistencias;
        }

        const { data: created, error: createError } = await supabase
          .from('folha_ponto_automatica')
          .insert(novoRegistro)
          .select()
          .single();

        if (createError) throw createError;

        return { 
          success: true, 
          registro: created as FolhaPontoAutomatica,
          tipo: 'entrada'
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const finalizarDiaSemRefeicao = async (registroId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      const { error: updateError } = await supabase
        .from('folha_ponto_automatica')
        .update({
          quarto_registro: horaAtual,
          status: 'finalizado',
          observacoes: 'Dia finalizado sem intervalo de refeição'
        })
        .eq('id', registroId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    registros,
    loading,
    error,
    fetchRegistros,
    registrarPonto,
    finalizarDiaSemRefeicao
  };
}

// Hook para buscar posto de trabalho por ID (para QR Code)
export function usePostoTrabalhoQR() {
  const buscarPosto = async (postoId: string): Promise<PostoTrabalhoQR | null> => {
    try {
      const { data, error } = await supabase
        .from('postos_trabalho')
        .select('id, nome_posto, cnpj, endereco, cidade, estado, latitude, longitude, raio_validacao_metros, empresa_id')
        .eq('id', postoId)
        .single();

      if (error) throw error;
      return data as PostoTrabalhoQR;
    } catch (err) {
      return null;
    }
  };

  return { buscarPosto };
}

// Função para calcular distância entre coordenadas (Haversine)
export function calcularDistanciaKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calcularDistanciaMetros(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  return calcularDistanciaKm(lat1, lon1, lat2, lon2) * 1000;
}
