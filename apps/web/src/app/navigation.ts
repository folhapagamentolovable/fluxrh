import { Activity, BarChart3, BellRing, BookOpen, Building2, CalendarDays, CircleDollarSign, Clock3, FileText, Gift, HeartHandshake, LayoutDashboard, MapPinned, Megaphone, Settings2, SquareUserRound, UserMinus, UserPlus, UsersRound, Workflow } from "lucide-react";

export const navigation = [
  { label: "Visão geral", path: "/", icon: LayoutDashboard },
  { label: "Exceções", path: "/excecoes", icon: BellRing, count: 7 },
  { label: "Pessoas", path: "/pessoas", icon: UsersRound },
  { label: "Meu portal", path: "/portal", icon: SquareUserRound },
  { label: "Admissões", path: "/admissoes", icon: UserPlus },
  { label: "Empresas", path: "/empresas", icon: Building2 },
  { label: "Jornada", path: "/jornada", icon: Clock3 },
  { label: "Férias", path: "/ferias", icon: CalendarDays },
  { label: "Benefícios", path: "/beneficios", icon: HeartHandshake },
  { label: "13º e cálculos", path: "/calculos", icon: Gift },
  { label: "Folha", path: "/folha", icon: CircleDollarSign },
  { label: "Desligamentos", path: "/desligamentos", icon: UserMinus },
  { label: "Documentos", path: "/documentos", icon: FileText },
  { label: "Comunicação", path: "/comunicacao", icon: Megaphone },
  { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
  { label: "Saúde ocupacional", path: "/saude-ocupacional", icon: Activity },
  { label: "Rondas", path: "/rondas", icon: MapPinned },
  { label: "Automações", path: "/automacoes", icon: Workflow },
  { label: "Configurações", path: "/configuracoes", icon: Settings2 },
  { label: "Manual do usuário", path: "/manual", icon: BookOpen },
] as const;
