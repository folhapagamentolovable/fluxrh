/**
 * Gerador de arquivo CNAB 240 para pagamentos em lote - Itaú
 * Layout baseado na especificação Itaú CNAB 240
 */

interface DadosFavorecido {
  nome: string;
  cpf: string;
  banco: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  valor: number;
  dataVencimento?: Date;
}

interface DadosEmpresa {
  razaoSocial: string;
  cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  endereco?: string;
  cidade?: string;
  cep?: string;
  estado?: string;
}

interface ConfigCNAB {
  empresa: DadosEmpresa;
  favorecidos: DadosFavorecido[];
  dataGeracao?: Date;
  tipoServico?: 'pagamento_salario' | 'pagamento_fornecedor' | 'credito_conta';
}

// Códigos de banco
const CODIGO_ITAU = '341';

// Funções auxiliares
function padLeft(value: string | number, length: number, char: string = '0'): string {
  return String(value).padStart(length, char);
}

function padRight(value: string, length: number, char: string = ' '): string {
  return String(value || '').padEnd(length, char).substring(0, length);
}

function formatarData(data: Date): string {
  const dia = padLeft(data.getDate(), 2);
  const mes = padLeft(data.getMonth() + 1, 2);
  const ano = data.getFullYear();
  return `${dia}${mes}${ano}`;
}

function formatarHora(data: Date): string {
  const hora = padLeft(data.getHours(), 2);
  const minuto = padLeft(data.getMinutes(), 2);
  const segundo = padLeft(data.getSeconds(), 2);
  return `${hora}${minuto}${segundo}`;
}

function limparString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toUpperCase();
}

function limparNumeros(str: string): string {
  return (str || '').replace(/\D/g, '');
}

function formatarValor(valor: number, casasDecimais: number = 2): string {
  const valorInteiro = Math.round(valor * Math.pow(10, casasDecimais));
  return padLeft(valorInteiro, 15);
}

/**
 * Gera o Header do Arquivo (Registro 0)
 */
function gerarHeaderArquivo(config: ConfigCNAB, sequencia: number): string {
  const dataGeracao = config.dataGeracao || new Date();
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    '0000',                                         // 04-07: Lote de serviço (0000 = header arquivo)
    '0',                                            // 08: Tipo de registro (0 = header arquivo)
    padRight('', 9),                                // 09-17: Uso exclusivo FEBRABAN
    '2',                                            // 18: Tipo de inscrição (1=CPF, 2=CNPJ)
    padLeft(limparNumeros(config.empresa.cnpj), 14), // 19-32: CNPJ
    padRight('', 20),                               // 33-52: Código do convênio
    padLeft(config.empresa.agencia, 5),             // 53-57: Agência
    padRight('', 1),                                // 58: Dígito agência
    padLeft(limparNumeros(config.empresa.conta), 12), // 59-70: Conta
    padRight(config.empresa.digitoConta, 1),        // 71: Dígito conta
    padRight('', 1),                                // 72: Dígito agência/conta
    padRight(limparString(config.empresa.razaoSocial), 30), // 73-102: Nome da empresa
    padRight('BANCO ITAU SA', 30),                  // 103-132: Nome do banco
    padRight('', 10),                               // 133-142: Uso exclusivo FEBRABAN
    '1',                                            // 143: Código remessa (1=remessa, 2=retorno)
    formatarData(dataGeracao),                      // 144-151: Data de geração
    formatarHora(dataGeracao),                      // 152-157: Hora de geração
    padLeft(sequencia, 6),                          // 158-163: Número sequencial do arquivo
    '087',                                          // 164-166: Versão do layout
    padLeft('0', 5),                                // 167-171: Densidade de gravação
    padRight('', 20),                               // 172-191: Uso reservado banco
    padRight('', 20),                               // 192-211: Uso reservado empresa
    padRight('', 29),                               // 212-240: Uso exclusivo FEBRABAN
  ];
  
  return linha.join('');
}

/**
 * Gera o Header do Lote (Registro 1)
 */
function gerarHeaderLote(config: ConfigCNAB, numeroLote: number): string {
  const tipoServico = config.tipoServico === 'pagamento_salario' ? '30' : '20';
  
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    padLeft(numeroLote, 4),                         // 04-07: Número do lote
    '1',                                            // 08: Tipo de registro (1 = header lote)
    'C',                                            // 09: Tipo de operação (C=Crédito)
    tipoServico,                                    // 10-11: Tipo de serviço (30=pag salário)
    '01',                                           // 12-13: Forma de lançamento (01=crédito em conta)
    '045',                                          // 14-16: Versão do layout do lote
    padRight('', 1),                                // 17: Uso exclusivo FEBRABAN
    '2',                                            // 18: Tipo de inscrição empresa
    padLeft(limparNumeros(config.empresa.cnpj), 14), // 19-32: CNPJ
    padRight('', 20),                               // 33-52: Código do convênio
    padLeft(config.empresa.agencia, 5),             // 53-57: Agência
    padRight('', 1),                                // 58: Dígito agência
    padLeft(limparNumeros(config.empresa.conta), 12), // 59-70: Conta
    padRight(config.empresa.digitoConta, 1),        // 71: Dígito conta
    padRight('', 1),                                // 72: Dígito agência/conta
    padRight(limparString(config.empresa.razaoSocial), 30), // 73-102: Nome empresa
    padRight('', 40),                               // 103-142: Mensagem 1
    padRight(limparString(config.empresa.endereco || ''), 30), // 143-172: Endereço
    padLeft(limparNumeros(config.empresa.cep || ''), 5), // 173-177: CEP
    padRight('', 3),                                // 178-180: Complemento CEP
    padRight(limparString(config.empresa.cidade || ''), 15), // 181-195: Cidade
    padRight(config.empresa.estado || '', 2),       // 196-197: Estado
    padRight('', 8),                                // 198-205: Uso exclusivo FEBRABAN
    padRight('', 10),                               // 206-215: Cód. ocorrências retorno
    padRight('', 25),                               // 216-240: Uso exclusivo FEBRABAN
  ];
  
  return linha.join('');
}

/**
 * Gera o registro detalhe Segmento A (dados do favorecido)
 */
function gerarSegmentoA(
  favorecido: DadosFavorecido, 
  numeroLote: number, 
  sequenciaRegistro: number,
  dataVencimento: Date
): string {
  const banco = favorecido.banco === CODIGO_ITAU ? '0' : favorecido.banco;
  
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    padLeft(numeroLote, 4),                         // 04-07: Número do lote
    '3',                                            // 08: Tipo de registro (3 = detalhe)
    padLeft(sequenciaRegistro, 5),                  // 09-13: Número sequencial registro
    'A',                                            // 14: Código de segmento
    '0',                                            // 15: Tipo de movimento (0=inclusão)
    '00',                                           // 16-17: Código de instrução
    '000',                                          // 18-20: Câmara centralizadora
    padLeft(favorecido.banco, 3),                   // 21-23: Código banco favorecido
    padLeft(favorecido.agencia, 5),                 // 24-28: Agência favorecido
    padRight('', 1),                                // 29: Dígito agência
    padLeft(limparNumeros(favorecido.conta), 12),   // 30-41: Conta favorecido
    padRight(favorecido.digitoConta, 1),            // 42: Dígito conta
    padRight('', 1),                                // 43: Dígito agência/conta
    padRight(limparString(favorecido.nome), 30),    // 44-73: Nome favorecido
    padRight('', 20),                               // 74-93: Número documento
    formatarData(dataVencimento),                   // 94-101: Data de pagamento
    'BRL',                                          // 102-104: Tipo de moeda
    padLeft('0', 15),                               // 105-119: Quantidade de moeda
    formatarValor(favorecido.valor),                // 120-134: Valor do pagamento
    padRight('', 20),                               // 135-154: Número documento banco
    formatarData(dataVencimento),                   // 155-162: Data real efetivação
    formatarValor(favorecido.valor),                // 163-177: Valor real efetivação
    padRight('', 40),                               // 178-217: Outras informações
    padRight('', 2),                                // 218-219: Complemento tipo serviço
    padRight('', 10),                               // 220-229: Código finalidade DOC/TED
    padRight('', 2),                                // 230-231: Aviso ao favorecido
    padRight('', 9),                                // 232-240: Ocorrências para retorno
  ];
  
  return linha.join('');
}

/**
 * Gera o registro detalhe Segmento B (dados complementares)
 */
function gerarSegmentoB(
  favorecido: DadosFavorecido,
  numeroLote: number,
  sequenciaRegistro: number,
  dataVencimento: Date
): string {
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    padLeft(numeroLote, 4),                         // 04-07: Número do lote
    '3',                                            // 08: Tipo de registro (3 = detalhe)
    padLeft(sequenciaRegistro, 5),                  // 09-13: Número sequencial registro
    'B',                                            // 14: Código de segmento
    padRight('', 3),                                // 15-17: Uso exclusivo FEBRABAN
    '1',                                            // 18: Tipo de inscrição (1=CPF, 2=CNPJ)
    padLeft(limparNumeros(favorecido.cpf), 14),     // 19-32: CPF/CNPJ favorecido
    padRight('', 30),                               // 33-62: Endereço favorecido
    padLeft('0', 5),                                // 63-67: Número
    padRight('', 15),                               // 68-82: Complemento
    padRight('', 15),                               // 83-97: Bairro
    padRight('', 15),                               // 98-112: Cidade
    padLeft('0', 5),                                // 113-117: CEP
    padRight('', 3),                                // 118-120: Complemento CEP
    padRight('', 2),                                // 121-122: Estado
    formatarData(dataVencimento),                   // 123-130: Data de vencimento
    formatarValor(favorecido.valor),                // 131-145: Valor do documento
    formatarValor(0),                               // 146-160: Valor abatimento
    formatarValor(0),                               // 161-175: Valor desconto
    formatarValor(0),                               // 176-190: Valor mora
    formatarValor(0),                               // 191-205: Valor multa
    padRight('', 15),                               // 206-220: Código documento favorecido
    padRight('', 1),                                // 221: Aviso ao favorecido
    padRight('', 6),                                // 222-227: Código UG centralizadora
    padRight('', 13),                               // 228-240: ISPB
  ];
  
  return linha.join('');
}

/**
 * Gera o Trailer do Lote (Registro 5)
 */
function gerarTrailerLote(
  numeroLote: number,
  quantidadeRegistros: number,
  valorTotal: number
): string {
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    padLeft(numeroLote, 4),                         // 04-07: Número do lote
    '5',                                            // 08: Tipo de registro (5 = trailer lote)
    padRight('', 9),                                // 09-17: Uso exclusivo FEBRABAN
    padLeft(quantidadeRegistros, 6),                // 18-23: Quantidade de registros no lote
    formatarValor(valorTotal, 2).padStart(18, '0'), // 24-41: Somatória valores
    padLeft('0', 18),                               // 42-59: Somatória quantidade moeda
    padLeft('0', 6),                                // 60-65: Número aviso débito
    padRight('', 165),                              // 66-230: Uso exclusivo FEBRABAN
    padRight('', 10),                               // 231-240: Ocorrências para retorno
  ];
  
  return linha.join('');
}

/**
 * Gera o Trailer do Arquivo (Registro 9)
 */
function gerarTrailerArquivo(
  quantidadeLotes: number,
  quantidadeRegistros: number
): string {
  const linha = [
    CODIGO_ITAU,                                    // 01-03: Código do banco
    '9999',                                         // 04-07: Lote de serviço (9999 = trailer arquivo)
    '9',                                            // 08: Tipo de registro (9 = trailer arquivo)
    padRight('', 9),                                // 09-17: Uso exclusivo FEBRABAN
    padLeft(quantidadeLotes, 6),                    // 18-23: Quantidade de lotes
    padLeft(quantidadeRegistros, 6),                // 24-29: Quantidade de registros
    padLeft('0', 6),                                // 30-35: Quantidade de contas conciliação
    padRight('', 205),                              // 36-240: Uso exclusivo FEBRABAN
  ];
  
  return linha.join('');
}

/**
 * Gera arquivo CNAB 240 completo para pagamento Itaú
 */
export function gerarCNAB240Itau(config: ConfigCNAB): string {
  const linhas: string[] = [];
  const dataGeracao = config.dataGeracao || new Date();
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 1); // Vencimento D+1
  
  let sequenciaArquivo = 1;
  let numeroLote = 1;
  let sequenciaRegistro = 0;
  let valorTotal = 0;
  
  // Header do arquivo
  linhas.push(gerarHeaderArquivo(config, sequenciaArquivo));
  
  // Header do lote
  linhas.push(gerarHeaderLote(config, numeroLote));
  
  // Registros detalhe (Segmento A + B para cada favorecido)
  config.favorecidos.forEach((favorecido) => {
    sequenciaRegistro++;
    linhas.push(gerarSegmentoA(favorecido, numeroLote, sequenciaRegistro, dataVencimento));
    
    sequenciaRegistro++;
    linhas.push(gerarSegmentoB(favorecido, numeroLote, sequenciaRegistro, dataVencimento));
    
    valorTotal += favorecido.valor;
  });
  
  // Trailer do lote (header + registros + trailer)
  const registrosNoLote = 2 + (config.favorecidos.length * 2); // Header + segmentos + trailer
  linhas.push(gerarTrailerLote(numeroLote, registrosNoLote, valorTotal));
  
  // Trailer do arquivo (total de registros incluindo headers e trailers)
  const totalRegistros = linhas.length + 1; // +1 pelo próprio trailer
  linhas.push(gerarTrailerArquivo(1, totalRegistros));
  
  return linhas.join('\r\n');
}

/**
 * Exportar arquivo CNAB para download
 */
export function downloadCNAB(conteudo: string, nomeArquivo: string): void {
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Converte lista de folhas para formato de favorecidos CNAB
 */
export function folhasParaFavorecidos(folhas: any[]): DadosFavorecido[] {
  return folhas
    .filter(f => f.funcionario && f.resultado?.salario_liquido > 0)
    .map(f => ({
      nome: f.funcionario.nome_completo || '',
      cpf: f.funcionario.cpf || '',
      banco: f.funcionario.banco || '341', // Itaú como padrão
      agencia: f.funcionario.agencia || '0001',
      conta: f.funcionario.conta || '000000',
      digitoConta: f.funcionario.digito_conta || '0',
      valor: f.resultado.salario_liquido || 0,
    }));
}
