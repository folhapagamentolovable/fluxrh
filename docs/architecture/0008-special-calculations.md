# ADR 0008 — 13º salário e férias calculadas

Planejamento de férias e cálculo financeiro permanecem separados. O cálculo registra salário-base, médias, avos, dias, abono, tributos e cada rubrica que compõe o resultado.

Exceções impedem aprovação. A aprovação gera o recibo e agenda os eventos internos da folha. Cálculos permanecem versionáveis por competência e deverão se tornar imutáveis após o fechamento quando a persistência for implementada.
