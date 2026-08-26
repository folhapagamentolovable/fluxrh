# ADR 0004 — Jornada, escalas e ponto

## Decisão

A jornada é dividida em três fatos independentes:

1. escala planejada;
2. marcações brutas e imutáveis;
3. resultado da apuração.

Correções não substituem silenciosamente uma marcação original. Elas acrescentam uma decisão auditada ao processo de apuração.

## QR Code

Cada estação possui token rotativo, identificação e local. A marcação registra colaborador, momento, dispositivo, origem e estação. Geolocalização é evidência opcional, não requisito universal.

## Apuração

O motor calcula minutos trabalhados, jornada prevista, saldo, horas extras de 50% e 100% e prepara campos para adicional noturno. Exceções são abertas quando a sequência ou o resultado exige decisão humana.

## Integração futura

Somente resultados aprovados no fechamento serão consumidos pela folha. Marcações brutas permanecerão preservadas para auditoria.
