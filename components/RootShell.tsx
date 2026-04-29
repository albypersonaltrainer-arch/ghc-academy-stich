import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

// NOTA: Estos componentes se crearán en los siguientes pasos
// Por ahora el Shell gestiona la visibilidad
export default function RootShell({ initialView = 'PUBLIC' }) {
  // Lógica de Estado SPA para evitar recargas de página y pantallas en blanco
  const [currentView, setCurrentView] = useState(initialView); // 'PUBLIC', 'STUDENT', 'ADMIN'

  return (
    <div className="min-h-screen bg-[#121415] text-zinc-100 font-sans overflow-x-hidden">
      
      {/* NAVBAR PÚBLICA / ALUMNO */}
      <Navbar view={currentView} setView={setCurrentView} slogan="SPORT THROUGH SCIENCE" />

      {/* CONTENEDOR PRINCIPAL CON LÓGICA DE VISIBILIDAD CSS */}
      <main className="relative pt-20 pb-12">
        
        {/* SECCIÓN PÚBLICA (LANDING/TIENDA) */}
        <div className={currentView === 'PUBLIC' ? 'block opacity-100 transition-opacity duration-500' : 'hidden'}>
          <section className="px-6 py-20 text-center">
            <h2 className="text-5xl font-black italic mb-4 uppercase tracking-tighter text-orange-600">
              Eleva tu Rendimiento
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
              Academia premium de preparación física y biomecánica basada en evidencia científica.
            </p>
            <button 
              onClick={() => setCurrentView('STUDENT')}
              className="bg-orange-600 text-black font-black py-4 px-8 uppercase tracking-widest hover:bg-orange-500 transition-colors"
            >
              Ver Cursos Disponibles
            </button>
          </section>
        </div>

        {/* SECCIÓN ESTUDIANTE (DASHBOARD) */}
        <div className={currentView === 'STUDENT' ? 'block opacity-100 transition-opacity duration-500' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-8">Mis Estudios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
                  <div className="h-40 bg-zinc-800 mb-4 rounded flex items-center justify-center text-zinc-600 font-bold uppercase">Curso {i}</div>
                  <h3 className="font-bold text-lg mb-2">Biomecánica de la Carrera Nivel {i}</h3>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-600 h-full w-1/3"></div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">35% Completado</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECCIÓN ADMIN (ZONA OCULTA) */}
        <div className={currentView === 'ADMIN' ? 'block opacity-100' : 'hidden'}>
          <div className="max-w-7xl mx-auto px-6 bg-zinc-900 border border-orange-600/20 p-8 rounded-xl">
            <h2 className="text-2xl font-black text-orange-600 mb-6 uppercase tracking-widest">Panel de Control Admin</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-800 rounded">Alumnos: 1,240</div>
              <div className="p-4 bg-zinc-800 rounded">Ventas hoy: 450€</div>
              <div className="p-4 bg-zinc-800 rounded">Referidos: 12</div>
              <div className="p-4 bg-zinc-800 rounded">Afiliados ACT: 5</div>
            </div>
          </div>
        </div>

      </main>

      <Footer slogan="SPORT THROUGH SCIENCE" />
    </div>
  );
}

function Navbar({ view, setView, slogan }) {
  return (
    <nav className="fixed top-0 w-full z-[9999] bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black italic tracking-widest text-orange-600 cursor-pointer" onClick={() => setView('PUBLIC')}>
          GHC ACADEMY
        </h1>
        <span className="hidden md:block text-[10px] tracking-[0.2em] text-zinc-500 uppercase font-bold">
          {slogan}
        </span>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <button onClick={() => setView('PUBLIC')} className={view === 'PUBLIC' ? 'text-orange-500' : 'hover:text-white'}>Tienda</button>
          <button onClick={() => setView('STUDENT')} className={view === 'STUDENT' ? 'text-orange-500' : 'hover:text-white'}>Mis Estudios</button>
        </div>

        {/* Selector de Idioma (Maqueta) */}
        <div className="flex gap-2 text-[10px] font-bold border border-zinc-800 px-2 py-1 rounded">
          <span className="text-orange-500 cursor-pointer">ES</span>
          <span className="text-zinc-600">|</span>
          <span className="hover:text-white cursor-pointer">EN</span>
        </div>

        {/* El botón de Admin es invisible, tú lo activas por código o entrando en /admin */}
        {view === 'ADMIN' ? (
          <span className="text-[10px] bg-red-600 px-2 py-1 rounded font-black">MODO ADMIN</span>
        ) : (
          <button 
            onClick={() => setView('STUDENT')}
            className="bg-orange-600 hover:bg-orange-500 text-black px-4 py-2 text-xs font-black uppercase tracking-tighter transition-all"
          >
            Acceso
          </button>
        )}
      </div>
    </nav>
  );
}

function Footer({ slogan }) {
  return (
    <footer className="border-t border-zinc-900 py-12 bg-black px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-orange-600 font-black italic text-xl">GHC ACADEMY</div>
        <div className="text-[10px] tracking-widest text-zinc-600 uppercase">{slogan}</div>
        <div className="text-zinc-700 text-[10px] uppercase">© 2026 Todos los derechos reservados</div>
      </div>
    </footer>
  );
}
