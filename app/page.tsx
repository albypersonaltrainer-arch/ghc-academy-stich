'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Beaker, 
  ShieldAlert, 
  Wifi, 
  Activity, 
  Terminal, 
  ChevronRight, 
  BarChart3, 
  Microscope, 
  Dna 
} from 'lucide-react';

/
 * GHC ACADEMY - UNIFIED TACTICAL CONSOLE
 * app/page.tsx // Versión Directa para Vercel
 */ 

const ACADEMY_DATA = {
  version: "V3.2.4",
  latency: "12MS",
  status: "ACTIVE",
  protocols: [
    { 
      id: "01", 
      code: "CORE", 
      title: "BIOMECÁNICA DE ÉLITE", 
      description: "Advanced kinetic analysis protocol. Calibration of muscular output and joint stability under extreme load parameters.", 
      price: "199€", 
      accent: "#00FF41", 
      image: "https://images.unsplash.com/photo-1541252260730-0309964d7529?q=80&w=1287&auto=format&fit=crop" 
    },
    { id: "02", code: "TECH", title: "TECNIFICACIÓN", stats: [40, 65, 30, 80, 50, 95] },
    { id: "03", code: "CHEM", title: "NUTRICIÓN / FARMACOLOGÍA", icon: <Beaker size={20} /> },
    { id: "04", code: "METABOLIC", title: "SALUD METABÓLICA", icon: <Dna size={20} /> }
  ]
};

export default function Page() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [isMounted, setIsMounted] = useState(false);

  // Seguridad para evitar errores de compilación en Vercel (Hydration Fix)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="bg-[#121415] min-
