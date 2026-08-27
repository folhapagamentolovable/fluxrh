# ADR 0009 — Fundação de dados e primeira jornada persistente

## Status

Aceito e parcialmente implementado. A fundação e o primeiro adaptador transacional estão implantados no projeto externo `akdmobvbombhqvvglayn`, sem stack local com Docker.

## Decisão

A persistência será adicionada por adaptadores de repository, preservando contratos e regras existentes. O PostgreSQL/Supabase será a infraestrutura inicial, com migrations versionadas e Row Level Security. A interface web não acessará tabelas diretamente.

## Contexto organizacional

Toda tabela de negócio terá `organization_id`. A organização é a fronteira de isolamento. Empresas e unidades pertencem a uma organização; usuários recebem papéis dentro dela.

## Entidades fundamentais

| Entidade | Campos essenciais | Relações |
| --- | --- | --- |
| organizations | id, name, document, status, created_at | raiz do tenant |
| organization_members | organization_id, user_id, role, status | usuário por organização |
| companies | id, organization_id, legal_name, trade_name, document, status | organização |
| organization_units | id, organization_id, company_id, parent_id, type, code, name, status | empresa e hierarquia |
| employees | id, organization_id, company_id, registration, personal data, status | empresa e usuário opcional |
| employment_links | id, employee_id, establishment_id, department_id, cost_center_id, position, salary, dates | colaborador e unidades |
| workflow_definitions | id, organization_id, key, version, definition, active | versão imutável após uso |
| workflow_instances | id, organization_id, definition_id, subject_type, subject_id, state, due_at | execução do processo |
| workflow_tasks | id, organization_id, instance_id, kind, status, assignee_id, due_at | instância |
| operational_exceptions | id, organization_id, source_type, source_id, priority, status, recommendation, due_at | evento ou workflow |
| domain_events | id, organization_id, aggregate_type, aggregate_id, event_type, payload, occurred_at | integração e automação |
| audit_events | id, organization_id, actor_type, actor_id, action, resource_type, resource_id, before, after, occurred_at | trilha append-only |

Documentos serão adicionados à primeira jornada quando a fundação estiver validada, utilizando metadados no PostgreSQL e arquivos no Storage.

## Identidade e autorização

- `auth.users` representa identidade, não perfil de negócio.
- `organization_members` define acesso e papel no tenant.
- Papéis: `super_admin`, `owner`, `admin`, `hr`, `payroll`, `manager`, `employee`, `auditor`.
- `super_admin` é reservado à administração da plataforma e, quando ativo em uma organização, supera as verificações de papel daquela organização. Sua concessão ocorre apenas por operação administrativa auditável, nunca por autoatendimento.
- Permissões sensíveis serão verificadas na API e reforçadas por RLS.
- Service roles nunca serão expostas no frontend.

## Políticas de segurança

1. Leituras e escritas exigem associação ativa à organização.
2. Colaboradores acessam apenas o próprio prontuário permitido.
3. Gestores acessam somente o escopo hierárquico autorizado.
4. RH e DP recebem permissões distintas para dados pessoais e financeiros.
5. Auditoria é append-only para usuários comuns.
6. Operações automáticas registram ator técnico e correlação.

## Convenções

- IDs UUID gerados no banco ou na camada de aplicação.
- Datas em `timestamptz`; datas civis em `date`.
- Valores monetários em `numeric`, nunca ponto flutuante.
- CPF, CNPJ e telefone são persistidos somente com dígitos, sem pontuação. Máscaras pertencem à camada de apresentação.
- Todo novo campo de CPF, CNPJ ou telefone deve usar os formatadores e validadores compartilhados; formulários não podem ser enviados com valores inválidos.
- CPF é exibido como `000.000.000-00`; CNPJ como `00.000.000/0000-00`; telefone como `(00) 0000-0000` ou `(00) 00000-0000`.
- A API deve normalizar novamente esses valores na fronteira de entrada antes de qualquer persistência, sem confiar apenas no frontend.
- `created_at`, `updated_at` e versão otimista nas entidades mutáveis.
- Exclusão lógica apenas quando exigida pelo domínio; auditoria não é apagada.

## Sequência de implementação

1. Aprovar este modelo e os limites de acesso.
2. Criar migrations versionadas e seeds demonstrativos para aplicação controlada no projeto externo.
3. Implementar autenticação e seleção de organização.
4. Criar adaptadores persistentes para organizações e colaboradores. **Concluído no código.**
5. Persistir admissão, tarefas e transições do workflow.
6. Persistir exceções e auditoria.
7. Executar testes de isolamento e da jornada vertical.
8. Aplicar no projeto externo de desenvolvimento somente após revisão explícita. **Concluído para a fundação e o cadastro de colaboradores.**

## Compatibilidade com o modo de demonstração

A seleção do adaptador será feita por configuração. Os contratos públicos permanecem iguais, permitindo que Lovable e testes continuem usando dados locais enquanto o ambiente integrado usa a persistência.

O modo padrão é `FLUXRH_PERSISTENCE=memory`. Para usar os adaptadores persistentes no projeto externo, a API exige `FLUXRH_PERSISTENCE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e o token Bearer da sessão autenticada. A API usa a chave publicável e preserva o contexto do usuário para que o RLS permaneça efetivo; não utiliza `service_role`. O modo em memória serve apenas para demonstração e testes da aplicação, não representa um banco Supabase local.

