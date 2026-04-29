'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Database, Zap, ArrowUpRight, Activity, ShieldCheck, Globe } from 'lucide-react';

export const AdminSection = () => {
  const stats = [
    { label: 'USUARIOS TOTALES', value: '1,284', change: '+12%', icon: Users, color: 'text-orange-600' },
    { label: 'INGRESOS NETOS', value: '€42,850', change: '+8%', icon: Activity, color: 'text-white' },
    { label: 'CARGA SERVIDOR', value: '14.2%', change: 'OPTIMAL', icon: Zap, color: 'text-orange-600' },
    { label: 'DB UPTIME', value: '99.9%', change: 'SECURE', icon: ShieldCheck, color: 'text-white' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0b] pt-32 pb-20 px-8 text-zinc-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera Técnica */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16 border-b border-zinc-900 pb-12">
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 bg-orange-600 animate-pulse rounded-full"></span>
              <span className="text-zinc-600 text-[9px] tracking-[0.5em] font-black uppercase italic italic">Control de Infraestructura v2.0</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-[950] italic tracking-tighter leading-none uppercase">
              BACK<span className="text-orange-600">OFFICE</span>
            </h2>
            <p className="text-zinc-700 text-xs font-bold mt-4 tracking-widest uppercase opacity-50">GHC Academy Management System</p>
          </div>

          <div className="flex gap-4">
             <button className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-3 hover:border-orange-600/50 transition-all">
                <Globe size={18} className="text-zinc-500" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Ver Sitio Público</span>
             </button>
             <button className="bg-orange-600 text-white p-4 rounded-xl flex items-center gap-3 shadow-lg shadow-orange-900/20">
                <Settings size={18} />
                <span className="text-[10px] font-black uppercase tracking-tighter">Configuración</span>
             </button>
          </div>
        </header>

        {/* Dashboard de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-3xl group hover:border-zinc-800 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 bg-zinc-800 rounded-xl ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <span className="text-orange-600 flex items-center gap-1 text-[10px] font-black italic">
                   {stat.change} <ArrowUpRight size={12} />
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-1">
                {stat.label}
              </span>
              <span className="text-3xl font-black italic tracking-tighter text-white">
                {stat.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Sección de Monitorización y Usuarios */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-zinc-900/20 border border-zinc-900 rounded-3xl p-10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-[900] italic uppercase tracking-tighter">Últimos Alumnos Registrados</h3>
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Ver todos</span>
            </div>
            
            <div className="space-y-4">
              {[1,2,3].map((u) => (
                <div key={u} className="flex items-center justify-between p-5 border-b border-zinc-900/50 hover:bg-zinc-900/40 transition-all rounded-xl cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center font-black italic text-zinc-500">
                      U
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm uppercase">Usuario_ID_00{u}</h4>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase italic">Registrado hace 24h</span>
                    </div>
                  </div>
                  <div className="text-right px-4 py-1.5 bg-orange-600/5 border border-orange-600/20 rounded-full">
                    <span className="text-[9px] text-orange-600 font-[950] italic uppercase tracking-tighter">Plan Elite</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <div className="bg-orange-600 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Database size={100} />
                </div>
                <h3 className="text-white font-[950] italic uppercase tracking-tighter text-2xl mb-2">Backups Diarios</h3>
                <p className="text-orange-100 text-[10px] font-bold uppercase mb-6 opacity-70 italic">Sincronización completa con Prisma</p>
                <div className="flex items-center gap-2 text-white font-black text-[13px] italic tracking-tighter bg-orange-700/50 p-4 rounded-xl border border-orange-400/20">
                  ESTADO: CONECTADO
                </div>
             </div>
             
             <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <h3 className="text-zinc-500 font-extrabold uppercase tracking-widest text-[10px] mb-6">Mantenimiento Global</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300 italic">Borrar Caché</span>
                      <button className="text-orange-600 font-black text-[10px] uppercase tracking-tighter">Ejecutar</button>
                   </div>
                   <div className="h-[1px] bg-zinc-800 w-full" />
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300 italic">Cerrar Sesiones</span>
                      <button className="text-orange-600 font-black text-[10px] uppercase tracking-tighter">Forzar</button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
