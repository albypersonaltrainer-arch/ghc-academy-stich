'use client';
import React, { useState, useEffect } from 'react';
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
 * Arquitectura Profesional - Diseño Stitch Original
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
    { id: "03", code: "CHEM", title: "NUTRICIÓN / FARMACOLOGÍA", icon: <Beaker size={20} /> },
    { id: "04", code: "METABOLIC", title: "SALUD METABÓLICA", icon: <Dna size={20} /> }
  ]
};

export default function Landing() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#121415] text-white font-sans overflow-hidden flex">
      {/* SIDEBAR: NAV IZQUIERDA */}
      <aside className="w-64 border-r border-white/5 flex flex-col pt-20 z-40 bg-[#121415]/80 backdrop-blur-xl">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-2 text-[#00FF41] mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">System_Active</span>
          </div>
          <h1 className="text-xl font-black tracking-tighter leading-none italic uppercase">GHC ACADEMY</h1>
        </div>

        <nav className="flex flex-col gap-1">
          {['DASHBOARD', 'SHOP', 'LAB', 'ADMIN'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-4 px-8 py-4 text-[10px] font-bold tracking-[0.2em] transition-all duration-200 border-l-2 ${
                activeTab === tab 
                ? 'bg-[#1A1D1E] text-[#00FF41] border-[#00FF41]' 
                : 'text-zinc-500 border-transparent hover:bg-white/5'
              }`}
            >
              {tab === 'DASHBOARD' && <LayoutDashboard size={14} />}
              {tab === 'SHOP' && <ShoppingCart size={14} />}
              {tab === 'LAB' && <Microscope size={14} />}
              {tab === 'ADMIN' && <ShieldAlert size={14} />}
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      {/* ÁREA CENTRAL */
      <main className="flex-1 relative flex flex-col h-screen overflow-y-auto bg-[#121415]">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-[#121415]/90 backdrop-blur-md z-50">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">[SYSTEM_{ACADEMY_DATA.version}]</div>
          <div className="text-[10px] font-black text-zinc-500 uppercase italic">TACTICAL_CONTROL</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500">
              <Wifi size={14} /> {ACADEMY_DATA.latency}
            </div>
            <div className="px-3 py-1 bg-[#1A1D1E] text-[#00FF41] text-[9px] font-bold border border-[#00FF41]/20 uppercase">
              STATUS_OK
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-12 max-w-7xl"
          >
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-12">
                <div className="flex flex-col">
                  <span className="text-[#00FF41] text-[10px] font-mono mb-2 tracking-[0.5em] uppercase opacity-60">[OVERVIEW_MODULE]</span>
                  <h2 className="text-7xl font-black uppercase tracking-tighter italic">TACTICAL VIEW</h2>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 group relative aspect-[16/10] bg-[#1A1D1E] border border-white/5 overflow-hidden">
                    <img src={ACADEMY_DATA.protocols[0].image} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Protocol" />
                    <div className="absolute inset-0 p-12 flex flex-col justify-end bg-gradient-to-t from-[#121415]">
                      <h3 className="text-5xl font-black uppercase italic mb-4">{ACADEMY_DATA.protocols[0].title}</h3>
                      <p className="text-zinc-500 text-sm max-w-md mb-10 leading-relaxed uppercase tracking-widest italic font-bold">
                        {ACADEMY_DATA.protocols[0].description}
                      </p>
                      <div className="flex items-center gap-10">
                        <button className="bg-[#00FF41] text-black px-10 py-5 text-xs font-black uppercase tracking-widest shadow-[0_0_20px_#00FF41]">ENROLL_NOW</button>
                        <span className="text-4xl font-black text-[#00FF41] italic">{ACADEMY_DATA.protocols[0].price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 flex flex-col gap-4">
                    <div className="flex-1 bg-[#1A1D1E] border border-white/5 p-8 flex flex-col justify-between">
                      <BarChart3 className="text-[#00FF41]" size={20} />
                      <h4 className="text-2xl font-black italic">TECNIFICACIÓN</h4>
                      <div className="flex items-end gap-2 h-28 mt-8">
                        {ACADEMY_DATA.protocols[1].stats.map((val, i) => (
                          <div key={i} className="flex-1 bg-[#00FF41]/40" style={{ height: `${val}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'DASHBOARD' && (
              <div className="flex flex-col items-center justify-center h-[50vh] opacity-20">
                <Terminal className="w-16 h-16 text-[#00FF41] mb-8" />
                <p className="text-[10px] font-mono tracking-widest uppercase italic font-bold">ACCESS_PENDING_ENCRYPTED_DATABASE</p>
