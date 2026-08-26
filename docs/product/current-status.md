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

## Limitações conhecidas

- Dados reiniciam ao recarregar o ambiente ou reiniciar a API.
- Não existe autenticação real nem autorização por papel.
- Não existe isolamento persistente entre organizações.
- O Supabase ainda não é fonte de dados da aplicação.
- Algumas áreas do menu continuam como módulos planejados.
- O preview do Lovable precisa ser verificado após cada publicação relevante.

## Próximo marco

Implementar a fundação persistente e a primeira jornada vertical sem quebrar o modo local de demonstração.

## Regras de transição

1. Nenhuma tela acessará o Supabase diretamente.
2. Os adaptadores persistentes implementarão as interfaces de repository existentes.
3. Migrations e políticas de segurança serão revisadas antes de aplicação remota.
4. O modo local continuará sendo exercitado por testes e pelo preview.
5. Nenhuma alteração de banco será executada durante a etapa de desenho.
