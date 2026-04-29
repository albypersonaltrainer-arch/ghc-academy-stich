import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Activity, Zap, Shield, Target } from 'lucide-react';

export const LandingSection = ({ onJoin }: { onJoin: () => void }) => {
  const plans = [
    {
      name: "BASE",
      price: "49",
      description: "Fundamentos científicos.",
      features: ["Módulos Exclusivos Básicos", "Comunidad Academy"],
      cta: "SELECCIONAR",
      recommended: false
    },
    {
      name: "PRO",
      price: "89",
      description: "Análisis avanzado.",
      features: ["Módulos Exclusivos Completos", "Certificación Digital", "Tracking Biométrico Semanal"],
      cta: "SELECCIONAR",
      recommended: true
    },
    {
      name: "ÉLITE",
      price: "199",
      description: "Control total del laboratorio.",
      features: ["Todo el contenido PRO", "Soporte IA 24/7", "Análisis de Datos en Tiempo Real"],
      cta: "SELECCIONAR",
      recommended: false
    }
  ];

  return (
    <div className="bg-[#121415] text-white font-['Space_Grotesk']">
      
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,95,0,0.05)_0%,transparent_70%)]" />
          <div className="w-full h-full opacity-20 bg-center bg-cover grayscale" style={{backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80')"}} />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-orange-600 font-black tracking-[0.3em] uppercase text-xs mb-6 block"
          >
            SPORT THROUGH SCIENCE
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase mb-8"
          >
            LLEVA TU RENDIMIENTO AL <span className="text-orange-600">LÍMITE</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Optimiza cada fibra de tu cuerpo con datos precisos, metodologías científicas y tecnología de élite. No entrenes a ciegas.
          </motion.p>
          <motion.button 
            onClick={() => onJoin()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-orange-600 hover:bg-orange-500 text-black px-10 py-5 text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_40px_rgba(255,95,0,0.3)]"
          >
            COMENZAR EVALUACIÓN
          </motion.button>
        </div>
      </section>

      {/* MÉTODO CIENTÍFICO (RADAR) */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-orange-600 font-bold uppercase text-[10px] tracking-widest mb-4 block">PROTOCOLO APROBADO</span>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic mb-8">EL MÉTODO CIENTÍFICO</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Basado en análisis de datos biométricos en tiempo real, nuestro método elimina las conjeturas del entrenamiento.
            </p>
            <ul className="space-y-6">
              {[
                { icon: <Activity className="text-orange-600" />, text: "Monitoreo de Variabilidad de Frecuencia Cardíaca (HRV)" },
                { icon: <Target className="text-orange-600" />, text: "Velocity Based Training (VBT) Profiling" },
                { icon: <Zap className="text-orange-600" />, text: "Análisis de Eficiencia Metabólica" }
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 group">
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded group-hover:border-orange-600/50 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-tight text-zinc-300">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative aspect-square bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-[400px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <circle key={i} cx="200" cy="200" r={i * 35} fill="none" stroke="white" strokeOpacity="0.05" />
              ))}
              <line x1="200" y1="25" x2="200" y2="375" stroke="white" strokeOpacity="0.05" />
              <line x1="25" y1="200" x2="375" y2="200" stroke="white" strokeOpacity="0.05" />
              
              <polygon 
                points="200,80 320,160 290,300 110,300 80,160" 
                fill="rgba(6, 182, 212, 0.2)" 
                stroke="#06b6d4" 
                strokeWidth="2" 
              />
              {[
                {x: 200, y: 80, label: "HRV Status"},
                {x: 320, y: 160, label: "VBT Peak"},
                {x: 290, y: 300, label: "Load Toler."},
                {x: 110, y: 300, label: "Metabolic"},
                {x: 80, y: 160, label: "Neuro."}
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#06b6d4" className="animate-pulse" />
                  <text x={pt.x} y={pt.y - 15} textAnchor="middle" className="fill-zinc-500 text-[10px] uppercase font-bold">{pt.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* ACCESO A LA ACADEMIA (PRICING) */}
      <section className="py-24 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-4">ACCESO A LA ACADEMIA</h2>
          <p className="text-zinc-500 mb-16 uppercase tracking-[0.2em] text-xs">Selecciona el nivel de integración de datos para tu entrenamiento.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`relative flex flex-col p-8 bg-zinc-900 border ${plan.recommended ? 'border-orange-600' : 'border-zinc-800'} text-left transition-transform hover:-translate-y-2`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-black text-[10px] font-black px-4 py-1 uppercase tracking-tighter">
                    RECOMENDADO
                  </div>
                )}
                <h3 className="text-3xl font-black text-white italic mb-2">{plan.name}</h3>
                <p className="text-zinc-500 text-xs mb-8 uppercase font-bold">{plan.description}</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-white italic">€{plan.price}</span>
                  <span className="text-zinc-600 text-xs uppercase font-bold">/mes</span>
                </div>

                <div className="flex-1 space-y-4 mb-10">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check size={14} className="text-orange-600 mt-1 flex-shrink-0" />
                      <span className="text-xs text-zinc-400 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => onJoin()}
                  className={`w-full py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    plan.recommended ? 'bg-orange-600 text-black hover:bg-orange-500' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL BANNER */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 p-16 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 border-r border-t border-orange-600/20 w-32 h-32" />
          <div className="absolute bottom-0 left-0 p-4 border-l border-b border-orange-600/20 w-32 h-32" />
          
          <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-8 relative z-10 tracking-tighter">
            ÚNETE A LA <span className="text-orange-600">ÉLITE DEPORTIVA</span>
          </h2>
          <p className="text-zinc-500 mb-12 relative z-10 max-w-xl mx-auto text-sm uppercase tracking-widest leading-relaxed">
            El rendimiento no se adivina, se diseña. Inicia tu protocolo hoy mismo.
          </p>
          <button 
            onClick={() => onJoin()}
            className="relative z-10 bg-orange-600 hover:bg-orange-500 text-black px-12 py-5 text-sm font-black uppercase tracking-widest transition-all group-hover:scale-105"
          >
            JOIN NOW
          </button>
        </div>
      </section>
    </div>
  );
};
