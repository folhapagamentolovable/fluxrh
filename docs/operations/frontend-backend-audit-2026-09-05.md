# Auditoria frontend–backend — 5 de setembro de 2026

## Escopo

Varredura inicial das ações visíveis, destinos de navegação e payloads enviados pelos módulos React. O objetivo é impedir que controles aparentem funcionar enquanto enviam dados demonstrativos ou não possuem operação correspondente.

## Achados corrigidos neste incremento

| Módulo | Lacuna encontrada | Correção |
| --- | --- | --- |
| Jornada | Registro de ponto sempre enviava `Marina Souza` e `browser-demo-01` | O formulário passa a enviar colaborador, tipo e dispositivo visíveis, usando a estação retornada pela API |
| Ausências | Recebimento de atestado sempre enviava Beatriz e dados clínicos/arquivo fixos | Colaborador, datas, emissor, registro profissional e nome do arquivo passam a vir do formulário |
| Empresas | Botão “Mais ações” não possuía evento, menu, rota ou API | Controle removido até existir uma operação suportada |
| Dashboard | Data, competência e totais operacionais eram valores sintéticos fixos | Data e competência são correntes; métricas e textos usam o snapshot da API |
| Dashboard | “Analisar” forçava recarga integral pelo `window.location` | Navegação substituída por rota interna do React Router |
| Folha | Campo de decisão era visual; a API recebia sempre uma justificativa fixa | O texto digitado passa a compor o payload, com validação mínima e estado de envio |
| Férias, atestados, benefícios e portal | Aprovações e recusas não coletavam a decisão humana | Modal comum exige justificativa e envia o texto à operação auditável |
| Admissões | Nova admissão iniciava com organização, gestor e data demonstrativos | Estrutura organizacional e demais dados passam a ser selecionados ou digitados |
| Férias | Dias vendidos e antecipação do 13º não podiam ser informados | As duas opções estão disponíveis e cobertas por teste de payload |
| Atalhos operacionais | Ações da Visão Geral abriam apenas a raiz do módulo | Jornada, afastamentos e folha recebem links para a aba ou operação exata |
| Períodos e competências | Algumas telas ainda exibiam agosto/2026 ou datas de férias fixas | Rótulos derivam dos dados e entradas seguem o formato brasileiro |

Os payloads de ponto e atestado receberam testes automatizados para impedir a reintrodução das identidades fixas.

## Pendências priorizadas

1. ✅ Integrar o conteúdo binário selecionado no recebimento de atestado ao bucket privado, associando o ativo ao registro do atestado. O envio direto por URL assinada, a confirmação pela API e a exclusão compensatória foram implementados.
2. 🟡 Validar os fluxos corrigidos com sessão autenticada no ambiente publicado.
3. 🟡 Varredura de ações secundárias: justificativas de férias, atestados, benefícios e portal e atalhos diretos foram corrigidos; resta a edição completa do vínculo no prontuário.
4. ✅ Padronizar a competência exibida em jornada e cálculos no formato brasileiro e eliminar períodos fixos remanescentes.

## Critério de encerramento

O Marco 29 permanece em andamento até que todas as ações visíveis tenham destino funcional, payload derivado da interface, persistência/auditoria aplicável e evidência de validação autenticada no ambiente publicado.
