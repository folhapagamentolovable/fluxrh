# Correção Definitiva - Eventos de Rescisão

## Problema Identificado ✅
Você identificou corretamente! Os eventos de rescisão estavam sendo salvos como **eventos excepcionais normais** (JSON) mas **não mapeados** para os campos específicos da tabela.

**Exemplo do problema:**
```json
{
  "tipo": "provento",
  "valor": 55.15,
  "descricao": "PLR Proporc. Rescisão",
  "isAvariaUtilitario": false,
  "isRondasNaoRealizadas": false,
  "isRondasNaoRealizadasBenef": false
}
```

## Solução Implementada ✅

### 1. Detecção e Mapeamento Automático
O sistema agora **detecta** eventos de rescisão pela descrição e **mapeia** automaticamente para os campos específicos:

```tsx
// Filtrar eventos de rescisão e mapear para campos específicos
const eventosNormais = eventos.filter(evento => {
    if (evento.tipo === 'provento') {
        if (evento.descricao === '13º Proporc. Rescisão') {
            eventoRescisao13 += evento.valor;
            return false; // Remove dos eventos normais
        } else if (evento.descricao === 'Férias Proporc. Rescisão') {
            eventoRescisaoFerias += evento.valor;
            return false;
        }
        // ... outros campos
    }
    return true; // Manter outros eventos
});
```

### 2. Salvamento nos Campos Específicos
```tsx
// === EVENTOS EXCEPCIONAIS (PROVENTOS) ===
decimo_terceiro_proporcional_rescisao: eventoRescisao13 + (folha.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao || 0),
ferias_proporcionais_rescisao: eventoRescisaoFerias + (folha.dadosFolha?.totais?.total_ferias_proporcionais_rescisao || 0),
// ... outros campos
```

### 3. Evitar Duplicação
Os eventos de rescisão são **removidos** dos eventos normais para evitar duplicação:
```tsx
eventos_excepcionais: eventosNormais, // Salvar apenas eventos normais (sem rescisão)
```

### 4. Interface Atualizada
A interface agora mostra o valor **total** (eventos + folha de ponto):
```tsx
{(() => {
    const eventos = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
    const eventoValor = eventos.filter(e => e.tipo === 'provento' && e.descricao === 'PLR Proporc. Rescisão').reduce((sum, e) => sum + e.valor, 0);
    const totalValor = eventoValor + (folhaAtiva.dadosFolha?.total_plr_proporcional_rescisao || 0);
    return totalValor > 0 && (
        <li className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded border border-blue-300">
            <span className="text-xs font-semibold">PLR Proporc. Rescisão</span>
            <span className="font-semibold">{formatarMoeda(totalValor)}</span>
        </li>
    );
})()}
```

## Fluxo Completo Agora ✅

### 1. Usuário Adiciona Evento
- Clica "➕ Adicionar Provento"
- Escolhe "5 - PLR Proporc. Rescisão"
- Digite valor: R$ 55,15

### 2. Sistema Processa
- Evento fica temporariamente em `eventosExcepcionais`
- Interface mostra o valor na seção "💰 Salários"
- Valor é incluído nos totais

### 3. Salvamento
- Sistema **detecta** que é evento de rescisão
- **Mapeia** para campo `plr_proporcional_rescisao = 55.15`
- **Remove** dos eventos normais
- **Salva** na tabela `folha_calculada`

### 4. Resultado Final
```sql
-- Na tabela folha_calculada
plr_proporcional_rescisao = 55.15
eventos_excepcionais = [] -- Vazio ou só com outros eventos
```

## Campos Mapeados ✅
1. **"13º Proporc. Rescisão"** → `decimo_terceiro_proporcional_rescisao`
2. **"Férias Proporc. Rescisão"** → `ferias_proporcionais_rescisao`
3. **"1/3 Férias proporc. Rescisão"** → `um_terco_ferias_proporcional_rescisao`
4. **"PLR Proporc. Rescisão"** → `plr_proporcional_rescisao`
5. **"13º Proporc. Vantagens Rescisão"** → `decimo_terceiro_vantagens_rescisao`

## Como Testar ✅

1. **Adicione um evento de rescisão**
2. **Observe na interface** (deve aparecer com fundo azul)
3. **Clique "💾 Salvar"**
4. **Verifique no banco**:
   ```sql
   SELECT 
       nome_funcionario,
       plr_proporcional_rescisao,
       eventos_excepcionais
   FROM folha_calculada 
   WHERE mes = [MES] AND ano = [ANO]
   AND plr_proporcional_rescisao > 0;
   ```

## Status
✅ **PROBLEMA RESOLVIDO** - Eventos de rescisão agora são mapeados automaticamente para os campos específicos da tabela!