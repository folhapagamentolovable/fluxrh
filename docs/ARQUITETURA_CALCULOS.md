# ARQUITETURA DE CÁLCULOS - FOLHA DE PAGAMENTO

## 🎯 OBJETIVO

Esta nova arquitetura foi criada para resolver o problema recorrente de **duplicação de valores** e **inconsistências** nos cálculos da folha de pagamento. 

### ❌ PROBLEMA ANTERIOR

- Funções de cálculo espalhadas em vários arquivos
- Lógica duplicada causando inconsistências
- Correções em um local quebravam outros
- Dificuldade para manter e debugar

### ✅ SOLUÇÃO ATUAL

- **Módulos isolados** para cada tipo de cálculo
- **Responsabilidade única** para cada módulo
- **Importação centralizada** evita duplicação
- **Fácil manutenção** e debugging

## 📁 ESTRUTURA DOS MÓDULOS

### `utils/processarEventosExcepcionais.ts`
**Responsabilidade**: Processamento e mapeamento de eventos excepcionais

**Funções principais**:
- `processarEventosExcepcionais(eventos)` - Mapeia eventos para campos específicos
- `aplicarEventosAoResultado(resultado, eventos)` - Aplica eventos ao resultado
- `processarEAplicarEventos(resultado, eventos)` - Função principal combinada

**Regra crítica**: Cada evento excepcional deve ser mapeado para seu campo específico no resultado.

### `utils/calculosProventos.ts`
**Responsabilidade**: Cálculo de proventos (salários e adicionais)

**Funções principais**:
- `calcularTotalProventos(resultado)` - Calcula total sem duplicação
- `listarProventosParaExibicao(resultado)` - Lista itens para interface

**Regra crítica**: Eventos excepcionais já estão processados nos campos específicos do resultado. **NÃO somar novamente**.

### `utils/calculosDescontos.ts`
**Responsabilidade**: Cálculo de descontos

**Funções principais**:
- `calcularTotalDescontos(resultado)` - Calcula total sem duplicação
- `listarDescontosParaExibicao(resultado)` - Lista itens para interface

**Regra crítica**: Inclui campos específicos como `desconto_adiantamento_salario` que vêm de eventos processados.

### `utils/calculosBeneficios.ts`
**Responsabilidade**: Cálculo de benefícios (VT, VA, Cesta Básica, etc.)

**Funções principais**:
- `calcularTotalBeneficios(resultado, parametros)` - Calcula total
- `listarBeneficiosParaExibicao(resultado, parametros)` - Lista itens

### `utils/calculosTotais.ts`
**Responsabilidade**: Orquestração de todos os cálculos

**Funções principais**:
- `calcularTodosTotais(resultado, parametros)` - Função principal
- `calcularTotaisComEventos(...)` - Wrapper para compatibilidade

## 🔄 FLUXO DE DADOS

```
1. Eventos Excepcionais (interface)
   ↓
2. Processamento (processarEventosExcepcionais.ts)
   ↓
3. Mapeamento para Campos Específicos (aplicarEventosAoResultado)
   ↓
4. Cálculo da Folha (calcularFolhaPagamento)
   ↓
5. Módulos de Cálculo (calculosProventos.ts, etc.)
   ↓
6. Totais Finais (interface)
```

## ⚠️ REGRAS CRÍTICAS

### 1. NÃO DUPLICAR EVENTOS
Eventos excepcionais são processados **UMA VEZ** durante o cálculo e salvos em campos específicos. Os módulos de cálculo usam **APENAS** esses campos.

### 2. NÃO MODIFICAR MÓDULOS SEM TESTES
Antes de alterar qualquer módulo, verifique:
- Todos os totais continuam corretos
- Não há duplicação de valores
- Interface exibe valores consistentes

### 3. USAR IMPORTAÇÕES
```typescript
// ✅ CORRETO
import { calcularTotaisComEventos } from '../utils/calculosTotais';

// ❌ ERRADO - não recriar funções
const calcularTotalProventos = (...) => { ... }
```

## 🧪 COMO TESTAR

### Teste Manual Rápido
1. Adicione um evento excepcional (ex: 13º Salário 1ª Parcela = R$ 500,00)
2. Verifique se aparece **UMA VEZ** na lista de proventos
3. Verifique se o total inclui os R$ 500,00 **UMA VEZ**
4. Some manualmente os valores da lista
5. Compare com o total exibido

### Valores de Referência (da imagem do problema)
- Salário: R$ 2.018,67
- Acúmulo de Função: R$ 403,73
- 13º Salário 1ª Parcela: R$ 252,25
- 13º Salário Vantagens 1ª Parcela: R$ 50,45
- 13º Salário 2ª Parcela: R$ 252,25
- 13º Salário Vantagens 2ª Parcela: R$ 50,45
- Serviços Externos (Folhas): R$ 850,00
- Serviços Externos (Rondas): R$ 200,00

**Total correto**: R$ 4.077,80 (não R$ 7.901,97)

## 🚨 AVISOS IMPORTANTES

### Para Desenvolvedores
- **NUNCA** modifique os módulos de cálculo sem entender completamente o fluxo
- **SEMPRE** teste com dados reais antes de fazer commit
- **DOCUMENTE** qualquer alteração neste arquivo

### Para IAs/Assistentes
- **NÃO** recrie funções de cálculo no arquivo principal
- **USE** sempre os módulos isolados via import
- **MANTENHA** a separação de responsabilidades
- **TESTE** qualquer alteração antes de sugerir

## 📝 HISTÓRICO DE MUDANÇAS

**2025-01-01**: Criação da arquitetura modular
- Separação dos cálculos em módulos isolados
- Correção da duplicação de eventos excepcionais
- **CORREÇÃO CRÍTICA**: Eventos excepcionais agora são salvos corretamente no banco
- Documentação da nova estrutura