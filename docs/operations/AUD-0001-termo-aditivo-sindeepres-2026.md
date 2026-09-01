# AUD-0001 — Termo Aditivo SINDEEPRES 2026/2026

Data da análise: 01/09/2026  
Documento analisado: `geralsp2026.pdf`  
SHA-256: `bfd4cfd54e8661d72ae286a21894653fe0d49019953cd46477c4e554fa35a1ac`

## Identificação do instrumento

- Registro no MTE: `SP002405/2026`, em 05/03/2026.
- Solicitação: `MR005910/2026`.
- Processo: `10260.202977/2026-08`.
- Convenção principal: processo `10260.202420/2025-88`, registrada em 14/03/2025.
- Vigência: 01/01/2026 a 31/12/2026.
- Data-base: 1º de janeiro.
- Partes: SINDEEPRES (`96.287.487/0001-04`) e SINDEPRESTEM (`66.662.974/0001-49`).
- Território: Estado de São Paulo, observadas as categorias e exclusões do instrumento.

## Divergência de aplicabilidade do AUD-0001

A cláusula de abrangência exclui expressamente **Vigilância e Segurança Patrimonial**. A organização confirmou que, neste contexto empresarial, o cargo **Vigia** corresponde às atividades de **Fiscal de Piso / Fiscal de Loja**, não às atividades excluídas de vigilância patrimonial.

Consequências adotadas:

1. O instrumento foi importado e versionado com o enquadramento empresarial confirmado.
2. A exceção `CCT_APPLICABILITY_PENDING` deixa de ser gerada para o AUD-0001 a partir da versão 3.
3. A memória de cálculo registra a versão, o hash, o enquadramento ocupacional e os estados de aplicabilidade e automação.
4. O divisor 220 permanece como premissa confirmada pelo responsável e é compatível com a referência a 220 horas mensais do Termo Aditivo.
5. A autorização da escala 12×36 não aparece no Termo Aditivo, mas foi localizada na cláusula 52 da CCT principal `SP003052/2025`; a escala 5×2 consta da cláusula 53.

## CCT principal e jornadas confirmadas

A CCT principal foi identificada pelo registro MTE `SP003052/2025`, solicitação `MR002706/2025` e processo `10260.202420/2025-88`, com vigência de 01/01/2025 a 31/12/2026.

- **12×36 — cláusula 52:** autorizada, com 12 horas de trabalho por 36 de descanso, divisor 220, intervalo mínimo de 30 minutos e regras específicas para labor em folgas e permanência até a substituição.
- **5×2 — cláusula 53:** autorizada entre as escalas especiais, com referência de 192 horas mensais, descanso semanal mínimo de 24 horas, intervalo mínimo de 30 minutos e divisor 220.
- A decisão do responsável pela organização de considerar ambas as escalas autorizadas foi registrada na versão 4 dos parâmetros coletivos.
- O snapshot da folha passa a guardar a regra coletiva da escala efetivamente associada; intervalos inferiores ao mínimo geram `CCT_BREAK_BELOW_MINIMUM`.

## Enquadramentos empresariais confirmados

| Função da empresa | Função equivalente na CCT | Referência |
|---|---|---:|
| Vigia | Fiscal de Piso / Fiscal de Loja | R$ 2.091,57, correspondente a R$ 60,00 acima do piso de R$ 2.031,57 |
| Auxiliar de Limpeza | Auxiliar de Serviços Gerais / Operações | Piso mínimo de R$ 1.805,43 |
| Zelador | Zelador | Piso de R$ 2.144,33, preservada a regra de acúmulo de função de 20% |

O valor de R$ 2.091,57 foi confirmado como salário autoritativo do Vigia. Embora tenha sido inicialmente mencionado um diferencial de R$ 50,00, a diferença aritmética em relação ao piso de R$ 2.031,57 é R$ 60,00; a versão parametrizada registra os valores reconciliados.

## Parâmetros econômicos extraídos

| Tema | Parâmetro 2026 |
|---|---|
| Piso geral | R$ 1.805,43 |
| Jornada de referência dos salários profissionais | 220 horas mensais |
| Reajuste até R$ 7.380,07 | 6,25% |
| Reajuste de R$ 7.380,08 a R$ 16.951,09 | 5,50% |
| PLR anual | R$ 351,60, em duas parcelas de R$ 175,80 |
| Auxílio-refeição | R$ 24,80 líquidos por dia efetivamente trabalhado, para jornada diária superior a 6h |
| Cesta/cartão alimentação | R$ 174,10 mensais, para salário até R$ 7.380,07 |
| Prêmio de boa permanência | R$ 110,00 mensais, sujeito à elegibilidade e assiduidade |
| Seguro — morte natural | R$ 13.444,01 |
| Seguro — morte acidental/invalidez | R$ 20.166,02 |
| Assistência odontológica — empresa | R$ 28,31 mensais por trabalhador |
| Desconto odontológico facultativo | R$ 11,60, com autorização prévia e escrita |
| Contribuição mensal | 1% do salário nominal, limitada a R$ 180,54, respeitado o direito de oposição |
| Contribuição negocial/assistencial | 2%, limitada a R$ 107,30, prevista para outubro/2026, respeitado o direito de oposição |

## Regras que exigem implementação posterior

- Classificação ocupacional e confirmação de enquadramento sindical por atividade real.
- Reajuste proporcional de admitidos após a data-base.
- PLR proporcional, redutores por faltas/medidas disciplinares e datas de pagamento.
- Benefícios por dia trabalhado, jornada, faltas, afastamentos e férias.
- Prêmio de boa permanência sem incidências remuneratórias.
- Consentimento/oposição e trilha de prova para descontos sindicais.
- Validação das cláusulas não econômicas mantidas pela CCT principal, que não estão reproduzidas no aditivo.

## Proposta de melhoria

Adicionar ao vínculo um cadastro explícito de `categoria sindical`, `CNAE/atividade preponderante`, `função real`, `território`, `instrumento aplicável` e `decisão de enquadramento`, com vigência e evidência documental. O motor somente deve ativar uma CCT quando todos esses critérios forem compatíveis.
