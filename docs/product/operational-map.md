# Mapa operacional

## Atores

- Colaborador
- Líder ou supervisor
- RH
- Departamento Pessoal
- Financeiro
- Diretoria
- Cliente
- Operação FluxPay
- FluxRH e FluxRH AI

## Ciclo de vida do colaborador

1. Planejamento da força de trabalho
2. Recrutamento e pré-admissão
3. Admissão
4. Onboarding
5. Trabalho e jornada
6. Remuneração e benefícios
7. Desenvolvimento e movimentações
8. Férias e afastamentos
9. Desligamento e rescisão
10. Pós-desligamento

Documentos, comunicação, compliance, automação, inteligência e auditoria atravessam todas as etapas.

## Domínios do produto

| Domínio | Responsabilidade |
| --- | --- |
| Organizações | Empresas, estabelecimentos, departamentos e centros de custo |
| Pessoas | Prontuário, vínculo, dependentes, histórico e autoatendimento |
| Admissões | Solicitação, documentos, validação, contrato e onboarding |
| Workflows | Definições versionadas, instâncias, tarefas, decisões e prazos |
| Exceções | Priorização, recomendação, responsável, resolução e SLA |
| Documentos | Solicitação, validação, aceite, validade e evidências |
| Jornada | Escalas, marcações, apuração, banco de horas e exceções |
| Ausências | Férias, faltas, atestados e afastamentos |
| Benefícios | Elegibilidade, adesão, movimentações e eventos financeiros |
| Folha | Eventos, cálculos, pré-fechamento, aprovação e fechamento |
| Comunicação | Notificações orientadas a eventos e solicitações universais |
| Auditoria | Registro imutável de ações humanas e automáticas |

## Primeira jornada persistente

`Organização → Empresa → Colaborador → Admissão → Workflow → Exceção → Auditoria`

Essa jornada será a prova da arquitetura de persistência. Os módulos seguintes reutilizarão o mesmo contexto organizacional, autorização, eventos e trilha de auditoria.
