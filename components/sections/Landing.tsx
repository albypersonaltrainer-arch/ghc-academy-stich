import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Activity, Target, Zap, Beaker, Dumbbell, HeartPulse, ShieldCheck } from 'lucide-react';

const ACADEMY_CONTENT = [
  { id: '01', category: 'DEPORTE', title: 'ALTO RENDIMIENTO', subs: ['Fisiología', 'Bioenergética'], icon: <Activity />, color: 'shadow-orange-600/20' },
  { id: '02', category: 'LESIONES', title: 'TRAUMATOLOGÍA', subs: ['Readaptación', 'Prevención'], icon: <HeartPulse />, color: 'shadow-red-600/10' },
  { id: '03', category: 'DATA', title: 'TECNIFICACIÓN', subs: ['VBT', 'GPS Metrics'], icon: <Target />, color: 'shadow-blue-600/10' },
  { id: '04', category: 'FUERZA', title: 'ENTRENAMIENTO', subs: ['Hipertrofia', 'Programación'], icon: <Dumbbell />, color: 'shadow-emerald-600/10' },
  { id: '05', category: 'BIO', title: 'NUTRICIÓN', subs: ['Suplementación', 'Celular'], icon: <Beaker />, color: 'shadow-purple-600/10' }
];

export const LandingSection = ({ onJoin }: { onJoin: () => void }) => {
  return (
    <div className="min-h-screen bg-[#0a0b0c] text-white font-['Space_Grotesk'] overflow-hidden">
      
      {/* BACKGROUND TECH GRID */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FF5F00 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} />

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-10">
          <div className="h-[2px] w-12 bg-orange-600" />
          <span className="text-orange-600 font-black tracking-[0.5em] text-[10px] uppercase">GHC ACADEMY V.2.04</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-[12vw] lg:text-[9rem] font-black italic leading-[0.8] uppercase tracking-tighter mb-16"
        >
          SPORT <br />
          <span className="text-transparent stroke-text opacity-40">THROUGH</span> <br />
          <span className="text-orange-600">SCIENCE</span>
        </motion.h1>

        <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm max-w-md border-l-2 border-orange-600 pl-6">
            Optimización biomecánica y fisiológica de élite impulsada por datos. Ingenieria humana para el siglo XXI.
          </p>
          <button 
            onClick={onJoin}
            className="bg-orange-600 text-black px-12 py-6 font-black uppercase text-xs tracking-[0.3em] hover:bg-white hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,95,0,0.3)] flex items-center gap-4"
          >
            INICIAR PROTOCOLO <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 mb-1 bg-zinc-900/30 border border-zinc-800">
          {ACADEMY_CONTENT.map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ backgroundColor: 'rgba(255, 95, 0, 0.03)' }}
              className={`group relative p-10 border border-zinc-800/50 cursor-pointer overflow-hidden transition-all ${item.color} hover:shadow-2xl`}
            >
              {/* TECHNICAL UI DECORATION */}
              <div className="absolute top-0 right-0 p-4 font-black text-[8px] text-zinc-800 group-hover:text-orange-600/40">
                //SYS_REF_{item.id}
              </div>

              <div className="text-orange-600 mb-10 w-12 h-12 flex items-center justify-center border border-zinc-800 bg-zinc-950 group-hover:bg-orange-600 group-hover:text-black transition-all duration-500">
                {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
              </div>

              <span className="text-orange-600/60 font-black text-[9px] tracking-[0.3em] mb-2 block tracking-widest uppercase">
                {item.category}_SEC
              </span>

              <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-6 leading-none">
                {item.title}
              </h3>

              <div className="space-y-2 mb-10">
                {item.subs.map((sub, j) => (
                  <div key={j} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                    <div className="w-1 h-[1px] bg-zinc-700" /> {sub}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-700 group-hover:text-white transition-all">
                ACCESS SYSTEM <ArrowUpRight size={12} />
              </div>

              {/* FLARE EFFECT */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-600/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER CALL */}
      <section className="py-20 text-center border-t border-zinc-900 bg-zinc-950/50">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-800 mb-8">LABORATORY LOG ACCESS</h2>
        <button className="text-zinc-500 hover:text-white font-black uppercase text-[10px] tracking-[0.5em] transition-all">
          TERMS & CONDITIONS // PRIVACY_POLICY
        </button>
      </section>

      <style jsx global>{`
        .stroke-text {
          -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.4);
        }
        @media (max-width: 768px) {
          .stroke-text { -webkit-text-stroke: 1px rgba(255, 255, 255, 0.2); }
        }
      `}</style>
    </div>
  );
};
