# Correção: Desc. Ajuste dos Benefícios no Portal do Funcionário

## Problema Identificado
O "Desc. Ajuste dos Benefícios" estava sendo exibido como POSITIVO no holerite de benefícios do Portal do Funcionário, fazendo com que fosse SOMADO aos demais benefícios em vez de SUBTRAÍDO.

## Causa Raiz
O valor `desc_ajuste_beneficios` é salvo no banco como POSITIVO (ex: 1252.57), mas o código estava verificando apenas o sinal do valor (`evento.valor < 0`) para determinar se era um desconto, sem considerar a descrição do evento.

## Correções Aplicadas

### 1. Filtro de Eventos Excepcionais (linhas 62-80)
Adicionada verificação pela descrição normalizada para classificar corretamente o evento:

```typescript
const beneficiosEventos = (eventosExcepcionais || [])
  .filter(e => {
    if (e.tipo !== 'beneficio') return false;
    const descricaoNormalizada = normalizarDescricao(e.descricao);
    if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') return false;
    return e.valor > 0;
  })
  .reduce((sum, e) => sum + e.valor, 0);

const descontosEventos = (eventosExcepcionais || [])
  .filter(e => {
    if (e.tipo !== 'beneficio') return false;
    const descricaoNormalizada = normalizarDescricao(e.descricao);
    if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') return true;
    return e.valor < 0;
  })
  .reduce((sum, e) => sum + Math.abs(e.valor), 0);
```

### 2. Total de Descontos de Benefícios (linha ~110)
Adicionado o campo específico `desc_ajuste_beneficios`:

```typescript
const totalDescontosBeneficios = 
  (resultado.desconto_vt_faltas || 0) +
  (resultado.desconto_va_faltas || 0) +
  (resultado.desc_rondas_nao_realizadas_benef || 0) +
  (resultado.desc_ajuste_beneficios || 0) + // ⭐ ADICIONADO
  descontosEventos;
```

### 3. Renderização do Item (linhas 345-390)
- Adicionado o campo específico antes dos eventos excepcionais
- Corrigida a classificação do tipo (desconto vs benefício) pela descrição
- Adicionado filtro para evitar duplicação

```typescript
// Adicionar desc_ajuste_beneficios do campo específico
if (resultado.desc_ajuste_beneficios > 0) {
  eventosBeneficios.push({ 
    codigo: 'B002', 
    descricao: 'Desc. Ajuste dos Benefícios', 
    referencia: '',
    valor: resultado.desc_ajuste_beneficios, 
    tipo: 'desconto' 
  });
}

// Nos eventos excepcionais, verificar pela descrição
if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios' && resultado.desc_ajuste_beneficios > 0) {
  return; // Evitar duplicação
}

let tipoEvento = 'beneficio';
if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') {
  tipoEvento = 'desconto';
} else if (evento.valor < 0) {
  tipoEvento = 'desconto';
}
```

## Resultado

Agora o "Desc. Ajuste dos Benefícios" é:
- ✅ Exibido como DESCONTO (coluna de descontos)
- ✅ SUBTRAÍDO do total de benefícios
- ✅ Não duplicado (usa campo específico quando disponível)

## Arquivo Modificado
- `components/ReciboBeneficios.tsx`

## Data
2026-03-05

## Status
✅ CONCLUÍDO
