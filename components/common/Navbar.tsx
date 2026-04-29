'use client';
import React from 'react';
import { motion } from 'framer-motion';

export const Navbar = ({ view, setView, slogan }: any) => {
  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-[#121415]/80 backdrop-blur-xl border-b border-zinc-900/50 px-8 py-5 flex justify-between items-center transition-all duration-500">
      
      {/* LOGO GHC ACADEMY */}
      <motion.div 
        onClick={() => setView('PUBLIC')} 
        whileHover={{ scale: 1.02 }}
        className="cursor-pointer flex items-center gap-2"
      >
        <div className="w-2 h-6 bg-orange-600 rounded-full" />
        <span className="font-[900] text-xl tracking-tighter text-white uppercase italic leading-none">
          GHC <span className="text-orange-600">ACADEMY</span>
        </span>
      </motion.div>

      {/* NAVEGACIÓN CENTRAL / DERECHA */}
      <div className="hidden md:flex gap-10 items-center">
        <div className="flex gap-8 border-r border-zinc-800 pr-8 mr-2">
          <button 
            onClick={() => setView('PUBLIC')} 
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-orange-500 ${view === 'PUBLIC' ? 'text-orange-500' : 'text-zinc-500'}`}
          >
            Inicio
          </button>
          <button 
            onClick={() => setView('STUDENT')} 
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-orange-500 ${view === 'STUDENT' ? 'text-orange-500' : 'text-zinc-500'}`}
          >
            Academy
          </button>
          <button 
            onClick={() => setView('ADMIN')} 
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all text-zinc-800 hover:text-zinc-400`}
          >
            Admin
          </button>
        </div>

        {/* BOTÓN JOIN ELITE */}
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(234, 88, 12, 0.2)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setView('STUDENT')}
          className="bg-zinc-100 text-black text-[9px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all duration-300"
        >
          Join Elite
        </motion.button>
      </div>

      {/* INDICADOR DE MÓVIL (Menú hamburguesa rápido) */}
      <div className="md:hidden p-2 text-zinc-100">
        <div className="w-6 h-0.5 bg-white mb-1.5" />
        <div className="w-6 h-0.5 bg-orange-600 mb-1.5" />
        <div className="w-4 h-0.5 bg-white" />
      </div>
    </nav>
  );
};
