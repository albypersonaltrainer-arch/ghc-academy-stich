'use client';
import React from 'react';
import { motion } from 'framer-motion';

export const LandingSection = ({ onAccess }: any) => {
  return (
    <section className="relative min-h-screen bg-[#121415] flex flex-col items-center justify-center pt-24 px-6 overflow-hidden">
      
      {/* Luces de ambiente industriales (Naranjas difuminadas) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[130px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center max-w-5xl mx-auto"
      >
        {/* Slogan superior pequeño */}
        <span className="text-orange-500 text-[9px] md:text-[10px] tracking-[0.6em] font-black uppercase mb-8 block opacity-80">
          • SPORT THROUGH SCIENCE •
        </span>
        
        {/* Título Principal Impactante */}
        <h1 className="text-5xl md:text-8xl font-[900] text-white leading-[0.95] tracking-tighter mb-10 italic uppercase">
          LLEVA TU <span className="text-orange-600 not-italic">RENDIMIENTO</span> AL LÍMITE
        </h1>

        {/* Subtexto descriptivo */}
        <p className="text-zinc-400 text-sm md:text-lg max-w-2xl mx-auto mb-14 font-light leading-relaxed tracking-tight">
          La intersección definitiva entre biomecánica avanzada, datos biométricos en tiempo real y disciplina industrial. Entrena como la élite con tecnología de vanguardia.
        </p>

        {/* Botón de Acción Principal */}
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: '#ea580c' }}
          whileTap={{ scale: 0.95 }}
          onClick={onAccess}
          className="bg-orange-700 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/40 transition-all border border-orange-500/20"
        >
          EMPEZAR AHORA +
        </motion.button>
      </motion.div>

      {/* Grid de Niveles/Protocolos (La parte inferior de tu foto) */}
      <div className="mt-24 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-zinc-800/40 pt-12">
        <div className="p-10 border-r border-zinc-900 group cursor-pointer hover:bg-zinc-900/30 transition-all">
          <span className="text-zinc-800 font-black text-xl italic group-hover:text-zinc-600 transition-colors tracking-tighter">01</span>
          <h3 className="text-zinc-500 font-black mt-3 uppercase tracking-tighter italic text-lg group-hover:text-white transition-colors leading-none">Fundamentos</h3>
          <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-bold">Base científica</p>
        </div>
        
        <div className="p-10 bg-zinc-900/40 border-t-[3px] border-orange-600 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 text-orange-600/20 font-black text-4xl italic tracking-tighter leading-none select-none">PRO</div>
          <span className="text-orange-600 font-black text-xl italic tracking-tighter">02</span>
          <h3 className="text-white font-black mt-3 uppercase tracking-tighter italic text-lg leading-none">Avanzado</h3>
          <p className="text-[10px] text-orange-500/70 mt-2 uppercase tracking-widest font-bold">Optimización Real</p>
        </div>
        
        <div className="p-10 border-l border-zinc-900 group cursor-pointer hover:bg-zinc-900/30 transition-all">
          <span className="text-zinc-800 font-black text-xl italic group-hover:text-zinc-600 transition-colors tracking-tighter">03</span>
          <h3 className="text-zinc-500 font-black mt-3 uppercase tracking-tighter italic text-lg group-hover:text-white transition-colors leading-none">Élite</h3>
          <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-bold">Rendimiento Máximo</p>
        </div>
      </div>
    </section>
  );
};
