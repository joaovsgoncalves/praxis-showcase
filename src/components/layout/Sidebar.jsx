import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { primaryNavItems, secondaryNavItems, filterSecondaryNav } from '@/lib/praxisNav';
import PraxisBrand from '@/components/brand/PraxisBrand';

function AvatarRing({ progress, level }) {
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, progress)) / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--domain-gold))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-[7px] flex items-center justify-center rounded-full border border-domain-gold/15 bg-domain-gold/10">
        <span className="font-display text-sm font-bold text-foreground">{level}</span>
      </div>
    </div>
  );
}

function SidebarGamificationBar() {
  const { data } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => praxisApi.gamification.get(),
    staleTime: 30_000,
  });

  if (!data) return null;

  const { level, level_name, xp_total, next_level_xp, progress_pct } = data;
  const xpToNext = next_level_xp ? Math.max(0, next_level_xp - xp_total) : 0;

  return (
    <div className="border-t border-sidebar-border/70 px-4 pb-4 pt-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.025] px-3 py-3">
        <AvatarRing progress={progress_pct} level={level} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-foreground/90">{level_name}</p>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            {xp_total.toLocaleString('pt-BR')} XP
          </p>
          {next_level_xp ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground/65">
              {xpToNext.toLocaleString('pt-BR')} para o próximo nível
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isNavActive(location, item) {
  if (item.end) return location.pathname === '/';
  if (item.path === '/habitos-tarefas') return location.pathname === '/habitos-tarefas';
  if (item.path === '/captura') return location.pathname === '/captura';
  if (item.path === '/capturas') return location.pathname === '/capturas';
  return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
}

function NavLinkRow({ item, isActive, onClose, density = 'primary' }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClose}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-11 items-center gap-3.5 rounded-xl border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200',
        density === 'primary' ? 'px-3.5 py-2.5 text-[15px]' : 'px-3.5 py-2.5 text-[14px]',
        isActive
          ? 'border-domain-gold/20 bg-domain-gold/[0.10] text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.035)]'
          : 'border-transparent text-sidebar-foreground/58 hover:border-white/[0.045] hover:bg-white/[0.035] hover:text-sidebar-foreground',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
          isActive ? 'bg-domain-gold/12 text-domain-gold' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground/85',
        )}
      >
        <Icon className="h-[17px] w-[17px]" aria-hidden />
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
      {isActive ? (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-domain-gold shadow-[0_0_12px_hsl(var(--domain-gold)/0.55)]" aria-hidden />
      ) : null}
    </Link>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    onClose?.();
    await logout();
    window.location.href = '/';
  };

  const { data: gamificationNav } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => praxisApi.gamification.get(),
    staleTime: 120_000,
  });

  const unlockedAchievementCount = (gamificationNav?.achievements || []).filter((a) => a.unlocked).length;

  const secondary = filterSecondaryNav(secondaryNavItems, {
    unlockedAchievementCount,
  });

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Fechar menu"
        />
      ) : null}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-sidebar-border/80 bg-sidebar transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-24 shrink-0 items-center justify-between border-b border-sidebar-border/70 px-5">
          <PraxisBrand
            tagline="Menos plano. Mais prática."
            taglineClassName="text-sidebar-foreground/35 tracking-[0.13em]"
            nameClassName="text-sidebar-foreground"
          />
          <button
            type="button"
            onClick={onClose}
            className="praxis-touch-target flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <nav className="praxis-sidebar-scroll h-full overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-1">
              {primaryNavItems.map((item) => (
                <NavLinkRow
                  key={item.path}
                  item={item}
                  isActive={isNavActive(location, item)}
                  onClose={onClose}
                  density="primary"
                />
              ))}
            </div>

            {secondary.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 px-2">
                  <p className="text-[11px] font-medium text-sidebar-foreground/32">Ferramentas</p>
                </div>
                <div className="space-y-0.5">
                  {secondary.map((item) => (
                    <NavLinkRow
                      key={item.path}
                      item={item}
                      isActive={isNavActive(location, item)}
                      onClose={onClose}
                      density="secondary"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </nav>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-sidebar-background to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-sidebar-background to-transparent" aria-hidden />
        </div>

        <SidebarGamificationBar />

        <div className="border-t border-sidebar-border/70 px-4 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/55 transition-colors hover:bg-white/[0.035] hover:text-sidebar-foreground"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/55 group-hover:text-sidebar-foreground/85">
              <LogOut className="h-[17px] w-[17px]" aria-hidden />
            </span>
            <span className="truncate">Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}
