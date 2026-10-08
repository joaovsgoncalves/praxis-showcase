import React, { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import MobileTopBar from './MobileTopBar';
import ParticleBackground from '@/components/shared/ParticleBackground';
import PraxisLevelUpListener from '@/components/gamification/PraxisLevelUpListener';
import OfflineBanner from '@/components/shared/OfflineBanner';

const WorkoutSessionModeContext = createContext(null);
const WorkoutSessionActiveContext = createContext(false);

export function useWorkoutSessionMode(active) {
  const setWorkoutSessionMode = useContext(WorkoutSessionModeContext);

  useEffect(() => {
    if (!setWorkoutSessionMode) return undefined;
    setWorkoutSessionMode(Boolean(active));
    return () => setWorkoutSessionMode(false);
  }, [active, setWorkoutSessionMode]);
}

export function useWorkoutSessionActive() {
  return useContext(WorkoutSessionActiveContext);
}

function isJotaFitPath(pathname) {
  return pathname === '/jota-fit' || pathname.startsWith('/jota-fit/');
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workoutSessionMode, setWorkoutSessionMode] = useState(false);
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const jotaFitMode = isJotaFitPath(location.pathname);
  const hidePraxisChrome = workoutSessionMode || jotaFitMode;

  useEffect(() => {
    document.title = jotaFitMode ? 'Jota Fit' : 'Praxis';
  }, [location.pathname, jotaFitMode]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <WorkoutSessionModeContext.Provider value={setWorkoutSessionMode}>
      <WorkoutSessionActiveContext.Provider value={workoutSessionMode}>
        <div className="praxis-app min-h-screen bg-background relative">
          <PraxisLevelUpListener />
          {!hidePraxisChrome ? <ParticleBackground /> : null}
          {!hidePraxisChrome ? <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}

          <div className={hidePraxisChrome ? 'relative z-10' : 'lg:pl-72 relative z-10'}>
            {!isLogin && !hidePraxisChrome ? <MobileTopBar onOpenMenu={() => setSidebarOpen(true)} /> : null}
            <main
              className={
                isLogin
                  ? 'p-4 max-w-[1480px] mx-auto'
                  : workoutSessionMode
                    ? 'mx-auto max-w-xl px-3 py-3 sm:px-4 sm:py-5'
                    : jotaFitMode
                      ? 'min-h-screen p-0'
                      : 'mx-auto max-w-[1480px] p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-5 md:pb-10 lg:p-6 lg:pb-10'
              }
            >
              {!isLogin && !workoutSessionMode ? <OfflineBanner /> : null}
              <Outlet />
            </main>
          </div>

          {!isLogin && !hidePraxisChrome ? <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} /> : null}
        </div>
      </WorkoutSessionActiveContext.Provider>
    </WorkoutSessionModeContext.Provider>
  );
}
