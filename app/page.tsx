'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importaciones con rutas relativas infalibles
import { AIChatWidget } from '../components/common/AIChatWidget';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { LandingSection } from '../components/sections/Landing';
import { DashboardSection } from '../components/sections/Dashboard';
import { AdminSection } from '../components/sections/Admin';

export default function HomePage() {
  // Estado inicial en PUBLIC
  const [currentView, setCurrentView] = useState('PUBLIC');
  const [isLoaded, setIsLoaded] = useState(false);

  // EFECTO DE ARRANQUE: Fuerza la vista pública al montar el componente
  useEffect(() => {
    setCurrentView('PUBLIC');
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-sans selection:bg-orange-600 overflow-x-hidden">
      
      {/* NAVBAR */}
      <Navbar view={currentView} setView={setCurrentView} slogan="SPORT THROUGH SCIENCE" />

      {/* SISTEMA DE NAVEGACIÓN SPA */}
      <main className="relative">
        <AnimatePresence mode="wait">
          
          {/* TIENDA / LANDING */}
          {currentView === 'PUBLIC' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LandingSection onAccess={() => setCurrentView('STUDENT')} />
            </motion.div>
          )}

          {/* PORTAL ESTUDIANTE */}
          {currentView === 'STUDENT' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <DashboardSection />
            </motion.div>
          )}

          {/* PANEL ADMIN */}
          {currentView === 'ADMIN' && (
            <motion.div
              key="admin-panel"
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

      <Footer slogan="SPORT THROUGH SCIENCE" />
      <AIChatWidget />

      <style jsx global>{`
        body { background-color: #121415; margin: 0; }
      `}</style>
    </div>
  );
}

// VERSION_FORCE_REDEPLOY_001_STORE_ACTIVE
// Esta línea final con espacios fuerza a Vercel a reconstruir todo el sitio.
