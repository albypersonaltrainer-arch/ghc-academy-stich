import Link from 'next/link';
import GHCLogo from '../components/GHCLogo';
import styles from './preventa.module.css';

export const metadata = {
  title: 'Edición Fundadora 2026 · GHC Academy',
  description:
    'Tres niveles, treinta módulos y un sistema profesional para comprender, evaluar, programar, aplicar y revisar el entrenamiento personal.',
};

const entryProfiles = [
  ['01', 'Ya trabajas en el sector', 'Actualizar, conectar y sistematizar lo que ya sabes.'],
  ['02', 'Estás estudiando', 'Conectar teoría, evaluación y práctica profesional.'],
  ['03', 'Buscas una reconversión', 'Construir una preparación estructurada desde la base.'],
  ['04', 'El entrenamiento despertó una vocación', 'Pasar de la experiencia personal al criterio profesional.'],
];

const ghcSystem = [
  ['Comprender', 'Mecanismos y contexto.'],
  ['Evaluar', 'Observar qué importa.'],
  ['Decidir', 'Priorizar con criterio.'],
  ['Programar', 'Construir una estructura.'],
  ['Aplicar', 'Convertirla en acción.'],
  ['Revisar', 'Medir y ajustar.'],
  ['Dirigir', 'Ordenar el servicio.'],
];

const levels = [
  ['Nivel 1', 'Construir la base', 'Módulos 1–10', '690 €'],
  ['Nivel 2', 'Integrar y programar', 'Módulos 11–20', '890 €'],
  ['Nivel 3', 'Aplicar, revisar y dirigir', 'Módulos 21–30', '1.090 €'],
];

const faqs = [
  ['¿Qué incluye la Edición Fundadora?', 'El pack completo: tres niveles y treinta módulos. Durante la preventa no se venderán niveles individuales.'],
  ['¿Cuándo abre la plataforma?', 'La apertura académica está prevista durante octubre de 2026. El día exacto se comunicará cuando pueda garantizarse.'],
  ['¿Es una titulación oficial?', 'No. GHC Academy es una formación privada y no equivale a una titulación oficial ni a una habilitación automática para ejercer.'],
  ['¿Habrá tutoría individual?', 'La V1 contempla soporte técnico, administrativo y académico básico. No incluye mentoría ni tutoría personalizada.'],
  ['¿Cuándo cierra la preventa?', 'El 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las cien plazas fundadoras.'],
];

export default function PreventaPage() {
  return (
    <main className={styles.page}>
      <style>{`
        .hero-v02 { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(220px,.55fr); gap:16px; min-height:650px; }
        .hero-v02-main { position:relative; min-height:650px; overflow:hidden; border:1px solid var(--ghc-border); border-radius:28px; background:#080b0a; box-shadow:var(--ghc-shadow); }
        .hero-v02-main img, .hero-v02-small img { width:100%; height:100%; display:block; object-fit:cover; }
        .hero-v02-main:after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 50%,rgba(3,4,3,.9)); }
        .hero-v02-caption { position:absolute; z-index:2; left:28px; right:28px; bottom:26px; display:grid; gap:6px; }
        .hero-v02-caption span { color:var(--ghc-green); font-size:11px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
        .hero-v02-caption strong { font-size:24px; }
        .hero-v02-side { display:grid; grid-template-rows:1fr auto; gap:16px; }
        .hero-v02-small { min-height:300px; overflow:hidden; border:1px solid var(--ghc-border); border-radius:22px; background:#080b0a; }
        .hero-v02-card { padding:24px; border:1px solid var(--ghc-border-green); border-radius:22px; background:linear-gradient(145deg,rgba(34,214,91,.08),rgba(255,255,255,.03)); }
        .hero-v02-card span { color:var(--ghc-green); font-size:11px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
        .hero-v02-card strong { display:block; margin-top:12px; font-size:20px; line-height:1.35; }
        .mini-flow { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:20px; }
        .mini-flow i { display:block; height:8px; border-radius:99px; background:rgba(34,214,91,.18); }
        .mini-flow i:nth-child(2), .mini-flow i:nth-child(3) { background:rgba(34,214,91,.48); }
        .mini-flow i:nth-child(4) { background:var(--ghc-green); }
        .price-story { width:min(1180px,calc(100% - 32px)); margin:0 auto 96px; padding:34px; border:1px solid var(--ghc-border-green); border-radius:28px; background:radial-gradient(circle at 80% 0%,rgba(34,214,91,.12),transparent 34%),linear-gradient(145deg,#0b0e0c,#050706); box-shadow:var(--ghc-shadow); }
        .price-story-head { display:grid; grid-template-columns:1fr auto; gap:30px; align-items:end; }
        .price-story-head h2 { margin:0; font-size:clamp(38px,5vw,68px); letter-spacing:-.055em; line-height:.95; }
        .price-story-head p { max-width:430px; margin:0; color:var(--ghc-muted); line-height:1.7; }
        .price-levels { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:34px; }
        .price-level { padding:20px; border:1px solid var(--ghc-border); border-radius:18px; background:rgba(255,255,255,.035); }
        .price-level span { color:var(--ghc-muted-2); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
        .price-level strong { display:block; margin-top:8px; font-size:30px; }
        .price-arrow { display:grid; grid-template-columns:1fr auto 1fr auto 1.1fr; gap:14px; align-items:center; margin-top:18px; }
        .price-node { padding:22px; border-radius:18px; border:1px solid var(--ghc-border); background:rgba(255,255,255,.03); }
        .price-node.featured { border-color:var(--ghc-border-green); background:rgba(34,214,91,.07); }
        .price-node span { display:block; color:var(--ghc-muted-2); font-size:11px; text-transform:uppercase; letter-spacing:.12em; }
        .price-node strong { display:block; margin-top:8px; font-size:clamp(30px,4vw,54px); }
        .price-node del { display:block; margin-top:8px; color:var(--ghc-muted-2); }
        .price-chevron { color:var(--ghc-green); font-size:28px; }
        .price-savings { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
        .price-savings span { padding:9px 13px; border-radius:999px; background:rgba(34,214,91,.1); color:var(--ghc-green); font-size:12px; font-weight:900; }
        .authority-stat { display:grid; place-items:center; min-height:360px; border:1px solid var(--ghc-border-green); border-radius:28px; background:radial-gradient(circle,rgba(34,214,91,.12),transparent 60%); text-align:center; }
        .authority-stat strong { display:block; color:var(--ghc-text); font-size:clamp(76px,10vw,150px); line-height:.8; letter-spacing:-.08em; }
        .authority-stat span { display:block; margin-top:22px; color:var(--ghc-green); font-size:13px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
        @media (max-width:900px) {
          .hero-v02 { grid-template-columns:1fr; min-height:auto; }
          .hero-v02-main { min-height:520px; }
          .hero-v02-side { grid-template-columns:1fr 1fr; grid-template-rows:auto; }
          .hero-v02-small { min-height:240px; }
          .price-story-head, .price-arrow { grid-template-columns:1fr; }
          .price-chevron { transform:rotate(90deg); text-align:center; }
          .price-levels { grid-template-columns:1fr; }
        }
        @media (max-width:620px) {
          .hero-v02-side { grid-template-columns:1fr; }
          .hero-v02-main { min-height:420px; }
          .price-story { padding:24px; }
        }
      `}</style>

      <div className={styles.internalBanner} role="status">
        <strong>Borrador interno</strong>
        <span>No publicar ni cobrar hasta superar los Gates jurídico, técnico y económico.</span>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="Ir a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.editionTag}>
          <span className={styles.liveDot} />
          Edición Fundadora 2026 · 100 plazas
        </div>
        <a href="#precio" className={styles.headerCta}>Ver precio fundador</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>De acumular conocimientos a saber decidir</p>
          <h1>No necesitas más información.<span>Necesitas aprender a decidir.</span></h1>
          <p className={styles.heroLead}>
            Formación integral y aplicada para iniciarte, actualizarte o desarrollarte profesionalmente en el entrenamiento personal.
          </p>
          <p className={styles.heroSupport}>Tres niveles. Treinta módulos. Un sistema para comprender, evaluar, programar, aplicar y revisar.</p>
          <div className={styles.heroActions}>
            <a href="#precio" className={styles.primaryCta}>Ver Edición Fundadora</a>
            <a href="#recorrido" className={styles.secondaryCta}>Explorar el recorrido</a>
          </div>
          <div className={styles.heroFacts}>
            <div><strong>3</strong><span>Niveles</span></div>
            <div><strong>30</strong><span>Módulos</span></div>
            <div><strong>100</strong><span>Plazas</span></div>
          </div>
        </div>

        <div className="hero-v02" aria-label="Entrenamiento y análisis profesional">
          <figure className="hero-v02-main">
            <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=88" alt="Profesional supervisando una sesión de entrenamiento" />
            <figcaption className="hero-v02-caption">
              <span>Evaluar antes de prescribir</span>
              <strong>Criterio aplicado a personas reales</strong>
            </figcaption>
          </figure>
          <div className="hero-v02-side">
            <figure className="hero-v02-small">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=86" alt="Análisis de datos de rendimiento" />
            </figure>
            <div className="hero-v02-card">
              <span>Sistema GHC</span>
              <strong>Observar → priorizar → decidir → revisar</strong>
              <div className="mini-flow" aria-hidden="true"><i /><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>El problema real</p><h2>Saber cosas sueltas no garantiza saber qué hacer.</h2></div>
        <div className={styles.problemGrid}>
          <div className={styles.problemText}>
            <p>Puedes conocer anatomía, ejercicios o programación y seguir sin saber qué observar, qué priorizar o cómo adaptar una decisión a una persona real.</p>
            <p>GHC Academy ordena ese proceso: comprender antes de aplicar, priorizar antes de acumular y revisar antes de repetir.</p>
          </div>
          <div className={styles.questionPanel}>
            {['¿Qué debo evaluar?','¿Qué es prioritario?','¿Cómo adapto el programa?','¿Cuándo debo ajustar?','¿Cuándo debo derivar?','¿Cómo documento el proceso?'].map((q)=><div key={q}><span>+</span><strong>{q}</strong></div>)}
          </div>
        </div>
      </section>

      <section className={styles.entrySection}>
        <div className={styles.sectionIntroRow}><div><p className={styles.eyebrow}>Cuatro puertas de entrada</p><h2>Distintos puntos de partida. Un mismo destino profesional.</h2></div><p>Lo que une a estos perfiles es la intención seria de estudiar, comprender y asumir la responsabilidad de trabajar con otras personas.</p></div>
        <div className={styles.entryGrid}>
          {entryProfiles.map(([number,title,result])=><article key={number} className={styles.entryCard}><span className={styles.cardNumber}>{number}</span><h3>{title}</h3><strong>{result}</strong></article>)}
        </div>
      </section>

      <section className={styles.systemSection} id="recorrido">
        <div className={styles.sectionIntroCenter}><p className={styles.eyebrow}>El mecanismo</p><h2>Una secuencia de decisiones, no una colección de rutinas.</h2></div>
        <div className={styles.systemTrack}>
          {ghcSystem.map(([title,text],index)=><article key={title} className={styles.systemStep}><span>{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className={styles.levelSection}>
        <div className={styles.sectionIntroRow}><div><p className={styles.eyebrow}>El recorrido completo</p><h2>Tres niveles conectados. Treinta módulos. Una progresión.</h2></div><p>Los niveles forman parte del producto desde la apertura; el avance depende del progreso del alumno.</p></div>
        <div className={styles.levelGrid}>
          {levels.map(([label,title,marker,price],index)=><article key={label} className={styles.levelCard}><div className={styles.levelTopline}><span>{label}</span><strong>{marker}</strong></div><div className={styles.levelIndex}>{index+1}</div><h3>{title}</h3><p>Precio individual futuro: <strong>{price}</strong></p></article>)}
        </div>
      </section>

      <section className="price-story" id="precio">
        <div className="price-story-head">
          <div><p className={styles.eyebrow}>Arquitectura de precio</p><h2>La ventaja fundadora se entiende de un vistazo.</h2></div>
          <p>Durante la preventa se ofrece únicamente el pack completo. Los precios individuales sirven para mostrar el valor acumulado de los tres niveles.</p>
        </div>
        <div className="price-levels">
          {levels.map(([label,title,,price])=><div className="price-level" key={label}><span>{label} · {title}</span><strong>{price}</strong></div>)}
        </div>
        <div className="price-arrow" aria-label="Comparación de precios">
          <div className="price-node"><span>Valor por separado</span><strong>2.670 €</strong></div>
          <div className="price-chevron">→</div>
          <div className="price-node"><span>Pack completo oficial</span><strong>2.290 €</strong></div>
          <div className="price-chevron">→</div>
          <div className="price-node featured"><span>Primeras 100 plazas</span><strong>1.690 €</strong><del>2.290 €</del></div>
        </div>
        <div className="price-savings"><span>Ahorras 600 € frente al pack oficial</span><span>Ahorras 980 € frente a los niveles separados</span><span>37 % menos que el valor individual acumulado</span></div>
      </section>

      <section className={styles.evaluationSection}>
        <div><p className={styles.eyebrow}>Aprendizaje y evaluación</p><h2>El progreso debe demostrarse, no presumirse.</h2><p>El modelo contempla avance secuencial, evaluación por módulo y certificados privados verificables.</p><div className={styles.legalNote}><strong>Naturaleza privada</strong><span>No constituye una titulación oficial ni una habilitación administrativa automática.</span></div></div>
        <div className={styles.scoreCard}><span>Umbral académico diseñado</span><strong>80 %</strong><p>por módulo</p><div className={styles.scoreTrack}><i /></div><small>Flujo pendiente de validación técnica extremo a extremo.</small></div>
      </section>

      <section className={styles.authoritySection}>
        <div className="authority-stat" aria-label="Más de treinta años de experiencia"><div><strong>30+</strong><span>años de experiencia</span></div></div>
        <div><p className={styles.eyebrow}>Dirección académica</p><h2>Ciencia aplicada y experiencia real.</h2><p>Alby Aguiar, fundador de GHC Training, dirige el proyecto desde una trayectoria de más de treinta años vinculada al entrenamiento, el rendimiento, la gestión de servicios y el trabajo con personas con necesidades diferentes.</p><p>Su enfoque prioriza comprender el cómo y el porqué: mecanismos antes que dogmas y decisiones antes que recetas.</p></div>
      </section>

      <section className={styles.paymentSection}>
        <div className={styles.sectionIntroCenter}><p className={styles.eyebrow}>Edición Fundadora</p><h2>1.690 € para las primeras 100 plazas.</h2><p>La matrícula y los enlaces de pago seguirán desactivados hasta superar los Gates jurídico, técnico y operativo.</p></div>
        <div className={styles.paymentGrid}>
          <article className={styles.paymentCardFeatured}><span className={styles.paymentLabel}>Mejor condición económica</span><h3>Pago único</h3><strong>1.690 €</strong><p>Pack completo de tres niveles y treinta módulos.</p><button type="button" disabled>Matrícula pendiente de apertura</button></article>
          <article className={styles.paymentCard}><span className={styles.paymentLabel}>Modalidad alternativa</span><h3>50 % + 50 %</h3><strong>Importe final pendiente</strong><p>Segundo pago previsto quince días después del primero. El total fraccionado se fijará en el Gate económico.</p><button type="button" disabled>Modalidad pendiente</button></article>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionIntroRow}><div><p className={styles.eyebrow}>Preguntas esenciales</p><h2>Claridad antes de contratar.</h2></div><p>Las condiciones contractuales definitivas se incorporarán tras la revisión jurídica.</p></div>
        <div className={styles.faqList}>{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className={styles.finalSection}><div><p className={styles.eyebrow}>Primera generación</p><h2>Orden, criterio y responsabilidad profesional.</h2><p>Preventa hasta el 15 de septiembre de 2026 o hasta completar cien plazas.</p></div><a href="#precio" className={styles.primaryCta}>Revisar oferta fundadora</a></section>

      <footer className={styles.footer}><GHCLogo size="sm" showText tagline /><p>GHC Academy · Formación privada online · Textos legales y contratación pendientes de validación final.</p><div><span>Aviso legal · Pendiente</span><span>Privacidad · Pendiente</span><span>Condiciones · Pendiente</span></div></footer>
    </main>
  );
}
