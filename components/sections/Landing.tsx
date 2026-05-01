'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Beaker, 
  ShieldAlert, 
  Wifi, 
  Activity, 
  Terminal, 
  ChevronRight, 
  BarChart3, 
  Microscope, 
  Dna 
} from 'lucide-react';

/
 * GHC ACADEMY - TACTICAL LABORATORY CONSOLE
 * Landing.tsx // Production Ready
 */

const ACADEMY_DATA = {
  version: "V3.2.4",
  latency: "12MS",
  status: "ACTIVE",
  protocols: [
    { 
      id: "01", 
      code: "CORE", 
      title: "BIOMECÁNICA DE ÉLITE", 
      description: "Advanced kinetic analysis protocol. Calibration of muscular output and joint stability under extreme load parameters.", 
      price: "199€", 
      accent: "#00FF41", 
      image: "https://images.unsplash.com/photo-1541252260730-0309964d7529?q=80&w=1287&auto=format&fit=crop" 
    },
    { id: "02", code: "TECH", title: "TECNIFICACIÓN", stats: [40, 65, 30, 80, 50, 95] },
    { id: "03", code: "CHEM", title: "NUTRICIÓN / FARMACOLOGÍA", icon: <Beaker className="w-5 h-5" /> },
    { id: "04", code: "METABOLIC", title: "SALUD METABÓLICA", icon: <Dna className="w-5 h-5" /> }
  ]
};

const Landing = () => {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  return (
    <div className="min-h-screen bg-[#121415] text-white font-sans overflow-hidden selection:bg-[#00FF41]/30 flex">
      
      {/* SIDEBAR: LEFT CONSOLE NAVIGATION */}
      <aside className="w-64 border-r border-white/5 flex flex-col pt-20 z-40 bg-[#121415]/80 backdrop-blur-xl">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-2 text-[#00FF41] mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">System_Active</span>
          </div>
          <h1 className="text-xl font-black tracking-tighter leading-none italic">GHC ACADEMY</h1>
          <p className="text-[9px] text-zinc-600 mt-1 tracking-widest uppercase">LAB_SYS_V2.4</p>
        </div>

        <nav className="flex flex-col gap-1">
          {['DASHBOARD', 'SHOP', 'LAB', 'ADMIN'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex items-center gap-4 px-8 py-4 text-[10px] font-bold tracking-[0.2em] transition-all duration-200 border-l-2 ${
                activeTab === tab 
                ? 'bg-[#1A1D1E] text-[#00FF41] border-[#00FF41]' 
                : 'text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300'
              }`}
            >
              {tab === 'DASHBOARD' && <LayoutDashboard className="w-4 h-4" />}
              {tab === 'SHOP' && <ShoppingCart className="w-4 h-4" />}
              {tab === 'LAB' && <Microscope className="w-4 h-4" />}
              {tab === 'ADMIN' && <ShieldAlert className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-8 border-t border-white/5">
          <button className="w-full bg-[#00FF41] text-black py-4 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,65,0.2)]">
            NEW_PROTOCOL →
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative flex flex-col h-screen overflow-y-auto bg-[#121415]">
        
        {/* TELEMETRY HEADER */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-[#121415]/90 backdrop-blur-md z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" /> [SYSTEM_{ACADEMY_DATA.version}]
            </div>
          </div>
          <div className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase italic">
            TACTICAL_CONTROL_UNIT
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              <Wifi className="w-3 h-3" /> LATENCY_{ACADEMY_DATA.latency}
            </div>
            <div className="px-3 py-1 bg-[#1A1D1E] text-[#00FF41] text-[9px] font-bold tracking-widest uppercase border border-[#00FF41]/20">
              STATUS: {ACADEMY_DATA.status}
            </div>
          </div>
        </header>

        {/* VIEW RENDERER */}
        <AnimatePresence mode="wait">
          <motion.section 
            key={activeTab} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="p-12 max-w-7xl w-full"
          >
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-12">
                <div className="flex flex-col">
                  <span className="text-[#00FF41] text-[10px] font-mono mb-2 tracking-[0.4em] uppercase opacity-60">
                    [TACTICAL_OVERVIEW_MODULE]
                  </span>
                  <h2 className="text-7xl font-black uppercase tracking-tighter leading-none italic">
                    TACTICAL OVERVIEW
                  </h2>
                </div>

                {/* BENTO GRID: LABORATORY LAYOUT */}
                <div className="grid grid-cols-12 gap-4">
                  {/* BOX [01]: CORE PROTOCOL (LARGE LEFT) */
                  <div className="col-span-8 group relative aspect-[16/10] bg-[#1A1D1E] border border-white/5 overflow-hidden">
