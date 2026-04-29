import React from 'react';

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '2px', borderBottom: '2px solid #fff', paddingBottom: '10px' }}>
          GHC ACADEMY
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '10px', fontStyle: 'italic' }}>
          "SPORT THROUGH SCIENCE"
        </p>
      </header>
      
      <main style={{ maxWidth: '600px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>STITCH 2.0: La Nueva Era de la Biomecánica</h2>
        <p style={{ lineHeight: '1.6', color: '#ccc', marginBottom: '30px' }}>
          Estamos preparando el lanzamiento de la plataforma de formación en biomecánica más avanzada del mercado. 
          Ciencia, tecnología e inteligencia artificial aplicadas al rendimiento deportivo.
        </p>
        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
          <p>Próximamente disponible en: <strong>ghcacademy.net</strong></p>
        </div>
      </main>

      <footer style={{ marginTop: '50px', fontSize: '0.8rem', color: '#555' }}>
        © 2026 GHC Academy. Todos los derechos reservados.
      </footer>
    </div>
  );
}
