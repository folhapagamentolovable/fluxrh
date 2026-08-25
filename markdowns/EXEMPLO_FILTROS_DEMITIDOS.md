# 🔧 Exemplos de Filtros para Funcionários Demitidos

## 📋 Após aplicar a migração, adicione estes filtros:

### 1. Hook para Funcionários Ativos (não demitidos)

```typescript
// Em hooks/useSupabase.ts - Adicionar novo hook
export function useFuncionariosAtivos() {
  const [data, setData] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: funcData, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .eq('demitido', false) // 🎯 FILTRO PRINCIPAL
        .order('created_at', { ascending: false });

      if (funcError) throw funcError;
      setData(funcData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  // ... resto do hook
}
```

### 2. Filtros em Relatórios

```typescript
// Em pages/Reports.tsx - Modificar consultas
const { data, error } = await supabase
  .from('folhas_ponto')
  .select(`
    *,
    funcionario:funcionarios!inner(nome_completo, cpf, demitido),
    empresa:empresas(nome_empresa),
    posto_trabalho:postos_trabalho(nome_posto),
    cargo:cargos(nome_cargo)
  `)
  .eq('funcionario.demitido', false) // 🎯 FILTRO
  .eq('mes', mes)
  .eq('ano', ano);
```

### 3. Filtros em Escalas

```typescript
// Em páginas de escalas - Filtrar funcionários
const funcionariosAtivos = funcionarios.filter(f => !f.demitido);
```

### 4. Filtros em Cálculos de Folha

```typescript
// Em pages/CalculatedPayroll.tsx - Modificar consultas
const { data: folhas, error } = await supabase
  .from('folhas_ponto')
  .select(`
    *,
    funcionario:funcionarios!inner(*, cargo:cargos(*))
  `)
  .eq('funcionario.demitido', false) // 🎯 FILTRO
  .eq('mes', mes)
  .eq('ano', ano);
```

### 5. Filtros em Holerites/Recibos

```typescript
// Filtrar antes de gerar holerites
const funcionariosAtivos = folhasCalculadas.filter(f => 
  !f.funcionario?.demitido
);
```

## 🎯 Locais que Precisam de Filtros

### ✅ Implementar filtros em:

1. **`pages/Schedules.tsx`** - Escalas
2. **`pages/Timesheets.tsx`** - Folhas de ponto
3. **`pages/CalculatedPayroll.tsx`** - Cálculos
4. **`pages/Reports.tsx`** - Relatórios
5. **`components/Holerite.tsx`** - Holerites
6. **`components/ReciboPagamento.tsx`** - Recibos
7. **Todos os hooks que buscam funcionários**

### 🔍 Padrão de Filtro

```sql
-- Em consultas SQL
WHERE funcionarios.demitido = false

-- Em JavaScript/TypeScript
.filter(f => !f.demitido)
.eq('demitido', false)
.eq('funcionario.demitido', false) -- Para JOINs
```

## 📝 Observações Importantes

- **Manter funcionários demitidos** no banco para histórico
- **Filtrar em TODAS** as consultas de processamento ativo
- **NÃO filtrar** em consultas de histórico/auditoria
- **Testar** cada funcionalidade após implementar filtros

---

**🚀 Próximo Passo:** Aplicar a migração e depois implementar os filtros gradualmente!