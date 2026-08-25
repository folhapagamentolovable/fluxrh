# Correção dos Eventos Excepcionais (Proventos)

## Problema Identificado
Os novos campos de eventos excepcionais (proventos de rescisão) estavam sendo:
- ✅ **Calculados** corretamente no `utils/calcularHoras.ts`
- ✅ **Mapeados** corretamente no salvamento (`handleSalvarIndividual` e `handleSalvarTodas`)
- ❌ **NÃO exibidos** na interface da folha calculada
- ❌ **NÃO incluídos** no cálculo dos totais da interface

## Campos Implementados
1. **13º Proporc. Rescisão** (`decimo_terceiro_proporcional_rescisao`)
2. **Férias Proporc. Rescisão** (`ferias_proporcionais_rescisao`)
3. **1/3 Férias Proporc. Rescisão** (`um_terco_ferias_proporcional_rescisao`)
4. **PLR Proporc. Rescisão** (`plr_proporcional_rescisao`)
5. **13º Proporc. Vantagens Rescisão** (`decimo_terceiro_vantagens_rescisao`)

## Correções Aplicadas

### 1. Interface - Exibição dos Campos ✅
**Arquivo**: `pages/CalculatedPayroll.tsx`
**Localização**: Seção "💰 Salários" da folha ativa

Adicionados os campos com:
- Exibição condicional (só aparece se valor > 0)
- Estilo visual diferenciado (fundo azul)
- Formatação monetária correta
- Labels descritivos

```tsx
{folhaAtiva.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao > 0 && (
    <li className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded border border-blue-300">
        <span className="text-xs font-semibold">13º Proporc. Rescisão</span>
        <span className="font-semibold">{formatarMoeda(folhaAtiva.dadosFolha.totais.total_decimo_terceiro_proporcional_rescisao)}</span>
    </li>
)}
```

### 2. Cálculo dos Totais ✅
**Arquivo**: `pages/CalculatedPayroll.tsx`
**Função**: `calcularTotaisComEventos`

Incluídos os eventos de rescisão no cálculo do `totalProventos`:

```tsx
const eventosRescisao = (folhaAtiva?.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao || 0) +
                       (folhaAtiva?.dadosFolha?.totais?.total_ferias_proporcionais_rescisao || 0) +
                       (folhaAtiva?.dadosFolha?.totais?.total_um_terco_ferias_proporcional_rescisao || 0) +
                       (folhaAtiva?.dadosFolha?.totais?.total_plr_proporcional_rescisao || 0) +
                       (folhaAtiva?.dadosFolha?.totais?.total_decimo_terceiro_vantagens_rescisao || 0);

let totalProventos = resultado.total_proventos + proventosAdicionais + eventosRescisao;
```

## Fluxo Completo Funcionando

### 1. Cálculo ✅
- Campos calculados em `utils/calcularHoras.ts`
- Totais somados na função `calcularTotaisMes`

### 2. Salvamento ✅
- Campos mapeados em `handleSalvarIndividual`
- Campos mapeados em `handleSalvarTodas`
- Dados salvos na tabela `folha_calculada`

### 3. Interface ✅
- Campos exibidos na seção "💰 Salários"
- Incluídos no cálculo dos totais
- Afetam o salário líquido final

### 4. Impressão ✅
- Campos incluídos nos relatórios (já funcionava)
- Dados disponíveis para holerites e recibos

## Como Testar

1. **Adicionar Evento Excepcional**:
   - Clique em "✏️ Editar"
   - Clique em "➕ Adicionar Provento"
   - Escolha uma das opções (1-5) para eventos de rescisão
   - Digite o valor

2. **Verificar Exibição**:
   - Campo aparece na seção "💰 Salários" com fundo azul
   - Valor é incluído no "Total Salários"
   - Afeta o salário líquido final

3. **Verificar Salvamento**:
   - Clique em "💾 Salvar"
   - Dados são salvos na tabela `folha_calculada`
   - Campos persistem após recarregar a página

## Status
✅ **CORRIGIDO** - Eventos excepcionais agora são exibidos na interface e incluídos nos totais