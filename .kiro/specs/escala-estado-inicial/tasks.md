# Implementation Plan: Estado Inicial de Escalas

## Overview

Implementação de uma nova coluna na tabela `regras_escalas` para definir explicitamente o estado inicial das escalas com alternância, eliminando erros na geração de escalas causados pela lógica "engessada" atual.

## Tasks

- [x] 1. Criar migração do banco de dados
  - Adicionar coluna `estado_inicial_01_01` na tabela `regras_escalas`
  - Definir constraint para valores válidos ('trabalha', 'folga', NULL)
  - Migrar dados existentes baseado em códigos T1/T2
  - Adicionar comentário explicativo na coluna
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3_

- [ ]* 1.1 Escrever teste de propriedade para migração de dados
  - **Property 4: Migração consistente T1/T2**
  - **Property 5: Migração consistente T2**
  - **Validates: Requirements 4.2, 4.3**

- [x] 2. Atualizar tipos TypeScript
  - Modificar interface da tabela `regras_escalas` no arquivo types.ts
  - Adicionar tipo `EstadoInicial` para valores permitidos
  - Atualizar tipos Row, Insert e Update
  - _Requirements: 2.3_

- [ ]* 2.1 Escrever teste unitário para validação de tipos
  - Verificar que apenas valores válidos são aceitos
  - _Requirements: 1.4, 2.2_

- [x] 3. Checkpoint - Validar estrutura do banco
  - Executar migração em ambiente de desenvolvimento
  - Verificar que dados foram migrados corretamente
  - Confirmar que constraints funcionam

- [ ] 4. Atualizar interface de configuração de escalas
- [ ] 4.1 Modificar formulário de criação/edição
  - Adicionar campo "Estado Inicial em 01/01/2025"
  - Mostrar campo apenas para escalas com alternância
  - Implementar validação obrigatória para escalas com alternância
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.2 Escrever teste de propriedade para interface
  - **Property 2: Estado inicial obrigatório para alternância**
  - **Property 3: Estado inicial nulo para escalas fixas**
  - **Validates: Requirements 1.1, 1.5, 3.4, 3.5**

- [ ] 4.3 Atualizar listagem de escalas
  - Adicionar coluna "Estado Inicial 01/01" na tabela
  - Implementar visualização com ícones (verde/vermelho)
  - Adicionar ordenação por estado inicial
  - Implementar filtro por estado inicial
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 4.4 Escrever testes unitários para interface
  - Testar exibição/ocultação do campo baseado em tipo de alternância
  - Testar salvamento correto dos valores
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 5. Checkpoint - Validar interface
  - Testar criação de nova escala com estado inicial
  - Verificar que escalas existentes carregam corretamente
  - Confirmar que validações funcionam

- [x] 6. Atualizar interpretador de escalas
- [x] 6.1 Modificar lógica de conversão de regras
  - Atualizar `converterRegraVisualParaJSON.ts`
  - Usar `estado_inicial_01_01` como fonte de verdade
  - Manter fallback para lógica antiga (compatibilidade)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 6.2 Escrever teste de propriedade para interpretador
  - **Property 6: Interpretador usa nova coluna**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6.3 Atualizar outros módulos que usam escalas
  - Verificar `utils/carregarEscalaSalva.ts`
  - Atualizar consultas que buscam regras de escalas
  - Garantir que nova coluna seja incluída nas consultas
  - _Requirements: 2.3_

- [ ]* 6.4 Escrever testes de integração
  - Testar fluxo completo: criar escala → gerar escala mensal
  - Verificar que alternâncias são calculadas corretamente
  - _Requirements: 5.4, 5.5_

- [ ] 7. Implementar validações e tratamento de erros
- [ ] 7.1 Adicionar validações no backend
  - Validar valores permitidos antes de salvar
  - Verificar consistência entre tipo_alternancia e estado_inicial
  - Implementar mensagens de erro claras
  - _Requirements: 1.4, 2.2_

- [ ]* 7.2 Escrever teste de propriedade para validações
  - **Property 1: Estado inicial válido**
  - **Validates: Requirements 1.4, 2.2**

- [ ] 7.3 Implementar tratamento de compatibilidade
  - Fallback para lógica antiga quando estado_inicial é null
  - Logs de aviso para escalas sem estado inicial definido
  - _Requirements: 2.5, 5.5_

- [ ] 8. Checkpoint final - Testes completos
  - Executar todos os testes unitários e de propriedade
  - Testar migração em dados reais (cópia de produção)
  - Validar que não há regressões na geração de escalas
  - Confirmar que interface funciona corretamente

- [ ] 9. Documentação e limpeza
- [ ] 9.1 Atualizar documentação técnica
  - Documentar nova coluna e seu uso
  - Atualizar guias de configuração de escalas
  - Criar guia de migração para usuários

- [ ]* 9.2 Criar script de validação pós-deploy
  - Script para verificar integridade dos dados após deploy
  - Validar que todas as escalas com alternância têm estado inicial

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam correção universal
- Testes unitários validam exemplos específicos e casos extremos