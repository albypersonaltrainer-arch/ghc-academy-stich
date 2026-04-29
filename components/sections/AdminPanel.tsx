import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, TrendingUp, ShieldAlert, ShieldCheck, ExternalLink, Search, Filter, Handshake, BarChart3, Activity, ArrowUpRight } from 'lucide-react';

export const AdminSection = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Ventas Totales', value: '€24,590', change: '+12.5%', icon: <DollarSign size={20} /> },
    { label: 'Alumnos Activos', value: '1,240', change: '+5.2%', icon: <Users size={20} /> },
    { label: 'Tasa de Conversión', value: '3.8%', change: '+0.4%', icon: <TrendingUp size={20} /> },
    { label: 'Comisiones Afiliados', value: '€4,120', change: '+8.1%', icon: <Handshake size={20} /> },
  ];

  const students = [
    { id: '1', name: 'JUAN PÉREZ', email: 'juan@demo', status: 'ACTIVE', progress: '67%', joinDate: '2024-03-10' },
    { id: '2', name: 'MARÍA GARCÍA', email: 'maria@demo', status: 'LOCKED', progress: '12%', joinDate: '2024-03-12' },
    { id: '3', name: 'CARLOS RUIZ', email: 'carlos@demo', status: 'ACTIVE', progress: '94%', joinDate: '2024-02-28' },
    { id: '4', name: 'ELENA SANZ', email: 'elena@demo', status: 'ACTIVE', progress: '45%', joinDate: '2024-03-15' },
  ];

  const affiliates = [
    { name: 'Elite Fitness Group', code: 'EFG20', sales: 42, revenue: '€8,358', commission: '15%' },
    { name: 'Dr. Sergio Méndez', code: 'BIOSTAT', sales: 28, revenue: '€5,572', commission: '10%' },
    { name: 'Performance Lab ES', code: 'PLAB', sales: 15, revenue: '€2,985', commission: '12%' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0e0f] text-zinc-100 font-['Space_Grotesk'] p-6 lg:p-10">
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <span className="text-orange-600 font-black tracking-widest text-[10px] uppercase mb-2 block">SISTEMA DE CONTROL CENTRAL</span>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">ADMIN TERMINAL V.2.04</h1>
        </div>
        <div className="flex bg-zinc-900/50 border border-zinc-800 p-1 rounded-lg">
          {['overview', 'students', 'affiliates'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${ activeTab === tab ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(255,95,0,0.3)]' : 'text-zinc-500 hover:text-white' }`} >
              {tab === 'overview' ? 'MÉTRICAS' : tab === 'students' ? 'ALUMNOS' : 'AFILIADOS'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10" >
            {/* GRID DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-orange-600/30 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-zinc-950 text-orange-600 border border-zinc-800 rounded-lg group-hover:bg-orange-600 group-hover:text-black transition-all">
                      {stat.icon}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* GRÁFICO Y ACTIVIDAD */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-8 h-[400px] flex flex-col">
                <h3 className="font-black italic uppercase tracking-tight flex items-center gap-2 mb-8">
                  <BarChart3 size={18} className="text-orange-600" /> RENDIMIENTO DE VENTAS (30D)
                </h3>
                <div className="flex-1 flex items-end gap-2 px-2 pb-2 border-b border-zinc-800/50">
                  {[40, 65, 45, 90, 55, 75, 40, 85, 100, 60, 80, 95].map((h, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} className="flex-1 bg-orange-600 opacity-20 hover:opacity-100 transition-all cursor-pointer" />
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <h3 className="font-black italic uppercase tracking-tight mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-orange-600" /> EVENTOS CRÍTICOS
                </h3>
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-l-2 border-orange-600/20 pl-4 py-1 hover:border-orange-600 transition-colors">
                      <p className="text-xs font-bold text-zinc-200 uppercase">Nueva Inscripción Élite</p>
                      <p className="text-[10px] text-zinc-500">Ref: EFG20</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="text" placeholder="BUSCAR ALUMNO..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-xs font-bold text-white focus:outline-none focus:border-orange-600" />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-xs font-black uppercase tracking-widest"><Filter size={14} /> FILTRAR</button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <th className="p-6">ALUMNO</th>
                  <th className="p-6">ESTADO</th>
                  <th className="p-6">PROGRESO</th>
                  <th className="p-6 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all">
                    <td className="p-6 leading-tight">
                      <p className="text-xs font-black italic uppercase tracking-tight">{student.name}</p>
                      <p className="text-[10px] text-zinc-500">{student.email}</p>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase ${student.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{student.status}</span>
                    </td>
                    <td className="p-6 text-xs font-black italic">{student.progress}</td>
                    <td className="p-6 text-right flex justify-end gap-3">
                      <button className="p-2 bg-zinc-800 rounded hover:bg-red-600 transition-all"><ShieldAlert size={16} /></button>
                      <button className="p-2 bg-zinc-800 rounded hover:bg-emerald-600 transition-all"><ShieldCheck size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'affiliates' && (
          <motion.div key="affiliates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
               <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 font-black italic">RANKING DE COMERCIALES</div>
               <table className="w-full text-left">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-500 font-black tracking-widest uppercase">
                    <tr><th className="p-6">AFILIADO</th><th className="p-6">VENTAS</th><th className="p-6">FACTURADO</th></tr>
                  </thead>
                  <tbody>
                    {affiliates.map((aff, i) => (
                      <tr key={i} className="border-b border-zinc-800/50"><td className="p-6 font-black">{aff.name}</td><td className="p-6">{aff.sales}</td><td className="p-6 italic">{aff.revenue}</td></tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div className="bg-orange-600 rounded-xl p-8 text-black shadow-2xl">
              <h4 className="font-black italic text-xl mb-4">LIQUIDACIÓN</h4>
              <div className="text-4xl font-black italic mb-8">€1,425.50</div>
              <button className="w-full bg-black text-white py-4 text-xs font-black uppercase flex items-center justify-center gap-2">APROBAR PAGOS CSV <ArrowUpRight size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
