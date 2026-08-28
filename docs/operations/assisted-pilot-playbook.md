# Playbook do piloto assistido

## Objetivo e limite operacional

Validar o FluxRH com clientes reais em operação paralela, preservando o processo atual como fonte oficial. Nenhum resultado do piloto substitui folha, ponto, obrigação legal ou pagamento oficial até a aprovação explícita da entrada gradual em produção.

## Coortes

1. Empresa pequena, com 20 a 80 colaboradores: adoção, cadastro, documentos, ponto e ausências.
2. Empresa com múltiplos postos, com 80 a 300 colaboradores: isolamento, escalas, aprovações e consolidação entre unidades.
3. Escritório de RH ou DP consultivo: regras, divergências, relatórios e rastreabilidade.

A seleção exige patrocinador, coordenador operacional, disponibilidade para dois ciclos paralelos e concordância com o tratamento mínimo de dados. Dados reais só entram após termo, matriz de acesso e inventário aprovados.

## Responsabilidades

| Papel | Responsabilidade |
|---|---|
| Patrocinador do cliente | Aprovar escopo, pessoas, calendário e aceite final |
| Coordenador de RH/DP | Preparar dados, executar jornadas e validar divergências |
| Product owner FluxRH | Priorizar decisões, mudanças e critérios de saída |
| Líder de suporte | Centralizar comunicação, triagem e acompanhamento |
| Líder de segurança | Autorizar acessos e coordenar privacidade e incidentes |

## Calendário de referência

| Semana | Atividade | Saída obrigatória |
|---|---|---|
| 0 | Termos, escopo, responsáveis e acessos | Go/no-go assinado |
| 1 | Importação controlada e conferência cadastral | Inventário e relatório de qualidade |
| 2–3 | Primeiro ciclo paralelo | Comparativo, divergências e decisões |
| 4 | Correções e reteste | Backlog atualizado e evidências |
| 5–6 | Segundo ciclo paralelo | Reconciliação e avaliação de estabilidade |
| 7 | Encerramento | Aceite formal ou plano corretivo |

## Execução dos ciclos

Cada ciclo cobre admissão, férias, atestados, exceções, desligamentos, fechamento de ponto, prévia da folha e geração de artefatos. Para cada jornada devem ser preservados entrada, resultado FluxRH, resultado oficial, diferença, causa, decisão, responsável e evidência.

Uma divergência crítica interrompe a jornada afetada e aciona o plano de incidentes. Divergências altas impedem o aceite do ciclo. Médias e baixas entram no backlog com decisão explícita.

## Suporte e incidentes

| Severidade | Exemplo | Resposta inicial | Regra |
|---|---|---:|---|
| Crítica | Exposição de dados, cálculo oficial afetado ou indisponibilidade total | 1 hora | Suspender fluxo afetado e acionar segurança |
| Alta | Jornada crítica bloqueada sem alternativa segura | 4 horas | Corrigir ou fornecer contingência antes do aceite |
| Média | Divergência com alternativa manual | 16 horas | Registrar decisão e prazo |
| Baixa | Usabilidade ou melhoria sem impacto operacional | 40 horas | Priorizar no backlog |

## Critérios de saída

- Dois ciclos paralelos concluídos por cliente.
- Nenhuma divergência crítica ou alta em aberto.
- Comparativos e decisões anexados.
- Aceite formal do patrocinador e do coordenador.
- Backlog de produção priorizado.
- Aprovação separada antes de qualquer ativação oficial.
