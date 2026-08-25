// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TOOLS ============
const tools = [
  {
    type: 'function',
    function: {
      name: 'buscar_funcionarios',
      description: 'Busca funcionários filtrados por nome, cargo, empresa, posto ou status. Use quando o usuário quiser saber quem são, quantos são, ou filtrar antes de aplicar mudanças em massa.',
      parameters: {
        type: 'object',
        properties: {
          nome_contem: { type: 'string' },
          cargo_contem: { type: 'string' },
          empresa_contem: { type: 'string' },
          posto_contem: { type: 'string' },
          apenas_ativos: { type: 'boolean' },
          incluir_demitidos: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_historico_salarial',
      description: 'Retorna o histórico salarial completo de um funcionário específico.',
      parameters: {
        type: 'object',
        properties: { funcionario_id: { type: 'string' } },
        required: ['funcionario_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_detalhe_cadastro',
      description: 'Retorna o registro completo de uma entidade específica.',
      parameters: {
        type: 'object',
        properties: {
          entidade: { type: 'string', enum: ['empresas','postos_trabalho','regras_escalas','cargos','funcionarios','feriados','historico_salarios','historico_salarios_cargo'] },
          id: { type: 'string' },
        },
        required: ['entidade','id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aplicar_aumento_salarial',
      description: 'Prepara um aumento salarial percentual para funcionários filtrados. NÃO EXECUTA — retorna preview para confirmação humana. Se filtros forem omitidos, aplica a todos os funcionários ativos.',
      parameters: {
        type: 'object',
        properties: {
          percentual: { type: 'number', description: 'Percentual de aumento (ex: 6.03 para 6,03%)' },
          data_vigencia: { type: 'string', description: 'Data de início da vigência (YYYY-MM-DD)' },
          motivo: { type: 'string' },
          filtro_cargo_contem: { type: 'string' },
          filtro_empresa_contem: { type: 'string' },
          filtro_posto_contem: { type: 'string' },
        },
        required: ['percentual','data_vigencia'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_registro',
      description: 'Prepara a atualização de um único registro. NÃO EXECUTA — retorna preview para confirmação humana.',
      parameters: {
        type: 'object',
        properties: {
          entidade: { type: 'string', enum: ['empresas','postos_trabalho','regras_escalas','cargos','funcionarios','feriados'] },
          id: { type: 'string' },
          alteracoes: { type: 'object', description: 'Campos a alterar (chave:valor).' },
        },
        required: ['entidade','id','alteracoes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_registro',
      description: 'Prepara a criação de um novo registro. NÃO EXECUTA — retorna preview para confirmação humana.',
      parameters: {
        type: 'object',
        properties: {
          entidade: { type: 'string', enum: ['empresas','postos_trabalho','regras_escalas','cargos','funcionarios','feriados'] },
          dados: { type: 'object' },
        },
        required: ['entidade','dados'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'excluir_registro',
      description: 'Prepara a exclusão de um registro. NÃO EXECUTA — retorna preview para confirmação humana.',
      parameters: {
        type: 'object',
        properties: {
          entidade: { type: 'string', enum: ['empresas','postos_trabalho','regras_escalas','cargos','funcionarios','feriados'] },
          id: { type: 'string' },
        },
        required: ['entidade','id'],
      },
    },
  },
];

const SYSTEM_PROMPT = `Você é o Assistente IA do sistema FluxPay — folha de pagamento brasileira (CLT).
Você tem acesso ao contexto resumido dos cadastros do sistema (empresas, postos, escalas, cargos, funcionários, feriados) e pode:
- Responder perguntas sobre o cadastro (use as tools de busca quando o resumo não bastar).
- Preparar operações de CRUD (criar, alterar, excluir, aumentos em massa) — SEMPRE via tools de mutação.

REGRAS CRÍTICAS:
1. Toda operação de mutação SÓ é aplicada APÓS confirmação humana. As tools de mutação retornam preview — nunca gravam direto. Deixe isso claro ao usuário.
2. Antes de propor mutações em massa, use tools de leitura para confirmar quantos e quais registros serão afetados.
3. Sempre explique em português claro e conciso o impacto da operação antes/depois de gerar o preview.
4. Use "mês comercial de 30 dias" para qualquer cálculo salarial. Salário base é o valor mensal.
5. Se o usuário pedir algo ambíguo, pergunte antes de agir.
6. Não invente IDs, cargos ou empresas — só use os que existem no contexto ou nas buscas.
7. FORMATAÇÃO: NÃO use asteriscos (*, **, ***) no texto. Não use markdown de negrito/itálico. Escreva em texto corrido limpo, usando quebras de linha e, quando necessário, listas com hífen (-).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401);
    }
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: 'Não autenticado' }, 401);
    const userId = userData.user.id;


    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar admin
    const { data: isAdminData } = await supabase.rpc('is_admin', { _user_id: userId });
    if (!isAdminData) return json({ error: 'Acesso restrito a administradores' }, 403);

    const { mensagens } = await req.json();
    if (!Array.isArray(mensagens)) return json({ error: 'mensagens[] obrigatório' }, 400);

    // ============ CONTEXTO ============
    const contexto = await carregarContexto(supabase);
    const systemFull = `${SYSTEM_PROMPT}\n\n## CONTEXTO DOS CADASTROS (resumido)\n${JSON.stringify(contexto, null, 2)}`;

    // ============ LOOP DE TOOL CALLING ============
    const historico = [
      { role: 'system', content: systemFull },
      ...mensagens,
    ];
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'LOVABLE_API_KEY não configurada' }, 500);

    let iteracao = 0;
    const maxIteracoes = 8;
    let pendentesConfirmacao: any[] = [];

    while (iteracao++ < maxIteracoes) {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: historico,
          tools,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        if (resp.status === 429) return json({ error: 'Limite de requisições atingido. Aguarde alguns instantes.' }, 429);
        if (resp.status === 402) return json({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }, 402);
        return json({ error: `Gateway ${resp.status}: ${text}` }, 500);
      }

      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return json({ error: 'Sem resposta do modelo' }, 500);

      historico.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return json({
          resposta: msg.content || '',
          pendentes_confirmacao: pendentesConfirmacao,
        });
      }

      // Executa cada tool
      for (const tc of toolCalls) {
        const fn = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}

        let result: any;
        try {
          if (fn === 'buscar_funcionarios') result = await tool_buscar_funcionarios(supabase, args);
          else if (fn === 'buscar_historico_salarial') result = await tool_buscar_historico(supabase, args);
          else if (fn === 'buscar_detalhe_cadastro') result = await tool_buscar_detalhe(supabase, args);
          else if (fn === 'aplicar_aumento_salarial') {
            result = await tool_preview_aumento(supabase, args, userId, mensagens);
            if (result.requer_confirmacao) pendentesConfirmacao.push(result);
          }
          else if (fn === 'atualizar_registro') {
            result = await tool_preview_atualizar(supabase, args, userId, mensagens);
            if (result.requer_confirmacao) pendentesConfirmacao.push(result);
          }
          else if (fn === 'criar_registro') {
            result = await tool_preview_criar(supabase, args, userId, mensagens);
            if (result.requer_confirmacao) pendentesConfirmacao.push(result);
          }
          else if (fn === 'excluir_registro') {
            result = await tool_preview_excluir(supabase, args, userId, mensagens);
            if (result.requer_confirmacao) pendentesConfirmacao.push(result);
          }
          else result = { erro: `Tool desconhecida: ${fn}` };
        } catch (e) {
          result = { erro: e instanceof Error ? e.message : String(e) };
        }

        historico.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 30000),
        });
      }
    }

    return json({ resposta: 'Limite de iterações atingido.', pendentes_confirmacao: pendentesConfirmacao });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// ============ CONTEXTO ============
async function carregarContexto(supabase: any) {
  const anoAtual = new Date().getFullYear();
  const [empresas, postos, escalas, cargos, funcs, feriados] = await Promise.all([
    supabase.from('empresas').select('*'),
    supabase.from('postos_trabalho').select('*'),
    supabase.from('regras_escalas').select('*').eq('ativa', true),
    supabase.from('cargos').select('*'),
    supabase.from('funcionarios').select('*'),
    supabase.from('feriados').select('*').gte('data_feriado', `${anoAtual}-01-01`).lte('data_feriado', `${anoAtual + 1}-12-31`),
  ]);


  const ativos = (funcs.data || []).filter((f: any) => f.ativo && !f.demitido);
  return {
    empresas: empresas.data || [],
    postos: postos.data || [],
    escalas: escalas.data || [],
    cargos: cargos.data || [],
    funcionarios_resumo: {
      total: (funcs.data || []).length,
      ativos: ativos.length,
      demitidos: (funcs.data || []).filter((f: any) => f.demitido).length,
      lista: funcs.data || [],

    },
    feriados: feriados.data || [],
  };
}

// ============ TOOLS DE LEITURA ============
async function tool_buscar_funcionarios(supabase: any, args: any) {
  let q = supabase.from('funcionarios').select('*');
  if (args.nome_contem) q = q.ilike('nome_completo', `%${args.nome_contem}%`);
  if (args.cargo_contem) q = q.ilike('nome_cargo', `%${args.cargo_contem}%`);
  if (args.empresa_contem) q = q.ilike('nome_empresa', `%${args.empresa_contem}%`);
  if (args.posto_contem) q = q.ilike('nome_posto', `%${args.posto_contem}%`);
  if (args.apenas_ativos) q = q.eq('ativo', true);
  if (!args.incluir_demitidos) q = q.eq('demitido', false);
  const { data, error } = await q.limit(500);
  if (error) return { erro: error.message };
  return { total: data.length, funcionarios: data };
}

async function tool_buscar_historico(supabase: any, args: any) {
  const { data, error } = await supabase.from('historico_salarios')
    .select('*').eq('funcionario_id', args.funcionario_id)
    .order('data_inicio_vigencia', { ascending: false });
  if (error) return { erro: error.message };
  return { historico: data };
}

async function tool_buscar_detalhe(supabase: any, args: any) {
  const { data, error } = await supabase.from(args.entidade).select('*').eq('id', args.id).maybeSingle();
  if (error) return { erro: error.message };
  return { registro: data };
}

// ============ TOOLS DE MUTAÇÃO (PREVIEW) ============
async function tool_preview_aumento(supabase: any, args: any, userId: string, mensagens: any[]) {
  let q = supabase.from('funcionarios').select('id, nome_completo, nome_cargo, nome_empresa, nome_posto, salario_base')
    .eq('ativo', true).eq('demitido', false);
  if (args.filtro_cargo_contem) q = q.ilike('nome_cargo', `%${args.filtro_cargo_contem}%`);
  if (args.filtro_empresa_contem) q = q.ilike('nome_empresa', `%${args.filtro_empresa_contem}%`);
  if (args.filtro_posto_contem) q = q.ilike('nome_posto', `%${args.filtro_posto_contem}%`);
  const { data: funcs, error } = await q;
  if (error) return { erro: error.message };

  const preview = funcs.map((f: any) => {
    const atual = Number(f.salario_base) || 0;
    const novo = +(atual * (1 + args.percentual / 100)).toFixed(2);
    return { funcionario_id: f.id, nome: f.nome_completo, cargo: f.nome_cargo, salario_atual: atual, salario_novo: novo, diferenca: +(novo - atual).toFixed(2) };
  });

  const promptOriginal = mensagens.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ').slice(0, 2000);
  const { data: op } = await supabase.from('ia_auditoria_operacoes').insert({
    usuario_id: userId,
    prompt_original: promptOriginal,
    tool_chamada: 'aplicar_aumento_salarial',
    entidade: 'historico_salarios+funcionarios',
    payload_sugerido: { args, preview },
    status: 'pendente',
  }).select('id').single();

  return {
    requer_confirmacao: true,
    operacao_id: op?.id,
    tool: 'aplicar_aumento_salarial',
    descricao_humana: `Aplicar aumento de ${args.percentual}% em ${preview.length} funcionário(s) a partir de ${args.data_vigencia}`,
    total_afetados: preview.length,
    total_incremento_mensal: preview.reduce((s: number, p: any) => s + p.diferenca, 0),
    preview,
    args,
  };
}

async function tool_preview_atualizar(supabase: any, args: any, userId: string, mensagens: any[]) {
  const { data: antes, error } = await supabase.from(args.entidade).select('*').eq('id', args.id).maybeSingle();
  if (error) return { erro: error.message };
  if (!antes) return { erro: 'Registro não encontrado' };

  const promptOriginal = mensagens.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ').slice(0, 2000);
  const { data: op } = await supabase.from('ia_auditoria_operacoes').insert({
    usuario_id: userId,
    prompt_original: promptOriginal,
    tool_chamada: 'atualizar_registro',
    entidade: args.entidade,
    payload_sugerido: args,
    payload_anterior: antes,
    ids_afetados: [args.id],
    status: 'pendente',
  }).select('id').single();

  const diff = Object.keys(args.alteracoes).map((k) => ({ campo: k, antes: antes[k], depois: args.alteracoes[k] }));
  return {
    requer_confirmacao: true,
    operacao_id: op?.id,
    tool: 'atualizar_registro',
    descricao_humana: `Atualizar 1 registro em ${args.entidade}`,
    diff,
    args,
  };
}

async function tool_preview_criar(supabase: any, args: any, userId: string, mensagens: any[]) {
  const promptOriginal = mensagens.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ').slice(0, 2000);
  const { data: op } = await supabase.from('ia_auditoria_operacoes').insert({
    usuario_id: userId,
    prompt_original: promptOriginal,
    tool_chamada: 'criar_registro',
    entidade: args.entidade,
    payload_sugerido: args,
    status: 'pendente',
  }).select('id').single();
  return {
    requer_confirmacao: true,
    operacao_id: op?.id,
    tool: 'criar_registro',
    descricao_humana: `Criar novo registro em ${args.entidade}`,
    dados: args.dados,
    args,
  };
}

async function tool_preview_excluir(supabase: any, args: any, userId: string, mensagens: any[]) {
  const { data: antes } = await supabase.from(args.entidade).select('*').eq('id', args.id).maybeSingle();
  if (!antes) return { erro: 'Registro não encontrado' };
  const promptOriginal = mensagens.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ').slice(0, 2000);
  const { data: op } = await supabase.from('ia_auditoria_operacoes').insert({
    usuario_id: userId,
    prompt_original: promptOriginal,
    tool_chamada: 'excluir_registro',
    entidade: args.entidade,
    payload_sugerido: args,
    payload_anterior: antes,
    ids_afetados: [args.id],
    status: 'pendente',
  }).select('id').single();
  return {
    requer_confirmacao: true,
    operacao_id: op?.id,
    tool: 'excluir_registro',
    descricao_humana: `Excluir 1 registro de ${args.entidade}`,
    registro: antes,
    args,
  };
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
