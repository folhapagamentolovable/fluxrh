// Utilitário para exportar folha de ponto para PDF e Excel
import { escreverEExibirJanela } from './printUtils';

/**
 * Exporta folha de ponto para CSV (compatível com Excel)
 */
export function exportarParaCSV(
  folhaData: any,
  dadosDias: any,
  totais: any,
  mes: number,
  ano: number
): void {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Cabeçalho
  let csv = 'FOLHA DE PONTO\n';
  csv += `Funcionário:,${folhaData.funcionario?.nome_completo || 'N/A'}\n`;
  csv += `Empresa:,${folhaData.empresa?.nome_empresa || 'N/A'}\n`;
  csv += `Cargo:,${folhaData.cargo?.nome_cargo || 'N/A'}\n`;
  csv += `Período:,${meses[mes - 1]}/${ano}\n`;
  csv += '\n';

  // Cabeçalho da tabela
  csv += 'Dia,Semana,Feriado,Folga,Atestado,Falta,Entrada,Início Ref,Término Ref,Saída,';
  csv += 'H.Normal,H.Extra 50%,H.Extra 100%,H.Noturna,Intra 50%,Intra 100%,Total\n';

  // Dados dos dias
  Object.keys(dadosDias).sort().forEach(diaKey => {
    const dia = dadosDias[diaKey];
    const numDia = diaKey.replace('dia_', '');
    const calculo = dia.calculo || {};

    csv += `${numDia},`;
    csv += `${getDiaSemana(Number(numDia), mes, ano)},`;
    csv += `${dia.feriado ? 'Sim' : 'Não'},`;
    csv += `${dia.folga ? 'Sim' : 'Não'},`;
    csv += `${dia.atestado ? 'Sim' : 'Não'},`;
    csv += `${dia.falta_injustificada ? 'Sim' : 'Não'},`;
    csv += `${dia.entrada || ''},`;
    csv += `${dia.inicio_refeicao || ''},`;
    csv += `${dia.termino_refeicao || ''},`;
    csv += `${dia.saida || ''},`;
    csv += `${calculo.horas_normais?.toFixed(2) || '0.00'},`;
    csv += `${calculo.horas_extras_50?.toFixed(2) || '0.00'},`;
    csv += `${calculo.horas_extras_100?.toFixed(2) || '0.00'},`;
    csv += `${calculo.horas_noturnas?.toFixed(2) || '0.00'},`;
    csv += `${calculo.intrajornada_50?.toFixed(2) || '0.00'},`;
    csv += `${calculo.intrajornada_100?.toFixed(2) || '0.00'},`;
    csv += `${calculo.total_horas?.toFixed(2) || '0.00'}\n`;
  });

  // Totais
  csv += '\n';
  csv += 'TOTAIS DO MÊS\n';
  csv += `Horas Normais:,${totais.total_horas_normais?.toFixed(2) || '0.00'}\n`;
  csv += `Horas Extras 50%:,${totais.total_horas_extras_50?.toFixed(2) || '0.00'}\n`;
  csv += `Horas Extras 100%:,${totais.total_horas_extras_100?.toFixed(2) || '0.00'}\n`;
  csv += `Horas Noturnas:,${totais.total_horas_noturnas?.toFixed(2) || '0.00'}\n`;
  csv += `Intrajornada 50%:,${totais.total_intrajornada_50?.toFixed(2) || '0.00'}\n`;
  csv += `Intrajornada 100%:,${totais.total_intrajornada_100?.toFixed(2) || '0.00'}\n`;
  csv += `Faltas Justificadas:,${totais.total_faltas_justificadas || 0}\n`;
  csv += `Faltas Injustificadas:,${totais.total_faltas_injustificadas || 0}\n`;
  csv += `Total Geral:,${(
    (totais.total_horas_normais || 0) +
    (totais.total_horas_extras_50 || 0) +
    (totais.total_horas_extras_100 || 0)
  ).toFixed(2)}\n`;

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `folha_ponto_${folhaData.funcionario?.nome_completo}_${mes}_${ano}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta folha de ponto para impressão (abre janela de impressão)
 */
export function exportarParaImpressao(
  folhaData: any,
  dadosDias: any,
  totais: any,
  mes: number,
  ano: number
): void {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Criar HTML para impressão
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Folha de Ponto - ${folhaData.funcionario?.nome_completo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; }
        h1 { text-align: center; font-size: 16px; }
        .info { margin: 20px 0; }
        .info div { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 4px; text-align: center; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .totais { margin-top: 20px; }
        .totais div { margin: 5px 0; }
        @media print {
          body { margin: 0; }
          @page { size: landscape; }
        }
      </style>
    </head>
    <body>
      <h1>FOLHA DE PONTO</h1>
      
      <div class="info">
        <div><strong>Funcionário:</strong> ${folhaData.funcionario?.nome_completo || 'N/A'}</div>
        <div><strong>Empresa:</strong> ${folhaData.empresa?.nome_empresa || 'N/A'}</div>
        <div><strong>Cargo:</strong> ${folhaData.cargo?.nome_cargo || 'N/A'}</div>
        <div><strong>Período:</strong> ${meses[mes - 1]}/${ano}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Sem</th>
            <th>Fer</th>
            <th>Folga</th>
            <th>Atst</th>
            <th>Falta</th>
            <th>Entrada</th>
            <th>Iníc Refeição</th>
            <th>Fim Refeição</th>
            <th>Saída</th>
            <th>Normal</th>
            <th>Extra 50%</th>
            <th>Extra 100%</th>
            <th>Noturna</th>
            <th>Intra 50%</th>
            <th>Intra 100%</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Adicionar linhas dos dias
  Object.keys(dadosDias).sort((a, b) => {
    const numA = Number(a.replace('dia_', ''));
    const numB = Number(b.replace('dia_', ''));
    return numA - numB;
  }).forEach(diaKey => {
    const dia = dadosDias[diaKey];
    const numDia = diaKey.replace('dia_', '');
    const calculo = dia.calculo || {};

    html += `
      <tr>
        <td>${numDia}</td>
        <td>${getDiaSemana(Number(numDia), mes, ano)}</td>
        <td>${dia.feriado ? 'X' : ''}</td>
        <td>${dia.folga ? 'X' : ''}</td>
        <td>${dia.atestado ? 'X' : ''}</td>
        <td>${dia.falta_injustificada ? 'X' : ''}</td>
        <td>${dia.entrada || ''}</td>
        <td>${dia.inicio_refeicao || ''}</td>
        <td>${dia.termino_refeicao || ''}</td>
        <td>${dia.saida || ''}</td>
        <td>${calculo.horas_normais?.toFixed(2) || '0.00'}</td>
        <td>${calculo.horas_extras_50?.toFixed(2) || '0.00'}</td>
        <td>${calculo.horas_extras_100?.toFixed(2) || '0.00'}</td>
        <td>${calculo.horas_noturnas?.toFixed(2) || '0.00'}</td>
        <td>${calculo.intrajornada_50?.toFixed(2) || '0.00'}</td>
        <td>${calculo.intrajornada_100?.toFixed(2) || '0.00'}</td>
        <td><strong>${calculo.total_horas?.toFixed(2) || '0.00'}</strong></td>
      </tr>
    `;
  });

  html += `
        </tbody>
        <tfoot>
          <tr style="background-color: #e0e0e0; font-weight: bold;">
            <td colspan="10">TOTAIS DO MÊS</td>
            <td>${totais.total_horas_normais?.toFixed(2) || '0.00'}</td>
            <td>${totais.total_horas_extras_50?.toFixed(2) || '0.00'}</td>
            <td>${totais.total_horas_extras_100?.toFixed(2) || '0.00'}</td>
            <td>${totais.total_horas_noturnas?.toFixed(2) || '0.00'}</td>
            <td>${totais.total_intrajornada_50?.toFixed(2) || '0.00'}</td>
            <td>${totais.total_intrajornada_100?.toFixed(2) || '0.00'}</td>
            <td>${(
              (totais.total_horas_normais || 0) +
              (totais.total_horas_extras_50 || 0) +
              (totais.total_horas_extras_100 || 0)
            ).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="totais">
        <div><strong>Faltas Justificadas:</strong> ${totais.total_faltas_justificadas || 0}</div>
        <div><strong>Faltas Injustificadas:</strong> ${totais.total_faltas_injustificadas || 0}</div>
        <div><strong>Total de Atrasos:</strong> ${totais.total_atrasos?.toFixed(2) || '0.00'}h</div>
      </div>

      <div style="margin-top: 50px;">
        <div style="float: left; width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">
          Assinatura do Funcionário
        </div>
        <div style="float: right; width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">
          Assinatura do Responsável
        </div>
      </div>
    </body>
    </html>
  `;

  // Abrir janela de impressão
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    escreverEExibirJanela(printWindow, html, 'Folha de Ponto');
  }
}

/**
 * Gera resumo mensal para relatório
 */
export function gerarResumoMensal(folhasPonto: any[]): any {
  const resumo = {
    total_funcionarios: folhasPonto.length,
    total_horas_normais: 0,
    total_horas_extras_50: 0,
    total_horas_extras_100: 0,
    total_horas_noturnas: 0,
    total_faltas_justificadas: 0,
    total_faltas_injustificadas: 0,
    media_horas_por_funcionario: 0,
    funcionarios_com_extras: 0,
    funcionarios_com_faltas: 0
  };

  folhasPonto.forEach(folha => {
    resumo.total_horas_normais += folha.total_horas_normais || 0;
    resumo.total_horas_extras_50 += folha.total_horas_extras_50 || 0;
    resumo.total_horas_extras_100 += folha.total_horas_extras_100 || 0;
    resumo.total_horas_noturnas += folha.total_horas_noturnas || 0;
    resumo.total_faltas_justificadas += folha.total_faltas_justificadas || 0;
    resumo.total_faltas_injustificadas += folha.total_faltas_injustificadas || 0;

    if ((folha.total_horas_extras_50 || 0) + (folha.total_horas_extras_100 || 0) > 0) {
      resumo.funcionarios_com_extras++;
    }

    if ((folha.total_faltas_justificadas || 0) + (folha.total_faltas_injustificadas || 0) > 0) {
      resumo.funcionarios_com_faltas++;
    }
  });

  resumo.media_horas_por_funcionario = resumo.total_horas_normais / folhasPonto.length;

  return resumo;
}

// Função auxiliar
function getDiaSemana(dia: number, mes: number, ano: number): string {
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const date = new Date(ano, mes - 1, dia);
  return diasSemana[date.getDay()];
}
