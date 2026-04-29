import React from 'react';
export const LandingSection = ({ onAccess }: any) => (
  <section className="py-20 px-4 text-center">
    <h2 className="text-5xl font-bold mb-6">BIOMECÁNICA <span className="text-orange-600">REDISEÑADA</span></h2>
    <p className="text-zinc-400 max-w-2xl mx-auto mb-10">La nueva era de la formación deportiva basada en ciencia e inteligencia artificial.</p>
    <button onClick={onAccess} className="bg-white text-black px-8 py-3 font-bold rounded-full hover:bg-orange-600 transition-colors">ACCESO ALUMNO</button>
  </section>
);
