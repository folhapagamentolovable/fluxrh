# Estado atual

Atualizado em 27 de agosto de 2026.

## Entregue

- Estrutura monorepo TypeScript compatível com o build do Lovable.
- Aplicação React/Vite publicada em modo de preview.
- API REST modular e contratos validados com Zod.
- Camada de dados local para o navegador, sem dependência da API externa.
- Repositórios em memória substituíveis por persistência.
- Fluxos demonstráveis dos principais módulos de RH.
- Suite automatizada de testes e comandos de typecheck/build.
- Desligamentos e rescisões com cálculo, checklist, documentos e exceções.
- Portal do colaborador e do gestor com solicitações, documentos e aprovações.
- Central de comunicação com notificações por evento, comunicados, modelos, deduplicação e escalonamento.
- Indicadores gerenciais, análises por departamento, insights e geração rastreável de relatórios.
- Saúde ocupacional com agenda de exames, ASOs, riscos funcionais, programas e exceções.
- Rondas por QR Code com rotas, pontos, leituras offline, ocorrências e cobertura operacional.
- Governança com RBAC, escopos organizacionais, segregação de funções, auditoria e sessões.
- Adaptadores Supabase para organizações, empresas, unidades e prontuário básico de colaboradores.
- Criação transacional de colaborador e vínculo empregatício por função protegida por papel e RLS.
- Seleção explícita entre persistência em memória e Supabase, mantendo o modo demonstrativo como padrão.
- Fundação persistente e criação transacional de colaboradores implantadas no projeto Supabase externo `akdmobvbombhqvvglayn`.
- Primeiro acesso e organização reais validados; usuário administrador promovido a `super_admin`.
- Adaptador Supabase de admissões iniciado, com criação e transição transacionais de instância e tarefas, evento de domínio e auditoria.
- RLS externo validado nas tabelas principais e execução pública da função automática de RLS removida.
- Central de Exceções conectada à API, com busca, filtros e resolução auditável.
- Exceções podem ser abertas a partir de admissões, pausam o workflow e o liberam após a resolução da última pendência.
- Histórico da admissão reconstruído a partir da auditoria persistente.
- Documentos, dependentes e linha do tempo do prontuário possuem tabelas isoladas por organização e leitura pelo adaptador persistente.
- Documentos, modelos, validações, eventos e evidências de aceite eletrônico possuem persistência Supabase, RLS e hash SHA-256 calculado no banco.
- Jornada e Ponto persistidos no Supabase, com RLS ativo e fluxo remoto validado para marcação por QR, bloqueio de aprovação por exceção aberta, resolução auditável e aprovação de competência.
- Smoke test remoto transacional de Jornada/Ponto versionado em `supabase/tests/002_time_tracking_remote_smoke.sql`; ele sempre termina com `ROLLBACK` e não deixa dados artificiais no projeto.
- Férias, ausências, benefícios, folha, cálculos especiais, SST, rondas, comunicações, portal, desligamentos, análises e governança com estado persistente versionado por organização no Supabase.
- Controle otimista de concorrência, RLS por domínio e papel, auditoria de versões e nova tentativa automática em conflitos transitórios.
- Smoke test remoto transacional dos onze domínios versionado em `supabase/tests/003_remaining_modules_remote_smoke.sql`.
- Storage privado implantado para documentos, atestados, contratos, holerites, relatórios e evidências de ronda, com metadados relacionais e isolamento por organização e usuário.
- Upload direto por URL assinada, confirmação de integridade, download temporário, substituição versionada e remoção física pela API REST.
- Smoke test remoto transacional das políticas de Storage versionado em `supabase/tests/004_secure_storage_remote_smoke.sql`, sem deixar arquivos ou metadados artificiais no projeto.
- Primeira entrega da Fase 22 concluída: rate limiting, CORS restritivo, limite de payload, sanitização, cabeçalhos defensivos e mascaramento de credenciais nos logs da API.
- Matriz remota de permissões de Storage validada para colaborador, gestor e organização externa em `supabase/tests/005_storage_permissions_isolation_remote.sql`.
- Metadados de arquivos endurecidos no banco contra divergência entre extensão e MIME, alteração da identidade do objeto e transições inválidas de estado.
- Sessões reais do Supabase Auth integradas à governança, com revogação administrativa auditada e bloqueio imediato das autorizações vinculadas ao `session_id` removido.
- Retenção de arquivos configurável por organização e categoria, prazo calculado no banco e preservação por “legal hold”.
- Runbook de recuperação ajustado ao banco principal, com cópia separada dos objetos do Storage, conferência de WALG e migrations e rotina não destrutiva automatizada.
- Piloto interno determinístico com 120 colaboradores, jornadas críticas, exceções propositais, fechamento de ponto e folha, artefatos e relatório reconciliado de divergências.
- Fase 24 preparada com coortes, responsabilidades, calendário de dois ciclos paralelos, gates, evidências, SLAs e playbook de resposta a incidentes.

## Limitações conhecidas

- A persistência Supabase depende da configuração explícita das variáveis da aplicação e da seleção do adaptador persistente.
- O modo em memória continua reiniciando com a API por definição; o modo Supabase preserva o estado dos módulos migrados.
- Estados versionados por domínio ainda não oferecem projeções relacionais próprias para consultas analíticas SQL; elas serão adicionadas quando um caso de uso exigir.
- A quarentena e a análise antivírus dos arquivos permanecem como evolução futura; o modelo já prevê o estado `quarantined`.
- O preview do Lovable precisa ser verificado após cada publicação relevante.

## Próximo marco

Recrutar e formalizar os participantes da Fase 24; executar dois ciclos paralelos por cliente, comparar resultados, tratar divergências e obter aceite formal sem substituir a folha oficial.

## Regras de transição

1. Nenhuma tela acessará o Supabase diretamente.
2. Os adaptadores persistentes implementarão as interfaces de repository existentes.
3. Migrations e políticas de segurança serão revisadas antes da aplicação no projeto externo autorizado.
4. O modo local continuará sendo exercitado por testes e pelo preview.
5. Não será criado nem utilizado banco Supabase local com Docker; todo deploy de banco ocorrerá no projeto externo autorizado.
