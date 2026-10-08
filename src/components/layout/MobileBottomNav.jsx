import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ListTodo, BookOpen, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const linkClass = ({ isActive }) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors praxis-touch-target",
    isActive ? "text-primary" : "text-muted-foreground",
  );

export default function MobileBottomNav({ onOpenMenu }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
          <span>Hoje</span>
        </NavLink>

        <NavLink
          to="/habitos-tarefas"
          className={({ isActive }) =>
            linkClass({ isActive: isActive || location.pathname === "/habitos-tarefas" })
          }
        >
          <ListTodo className="h-5 w-5 shrink-0" aria-hidden />
          <span>Hábitos</span>
        </NavLink>

        <NavLink
          to="/revisao-semanal"
          className={({ isActive }) => linkClass({ isActive })}
        >
          <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
          <span>Revisar</span>
        </NavLink>

        <button
          type="button"
          onClick={onOpenMenu}
          className={linkClass({ isActive: false })}
          aria-label="Abrir menu — ferramentas na lateral"
        >
          <Menu className="h-5 w-5 shrink-0" aria-hidden />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
