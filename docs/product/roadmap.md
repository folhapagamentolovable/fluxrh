# Roadmap do FluxRH

## Estado atual — protótipo operacional

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

### 1.2 Fundação de dados — próxima implementação técnica

- Autenticação e identidade.
- Organizações, usuários, papéis e permissões.
- Empresas e unidades organizacionais.
- Colaboradores e vínculos.
- Eventos, tarefas, exceções e auditoria.
- Migrations, seeds e políticas de isolamento por organização.

### 1.3 Primeira jornada vertical

- Persistir organização e empresa.
- Cadastrar colaborador.
- Iniciar admissão versionada.
- Criar e executar tarefas do workflow.
- Gerar e resolver exceções.
- Auditar todas as transições.

## Fase 2 — operação essencial

- Documentos e aceite eletrônico.
- Jornada, ponto, banco de horas e fechamento.
- Férias, ausências, atestados e afastamentos.
- Benefícios e movimentações.
- Folha contínua, pré-fechamento e memória de cálculo.

## Fase 3 — experiência e integração

- Portal do colaborador e do gestor. **Implementado em modo local.**
- Central universal de solicitações. **Implementada em modo local.**
- Comunicação orientada a eventos. **Implementada em modo local.**
- Relatórios, indicadores e dashboards gerenciais. **Implementados em modo local.**
- Saúde ocupacional, exames, riscos e vencimentos. **Implementados em modo local.**
- Integrações contábeis, bancárias e governamentais.
- Observabilidade, exportações e operação assistida.

## Fase 4 — inteligência operacional

- Detecção de anomalias.
- Recomendações explicáveis.
- Simulações e previsão de riscos.
- Automação configurável com níveis de autonomia.

## Critério de conclusão de cada incremento

Um incremento só é considerado concluído quando possui contrato validado, regra testada, interface utilizável, auditoria prevista, build aprovado e comportamento verificado no ambiente publicado.
