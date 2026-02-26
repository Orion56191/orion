import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme } from '../types';

interface AtmosphereProps {
  theme: Theme;
}

export const Atmosphere: React.FC<AtmosphereProps> = ({ theme }) => {
  
  // Snow Particles
  const snowParticles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 5,
      size: 2 + Math.random() * 4
    }));
  }, []);

  // Rain Particles
  const rainParticles = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 0.8 + Math.random() * 0.5,
    }));
  }, []);

  // Dust/Sun Particles
  const sunParticles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      size: 10 + Math.random() * 40
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence mode="wait">
        
        {/* Winter Atmosphere */}
        {theme === Theme.WINTER && (
          <motion.div
            key="winter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800"
          >
            {snowParticles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full bg-white opacity-60 shadow-[0_0_5px_rgba(255,255,255,0.8)] animate-fall"
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `-${p.delay}s`,
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Monsoon Atmosphere */}
        {theme === Theme.MONSOON && (
          <motion.div
            key="monsoon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-600"
          >
            {/* Darker overlay for mood */}
            <div className="absolute inset-0 bg-black/20" />
            
            {rainParticles.map((p) => (
              <div
                key={p.id}
                className="absolute w-[1px] h-6 bg-blue-200 opacity-40 animate-rain origin-top"
                style={{
                  left: p.left,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `-${p.delay}s`,
                  transform: 'rotate(15deg)', // Slanted rain
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Daybreak Atmosphere */}
        {theme === Theme.DAYBREAK && (
          <motion.div
            key="daybreak"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-[#FFF8E7]" // Warm cream
          >
            {/* God Rays Effect (Simulated with gradients) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/40 to-transparent blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            {sunParticles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full bg-amber-300 blur-xl opacity-20 animate-rise"
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `-${p.delay}s`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};