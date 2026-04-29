import React from 'react';
export const Navbar = ({ view, setView, slogan }: any) => (
  <nav className="flex justify-between items-center p-6 bg-[#121415] border-b border-zinc-800 sticky top-0 z-50">
    <div className="font-bold text-xl tracking-tighter">GHC ACADEMY</div>
    <div className="text-[10px] text-zinc-500 tracking-[0.3em] hidden md:block">{slogan}</div>
    <div className="flex gap-4">
      <button onClick={() => setView('PUBLIC')} className={`text-xs ${view === 'PUBLIC' ? 'text-orange-500' : 'text-zinc-500'}`}>INICIO</button>
      <button onClick={() => setView('STUDENT')} className={`text-xs ${view === 'STUDENT' ? 'text-orange-500' : 'text-zinc-500'}`}>ACADEMY</button>
    </div>
  </nav>
);
