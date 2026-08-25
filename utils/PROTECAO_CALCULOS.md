# 🛡️ PROTEÇÃO DOS MÓDULOS DE CÁLCULO

## ⚠️ ATENÇÃO - LEIA ANTES DE MODIFICAR

Os arquivos nesta pasta contêm **lógica crítica** de cálculo da folha de pagamento. Modificações incorretas podem causar:

- ❌ Duplicação de valores
- ❌ Inconsistências nos totais
- ❌ Problemas nos relatórios
- ❌ Erros nos holerites

## 🚫 ARQUIVOS PROTEGIDOS

### `processarEventosExcepcionais.ts`
**NÃO MODIFICAR** sem entender completamente o mapeamento de eventos para campos específicos.

### `calculosProventos.ts`
**NÃO MODIFICAR** sem entender completamente o fluxo de eventos excepcionais.

### `calculosDescontos.ts`
**NÃO MODIFICAR** sem verificar o campo `desconto_adiantamento_salario`.

### `calculosBeneficios.ts`
**NÃO MODIFICAR** sem testar VT/VA por folgas trabalhadas.

### `calculosTotais.ts`
**NÃO MODIFICAR** sem testar todos os containers da interface.

## ✅ ANTES DE MODIFICAR

1. **Leia** a documentação em `docs/ARQUITETURA_CALCULOS.md`
2. **Execute** o teste em `tests/teste-calculos-modular.js`
3. **Verifique** se o total é R$ 4.077,80 (não R$ 7.901,97)
4. **Teste** na interface com dados reais
5. **Documente** suas alterações

## 🧪 COMANDO DE TESTE

```bash
node tests/teste-calculos-modular.js
```

**Resultado esperado**: ✅ TESTE PASSOU!

## 📞 EM CASO DE DÚVIDAS

Se você não tem certeza sobre uma modificação:

1. **NÃO MODIFIQUE** os arquivos
2. **DOCUMENTE** o problema encontrado
3. **CONSULTE** a documentação existente
4. **TESTE** em ambiente isolado primeiro

## 🚨 PARA IAs/ASSISTENTES

- **NUNCA** recrie funções de cálculo no arquivo principal
- **SEMPRE** use os módulos via import
- **TESTE** qualquer sugestão antes de implementar
- **MANTENHA** a separação de responsabilidades

---

**Criado em**: 2025-01-01  
**Motivo**: Resolver problema recorrente de duplicação de valores  
**Status**: ATIVO - NÃO REMOVER