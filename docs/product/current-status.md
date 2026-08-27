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

## Limitações conhecidas

- Os módulos ainda não migrados continuam reiniciando ao recarregar o ambiente ou reiniciar a API.
- A persistência Supabase depende da configuração explícita das variáveis da aplicação e da seleção do adaptador persistente.
- Módulos das fases 2 e 3 que ainda usam memória reiniciam junto com a API; isso é trabalho futuro planejado, não pendência da Fase 1.
- O preview do Lovable precisa ser verificado após cada publicação relevante.

## Próximo marco

Persistir Jornada e Ponto, incluindo escalas, marcações, apuração, banco de horas e exceções, reutilizando tenancy, eventos e auditoria já consolidados.

## Regras de transição

1. Nenhuma tela acessará o Supabase diretamente.
2. Os adaptadores persistentes implementarão as interfaces de repository existentes.
3. Migrations e políticas de segurança serão revisadas antes da aplicação no projeto externo autorizado.
4. O modo local continuará sendo exercitado por testes e pelo preview.
5. Não será criado nem utilizado banco Supabase local com Docker; todo deploy de banco ocorrerá no projeto externo autorizado.
