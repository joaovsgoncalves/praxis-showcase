import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

/** FAB de voz — só em telas grandes; no celular use a barra inferior. */
export default function VoiceCaptureButton() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const hideOnRoute =
    location.pathname === '/captura' ||
    location.pathname === '/capturas' ||
    location.pathname === '/login';

  if (hideOnRoute) return null;

  return (
    <Link to="/captura" className="hidden lg:block">
      <motion.div
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className="fixed bottom-8 right-8 z-50"
        style={{ bottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="relative">
          {!reduceMotion && (
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30 motion-reduce:hidden" />
          )}
          <div className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25">
            <Mic className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
