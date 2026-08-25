import { type ResultadoCalculoFolha } from '../../../utils/calcularFolhaPagamento';

export interface EventoExcepcional {
    descricao: string;
    valor: number;
    tipo: 'provento' | 'beneficio' | 'desconto';
    isAvariaUtilitario?: boolean;
    isRondasNaoRealizadas?: boolean;
    isRondasNaoRealizadasBenef?: boolean;
}

export interface FolhaCalculadaCompleta {
    funcionario: any;
    resultado: ResultadoCalculoFolha;
    dadosFolha: any;
    escalaMensalProximoMes?: any;
    empresa?: any;
    posto_trabalho?: any;
    eventosExcepcionais?: EventoExcepcional[];
    folgas_trabalhadas?: number;
}

export interface PrintContext {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    setImprimindo: (val: boolean) => void;
    setProgressoImpressao: (val: any) => void;
    eventosExcepcionais: Record<string, EventoExcepcional[]>;
    mes: number;
    ano: number;
    meses: string[];
    parametros: any;
}
