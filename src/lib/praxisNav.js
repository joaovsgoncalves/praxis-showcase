import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Lightbulb,
  ShoppingBag,
  Timer,
  Target,
  Trophy,
  BarChart3,
  Settings,
  Dumbbell,
  Wallet,
  Layers,
} from "lucide-react";

/** Dia a dia — bottom nav + topo da sidebar (sem hub /mais) */
// Falar fora do primary até o João pedir de volta
export const primaryNavItems = [
  { path: "/", label: "Hoje", icon: LayoutDashboard, end: true },
  { path: "/habitos-tarefas", label: "Hábitos e tarefas", shortLabel: "Hábitos", icon: ListTodo },
  { path: "/revisao-semanal", label: "Revisar", icon: BookOpen },
];

/** Ferramentas na aba lateral (sidebar / menu hambúrguer) — sem página hub */
export const secondaryNavItems = [
  { path: "/jota-fit", label: "Jota Fit", icon: Dumbbell },
  { path: "/frentes", label: "Frentes", icon: Layers },
  { path: "/ideias", label: "Ideias", icon: Lightbulb },
  { path: "/metas", label: "Metas", icon: Target },
  { path: "/financas", label: "Finanças", icon: Wallet },
  { path: "/compras", label: "Compras", icon: ShoppingBag },
  { path: "/foco", label: "Modo Foco", icon: Timer },
  // /capturas fica acessível por links diretos — fora do menu (João 2026-07-16)
  { path: "/conquistas", label: "Conquistas", icon: Trophy, requiresUnlockedAchievements: true },
  { path: "/historico", label: "Histórico", icon: BarChart3 },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

export function filterSecondaryNav(items, ctx) {
  const {
    unlockedAchievementCount = 0,
  } = ctx;
  return items.filter((item) => {
    if (item.requiresUnlockedAchievements) return unlockedAchievementCount > 0;
    return true;
  });
}
