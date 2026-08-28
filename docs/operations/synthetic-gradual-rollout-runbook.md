# Runbook da entrada gradual sintética

## Escopo

Este runbook executa a Fase 25 apenas nas três organizações fictícias da Fase 24. Ele não libera operação comercial, folha oficial, pagamentos ou obrigações legais. O incremento chamado “folha oficial” é uma simulação isolada e permanece tecnicamente impedido de ativar operações reais.

## Sequência e gates

Cada incremento segue a ordem: cadastro e documentos; admissão; portal; ponto; férias e ausências; prévia da folha; simulação isolada da folha oficial; demais módulos.

Antes de avançar, o incremento precisa de:

- checkpoint de rollback identificável;
- responsável de monitoramento e plantão;
- backup e recuperação verificados;
- taxa de erro igual ou inferior a 1%;
- nenhum alerta crítico ou alto;
- aprovação sintética explícita registrada.

## Rollback

Um incremento é suspenso se houver exposição de dados, quebra de isolamento, divergência crítica, falha de recuperação ou taxa de erro acima do limite. O rollback restaura o último checkpoint, invalida a aprovação do passo e preserva logs e evidências. Nenhum rollback apaga auditoria.

## Monitoramento

Cada passo registra adoção, taxa de erro, latência, alertas críticos/altos e tempo operacional. O responsável de plantão é “FluxRH Synthetic Operations”; incidentes seguem o playbook do piloto assistido.

## Saída

A Fase 25 sintética termina após 24 passos concluídos — oito por organização — com todos os controles verdes. A passagem para a Fase 26 ainda exige decisão humana separada e não é concedida por esta simulação.
