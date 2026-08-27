# ADR 0010 — Estado persistente versionado por domínio

## Contexto

Os módulos de operação essencial e experiência já possuíam contratos, regras e repositories em memória validados. Reescrever simultaneamente todos esses motores como modelos relacionais criaria duas implementações concorrentes das mesmas regras e elevaria o risco de regressão.

## Decisão

Persistir o estado completo de cada domínio em `public.module_repository_states`, identificado por organização e módulo. A API continua executando as regras nos repositories existentes, reidrata o estado antes de cada operação e grava um novo snapshot após mutações.

A gravação ocorre exclusivamente por `public.save_module_repository_state`, que:

- valida organização, módulo e papel do usuário autenticado;
- usa versão esperada para impedir sobrescrita concorrente;
- registra cada versão em `audit_events`;
- não concede execução ao papel anônimo.

A tabela possui RLS e somente expõe estados compatíveis com o papel do usuário dentro da organização ativa. O modo em memória permanece disponível para testes e preview local.

## Domínios cobertos

- férias, ausências e atestados;
- benefícios e movimentações;
- folha e cálculos especiais;
- saúde ocupacional;
- rondas;
- comunicações;
- portal e autosserviço;
- desligamentos;
- análises e relatórios;
- governança.

## Consequências

- O estado sobrevive a reinícios da API sem duplicar regras de negócio.
- O isolamento multiempresa e a autorização permanecem no banco.
- Escritas concorrentes são serializadas no processo e protegidas por versão no banco.
- Consultas analíticas diretamente sobre atributos internos de cada domínio ainda exigirão projeções ou tabelas relacionais especializadas. Essa evolução pode ocorrer módulo a módulo sem alterar os contratos atuais.

## Verificação

O teste `supabase/tests/003_remaining_modules_remote_smoke.sql` valida todos os módulos dentro de uma transação revertida, incluindo permissões e conflito de versão.
