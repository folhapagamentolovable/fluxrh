# AUD-0001 — parâmetros legais versionados

Data da validação: 01/09/2026  
Organização: Officecamp (`8428115c-2a43-46e8-abd1-9cfd81b48839`)  
Migração: `20260901013620_version_legal_parameter_sets.sql`

## Resultado

Os parâmetros legais deixaram de ser apenas constantes do motor. Cada competência resolve no Supabase a versão vigente por organização e registra no snapshot do cálculo o ID, código, versão, período de vigência e hash SHA-256 da fonte e dos parâmetros.

O processamento é interrompido com `payroll_legal_parameters_missing` se INSS, IRRF, FGTS ou DSR não possuírem versão vigente. Assim, o sistema não calcula silenciosamente com uma tabela desconhecida.

## Versões cadastradas

| Tipo | Versão | Vigência | Comparação principal |
|---|---:|---|---|
| INSS empregado | 1 | 01/01/2025–31/12/2025 | Base histórica para comparação |
| INSS empregado | 2 | desde 01/01/2026 | Primeira faixa até R$ 1.621,00; teto de contribuição R$ 988,09 |
| IRRF mensal | 1 | 01/05/2025–31/12/2025 | Base histórica para comparação |
| IRRF mensal | 2 | desde 01/01/2026 | Redução mensal: zeramento até R$ 5.000,00 e redução linear até R$ 7.350,00 |
| FGTS mensal | 1 | desde 01/01/2026 | Alíquota de 8% |
| DSR sobre variáveis | 1 | desde 01/01/2026 | Variáveis ÷ dias úteis × repousos; calendário de feriados obrigatório |
| SINDEEPRES — AUD-0001 | 1 | desde 01/01/2026 | Divisor 220 e escala 12×36 confirmados pelo responsável |

## Rastreabilidade e segurança

- A tabela `legal_parameter_sets` possui RLS e isolamento por organização.
- Perfis autenticados autorizados têm somente leitura; versões históricas não podem ser alteradas pela aplicação.
- Novas regras devem ser incluídas como nova versão e nova vigência.
- O hash do snapshot da folha incorpora os identificadores das versões legais; uma mudança de versão produz outra entrada de cálculo.
- Eventos de INSS, IRRF, FGTS e DSR guardam o ID e o hash da versão efetivamente usada.
- A tela **Folha > Parâmetros** apresenta versões ativas e expiradas, fonte, hash e mudanças em relação à versão anterior.

## Limite conhecido

A confirmação da autorização da escala 12×36 e do divisor 220 foi registrada como premissa formal do caso. O número do instrumento coletivo, a base territorial e a vigência documental ainda precisam ser identificados antes da importação integral da CCT.

## Evidências de validação

- 110 testes da API aprovados.
- 52 testes do frontend aprovados.
- Typecheck integral aprovado.
- Build de produção aprovado.
- `supabase db lint --linked --level warning`: nenhum erro de schema.
- Migração local e remota alinhada no projeto principal.
