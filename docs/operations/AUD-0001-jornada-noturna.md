# AUD-0001 — auditoria da jornada noturna

Data da auditoria: 31/08/2026. Escopo: jornada T1 Noturno, hora noturna reduzida, adicional mínimo, intervalo e prorrogação. O cálculo mensal dependerá das marcações efetivamente aprovadas; esta memória reproduz uma jornada completa.

## Jornada e premissas

| Parâmetro | Valor |
|---|---:|
| Escala cadastrada | 12×36, das 18:00 às 06:00 |
| Intervalo não trabalhado | 22:00 às 23:00 |
| Trabalho efetivo por plantão | 11 horas-relógio |
| Período noturno urbano | 22:00 às 05:00 |
| Hora noturna | 52 minutos e 30 segundos |
| Adicional legal mínimo | 20% |
| Salário / divisor provisório | R$ 2.091,57 / 220 |
| Fuso considerado | America/Sao_Paulo |

O intervalo de uma hora atende ao mínimo geral para jornada superior a seis horas. A validade da escala 12×36 e eventual divisor mais favorável ainda exigem conferência do acordo escrito ou instrumento coletivo aplicável.

## Memória por plantão completo

O intervalo ocorre integralmente dentro da faixa noturna. Portanto, das sete horas-relógio entre 22h e 5h, seis são efetivamente trabalhadas:

| Parcela | Fórmula | Resultado |
|---|---|---:|
| Horas noturnas reduzidas | 360 min ÷ 52,5 min | 6,857143 h |
| Prorrogação após 5h | 05:00 às 06:00 | 1,000000 h |
| Horas alcançadas pelo adicional | reduzidas + prorrogação | 7,857143 h |
| Salário-hora provisório | R$ 2.091,57 ÷ 220 | R$ 9,507136 |
| Adicional mínimo por plantão | 7,857143 × R$ 9,507136 × 20% | R$ 14,94 |

Não foi projetado um total mensal porque o número de plantões deve vir do ponto fechado. DSR, reflexos e incidências serão tratados no próximo incremento. A regra coletiva pode elevar o percentual, mudar o divisor ou disciplinar de forma diferente a prorrogação e a hora reduzida.

## Divergências corrigidas

- A duração prevista de escalas que atravessavam a meia-noite era calculada como zero; agora a T1 resulta em 660 minutos líquidos.
- `nightMinutes` era sempre zero no espelho de ponto; agora deriva dos intervalos efetivamente marcados.
- O motor real enviava `nightHours: 0`; agora converte as marcações para hora de 52m30s, inclui a prorrogação após 5h e gera a rubrica automática `1201 — Adicional noturno`.
- As consultas da folha passaram a incluir um dia de margem em cada extremidade da competência para não cortar plantões noturnos na virada do mês.

## Fontes oficiais

- [CLT, arts. 59-A, 71 e 73](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm): escala 12×36, intervalo, faixa noturna, adicional e hora reduzida.
- [Súmula 60, II, do TST](https://www3.tst.jus.br/jurisprudencia/Sumulas_com_indice/Sumulas_Ind_51_100.html): incidência do adicional na prorrogação após o período noturno.
- [Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes): adicional urbano mínimo de 20% entre 22h e 5h.

Esta memória é técnica e auditável; não substitui validação jurídica, sindical ou contábil.
