# Registro de decisões do produto

Este arquivo mantém decisões de produto que precisam sobreviver às conversas. Decisões técnicas detalhadas ficam em `docs/architecture`.

| Data | Decisão | Motivo | Estado |
| --- | --- | --- | --- |
| 2026-08-26 | O nome oficial do produto é FluxRH. | Eliminar referências históricas a FluxPay2 e alinhar produto e repositório. | Vigente |
| 2026-08-26 | O repositório `folhapagamentolovable/fluxrh` é a fonte oficial. | Manter Lovable, GitHub e desenvolvimento sob a mesma linha de versão. | Vigente |
| 2026-08-26 | O preview usa uma camada de dados local. | Permitir demonstração funcional sem API ou banco disponíveis. | Vigente |
| 2026-08-26 | O banco será implementado somente após aprovação do modelo. | Evitar acoplamento prematuro e migrations descartáveis. | Vigente |
| 2026-08-26 | A primeira jornada persistente será organização até auditoria. | Validar tenancy, autorização, workflow e rastreabilidade de ponta a ponta. | Vigente |
