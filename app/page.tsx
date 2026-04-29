'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Estas son las rutas "infalibles"
import { AIChatWidget } from '../components/common/AIChatWidget';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { LandingSection } from '../components/sections/Landing';
import { DashboardSection } from '../components/sections/Dashboard';
import { AdminSection } from '../components/sections/Admin';

export default function HomePage() {
  const [currentView, setCurrentView] = useState('PUBLIC');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="bg-[#121415] min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-sans selection:bg-orange-600">
      
      <Navbar view={currentView} setView={setCurrentView} slogan="SPORT THROUGH SCIENCE" />

      <main className="relative">
        <AnimatePresence mode="wait">
          
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

      <Footer slogan="SPORT THROUGH SCIENCE" />
      <AIChatWidget />

      <style jsx global>{`
        body { background-color: #121415; margin: 0; overflow-x: hidden; }
      `}</style>
    </div>
  );
}
