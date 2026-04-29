/* 
  ARCHIVO: app/page.tsx
  DESCRIPCIÓN: Conector Maestro de GHC Academy - STITCH 2.0.
  ESTRATEGIA: SPA (Single Page Application) con navegación por estado y seguridad por URL.
*/
'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importación de Componentes
import { LandingSection } from '@/components/sections/Landing';
import { DashboardSection } from '@/components/sections/Dashboard';
import { CourseViewer } from '@/components/sections/CourseViewer';
import { QuizSystem } from '@/components/sections/QuizSystem';
import { AdminSection } from '@/components/sections/AdminPanel'; 
import { AIChatWidget } from '@/components/common/AIChatWidget';

export default function HomePage() {
  // Estado de navegación: 'landing', 'dashboard', 'viewer', 'quiz', 'admin'
  const [view, setView] = useState('landing');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Lógica de Seguridad: Acceso al Admin mediante parámetro en la URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
      setView('admin');
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-['Space_Grotesk'] overflow-x-hidden selection:bg-orange-600 selection:text-black">
      
      {/* NAVBAR TEMPORAL (Sustituye al componente Navbar que falta) */}
      <nav className="border-b border-zinc-800 bg-[#121415]/80 backdrop-blur-md sticky top-0 z-[9999] p-4 flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => setView('landing')}>
          <span className="text-xl font-black italic tracking-tighter text-white">GHC ACADEMY</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setView('dashboard')} className="text-[10px] font-black uppercase tracking-tighter border border-zinc-700 px-3 py-1 hover:border-orange-600 transition-colors">ACCESO ALUMNO</button>
        </div>
      </nav>

      <main className="relative">
        <AnimatePresence mode="wait">
          {/* 1. LANDING PAGE */}
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} >
              <LandingSection onJoin={() => setView('dashboard')} />
            </motion.div>
          )}

          {/* 2. DASHBOARD */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} >
              <DashboardSection onStartCourse={() => setView('viewer')} />
            </motion.div>
          )}

          {/* 3. VISOR DE CURSO */}
          {view === 'viewer' && (
            <motion.div key="viewer" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.4 }} >
              <CourseViewer 
                // @ts-ignore
                onTakeExam={() => setView('quiz')} 
                onBack={() => setView('dashboard')} 
              />
            </motion.div>
          )}

          {/* 4. SISTEMA DE EXÁMENES */}
          {view === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4 }} >
              <QuizSystem />
              <button 
                onClick={() => setView('dashboard')} 
                className="fixed bottom-10 left-10 text-white bg-zinc-800 px-4 py-2 text-xs font-bold rounded z-50"
              > ← VOLVER </button>
            </motion.div>
          )}

          {/* 5. PANEL DE ADMINISTRACIÓN (OCULTO) */}
          {view === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.4 }} >
              <AdminSection />
              <button 
                onClick={() => setView('landing')} 
                className="fixed bottom-10 right-10 text-black bg-orange-600 px-4 py-2 text-xs font-black rounded shadow-2xl z-50"
              > SALIR DE CONTROL </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* IA ASISTENTE 24/7 */}
      <AIChatWidget />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        body { background-color: #121415; margin: 0; }
      `}</style>
    </div>
  );
}
