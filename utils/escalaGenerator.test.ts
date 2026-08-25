// Exemplo de teste para validar a geração de escalas
// Execute este arquivo para testar as regras

import { gerarEscala } from './escalaGenerator';

// Teste básico para GALVIGDIURNOT1 em Outubro/2025
const testarEscala = () => {
  console.log('🧪 Testando geração de escala GALVIGDIURNOT1 - Outubro/2025\n');
  
  const startDate = new Date('2025-10-01');
  const endDate = new Date('2025-10-31');
  const feriados = [
    new Date('2025-10-12') // Exemplo: Dia das Crianças
  ];
  
  const escala = gerarEscala('GALVIGDIURNOT1', startDate, endDate, feriados);
  
  console.log('📊 Primeiros 10 dias:');
  escala.slice(0, 10).forEach(item => {
    const dia = item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const diaSemana = item.data.toLocaleDateString('pt-BR', { weekday: 'short' });
    console.log(`${dia} (${diaSemana}): ${item.status.padEnd(8)} - ${item.horario}`);
  });
  
  console.log('\n📈 Estatísticas:');
  const trabalho = escala.filter(e => e.status === 'TRABALHO').length;
  const folga = escala.filter(e => e.status === 'FOLGA').length;
  console.log(`Dias de trabalho: ${trabalho}`);
  console.log(`Dias de folga: ${folga}`);
  console.log(`Total: ${escala.length} dias`);
};

// Teste de alternância
const testarAlternancia = () => {
  console.log('\n\n🔄 Testando alternância T1 vs T2 - Janeiro/2025\n');
  
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-10');
  
  const t1 = gerarEscala('GALVIGDIURNOT1', startDate, endDate, []);
  const t2 = gerarEscala('GALVIGDIURNOT2', startDate, endDate, []);
  
  console.log('Dia | T1        | T2');
  console.log('----+-----------+-----------');
  
  for (let i = 0; i < 10; i++) {
    const dia = t1[i].data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const t1Status = t1[i].status;
    const t2Status = t2[i].status;
    console.log(`${dia} | ${t1Status.padEnd(9)} | ${t2Status.padEnd(9)}`);
  }
};

// Teste de sábados alternados
const testarSabadosAlternados = () => {
  console.log('\n\n📅 Testando sábados alternados - Janeiro/2025\n');
  
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');
  
  const t1 = gerarEscala('PALMLIMPT1', startDate, endDate, []);
  const t2 = gerarEscala('PALMLIMPT2', startDate, endDate, []);
  
  // Filtrar apenas sábados
  const sabadosT1 = t1.filter(e => e.data.getDay() === 6);
  const sabadosT2 = t2.filter(e => e.data.getDay() === 6);
  
  console.log('PALMLIMPT1 (Sábados ímpares):');
  sabadosT1.forEach(s => {
    const dia = s.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    console.log(`  ${dia}: ${s.status} - ${s.horario}`);
  });
  
  console.log('\nPALMLIMPT2 (Sábados pares):');
  sabadosT2.forEach(s => {
    const dia = s.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    console.log(`  ${dia}: ${s.status} - ${s.horario}`);
  });
};

// Executar todos os testes
if (require.main === module) {
  testarEscala();
  testarAlternancia();
  testarSabadosAlternados();
  
  console.log('\n✅ Testes concluídos!\n');
}

export { testarEscala, testarAlternancia, testarSabadosAlternados };
