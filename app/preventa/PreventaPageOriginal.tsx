import Link from 'next/link';
import GHCLogo from '../components/GHCLogo';
import styles from './preventa.module.css';

export const metadata = {
  title: 'Programa Profesional de Entrenamiento Personal · GHC Academy',
  description:
    'Formación completa para convertirte en entrenador personal o llevar tu preparación mucho más lejos: anatomía, fisiología, kinesiología, nutrición, evaluación, programación, poblaciones especiales, negocio y dirección profesional.',
};

const entryProfiles = [
  [
    '01',
    'Quieres convertirte en entrenador personal',
    'Buscas una base sólida antes de trabajar con clientes: entender el cuerpo, valorar, programar, adaptar y saber hasta dónde llega tu responsabilidad profesional.',
  ],
  [
    '02',
    'Ya eres entrenador personal',
    'Ya trabajas con clientes y quieres ampliar recursos, conectar mejor lo que sabes y resolver con más seguridad los casos que no encajan en una receta.',
  ],
];

const knowledgeAreas = [
  ['01', 'Anatomía y kinesiología', 'Comprender estructuras, articulaciones, músculo, tejido conjuntivo, control neural y movimiento para interpretar mejor lo que ocurre en una persona real.'],
  ['02', 'Fisiología y adaptación', 'Entender cómo responden los sistemas cardiovascular, respiratorio, nervioso, endocrino y metabólico al esfuerzo, la fatiga y la recuperación.'],
  ['03', 'Evaluación y toma de decisiones', 'Aprender qué preguntar, qué observar, qué medir, qué priorizar y cuándo reevaluar para que cada decisión tenga una razón.'],
  ['04', 'Entrenamiento y programación', 'Dominar principios, fuerza, hipertrofia, resistencia, periodización, carga, recuperación y progresión para construir procesos coherentes.'],
  ['05', 'Nutrición y composición corporal', 'Integrar nutrición general, hidratación, suplementos, composición corporal y salud metabólica con criterio y dentro del alcance profesional.'],
  ['06', 'Salud, dolor y poblaciones especiales', 'Saber adaptar el entrenamiento ante edad, obesidad, diabetes, enfermedad cardiovascular o respiratoria, embarazo, dolor persistente y otras situaciones complejas.'],
  ['07', 'Persona, adherencia y comunicación', 'Entender conducta, motivación, adherencia, experiencia de cliente y comunicación para que el mejor programa también pueda sostenerse en la vida real.'],
  ['08', 'Profesión, negocio y dirección', 'Aprender posicionamiento, venta consultiva, precios, procesos, liderazgo, riesgo, evidencia, tecnología e IA para construir y dirigir un servicio profesional completo.'],
];

const ghcSystem = [
  ['Aprender', 'Incorporar conocimientos sólidos y actuales.'],
  ['Comprender', 'Entender mecanismos, no solo memorizar conceptos.'],
  ['Relacionar', 'Conectar áreas que normalmente se estudian por separado.'],
  ['Evaluar', 'Recoger la información que realmente puede cambiar una decisión.'],
  ['Decidir', 'Elegir qué tiene más sentido para esa persona y ese momento.'],
  ['Aplicar', 'Convertir el conocimiento en acciones concretas y explicables.'],
  ['Revisar', 'Comprobar la respuesta y cambiar el rumbo cuando sea necesario.'],
];

const levels = [
  [
    'Nivel 1',
    'Construir la base profesional',
    'Base profesional',
    '690 €',
    'Construyes los fundamentos que necesitas para dejar de trabajar por intuición: cuerpo, movimiento, fisiología, evaluación, programación, nutrición, técnica, seguridad y responsabilidad profesional.',
  ],
  [
    'Nivel 2',
    'Profundizar, programar y adaptar',
    'Aplicación avanzada',
    '890 €',
    'Aprendes a llevar esa base a objetivos y situaciones más complejas: fuerza, hipertrofia, resistencia, periodización, recuperación, poblaciones especiales y adaptación del entrenamiento.',
  ],
  [
    'Nivel 3',
    'Convertirte en un profesional completo',
    'Integración profesional',
    '1.090 €',
    'Integras la parte humana y profesional para prestar un servicio más sólido: adherencia, comunicación, experiencia de cliente, negocio, liderazgo, evidencia, tecnología, IA y dirección estratégica.',
  ],
];

const decisionShifts = [
  ['De', 'Estudiar conceptos como piezas sueltas', 'A', 'Entender cómo se relacionan entre sí'],
  ['De', 'Memorizar información', 'A', 'Comprender qué significa y cuándo importa'],
  ['De', 'Saber teoría pero dudar al aplicarla', 'A', 'Convertir conocimiento en decisiones concretas'],
  ['De', 'Sentir que siempre te falta una respuesta', 'A', 'Tener un proceso para razonar la siguiente decisión'],
];

const faqs = [
  ['¿Qué incluye exactamente la Edición Fundadora?', 'El Programa Profesional de Entrenamiento Personal completo: los tres niveles, recorrido secuencial, evaluaciones y acompañamiento grupal propio de esta formación. Durante la preventa no se venden niveles individuales.'],
  ['¿Me sirve si todavía no trabajo como entrenador personal?', 'Sí. El Nivel 1 empieza construyendo la base profesional y el recorrido avanza de forma progresiva. La formación no presupone que ya tengas clientes, pero sí exige estudio, práctica y responsabilidad.'],
  ['¿Y si ya soy entrenador personal?', 'El objetivo no es hacerte empezar de cero, sino ampliar y ordenar lo que ya sabes, detectar lagunas y conectar conocimientos para que puedas justificar, adaptar y revisar mejor tus decisiones.'],
  ['¿Qué acompañamiento grupal incluye?', 'Dos sesiones grupales al mes: una centrada en las dudas y temas que más necesita resolver el grupo y otra en formato Hot Seat para trabajar problemas y casos reales. El objetivo es que puedas ver cómo se razona una situación y trasladar ese proceso a tus propios clientes.'],
  ['¿Por qué existe un precio fundador?', 'Porque entras antes de la apertura oficial y formas parte de la primera generación. La condición fundadora no recorta el programa: reduce el precio para las primeras cien plazas de preventa.'],
  ['¿Qué ocurre después de matricularme?', 'Cuando el pago queda confirmado, tu matrícula queda registrada como plaza fundadora y recibes las comunicaciones transaccionales del proceso de alta y apertura.'],
  ['¿Puedo pagar en dos veces?', 'Sí. La modalidad alternativa es 895 € al matricularte y 895 € quince días naturales después del primer pago confirmado. El total fraccionado es 1.790 €.'],
  ['¿Cuándo abre la plataforma?', 'La apertura académica está fijada para el 15 de octubre de 2026.'],
  ['¿Es una titulación oficial?', 'No. GHC Academy es una formación privada y no equivale a una titulación oficial ni a una habilitación administrativa automática para ejercer. Los requisitos profesionales dependen de la normativa aplicable en cada territorio.'],
  ['¿Cuándo cierra la preventa?', 'El 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las cien plazas fundadoras.'],
];

export default function PreventaPage() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const singleHref = isPreview ? '#precio' : '/preventa/checkout?plan=single';
  const splitHref = isPreview ? '#precio' : '/preventa/checkout?plan=split';

  return (
    <main className={styles.page} data-preventa-root>
      {isPreview && (
        <div className={styles.internalBanner} role="status">
          <strong>Preview visual</strong>
          <span>Versión de revisión. Los pagos están desactivados en este Preview.</span>
        </div>
      )}

      <style>{`
        .conversion-tension-section,
        .conversion-shift-section,
        .conversion-proof-section {
          padding-top: 84px;
          padding-bottom: 84px;
        }
        .conversion-shift-grid article {
          min-height: 285px;
        }
        .conversion-hero-facts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          width: min(100%, 760px);
        }
        .conversion-hero-facts > div {
          justify-items: center;
          text-align: center;
          padding: 6px 8px;
        }
        .conversion-entry-intro,
        .conversion-level-intro {
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.82fr);
          gap: 38px;
          align-items: center;
        }
        .conversion-entry-intro h2 {
          max-width: 860px;
          font-size: clamp(40px, 3.9vw, 58px);
          line-height: 0.99;
        }
        .conversion-entry-intro > p,
        .conversion-level-intro > p {
          max-width: 560px;
          margin: 0;
          padding: 20px 0 20px 26px;
          border-left: 2px solid rgba(34, 214, 91, 0.72);
          font-size: 18px;
          line-height: 1.7;
        }
        .conversion-entry-profiles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          width: min(100%, 1180px);
          margin: 38px auto 0;
        }
        .conversion-entry-profile-card {
          min-height: 255px;
          display: grid;
          grid-template-rows: auto auto 1fr;
          align-content: start;
          padding: 28px;
        }
        .conversion-entry-profile-card h3 {
          margin: 28px 0 12px;
          font-size: 26px;
        }
        .conversion-entry-profile-card > strong {
          margin-top: 4px;
          font-size: 15px;
          line-height: 1.65;
        }
        .conversion-knowledge-card {
          min-height: 285px;
          display: grid;
          grid-template-rows: auto minmax(72px, auto) 1fr;
          align-content: start;
        }
        .conversion-knowledge-card h3 {
          margin: 30px 0 10px;
          align-self: start;
        }
        .conversion-knowledge-card > strong {
          margin-top: 0;
          align-self: start;
        }
        .conversion-level-intro h2 {
          max-width: 790px;
          font-size: clamp(42px, 4vw, 60px);
          line-height: 0.99;
        }
        .conversion-price-story {
          padding: 42px 46px;
          margin-top: 24px;
          margin-bottom: 24px;
        }
        .conversion-price-head {
          grid-template-columns: 1fr !important;
          gap: 18px !important;
          align-items: center !important;
          width: min(100%, 1080px);
          margin: 0 auto;
          text-align: center;
        }
        .conversion-price-head h2 {
          max-width: 980px;
          margin: 0 auto;
          font-size: clamp(44px, 5vw, 70px);
          line-height: 0.98;
        }
        .conversion-price-head > p {
          max-width: 800px;
          margin: 0 auto !important;
          font-size: 17px;
          line-height: 1.7;
        }
        .conversion-price-highlight {
          color: var(--ghc-green);
          white-space: nowrap;
        }
        .conversion-price-levels > div,
        .conversion-price-path > div {
          min-width: 0;
          text-align: center;
        }
        .conversion-price-levels strong,
        .conversion-price-path strong,
        .conversion-price-path del {
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .conversion-price-path strong {
          font-size: clamp(30px, 3.15vw, 48px);
          letter-spacing: -0.035em;
        }
        .conversion-price-close > a {
          white-space: nowrap;
        }
        .conversion-payment-intro {
          max-width: 1000px;
        }
        .conversion-payment-intro h2 {
          max-width: 980px;
          margin: 0 auto;
          font-size: clamp(44px, 5.2vw, 72px);
          line-height: 0.98;
        }
        .conversion-payment-intro > p {
          max-width: 760px;
          margin: 22px auto 0;
        }
        .conversion-payment-grid {
          max-width: 1080px;
          gap: 24px;
          align-items: stretch;
        }
        .conversion-payment-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 34px 32px 32px;
        }
        .conversion-payment-card h3 {
          margin: 22px 0 12px;
          font-size: 34px;
        }
        .conversion-payment-card > strong {
          display: block;
          margin-top: 0;
          color: var(--ghc-text);
          font-size: clamp(36px, 4.1vw, 50px);
          line-height: 1;
          letter-spacing: -0.035em;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .conversion-payment-card > p {
          width: min(100%, 390px);
          min-height: 72px;
          margin: 18px auto 0;
        }
        .conversion-payment-card > a {
          width: 100%;
          margin-top: 26px !important;
          padding-top: 0;
        }
        @media (max-width: 1100px) {
          .conversion-price-path strong {
            font-size: clamp(34px, 6vw, 50px);
          }
        }
        @media (max-width: 860px) {
          .conversion-tension-section,
          .conversion-shift-section,
          .conversion-proof-section {
            padding-top: 72px;
            padding-bottom: 72px;
          }
          .conversion-entry-intro,
          .conversion-level-intro {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .conversion-entry-intro > p,
          .conversion-level-intro > p {
            max-width: none;
          }
          .conversion-entry-profiles {
            grid-template-columns: 1fr;
          }
          .conversion-price-story {
            padding: 32px 28px;
          }
          .conversion-payment-card {
            padding: 28px 24px;
          }
          .conversion-payment-card > p {
            min-height: 0;
          }
        }
        @media (max-width: 620px) {
          .conversion-hero-facts {
            gap: 8px;
          }
          .conversion-hero-facts > div {
            padding: 4px 2px;
          }
          .conversion-entry-intro > p,
          .conversion-level-intro > p {
            padding: 16px 0 16px 18px;
          }
          .conversion-price-story {
            padding: 26px 18px;
          }
          .conversion-payment-card > strong {
            font-size: clamp(30px, 10vw, 42px);
          }
          .conversion-price-close > a {
            white-space: normal;
            text-align: center;
          }
        }
      `}</style>

      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="Ir a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.editionTag}>
          <span className={styles.liveDot} />
          Edición Fundadora 2026 · 100 plazas
        </div>
        <a href="#contenido" className={styles.headerCta}>Ver el programa</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Programa Profesional de Entrenamiento Personal · GHC Academy</p>
          <h1>Fórmate para ser entrenador personal.<span>O lleva tu preparación mucho más lejos.</span></h1>
          <p className={styles.heroLead}>
            Una formación completa para entender de verdad la profesión: desde anatomía, fisiología, kinesiología, nutrición y evaluación hasta programación, poblaciones especiales, conducta, evidencia, tecnología y dirección profesional.
          </p>
          <p className={styles.heroSupport}>
            No vas a estudiar temas aislados. Vas a aprender a relacionarlos y utilizarlos para valorar mejor, tomar decisiones con criterio, adaptar tu trabajo y sentir mucha más seguridad cuando tengas una persona real delante.
          </p>
          <div className={styles.heroActions}>
            <a href="#contenido" className={styles.primaryCta}>Ver todo lo que incluye</a>
            <a href="#para-quien" className={styles.secondaryCta}>¿Es para mí?</a>
          </div>
          <div className="conversion-hero-meta" aria-label="Datos esenciales del programa">
            <span>3 niveles</span>
            <span>30 módulos</span>
            <span>Apertura 15 octubre 2026</span>
          </div>
          <div className={`${styles.heroFacts} conversion-hero-facts`}>
            <div><strong>3</strong><span>Niveles conectados</span></div>
            <div><strong>1</strong><span>Recorrido profesional</span></div>
            <div><strong>30+</strong><span>Años de experiencia</span></div>
          </div>
        </div>

        <div className="conversion-hero-visual" aria-label="Formación profesional para entrenadores personales">
          <figure className="conversion-hero-image">
            <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=88" alt="Entrenador personal trabajando con una persona durante una sesión" />
            <figcaption>
              <span>Entrenador personal</span>
              <strong>Ser bueno en esta profesión exige mucho más que saber entrenar.</strong>
            </figcaption>
          </figure>
          <div className="conversion-floating-card conversion-floating-card-top">
            <span>El objetivo</span>
            <strong>Conocimiento + comprensión + criterio profesional</strong>
          </div>
          <div className="conversion-floating-card conversion-floating-card-bottom">
            <span>El recorrido</span>
            <strong>Aprender → entender → relacionar → aplicar</strong>
          </div>
        </div>
      </section>

      <section className="conversion-tension-section">
        <div className="conversion-tension-copy">
          <p className={styles.eyebrow}>Puede que esto sea lo que te está faltando</p>
          <h2>Querer ser entrenador personal y no sentirte todavía preparado. O llevar años siéndolo y saber que aún tienes piezas por completar.</h2>
          <p>
            A veces no falta motivación. Faltan conocimientos, profundidad, orden o la capacidad de conectar lo que has aprendido por separado. Y cuando eso ocurre, aparecen dudas que no se resuelven memorizando una respuesta más.
          </p>
          <strong>La seguridad profesional no se finge. Se construye cuando sabes qué observar, qué información necesitas y por qué tomas una decisión antes de aplicarla.</strong>
        </div>
        <div className="conversion-question-stack">
          {[
            '¿Entiendo realmente por qué responde así el cuerpo?',
            '¿Sé conectar anatomía, fisiología, nutrición y programación?',
            '¿Sé qué información necesito antes de tomar una decisión?',
            '¿Podría explicar con claridad por qué hago lo que hago?',
          ].map((question, index) => (
            <div key={question}><span>0{index + 1}</span><strong>{question}</strong></div>
          ))}
        </div>
      </section>

      <section className={styles.entrySection} id="para-quien">
        <div className={`${styles.sectionIntroRow} conversion-entry-intro`}>
          <div>
            <p className={styles.eyebrow}>Dos puntos de partida</p>
            <h2>Tanto si quieres empezar como entrenador personal como si ya ejerces, el objetivo es que puedas valorar mejor, programar con más criterio, adaptar el entrenamiento y trabajar para conseguir mejores resultados con tus clientes.</h2>
          </div>
          <p>
            No necesitas llegar con el mismo nivel de experiencia. Lo importante es salir con una base más sólida, más recursos para resolver situaciones reales y mucha más claridad sobre qué hacer, por qué hacerlo y cuándo cambiarlo.
          </p>
        </div>
        <div className="conversion-entry-profiles">
          {entryProfiles.map(([number, title, result]) => (
            <article key={number} className={`${styles.entryCard} conversion-entry-profile-card`}>
              <span className={styles.cardNumber}>{number}</span>
              <h3>{title}</h3>
              <strong>{result}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="conversion-shift-section">
        <div className="conversion-shift-head">
          <p className={styles.eyebrow}>La transformación que buscamos</p>
          <h2>Saber más es importante. Lo que cambia tu forma de trabajar es saber utilizar lo que sabes cuando tienes que tomar una decisión real.</h2>
          <p>
            El programa está diseñado para que cada área sume a las demás. Anatomía no va por un lado, fisiología por otro y programación por otro: el valor aparece cuando empiezas a conectarlas y convertir ese conocimiento en decisiones que mejoren tu trabajo y los resultados que buscas con tus clientes.
          </p>
        </div>
        <div className="conversion-shift-grid">
          {decisionShifts.map(([fromLabel, from, toLabel, to]) => (
            <article key={from}>
              <span>{fromLabel}</span><p>{from}</p><i>→</i><span>{toLabel}</span><strong>{to}</strong>
            </article>
          ))}
        </div>
        <div className={styles.legalNote}>
          <strong>¿En qué se traduce para ti?</strong>
          <span>En dejar de depender de recetas y respuestas memorizadas. Podrás analizar mejor lo que tienes delante, identificar qué información importa, justificar una decisión y cambiarla cuando la respuesta del cliente te diga que debes hacerlo.</span>
        </div>
      </section>

      <section className={styles.entrySection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>El mapa de conocimientos</p>
            <h2>Esto no es un curso centrado en ejercicios. Es una formación amplia para aprender a ejercer la profesión con criterio.</h2>
          </div>
          <p>
            Estas son algunas de las grandes áreas que vas a recorrer. No basta con reconocerlas por separado: aprenderás a utilizarlas juntas cuando tengas que valorar, programar, adaptar o explicar una decisión.
          </p>
        </div>
        <div className={styles.entryGrid}>
          {knowledgeAreas.map(([number, title, text]) => (
            <article key={number} className={`${styles.entryCard} conversion-knowledge-card`}>
              <span className={styles.cardNumber}>{number}</span>
              <h3>{title}</h3>
              <strong>{text}</strong>
            </article>
          ))}
        </div>
        <div className={styles.legalNote}>
          <strong>Cuando conectas estas ocho áreas, ganas una visión mucho más completa de cada cliente.</strong>
          <span>Entiendes mejor qué información importa, qué necesita esa persona, qué debes priorizar y cómo adaptar el entrenamiento a su situación. Eso te permite decidir con más precisión, comunicar mejor y trabajar con más seguridad, con el objetivo final de que tu intervención sea más eficaz y tus clientes obtengan mejores resultados.</span>
        </div>
      </section>

      <section className={styles.levelSection} id="contenido">
        <div className={`${styles.sectionIntroRow} conversion-level-intro`}>
          <div>
            <p className={styles.eyebrow}>El programa completo</p>
            <h2>Tres niveles. Un recorrido: construir la base, aplicarla y convertirla en criterio profesional.</h2>
          </div>
          <p>
            Primero construyes los fundamentos. Después los aplicas a objetivos y situaciones más complejas. Al final conectas todo para valorar mejor, adaptar tus decisiones y ofrecer un servicio más completo y eficaz.
          </p>
        </div>
        <div className={styles.levelGrid}>
          {levels.map(([label, title, marker, price, outcome], index) => (
            <article key={label} className={styles.levelCard}>
              <div className={styles.levelTopline}><span>{label}</span><strong>{marker}</strong></div>
              <div className={styles.levelIndex}>{index + 1}</div>
              <h3>{title}</h3>
              <p>{outcome}</p>
              <p>Precio individual futuro: <strong>{price}</strong></p>
            </article>
          ))}
        </div>
        <div className={styles.legalNote}>
          <strong>Lo importante no es completar tres niveles. Es lo que ocurre cuando los unes.</strong>
          <span>La base te permite entender qué estás viendo; la aplicación te enseña a actuar ante objetivos y situaciones diferentes; y la integración convierte todo eso en un servicio profesional más seguro, adaptable y orientado a conseguir mejores resultados. Por eso el recorrido está diseñado para hacerse como un conjunto.</span>
        </div>
      </section>

      <section className={styles.systemSection}>
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Cómo está pensado el aprendizaje</p>
          <h2>No basta con entender. Queremos que puedas convertir lo que sabes en decisiones que puedas aplicar, explicar y revisar.</h2>
          <p>
            El recorrido busca llevarte desde el conocimiento hasta la práctica profesional: aprender, comprender, relacionar, evaluar, decidir, aplicar y revisar.
          </p>
        </div>
        <div className={styles.systemTrack}>
          {ghcSystem.map(([title, text], index) => (
            <article key={title} className={styles.systemStep}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="conversion-mid-cta">
        <div>
          <span>Programa Profesional de Entrenamiento Personal</span>
          <strong>La meta es que, cuando tengas un cliente delante, sepas qué preguntar, qué observar, cómo decidir, cómo adaptar y cómo explicar lo que haces; y que todo eso se traduzca en un trabajo más preciso, más adaptable y orientado a conseguir mejores resultados para tus clientes.</strong>
        </div>
        <a href="#acompanamiento">Ver el acompañamiento</a>
      </section>

      <section className={styles.evaluationSection} id="acompanamiento">
        <div>
          <p className={styles.eyebrow}>Acompañamiento incluido</p>
          <h2>Porque el criterio se construye mucho más rápido cuando puedes ver cómo se razonan dudas y casos reales.</h2>
          <p>
            Cada mes tendrás dos sesiones grupales: una nace de las dudas y temas que más necesita resolver el grupo y la otra trabaja casos reales en formato Hot Seat. El objetivo no es darte otra clase, sino ayudarte a ver qué información importa, cómo se descompone un problema y cómo puedes trasladar ese razonamiento a tus propios clientes.
          </p>
        </div>
        <div className={styles.scoreCard}>
          <span>Acompañamiento del programa</span>
          <strong>2</strong>
          <p>sesiones grupales al mes</p>
          <small>1 sesión para resolver las dudas compartidas que más importan + 1 Hot Seat para aprender a razonar casos reales.</small>
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Aprender también significa demostrarlo</p>
          <h2>Aquí no basta con pasar por el contenido: necesitas alcanzar al menos un 80 % en cada módulo para avanzar.</h2>
          <p>
            El modelo contempla avance secuencial, evaluación por módulo y certificados privados verificables. El objetivo es comprobar comprensión y aplicación antes de seguir avanzando.
          </p>
        </div>
        <div className={styles.scoreCard}>
          <span>Umbral académico mínimo</span>
          <strong style={{ fontSize: 'clamp(76px, 10vw, 132px)' }}>80 %</strong>
          <p>para avanzar</p>
          <div className={styles.scoreTrack}><i /></div>
          <small>Las evaluaciones y controles académicos forman parte del diseño de la plataforma Academy.</small>
        </div>
      </section>

      <section className={`${styles.authoritySection} conversion-authority-layout`}>
        <style>{`
          .conversion-authority-layout {
            grid-template-columns: 0.7fr 1.3fr;
            align-items: start;
          }
          .conversion-founder-portrait {
            position: relative;
            min-height: 600px;
            margin: 0;
            overflow: hidden;
            border: 1px solid rgba(34, 214, 91, 0.28);
            border-radius: 28px;
            background: #080b0a;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
          }
          .conversion-founder-portrait::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(3, 4, 3, 0.01) 52%, rgba(3, 4, 3, 0.82) 100%);
          }
          .conversion-founder-portrait > img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            object-position: 50% 50%;
          }
          .conversion-founder-portrait figcaption {
            position: absolute;
            left: 18px;
            right: 18px;
            bottom: 18px;
            z-index: 2;
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 14px 16px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 14px;
            background: rgba(7, 11, 8, 0.78);
            backdrop-filter: blur(10px);
          }
          .conversion-founder-portrait figcaption strong {
            color: #22d65b;
            font-size: 30px;
            line-height: 1;
          }
          .conversion-founder-portrait figcaption span {
            color: rgba(242, 244, 241, 0.86);
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          @media (max-width: 860px) {
            .conversion-authority-layout {
              grid-template-columns: 1fr;
            }
            .conversion-founder-portrait {
              min-height: 640px;
            }
            .conversion-founder-portrait > img {
              object-position: 50% 38%;
            }
          }
          @media (max-width: 620px) {
            .conversion-founder-portrait {
              min-height: 520px;
              border-radius: 22px;
            }
            .conversion-founder-portrait > img {
              object-position: 50% 42%;
            }
            .conversion-founder-portrait figcaption {
              left: 12px;
              right: 12px;
              bottom: 12px;
              padding: 12px 13px;
            }
            .conversion-founder-portrait figcaption strong {
              font-size: 27px;
            }
            .conversion-founder-portrait figcaption span {
              font-size: 10px;
            }
          }
        `}</style>
        <figure className="conversion-founder-portrait" aria-label="Alby Aguiar, fundador y director del programa">
          <img
            src="/images/alby-ghc-academy-founder.jpg"
            alt="Alby Aguiar, fundador de GHC Training y creador de GHC Academy"
            loading="lazy"
            decoding="async"
          />
          <figcaption><strong>30+</strong><span>años de experiencia</span></figcaption>
        </figure>
        <div>
          <p className={styles.eyebrow}>Quién está detrás</p>
          <h2>No quería crear otro curso de entrenamiento personal. Quería condensar tres décadas de oficio para que tú no tengas que aprenderlo todo a base de ensayo y error.</h2>
          <p>
            Alby Aguiar lleva más de 30 años vinculado al entrenamiento, el rendimiento y la salud. Su recorrido ha pasado por la competición de alto nivel, la dirección de centros y empresas de fitness, el entrenamiento personal y una formación multidisciplinar que ha incluido Medicina, Ciencias de la Actividad Física y Nutrición.
          </p>
          <p>
            Pero GHC Academy no nace de acumular títulos ni de repetir teoría. Nace de décadas trabajando con personas reales, tomando decisiones, corrigiendo errores, resolviendo situaciones complejas y aprendiendo a conectar biomecánica, fisiología, programación, nutrición, dolor, comportamiento y contexto.
          </p>
          <p>
            Ha trabajado con perfiles muy distintos, desde deportistas de alto rendimiento hasta clientes con fibromialgia, lipedema, linfedema o dolor crónico, situaciones en las que saber ejercicios no basta: hay que saber pensar, adaptar y asumir responsabilidad profesional.
          </p>
          <div className={styles.legalNote}>
            <strong>Eso es lo que quiere transmitirte aquí.</strong>
            <span>No que entrenes como él ni que copies sus decisiones. Que desarrolles el criterio, la seguridad y los recursos necesarios para tomar las tuyas entendiendo qué requiere y qué necesita cada cliente, y recorrer mucho más rápido un camino que normalmente exige años de práctica.</span>
          </div>
        </div>
      </section>

      <section className="conversion-proof-section">
        <div className="conversion-proof-copy">
          <p className={styles.eyebrow}>Lo que queremos que te lleves</p>
          <h2>Más capacidad para integrar información. Más seguridad para decidir. Más precisión para adaptar tu trabajo y buscar mejores resultados.</h2>
          <p>
            El objetivo no es llenarte la cabeza de conceptos. Es que puedas reconocer qué importa en cada situación, relacionar conocimientos que antes estaban separados y convertirlos en decisiones útiles para la persona que tienes delante.
          </p>
        </div>
        <aside className="conversion-proof-card">
          <span>El refuerzo de la promesa</span>
          <strong>Que cuando aparezca un cliente, un objetivo o un problema que no encaje en una receta, tengas un proceso para decidir qué necesita, qué priorizar y cómo adaptar el plan.</strong>
          <p>Eso es integración profesional: menos dependencia de respuestas prefabricadas y más capacidad para actuar con criterio.</p>
        </aside>
      </section>

      <section className="conversion-price-story" id="precio">
        <div className="conversion-price-head">
          <div>
            <p className={styles.eyebrow}>Ahora sí: la condición fundadora</p>
            <h2>El recorrido completo por <span className="conversion-price-highlight">1.690&nbsp;€</span> durante la Edición Fundadora.</h2>
          </div>
          <p>
            Los tres niveles por separado suman 2.670 €. El pack completo tendrá un precio oficial de 2.290 €. En esta primera edición puedes entrar por 1.690 € con el programa completo, las evaluaciones y el acompañamiento grupal.
          </p>
        </div>
        <div className="conversion-price-levels">
          {levels.map(([label, title, , price]) => (
            <div key={label}><span>{label} · {title}</span><strong>{price}</strong></div>
          ))}
        </div>
        <div className="conversion-price-path" aria-label="Comparación de precios">
          <div><span>Los 3 niveles por separado</span><strong>2.670&nbsp;€</strong></div>
          <i>→</i>
          <div><span>Pack completo oficial</span><strong>2.290&nbsp;€</strong></div>
          <i>→</i>
          <div className="featured">
            <span>Edición Fundadora · primeras 100 plazas</span>
            <strong>1.690&nbsp;€</strong>
            <del>2.290&nbsp;€</del>
          </div>
        </div>
        <div className="conversion-savings">
          <span>600 € menos que el pack oficial</span>
          <span>980 € menos que comprar los niveles por separado</span>
          <span>37 % menos que el valor acumulado</span>
        </div>
        <div className="conversion-price-close">
          <div>
            <strong>La preventa termina el 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las 100 plazas.</strong>
            <span>La condición fundadora termina cuando se cumple una de esas dos cosas: se alcanza el máximo de plazas o llega la fecha de cierre.</span>
          </div>
          <Link href={singleHref}>Quiero mi plaza fundadora · 1.690 €</Link>
        </div>
      </section>

      <section className={`${styles.paymentSection} conversion-payment-section`}>
        <div className={`${styles.sectionIntroCenter} conversion-payment-intro`}>
          <p className={styles.eyebrow}>Elige cómo entrar</p>
          <h2>Pago único de 1.690&nbsp;€ o dos pagos de 895&nbsp;€.</h2>
          <p>
            El pago único mantiene el mejor precio: 1.690 €. Si prefieres fraccionarlo, son 895 € ahora y 895 € quince días naturales después. Total fraccionado: 1.790 €.
          </p>
        </div>
        <div className={`${styles.paymentGrid} conversion-payment-grid`}>
          <article className={`${styles.paymentCardFeatured} conversion-payment-card`}>
            <span className={styles.paymentLabel}>Mejor precio</span>
            <h3>Pago único</h3>
            <strong>1.690&nbsp;€</strong>
            <p>Programa completo: tres niveles, evaluaciones y acompañamiento grupal.</p>
            <Link href={singleHref} className={styles.primaryCta}>
              Elegir pago único · 1.690 €
            </Link>
          </article>
          <article className={`${styles.paymentCard} conversion-payment-card`}>
            <span className={styles.paymentLabel}>Pago fraccionado</span>
            <h3>Dos pagos</h3>
            <strong>895&nbsp;€ + 895&nbsp;€</strong>
            <p>Primera cuota al matricularte y segunda cuota quince días naturales después. Total fraccionado: 1.790 €.</p>
            <Link href={splitHref} className={styles.secondaryCta}>
              Elegir dos pagos · 895 € ahora
            </Link>
          </article>
        </div>
        <div className="conversion-purchase-trust">
          <span>Plaza fundadora confirmada tras verificar el pago</span>
          <span>Condiciones esenciales visibles antes de pagar</span>
          <span>Pago procesado por proveedor externo seguro</span>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>Antes de decidir</p>
            <h2>Lo que necesitas saber antes de entrar.</h2>
          </div>
          <p>Sin letra pequeña escondida detrás de un botón. Estas son las preguntas que más sentido tiene resolver antes de matricularte.</p>
        </div>
        <div className={styles.faqList}>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="conversion-final-section">
        <style>{`
          .conversion-final-section {
            grid-template-columns: minmax(0, 1fr);
            gap: 26px;
            align-items: center;
            padding: 74px 64px;
            margin-top: 32px;
            margin-bottom: 32px;
            border: 1px solid rgba(34, 214, 91, 0.24);
            border-radius: 30px;
            background:
              radial-gradient(circle at 50% 0%, rgba(34, 214, 91, 0.12), transparent 36%),
              linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
            text-align: center;
          }
          .conversion-final-section > div:first-of-type {
            width: min(100%, 1040px);
            margin: 0 auto;
          }
          .conversion-final-section > div:first-of-type > p:last-child {
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
          }
          .conversion-final-action {
            width: min(100%, 650px);
            margin: 0 auto;
          }
          @media (max-width: 620px) {
            .conversion-final-section {
              padding: 48px 20px;
              border-radius: 24px;
            }
          }
        `}</style>
        <div>
          <p className={styles.eyebrow}>Primera generación · GHC Academy</p>
          <h2>Si quieres convertirte en entrenador personal con una base sólida, o ya ejerces y quieres tener más criterio, más recursos y más seguridad para enfrentarte a clientes y situaciones diferentes, este es el recorrido que hemos construido para ti.</h2>
          <p>
            La Edición Fundadora cierra el 15 de septiembre de 2026 o cuando se completen las cien plazas. La plataforma académica abre el 15 de octubre de 2026.
          </p>
        </div>
        <div className="conversion-final-action">
          <Link href={singleHref}>Entrar en la Edición Fundadora · 1.690 €</Link>
          <span>También disponible en 895 € + 895 € · total 1.790 €</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <GHCLogo size="sm" showText tagline />
        <p>GHC Academy · Programa Profesional de Entrenamiento Personal · Formación privada online · Edición Fundadora 2026.</p>
        <div><span>3 niveles</span><span>Recorrido completo</span><span>100 plazas fundadoras</span></div>
      </footer>
    </main>
  );
}
