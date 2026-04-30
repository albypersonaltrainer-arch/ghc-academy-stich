'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ACADEMY_CONFIG } from '../config/ACADEMY_CONFIG';

/**
 * GHC ACADEMY - STITCH 2.0
 * SPA CEREBRO: Gestión de Estados, Seguridad Invisible e i18n.
 */

// --- SUB-COMPONENTES DE VISTA ---
const LandingView = ({ onNavigate }: { onNavigate: (view: 'landing' | 'portal' | 'admin') => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="min-h-screen dot-grid flex flex-col items-center justify-center p-8" >
    <header className="fixed top-0 w-full flex justify-between items-center px-12 h-20 z-50">
      <div className="text-2xl font-black tracking-tighter neon-text">
        {ACADEMY_CONFIG.brand.name}
      </div>
      <button onClick={() => onNavigate('portal')} className="px-6 py-2 neon-border text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#00FF41] hover:text-black transition-all duration-300" >
        {ACADEMY_CONFIG.i18n.translations.es.portalLogin}
      </button>
    </header>

    <div className="text-center space-y-6 max-w-5xl z-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-[10px] tracking-[0.5em] text-zinc-500 uppercase mb-4" >
        Precision Protocols // {ACADEMY_CONFIG.brand.slogan}
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase" >
        {ACADEMY_CONFIG.i18n.translations.es.heroTitle.split(' ').map((word, i) => (
          <span key={i} className={word === 'CIENCIA' || word === 'SCIENCE' ? 'neon-text block md:inline' : ''}>
            {word}{' '}
          </span>
        ))}
      </motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-zinc-400 text-lg max-w-2xl mx-auto uppercase tracking-wide font-light" >
        {ACADEMY_CONFIG.i18n.translations.es.heroSub}
      </motion.p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="pt-12" >
        <button className="px-12 py-5 bg-[#00FF41] text-black font-black tracking-tighter text-xl hover:scale-105 active:scale-95 transition-all duration-200">
          {ACADEMY_CONFIG.i18n.translations.es.explore}
        </button>
      </motion.div>
    </div>

    {/* Bento Grid dinámico basado en ACADEMY_CONFIG */}
    <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mt-32 px-4">
      {ACADEMY_CONFIG.taxonomy.map((cat, idx) => (
        <motion.div key={cat.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className={`bento-card p-10 min-h-[350px] flex flex-col justify-end group cursor-pointer ${idx === 0 ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4'}`} >
          <div className="text-[10px] text-[#00FF41] mb-3 font-mono tracking-[0.3em] opacity-50 group-hover:opacity-100 transition-opacity">
            PROTOCOL_0{idx + 1} // SECURE_ACCESS
          </div>
          <h3 className="text-4xl font-black uppercase tracking-tighter leading-none group-hover:neon-text transition-colors">
            {cat.name}
          </h3>
          <div className="h-0 group-hover:h-8 overflow-hidden transition-all duration-300 text-zinc-500 text-xs mt-2 uppercase tracking-widest">
            Explorar {cat.subgroups.length} Sub-Protocolos →
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const StudentDashboardView = () => (
  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="min-h-screen bg-[#121415] text-white p-8 md:p-16" >
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-800 pb-10 mb-16">
      <div>
        <div className="text-[#00FF41] text-xs font-mono mb-3 tracking-[0.4em] uppercase">Student_Session // Active_Node</div>
        <h1 className="text-6xl font-black uppercase tracking-tighter">Mi Progreso</h1>
      </div>
      <div className="mt-6 md:mt-0 text-left md:text-right">
        <div className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mb-1">Authorization_Level</div>
        <div className="text-3xl font-bold neon-text font-mono">OPERATOR_L4</div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {ACADEMY_CONFIG.taxonomy[1].subgroups[0].courses.map((course, idx) => (
        <div key={course.id} className="bento-card p-8 border-l-2 border-[#00FF41] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl font-black">{idx + 1}</div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[9px] bg-zinc-800 px-3 py-1 rounded text-[#00FF41] font-mono tracking-widest">{course.type}</span>
            <span className="text-zinc-500 font-mono text-[10px]">{course.pages ? `${course.pages} PGS` : course.duration}</span>
          </div>
          <h4 className="text-2xl font-bold mb-6 tracking-tight uppercase leading-tight">{course.title}</h4>
          <button className="w-full py-4 bg-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00FF41] hover:text-black transition-all duration-300">
            INICIAR PROTOCOLO
          </button>
        </div>
      ))}
    </div>
  </motion.div>
);

const AdminPanelView = () => (
  <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="min-h-screen bg-black text-white p-8 md:p-16 font-mono" >
    <div className="border border-[#00FF41] p-10 shadow-[0_0_60px_rgba(0,255,65,0.05)] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 bg-[#00FF41] text-black text-[9px] font-bold tracking-widest">
        SECURE_CORE_v2.0
      </div>
      <div className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-3xl font-black neon-text uppercase tracking-tighter">System_Control_Center</h1>
          <p className="text-zinc-600 text-[10px] mt-1 tracking-widest uppercase">GHC ACADEMY // ROOT_LEVEL_ACCESS</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 border border-zinc-800 text-xs animate-pulse text-[#00FF41]">SYSLOG: OK</div>
          <div className="px-4 py-2 bg-[#00FF41] text-black text-xs font-bold uppercase">LIVE_FEED</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Total Alumnos', val: '1,284', grow: '+12%' },
          { label: 'Revenue (MTD)', val: '$52,140', grow: '+24%' },
          { label: 'Active Nodes', val: '42', grow: 'STABLE' },
          { label: 'Security Status', val: 'SHIELD_ON', grow: 'DECRYPT' }
        ].map((stat, i) => (
          <div key={i} className="border border-zinc-900 p-6 bg-zinc-900/20">
            <div className="text-zinc-500 text-[9px] uppercase mb-2 tracking-widest">{stat.label}</div>
            <div className="text-3xl font-bold tracking-tighter">{stat.val}</div>
            <div className="text-[9px] text-[#00FF41] mt-2 font-mono">{stat.grow}</div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900/30 p-8 border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Editor No-Code: Protocol_Builder</h2>
          <button className="text-[10px] text-[#00FF41] border border-[#00FF41]/30 px-3 py-1 hover:bg-[#00FF41] hover:text-black transition-colors">
            SAVE_DRAFT
          </button>
        </div>
        <div className="h-80 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 group hover:border-[#00FF41]/50 transition-colors cursor-crosshair">
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">➕</span>
          <span className="text-[10px] italic uppercase tracking-widest">Arrastra bloques para construir el protocolo...</span>
        </div>
      </div>
    </div>
  </motion.div>
);

// --- COMPONENTE PRINCIPAL (CEREBRO) ---
export default function Page() {
  const [view, setView] = useState<'landing' | 'portal' | 'admin'>('landing');
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Captura segura de parámetros de URL
    const searchParams = new URLSearchParams(window.location.search);
    setParams(searchParams);
    
    // LÓGICA DE SEGURIDAD INVISIBLE
    const accessKey = searchParams.get('access');
    if (accessKey === ACADEMY_CONFIG.security.secretAdminParam) {
      setView('admin');
      console.warn("⚠️ SECURE ACCESS GRANTED: Root Admin Initialized");
    }
  }, []);

  return (
    <main className="bg-[#121415] min-h-screen selection:bg-[#00FF41]/30 selection:text-white overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <LandingView key="landing" onNavigate={setView} />
        )}
        {view === 'portal' && (
          <StudentDashboardView key="portal" />
        )}
        {view === 'admin' && (
          <AdminPanelView key="admin" />
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root {
          --brand-color: #00FF41;
          --brand-color-rgb: 0, 255, 65;
        }
      `}</style>
    </main>
  );
}
