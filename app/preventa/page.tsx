import Link from 'next/link';
import GHCLogo from '../components/GHCLogo';
import styles from './preventa.module.css';

export const metadata = {
  title: 'Edición Fundadora 2026 · GHC Academy',
  description:
    'Tres niveles, treinta módulos y un sistema profesional para dejar de acumular información y aprender a evaluar, decidir, programar, aplicar y revisar con criterio.',
};

const entryProfiles = [
  ['01', 'Ya trabajas en el sector', 'Ordena lo que ya sabes, detecta lagunas y convierte experiencia dispersa en un sistema de decisión.'],
  ['02', 'Estás estudiando', 'Conecta teoría, evaluación y práctica para que el conocimiento empiece a tener dirección profesional.'],
  ['03', 'Buscas una reconversión', 'Construye una base estructurada antes de asumir la responsabilidad de trabajar con otras personas.'],
  ['04', 'El entrenamiento despertó una vocación', 'Pasa de entrenar por experiencia personal a comprender por qué, cuándo y para quién aplicar cada decisión.'],
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
  ['Nivel 1', 'Construir la base', 'Módulos 1–10', '690 €', 'Comprender los principios que sostienen una decisión antes de convertirla en una rutina.'],
  ['Nivel 2', 'Integrar y programar', 'Módulos 11–20', '890 €', 'Conectar evaluación, prioridades, programación y adaptación dentro de un proceso coherente.'],
  ['Nivel 3', 'Aplicar, revisar y dirigir', 'Módulos 21–30', '1.090 €', 'Resolver con mayor criterio, revisar resultados y ordenar el servicio como profesional.'],
];

const decisionShifts = [
  ['De', 'Acumular ejercicios', 'A', 'Elegir con una razón concreta'],
  ['De', 'Copiar protocolos', 'A', 'Adaptar según la persona y el contexto'],
  ['De', 'Programar por costumbre', 'A', 'Priorizar antes de programar'],
  ['De', 'Repetir porque “funciona”', 'A', 'Revisar, medir y ajustar'],
];

const faqs = [
  ['¿Qué incluye exactamente la Edición Fundadora?', 'El pack completo de GHC Academy: tres niveles y treinta módulos. Durante la preventa no se venden niveles individuales.'],
  ['¿Por qué existe un precio fundador?', 'Porque entras antes de la apertura oficial y formas parte de la primera generación. La condición fundadora no recorta el pack: reduce el precio para las primeras cien plazas de preventa.'],
  ['¿Qué ocurre después de matricularme?', 'Cuando el pago queda confirmado, tu matrícula queda registrada como plaza fundadora y recibes las comunicaciones transaccionales del proceso de alta y apertura.'],
  ['¿Puedo pagar en dos veces?', 'Sí. La modalidad alternativa es 895 € al matricularte y 895 € quince días naturales después del primer pago confirmado. El total fraccionado es 1.790 €.'],
  ['¿Cuándo abre la plataforma?', 'La apertura académica está prevista durante octubre de 2026. El día exacto se comunicará cuando pueda garantizarse.'],
  ['¿Es una titulación oficial?', 'No. GHC Academy es una formación privada y no equivale a una titulación oficial ni a una habilitación administrativa automática para ejercer.'],
  ['¿Habrá tutoría individual?', 'La V1 contempla soporte técnico, administrativo y académico básico. No incluye mentoría ni tutoría personalizada.'],
  ['¿Cuándo cierra la preventa?', 'El 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las cien plazas fundadoras.'],
];

export default function PreventaPage() {
  const isPreview = process.env.VERCEL_ENV === 'preview';

  return (
    <main className={styles.page} data-preventa-root>
      {isPreview && (
        <div className={styles.internalBanner} role="status">
          <strong>Preview Sandbox</strong>
          <span>La matrícula está conectada al flujo real, pero SumUp usa Sandbox y no mueve dinero real.</span>
        </div>
      )}

      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="Ir a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.editionTag}>
          <span className={styles.liveDot} />
          Edición Fundadora 2026 · 100 plazas
        </div>
        <a href="#precio" className={styles.headerCta}>Ver condición fundadora</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Entrenamiento personal · Edición Fundadora 2026</p>
          <h1>Deja de acumular información.<span>Empieza a decidir con criterio.</span></h1>
          <p className={styles.heroLead}>
            GHC Academy convierte conocimientos dispersos en un sistema profesional para comprender a la persona, evaluar lo que importa y saber qué hacer después.
          </p>
          <p className={styles.heroSupport}>
            Tres niveles. Treinta módulos. Una progresión completa para comprender, evaluar, decidir, programar, aplicar, revisar y dirigir.
          </p>
          <div className={styles.heroActions}>
            <Link href="/preventa/checkout?plan=single" className={styles.primaryCta}>Quiero mi plaza fundadora · 1.690 €</Link>
            <a href="#recorrido" className={styles.secondaryCta}>Ver cómo funciona el sistema</a>
          </div>
          <div className="conversion-hero-meta" aria-label="Datos esenciales de la preventa">
            <span>100 plazas máximo</span>
            <span>Preventa hasta 15 septiembre</span>
            <span>Apertura en octubre de 2026</span>
          </div>
          <div className={styles.heroFacts}>
            <div><strong>3</strong><span>Niveles</span></div>
            <div><strong>30</strong><span>Módulos</span></div>
            <div><strong>30+</strong><span>Años de experiencia</span></div>
          </div>
        </div>

        <div className="conversion-hero-visual" aria-label="Entrenamiento y criterio profesional">
          <figure className="conversion-hero-image">
            <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=88" alt="Profesional supervisando una sesión de entrenamiento" />
            <figcaption>
              <span>Evaluar antes de prescribir</span>
              <strong>Personas reales no vienen con una rutina escrita.</strong>
            </figcaption>
          </figure>
          <div className="conversion-floating-card conversion-floating-card-top">
            <span>Sistema GHC</span>
            <strong>Observar → priorizar → decidir → revisar</strong>
          </div>
          <div className="conversion-floating-card conversion-floating-card-bottom">
            <span>La diferencia</span>
            <strong>No memorizar respuestas. Aprender a construirlas.</strong>
          </div>
        </div>
      </section>

      <section className="conversion-tension-section">
        <div className="conversion-tension-copy">
          <p className={styles.eyebrow}>El punto en el que muchos se atascan</p>
          <h2>Puedes saber mucho y seguir dudando cuando delante tienes una persona real.</h2>
          <p>
            Anatomía, ejercicios, programación o nutrición aportan piezas. El problema aparece cuando nadie te enseña a ordenarlas: qué observar primero, qué es prioritario, qué puedes modificar y cuándo debes parar o derivar.
          </p>
          <strong>Ese salto —de conocer cosas a saber tomar decisiones— es el centro de GHC Academy.</strong>
        </div>
        <div className="conversion-question-stack">
          {['Tengo diez opciones. ¿Cuál priorizo?', 'La persona no responde como esperaba. ¿Qué cambio?', 'Hay dolor o una condición especial. ¿Qué puedo hacer y qué debo derivar?', 'El programa funciona. ¿Cómo sé cuándo dejar de repetirlo?'].map((question, index) => (
            <div key={question}><span>0{index + 1}</span><strong>{question}</strong></div>
          ))}
        </div>
      </section>

      <section className="conversion-shift-section">
        <div className="conversion-shift-head">
          <p className={styles.eyebrow}>La transformación profesional</p>
          <h2>No queremos que termines sabiendo más ejercicios. Queremos que tomes mejores decisiones.</h2>
          <p>El valor no está en memorizar otra lista. Está en construir una forma de pensar que puedas aplicar cuando el caso deja de parecerse al ejemplo del libro.</p>
        </div>
        <div className="conversion-shift-grid">
          {decisionShifts.map(([fromLabel, from, toLabel, to]) => (
            <article key={from}>
              <span>{fromLabel}</span><p>{from}</p><i>→</i><span>{toLabel}</span><strong>{to}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.entrySection}>
        <div className={styles.sectionIntroRow}>
          <div><p className={styles.eyebrow}>Cuatro puertas de entrada</p><h2>Distintos puntos de partida. Un mismo estándar profesional.</h2></div>
          <p>No importa si empiezas desde cero o ya trabajas. Lo que une a estos perfiles es querer comprender y asumir con seriedad la responsabilidad de trabajar con otras personas.</p>
        </div>
        <div className={styles.entryGrid}>
          {entryProfiles.map(([number, title, result]) => (
            <article key={number} className={styles.entryCard}><span className={styles.cardNumber}>{number}</span><h3>{title}</h3><strong>{result}</strong></article>
          ))}
        </div>
      </section>

      <section className={styles.systemSection} id="recorrido">
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>El mecanismo</p>
          <h2>Una secuencia de decisiones. No una colección de rutinas.</h2>
          <p>La metodología ordena el trabajo para que cada paso tenga una razón y el siguiente dependa de lo que observas, no de una plantilla universal.</p>
        </div>
        <div className={styles.systemTrack}>
          {ghcSystem.map(([title, text], index) => (
            <article key={title} className={styles.systemStep}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="conversion-mid-cta">
        <div>
          <span>Edición Fundadora · 100 plazas</span>
          <strong>Si esto es lo que echabas de menos en otras formaciones, ya has entendido la diferencia.</strong>
        </div>
        <Link href="/preventa/checkout?plan=single">Entrar por 1.690 €</Link>
      </section>

      <section className={styles.levelSection}>
        <div className={styles.sectionIntroRow}>
          <div><p className={styles.eyebrow}>El recorrido completo</p><h2>Tres niveles conectados. Treinta módulos. Una progresión.</h2></div>
          <p>Cada nivel aumenta la complejidad. No compras tres carpetas independientes: compras un recorrido diseñado para construir criterio de forma acumulativa.</p>
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
      </section>

      <section className="conversion-proof-section">
        <div className="conversion-proof-copy">
          <p className={styles.eyebrow}>Producto definido antes de abrir</p>
          <h2>No estás comprando una promesa sin estructura.</h2>
          <p>La arquitectura académica de los tres niveles y los treinta módulos ya está definida. La preventa te permite entrar antes de la apertura oficial con una condición económica que no volverá a ser la estándar.</p>
          <div className="conversion-proof-list">
            <div><span>01</span><strong>3 niveles y 30 módulos estructurados como un recorrido único.</strong></div>
            <div><span>02</span><strong>Progreso secuencial y evaluación por módulo dentro del diseño académico.</strong></div>
            <div><span>03</span><strong>Umbral académico del 80 % y certificados privados verificables.</strong></div>
            <div><span>04</span><strong>Apertura prevista durante octubre de 2026.</strong></div>
          </div>
        </div>
        <aside className="conversion-proof-card">
          <span>La pregunta correcta</span>
          <strong>¿Qué harías si mañana el cliente que tienes delante no encaja en ninguna de tus rutinas?</strong>
          <p>Una formación profesional debe prepararte precisamente para ese momento.</p>
        </aside>
      </section>

      <section className="conversion-price-story" id="precio">
        <div className="conversion-price-head">
          <div>
            <p className={styles.eyebrow}>Por qué existe la Edición Fundadora</p>
            <h2>Entras antes de la apertura. A cambio, conservas la mejor condición de esta edición.</h2>
          </div>
          <p>La condición fundadora no reduce el pack: sigues entrando en los tres niveles y treinta módulos. Lo que cambia es el precio por formar parte de la primera generación antes de la apertura oficial.</p>
        </div>
        <div className="conversion-price-levels">
          {levels.map(([label, title, , price]) => (
            <div key={label}><span>{label} · {title}</span><strong>{price}</strong></div>
          ))}
        </div>
        <div className="conversion-price-path" aria-label="Comparación de precios">
          <div><span>Valor por separado</span><strong>2.670 €</strong></div>
          <i>→</i>
          <div><span>Pack completo oficial</span><strong>2.290 €</strong></div>
          <i>→</i>
          <div className="featured"><span>Edición Fundadora · primeras 100 plazas</span><strong>1.690 €</strong><del>2.290 €</del></div>
        </div>
        <div className="conversion-savings">
          <span>600 € menos que el pack oficial</span>
          <span>980 € menos que los niveles separados</span>
          <span>37 % menos que el valor acumulado</span>
        </div>
        <div className="conversion-price-close">
          <div>
            <strong>La preventa termina el 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las 100 plazas.</strong>
            <span>La disponibilidad está limitada por dos reglas objetivas: un máximo de 100 plazas y una fecha de cierre definida. La condición fundadora termina cuando se cumple una de las dos.</span>
          </div>
          <Link href="/preventa/checkout?plan=single">Quiero mi plaza fundadora · 1.690 €</Link>
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Aprendizaje y evaluación</p>
          <h2>El progreso debe demostrarse, no presumirse.</h2>
          <p>El modelo contempla avance secuencial, evaluación por módulo y certificados privados verificables. La intención no es que pases páginas: es que demuestres comprensión antes de avanzar.</p>
          <div className={styles.legalNote}><strong>Naturaleza privada</strong><span>No constituye una titulación oficial ni una habilitación administrativa automática.</span></div>
        </div>
        <div className={styles.scoreCard}><span>Umbral académico diseñado</span><strong>80 %</strong><p>por módulo</p><div className={styles.scoreTrack}><i /></div><small>Recorrido académico y controles de acceso diseñados para la plataforma Academy.</small></div>
      </section>

      <section className={styles.authoritySection}>
        <div className="conversion-authority-stat" aria-label="Más de treinta años de experiencia"><div><strong>30+</strong><span>años de experiencia</span></div></div>
        <div>
          <p className={styles.eyebrow}>Dirección académica</p>
          <h2>Una metodología construida desde la práctica y obligada a responder al “por qué”.</h2>
          <p>Alby Aguiar, fundador de GHC Training, dirige el proyecto desde una trayectoria de más de treinta años vinculada al entrenamiento, el rendimiento, la gestión de servicios y el trabajo con personas con necesidades diferentes.</p>
          <p>El enfoque GHC prioriza mecanismos antes que dogmas, contexto antes que recetas y decisiones antes que modas. La formación está diseñada para que puedas explicar por qué haces algo, cuándo tiene sentido y cuándo debes cambiarlo.</p>
        </div>
      </section>

      <section className={styles.paymentSection}>
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Elige tu entrada a la primera generación</p>
          <h2>1.690 € para las primeras 100 plazas.</h2>
          <p>El pago único mantiene la mejor condición económica. Si prefieres dividirlo, existe una modalidad de dos cuotas con un total de 1.790 €.</p>
        </div>
        <div className={styles.paymentGrid}>
          <article className={styles.paymentCardFeatured}>
            <span className={styles.paymentLabel}>Mejor condición económica</span>
            <h3>Pago único</h3>
            <strong>1.690 €</strong>
            <p>Pack completo de tres niveles y treinta módulos. Un solo pago y 600 € menos que el precio oficial futuro del pack.</p>
            <Link href="/preventa/checkout?plan=single" className={styles.primaryCta} style={{ width: '100%', marginTop: 22 }}>Elegir pago único · 1.690 €</Link>
          </article>
          <article className={styles.paymentCard}>
            <span className={styles.paymentLabel}>Modalidad alternativa</span>
            <h3>895 € + 895 €</h3>
            <strong>1.790 € total</strong>
            <p>Primera cuota al matricularte. Segunda cuota de 895 € quince días naturales después del primer pago confirmado.</p>
            <Link href="/preventa/checkout?plan=split" className={styles.secondaryCta} style={{ width: '100%', marginTop: 22 }}>Elegir dos pagos · 895 € ahora</Link>
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
          <div><p className={styles.eyebrow}>Antes de decidir</p><h2>Las preguntas que deberías resolver antes de pagar.</h2></div>
          <p>No queremos esconder la letra pequeña detrás de un botón. La preventa debe entenderse antes de contratarla y el checkout vuelve a mostrar las condiciones esenciales.</p>
        </div>
        <div className={styles.faqList}>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="conversion-final-section">
        <div>
          <p className={styles.eyebrow}>Primera generación · GHC Academy</p>
          <h2>Si quieres otra colección de rutinas, existen opciones más simples. Si quieres aprender a decidir, aquí empieza el recorrido.</h2>
          <p>La Edición Fundadora cierra el 15 de septiembre de 2026 o cuando se completen las cien plazas. La plataforma académica abrirá durante octubre.</p>
        </div>
        <div className="conversion-final-action">
          <Link href="/preventa/checkout?plan=single">Entrar en la Edición Fundadora · 1.690 €</Link>
          <span>También disponible en 895 € + 895 € · total 1.790 €</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <GHCLogo size="sm" showText tagline />
        <p>GHC Academy · Formación privada online · Edición Fundadora 2026.</p>
        <div><span>3 niveles</span><span>30 módulos</span><span>100 plazas fundadoras</span></div>
      </footer>
    </main>
  );
}
