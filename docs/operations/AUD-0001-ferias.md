# AUD-0001 — auditoria de férias

Data da auditoria: 31/08/2026. Escopo: aquisição, concessão, remuneração e terço constitucional. Este registro usa a regra legal geral; incidências de INSS, IRRF e FGTS serão verificadas no incremento tributário, e regras mais favoráveis da CCT dependerão da identificação do sindicato, da base territorial e da vigência.

## Entradas preservadas

| Parâmetro | Valor |
|---|---:|
| Admissão / início aquisitivo | 01/01/2025 |
| Fim do período aquisitivo | 31/12/2025 |
| Limite concessivo | 31/12/2026 |
| Gozo | 01/09/2026 a 30/09/2026 |
| Retorno | 01/10/2026 |
| Dias gozados / vendidos | 30 / 0 |
| Salário mensal | R$ 2.091,57 |
| Média de variáveis incluída neste cálculo | R$ 0,00 |

## Resultado reproduzível

O período aquisitivo está completo e o gozo termina antes do limite concessivo. Não há indicação de faltas que reduzam os 30 dias; essa premissa será reavaliada quando as ocorrências do período aquisitivo forem auditadas.

| Parcela | Fórmula | Resultado |
|---|---|---:|
| Remuneração de férias | R$ 2.091,57 ÷ 30 × 30 | R$ 2.091,57 |
| Terço constitucional | R$ 2.091,57 ÷ 3 | R$ 697,19 |
| Total bruto de férias | remuneração + terço | R$ 2.788,76 |

O prazo legal calculado para pagamento é 30/08/2026, dois dias antes do início. Como a data cai em domingo, o procedimento operacional de crédito bancário deverá antecipar a disponibilização sem alterar a memória legal.

## Divergência encontrada e proteção implementada

O motor real de folha não consumia `vacationRequests`. Assim, a competência 09/2026 poderia conter salário mensal integral sem remuneração de férias e terço, permitindo omissão ou duplicidade. A folha agora cria uma exceção crítica `VACATION_<id>` sempre que houver férias aprovadas sobrepostas à competência sem `payrollEventStatus = processed`; o colaborador não pode ser aprovado nem a folha fechada enquanto o cálculo especial não for processado.

## Fontes legais oficiais

- [Constituição Federal, art. 7º, XVII](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm): adicional de pelo menos um terço.
- [CLT, arts. 129, 130, 134, 137, 142 e 145](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm): direito, duração, concessão, dobra fora do período, base remuneratória e prazo de pagamento.
- [Ministério do Trabalho e Emprego — perguntas frequentes](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/perguntas-frequentes): orientações oficiais sobre concessão e pagamento.

Esta memória é técnica e auditável; não substitui validação jurídica, sindical ou contábil do caso real.
