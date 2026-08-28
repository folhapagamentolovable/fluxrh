# Roadmap do FluxRH

## Estado atual — Fase 1 concluída tecnicamente

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

Estado: funcional em modo local; persistência por domínio será entregue incrementalmente, começando por Documentos.

- Documentos e aceite eletrônico. **Persistência Supabase implementada.**
- Jornada, ponto, banco de horas e fechamento. **Persistência Supabase implementada.**
- Férias, ausências, atestados e afastamentos. **Persistência Supabase preparada.**
- Benefícios e movimentações.
- Folha contínua, pré-fechamento e memória de cálculo.

## Fase 3 — experiência e integração

Estado: experiência demonstrável em modo local. Itens sem marcação explícita permanecem planejados e não estão atrasados enquanto a persistência da Fase 2 estiver em andamento.

- Portal do colaborador e do gestor. **Implementado em modo local.**
- Central universal de solicitações. **Implementada em modo local.**
- Comunicação orientada a eventos. **Implementada em modo local.**
- Relatórios, indicadores e dashboards gerenciais. **Implementados em modo local.**
- Saúde ocupacional, exames, riscos e vencimentos. **Implementados em modo local.**
- Controle de rondas e postos por QR Code. **Implementado em modo local.**
- Auditoria, perfis, permissões e governança. **Implementados em modo local.**
- Integrações contábeis, bancárias e governamentais.
- Observabilidade, exportações e operação assistida.

## Fase 4 — inteligência operacional

- Detecção de anomalias.
- Recomendações explicáveis.
- Simulações e previsão de riscos.
- Automação configurável com níveis de autonomia.

## Critério de conclusão de cada incremento

Um incremento só é considerado concluído quando possui contrato validado, regra testada, interface utilizável, auditoria prevista, build aprovado e comportamento verificado no ambiente publicado.
