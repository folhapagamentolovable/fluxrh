# Requirements Document

## Introduction

Implementação de uma nova coluna na tabela `regras_escalas` para definir explicitamente o estado inicial das escalas com alternância em 01/01/2025, eliminando a lógica "engessada" atual que causa erros na geração de escalas.

## Glossary

- **Sistema**: O sistema de gestão de escalas FluxPay
- **Regra_Escala**: Registro na tabela `regras_escalas` que define uma escala de trabalho
- **Estado_Inicial**: O status (trabalha/folga) que uma escala com alternância deve ter no primeiro dia do ano (01/01)
- **Interpretador_Escalas**: O módulo do sistema responsável por gerar as escalas mensais baseado nas regras
- **Alternância**: Padrão de trabalho que alterna entre trabalhar e folgar (ex: 12x36, sábados alternados)

## Requirements

### Requirement 1

**User Story:** Como administrador do sistema, eu quero definir explicitamente se uma escala com alternância inicia o ano trabalhando ou folgando, para que o interpretador de escalas gere corretamente todas as escalas subsequentes.

#### Acceptance Criteria

1. WHEN uma regra de escala com alternância é criada, THE Sistema SHALL permitir definir o estado inicial para 01/01
2. WHEN o estado inicial é definido como "trabalha", THE Sistema SHALL armazenar este valor na nova coluna
3. WHEN o estado inicial é definido como "folga", THE Sistema SHALL armazenar este valor na nova coluna
4. THE Sistema SHALL validar que apenas valores "trabalha" ou "folga" sejam aceitos
5. WHEN uma regra de escala sem alternância é criada, THE Sistema SHALL permitir que o campo seja nulo

### Requirement 2

**User Story:** Como desenvolvedor do interpretador de escalas, eu quero consultar diretamente na tabela o estado inicial de cada escala, para que eu possa calcular corretamente os padrões de alternância sem depender de lógica externa.

#### Acceptance Criteria

1. THE Sistema SHALL adicionar a coluna `estado_inicial_01_01` na tabela `regras_escalas`
2. THE Sistema SHALL definir o tipo da coluna como VARCHAR com valores permitidos: 'trabalha', 'folga', NULL
3. WHEN uma consulta é feita à tabela, THE Sistema SHALL retornar o valor do estado inicial junto com os outros campos
4. THE Sistema SHALL permitir filtrar escalas pelo estado inicial
5. THE Sistema SHALL manter compatibilidade com registros existentes (valor NULL para registros antigos)

### Requirement 3

**User Story:** Como usuário da interface de configuração de escalas, eu quero uma forma clara e intuitiva de definir se a escala inicia trabalhando ou folgando em 01/01, para que eu não precise decorar códigos T1/T2.

#### Acceptance Criteria

1. WHEN estou criando/editando uma escala com alternância, THE Sistema SHALL exibir um campo "Estado Inicial em 01/01/2025"
2. THE Sistema SHALL oferecer opções claras: "Trabalha" e "Folga"
3. WHEN seleciono "Trabalha", THE Sistema SHALL salvar "trabalha" na coluna `estado_inicial_01_01`
4. WHEN seleciono "Folga", THE Sistema SHALL salvar "folga" na coluna `estado_inicial_01_01`
5. WHEN a escala não tem alternância, THE Sistema SHALL ocultar ou desabilitar este campo

### Requirement 4

**User Story:** Como administrador, eu quero migrar as escalas existentes para o novo formato, para que todas as escalas tenham o estado inicial definido explicitamente.

#### Acceptance Criteria

1. THE Sistema SHALL fornecer um script de migração para converter códigos T1/T2 existentes
2. WHEN uma escala tem `tipo_alternancia` terminando em "T1", THE Sistema SHALL definir `estado_inicial_01_01` como "trabalha"
3. WHEN uma escala tem `tipo_alternancia` terminando em "T2", THE Sistema SHALL definir `estado_inicial_01_01` como "folga"
4. WHEN uma escala não tem alternância, THE Sistema SHALL manter `estado_inicial_01_01` como NULL
5. THE Sistema SHALL preservar todos os dados existentes durante a migração

### Requirement 5

**User Story:** Como desenvolvedor, eu quero que o interpretador de escalas use a nova coluna como fonte de verdade, para que os erros de geração de escalas sejam eliminados.

#### Acceptance Criteria

1. WHEN o interpretador processa uma escala com alternância, THE Sistema SHALL consultar `estado_inicial_01_01`
2. WHEN `estado_inicial_01_01` é "trabalha", THE Sistema SHALL iniciar o padrão de alternância com trabalho em 01/01
3. WHEN `estado_inicial_01_01` é "folga", THE Sistema SHALL iniciar o padrão de alternância com folga em 01/01
4. THE Sistema SHALL calcular todos os dias subsequentes baseado no estado inicial definido
5. THE Sistema SHALL ignorar a lógica antiga baseada em códigos T1/T2 quando a nova coluna estiver preenchida

### Requirement 6

**User Story:** Como usuário, eu quero visualizar claramente o estado inicial das escalas na listagem, para que eu possa verificar rapidamente se estão configuradas corretamente.

#### Acceptance Criteria

1. WHEN visualizo a lista de escalas, THE Sistema SHALL exibir o estado inicial de cada escala com alternância
2. THE Sistema SHALL usar ícones ou cores para diferenciar "Trabalha 01/01" de "Folga 01/01"
3. WHEN uma escala não tem alternância, THE Sistema SHALL exibir "N/A" ou ocultar a informação
4. THE Sistema SHALL permitir ordenar a lista pelo estado inicial
5. THE Sistema SHALL permitir filtrar escalas por estado inicial