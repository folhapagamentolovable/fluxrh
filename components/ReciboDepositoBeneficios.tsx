import React from 'react';

interface Beneficio {
  quantidade?: number | string; // Opcional, pode ser número ou string vazia
  descricao: string;
  valor: number;
}

interface ReciboDepositoBeneficiosProps {
  nomeFuncionario: string;
  cpf: string;
  nomeEmpresa: string;
  cnpj: string;
  beneficios: Beneficio[];
  totalDepositado: number;
}

export const ReciboDepositoBeneficios: React.FC<ReciboDepositoBeneficiosProps> = ({
  nomeFuncionario,
  cpf,
  nomeEmpresa,
  cnpj,
  beneficios,
  totalDepositado
}) => {
  const formatarCNPJ = (cnpj: string): string => {
    const numeros = cnpj.replace(/\D/g, '');
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatarCPF = (cpf: string): string => {
    const numeros = cpf.replace(/\D/g, '');
    return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  const formatarValor = (valor: number): string => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="recibo-deposito-beneficios w-full max-w-4xl mx-auto p-4 sm:p-8 bg-white overflow-x-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Linha 1 */}
      <h1 className="text-center text-xl font-bold" style={{ marginBottom: '40px' }}>RECIBO DE PAGAMENTO</h1>
      
      {/* Linha 3 */}
      <p className="text-justify mb-4" style={{ lineHeight: '1.8' }}>
        Eu, <span className="font-semibold">{nomeFuncionario}</span>, portador(a) do CPF nº{' '}
        <span className="font-semibold">{formatarCPF(cpf)}</span>, DECLARO, para os devidos fins, 
        que recebi da empresa <span className="font-semibold">{nomeEmpresa || '[NOME DA EMPRESA]'}</span>, inscrita no CNPJ 
        sob o nº <span className="font-semibold">{cnpj ? formatarCNPJ(cnpj) : '[CNPJ]'}</span>, a quantia de R${' '}
        <span className="font-semibold">{formatarValor(totalDepositado)}</span>, conforme detalhamento abaixo:
      </p>
      
      {/* Linha 4 - Em branco */}
      <div className="mb-4"></div>
      
      {/* Linha 5 - Lista de benefícios */}
      <div className="mb-4">
        <table className="w-full border-collapse" style={{ width: '100%', maxWidth: '100%' }}>
          <thead>
            <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
              <th className="text-center py-2" style={{ width: '15%' }}>Qtde</th>
              <th className="text-center py-2" style={{ width: '60%' }}>Descrição</th>
              <th className="text-center py-2" style={{ width: '25%' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {beneficios.map((beneficio, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #ccc' }}>
                <td className="text-center py-2">{beneficio.quantidade !== undefined && beneficio.quantidade !== '' ? beneficio.quantidade : '-'}</td>
                <td className="text-center py-2">{beneficio.descricao}</td>
                <td className="text-center py-2">R$ {formatarValor(beneficio.valor)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #000' }}>
              <td className="py-3"></td>
              <td className="text-center py-3 font-bold">Total depositado:</td>
              <td className="text-center py-3 font-bold">R$ {formatarValor(totalDepositado)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Espaçamento maior antes da data - aumentado */}
      <div style={{ marginBottom: '100px' }}></div>
      
      {/* Linha 11 - Data */}
      <p className="mb-8">Campinas, ____ / ____ / _____________</p>
  
      {/* Espaçamento entre data e assinatura */}
      <div style={{ marginBottom: '150px' }}></div>
      
      {/* Linha 15 */}
      <div className="text-left">
        <div className="inline-block">
          <div className="border-t border-black pt-2" style={{ minWidth: '300px' }}>
            {/* Linha 16 */}
            <p className="font-semibold">{nomeFuncionario}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
