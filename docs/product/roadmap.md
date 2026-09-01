# Roadmap do FluxRH

## Estado atual — Fase 1 concluída tecnicamente, aceite funcional parcial

Os marcos anteriores foram reclassificados: “concluído tecnicamente” cobre contratos, regras, persistência, migrations, testes e build; “concluído funcionalmente” exige também que todas as ações visíveis (inclusive secundárias) funcionem de ponta a ponta no ambiente publicado, com permissões, estados de erro/sucesso e auditoria. As entregas sintéticas não representam liberação comercial.

- Interface Lovable/Vite com navegação dos módulos principais.
- API REST e contratos TypeScript compartilhados.
- Repositórios em memória usados pela API e adaptador local usado pelo preview.
- Jornadas demonstráveis de organizações, pessoas, admissão, workflows, documentos, jornada, ausências, benefícios e folha.
- Testes automatizados de regras críticas e build estático.

## Fase 1 — fundação do produto

### 1.1 Documentação permanente — atual

- Visão do produto e mapa operacional.
- Roadmap e estado atual.
- Registro de decisões arquiteturais.
- Modelo conceitual de dados.

### 1.2 Fundação de dados — concluída

- Autenticação e identidade.
- Organizações, usuários, papéis e permissões.
- Empresas e unidades organizacionais.
- Colaboradores e vínculos.
- Eventos, tarefas, exceções e auditoria.
- Migrations, seeds e políticas de isolamento por organização.

### 1.3 Primeira jornada vertical — concluída

- Persistir organização e empresa.
- Cadastrar colaborador.
- Iniciar admissão versionada.
- Criar e executar tarefas do workflow.
- Gerar e resolver exceções.
- Auditar todas as transições.

Todos os itens da Fase 1 possuem contrato, API, persistência Supabase, isolamento organizacional e interface exercitável. A validação publicada continua sendo repetida a cada release, não constitui uma fase separada.

## Fase 2 — operação essencial

Estado: contratos, regras, interface principal e persistência Supabase concluídos; aceite funcional completo permanece **em andamento** devido a ações secundárias pendentes em alguns módulos.

- Documentos e aceite eletrônico. **Persistência e Storage Supabase implementados.**
- Jornada, ponto, banco de horas e fechamento. **Persistência Supabase implementada e validada remotamente.**
- Férias, ausências, atestados e afastamentos. **Persistência Supabase implementada.**
- Benefícios e movimentações. **Persistência Supabase implementada.**
- Folha contínua, pré-fechamento e memória de cálculo. **Persistência Supabase implementada.**

## Fase 3 — experiência e integração

Estado: experiência demonstrável e estado persistente por organização no Supabase; aceite funcional completo permanece **em andamento** até a validação de todas as ações secundárias e fluxos publicados.

- Portal do colaborador e do gestor. **Persistência Supabase implementada.**
- Central universal de solicitações. **Persistência Supabase implementada.**
- Comunicação orientada a eventos. **Persistência Supabase implementada.**
- Relatórios, indicadores e dashboards gerenciais. **Persistência Supabase implementada.**
- Saúde ocupacional, exames, riscos e vencimentos. **Persistência Supabase implementada.**
- Controle de rondas e postos por QR Code. **Persistência Supabase implementada.**
- Auditoria, perfis, permissões e governança. **Persistência Supabase implementada.**
- Storage privado para documentos, atestados, contratos, holerites, relatórios e evidências. **Implementado e validado remotamente.**
- Integrações contábeis, bancárias e governamentais.
- Observabilidade, exportações e operação assistida.

## Fase 4 — inteligência operacional

- Detecção de anomalias.
- Recomendações explicáveis.
- Simulações e previsão de riscos.
- Automação configurável com níveis de autonomia.

## Marco 27 — liberação operacional externa restrita

Estado: **concluído tecnicamente; liberação funcional restrita em validação**. O gate não substitui a validação ponta a ponta dos fluxos de interface.

- Gate persistido de ativação real no Supabase.
- Mutações externas restritas a sessões autenticadas com vínculo ativo `super_admin`.
- Demais papéis mantidos em modo somente leitura.
- API com bloqueio global e falha segura quando o gate não pode ser verificado.
- Migration remota `20260828160000` aplicada e validada.

## Marco 28 — primeiro ciclo real controlado

Estado: **controle técnico implementado e aplicado remotamente; execução funcional pendente**.

- Registro persistente de competência, escopo, checklist de entrada, revisor humano e rollback.
- Aprovação explícita e exclusiva por `super_admin`, sem acionar folha oficial.
- Evidências referenciadas com hash SHA-256 opcional e auditoria append-only.
- Execução paralela continua condicionada à identificação humana da organização, competência e responsáveis reais.

## Critério de conclusão de cada incremento

Um incremento só é considerado concluído quando possui contrato validado, regra testada, interface utilizável (ações primárias e secundárias), auditoria prevista, build aprovado, permissões verificadas e comportamento completo validado no ambiente publicado. Caso qualquer ação visível ainda seja apenas decorativa, o estado deve ser **em andamento**.
