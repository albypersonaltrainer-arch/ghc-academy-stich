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
    <div className="min-h-screen bg-[#121415] text-white flex overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 flex flex-col pt-20 z-40 bg-[#121415]/80 backdrop-blur-xl">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-2 text-[#00FF41] mb-2">
            <Activity size={16} />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">System_Active</span>
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">GHC ACADEMY</h1>
        </div>
        <nav className="flex flex-col gap-1 text-[10px] font-bold tracking-widest text-zinc-500">
          {['DASHBOARD', 'SHOP', 'LAB', 'ADMIN'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-4 px-8 py-4 border-l-2 transition-all ${
                activeTab === tab ? 'bg-white/5 text-[#00FF41] border-[#00FF41]' : 'border-transparent hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex flex-col h-screen overflow-y-auto">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-12 bg-[#121415]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">[SYSTEM_{ACADEMY_DATA.version}]</div>
          <div className="text-[10px] font-black text-zinc-500 uppercase italic">Tactical_Control_Unit</div>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-[#1A1D1E] text-[#00FF41] text-[9px] font-bold border border-[#00FF41]/20">STATUS: {ACADEMY_DATA.status}</div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-12">
            {activeTab === 'DASHBOARD' ? (
              <div className="space-y-12">
                <div className="flex flex-col">
                  <span className="text-[#00FF41] text-[10px] font-mono mb-2 tracking-[0.5em] uppercase opacity-60">[OVERVIEW_MODULE]</span>
                  <h2 className="text-7xl font-black uppercase italic tracking-tighter">TACTICAL OVERVIEW</h2>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 group relative aspect-[16/10] bg-[#1A1D1E] border border-white/5 overflow-hidden">
                    <img src={ACADEMY_DATA.protocols[0].image} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-1000" alt="Protocol" />
                    <div className="absolute inset-0 p-12 flex flex-col justify-end">
                      <h3 className="text-5xl font-black italic mb-4">{ACADEMY_DATA.protocols[0].title}</h3>
                      <p className="text-zinc-500 text-[10px] max-w-md mb-8 uppercase tracking-widest leading-relaxed font-bold italic">{ACADEMY_DATA.protocols[0].description}</p>
                      <div className="flex items-center gap-8">
                        <button className="bg-[#00FF41] text-black px-10 py-5 text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,65,0.3)]">ENROLL_NOW</button>
                        <span className="text-4xl font-black text-[#00FF41] italic">{ACADEMY_DATA.protocols[0].price}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col gap-4 text-white">
                    <div className="flex-1 bg-[#1A1D1E] border border-white/5 p-8 flex flex-col justify-between">
                       <BarChart3 size={18} className="text-[#00FF41]" />
                       <h4 className="text-2xl font-black italic tracking-tighter">TECNIFICACIÓN</h4>
                       <div className="flex items-end gap-2 h-24 mt-6">
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
                <Terminal size={40} className="text-[#00FF41] mb-4" />
                <p className="text-[10px] font-mono tracking-widest uppercase italic font-bold">ACCESS_PENDING_ENCRYPTED_DATABASE</p>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&display=swap');
        .dot-grid {
          background-image: radial-gradient(rgba(0, 255, 65, 0.15) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        body { background: #121415; font-family: 'Space Grotesk', sans-serif !important; }
      `}</style>
    </div>
  );
}
