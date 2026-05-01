'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACADEMY_CONFIG } from '../config/ACADEMY_CONFIG';

export default function Page() {
  const [view, setView] = useState<'landing' | 'portal' | 'admin'>('landing');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('access') === ACADEMY_CONFIG.security.secretAdminParam) {
      setView('admin');
    }
  }, []);

  if (!mounted) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <main className="bg-[#121415] min-h-screen selection:bg-[#00FF41]/30 text-white overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="dot-grid min-h-screen flex flex-col items-center justify-center p-8"
          >
            <header className="fixed top-0 w-full flex justify-between items-center px-10 h-20 z-50">
              <div className="text-2xl font-black neon-text uppercase tracking-tighter">
                {ACADEMY_CONFIG.brand.name}
              </div>
              <button 
                onClick={() => setView('portal')} 
                className="px-6 py-2 neon-border text-[10px] font-bold uppercase hover:bg-[#00FF41] hover:text-black transition-all"
              >
                {ACADEMY_CONFIG.i18n.translations.es.portalLogin}
              </button>
            </header>

            <div className="text-center space-y-6 max-w-5xl z-10">
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase">
                {ACADEMY_CONFIG.i18n.translations.es.heroTitle}
              </h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto uppercase tracking-wide font-light">
                {ACADEMY_CONFIG.i18n.translations.es.heroSub}
              </p>
              <div className="pt-12">
                <button className="px-12 py-5 bg-[#00FF41] text-black font-black tracking-tighter text-xl hover:scale-105 transition-all">
                  {ACADEMY_CONFIG.i18n.translations.es.explore}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mt-32 px-4 pb-20">
              {ACADEMY_CONFIG.taxonomy.map((cat, idx) => (
                <div 
                  key={cat.id} 
                  className={`bento-card p-10 min-h-[300px] flex flex-col justify-end group cursor-pointer ${
                    idx === 0 ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4'
                  }`}
                >
                  <div className="text-[10px] text-[#00FF41] mb-2 font-mono tracking-[0.3em] opacity-50 uppercase">
                    SECURE_PROTOCOL_0{idx + 1}
                  </div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter group-hover:neon-text transition-colors">
                    {cat.name}
                  </h3>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// TRIGGER: FINAL_STITCH_BUILD_V1_PRO
