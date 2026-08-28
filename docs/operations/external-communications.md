# Comunicações externas desta versão

O FluxRH integra somente e-mail via Resend e assinatura eletrônica via OpenSign. Banco, pagamentos, contabilidade, governo, SMS e WhatsApp ficam fora do escopo e não devem ser apresentados como disponíveis.

## Render

Configure `RESEND_API_KEY`, `RESEND_FROM`, `OPENSIGN_API_URL` e `OPENSIGN_API_TOKEN` como variáveis secretas. Nunca use variáveis `VITE_*` para essas credenciais.

O endpoint `GET /api/v1/integrations/status` informa apenas se cada integração está configurada. E-mails são enviados por `POST /api/v1/integrations/email/send`; pedidos OpenSign usam `POST /api/v1/integrations/signatures`. As mutações permanecem atrás do gate operacional `super_admin`.

Antes da homologação, verifique o domínio remetente no Resend e configure o webhook de entrega. No OpenSign, gere `x-api-token`, configure o webhook HTTPS e faça os primeiros testes exclusivamente com documentos fictícios.
