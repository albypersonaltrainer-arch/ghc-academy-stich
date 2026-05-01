'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACADEMY_CONFIG } from '../config/ACADEMY_CONFIG';

export default function Page() {
  const [view, setView] = useState<'landing' | 'portal' | 'admin'>('landing');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar acceso secreto
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === ACADEMY_CONFIG.security.secretAdminParam) {
      setView('admin');
    }
  }, []);

  // Evita errores de renderizado en el servidor
  if (!mounted) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <main className="bg-[#121415] min-h-screen text-white overflow-hidden selection:bg-[#00FF41]/30">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="dot-grid min-h-screen flex flex-col items-center justify-center p-6"
          >
            <header className="fixed top-0 w-full flex justify-between items-center px-10 h-24 z-50">
              <div className="text-2xl font-black neon-text tracking-tighter uppercase">
                {ACADEMY_CONFIG.brand.name}
              </div>
              <button 
                onClick={() => setView('portal')} 
                className="px-6 py-2 neon-border text-[10px] font-bold uppercase hover:bg-[#00FF41] hover:text-black transition-all"
              >
                {ACADEMY_CONFIG.i18n.translations.es.portalLogin}
              </button>
            </header>
            
            <div className="text-center max-w-4xl space-y-8 z-10">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase">
                {ACADEMY_CONFIG.i18n.translations.es.heroTitle}
              </h1>
              <p className="text-zinc-500 text-lg md:text-xl uppercase tracking-[0.2em] font-light max-w-2xl mx-auto">
                {ACADEMY_CONFIG.i18n.translations.es.heroSub}
              </p>
              <button className="px-12 py-5 bg-[#00FF41] text-black font-black text-xl hover:scale-105 transition-transform uppercase tracking-tighter">
                {ACADEMY_CONFIG.i18n.translations.es.explore}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mt-24 px-4">
              {ACADEMY_CONFIG.taxonomy.map((cat) => (
                <div key={cat.id} className="bento-card p-10 text-left group cursor-pointer relative overflow-hidden">
                  <div className="text-[#00FF41] text-[9px] font-mono mb-2 tracking-[.4em] opacity-60">SECURE_PROTOCOL // 01</div>
                  <h3 className="text-3xl font-black uppercase group-hover:neon-text transition-colors tracking-tighter">
                    {cat.name}
                  </h3>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'portal' && (
          <motion.div 
            key="portal" 
            initial={{ x: 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            className="min-h-screen p-12 bg-[#121415]"
          >
            <h1 className="text-5xl font-black uppercase neon-text tracking-tighter">Mi Progreso</h1>
            <button 
              onClick={() => setView('landing')} 
              className="mt-10 px-4 py-2 border border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-widest hover:border-zinc-600 transition-colors"
            >
              ← Volver al Inicio
            </button>
          </motion.div>
        )}

        {view === 'admin' && (
          <motion.div 
            key="admin" 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="min-h-screen p-20 font-mono bg-black"
          >
            <div className="border border-[#00FF41] p-12 relative">
              <div className="absolute top-0 right-0 p-2 bg-[#00FF41] text-black text-[9px] font-bold uppercase">Root Access</div>
              <h1 className="text-4xl font-black neon-text uppercase tracking-tighter">Control_Center_v2</h1>
              <p className="text-zinc-600 mt-6 text-sm tracking-widest uppercase">>>> Sistema GHC Academy inicializado con éxito.</p>
              <div className="mt-12 h-64 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-700 italic text-xs">
                Panel de Administración listo para configuración de módulos.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
