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

A cláusula de abrangência exclui expressamente **Vigilância e Segurança Patrimonial**. O nome do cargo fictício é **Vigia**, mas o cadastro ainda não descreve com precisão suficiente as atividades efetivamente exercidas.

Consequências adotadas:

1. O instrumento foi importado e versionado, mas sua aplicação econômica ao AUD-0001 permanece bloqueada.
2. Um novo cálculo do registro `AUD-0001` gera a exceção crítica `CCT_APPLICABILITY_PENDING`.
3. A memória de cálculo registra a versão, o hash e os estados de aplicabilidade e automação.
4. O divisor 220 permanece como premissa confirmada pelo responsável e é compatível com a referência a 220 horas mensais do Termo Aditivo.
5. A autorização da escala 12×36 não aparece no Termo Aditivo enviado; sua comprovação documental depende da CCT principal ou de outro instrumento aplicável.

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
