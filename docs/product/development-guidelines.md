# Diretrizes permanentes de desenvolvimento

## Datas e competências

- Toda data apresentada ou digitada por uma pessoa usa `dd/mm/aaaa`.
- Campos de data aplicam máscara durante a digitação e rejeitam datas inexistentes, como `31/02/2026`.
- Data e hora são exibidas como `dd/mm/aaaa HH:mm`, no fuso aplicável à operação.
- Competências mensais são exibidas como `mm/aaaa`.
- Contratos internos, API e banco mantêm datas normalizadas em ISO 8601 (`aaaa-mm-dd` ou timestamp com fuso). O formato brasileiro pertence à camada de interface e nunca deve reduzir a integridade temporal da persistência.
- Novas telas devem reutilizar `BrazilianDateInput` e os formatadores de `apps/web/src/lib/date.ts`; não devem criar campos HTML `type="date"`, pois a apresentação varia conforme navegador e sistema operacional.

## Documentos pessoais e contato

- CPF, CNPJ e telefone devem ter máscara brasileira na entrada e exibição, validação antes do envio e persistência normalizada sem pontuação.
