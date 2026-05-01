'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, 
  Activity, 
  ShieldCheck, 
  Headset, 
  ChevronRight, 
  FlaskConical, 
  Zap, 
  Dna 
} from 'lucide-react';
import { ACADEMY_CONFIG } from '../config/ACADEMY_CONFIG';

/
 * GHC ACADEMY - CORE SYSTEM v2.0
 * ARCHIVO: app/page.tsx
 * Función: Punto de entrada único (SPA Architecture)
 */

// --- DATA: PROGRAMAS DE FORMACIÓN ---
const COURSES = [
  { 
    id: 'bio_01', 
    title: 'BIOMECÁNICA DE ÉLITE', 
    description: 'Optimización de palancas y vectores de fuerza para atletas de alto rendimiento.', 
    price: '199€', 
    level: 'AVANZADO', 
    duration: '12h', 
    icon: <Activity className="w-6 h-6" /> 
  },
  { 
    id: 'pharm_01', 
    title: 'FARMACOLOGÍA APLICADA', 
    description: 'Protocolos seguros y basados en evidencia para el rendimiento ergogénico.', 
    price: '299€', 
    level: 'EXPERTO', 
    duration: '20h', 
    icon: <FlaskConical className="w-6 h-6" /> 
  },
  { 
    id: 'hyper_01', 
    title: 'HIPERTROFIA MECANICISTA', 
    description: 'Máximo reclutamiento de unidades motoras a través de la ciencia del entrenamiento.', 
    price: '150€', 
    level: 'INTERMEDIO', 
    duration: '10h', 
    icon: <Zap className="w-6 h-6" /> 
  },
  { 
    id: 'health_01', 
    title: 'SALUD METABÓLICA', 
    description: 'Gestión profunda de biomarcadores para la salud y longevidad extrema.', 
    price: '199€', 
    level: 'AVANZADO', 
    duration: '15h', 
    icon: <Dna className="w-6 h-6" /> 
  }
];

// --- COMPONENTE: VISTA TIENDA (LANDING) ---
const LandingView = () => (
  <div className="min-h-screen bg-[#121415] text-white dot-grid">
    {/* Header Industrial */}
    <header className="fixed top-0 w-full flex justify-between items-center px-8 md:px-16 h-24 z-50 backdrop-blur-xl border-b border-white/5">
      <div className="text-2xl font-black tracking-tighter neon-text uppercase italic">
        {ACADEMY_CONFIG.brand.name}
      </div>
      <nav className="hidden md:flex gap-10 text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">
        <a href="#protocolos" className="hover:text-[#00FF41] transition-colors">Protocolos</a>
        <a href="#investigacion" className="hover:text-[#00FF41] transition-colors">Investigación</a>
        <a href="#ghc" className="hover:text-[#00FF41] transition-colors">Sobre GHC</a>
      </nav>
      <button className="px-8 py-3 neon-border text-[10px] font-black uppercase tracking-widest hover:bg-[#00FF41] hover:text-black transition-all duration-300">
        ACCESO PORTAL
      </button>
    </header>

    {/* Hero Section */}
    <section className="pt-52 pb-32 px-8 flex flex-col items-center text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-[10px] tracking-[0.7em] text-[#00FF41] uppercase mb-8 font-mono"
      >
        // BIOLOGICAL INTEGRATION SYSTEMS //
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-6xl md:text-[130px] font-black tracking-tighter leading-[0.8] mb-12 uppercase italic"
      >
        SPORT THROUGH <br /> <span className="neon-text">SCIENCE</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl text-zinc-500 text-lg uppercase tracking-[0.2em] mb-16 font-light italic"
      >
        Protocolos avanzados de optimización humana basados en datos puros y precisión clínica.
      </motion.p>
      <motion.button 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="group flex items-center gap-4 bg-[#00FF41] text-black px-12 py-6 font-black uppercase tracking-tighter text-2xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,255,65,0.2)]"
      >
        EXPLORAR CATÁLOGO <ChevronRight className="group-hover:translate-x-2 transition-transform" />
      </motion.button>
    </section>

    {/* Dynamic Benefits */}
    <div className="w-full bg-[#1A1D1E] py-10 border-y border-white/5 flex flex-wrap justify-center gap-16 md:gap-32">
      <div className="flex items-center gap-4 text-zinc-400 group">
        <FlaskConical className="w-6 h-6 text-[#00FF41] group-hover:animate-pulse" />
        <span className="text-[11px] font-bold tracking-[0.3em] uppercase">Ciencia Validada</span>
      </div>
      <div className="flex items-center gap-4 text-zinc-400 group">
        <ShieldCheck className="w-6 h-6 text-[#00FF41]" />
        <span classNam
