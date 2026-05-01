'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACADEMY_CONFIG } from '@/config/ACADEMY_CONFIG';

/
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

    <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mt-32 px-4">
      {ACADEMY_CONFIG.taxonomy.map((cat, idx) => (
        <motion.div key={cat.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className={`bento-card p-10 min-h-[350px] flex flex-col justify-end group cursor-pointer ${idx === 0 ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4'}`} >
          <div className="text-[10px] text-[#00FF41]
