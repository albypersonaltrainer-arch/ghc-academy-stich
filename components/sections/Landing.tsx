'use client';
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACADEMY_DATA = {
  version: "V3.2.4",
  protocols: [
    { 
      id: "01", 
      title: "BIOMECÁNICA DE ÉLITE", 
      description: "Advanced kinetic analysis protocol. Calibration of muscular output and joint stability.", 
      price: "199€", 
      image: "https://images.unsplash.com/photo-1541252260730-0309964d7529?q=80&w=1287&auto=format&fit=crop" 
    },
    { id: "02", title: "TECNIFICACIÓN", stats: [40, 65, 30, 80, 50, 95] }
  ]
};

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('DASHBOARD');

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-white flex overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 flex flex-col pt-20 bg-[#121415]/80 backdrop-blur-xl z-50">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-2 text-[#00FF41] mb-2">
            <Lucide.Activity size={14} />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">System_Active</span>
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">GHC ACADEMY</h1>
        </div>
        
        <nav className="flex flex-col gap-1">
          {['DASHBOARD', 'SHOP', 'LAB', 'ADMIN'].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`flex items-center gap-4 px-8 py-4 text-[10px] font-bold tracking-widest border-l-2 transition-all ${
                tab === item ? 'bg-white/5 text-[#00FF41] border-[#00FF41]' : 'text-zinc-500 border-transparent hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#121415] relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-12 bg-[#121415]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="text-[9px] font-mono text-zinc-500 tracking-widest">[SYS_{ACADEMY_DATA.version}]</div>
          <div className="text-[10px] font-black text-zinc-500 uppercase italic">Tactical_Control</div>
          <div className="px-3 py-1 bg-[#1A1D1E] text-[#00FF41] text-[9px] font-bold border border-[#00FF41]/20">STATUS_OK</div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section 
            key={tab} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-12 max-w-7xl w-full relative z-10"
          >
            {tab === 'DASHBOARD' ? (
              <div className="space-y-12">
                <div className="flex flex-col">
                  <span className="text-[#00FF41] text-[10px] font-mono mb-2 tracking-[0.5em] uppercase opacity-60">[MODULE_OVERVIEW]</span>
                  <h2 className="text-7xl font-black uppercase italic tracking-tighter">TACTICAL VIEW</h2>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 relative aspect-[16/10] bg-[#1A1D1E] border border-white/5 overflow-hidden group">
                    <img src={ACADEMY_DATA.protocols[0].image} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-700" alt="Viz" />
                    <div className="absolute inset-0 p-12 flex flex-col justify-end bg-gradient-to-t from-[#121415] via-transparent">
                      <h3 className="text-5xl font-black italic mb-4">{ACADEMY_DATA.protocols[0].title}</h3>
                      <p className="text-zinc-500 text-xs max-w-md mb-8 uppercase tracking-widest leading-relaxed font-bold italic">{ACADEMY_DATA.protocols[0].description}</p>
                      <div className="flex items-center gap-8">
                        <button className="bg-[#00FF41] text-black px-10 py-5 text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,65,0.4)]">ENROLL_NOW</button>
                        <span className="text-4xl font-black text-[#00FF41] italic">{ACADEMY_DATA.protocols[0].price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 flex flex-col gap-4">
                    <div className="flex-1 bg-[#1A1D1E] border border-white/5 p-8">
                      <Lucide.BarChart3 className="text-[#00FF41] mb-6" size={20} />
                      <h4 className="text-2xl font-black italic mb-8">TECNIFICACIÓN</h4>
                      <div className="flex items-end gap-2 h-24">
                        {ACADEMY_DATA.protocols[1].stats?.map((val, i) => (
                          <div key={i} className="flex-1 bg-[#00FF41]/40" style={{ height: `${val}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] opacity-20">
                <Lucide.Terminal size={40} className="text-[#00FF41] mb-4" />
                <p className="text-[10px] font-mono tracking-widest uppercase italic font-bold">Encrypted_Access_Required</p>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
        
        {/* DOT GRID EFECTO */}
        <div className="fixed inset-0 pointer-events-none dot-grid z-0 opacity-20" />
      </main>

      <style jsx global>{`
        .dot-grid {
          background-image: radial-gradient(rgba(0, 255, 65, 0.15) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        body { margin: 0; background: #121415; }
      `}</style>
    </div>
  );
}
