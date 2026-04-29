import React from 'react';
export const DashboardSection = () => (
  <section className="p-10 text-left min-h-screen">
    <h2 className="text-3xl font-bold mb-8 italic">PORTAL DEL ALUMNO</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h3 className="text-orange-500 font-bold mb-2">MÓDULO 1</h3>
        <p className="text-sm text-zinc-400">Introducción a la Biomecánica Moderna.</p>
      </div>
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg opacity-50">
        <h3 className="text-zinc-500 font-bold mb-2">MÓDULO 2 (PRÓXIMAMENTE)</h3>
      </div>
    </div>
  </section>
);
