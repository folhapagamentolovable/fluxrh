# Relatório Detalhado como "Espelho" da Folha Calculada

## Objetivo
Transformar o Relatório Detalhado em um "espelho" da Folha Calculada, exibindo os dados salvos sem recalcular valores.

## Mudanças Implementadas

### 1. Funções Auxiliares Simplificadas
As funções `calcularSalarioBruto()`, `calcularTotalDescontos()` e `calcularBeneficios()` foram simplificadas para retornar diretamente os valores salvos na tabela `folha_calculada`:

```typescript
// ANTES: Recalculava somando todos os campos individuais
const calcularSalarioBruto = (f: any) => {
    let salarioBruto = (f.salario_base || 0) + (f.intrajornada_50 || 0) + ...
    // + eventos excepcionais
    return salarioBruto;
};

// DEPOIS: Retorna valor salvo
const calcularSalarioBruto = (f: any) => {
    return f.total_proventos || 0;
};
```

### 2. Campos Utilizados
O relatório agora usa diretamente os campos salvos:
- `total_proventos` - Total de proventos (salário bruto)
- `total_descontos` - Total de descontos
- `total_beneficios` - Total de benefícios
- `salario_liquido` - Salário líquido (proventos - descontos + benefícios)

### 3. Locais Atualizados

#### Exportação para Excel (linhas ~743-941)
- Linha "TOTAL A DEPOSITAR": Usa `f.salario_liquido`
- Linha "Salário Bruto": Usa `f.total_proventos`
- Linha "Total Descontos": Usa `f.total_descontos`
- Linha "Salário Líquido": Usa `(f.total_proventos - f.total_descontos)`
- Linha "Total Benefícios": Usa `f.total_beneficios`
- Linha "Salário Líquido + Benefícios": Usa `f.salario_liquido`

#### Relatório HTML para Impressão (linhas ~990-1850)
- Funções auxiliares simplificadas (linhas 990-998)
- Cálculo de totais.descontos.total_descontos (linha ~1216)
- Linha "TOTAL A DEPOSITAR" no HTML (linha ~1274)
- Linha "Total Descontos" no HTML (linha ~1768)
- Linha "Salário Líquido" no HTML (linha ~1778)
- Linha "Salário Líquido + Benefícios" no HTML (linha ~1842)

### 4. Benefícios da Mudança

1. **Consistência**: O relatório mostra exatamente os mesmos valores da Folha Calculada
2. **Performance**: Não há recálculos desnecessários
3. **Manutenibilidade**: Mudanças na lógica de cálculo só precisam ser feitas em um lugar
4. **Confiabilidade**: Elimina possibilidade de divergências entre cálculo e exibição

### 5. Observações Importantes

- Os campos individuais (salario_base, horas_extras_50, etc.) ainda são exibidos no relatório detalhado
- Os eventos excepcionais salvos no JSON `eventos_excepcionais` já estão incluídos nos totais salvos
- O campo `salario_liquido` salvo já inclui benefícios: `proventos - descontos + benefícios`
- Para "Salário Líquido" (sem benefícios), usa-se: `total_proventos - total_descontos`

## Arquivos Modificados
- `pages/Relatorios/Reports.tsx` - Simplificação das funções de cálculo e uso de valores salvos

## Data da Implementação
2026-03-05

## Status
✅ Concluído
