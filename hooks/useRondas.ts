// ============================================================
// useRondas — ADAPTADOR
// Mantém a API pública das telas existentes (/rondas/*, PortalHome)
// mas internamente usa as tabelas rq_* do sistema avançado.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Tipos públicos (compatíveis com o código existente) ─────
export interface PontoQRCode {
  id: string;
  nome: string;
  numero_sequencial: number;
  tipo: 'pai' | 'filho';
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface HorarioRonda {
  id: string;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  intervalo_entre_qrcodes_minutos: number;
  tolerancia_minutos_antes: number;
  tolerancia_minutos_depois: number;
  dias_semana: string[];
  pontos_ids: string[];
  funcionarios_ids: string[];
  ativo: boolean;
  criado_em: string;
}

export interface PausaRonda {
  id: string;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: string[];
  ativo: boolean;
}

export interface SessaoRonda {
  id: string;
  funcionario_id: string;
  horario_id: string | null;
  data_ronda: string;
  status: 'em_andamento' | 'concluida' | 'incompleta';
  iniciada_em: string;
  finalizada_em: string | null;
  funcionario?: { nome_completo: string };
  horario?: { nome: string };
}

export interface LeituraRonda {
  id: string;
  sessao_id: string;
  ponto_id: string;
  funcionario_id: string;
  lido_em: string;
  previsto_em: string | null;
  status: 'no_prazo' | 'antecipado' | 'atrasado' | 'nao_realizado';
  diferenca_minutos: number;
  observacao: string | null;
  ponto?: { nome: string; tipo: string; numero_sequencial: number };
  funcionario?: { nome_completo: string };
}

// ── Mapeadores rq_* → tipos públicos ────────────────────────
const mapPonto = (p: any): PontoQRCode => ({
  id: p.id,
  nome: p.nome,
  numero_sequencial: p.ordem ?? 1,
  tipo: (p.tipo as 'pai' | 'filho') ?? 'filho',
  descricao: p.descricao ?? null,
  ativo: p.ativo ?? true,
  criado_em: p.created_at,
});

const mapRotaParaHorario = (r: any): HorarioRonda => ({
  id: r.id,
  nome: r.nome,
  hora_inicio: (r.hora_inicio || '00:00:00').substring(0, 5),
  hora_fim: (r.hora_fim || '00:00:00').substring(0, 5),
  intervalo_entre_qrcodes_minutos: r.intervalo_pontos_minutos ?? 15,
  tolerancia_minutos_antes: r.tolerancia_minutos ?? 5,
  tolerancia_minutos_depois: r.tolerancia_minutos ?? 10,
  dias_semana: r.dias_semana ?? ['seg', 'ter', 'qua', 'qui', 'sex'],
  pontos_ids: r.pontos_ids ?? [],
  funcionarios_ids: r.funcionarios_ids ?? [],
  ativo: r.ativo ?? true,
  criado_em: r.created_at,
});

const mapExecucaoParaSessao = (e: any): SessaoRonda => ({
  id: e.id,
  funcionario_id: e.funcionario_id,
  horario_id: e.rota_id ?? null,
  data_ronda: e.iniciada_em ? e.iniciada_em.substring(0, 10) : new Date().toISOString().split('T')[0],
  status: e.status === 'em_andamento' ? 'em_andamento'
    : e.status === 'concluida' ? 'concluida' : 'incompleta',
  iniciada_em: e.iniciada_em,
  finalizada_em: e.finalizada_em ?? null,
  funcionario: e.funcionario ? { nome_completo: e.funcionario.nome_completo } : undefined,
  horario: e.rota ? { nome: e.rota.nome } : undefined,
});

const mapLeitura = (l: any): LeituraRonda => {
  const statusMap: Record<string, LeituraRonda['status']> = {
    no_prazo: 'no_prazo',
    adiantado: 'antecipado',
    atrasado: 'atrasado',
    nao_realizado: 'nao_realizado',
    fora_de_ordem: 'atrasado',
    invalido: 'nao_realizado',
  };
  return {
    id: l.id,
    sessao_id: l.execucao_id,
    ponto_id: l.ponto_id,
    funcionario_id: l.funcionario_id,
    lido_em: l.horario_leitura ?? l.created_at,
    previsto_em: l.horario_previsto ?? null,
    status: statusMap[l.status] ?? 'no_prazo',
    diferenca_minutos: Math.round((l.diferenca_segundos ?? 0) / 60),
    observacao: l.observacao ?? null,
    ponto: l.ponto ? { nome: l.ponto.nome, tipo: l.ponto.tipo ?? 'filho', numero_sequencial: l.ponto.ordem ?? 1 } : undefined,
    funcionario: l.funcionario ? { nome_completo: l.funcionario.nome_completo } : undefined,
  };
};

// ── Pontos QR Code (rq_pontos_ronda) ────────────────────────
export function usePontosQRCode(postoTrabalhoId?: string | null) {
  const [pontos, setPontos] = useState<PontoQRCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('rq_pontos_ronda').select('*').order('ordem');
    if (postoTrabalhoId) query = query.eq('posto_trabalho_id', postoTrabalhoId);
    const { data } = await query;
    setPontos((data || []).map(mapPonto));
    setLoading(false);
  }, [postoTrabalhoId]);

  useEffect(() => { fetch(); }, [fetch]);

  const salvar = async (ponto: Partial<PontoQRCode> & { posto_trabalho_id?: string }) => {
    const postoId = ponto.posto_trabalho_id || postoTrabalhoId;
    if (!postoId) throw new Error('Selecione um Posto de Trabalho antes de salvar.');

    const payload: any = {
      nome: ponto.nome,
      tipo: ponto.tipo ?? 'filho',
      descricao: ponto.descricao,
      ativo: ponto.ativo ?? true,
      ordem: ponto.numero_sequencial ?? 1,
      posto_trabalho_id: postoId,
      codigo: (ponto as any).codigo || `RQ-${Date.now()}`,
    };

    if (ponto.id) {
      const { error } = await supabase.from('rq_pontos_ronda').update(payload).eq('id', ponto.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('rq_pontos_ronda').insert(payload);
      if (error) throw error;
    }
    await fetch();
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('rq_pontos_ronda').delete().eq('id', id);
    if (error) throw error;
    await fetch();
  };

  const reordenar = async (lista: PontoQRCode[]) => {
    const updates = lista.map((p, i) =>
      supabase.from('rq_pontos_ronda').update({ ordem: i + 1 }).eq('id', p.id)
    );
    await Promise.all(updates);
    await fetch();
  };

  return { pontos, loading, fetch, salvar, remover, reordenar };
}

// ── Ordenação para turno noturno ─────────────────────────────
function ordenarTurnoNoturno(lista: HorarioRonda[]): HorarioRonda[] {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const sortKey = (h: HorarioRonda) => {
    const min = toMinutes(h.hora_inicio);
    if (min >= 19 * 60) return min - 19 * 60;
    return min + (24 - 19) * 60;
  };
  return [...lista].sort((a, b) => sortKey(a) - sortKey(b));
}

export function detectarHorarioAtivo(horarios: HorarioRonda[]): HorarioRonda | null {
  const agora = new Date();
  const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][agora.getDay()];
  const minAgora = agora.getHours() * 60 + agora.getMinutes();

  for (const h of horarios) {
    if (!h.ativo) continue;
    if (!h.dias_semana.includes(diaSemana)) continue;
    const [hi, mi] = h.hora_inicio.split(':').map(Number);
    const [hf, mf] = h.hora_fim.split(':').map(Number);
    const minInicio = hi * 60 + mi;
    const minFim = hf * 60 + mf;
    if (minInicio > minFim) {
      if (minAgora >= minInicio || minAgora <= minFim) return h;
    } else {
      if (minAgora >= minInicio && minAgora <= minFim) return h;
    }
  }
  return null;
}

export async function verificarEscalaHoje(funcionarioId: string): Promise<boolean> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const diaHoje = agora.getDate();
  const diaVerificar = agora.getHours() < 12 ? [diaHoje - 1, diaHoje] : [diaHoje];

  const { data } = await supabase
    .from('escala_mensal')
    .select('dias_trabalhados')
    .eq('funcionario_id', funcionarioId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle();

  if (!data?.dias_trabalhados) return true;

  let dias: Array<{ dia: number; status: string }> = [];
  try {
    dias = typeof data.dias_trabalhados === 'string'
      ? JSON.parse(data.dias_trabalhados)
      : data.dias_trabalhados;
  } catch { return true; }

  return diaVerificar.some(d => {
    const entrada = dias.find(x => x.dia === d);
    return entrada?.status === 'TRABALHO';
  });
}

export async function detectarHorarioAtivoParaFuncionario(
  horarios: HorarioRonda[],
  funcionarioId: string
): Promise<HorarioRonda | null> {
  const escalado = await verificarEscalaHoje(funcionarioId);
  if (!escalado) return null;

  const agora = new Date();
  const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][agora.getDay()];
  const minAgora = agora.getHours() * 60 + agora.getMinutes();

  for (const h of horarios) {
    if (!h.ativo) continue;
    if (h.funcionarios_ids?.length > 0 && !h.funcionarios_ids.includes(funcionarioId)) continue;
    if (!h.dias_semana.includes(diaSemana)) continue;
    const [hi, mi] = h.hora_inicio.split(':').map(Number);
    const [hf, mf] = h.hora_fim.split(':').map(Number);
    const minInicio = hi * 60 + mi;
    const minFim = hf * 60 + mf;
    if (minInicio > minFim) {
      if (minAgora >= minInicio || minAgora <= minFim) return h;
    } else {
      if (minAgora >= minInicio && minAgora <= minFim) return h;
    }
  }
  return null;
}

// ── Horários (rq_rotas) ──────────────────────────────────────
export function useHorariosRonda() {
  const [horarios, setHorarios] = useState<HorarioRonda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('rq_rotas').select('*');
    setHorarios(ordenarTurnoNoturno((data || []).map(mapRotaParaHorario)));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const salvar = async (h: Partial<HorarioRonda> & { posto_trabalho_id?: string }) => {
    const payload: any = {
      nome: h.nome,
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim,
      intervalo_pontos_minutos: h.intervalo_entre_qrcodes_minutos ?? 15,
      tolerancia_minutos: h.tolerancia_minutos_depois ?? 10,
      dias_semana: h.dias_semana ?? ['seg', 'ter', 'qua', 'qui', 'sex'],
      pontos_ids: h.pontos_ids ?? [],
      funcionarios_ids: h.funcionarios_ids ?? [],
      ativo: h.ativo ?? true,
    };
    if (h.posto_trabalho_id) payload.posto_trabalho_id = h.posto_trabalho_id;

    if (h.id) {
      const { error } = await supabase.from('rq_rotas').update(payload).eq('id', h.id);
      if (error) throw error;
    } else {
      // posto_trabalho_id é obrigatório em rq_rotas — usa o primeiro posto se não informado
      if (!payload.posto_trabalho_id) {
        const { data: posto } = await supabase.from('postos_trabalho').select('id').limit(1).maybeSingle();
        if (posto) payload.posto_trabalho_id = posto.id;
      }
      const { error } = await supabase.from('rq_rotas').insert(payload);
      if (error) throw error;
    }
    await fetch();
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('rq_rotas').delete().eq('id', id);
    if (error) throw error;
    await fetch();
  };

  return { horarios, loading, fetch, salvar, remover };
}

// ── Pausas (rq_pausas) ───────────────────────────────────────
export function usePausasRonda() {
  const [pausas, setPausas] = useState<PausaRonda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('rq_pausas').select('*').order('hora_inicio');
    setPausas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const salvar = async (p: Partial<PausaRonda>) => {
    if (p.id) {
      const { error } = await supabase.from('rq_pausas').update(p).eq('id', p.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('rq_pausas').insert(p);
      if (error) throw error;
    }
    await fetch();
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('rq_pausas').delete().eq('id', id);
    if (error) throw error;
    await fetch();
  };

  return { pausas, loading, fetch, salvar, remover };
}

// ── Sessões e Leituras (rq_execucoes / rq_leituras) ──────────
export function useRondasOperacao(funcionarioId: string | null) {
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoRonda | null>(null);
  const [leituras, setLeituras] = useState<LeituraRonda[]>([]);
  const [loading] = useState(false);

  const fetchLeituras = async (execucaoId: string) => {
    const { data } = await supabase
      .from('rq_leituras')
      .select('*, ponto:rq_pontos_ronda(nome, tipo, ordem)')
      .eq('execucao_id', execucaoId)
      .order('horario_leitura');
    setLeituras((data || []).map(mapLeitura));
  };

  const fetchSessaoAtiva = useCallback(async () => {
    if (!funcionarioId) return;
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('rq_execucoes')
      .select('*, funcionario:funcionarios(nome_completo), rota:rq_rotas(nome)')
      .eq('funcionario_id', funcionarioId)
      .gte('iniciada_em', hoje + 'T00:00:00')
      .eq('status', 'em_andamento')
      .order('iniciada_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setSessaoAtiva(mapExecucaoParaSessao(data));
      await fetchLeituras(data.id);
    } else {
      setSessaoAtiva(null);
    }
  }, [funcionarioId]);

  useEffect(() => { fetchSessaoAtiva(); }, [fetchSessaoAtiva]);

  const iniciarSessao = async (horarioId?: string) => {
    if (!funcionarioId) return null;
    if (!horarioId) throw new Error('Rota/Horário é obrigatório para iniciar a ronda.');

    // 1. Buscar a rota completa
    const { data: rota, error: errRota } = await supabase
      .from('rq_rotas')
      .select('id, posto_trabalho_id, hora_inicio, hora_fim')
      .eq('id', horarioId)
      .maybeSingle();
    if (errRota) throw errRota;
    if (!rota) throw new Error('Rota não encontrada.');

    // 2. Resolver empresa via posto
    let empresa_id: string | null = null;
    const { data: posto } = await supabase
      .from('postos_trabalho')
      .select('empresa_id')
      .eq('id', rota.posto_trabalho_id)
      .maybeSingle();
    if (posto) empresa_id = posto.empresa_id;

    // 3. Garantir um ciclo para o turno de hoje (rq_execucoes.ciclo_id é NOT NULL)
    const hoje = new Date().toISOString().split('T')[0];
    let ciclo_id: string | null = null;
    const { data: cicloExistente } = await supabase
      .from('rq_ciclos')
      .select('id')
      .eq('rota_id', rota.id)
      .eq('data_turno', hoje)
      .order('numero_ciclo', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (cicloExistente) {
      ciclo_id = cicloExistente.id;
    } else {
      // Cria ciclo "ad-hoc" usando a janela da rota
      const inicio = `${hoje}T${rota.hora_inicio}`;
      // hora_fim pode ser no dia seguinte (turno noturno)
      const [hi] = String(rota.hora_inicio).split(':').map(Number);
      const [hf] = String(rota.hora_fim).split(':').map(Number);
      const dataFim = hf < hi
        ? new Date(new Date(hoje).getTime() + 24 * 3600 * 1000).toISOString().split('T')[0]
        : hoje;
      const fim = `${dataFim}T${rota.hora_fim}`;
      const { data: novoCiclo, error: errCiclo } = await supabase
        .from('rq_ciclos')
        .insert({
          rota_id: rota.id,
          data_turno: hoje,
          hora_inicio: new Date(inicio).toISOString(),
          hora_fim: new Date(fim).toISOString(),
          numero_ciclo: 1,
        })
        .select('id')
        .single();
      if (errCiclo) throw errCiclo;
      ciclo_id = novoCiclo.id;
    }

    // 4. Inserir execução com TODOS os NOT NULL preenchidos
    const { data, error } = await supabase
      .from('rq_execucoes')
      .insert({
        funcionario_id: funcionarioId,
        rota_id: rota.id,
        ciclo_id,
        posto_trabalho_id: rota.posto_trabalho_id,
        empresa_id,
        status: 'em_andamento',
        iniciada_em: new Date().toISOString(),
      })
      .select('*, funcionario:funcionarios(nome_completo), rota:rq_rotas(nome)')
      .single();
    if (error) throw error;
    const sessao = mapExecucaoParaSessao(data);
    setSessaoAtiva(sessao);
    setLeituras([]);
    return sessao;
  };

  const registrarLeitura = async (pontoId: string, horarioConfig?: HorarioRonda) => {
    if (!sessaoAtiva || !funcionarioId) throw new Error('Sem sessão ativa');

    const agora = new Date();
    let status: 'no_prazo' | 'adiantado' | 'atrasado' = 'no_prazo';
    let diferencaSegundos = 0;
    let horarioPrevisto: string | null = null;

    if (horarioConfig && leituras.length > 0) {
      const ultima = leituras[leituras.length - 1];
      const ultimaData = new Date(ultima.lido_em);
      const previsto = new Date(ultimaData.getTime() + horarioConfig.intervalo_entre_qrcodes_minutos * 60000);
      horarioPrevisto = previsto.toISOString();
      diferencaSegundos = Math.round((agora.getTime() - previsto.getTime()) / 1000);
      const tolAntes = horarioConfig.tolerancia_minutos_antes * 60;
      const tolDepois = horarioConfig.tolerancia_minutos_depois * 60;
      if (diferencaSegundos < -tolAntes) status = 'adiantado';
      else if (diferencaSegundos > tolDepois) status = 'atrasado';
    }

    const { data, error } = await supabase
      .from('rq_leituras')
      .insert({
        execucao_id: sessaoAtiva.id,
        ponto_id: pontoId,
        funcionario_id: funcionarioId,
        horario_leitura: agora.toISOString(),
        horario_previsto: horarioPrevisto,
        status,
        diferenca_segundos: diferencaSegundos,
      })
      .select('*, ponto:rq_pontos_ronda(nome, tipo, ordem)')
      .single();

    if (error) throw error;
    const mapped = mapLeitura(data);
    setLeituras(prev => [...prev, mapped]);
    return { leitura: mapped, status: mapped.status };
  };

  const encerrarSessao = async () => {
    if (!sessaoAtiva) return;
    const { error } = await supabase
      .from('rq_execucoes')
      .update({ status: 'concluida', finalizada_em: new Date().toISOString() })
      .eq('id', sessaoAtiva.id);
    if (error) throw error;
    setSessaoAtiva(null);
    setLeituras([]);
  };

  return { sessaoAtiva, leituras, loading, fetchSessaoAtiva, iniciarSessao, registrarLeitura, encerrarSessao };
}

// ── Relatórios ──────────────────────────────────────────────
export async function fetchRelatorioRondas(filtros: {
  dataInicio: string;
  dataFim: string;
  funcionarioId?: string;
}) {
  const query = supabase
    .from('rq_leituras')
    .select(`
      *,
      ponto:rq_pontos_ronda(nome, tipo, ordem),
      funcionario:funcionarios(nome_completo),
      execucao:rq_execucoes(iniciada_em, rota:rq_rotas(nome))
    `)
    .gte('horario_leitura', filtros.dataInicio + 'T00:00:00')
    .lte('horario_leitura', filtros.dataFim + 'T23:59:59')
    .order('horario_leitura');

  if (filtros.funcionarioId) query.eq('funcionario_id', filtros.funcionarioId);

  const { data, error } = await query;
  if (error) throw error;

  // Adapta para o formato esperado pelo relatório legado
  return (data || []).map((l: any) => ({
    ...mapLeitura(l),
    ponto: l.ponto ? { nome: l.ponto.nome, tipo: l.ponto.tipo ?? 'filho', numero_sequencial: l.ponto.ordem ?? 1 } : undefined,
    funcionario: l.funcionario ? { nome_completo: l.funcionario.nome_completo } : undefined,
    sessao: l.execucao ? {
      data_ronda: l.execucao.iniciada_em ? l.execucao.iniciada_em.substring(0, 10) : '',
      horario: l.execucao.rota ? { nome: l.execucao.rota.nome } : undefined,
    } : undefined,
  }));
}

// ── Dashboard ───────────────────────────────────────────────
export async function fetchDashboardRondas() {
  const hoje = new Date().toISOString().split('T')[0];

  const [execucoesHoje, inconsistenciasHoje] = await Promise.all([
    supabase.from('rq_execucoes').select('id, status').gte('iniciada_em', hoje + 'T00:00:00'),
    supabase.from('rq_leituras').select('id, status').gte('horario_leitura', hoje + 'T00:00:00').neq('status', 'no_prazo'),
  ]);

  const sessoes = execucoesHoje.data || [];
  const concluidas = sessoes.filter((s: any) => s.status === 'concluida').length;
  const total = sessoes.length;

  return {
    rondasHoje: total,
    rondasConcluidasHoje: concluidas,
    conformidadeHoje: total > 0 ? Math.round((concluidas / total) * 100) : 0,
    inconsistencias24h: (inconsistenciasHoje.data || []).length,
    minutosNaoRealizadosMes: 0,
  };
}
