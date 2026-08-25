export type AreaKey = 'pessoas' | 'jornada' | 'remuneracao' | 'processos' | 'analytics' | 'automacao' | 'ai' | 'configuracoes';

export interface AreaFixture {
  eyebrow: string; title: string; description: string; primaryAction: string;
  metrics: readonly { label: string; value: string; detail: string; tone?: 'positive' | 'attention' }[];
  queueTitle: string;
  queue: readonly { title: string; detail: string; meta: string; status: string; tone?: 'attention' | 'critical' | 'normal' }[];
  insight: string;
}

export const areaFixtures: Record<AreaKey, AreaFixture> = {
  pessoas: {
    eyebrow: 'Ciclo de vida', title: 'Pessoas', description: 'Vínculos, documentos e movimentações acompanhados por evento.', primaryAction: 'Iniciar admissão',
    metrics: [{ label: 'Pessoas ativas', value: '482', detail: '+12 nos últimos 30 dias', tone: 'positive' }, { label: 'Admissões em curso', value: '8', detail: '6 fluindo automaticamente' }, { label: 'Documentos pendentes', value: '3', detail: '2 vencem hoje', tone: 'attention' }],
    queueTitle: 'Movimentações recentes',
    queue: [{ title: 'Admissão de Luana Castro', detail: 'Documentos validados; aguardando exame admissional', meta: 'Iniciado há 2 dias', status: 'Em curso' }, { title: 'Mudança de cargo · Paulo Reis', detail: 'Impacto salarial calculado e aprovado pela liderança', meta: 'Efetiva em 01/09', status: 'Programada', tone: 'normal' }, { title: 'Documento de Ana Lima', detail: 'Comprovante de residência ilegível', meta: 'Prazo hoje, 17:00', status: 'Atenção', tone: 'attention' }], insight: 'A IA identificou que 3 admissões podem compartilhar a mesma agenda de integração.',
  },
  jornada: {
    eyebrow: 'Tempo e cobertura', title: 'Jornada', description: 'Ponto, escalas, intervalos e capacidade vistos pelas exceções.', primaryAction: 'Planejar escala',
    metrics: [{ label: 'Marcações válidas', value: '97,8%', detail: '1.924 de 1.968 hoje', tone: 'positive' }, { label: 'Cobertura da escala', value: '98%', detail: '2 postos descobertos', tone: 'attention' }, { label: 'Banco de horas', value: '+186h', detail: '-12% desde julho', tone: 'positive' }],
    queueTitle: 'Exceções de jornada',
    queue: [{ title: 'Intervalo abaixo do mínimo', detail: 'Carlos Alves · Unidade Norte', meta: 'Detectado às 13:42', status: 'Decisão', tone: 'attention' }, { title: 'Posto sem cobertura amanhã', detail: 'Recepção · Turno 18:00–06:00', meta: '3 sugestões disponíveis', status: 'Atenção', tone: 'attention' }, { title: 'Fechamento semanal concluído', detail: '94 colaboradores processados sem divergência', meta: 'Hoje, 07:18', status: 'Normal', tone: 'normal' }], insight: 'Trocar dois turnos reduz 14 horas extras previstas sem gerar descobertura.',
  },
  remuneracao: {
    eyebrow: 'Cálculo protegido', title: 'Remuneração', description: 'Folha, benefícios e variáveis com validação contínua e trilha de decisão.', primaryAction: 'Abrir prévia da folha',
    metrics: [{ label: 'Prévia processada', value: '96%', detail: '462 de 482 pessoas', tone: 'positive' }, { label: 'Variação da folha', value: '+2,4%', detail: 'Dentro da faixa esperada' }, { label: 'Valores bloqueados', value: 'R$ 18,4 mil', detail: '3 divergências críticas', tone: 'attention' }],
    queueTitle: 'Validações da competência',
    queue: [{ title: 'Variação líquida acima de 35%', detail: '3 pessoas · Unidade Centro', meta: 'Bloqueio automático ativo', status: 'Crítico', tone: 'critical' }, { title: 'Benefício sem elegibilidade', detail: 'Vale-transporte · 1 solicitação', meta: 'Aguardando RH', status: 'Decisão', tone: 'attention' }, { title: 'Eventos recorrentes conciliados', detail: '412 lançamentos comparados com julho', meta: 'Hoje, 06:50', status: 'Normal', tone: 'normal' }], insight: 'A maior parte da variação mensal vem de dissídio já aprovado, não de anomalias.',
  },
  processos: {
    eyebrow: 'Orquestração', title: 'Processos', description: 'Cada rotina nasce de um evento e avança com responsáveis, prazos e evidências.', primaryAction: 'Criar processo',
    metrics: [{ label: 'Em execução', value: '34', detail: '29 sem intervenção', tone: 'positive' }, { label: 'SLA no prazo', value: '94%', detail: '+4 p.p. neste mês', tone: 'positive' }, { label: 'Aguardando decisão', value: '5', detail: '1 prazo crítico', tone: 'attention' }],
    queueTitle: 'Fluxos em destaque',
    queue: [{ title: 'Admissão em lote · Unidade Sul', detail: '6 de 8 etapas concluídas automaticamente', meta: 'Responsável: Camila', status: 'Em curso' }, { title: 'Fechamento de ponto · Agosto', detail: 'Aguardando 2 justificativas de ausência', meta: 'SLA amanhã, 12:00', status: 'Atenção', tone: 'attention' }, { title: 'Offboarding · Ricardo Nunes', detail: 'Acessos revogados e documentos gerados', meta: 'Concluído há 1 hora', status: 'Normal', tone: 'normal' }], insight: 'Automatizar a confirmação de documentos pode reduzir o ciclo de admissão em 1,7 dia.',
  },
  analytics: {
    eyebrow: 'Decisão orientada', title: 'Analytics', description: 'Indicadores que explicam tendências e apontam onde agir.', primaryAction: 'Criar análise',
    metrics: [{ label: 'Custo por pessoa', value: 'R$ 4.820', detail: '+1,2% vs. mês anterior' }, { label: 'Absenteísmo', value: '2,8%', detail: '-0,4 p.p. em 90 dias', tone: 'positive' }, { label: 'Risco de cobertura', value: '4 equipes', detail: 'Concentração no turno B', tone: 'attention' }],
    queueTitle: 'Leituras recomendadas',
    queue: [{ title: 'Horas extras por unidade', detail: 'Unidade Norte concentra 38% do crescimento', meta: 'Janela: últimas 8 semanas', status: 'Investigar', tone: 'attention' }, { title: 'Tempo médio de admissão', detail: 'Caiu de 6,2 para 4,5 dias', meta: 'Comparativo trimestral', status: 'Evolução', tone: 'normal' }, { title: 'Férias e capacidade', detail: 'Setembro terá sobreposição em duas equipes', meta: 'Projeção de 60 dias', status: 'Atenção', tone: 'attention' }], insight: 'O aumento de horas extras está correlacionado à vacância em dois cargos operacionais.',
  },
  automacao: {
    eyebrow: 'Operação autônoma', title: 'Automação', description: 'Monitores, regras e ações graduadas por risco, com histórico verificável.', primaryAction: 'Nova automação',
    metrics: [{ label: 'Automações ativas', value: '28', detail: 'Todas saudáveis', tone: 'positive' }, { label: 'Execuções hoje', value: '347', detail: '95% sem intervenção', tone: 'positive' }, { label: 'Tempo devolvido', value: '41h', detail: 'Estimativa neste mês' }],
    queueTitle: 'Monitores operacionais',
    queue: [{ title: 'Validar marcações de ponto', detail: 'Executa a cada 15 minutos · 482 pessoas', meta: 'Última execução há 4 min', status: 'Ativa', tone: 'normal' }, { title: 'Prevenir vencimento de férias', detail: 'Notifica liderança e sugere janelas', meta: 'Próxima execução amanhã', status: 'Ativa', tone: 'normal' }, { title: 'Detectar variação salarial', detail: 'Bloqueia alterações acima do limite aprovado', meta: '1 bloqueio hoje', status: 'Protegendo', tone: 'attention' }], insight: 'A regra de conferência de ponto evitou 17 correções manuais nesta semana.',
  },
  ai: {
    eyebrow: 'Copiloto operacional', title: 'FluxPay AI', description: 'Análises e propostas baseadas no contexto da operação; regras continuam no controle.', primaryAction: 'Nova conversa',
    metrics: [{ label: 'Sugestões aceitas', value: '86%', detail: 'Últimos 30 dias', tone: 'positive' }, { label: 'Análises hoje', value: '43', detail: '12 geraram ação' }, { label: 'Ações autônomas', value: '0', detail: 'Perfil atual exige aprovação' }],
    queueTitle: 'Perguntas sugeridas',
    queue: [{ title: 'Por que a folha variou este mês?', detail: 'Explica os principais eventos e separa variação esperada', meta: 'Usa prévia de agosto', status: 'Analisar' }, { title: 'Como cobrir a escala de amanhã?', detail: 'Compara disponibilidade, jornada e custo previsto', meta: '3 opções preparadas', status: 'Simular' }, { title: 'Quais processos estão em risco?', detail: 'Prioriza prazos, dependências e impacto', meta: 'Atualizado há 2 min', status: 'Consultar' }], insight: 'Posso explicar qualquer recomendação mostrando evidências, regra aplicada e impacto previsto.',
  },
  configuracoes: {
    eyebrow: 'Governança', title: 'Configurações', description: 'Políticas, papéis e limites que tornam a autonomia segura.', primaryAction: 'Revisar políticas',
    metrics: [{ label: 'Políticas ativas', value: '16', detail: '2 revisões neste trimestre' }, { label: 'Perfis de acesso', value: '7', detail: 'Nenhum conflito detectado', tone: 'positive' }, { label: 'Regras para revisar', value: '2', detail: 'Prazo em 12 dias', tone: 'attention' }],
    queueTitle: 'Controles principais',
    queue: [{ title: 'Autonomia por risco', detail: 'Baixo: executar · Médio: confirmar · Alto: aprovação dupla', meta: 'Atualizado em 18/08', status: 'Configurado', tone: 'normal' }, { title: 'Variação máxima de remuneração', detail: 'Bloqueio automático acima de 35%', meta: 'Aplica-se a todas as unidades', status: 'Ativa', tone: 'normal' }, { title: 'Revisão de acessos trimestral', detail: '2 gestores ainda não confirmaram equipes', meta: 'Prazo em 3 dias', status: 'Atenção', tone: 'attention' }], insight: 'Os limites atuais impedem a IA de executar qualquer alteração financeira sem aprovação humana.',
  },
};
