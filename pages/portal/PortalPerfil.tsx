import React from 'react';
import { User, Briefcase, Building, MapPin, Calendar, CreditCard, Shield } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import Card from '../../components/ui/Card';
import NotificationSettings from '../../components/NotificationSettings';

const PortalPerfil: React.FC = () => {
  const { funcionario, loading } = useEmployeePortal();

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calcularTempoEmpresa = (dataAdmissao: string) => {
    const admissao = new Date(dataAdmissao);
    const hoje = new Date();
    
    let anos = hoje.getFullYear() - admissao.getFullYear();
    let meses = hoje.getMonth() - admissao.getMonth();
    
    if (meses < 0) {
      anos--;
      meses += 12;
    }
    
    if (hoje.getDate() < admissao.getDate()) {
      meses--;
      if (meses < 0) {
        anos--;
        meses += 12;
      }
    }
    
    const parts = [];
    if (anos > 0) parts.push(`${anos} ano${anos > 1 ? 's' : ''}`);
    if (meses > 0) parts.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
    
    return parts.length > 0 ? parts.join(' e ') : 'Menos de 1 mês';
  };

  if (loading) {
    return (
      <PortalLayout employeeName={funcionario?.nome_completo}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PortalLayout>
    );
  }

  if (!funcionario) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Funcionário não encontrado</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario.nome_completo}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Informações pessoais e profissionais
          </p>
        </div>

        {/* Profile Card */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 flex justify-center sm:justify-start">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {funcionario.nome_completo}
                </h2>
                <p className="text-sm text-muted-foreground">{funcionario.nome_cargo || 'Cargo não definido'}</p>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{funcionario.nome_empresa || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{funcionario.nome_posto || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Desde {formatDate(funcionario.data_admissao)}</span>
                </div>
              </div>

              <div className="flex justify-center sm:justify-start">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  funcionario.funcionario_registrado 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {funcionario.funcionario_registrado ? 'Funcionário Registrado' : 'Não Registrado'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Informações Pessoais */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base text-foreground">Informações Pessoais</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Nome Completo</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.nome_completo}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">CPF</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{formatCPF(funcionario.cpf)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium text-sm sm:text-base text-foreground">
                  {funcionario.data_nascimento ? formatDate(funcionario.data_nascimento) : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Informações Profissionais */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base text-foreground">Informações Profissionais</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.nome_cargo || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Data de Admissão</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{formatDate(funcionario.data_admissao)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Tempo de Empresa</p>
                <p className="font-medium text-sm sm:text-base text-foreground">
                  {calcularTempoEmpresa(funcionario.data_admissao)}
                </p>
              </div>
            </div>
          </Card>

          {/* Local de Trabalho */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Building className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base text-foreground">Local de Trabalho</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.nome_empresa || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Posto de Trabalho</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.nome_posto || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Código da Escala</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.codigo_escala || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Documentos */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base text-foreground">Documentos</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Número CTPS</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.numero_ctps || '-'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Série CTPS</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{funcionario.serie_ctps || '-'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Benefícios e Adicionais */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base text-foreground">Benefícios e Adicionais</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className={`p-2.5 sm:p-3 rounded-lg text-center ${
              funcionario.recebe_vt ? 'bg-green-50' : 'bg-muted'
            }`}>
              <p className="text-xs sm:text-sm text-muted-foreground">Vale Transporte</p>
              <p className={`font-medium text-sm sm:text-base ${funcionario.recebe_vt ? 'text-green-600' : 'text-muted-foreground'}`}>
                {funcionario.recebe_vt ? 'Sim' : 'Não'}
              </p>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-lg text-center ${
              funcionario.adicional_insalubridade ? 'bg-green-50' : 'bg-muted'
            }`}>
              <p className="text-xs sm:text-sm text-muted-foreground">Insalubridade</p>
              <p className={`font-medium text-sm sm:text-base ${funcionario.adicional_insalubridade ? 'text-green-600' : 'text-muted-foreground'}`}>
                {funcionario.adicional_insalubridade ? 'Sim' : 'Não'}
              </p>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-lg text-center ${
              funcionario.acumulo_funcao ? 'bg-green-50' : 'bg-muted'
            }`}>
              <p className="text-xs sm:text-sm text-muted-foreground">Acúmulo Função</p>
              <p className={`font-medium text-sm sm:text-base ${funcionario.acumulo_funcao ? 'text-green-600' : 'text-muted-foreground'}`}>
                {funcionario.acumulo_funcao ? 'Sim' : 'Não'}
              </p>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-lg text-center ${
              funcionario.recebe_seguro_vida ? 'bg-green-50' : 'bg-muted'
            }`}>
              <p className="text-xs sm:text-sm text-muted-foreground">Seguro de Vida</p>
              <p className={`font-medium text-sm sm:text-base ${funcionario.recebe_seguro_vida ? 'text-green-600' : 'text-muted-foreground'}`}>
                {funcionario.recebe_seguro_vida ? 'Sim' : 'Não'}
              </p>
            </div>
          </div>
        </Card>

        {/* Configurações de Notificações */}
        <NotificationSettings />

        {/* Info */}
        <Card className="p-3 sm:p-4 bg-muted/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Para atualizar suas informações pessoais, entre em contato com o departamento de RH.
          </p>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default PortalPerfil;
