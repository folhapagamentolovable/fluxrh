# Estado atual

Atualizado em 26 de agosto de 2026.

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

## Limitações conhecidas

- Os módulos ainda não migrados continuam reiniciando ao recarregar o ambiente ou reiniciar a API.
- A persistência Supabase depende da aplicação das migrations e da configuração explícita do ambiente.
- A validação integrada das migrations será feita diretamente no projeto externo de desenvolvimento do Supabase, sem banco local ou Docker.
- Documentos, dependentes e linha do tempo do prontuário ainda retornam vazios no adaptador persistente.
- Algumas áreas do menu continuam como módulos planejados.
- O preview do Lovable precisa ser verificado após cada publicação relevante.

## Próximo marco

Revisar e aplicar as migrations no projeto externo de desenvolvimento do Supabase, validar o RLS nesse ambiente e depois persistir admissão, tarefas e transições do workflow.

## Regras de transição

1. Nenhuma tela acessará o Supabase diretamente.
2. Os adaptadores persistentes implementarão as interfaces de repository existentes.
3. Migrations e políticas de segurança serão revisadas antes da aplicação no projeto externo autorizado.
4. O modo local continuará sendo exercitado por testes e pelo preview.
5. Não será criado nem utilizado banco Supabase local com Docker; todo deploy de banco ocorrerá no projeto externo autorizado.
