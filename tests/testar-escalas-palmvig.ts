// Teste das escalas PALMVIGDIURNOT1 e PALMVIGDIURNOT2 para Dezembro/2025
// Este arquivo pode ser executado para verificar a alternância de dias

import { converterRegraVisualParaJSON } from '../utils/converterRegraVisualParaJSON';
import { interpretarRegraEscala } from '../utils/interpretadorRegrasEscala';

// Dados das escalas conforme banco de dados
const PALMVIGDIURNOT1 = {
  codigo_escala: 'PALMVIGDIURNOT1',
  nome_escala: 'Vigia Diurno Palmeiras T1',
  turno: 'diurno',
  data_vigencia: '2025-01-01',
  trabalha_segunda: true,
  trabalha_terca: true,
  trabalha_quarta: true,
  trabalha_quinta: true,
  trabalha_sexta: true,
  trabalha_sabado: true,
  trabalha_domingo: true,
  trabalha_feriado: true,
  tipo_alternancia: 'DIAS_ALTERNADOS_T1',
  horarios_segunda: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_terca: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_quarta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_quinta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_sexta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_sabado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_domingo: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
  horarios_feriado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' }
};

const PALMVIGDIURNOT2 = {
  ...PALMVIGDIURNOT1,
  codigo_escala: 'PALMVIGDIURNOT2',
  nome_escala: 'Vigia Diurno Palmeiras T2',
  tipo_alternancia: 'DIAS_ALTERNADOS_T2'
};

// Converter para JSON
const regrasT1 = converterRegraVisualParaJSON(PALMVIGDIURNOT1);
const regrasT2 = converterRegraVisualParaJSON(PALMVIGDIURNOT2);

console.log('\n=== TESTE ESCALAS PALMVIGDIURNO - DEZEMBRO/2025 ===\n');
console.log('T1 Regras JSON:', JSON.stringify(regrasT1.alternancia, null, 2));
console.log('T2 Regras JSON:', JSON.stringify(regrasT2.alternancia, null, 2));
console.log('\n');

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Testar todos os dias de Dezembro/2025
console.log('Dia  | DiaSem | T1       | T2       | Correto?');
console.log('-----|--------|----------|----------|----------');

let diasTrabalhoT1 = 0;
let diasTrabalhoT2 = 0;

for (let dia = 1; dia <= 31; dia++) {
  const data = new Date(2025, 11, dia); // Dezembro = mês 11
  const diaSemana = diasSemana[data.getDay()];
  
  const resultT1 = interpretarRegraEscala(regrasT1, dia, 12, 2025, diaSemana, false);
  const resultT2 = interpretarRegraEscala(regrasT2, dia, 12, 2025, diaSemana, false);
  
  const trabalhaT1 = resultT1?.trabalha ?? true;
  const trabalhaT2 = resultT2?.trabalha ?? true;
  
  if (trabalhaT1) diasTrabalhoT1++;
  if (trabalhaT2) diasTrabalhoT2++;
  
  // Verificar se T1 e T2 estão alternando (um trabalha, outro folga)
  const correto = trabalhaT1 !== trabalhaT2;
  
  console.log(
    `${dia.toString().padStart(2, '0')}   | ${diaSemana.padEnd(6)} | ${trabalhaT1 ? 'TRABALHO' : 'FOLGA   '} | ${trabalhaT2 ? 'TRABALHO' : 'FOLGA   '} | ${correto ? '✅' : '❌ ERRO!'}`
  );
}

console.log('\n=== RESUMO ===');
console.log(`T1: ${diasTrabalhoT1} dias de trabalho, ${31 - diasTrabalhoT1} dias de folga`);
console.log(`T2: ${diasTrabalhoT2} dias de trabalho, ${31 - diasTrabalhoT2} dias de folga`);
console.log(`Alternância correta: T1 + T2 devem cobrir todos os 31 dias`);
console.log(`Total: ${diasTrabalhoT1 + diasTrabalhoT2} dias cobertos (esperado: 31)`);

export { PALMVIGDIURNOT1, PALMVIGDIURNOT2, regrasT1, regrasT2 };
