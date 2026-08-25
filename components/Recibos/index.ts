// Exportações centralizadas dos componentes de Recibos

// Holerite de Salário (sem itens de 13°)
export { default as HoleriteSalario } from './HoleriteSalario';
export { mapearFolhaParaHoleriteSalario, deveExcluirDoHoleriteSalario, formatarMoeda as formatarMoedaSalario } from './codigosContabeisSalario';

// Holerite de 13° Salário
export { default as Holerite13Salario } from './Holerite13Salario';
export { mapearFolhaParaHolerite13Salario, isItem13Salario, formatarMoeda as formatarMoeda13 } from './codigosContabeis13Salario';

// Tipos
export type { LancamentoHolerite } from './codigosContabeisSalario';
export type { LancamentoHolerite13 } from './codigosContabeis13Salario';
