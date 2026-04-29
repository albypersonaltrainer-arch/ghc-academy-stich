'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importación de las secciones que ya hemos creado en los pasos anteriores
import { LandingSection } from '@/components/sections/Landing';
import { CourseViewer } from '@/components/sections/CourseViewer';
import { QuizSystem } from '@/components/sections/QuizSystem';
import { DashboardSection } from '@/components/sections/Dashboard';

export default function HomePage() {
  // Lógica de Navegación por Estado: 'landing', 'dashboard', 'viewer', 'quiz'
  const [view, setView] = useState('landing');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-['Space_Grotesk'] selection:bg-orange-600 selection:text-black">
      
      {/* NAVBAR SIMPLE (Para poder volver al inicio si hace falta) */}
      <nav className="border-b border-zinc-800 bg-[#121415]/80 backdrop-blur-md sticky top-0 z-[9999] p-4 flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => setView('landing')}>
          <span className="text-xl font-black italic tracking-tighter text-white">GHC ACADEMY</span>
          <span className="ml-2 text-[10px] text-orange-600 font-bold uppercase tracking-widest hidden md:inline">Sport Through Science</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setView('dashboard')} className="text-[10px] font-black uppercase tracking-tighter border border-zinc-700 px-3 py-1 hover:border-orange-600 transition-colors">Portal Alumno</button>
        </div>
      </nav>

      <main className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* 1. LANDING PAGE */}
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LandingSection onJoin={() => setView('dashboard')} />
            </motion.div>
          )}

          {/* 2. DASHBOARD */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="min-h-screen">
                 {/* Aquí pasamos una función para que cuando el alumno clicke "Empezar", cambie la vista */}
                 <DashboardSection onStartCourse={() => setView('viewer')} />
              </div>
            </motion.div>
          )}

          {/* 3. VISOR DE CURSO */}
          {view === 'viewer' && (
            <motion.div key="viewer" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}>
                <CourseViewer 
                    // @ts-ignore - Añadimos lógica para saltar al examen
                    onTakeExam={() => setView('quiz')} 
                    onBack={() => setView('dashboard')} 
                />
            </motion.div>
          )}

          {/* 4. SISTEMA DE EXÁMENES */}
          {view === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <QuizSystem />
              <button 
                onClick={() => setView('dashboard')} 
                className="fixed bottom-10 left-10 text-white bg-zinc-800 px-4 py-2 text-xs font-bold rounded"
              >
                ← VOLVER AL DASHBOARD
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        body { background-color: #121415; margin: 0; }
      `}</style>
    </div>
  );
}
