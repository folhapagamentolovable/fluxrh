# Relatório final do piloto interno — competência 2026-08

Data de fechamento: 28 de agosto de 2026

Projeto Supabase: `akdmobvbombhqvvglayn`

Organização: Officecamp (`8428115c-2a43-46e8-abd1-9cfd81b48839`)

Cenário: `pilot_internal_2026_08`, versão 1

Execução: `167d90b5-d40d-4562-b148-a245cf82decf`

## Resultado executivo

A competência foi encerrada com estado `closed`, 120 colaboradores reconciliados e nenhuma divergência crítica ou alta do cenário em aberto. A função de execução foi chamada duas vezes e permaneceu uma única execução persistida, confirmando idempotência.

| Jornada | Resultado |
|---|---:|
| Admissões concluídas | 6 |
| Férias aprovadas | 8 |
| Atestados validados | 5 |
| Desligamentos concluídos | 3 |
| Exceções propositais detectadas | 12 |
| Exceções propositais resolvidas | 12 |
| Espelhos de ponto aprovados | 120 |
| Competências de ponto fechadas | 1 |
| Holerites gerados | 120 |
| Relatórios gerados | 3 |
| Pendências críticas ou altas do piloto | 0 |

## Reconciliação da folha

- Total bruto sintético: R$ 496.600,00.
- Total líquido sintético: R$ 387.348,00.
- Prévia aprovada e simulação oficial encerrada.
- Todos os 120 colaboradores possuem aprovação do espelho de ponto para agosto de 2026.

Os valores são exclusivamente sintéticos e destinam-se à validação interna do FluxRH. Eles não substituem processamento trabalhista oficial.

## Divergências e decisões

As 12 divergências foram introduzidas propositalmente para validar detecção, tratamento e auditoria. Duas receberam severidade alta e dez receberam severidade média. Todas foram conferidas contra a escala, tiveram o ajuste sintético aprovado e foram encerradas com justificativa e evento de auditoria.

Não restaram divergências críticas ou altas relacionadas ao cenário. A decisão registrada foi prosseguir para o planejamento da Fase 24 sem ativar folha oficial ou substituir processos reais.

## Evidências persistidas

- Registro único em `pilot_competence_runs` com resumo, totais, decisões e manifesto de artefatos.
- Seis workflows de admissão concluídos.
- Snapshots versionados de ausências, desligamentos e folha.
- Doze exceções de ponto resolvidas e auditadas.
- Fechamento relacional da competência de ponto.
- 120 documentos de holerite e três relatórios de fechamento no módulo documental.
- Evento `pilot.competence_closed` na auditoria.
