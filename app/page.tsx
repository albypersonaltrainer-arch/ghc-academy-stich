'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACADEMY_CONFIG } from '../config/ACADEMY_CONFIG';

export default function Page() {
  const [view, setView] = useState<'landing' | 'portal' | 'admin'>('landing');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lógica de acceso seguro al Admin Panel vía URL
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('access') === ACADEMY_CONFIG.security.secretAdminParam) {
        setView('admin');
      }
    }
  }, []);

  if (!mounted) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <main className="bg-[#121415] min-h-screen selection:bg-[#00FF41]/30 text-white overflow-x-hidden font-sans">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="dot-grid min-h-screen flex flex-col items-center p-8"
          >
            {/* Header Industrial de Alta Gama */}
            <header className="fixed top-0 w-full flex justify-between items-center px-6 md:px-10 h-24 z-50 bg-[#121415]/80 backdrop-blur-xl border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                <div className="text-2xl font-black neon-text uppercase tracking-tighter italic">
                  {ACADEMY_CONFIG.brand.name}
                </div>
              </div>
              <button 
                onClick={() => setView('portal')} 
                className="px-8 py-3 neon-border text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#00FF41] hover:text-black transition-all duration-500 ease-in-out"
              >
                {ACADEMY_CONFIG.i18n.translations.es.portalLogin}
              </button>
            </header>

            {/* Hero Section - Stitch Version 2024 */}
            <section className="text-center space-y-8 max-w-6xl z-10 pt-52 pb-20">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-1 border border-[#00FF41]/30 rounded-full text-[10px] font-mono text-[#00FF41] tracking-[0.4em] uppercase mb-4"
              >
                System Status: Operational // Premium Access Mode
              </motion.div>
              
              <h1 className="text-6xl md:text-[120px] font-black tracking-tighter leading-[0.8] uppercase italic">
                {ACADEMY_CONFIG.i18n.translations.es.heroTitle}
              </h1>
              
              <p className="text-zinc-500 text-xl max-w-3xl mx-auto uppercase tracking-widest font-light leading-relaxed pt-4">
                {ACADEMY_CONFIG.i18n.translations.es.heroSub}
              </p>

              <div className="pt-16">
                <button className="group relative px-16 py-6 bg-[#00FF41] text-black font-black tracking-tighter text-2xl hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(0,255,65,0.3)] hover:shadow-[0_0_70px_rgba(0,255,65,0.5)]">
                  <span className="relative z-10">{ACADEMY_CONFIG.i18n.translations.es.explore}</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
              </div>
            </section>

            {/* Grid de Categorías Bento-Style Industrial */}
            <div className="grid grid-cols-12 gap-8 w-full max-w-7xl mt-20 px-4 pb-40">
              {ACADEMY_CONFIG.taxonomy.map((cat, idx) => (
                <motion.div 
                  key={cat.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bento-card p-12 min-h-[400px] flex flex-col justify-end group cursor-pointer overflow-hidden relative border border-white/5 hover:border-[#00FF41]/40 transition-all duration-500 ${
                    idx === 0 ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4'
                  }`}
                >
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 p-8 text-[120px] font-black opacity-[0.02] group-hover:opacity-[0.05] transition-opacity leading-none">
                    0{idx + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="w-12 h-[1px] bg-[#00FF41] mb-6 group-hover:w-24 transition-all duration-500" />
                    <div className="text-[11px] text-[#00FF41] mb-4 font-mono tracking-[0.3em] opacity-40 uppercase">
                      Module_Core_0{idx + 1}
                    </div>
                    <h3 className="text-5xl font-black uppercase tracking-tighter group-hover:neon-text transition-colors duration-300">
                      {cat.name}
                    </h3>
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-zinc-600 group-hover:text-[#00FF41] transition-colors uppercase tracking-[0.2em]">
                      Acceder al Programa <span>→</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// DEPLOY_AUTH: STITCH_FINAL_INDUSTRIAL_V2
