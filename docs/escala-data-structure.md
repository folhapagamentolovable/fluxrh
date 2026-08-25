# Estrutura de Dados da Escala

## Formato Esperado para `dias_trabalhados`

O campo `dias_trabalhados` na tabela `escala_mensal` deve conter um JSON com array de objetos representando cada dia do mês:

### Exemplo de Estrutura:

```json
[
  {
    "dia": 1,
    "status": "TRABALHO",
    "entrada": "08:00",
    "saida": "17:00",
    "inicio_refeicao": "12:00",
    "termino_refeicao": "13:00",
    "noturno": false,
    "observacao": null
  },
  {
    "dia": 2,
    "status": "FOLGA",
    "entrada": null,
    "saida": null,
    "inicio_refeicao": null,
    "termino_refeicao": null,
    "noturno": false,
    "observacao": "Folga semanal"
  },
  {
    "dia": 3,
    "status": "TRABALHO",
    "entrada": "20:00",
    "saida": "08:00",
    "inicio_refeicao": "00:00",
    "termino_refeicao": "01:00",
    "noturno": true,
    "observacao": "Turno noturno"
  },
  {
    "dia": 15,
    "status": "FERIADO",
    "entrada": null,
    "saida": null,
    "inicio_refeicao": null,
    "termino_refeicao": null,
    "noturno": false,
    "observacao": "Proclamação da República"
  }
]
```

### Campos Obrigatórios:

- **dia**: Número do dia do mês (1-31)
- **status**: Status do dia ("TRABALHO", "FOLGA", "FERIADO")

### Campos Opcionais:

- **entrada**: Horário de entrada (formato "HH:MM")
- **saida**: Horário de saída (formato "HH:MM")
- **inicio_refeicao**: Início do intervalo de refeição
- **termino_refeicao**: Fim do intervalo de refeição
- **noturno**: Boolean indicando se é turno noturno
- **observacao**: Observações específicas do dia

### Status Possíveis:

1. **TRABALHO**: Dia de trabalho normal
2. **FOLGA**: Dia de folga/descanso
3. **FERIADO**: Feriado nacional/municipal

### Exemplo de Inserção:

```sql
-- Exemplo para novembro/2025
INSERT INTO escala_mensal (
    funcionario_id, 
    mes, 
    ano, 
    escala_id, 
    dias_trabalhados,
    total_dias_trabalho,
    total_dias_folga,
    total_feriados
) VALUES (
    1, -- ID do funcionário
    11, -- Novembro
    2025,
    1, -- ID da escala
    '[
        {"dia": 1, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 2, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 3, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 15, "status": "FERIADO", "entrada": null, "saida": null, "noturno": false, "observacao": "Proclamação da República"}
    ]',
    20, -- Total de dias de trabalho
    9,  -- Total de dias de folga
    1   -- Total de feriados
);
```

### Validação no Frontend:

O componente PortalEscalas espera que cada objeto do array tenha pelo menos:
- `dia`: número
- `status`: string ("TRABALHO", "FOLGA", "FERIADO")

Campos opcionais são tratados com segurança usando optional chaining.