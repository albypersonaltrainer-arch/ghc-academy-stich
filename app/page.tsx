'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Dna, 
  Zap, 
  ChevronRight, 
  LayoutDashboard, 
  Terminal, 
  FlaskConical, 
  ShieldCheck,
  ShoppingCart
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function Page() {
  const [activeTab, setActiveTab] = useState('shop'); // Control de Pestañas Principal
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    if (searchParams.get('access') === 'ghc_secure_access_2024') setActiveTab('admin');
  }, [searchParams]);

  if (!mounted) return <div className="bg-[#0D0F10] min-h-screen" />;

  return (
    <main className="min-h-screen bg-[#0D0F10] text-white flex overflow-hidden font-sans selection:bg-[#00FF41]/30">
      <div className="fixed inset-0 dot-grid opacity-15 pointer-events-none" />

      {/* NAVEGACIÓN TÉCNICA LATERAL - LA INTERFAZ MODERNA */}
      <nav className="w-20 border-r border-white/5 bg-[#0D0F10] flex flex-col items-center py-10 z-50">
        <div className="w-10 h-10 bg-[#00FF41] flex items-center justify-center shadow-[0_0_20px_#00FF41] mb-12">
          <span className="text-black font-black italic text-lg line-through">G</span>
        </div>
        <div className="flex flex-col gap-10">
          <button onClick={() => setActiveTab('shop')} className={`transition-all ${activeTab === 'shop' ? 'text-[#00FF41]' : 'text-zinc-700 hover:text-white'}`}>
            <LayoutDashboard size={20} />
          </button>
          <button onClick={() => setActiveTab('lab')} className={`transition-all ${activeTab === 'lab' ? 'text-[#00FF41]' : 'text-zinc-700 hover:text-white'}`}>
            <Activity size={20} />
          </button>
          <div className="h-px w-4 bg-white/5 mx-auto" />
          <button onClick={() => setActiveTab('admin')} className={`transition-all ${activeTab === 'admin' ? 'text-[#00FF41]' : 'text-zinc-700 hover:text-white'}`}>
            <Terminal size={20} />
          </button>
        </div>
      </nav>

      {/* LONA PRINCIPAL */}
      <div className="flex-grow flex flex-col relative overflow-y-auto">
        
        {/* TOP STATUS BAR */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-[#0D0F10]/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-6">
            <span className="text-[#00FF41] text-[9px] font-black tracking-[0.4em] uppercase animate-pulse">System_Live: Node_01</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-zinc-600 text-[9px] font-black tracking-[0.4em] uppercase italic">GHC_Academy // Sport_Science</span>
          </div>
          <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
             <span className="hover:text-[#00FF41] cursor-pointer transition-colors">Documentation</span>
             <button className="px-6 py-2 border border-[#00FF41] text-[#00FF41] font-bold hover:bg-[#00FF41] hover:text-black transition-all">
                ADMIN_PANEL
             </button>
          </div>
        </header>

        {/* PANELES DINÁMICOS */}
        <section className="p-12 max-w-[1500px] w-full mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'shop' && (
              <motion.div 
                key="shop" 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-16"
              >
                {/* HERO INTEGRADO EN PARCELA */}
                <div className="flex flex-col lg:flex-row justify-between items-end gap-10">
                  <div className="space-y-4">
                    <h1 className="text-8xl md:text-[130px] font-black tracking-tighter uppercase italic leading-[0.8]">
                       SELECT <br /> <span className="text-[#00FF41]">MODULE.</span>
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base font-bold uppercase tracking-[0.3em] italic">Protocolos de integración biológica nivel clínico.</p>
                  </div>
                  {/* WIDGET DE MÉTRICAS RÁPIDAS */}
                  <div className="w-full lg:w-80 bg-[#161819] border border-white/10 p-8 space-y-6">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                       <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Active_Protocols</span>
                       <span className="text-[#00FF41] text-xs font-black">12/12</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Lab_Uptime</span>
                       <span className="text-[#00FF41] text-xs font-black">99.9%</span>
                    </div>
                  </div>
                </div>

                {/* GRID DE PROTOCOLOS (TIENDA EN PARCELAS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { id: '1', t: 'BIOMECHANICS', d: 'Fuerza aplicada y palancas cinéticas externas.', p: '199€', icon: <Activity /> },
                    { id: '2', t: 'NEURO_LOAD', d: 'Sistemas centrales y reclutamiento motor.', p: '249€', icon: <Zap /> },
                    { id: '3', t: 'METABOLIC_PRO', d: 'Gestión de sustratos y recuperación celular.', p: '150€', icon: <Dna /> }
                  ].map((item, i) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className="group bg-[#161819] border border-white/5 p-10 relative overflow-hidden transition-all hover:border-[#00FF41]/40"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl italic font-black">0{i+1}</div>
                      <div className="w-12 h-12 flex items-center justify-center border border-[#00FF41]/30 text-[#00FF41] mb-12 group-hover:bg-[#00FF41] group-hover:text-black transition-all duration-300">
                        {item.icon}
                      </div>
                      <h3 className="text-4xl font-black tracking-tighter uppercase italic mb-4">{item.t}</h3>
                      <p className="text-zinc-600 text-[10px] font-black tracking-[0.2em] uppercase leading-relaxed mb-12 opacity-80">
                        {item.d}
                      </p>
                      <div className="flex justify-between items-center border-t border-white/5 pt-8">
                        <span className="text-3xl font-black italic">{item.p}</span>
                        <button className="flex items-center gap-3 text-[#00FF41] text-[10px] font-black uppercase tracking-[0.3em] group-hover:scale-110 transition-transform">
                          <ShoppingCart size={16} /> ADQUIRIR_ACCESO
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'lab' && (
              <motion.div key="lab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-[#161819] border border-white/5 p-12">
                   <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-10 border-b border-white/5 pb-6">GHC_METHOD</h2>
                   <div className="space-y-8">
                      {[
                        { t: 'Analysis', d: 'Recogida de datos biomecánicos crudos.' },
                        { t: 'Integration', d: 'Optimización de vectores de fuerza.' },
                        { t: 'Validation', d: 'Control clínico de resultados.' }
                      ].map((p, idx) => (
                        <div key={idx} className="flex items-start gap-6 group border-l-2 border-[#00FF41]/10 pl-6 hover:border-[#00FF41] transition-all">
                           <div>
                              <div className="text-[#00FF41] text-[10px] font-black uppercase tracking-widest mb-2">Phase_0{idx+1} // {p.t}</div>
                              <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest leading-relaxed">{p.d}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="bg-[#00FF41] text-black p-12 flex flex-col justify-center">
                   <ShieldCheck size={70} className="mb-8" />
                   <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-[0.8] mb-8">LABORATORIO_CENTRAL_GHC</h3>
                   <p className="text-xs font-black uppercase tracking-[0.2em] leading-loose italic opacity-80">
                      Nuestra metodología no es comercial. Es una arquitectura avanzada de datos aplicada al rendimiento extremo.
                   </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div key="admin" className="p-12 border border-[#00FF41]/20 bg-[#00FF41]/5">
                 <h1 className="text-6xl font-black italic tracking-tighter text-[#00FF41] mb-12 uppercase">Admin_Secure_Access</h1>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10 opacity-40">
                   {[1,2,3].map(i => <div key={i} className="h-60 border border-[#00FF41]/20 bg-black animate-pulse" />)}
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* FOOTER WIDGET / TELEMETRÍA */}
      <footer className="fixed bottom-0 right-0 p-8 flex items-center gap-10 bg-[#0D0F10]/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-[#0D0F10] bg-zinc-800" />)}
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">4.8K Active_Nodes</span>
        </div>
        <div className="text-[8px] font-black uppercase tracking-[0.4em] text-[#00FF41]">GHC_VERIFIED_PROTOCOL_v.3.2</div>
      </footer>
    </main>
  );
}
