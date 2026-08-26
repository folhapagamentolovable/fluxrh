# ADR 0003 — Documentos e aceites eletrônicos

## Decisão

Documentos são registros versionados com categoria, titular, origem, estado, conteúdo apresentado e trilha de auditoria. Modelos são versionados separadamente dos documentos gerados.

O aceite eletrônico interno registra:

- identidade declarada e autenticada no contexto da aplicação;
- versão exata do documento;
- data e hora;
- endereço IP;
- identificação do cliente;
- declaração aceita;
- hash SHA-256 do documento e das evidências essenciais.

## Limites

O aceite interno fornece evidências de autoria, integridade e manifestação de vontade, mas não se apresenta como assinatura digital ICP-Brasil. Empresas que exigirem certificado qualificado poderão manter o fluxo de impressão e upload da versão assinada.

## Persistência futura

O arquivo, comprovante e trilha serão persistidos de forma imutável. A substituição de arquivo gera nova versão; nunca altera silenciosamente uma versão já aceita.
