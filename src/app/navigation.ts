import {
  BarChart3,
  Bot,
  CalendarClock,
  CircleGauge,
  CircleUserRound,
  Cog,
  GitBranch,
  Sparkles,
  UsersRound,
  WalletCards,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface ProductNavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export const productNavigation: readonly ProductNavigationItem[] = [
  { label: 'Home operacional', path: '/operacao', icon: CircleGauge, description: 'O que exige atenção agora' },
  { label: 'Central de Exceções', path: '/operacao/excecoes', icon: Zap, description: 'Decisões e bloqueios priorizados' },
  { label: 'Pessoas', path: '/operacao/pessoas', icon: UsersRound, description: 'Vínculos e ciclo de vida' },
  { label: 'Jornada', path: '/operacao/jornada', icon: CalendarClock, description: 'Ponto, escalas e cobertura' },
  { label: 'Remuneração', path: '/operacao/remuneracao', icon: WalletCards, description: 'Folha, benefícios e variações' },
  { label: 'Processos', path: '/operacao/processos', icon: GitBranch, description: 'Fluxos operacionais em curso' },
  { label: 'Analytics', path: '/operacao/analytics', icon: BarChart3, description: 'Tendências e capacidade' },
  { label: 'Automação', path: '/operacao/automacao', icon: Sparkles, description: 'Monitores e regras ativas' },
  { label: 'FluxPay AI', path: '/operacao/ai', icon: Bot, description: 'Copiloto com contexto auditável' },
  { label: 'Configurações', path: '/operacao/configuracoes', icon: Cog, description: 'Políticas, acessos e autonomia' },
] as const;

export const productProfile = {
  name: 'Claudia Menezes',
  role: 'Gestora de RH',
  initials: 'CM',
  icon: CircleUserRound,
} as const;
