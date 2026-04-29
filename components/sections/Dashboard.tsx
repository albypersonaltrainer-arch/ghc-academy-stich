'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Lock, BookOpen, ChevronRight, BarChart3, Clock, Trophy } from 'lucide-react';

export const DashboardSection = () => {
  const modules = [
    { id: '01', title: 'FUNDAMENTOS DE BIOMECÁNICA', lessons: '8 LECCIONES', status: 'COMPLETO', active: true, progress: 100 },
    { id: '02', title: 'ANÁLISIS DE DATOS Y BIOMETRÍA', lessons: '12 LECCIONES', status: 'EN CURSO', active: true, progress: 45 },
    { id: '03', title: 'PROTOCOLOS DE RENDIMIENTO ÉLITE', lessons: '10 LECCIONES', status: 'BLOQUEADO', active: false, progress: 0 },
    { id: '04', title: 'TECNOLOGÍA DE CALZADO Y SUPER SHOES', lessons: '6 LECCIONES', status: 'BLOQUEADO', active: false, progress: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#121415] pt-32 pb-20 px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera del Portal */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-[1px] bg-orange-600"></span>
              <span className="text-orange-500 text-[10px] tracking-[0.5em] font-black uppercase italic">Sistema de Formación Avanzada</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-[900] text-white italic tracking-tighter leading-none uppercase">
              STUDENT <span className="text-zinc-800">PORTAL</span>
            </h2>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-zinc-900/50 p-4 border border-zinc-800/50 rounded-xl text-right">
              <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 italic">Nivel Actual</span>
              <span className="text-white font-black italic tracking-tighter text-xl">AVANZADO - 02</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Listado Principal de Módulos (Columna Izquierda) */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em] mb-6">Módulos del Programa</h3>
            
            {modules.map((m) => (
              <motion.div 
                key={m.id}
                whileHover={m.active ? { scale: 1.01, x: 8 } : {}}
                className={`p-8 rounded-2xl border transition-all relative overflow-hidden group ${
                  m.active 
                    ? 'bg-zinc-900/40 border-zinc-800 cursor-pointer hover:border-orange-600/50' 
                    : 'bg-zinc-900/10 border-zinc-900 opacity-40 select-none'
                }`}
              >
                {/* Indicador de carga lateral en activos */}
                {m.active && m.progress > 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-600 shadow-[0_0_15px_#ea580c]" />
                )}

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-8">
                    <span className={`text-4xl font-black italic tracking-tighter ${m.active ? 'text-orange-600' : 'text-zinc-800'}`}>
                      {m.id}
                    </span>
                    <div>
                      <h4 className="text-white font-black tracking-tight uppercase text-lg italic group-hover:text-orange-500 transition-colors">
                        {m.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">{m.lessons}</span>
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${m.active ? 'text-orange-500/80' : 'text-zinc-700'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {m.active ? (
                    <button className="bg-orange-600/10 text-orange-600 p-3 rounded-full hover:bg-orange-600 hover:text-white transition-all">
                      <Play fill="currentColor" size={16} />
                    </button>
                  ) : (
                    <Lock className="text-zinc-800" size={20} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Sidebar de Métricas y Progreso (Columna Derecha) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <BarChart3 size={120} />
              </div>
              <h3 className="text-white font-black italic mb-8 uppercase tracking-tighter text-xl">Tu Rendimiento</h3>
              
              <div className="space-y-6 relative z-10">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">Progreso Total</span>
                    <span className="text-orange-500 font-black italic">45%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '45%' }}
                      className="bg-orange-600 h-full rounded-full shadow-[0_0_10px_rgba(234,88,12,0.4)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50 text-center">
                    <Clock size={16} className="mx-auto mb-2 text-zinc-600" />
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase italic">Horas</span>
                    <span className="text-white font-black text-lg">24.5</span>
                  </div>
                  <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50 text-center">
                    <Trophy size={16} className="mx-auto mb-2 text-zinc-600" />
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase italic">Logros</span>
                    <span className="text-white font-black text-lg">08</span>
                  </div>
                </div>

                <button className="w-full bg-white text-black font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl">
                  CONTINUAR ÚLTIMA LECCIÓN
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
