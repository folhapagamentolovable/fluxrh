import type { DocumentRecord } from "@fluxrh/contracts";
export const categoryLabels:Record<DocumentRecord["category"],string>={personal:"Pessoal",contract:"Contrato",occupational:"Saúde ocupacional",payroll:"Folha",benefit:"Benefício",policy:"Política"};
export const statusLabels:Record<DocumentRecord["status"],string>={requested:"Solicitado",received:"Recebido",under_review:"Em validação",validated:"Validado",rejected:"Rejeitado",generated:"Gerado",sent:"Aguardando aceite",accepted:"Aceito",expired:"Vencido"};
export const statusTones:Record<DocumentRecord["status"],"red"|"amber"|"blue"|"green"|"gray">={requested:"amber",received:"blue",under_review:"amber",validated:"green",rejected:"red",generated:"blue",sent:"amber",accepted:"green",expired:"red"};
