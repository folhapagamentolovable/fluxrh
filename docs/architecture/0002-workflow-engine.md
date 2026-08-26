# ADR 0002 — Motor de workflows e admissão

## Decisão

Workflows são definições versionadas compostas por etapas. Cada execução cria uma instância própria com estado, tarefas, prazo, histórico e contexto. A admissão é a primeira definição concreta do motor.

## Etapas da admissão v1

1. Admissão digital
2. Documentos
3. Validação
4. Contrato
5. Onboarding

## Regras

- Cada avanço conclui as tarefas abertas da etapa atual.
- Efeitos automáticos são aplicados antes da próxima etapa.
- O histórico registra ator, data, tipo e descrição.
- Tarefas distinguem execução automática, humana e aprovação.
- Uma definição iniciada mantém sua versão até a conclusão.
- O repository em memória será substituído pela persistência sem alterar a engine.
