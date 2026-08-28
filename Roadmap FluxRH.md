# Roadmap FluxRH

> 📌 **Documento principal de acompanhamento do projeto.** Consultar este arquivo no início de cada nova etapa e atualizar os marcadores ao concluir uma entrega.
>
> **Última conferência:** 28 de agosto de 2026  
> **Legenda:** ✅ concluído · 🟡 em andamento · ⬜ planejado

## Acompanhamento atual

### Fundação e primeira jornada vertical

- ✅ Monorepo React, Vite, TypeScript e API REST modular
- ✅ Contratos compartilhados com validação Zod
- ✅ Navegação, autenticação e contexto multiempresa
- ✅ Repositories em memória substituíveis por persistência
- ✅ Testes automatizados, typecheck e build de produção
- ✅ Fundação Supabase externa, migrations e isolamento por organização
- ✅ Organizações, empresas, unidades, usuários, papéis e permissões persistidos
- ✅ Colaboradores e vínculos básicos persistidos
- ✅ Admissões, workflows, tarefas, exceções e auditoria persistidos
- ✅ Documentos, validações e aceite eletrônico persistidos
- ✅ Jornada, ponto, exceções e aprovação de competência persistidos e validados remotamente

### Operação essencial

- ✅ Central de Operações e Exceções
- ✅ Estrutura organizacional
- ✅ Cadastro e prontuário digital de colaboradores
- ✅ Motor de workflows, regras e tarefas
- ✅ Documentos e aceites eletrônicos
- ✅ Admissão e onboarding
- ✅ Jornada, escalas e ponto
- ✅ Férias, faltas, atestados e afastamentos
- ✅ Benefícios
- ✅ Motor de cálculo da folha
- ✅ Fechamento da folha

### Experiência e módulos complementares

- ✅ Saúde e Segurança do Trabalho
- ✅ Postos e rondas por QR Code
- ✅ Comunicação e autosserviço
- ✅ Movimentações e desligamento
- ✅ Relatórios, indicadores e custos
- ✅ Administração, auditoria e LGPD

### Persistência Supabase

- ✅ Etapa 21.1 — modelagem e fundação de dados
- ✅ Etapa 21.2 — configuração do projeto externo e migrations versionadas
- ✅ Etapa 21.3 — Supabase Auth e vínculo com o perfil interno
- ✅ Etapa 21.4 — RLS e isolamento multiempresa da fundação e módulos já migrados
- ✅ Etapa 21.5 — Supabase Storage
- ✅ Etapa 21.6 — migração incremental dos módulos
  - ✅ Empresas e usuários
  - ✅ Estrutura organizacional
  - ✅ Pessoas e vínculos básicos
  - ✅ Documentos
  - ✅ Workflows e tarefas
  - ✅ Admissão
  - ✅ Jornada e ponto
  - ✅ Ausências e férias
  - ✅ Benefícios
  - ✅ Folha e cálculos especiais
  - ✅ SST
  - ✅ Rondas
  - ✅ Comunicações e portal
  - ✅ Auditoria e governança
  - ✅ Relatórios e indicadores

### Próximo passo confirmado

✅ Fase 22 concluída. Próximo passo: iniciar a Fase 23 — piloto e entrada em produção, começando pela empresa fictícia com volume representativo.

---

## Arquitetura proposta

Stack
Frontend

- React com TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Zustand apenas para estados globais realmente necessários
- Lucide Icons
- Recharts para indicadores
- Vitest e Testing Library
- Playwright para jornadas críticas
  Backend
- Node.js com TypeScript
- Fastify ou Express
- Recomendação: Fastify pela validação, desempenho e arquitetura de plugins
- API REST versionada: /api/v1
- Zod para contratos e validações
- OpenAPI/Swagger
- Repositories independentes da persistência
- Filas internas e workers, inicialmente simulados em memória
- Vitest para testes
- Logs estruturados
  Futuro armazenamento
- PostgreSQL no Supabase
- Supabase Auth
- Supabase Storage
- Row Level Security
- Migrations versionadas
- Jobs agendados
- Backups e auditoria
  No frontend deverá existir apenas a chave pública. Credenciais privilegiadas nunca deverão ser expostas. No futuro, todas as tabelas acessíveis pela Data API deverão ter RLS e permissões mínimas. Segurança de dados, RLS
  Organização do repositório
  Recomendo um monorepo:
  fluxrh/
  ├── apps/
  │ ├── web/
  │ │ ├── src/
  │ │ │ ├── app/
  │ │ │ ├── assets/
  │ │ │ ├── components/
  │ │ │ │ ├── ui/
  │ │ │ │ ├── layout/
  │ │ │ │ ├── forms/
  │ │ │ │ ├── tables/
  │ │ │ │ └── feedback/
  │ │ │ ├── features/
  │ │ │ │ ├── auth/
  │ │ │ │ ├── dashboard/
  │ │ │ │ ├── organizations/
  │ │ │ │ ├── employees/
  │ │ │ │ ├── admissions/
  │ │ │ │ ├── workflows/
  │ │ │ │ ├── time-tracking/
  │ │ │ │ ├── vacations/
  │ │ │ │ ├── payroll/
  │ │ │ │ └── documents/
  │ │ │ ├── hooks/
  │ │ │ ├── lib/
  │ │ │ ├── mocks/
  │ │ │ ├── pages/
  │ │ │ ├── routes/
  │ │ │ ├── services/
  │ │ │ ├── styles/
  │ │ │ └── types/
  │ │ └── tests/
  │ └── api/
  │ ├── src/
  │ │ ├── app/
  │ │ ├── config/
  │ │ ├── modules/
  │ │ ├── shared/
  │ │ ├── infrastructure/
  │ │ ├── jobs/
  │ │ └── server.ts
  │ └── tests/
  ├── packages/
  │ ├── contracts/
  │ ├── domain/
  │ ├── ui/
  │ ├── config/
  │ └── testing/
  ├── docs/
  │ ├── architecture/
  │ ├── business-rules/
  │ ├── api/
  │ ├── decisions/
  │ └── workflows/
  ├── package.json
  └── README.md
  Cada funcionalidade do frontend teria sua própria estrutura:
  features/employees/
  ├── api/
  ├── components/
  ├── hooks/
  ├── pages/
  ├── schemas/
  ├── services/
  ├── types/
  ├── utils/
  └── tests/
  Cada módulo do backend:
  modules/employees/
  ├── employee.routes.ts
  ├── employee.controller.ts
  ├── employee.service.ts
  ├── employee.repository.ts
  ├── employee.schemas.ts
  ├── employee.types.ts
  ├── employee.events.ts
  └── tests/

O controller recebe a requisição, o service aplica regras, e o repository armazena ou consulta. Inicialmente, o repository será em memória; posteriormente, será substituído pelo repository PostgreSQL.
Roadmap de implantação
Fase 0 — Definição do produto e linguagem do domínio
Objetivo: eliminar ambiguidades antes de produzir muitas telas.

Atividades

- Definir perfis de usuário:
  - Administrador da plataforma
  - Administrador da empresa
  - RH
  - Departamento pessoal
  - Gestor
  - Supervisor de posto
  - Colaborador
  - Auditor
- Definir estrutura multiempresa:
  - Grupo
  - Empresa
  - Estabelecimento
  - Posto
  - Departamento
  - Centro de custo
- Criar glossário trabalhista e operacional
- Definir estados dos processos
- Definir matriz inicial de permissões
- Listar eventos do sistema
- Mapear workflows prioritários
- Definir o que é automático, aprovação e exceção
- Documentar regras que variam por empresa
- Documentar informações sensíveis conforme LGPD

Workflows inicialmente detalhados

1. Admissão
2. Onboarding
3. Correção de ponto
4. Recebimento de atestado
5. Solicitação de férias
6. Fechamento de ponto
7. Fechamento da folha
8. Alteração salarial
9. Afastamento
10. Desligamento

Entregáveis

- Documento de visão do produto
- Glossário
- Mapa de módulos
- Matriz de permissões
- Catálogo inicial de eventos
- Diagramas dos dez workflows
- Critérios de sucesso do MVP

Fase 1 — Fundação técnica
Objetivo: criar uma base estável para todos os módulos.

Frontend

- Configurar React, Vite e TypeScript
- Configurar Tailwind e shadcn/ui
- Configurar aliases de importação
- Configurar rotas
- Configurar TanStack Query
- Criar tratamento global de erros
- Criar sistema de notificações
- Criar carregamento, estado vazio e skeletons
- Criar temas claro e escuro
- Criar configuração de idioma e datas
- Criar máscaras brasileiras
- Criar formatação monetária e percentual
- Criar acessibilidade básica
- Criar layout responsivo

Backend

- Criar servidor Node.js
- Criar /api/v1
- Configurar validação
- Configurar padrão de respostas
- Configurar erros padronizados
- Criar documentação OpenAPI
- Criar logs estruturados
- Criar health check
- Criar IDs, datas e auditoria
- Criar repositories em memória
- Criar eventos internos

Qualidade

- ESLint
- Prettier
- Hooks de commit
- Testes unitários
- Testes de componentes
- Pipeline de validação
- Convenções de commits
- Registro de decisões arquiteturais

Critério de conclusão
Frontend e API executam separadamente, possuem testes básicos e trocam dados por um endpoint demonstrativo.

Fase 2 — Design System FluxRH
Objetivo: evitar que cada módulo crie componentes incompatíveis.

Componentes

- Botões
- Campos
- Selects
- Datas
- Moeda
- Percentuais
- CPF e CNPJ
- Telefone e CEP
- Autocomplete
- Upload
- Tabelas
- Paginação
- Ordenação
- Filtros
- Badges de status
- Modais
- Drawers
- Abas
- Timeline
- Stepper
- Cards de indicadores
- Calendário
- Menu contextual
- Confirmações
- Visualização de documentos
- Impressão
- Painel de exceção

Padrões de página

- Listagem
- Cadastro
- Edição
- Detalhes
- Wizard
- Painel
- Calendário
- Aprovação
- Auditoria
- Relatório
- Configuração

Entregáveis

- Catálogo visual
- Tokens de cor, tipografia e espaçamento
- Layout administrativo
- Layout do gestor
- Layout do colaborador
- Padrões de estados e feedbacks

O design system deverá ser a fonte única dos componentes. Essa abordagem é compatível com a recomendação da própria Lovable de separar componentes e regras reutilizáveis. Design systems da Lovable

Fase 3 — Navegação, autenticação simulada e contexto multiempresa
Objetivo: permitir navegar no produto como diferentes tipos de usuário.

Funcionalidades

- Tela de login
- Recuperação de acesso simulada
- Seletor de empresa
- Seletor de estabelecimento/posto
- Troca de contexto
- Menu baseado em perfil
- Rotas protegidas
- Sessão simulada
- Perfis e permissões simulados
- Bloqueio visual e funcional
- Página de acesso negado
- Histórico das últimas empresas acessadas

Abordagem sem banco
Criar usuários e organizações fictícios em arquivos de fixtures. O mesmo contrato será usado posteriormente pelo Supabase Auth e pela API real.

Critério de conclusão
É possível entrar como administrador, RH, gestor ou colaborador e visualizar apenas as áreas autorizadas.

Fase 4 — Central de Operações e Exceções
Objetivo: implementar primeiro o diferencial central do FluxRH.

Funcionalidades

- Dashboard geral
- Caixa de exceções
- Pendências
- Aprovações
- Prazos
- Alertas
- Processos em andamento
- Calendário
- Atividades recentes
- Filtros por empresa e unidade
- Prioridade
- Responsável
- Prazo
- Escalonamento
- Resolução e justificativa
- Reabertura
- Histórico

Tipos de exceção iniciais

- Documento inválido
- Documento vencido
- Admissão incompleta
- Contrato sem aceite
- Ponto ausente
- Jornada irregular
- Férias a vencer
- Atestado inconsistente
- Folha com divergência
- Tarefa atrasada

Critério de conclusão
O usuário consegue identificar o que exige ação humana sem navegar por todos os módulos.

Fase 5 — Estrutura organizacional
Objetivo: estabelecer o contexto operacional de todos os futuros módulos.

Funcionalidades

- Empresas
- Estabelecimentos
- Postos
- Departamentos
- Centros de custo
- Cargos
- Funções
- Gestores
- Sindicatos
- Feriados
- Jornadas padrão
- Organograma
- Status ativo/inativo
- Histórico de alterações

Regras

- Nenhum registro é apagado se possuir histórico
- Registros podem ser inativados
- Colaboradores podem mudar de lotação
- Toda movimentação possui vigência
- Cadastros são filtrados pelo contexto da empresa

Critério de conclusão
É possível representar uma empresa com múltiplos CNPJs, unidades, departamentos, postos e centros de custo.

Fase 6 — Colaboradores e prontuário digital
Objetivo: criar o cadastro central de pessoas.

Funcionalidades

- Lista de colaboradores
- Cadastro em etapas
- Dados pessoais
- Documentação
- Endereço
- Contatos
- Dependentes
- Dados profissionais
- Vínculo
- Cargo
- Salário
- Jornada
- Lotação
- Benefícios
- Dados bancários apenas cadastrais
- Contatos de emergência
- Arquivos
- Observações controladas
- Histórico
- Timeline
- Situação do vínculo
- Importação por CSV/XLSX

Cuidados

- Separar pessoa de vínculo empregatício
- Permitir recontratação
- Permitir mais de um vínculo
- Mascarar dados sensíveis
- Registrar quem visualizou ou alterou informações críticas

Critério de conclusão
O prontuário mostra a situação atual e todo o histórico do colaborador.

Fase 7 — Motor de workflows, regras e tarefas
Objetivo: transformar os módulos em processos autônomos.

Elementos do motor

- Evento
- Gatilho
- Condição
- Validação
- Ação
- Tarefa
- Prazo
- Tentativa
- Aprovação
- Exceção
- Escalonamento
- Conclusão
- Cancelamento

Funcionalidades

- Modelos de workflow
- Instâncias em execução
- Tarefas automáticas
- Tarefas humanas
- Responsáveis por papel
- Prazos
- Dependências
- Condições
- Reprocessamento
- Pausa
- Cancelamento
- Timeline
- Logs
- Simulador
- Versionamento

Primeira versão
Não construir ainda um editor visual complexo. Os workflows serão definidos por objetos TypeScript/JSON controlados pelo sistema. Um editor visual poderá surgir quando as regras estiverem maduras.

Critério de conclusão
Um evento inicia um processo, executa passos automáticos e abre uma exceção quando uma regra falha.

Fase 8 — Documentos e aceites eletrônicos
Objetivo: sustentar admissão, férias, folha e desligamento.

Funcionalidades

- Categorias
- Modelos
- Upload
- Visualização
- Download
- Validade
- Versões
- Situação
- Solicitação ao colaborador
- Validação
- Rejeição justificada
- Aceite eletrônico
- Confirmação de leitura
- Geração de comprovante
- Impressão
- Arquivamento
- Vencimentos
- Documentos obrigatórios por processo

Inicialmente
Arquivos podem ser representados por mocks e blobs locais de desenvolvimento. Supabase Storage entra apenas na fase de persistência.

Fase 9 — Admissão e onboarding
Objetivo: entregar o primeiro workflow completo.

Admissão

- Solicitação de contratação
- Aprovação
- Dados da vaga
- Convite
- Formulário de pré-admissão
- Checklist documental
- Validações
- Exame admissional registrado manualmente
- Contrato
- Aceite
- Cadastro de benefícios
- Definição de jornada
- Confirmação da admissão

Onboarding

- Checklist por cargo
- Tarefas para RH
- Tarefas para gestor
- Tarefas para colaborador
- Entrega de equipamentos
- Liberação de acessos registrada manualmente
- Treinamentos
- Apresentações
- Acompanhamento da experiência
- Pesquisas de 7, 30, 45 e 90 dias

Critério de conclusão
Uma admissão percorre o fluxo completo e chama o RH somente quando há documento rejeitado, prazo vencido ou aprovação necessária.

Esse é o primeiro grande marco comercial do produto.

Fase 10 — Jornada, escalas e ponto
Objetivo: controlar planejamento e execução da jornada.

Escalas

- Modelos 5×2, 6×1, 12×36
- Escalas personalizadas
- Turnos
- Intervalos
- Folgas
- Substituições
- Trocas
- Escala por posto
- Calendário
- Duplicação mensal
- Conflitos
- Cobertura mínima

Ponto

- Entrada
- Saída
- Intervalos
- Registro por QR Code
- QR Code fixo ou rotativo
- Validação de horário
- Identificação do dispositivo
- Geolocalização opcional
- Registros offline pendentes
- Ajustes
- Justificativas
- Aprovações
- Espelho de ponto
- Folha preenchida
- Folha em branco
- Assinatura ou aceite

Apuração

- Atrasos
- Saídas antecipadas
- Faltas
- Horas extras
- Adicional noturno
- DSR
- Banco de horas
- Inconsistências
- Fechamento mensal

Critério de conclusão
O sistema transforma marcações em eventos apurados e envia apenas divergências ao gestor ou RH.

Fase 11 — Férias, faltas, atestados e afastamentos

Férias

- Períodos aquisitivos
- Saldos
- Planejamento
- Solicitação
- Aprovação
- Fracionamento
- Abono
- Férias coletivas
- Alertas
- Aviso
- Recibo
- Integração interna com ponto e folha
  Ausências
- Falta justificada
- Falta injustificada
- Folga
- Licença
- Atestado
- Afastamento
- Ocorrência
- Anexos
- Aprovação
- Reflexo no ponto
  Automação
- Alertar férias próximas do vencimento
- Detectar sobreposição
- Verificar cobertura da equipe
- Atualizar calendário
- Atualizar ponto
- Preparar eventos para folha
- Criar exceção em caso de inconsistência
  Fase 12 — Benefícios
  Funcionalidades
- Catálogo
- Planos
- Valores
- Elegibilidade
- Adesão
- Dependentes
- Inclusão
- Alteração
- Cancelamento
- Coparticipação
- Desconto
- Movimentações
- Histórico
- Relatório para processamento manual
  Benefícios iniciais
- Vale-transporte
- Vale-refeição
- Vale-alimentação
- Plano de saúde
- Plano odontológico
- Seguro de vida
- Auxílios configuráveis
  Nenhuma API externa será necessária. O sistema gera relatórios e arquivos para execução manual.
  Fase 13 — Motor de cálculo da folha
  Objetivo: criar uma engine testável antes da interface de fechamento.
  Ordem de implementação

1. Competência
2. Contrato e salário-base
3. Rubricas
4. Fórmulas
5. Bases de cálculo
6. Incidências
7. Tabelas com vigência
8. Proventos
9. Descontos
10. Encargos
11. Arredondamentos
12. Retroativos
13. Memória de cálculo
    Cálculos

- Salário mensal
- Saldo de salário
- Hora normal
- Horas extras
- Adicional noturno
- Periculosidade
- Insalubridade
- Faltas
- Atrasos
- DSR
- INSS
- IRRF
- FGTS
- Salário-família
- Benefícios
- Adiantamentos
- Férias
- 13º
- PLR
- Rescisão
  Requisito indispensável
  Cada fórmula precisa possuir:
- Identificador
- Versão
- Início de vigência
- Fim de vigência
- Dependências
- Casos de teste
- Explicação legível
- Memória de cálculo
  Critério de conclusão
  O resultado deve ser reproduzível: os mesmos dados e versões de regras sempre produzem o mesmo cálculo.
  Fase 14 — Fechamento da folha
  Funcionalidades
- Abrir competência
- Importar eventos
- Consolidar ponto
- Consolidar benefícios
- Calcular
- Recalcular
- Comparar com mês anterior
- Detectar variações
- Criar exceções
- Aprovar
- Fechar
- Reabrir com justificativa
- Gerar holerites
- Gerar recibos
- Gerar relatório de pagamentos
- Exportar CSV, XLSX, PDF ou TXT
  Validações
- Salário negativo
- Líquido fora de faixa
- Evento duplicado
- Ausência de salário
- Mudança significativa
- Horas extras excessivas
- Falta sem tratamento
- Benefício incompatível
- Colaborador admitido ou desligado na competência
  Fase 15 — Saúde e Segurança do Trabalho
  Funcionalidades
- Exames
- ASOs
- Tipos de exame
- Riscos por cargo
- Validades
- EPIs
- Entregas e devoluções
- Treinamentos
- Acidentes
- CAT registrada
- Restrições
- Alertas
- Documentos
  Clínicas e profissionais serão cadastros internos. Solicitações serão geradas para impressão ou envio manual.
  Fase 16 — Postos e rondas por QR Code
  Funcionalidades
- Postos
- Locais
- Rotas
- Pontos de ronda
- QR Codes
- Agenda
- Tolerância
- Leitura
- Evidências
- Ocorrências
- Ronda incompleta
- Desvio de rota
- Alertas
- Relatórios
- Dashboard do supervisor
  Exceções
- Ronda não iniciada
- Ponto ignorado
- Leitura fora da janela
- Sequência inválida
- Dispositivo inesperado
- Ocorrência crítica
  Fase 17 — Comunicação e autosserviço
  Portal do colaborador
- Meu cadastro
- Meus documentos
- Ponto
- Escala
- Férias
- Atestados
- Holerites
- Benefícios
- Tarefas
- Comunicados
- Solicitações
- Aceites
  Portal do gestor
- Minha equipe
- Aprovações
- Escalas
- Ponto
- Ausências
- Férias
- Tarefas
- Alertas
- Indicadores
  Comunicação nativa
- Caixa de entrada
- Comunicados
- Confirmação de leitura
- Comentários
- Menções
- Notificações internas
- Preferências
- Modelos de mensagem
  Fase 18 — Movimentações e desligamento
  Movimentações
- Promoção
- Alteração salarial
- Mudança de cargo
- Transferência
- Alteração de jornada
- Alteração de centro de custo
- Prorrogação de experiência
- Aditivos
  Desligamento
- Solicitação
- Aprovação
- Motivo
- Aviso
- Checklist
- Cálculo rescisório
- Cancelamento de benefícios
- Devolução de equipamentos
- Registro de revogação de acessos
- Documentos
- Aceites
- Entrevista
- Arquivamento
  Fase 19 — Relatórios, indicadores e custos
  Indicadores
- Headcount
- Admissões
- Desligamentos
- Turnover
- Absenteísmo
- Horas extras
- Custo de pessoal
- Férias
- Afastamentos
- Documentos vencidos
- Processos atrasados
- Tempo médio de admissão
- Percentual automatizado
- Exceções por processo
- Tempo de resolução
  Relatórios
- Filtros salvos
- Colunas configuráveis
- Agrupamento
- Exportação
- Impressão
- Agendamento interno
- Visibilidade por perfil
- Histórico de geração
  O indicador mais importante do FluxRH deverá ser:
  Percentual de etapas operacionais concluídas sem intervenção humana.
  Fase 20 — Administração, auditoria e LGPD
  Funcionalidades
- Usuários
- Papéis
- Permissões
- Escopo por empresa
- Escopo por unidade
- Delegação temporária
- Logs de acesso
- Logs de alteração
- Histórico de aprovações
- Sessões
- Exportação de dados
- Anonimização
- Retenção
- Consentimentos
- Incidentes
- Configurações da empresa
- Templates
- Numerações
- Parâmetros
  Regra de permissão
  A autorização deverá considerar:
  usuário

* papel
* ação
* módulo
* empresa
* estabelecimento
* departamento
* sensibilidade do dado
  Fase 21 — Persistência PostgreSQL/Supabase
  Somente aqui os repositories em memória começam a ser substituídos.
  Etapa 21.1 — Modelagem

- Consolidar entidades efetivamente utilizadas
- Remover conceitos que não sobreviveram à validação
- Definir agregados e relacionamentos
- Definir dados históricos
- Definir vigências
- Definir estratégia multiempresa
- Definir retenção
- Definir particionamento futuro
- Definir tabelas de auditoria
  Etapa 21.2 — Supabase local
- Configurar Supabase CLI
- Configurar ambiente local
- Adotar schemas declarativos
- Criar migrations geradas e revisadas
- Criar seed de desenvolvimento
- Criar fixtures de teste
- Configurar backups
- Documentar restauração
  Etapa 21.3 — Autenticação
- Integrar Supabase Auth
- Relacionar usuário e perfil interno
- Migrar sessão simulada
- Recuperação de senha
- Convites
- Sessões
- Revogação
- Auditoria
  Não utilizar metadados editáveis pelo usuário para autorização. Papéis e escopos devem ser controlados pela aplicação e por dados confiáveis.
  Etapa 21.4 — RLS e isolamento multiempresa
- Habilitar RLS nas tabelas expostas
- Restringir por organização
- Restringir por unidade quando necessário
- Criar políticas específicas por operação
- Validar SELECT, INSERT, UPDATE e DELETE
- Testar tentativas de acesso cruzado
- Testar perfis e delegações
- Manter chaves privilegiadas somente no backend
  Etapa 21.5 — Storage
- ✅ Documentos
- ✅ Atestados
- ✅ Contratos
- ✅ Holerites
- ✅ Relatórios
- ✅ Evidências de ronda
- ✅ Políticas por empresa e usuário
- ✅ Upload, leitura, substituição e remoção
- ⬜ Antivírus ou quarentena futura
  Etapa 21.6 — Migração dos módulos
  Sequência recomendada:

1. Empresas e usuários
2. Estrutura organizacional
3. Pessoas e vínculos
4. Documentos
5. Workflows e tarefas
6. Admissão
7. Jornada e ponto
8. Ausências e férias
9. Benefícios
10. Folha
11. SST
12. Rondas
13. Comunicações
14. Auditoria
15. Relatórios
    Cada módulo só migra quando seus testes de contrato funcionarem igualmente com repository em memória e repository PostgreSQL.

## Fase 22 — Segurança e robustez ✅

Testes

- ✅ Unitários
- ✅ Integração de Storage no projeto externo
- ✅ Contrato REST da proteção HTTP e validação de uploads
- ✅ Componentes (Testing Library + Axe no modal base, autenticação e governança)
- ✅ Fluxos completos (jornadas críticas da API cobertas de ponta a ponta)
- ✅ Permissões de arquivos por papel e usuário
- ✅ Isolamento multiempresa dos arquivos e objetos
- ✅ Cálculos trabalhistas
- ✅ Concorrência otimista dos estados persistidos
- ✅ Uploads
- ✅ Impressão (documentos e folhas de QR com estilos dedicados e acionamento automatizado)
- ✅ Responsividade (shell, autenticação e módulos cobertos pelos breakpoints globais e específicos, com validação em 390 px e 1440 px)
- ✅ Acessibilidade (18 módulos auditados com Axe, além de modal, autenticação, governança, menu móvel, atalho de conteúdo e navegação por teclado/ARIA)
- ✅ Prontidão de recuperação no banco principal (backups e migrations conferidos; testes remotos transacionais; restauração destrutiva somente em incidente autorizado)

Segurança

- ✅ Proteção contra acesso entre empresas no Storage
- ✅ Rate limiting na API
- ✅ Sanitização e rejeição de entradas perigosas
- ✅ Validação de tamanho, MIME, extensão, categoria e transições de arquivos
- ✅ Proteção de dados sensíveis com bucket privado e URLs temporárias
- ✅ Mascaramento de autorização, cookies e sessão nos logs
- ✅ Varredura automatizada de segredos privilegiados versionados
- ✅ Gestão e rotação de credenciais (sem segredo privilegiado no runtime; varredura automatizada e runbook de rotação/incidente)
- ✅ Validação de expiração e existência da sessão nas autorizações sensíveis
- ✅ Revogação remota de sessão com bloqueio imediato e auditoria
- ✅ Auditoria imutável para papéis da aplicação
- ✅ Cabeçalhos de segurança
- ✅ Política de retenção por organização e categoria, com “legal hold”

Desempenho

- ✅ Paginação com limites na API
- ✅ Filtros server-side
- ✅ Cache controlado (`no-store` nas respostas sensíveis)
- ✅ Índices por organização, relacionamentos e consultas operacionais
- ✅ Processamento assíncrono com fila interna
- ✅ Geração de relatórios em background com estados `processing` e `ready`
- ✅ Testes com volume representativo de 10.000 colaboradores

---

## Fase 23 — Piloto interno 🟡

### Massa operacional

- ✅ Empresa fictícia completa
- ✅ Pelo menos 100 colaboradores simulados (120 no Grupo Flux)
- ✅ Dois estabelecimentos
- ✅ Três postos
- ✅ Diferentes escalas (5×2, 12×36 e 6×1)
- ✅ Ciclo completo de uma competência

### Jornadas do piloto

- ✅ Admissões
- ✅ Férias
- ✅ Atestados
- ✅ Desligamentos
- ✅ Exceções propositais
- ✅ Fechamento de ponto
- ✅ Prévia e fechamento da folha
- ✅ Holerites, relatórios e evidências
- ✅ Relatório final de divergências e decisões

### Critérios de saída

- ✅ Toda jornada crítica executada com os dados do piloto
- ✅ Exceções detectadas, tratadas e auditadas
- ✅ Competência fechada e reconciliada
- ✅ Nenhum defeito crítico ou alto em aberto
- ✅ Evidências do piloto anexadas ao repositório

---

## Fase 24 — Piloto assistido com clientes 🟡

### Perfis recomendados

- ✅ Perfil de empresa pequena definido
- ✅ Perfil de empresa com múltiplos postos definido
- ✅ Perfil de escritório de RH ou DP consultivo definido

### Operação assistida

- ✅ Termos, escopo, responsáveis e calendário definidos
- ⬜ Execução paralela ao processo atual
- ✅ Regra formalizada: não substituir a folha oficial durante o piloto
- ⬜ Comparação de resultados
- ⬜ Correção das divergências
- ⬜ Registro das decisões e aceite dos participantes
- ✅ Plano de suporte e resposta a incidentes definido para validação com os participantes

### Critérios de saída

- ⬜ Pelo menos dois ciclos paralelos concluídos
- ⬜ Divergências críticas zeradas
- ⬜ Aprovação formal dos clientes-piloto
- ⬜ Backlog de produção priorizado

---

## Fase 25 — Entrada gradual em produção ⬜

1. ⬜ Cadastro e documentos
2. ⬜ Admissão
3. ⬜ Portal do colaborador
4. ⬜ Ponto
5. ⬜ Férias e ausências
6. ⬜ Prévia da folha
7. ⬜ Folha oficial
8. ⬜ Demais módulos

### Controles de entrada

- ⬜ Plano de rollback por incremento
- ⬜ Monitoramento, alertas e responsáveis de plantão
- ⬜ Backups e recuperação reconfirmados antes de cada avanço
- ⬜ Métricas de adoção, erros e tempo operacional acompanhadas
- ⬜ Aprovação explícita antes de ativar a folha oficial

---

## Fase 26 — Produção comercial e evolução contínua ⬜

- ⬜ Operação comercial liberada
- ⬜ Onboarding padronizado de novos clientes
- ⬜ SLA de suporte e incidentes publicado
- ⬜ Monitoramento de segurança e desempenho contínuo
- ⬜ Revisões periódicas de LGPD, acessos e retenção
- ⬜ Roadmap trimestral orientado por métricas e feedback

---

## Marcos comerciais recomendados

| Marco | Produto utilizável |
|---|---|
| M1 | Protótipo navegável e design system |
| M2 | Empresas, colaboradores e central de exceções |
| M3 | Admissão e onboarding autônomos |
| M4 | Ponto, escalas, férias e atestados |
| M5 | Benefícios, documentos e portal |
| M6 | Motor de folha e holerites |
| M7 | Desligamento, SST e rondas |
| M8 | Supabase, segurança e persistência |
| M9 | Piloto operacional |
| M10 | Produção comercial |

## Priorização sugerida

### MVP

- Fundação técnica
- Design system
- Multiempresa
- Colaboradores
- Central de exceções
- Motor de workflows
- Documentos
- Admissão
- Onboarding
- Ponto
- Férias e atestados
- Portal do colaborador
- Auditoria básica

### Versão 1.0

- Folha completa
- Benefícios
- Desligamento
- SST
- Portal do gestor
- Relatórios
- Supabase
- Segurança e LGPD
- Piloto validado

### Versão 1.5

- Rondas
- Desempenho
- Cargos e salários
- PLR
- Analytics avançado
- Construtor visual de workflows
- Relatórios configuráveis

## Princípios que devem permanecer durante toda a construção

1. Toda entidade pertence a uma empresa ou possui escopo explicitamente global.
2. Toda regra possui vigência e versão.
3. Toda alteração sensível gera auditoria.
4. Todo cálculo possui memória explicável.
5. Todo processo possui estado, responsável e prazo.
6. Toda automação pode gerar uma exceção.
7. Toda exceção precisa informar causa e ação esperada.
8. Nenhuma tela acessa diretamente a tecnologia de banco.
9. Nenhum módulo depende de API paga externa.
10. Importação, exportação e operação manual são caminhos oficiais.
11. Registros históricos não são sobrescritos.
12. Persistência é uma implementação do domínio, não o próprio domínio.
Essa ordem permite validar o produto inteiro com dados simulados, evitando cristalizar prematuramente uma modelagem de banco. Quando o Supabase entrar, o domínio, os contratos REST, as permissões e os workflows já terão sido testados na prática — reduzindo bastante o risco de migrations destrutivas e reformulações profundas.
