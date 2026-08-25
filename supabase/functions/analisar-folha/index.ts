// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { funcionario_id, mes, ano, pergunta } = await req.json();
    if (!funcionario_id || !mes || !ano || !pergunta) {
      return new Response(JSON.stringify({ error: 'Parâmetros faltando (funcionario_id, mes, ano, pergunta)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [todasCalcRes, funcRes, todasPontoRes, paramsRes, histSalRes] = await Promise.all([
      supabase.from('folha_calculada').select('*').eq('funcionario_id', funcionario_id).order('ano', { ascending: false }).order('mes', { ascending: false }),
      supabase.from('funcionarios').select('nome_completo, nome_cargo, nome_empresa, nome_posto, codigo_escala, data_admissao, salario_base').eq('id', funcionario_id).maybeSingle(),
      supabase.from('folhas_ponto').select('mes, ano, total_faltas_injustificadas, total_horas_extras, total_adicional_noturno, dias_trabalhados').eq('funcionario_id', funcionario_id).order('ano', { ascending: false }).order('mes', { ascending: false }),
      supabase.from('parametros_calculo').select('*').lte('ano_vigencia', ano).order('ano_vigencia', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('historico_salarios').select('salario_base, data_inicio_vigencia, data_fim_vigencia, motivo').eq('funcionario_id', funcionario_id).order('data_inicio_vigencia', { ascending: false }).limit(20),
    ]);

    const system = `Você é uma especialista em folha de pagamento brasileira (CLT).
ESCOPO ESTRITO: responda APENAS perguntas relacionadas a cálculos salariais, benefícios, férias e PLR (independente do período/competência solicitado). Se a pergunta fugir desse escopo (ex.: cadastros, escalas, configurações, assuntos gerais), recuse educadamente em uma frase curta e oriente o usuário a usar o Assistente IA de Cadastros ou o módulo apropriado.
Dentro do escopo: responda de forma DIRETA e CONCISA, consultando as fontes fornecidas.
Você recebe TODAS as folhas calculadas e folhas de ponto do funcionário (todos os meses/anos cadastrados). Localize o(s) período(s) exatos que a pergunta pede pelos campos "mes" e "ano" de cada registro. Se o período solicitado não existir nos dados, diga claramente que não há registro para aquele mês/ano — não use dados de outro mês como substituto.
Só compare meses quando a pergunta pedir comparação ou quando for indispensável para explicar o valor.
Para simulação/custo (ex.: custo de X horas extras, impacto de aumento, valor de férias/13º/PLR), use salário base, histórico e regras vigentes.
Responda em português do Brasil, cite valores em R$ e referencie os campos da folha quando aplicável.
FORMATAÇÃO: NÃO use asteriscos (*, **, ***) no texto. Não use markdown de negrito/itálico. Escreva em texto corrido limpo, usando quebras de linha e, quando necessário, listas com hífen (-).`;

    const nomeMes = (m: number) => (m >= 1 && m <= 12 ? MESES[m-1] : `M${m}`);
    const calcs = todasCalcRes.data || [];
    const pontos = todasPontoRes.data || [];

    const contexto = `## FUNCIONÁRIO
${JSON.stringify(funcRes.data, null, 2)}

## PERÍODO SELECIONADO NA TELA (referência)
${nomeMes(mes)}/${ano}

## FOLHAS DE PONTO — TODOS OS MESES CADASTRADOS (${pontos.length} registro(s))
${pontos.length ? JSON.stringify(pontos.map(p => ({ competencia: `${nomeMes(p.mes)}/${p.ano}`, ...p })), null, 2) : 'NENHUMA FOLHA DE PONTO CADASTRADA'}

## FOLHAS CALCULADAS — TODOS OS MESES CADASTRADOS (${calcs.length} registro(s))
${calcs.length ? JSON.stringify(calcs.map(c => ({ competencia: `${nomeMes(c.mes)}/${c.ano}`, ...c })), null, 2) : 'NENHUMA FOLHA CALCULADA'}

## PARÂMETROS DE CÁLCULO VIGENTES (ano ${paramsRes.data?.ano_vigencia ?? '?'})
Use estes valores para simulações (HE, DSR, INSS, IRRF, salário mínimo, etc.). Mês comercial = 30 dias, jornada mensal padrão = 220h (44h/sem).
${paramsRes.data ? JSON.stringify(paramsRes.data, null, 2) : 'NÃO ENCONTRADOS'}

## HISTÓRICO SALARIAL DO FUNCIONÁRIO (mais recentes primeiro)
${histSalRes.data && histSalRes.data.length ? JSON.stringify(histSalRes.data, null, 2) : 'SEM HISTÓRICO'}`;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `${contexto}\n\n## PERGUNTA DO USUÁRIO\n${pergunta}` },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }), {
          status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }), {
          status: 402, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Gateway ${resp.status}: ${text}` }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const resposta = data.choices?.[0]?.message?.content ?? 'Sem resposta do modelo.';

    return new Response(JSON.stringify({ resposta }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
