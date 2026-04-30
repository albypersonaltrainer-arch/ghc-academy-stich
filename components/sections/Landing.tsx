"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  Activity, 
  Target, 
  Zap, 
  Beaker, 
  Dumbbell, 
  HeartPulse, 
  Shield, 
  ChevronRight 
} from 'lucide-react';

/
 * ACADEMY_DATA: Objeto de configuración centralizado.
 * Este objeto permite gestionar todo el contenido de la Landing sin tocar el código.
 */
const ACADEMY_DATA = {
  hero: {
    badge: "SISTEMA V.2.04 ACTIVADO",
    title_part1: "LLEVA TU",
    title_stroke: "RENDIMIENTO",
    title_part2: "AL",
    title_highlight: "LÍMITE",
    description: "No es entrenamiento, es ingeniería humana. Implementamos protocolos científicos de élite para transformar datos en poder real. Bienvenido a la nueva era del deporte."
  },
  categories: [
    { id: 'deporte', title: 'ALTO RENDIMIENTO', subcategories: ['Fisiología del Esfuerzo', 'Bioenergética', 'Periodización'], icon: <Activity className="w-6 h-6" />, stats: '12 Cursos', ref: 'REF_DEPORTE_04' },
    { id: 'lesiones', title: 'LESIONES Y PATOLOGÍAS', subcategories: ['Readaptación', 'Prevención Activa', 'Biomecánica Clínica'], icon: <HeartPulse className="w-6 h-6" />, stats: '8 Cursos', ref: 'REF_LESIONES_01' },
    { id: 'tecnificacion', title: 'TECNIFICACIÓN', subcategories: ['Análisis de Datos VBT', 'HRV Profiling', 'GPS Metrics'], icon: <Target className="w-6 h-6" />, stats: '15 Cursos', ref: 'REF_TECH_09' },
    { id: 'entrenamiento', title: 'ENTRENAMIENTO PERSONAL', subcategories: ['Hipertrofia Ciencia', 'Fuerza Máxima', 'Programación'], icon: <Dumbbell className="w-6 h-6" />, stats: '22 Cursos', ref: 'REF_COACH_02' },
    { id: 'nutricion', title: 'NUTRICIÓN / SUPLEMENTACIÓN', subcategories: ['Nutrición Celular', 'Ergogenia Especializada', 'Microbiota'], icon: <Beaker className="w-6 h-6" />, stats: '10 Cursos', ref: 'REF_BIO_07' }
  ],
  pricing: [
    { id: 'inicial', name: 'INICIAL', price: '49', description: 'Acceso a protocolos base', features: ['Rutinas Estándar', 'Guía Nutricional Básica', 'Acceso a Comunidad'], highlight: false },
    { id: 'avanzado', name: 'AVANZADO', price: '89', description: 'Monitoreo y ajustes semanales', features: ['Rutinas Personalizadas', 'Macronutrientes Dinámicos', '1 Análisis Biomecánico/mes'], highlight: true },
    { id: 'elite', name: 'ÉLITE', price: '199', description: 'Optimización total de variables', features: ['Programación Diaria', 'Nutrición Peri-entrenamiento', 'Monitoreo Biométrico 24/7'], highlight: false }
  ],
  footer: {
    slogan: "SPORT THROUGH SCIENCE",
    cta_title: "ÚNETE A LA ÉLITE DEPORTIVA",
    cta_description: "El rendimiento superior no es un accidente. Es el resultado de un diseño meticuloso y una ejecución implacable. Inicia tu transformación hoy."
  }
};

const Landing = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
  return (
    <div className="min-h-screen bg-[#121415] text-white selection:bg-[#FF5F00] selection:text-black overflow-x-hidden relative">
      
      {/* GLOBAL BACKGROUND DOT-GRID PATTERN */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 border-b border-zinc-800/50 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#FF5F00]/30 bg-[#FF5F00]/5 mb-10 backdrop-blur-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#FF5F00] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5F00]">
              {ACADEMY_DATA.hero.badge}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl md:text-[10rem] font-black italic tracking-tighter uppercase leading-[0.8] mb-16"
          >
            {ACADEMY_DATA.hero.title_part1} <br />
            <span className="text-transparent stroke-text opacity-40">{ACADEMY_DATA.hero.title_stroke}</span> <br />
            {ACADEMY_DATA.hero.title_part2} <span className="text-[#FF5F00] drop-shadow-[0_0_30px_rgba(255,95,0,0.3)]">{ACADEMY_DATA.hero.title_highlight}</span>
          </motion.h1>

          <div className="grid md:grid-cols-2 gap-16 items-end">
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.4 }}
              className="text-zinc-400 text-xl md:text-2xl max-w-xl leading-tight font-medium"
            >
              {ACADEMY_DATA.hero.description}
            </motion.p>
            <div className="flex flex-wrap gap-6">
              <button 
                onClick={() => onNavigate('dashboard')}
                className="group relative px-12 py-6 bg-[#FF5F00] text-black font-black uppercase text-sm tracking-[0.2em] overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,95,0,0.5)] active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-3">
                  INICIAR PROTOCOLO <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div>
            <span className="text-[#FF5F00] font-bold text-[11px] tracking-[0.6em] uppercase mb-6 block">LABORATORIO DE ESPECIALIZACIÓN</span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">SISTEMAS DE <br /> <span className="text-zinc-600">INGENIERÍA HUMANA</span></h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ACADEMY_DATA.categories.map((category, idx) => (
            <motion.div 
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-[#1a1c1d] border border-zinc-800 p-10 hover:border-[#FF5F00]/60 transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-sm"
            >
              <div className="absolute top-0 right-0 p-4 text-[9px] font-black text-zinc-800 group-hover:text-[#FF5F00]/40 transition-colors uppercase tracking-widest font-mono">
                {category.ref}
              </div>

              <div className="mb-10 p-5 bg-zinc-900 border border-zinc-800 text-[#FF5F00] w-fit group-hover:bg-[#FF5F00] group-hover:text-black transition-all duration-500 relative overflow-hidden">
                {category.icon}
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>

              <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-8 group-hover:text-[#FF5F00] transition-colors leading-none">
                {category.title}
              </h3>

              <div className="space-y-3 mb-12">
                {category.subcategories.map((sub, sidx) => (
                  <div key={sidx} className="flex items-center gap-3 text-[12px] font-bold text-zinc-500 uppercase tracking-tight group-hover:text-zinc-300">
                    <div className="w-1.5 h-1.5 bg-zinc-700 group-hover:bg-[#FF5F00] rounded-full" />
                    {sub}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 group-hover:text-white transition-colors">
                ACCEDER AL ÁREA TÉCNICA <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-32 px-6 md:px-12 bg-zinc-950/30 border-t border-zinc-800/50 z-10 relative text-center">
        <div className="max-w-7xl mx-auto mb-24">
          <span className="text-[#FF5F00] font-black text-[11px] tracking-[0.5em] uppercase mb-6 block">NIVELES DE INTEGRACIÓN</span>
          <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter">INVIERTE EN <br /> <span className="text-transparent stroke-text-thin opacity-50">TU CIENCIA</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {ACADEMY_DATA.pricing.map((plan) => (
            <div 
              key={plan.id}
              className={`flex flex-col p-12 bg-zinc-900/50 border ${plan.highlight ? 'border-[#FF5F00] shadow-[0_0_40px_rgba(255,95,0,0.15)]' : 'border-zinc-800'} relative backdrop-blur-md group hover:border-white/20 transition-all duration-500 text-left`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF5F00] text-black font-black text-[10px] px-6 py-1.5 uppercase tracking-[0.3em] italic">
                  OPTIMAL PERFORMANCE
                </div>
              )}
              <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-2 mb-12">
                <span className="text-6xl font-black italic tracking-tighter">€{plan.price}</span>
                <span className="text-zinc-600 text-sm font-bold uppercase">/mes</span>
              </div>
              <div className="space-y-4 mb-16 flex-1">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-4 text-xs font-bold uppercase tracking-tight text-zinc-400">
                    <Shield className="w-4 h-4 text-[#FF5F00] flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              <button className={`w-full py-6 text-xs font-black uppercase tracking-[0.3em] transition-all ${ plan.highlight ? 'bg-[#FF5F00] text-black hover:bg-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                ADQUIRIR NIVEL
              </button>
            </div>
          ))}
        </div>
