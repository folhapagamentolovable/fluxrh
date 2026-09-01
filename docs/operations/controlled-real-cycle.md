# Primeiro ciclo real controlado

O ciclo real é uma execução paralela e conferida. Prepará-lo ou aprová-lo **não** substitui folha, pagamento, obrigação legal ou sistema oficial.

## Sequência obrigatória

1. Confirmar termo, responsáveis, acessos mínimos, inventário de dados, backup e teste de rollback.
2. Criar o ciclo para uma competência, com escopo mínimo, revisor humano identificado e plano de rollback textual.
3. Anexar referências das entradas usadas; dados sensíveis permanecem no Storage privado, nunca no campo de referência.
4. O `super_admin` revisa o registro e aprova com justificativa explícita.
5. Executar somente as jornadas incluídas no escopo, mantendo o processo atual como fonte oficial.
6. Anexar comparativo, decisões, auditoria e evidência de rollback. Qualquer divergência crítica interrompe o ciclo.

## Barreiras implementadas

- Somente sessão autenticada com vínculo ativo `super_admin` e gate real habilitado prepara e aprova ciclos.
- Checklist incompleto é rejeitado pelo banco.
- Preparação, aprovação e inclusão de evidências geram `audit_events` append-only.
- Evidências aceitam hash SHA-256 para conferência de integridade.
- A API não oferece comando para executar ou fechar folha oficial a partir deste ciclo.

## Rollback

O plano deve identificar o checkpoint de backup, responsável, critério de acionamento e procedimento para restaurar os dados afetados. Em incidente crítico, suspenda as mutações, preserve os logs e siga `backup-restore-runbook.md`.
