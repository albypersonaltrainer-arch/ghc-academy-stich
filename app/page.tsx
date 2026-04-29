'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importaciones de tus piezas premium
import { AIChatWidget } from '../components/common/AIChatWidget';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { LandingSection } from '../components/sections/Landing';
import { DashboardSection } from '../components/sections/Dashboard';
import { AdminSection } from '../components/sections/Admin';

export default function HomePage() {
  // CONFIGURACIÓN INICIAL: Arranca en la Tienda Pública
  const [currentView, setCurrentView] = useState('PUBLIC');
  const [isLoaded, setIsLoaded] = useState(false);

  // Evitar parpadeos de carga
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-sans selection:bg-orange-600 overflow-x-hidden">
      
      {/* MENÚ DE NAVEGACIÓN (Cambia el estado de la vista) */}
      <Navbar view={currentView} setView={setCurrentView} slogan="SPORT THROUGH SCIENCE" />

      {/* CORE DE LA ACADEMIA: Transiciones entre secciones */}
      <main className="relative">
        <AnimatePresence mode="wait">
          
          {/* 1. MUESTRA LA TIENDA Y LANDING POR DEFECTO */}
          {currentView === 'PUBLIC' && (
            <motion.div
              key="public"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LandingSection onAccess={() => setCurrentView('STUDENT')} />
            </motion.div>
          )}

          {/* 2. PORTAL DEL ALUMNO (Se activa al comprar o entrar) */}
          {currentView === 'STUDENT' && (
            <motion.div
              key="student"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <DashboardSection />
            </motion.div>
          )}

          {/* 3. PANEL DE ADMINISTRACIÓN (Acceso de control) */}
          {currentView === 'ADMIN' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
            >
              <AdminSection />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* PIE DE PÁGINA */}
      <Footer slogan="SPORT THROUGH SCIENCE" />

      {/* ASISTENTE INTELIGENTE STITCH 2.0 */}
      <AIChatWidget />

      <style jsx global>{`
        body { 
          background-color: #121415; 
          margin: 0; 
          -webkit-font-smoothing: antialiased;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
