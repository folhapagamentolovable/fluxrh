import React from 'react';

// Paleta compartilhada com o Relatório Detalhado por Posto de Trabalho
export const REPORT_COLORS = {
    section: '#90bbf1',      // section-header (azul claro)
    subtotal: '#f3e0aa',     // total-row e cabeçalhos (bege)
    liquido: '#c5e0b4',      // salário líquido (verde)
    beneficios: '#d9e1f2',   // benefícios (azul muito claro)
    depositar: '#5957af',    // total a depositar (roxo)
    encargo: '#f09d9d',      // encargos / FGTS (vermelho)
    border: '#000',
} as const;

export const REPORT_FONT = 'Arial, sans-serif';
export const REPORT_FONT_SIZE = '11px';

export type GrupoLinha =
    | 'NORMAL' | 'PROV' | 'DESC' | 'BENEF'
    | 'SECTION' | 'SUBTOTAL' | 'LIQUIDO' | 'DEPOSITAR' | 'ENCARGO';

export const estiloPorGrupo = (g: GrupoLinha): { bg: string; color: string; bold: boolean } => {
    switch (g) {
        case 'SECTION': return { bg: REPORT_COLORS.section, color: '#000', bold: true };
        case 'SUBTOTAL': return { bg: REPORT_COLORS.subtotal, color: '#000', bold: true };
        case 'LIQUIDO': return { bg: REPORT_COLORS.liquido, color: '#000', bold: true };
        case 'DEPOSITAR': return { bg: REPORT_COLORS.depositar, color: '#fff', bold: true };
        case 'ENCARGO': return { bg: REPORT_COLORS.encargo, color: '#000', bold: true };
        default: return { bg: '', color: '#000', bold: false };
    }
};

// CSS reaproveitado em janelas de impressão
export const REPORT_PRINT_CSS = `
@media print { @page { size: landscape; margin: 10mm; } body { margin: 0; } }
body { font-family: ${REPORT_FONT}; font-size: ${REPORT_FONT_SIZE}; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
th, td { border: 1px solid ${REPORT_COLORS.border}; padding: 2px 4px; text-align: center; }
th { background-color: ${REPORT_COLORS.subtotal}; font-weight: bold; }
.section-header { background-color: ${REPORT_COLORS.section}; font-weight: bold; text-align: left; }
.total-row { background-color: ${REPORT_COLORS.subtotal}; font-weight: bold; }
.text-left { text-align: left; }
h2 { margin: 4px 0; } h3 { margin: 2px 0 10px 0; font-weight: normal; }
`;

const TD: React.CSSProperties = {
    border: `1px solid ${REPORT_COLORS.border}`,
    padding: '2px 4px',
    textAlign: 'center',
};

export const ReportTH: React.FC<{ children: React.ReactNode; align?: 'left' | 'center'; width?: number }> = ({ children, align = 'center', width }) => (
    <th style={{ ...TD, backgroundColor: REPORT_COLORS.subtotal, textAlign: align, width }}>{children}</th>
);

export const ReportSectionRow: React.FC<{ label: string; colSpan: number }> = ({ label, colSpan }) => (
    <tr>
        <td colSpan={colSpan} style={{ ...TD, backgroundColor: REPORT_COLORS.section, fontWeight: 'bold', textAlign: 'left' }}>
            {label}
        </td>
    </tr>
);

export const ReportRow: React.FC<{
    grupo: GrupoLinha;
    label: string;
    valores: number[];
    total: number;
    fmt: (n: number) => string;
}> = ({ grupo, label, valores, total, fmt }) => {
    const st = estiloPorGrupo(grupo);
    const rowStyle: React.CSSProperties = {
        backgroundColor: st.bg || undefined,
        color: st.color,
        fontWeight: st.bold ? 'bold' : 'normal',
    };
    return (
        <tr style={rowStyle}>
            <td style={{ ...TD, textAlign: 'left' }}>{label}</td>
            {valores.map((v, i) => <td key={i} style={TD}>{v ? fmt(v) : '-'}</td>)}
            <td style={{ ...TD, backgroundColor: st.bg || REPORT_COLORS.subtotal, fontWeight: 'bold', color: st.color }}>
                {fmt(total)}
            </td>
        </tr>
    );
};

export const ReportEmptyState: React.FC<{
    titulo?: string;
    mensagem: string;
    sugestao?: string;
}> = ({ titulo = 'Nenhum dado encontrado', mensagem, sugestao }) => (
    <div style={{ fontFamily: REPORT_FONT }} className="text-center py-12 px-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40">
        <div className="text-5xl mb-3">📭</div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">{mensagem}</p>
        {sugestao && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">{sugestao}</p>
        )}
    </div>
);
