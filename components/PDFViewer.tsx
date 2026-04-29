import React from 'react';

export default function PDFViewer({ pdfUrl, userEmail, userName }) {
  const watermarkText = `${userName} - ${userEmail} - ${new Date().toLocaleDateString()}`;

  return (
    <div className="relative w-full h-[600px] bg-zinc-900 overflow-hidden select-none border border-zinc-800 rounded-lg">
      
      {/* CAPA DE MARCA DE AGUA REPETITIVA */}
      <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 gap-8 opacity-5">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex items-center justify-center -rotate-45 text-[10px] whitespace-nowrap font-bold">
            {watermarkText}
          </div>
        ))}
      </div>

      {/* OVERLAY TRANSPARENTE (EVITA CLIC DERECHO Y SELECCIÓN) */}
      <div 
        className="absolute inset-0 z-20" 
        onContextMenu={(e) => e.preventDefault()}
      ></div>

      {/* VISOR DE PDF (IFRAME O EMBED) */}
      <iframe 
        src={`${pdfUrl}#toolbar=0`} 
        className="w-full h-full border-none z-0"
        title="Contenido del Curso"
      ></iframe>

    </div>
  );
}
