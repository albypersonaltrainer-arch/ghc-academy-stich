import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Activity, Target, Zap, Beaker, Dumbbell, HeartPulse } from 'lucide-react';

/
 * ACADEMY_CONTENT: Arquitectura de datos para escalabilidad total.
 * Edita este array para añadir/eliminar categorías y subcategorías.
 */
const ACADEMY_CONTENT = [
  { 
    id: 'deporte', 
    title: 'ALTO RENDIMIENTO', 
    subcategories: ['Fisiología del Esfuerzo', 'Bioenergética', 'Periodización'], 
    icon: <Activity className="w-6 h-6" />, 
    stats: '12 Cursos' 
  },
  { 
    id: 'lesiones', 
    title: 'LESIONES Y PATOLOGÍAS', 
    subcategories: ['Readaptación', 'Prevención Activa', 'Biomecánica Clínica'], 
    icon: <HeartPulse className="w-6 h-6" />, 
    stats: '8 Cursos' 
  },
  { 
    id: 'tecnificacion', 
    title: 'TECNIFICACIÓN', 
    subcategories: ['Análisis de Datos VBT', 'HRV Profiling', 'GPS Metrics'], 
    icon: <Target className="w-6 h-6" />, 
    stats: '15 Cursos' 
  },
  { 
    id: 'entrenamiento', 
    title: 'ENTRENAMIENTO PERSONAL', 
    subcategories: ['Hipertrofia Ciencia', 'Fuerza Máxima', 'Programación'], 
    icon: <Dumbbell className="w-6 h-6" />, 
    stats: '22 Cursos' 
  },
  { 
    id: 'nutricion', 
    title: 'NUTRICIÓN Y SUPLEMENTACIÓN', 
    subcategories: ['Nutrición Celular', 'Ergogenia Especializada', 'Microbiota'], 
    icon: <Beaker className="w-6 h-6" />, 
    stats: '10 Cursos' 
  }
];

export const LandingSection = ({ onJoin }: { onJoin: () => void }) => {
  return (
    <div className="min-h-screen bg-[#121415] text-white font-['Space_Grotesk'] selection:bg-[#FF5F00] selection:text-black">
      
      {/* HERO SECTION - INDUSTRIAL POWER */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden border-b border-zinc-800/50">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-orange-600/30 bg-orange-600/5 mb-8"
          >
            <Zap className="w-3 h-3 text-[#FF5F00]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FF5F00]">SISTEMA V.2.04 ACTIVADO</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase leading-[0.85] mb-12"
          >
            LLEVA TU <br />
            <span className="text-transparent stroke-text">RENDIMIENTO</span> <br />
            AL <span className="text-[#FF5F00]">LÍMITE</span>
          </motion.h1>

          <div className="grid md:grid-cols-2 gap-12 items-end">
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-400 text-lg md:text-xl max-w-xl leading-relaxed font-medium"
            >
              No es entrenamiento, es ingeniería humana. Implementamos protocolos científicos de élite para transformar datos en poder real. Bienvenido a la nueva era del deporte.
            </motion.p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={onJoin}
                className="group relative px-10 py-5 bg-[#FF5F00] text-black font-black uppercase text-sm tracking-widest overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,95,0,0.4)] active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  INICIAR PROTOCOLO <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
              </button>
              <button className="px-10 py-5 border border-zinc-800 hover:border-zinc-600 font-black uppercase text-sm tracking-widest transition-all">
                VER CATÁLOGO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <span className="text-[#FF5F00] font-bold text-[10px] tracking-[0.5em] uppercase mb-4 block">ESPECIALIZACIONES</span>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">EXPLORA EL <span className="text-zinc-500">LABORATORIO</span></h2>
          </div>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest border-l-2 border-[#FF5F00] pl-6 max-w-xs">
            Segmentación avanzada para profesionales del sector.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ACADEMY_CONTENT.map((category, idx) => (
            <motion.div 
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-[#1a1c1d] border border-zinc-800 p-8 hover:border-[#FF5F00]/50 transition-all duration-500 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 text-[8px] font-black text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                REF_{category.id.toUpperCase()}_04
              </div>
              
              <div className="mb-8 p-4 bg-zinc-900 border border-zinc-800 text-[#FF5F00] w-fit group-hover:bg-[#FF5F00] group-hover:text-black transition-all duration-300">
                {category.icon}
              </div>

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none group-hover:text-[#FF5F00] transition-colors">
                  {category.title}
                </h3>
                <span className="text-[10px] font-black text-zinc-600 bg-zinc-950 px-2 py-1 rounded">
                  {category.stats}
                </span>
              </div>

              <div className="space-y-2 mb-8">
                {category.subcategories.map((sub, sidx) => (
                  <div key={sidx} className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
                    <div className="w-1 h-1 bg-zinc-700 group-hover:bg-[#FF5F00] transition-colors" />
                    {sub}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors">
                ACCEDER AL ÁREA <ArrowUpRight className="w-3 h-3" />
              </div>

              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#FF5F00]/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto relative overflow-hidden bg-zinc-950 border border-zinc-800 p-12 md:p-24 text-center">
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 leading-none">
              ÚNETE A LA <br />
              <span className="text-[#FF5F00]">ÉLITE DEPORTIVA</span>
            </h2>
            <button 
              onClick={onJoin}
              className="bg-white hover:bg-[#FF5F00] text-black px-12 py-5 text-sm font-black uppercase tracking-widest transition-all hover:shadow-[0_0_50px_rgba(255,95,0,0.3)] active:scale-95"
            >
