import Link from 'next/link';
import GHCLogo from '../components/GHCLogo';
import styles from './preventa.module.css';

export const metadata = {
  title: 'Programa Profesional de Entrenamiento Personal · GHC Academy',
  description:
    'Tres niveles y treinta módulos para aprender a valorar, programar, adaptar y revisar entrenamientos con criterio, seguridad y aplicación real.',
};

const entryProfiles = [
  ['01', 'Ya trabajas con clientes', 'Sabes entrenar, pero hay casos en los que dudas: qué priorizar, qué cambiar, cuándo progresar o cuándo parar. Aquí ordenas lo que sabes y lo conviertes en decisiones más claras.'],
  ['02', 'Quieres empezar en el sector', 'No quieres llegar a tu primer cliente con una colección de ejercicios y ninguna idea de por dónde empezar. Aquí construyes una base para valorar, programar y trabajar con personas reales.'],
];

const ghcSystem = [
  ['Comprender', 'Entender qué está pasando y qué información importa.'],
  ['Evaluar', 'Recoger solo los datos que pueden cambiar una decisión.'],
  ['Decidir', 'Elegir qué necesita atención primero.'],
  ['Programar', 'Convertir esa prioridad en un plan que se pueda cumplir.'],
  ['Aplicar', 'Llevar el plan a una sesión real y saber adaptarlo.'],
  ['Revisar', 'Comprobar qué está funcionando y qué debe cambiar.'],
  ['Dirigir', 'Dar al cliente un servicio claro, seguro y profesional.'],
];

const levels = [
  ['Nivel 1', 'Construir la base profesional', 'Módulos 1–10', '690 €', 'Aprendes qué hace realmente un entrenador personal, cómo funciona el cuerpo, cómo evaluar, programar y enseñar movimiento, y dónde están los límites que protegen al cliente y al profesional.'],
  ['Nivel 2', 'Programar, adaptar y especializar', 'Módulos 11–20', '890 €', 'Pasas de los fundamentos a objetivos y situaciones reales: fuerza, hipertrofia, resistencia, nutrición, patologías, deporte, recuperación, carga y retorno al entrenamiento.'],
  ['Nivel 3', 'Resolver casos y dirigir tu servicio', 'Módulos 21–30', '1.090 €', 'Aprendes a mejorar adherencia, experiencia de cliente, venta, precios, procesos, liderazgo, riesgo, evidencia y tecnología para dirigir un servicio profesional completo.'],
];

const moduleGroups = [
  {
    label: 'Nivel 1 · Fundamentos profesionales',
    modules: [
      ['01', 'La profesión del entrenador personal', 'Qué hace un entrenador, qué decisiones le corresponden, dónde están sus límites y cómo trabajar con ética, tecnología y responsabilidad.'],
      ['02', 'Anatomía y kinesiología I', 'Entender huesos, articulaciones, dolor y variaciones del movimiento para adaptar ejercicios sin convertir observaciones en diagnósticos.'],
      ['03', 'Anatomía y kinesiología II', 'Comprender músculo, tejido conjuntivo, control neural y producción de fuerza para interpretar qué exige una tarea al cuerpo.'],
      ['04', 'Fisiología I', 'Entender la respuesta cardiovascular y respiratoria al esfuerzo para ajustar intensidad y entrenar con mayor seguridad.'],
      ['05', 'Fisiología II', 'Comprender cómo responden los sistemas nervioso, endocrino y metabólico y cómo esa respuesta afecta al entrenamiento y la recuperación.'],
      ['06', 'Principios del entrenamiento', 'Aprender a manejar dosis, adaptación, progresión, fatiga y planificación para que un programa tenga una lógica y pueda evolucionar.'],
      ['07', 'Nutrición aplicada al entrenamiento', 'Manejar nutrición general, hidratación y suplementos con criterio, sabiendo qué puedes orientar y qué requiere otro profesional.'],
      ['08', 'Evaluación profesional del cliente', 'Saber qué preguntar, qué comprobar, qué medir y cuándo reevaluar para que la valoración sirva realmente para tomar decisiones.'],
      ['09', 'Movimiento, patrones y técnica', 'Enseñar y adaptar movimientos, seleccionar ejercicios y corregir lo que importa sin depender de una técnica única para todo el mundo.'],
      ['10', 'Seguridad, ética y responsabilidad profesional', 'Prevenir problemas, responder ante emergencias, proteger datos, documentar decisiones y actuar dentro de tu responsabilidad profesional.'],
    ],
  },
  {
    label: 'Nivel 2 · Metodología de entrenamiento especializado',
    modules: [
      ['11', 'Hipertrofia muscular avanzada', 'Diseñar programas para ganar masa muscular controlando dosis, esfuerzo, selección de ejercicios, progresión y seguimiento.'],
      ['12', 'Fuerza máxima avanzada', 'Evaluar y desarrollar fuerza con progresiones, autorregulación y criterios que permitan ajustar el trabajo a la respuesta real.'],
      ['13', 'Resistencia y capacidad cardiorrespiratoria avanzada', 'Programar resistencia controlando intensidad, métodos, recuperación y compatibilidad con la fuerza y otros objetivos.'],
      ['14', 'Periodización avanzada y planificación a largo plazo', 'Ordenar prioridades, bloques, carga y mantenimiento para construir planes que funcionen también con la vida real del cliente.'],
      ['15', 'Nutrición avanzada, composición corporal y salud metabólica', 'Integrar nutrición general, composición corporal y salud metabólica sin dogmas y sin invadir competencias clínicas.'],
      ['16', 'Entrenamiento en poblaciones especiales y enfermedades crónicas', 'Adaptar la dosis y la supervisión ante edad, obesidad, diabetes, enfermedad cardiovascular, respiratoria, embarazo, dolor persistente y otras situaciones complejas.'],
      ['17', 'Preparación física deportiva', 'Analizar lo que exige un deporte y desarrollar velocidad, agilidad y potencia buscando transferencia real, no imitación de gestos.'],
      ['18', 'Puesta a punto, competición y recuperación avanzada', 'Llegar a competir con la menor fatiga posible, organizar cargas, viajes y recuperación y mantener la forma cuando importa.'],
      ['19', 'Prevención de lesiones, gestión de carga y retorno al entrenamiento', 'Reducir riesgo, gestionar síntomas y exposición y reconstruir capacidad de forma progresiva sin invadir la rehabilitación clínica.'],
      ['20', 'Integración avanzada del entrenamiento y Sistema GHC', 'Juntar evaluación, prioridades, programación, respuesta y seguimiento para resolver un caso completo y poder explicar cada decisión.'],
    ],
  },
  {
    label: 'Nivel 3 · Maestría profesional y dirección del servicio',
    modules: [
      ['21', 'Cambio de conducta, adherencia y coaching profesional', 'Entender por qué una persona no sostiene un plan y aprender a mejorar adherencia y autonomía sin manipular ni crear dependencia.'],
      ['22', 'Diseño del servicio, experiencia del cliente y comunicación profesional', 'Organizar desde el primer contacto hasta el cierre: expectativas, onboarding, comunicación, incidencias, seguimiento y calidad del servicio.'],
      ['23', 'Posicionamiento, marketing ético y venta consultiva', 'Explicar tu valor, atraer al cliente adecuado y vender desde el encaje y la claridad, sin presión ni promesas que no puedes garantizar.'],
      ['24', 'Dirección económica, precios y sostenibilidad del servicio', 'Calcular costes, capacidad, precio, margen, punto de equilibrio y tesorería para que trabajar bien también sea sostenible.'],
      ['25', 'Dirección operativa, procesos, calidad y escalabilidad del servicio', 'Convertir una buena forma de trabajar en procesos repetibles, medibles y capaces de crecer sin perder calidad ni control.'],
      ['26', 'Dirección de personas, liderazgo, cultura y supervisión profesional', 'Seleccionar, incorporar, formar, delegar y supervisar personas para construir un equipo competente y responsable.'],
      ['27', 'Gobernanza, cumplimiento, riesgo y responsabilidad profesional', 'Gestionar alcance, contratos, datos, menores, reclamaciones, seguros y riesgos con reglas claras y trazabilidad.'],
      ['28', 'Investigación aplicada, lectura crítica y decisiones basadas en evidencia', 'Leer estudios con criterio, separar resultados de titulares y decidir cuándo una evidencia es útil para la persona que tienes delante.'],
      ['29', 'Tecnología, datos, inteligencia artificial e innovación aplicada al entrenamiento', 'Elegir wearables, plataformas e IA por utilidad, validez y riesgo, manteniendo siempre supervisión y responsabilidad humana.'],
      ['30', 'Dirección estratégica, integración maestra y Proyecto Final GHC', 'Integrar lo aprendido en una estrategia completa, con prioridades, escenarios y reglas de revisión, y defenderlo en un proyecto final.'],
    ],
  },
];

const decisionShifts = [
  ['De', 'Tener muchas ideas y no saber cuál elegir', 'A', 'Saber qué priorizar y por qué'],
  ['De', 'Copiar una rutina que funcionó a otra persona', 'A', 'Adaptar el entrenamiento al cliente real'],
  ['De', 'Cambiar cosas por intuición o por moda', 'A', 'Cambiar una variable porque tienes una razón'],
  ['De', 'Esperar que el plan salga perfecto', 'A', 'Revisar la respuesta y corregir el rumbo'],
];

const faqs = [
  ['¿Qué incluye exactamente la Edición Fundadora?', 'El Programa Profesional de Entrenamiento Personal completo: tres niveles, treinta módulos, recorrido secuencial, evaluaciones y acompañamiento grupal propio de esta formación. Durante la preventa no se venden niveles individuales.'],
  ['¿Me sirve si todavía no trabajo como entrenador?', 'Sí. El Nivel 1 empieza construyendo la base profesional y el recorrido avanza de forma progresiva. La formación no presupone que ya tengas clientes, pero sí exige estudio, práctica y responsabilidad.'],
  ['¿Y si ya trabajo en el sector?', 'El objetivo no es hacerte empezar de cero, sino ordenar lo que ya sabes, detectar lagunas y darte un sistema para justificar, adaptar y revisar decisiones cuando un caso real se complica.'],
  ['¿Qué acompañamiento grupal incluye?', 'Esta formación high-ticket incluye dos sesiones grupales al mes: una sesión construida a partir de las dudas y temas más solicitados por los alumnos mediante formulario previo, y una sesión Hot Seat para analizar problemas y casos reales del día a día profesional. No es tutoría individual ni disponibilidad personal permanente.'],
  ['¿Por qué existe un precio fundador?', 'Porque entras antes de la apertura oficial y formas parte de la primera generación. La condición fundadora no recorta el programa: reduce el precio para las primeras cien plazas de preventa.'],
  ['¿Qué ocurre después de matricularme?', 'Cuando el pago queda confirmado, tu matrícula queda registrada como plaza fundadora y recibes las comunicaciones transaccionales del proceso de alta y apertura.'],
  ['¿Puedo pagar en dos veces?', 'Sí. La modalidad alternativa es 895 € al matricularte y 895 € quince días naturales después del primer pago confirmado. El total fraccionado es 1.790 €.'],
  ['¿Cuándo abre la plataforma?', 'La apertura académica está fijada para el 15 de octubre de 2026.'],
  ['¿Es una titulación oficial?', 'No. GHC Academy es una formación privada y no equivale a una titulación oficial ni a una habilitación administrativa automática para ejercer. Los requisitos profesionales dependen de la normativa aplicable en cada territorio.'],
  ['¿Habrá tutoría individual?', 'No. El programa incluye acompañamiento grupal y soporte técnico, administrativo y académico básico, pero no mentoría privada ni tutoría individual personalizada.'],
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
          <p className={styles.eyebrow}>Programa Profesional de Entrenamiento Personal · Edición Fundadora 2026</p>
          <h1>Cuando tengas a un cliente delante,<span>que sepas por dónde empezar.</span></h1>
          <p className={styles.heroLead}>
            Tanto si quieres empezar en el sector como si ya trabajas, este programa está pensado para que dejes de depender de rutinas sueltas y ganes seguridad para valorar, programar, adaptar y revisar un entrenamiento real.
          </p>
          <p className={styles.heroSupport}>
            Tres niveles. Treinta módulos. Casos, evaluaciones y acompañamiento grupal para aprender qué hacer, por qué hacerlo y cuándo cambiarlo.
          </p>
          <div className={styles.heroActions}>
            <Link href="/preventa/checkout?plan=single" className={styles.primaryCta}>Quiero mi plaza fundadora · 1.690 €</Link>
            <a href="#recorrido" className={styles.secondaryCta}>Ver qué voy a aprender</a>
          </div>
          <div className="conversion-hero-meta" aria-label="Datos esenciales de la preventa">
            <span>100 plazas máximo</span>
            <span>Preventa hasta 15 septiembre</span>
            <span>Apertura 15 octubre 2026</span>
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
              <span>De la teoría a una persona real</span>
              <strong>Una rutina no te dice qué hacer cuando el caso cambia.</strong>
            </figcaption>
          </figure>
          <div className="conversion-floating-card conversion-floating-card-top">
            <span>Lo que buscamos</span>
            <strong>Menos duda. Más criterio para decidir.</strong>
          </div>
          <div className="conversion-floating-card conversion-floating-card-bottom">
            <span>En la práctica</span>
            <strong>Valorar → decidir → programar → adaptar → revisar</strong>
          </div>
        </div>
      </section>

      <section className="conversion-tension-section">
        <div className="conversion-tension-copy">
          <p className={styles.eyebrow}>Si alguna vez has pensado esto</p>
          <h2>“Sé cosas, pero cuando toca decidir de verdad no siempre tengo claro qué hacer.”</h2>
          <p>
            Puede pasarte cuando estás empezando y todavía no has tenido suficientes clientes. También puede pasarte después de años trabajando: aparece dolor, una limitación, un objetivo que no avanza o una persona que no responde como esperabas.
          </p>
          <strong>No necesitas que alguien te meta más miedo. Necesitas una forma clara de ordenar la información y tomar la siguiente decisión.</strong>
        </div>
        <div className="conversion-question-stack">
          {['¿Qué necesito valorar antes de empezar?', 'Tengo varias opciones. ¿Cuál tiene más sentido aquí?', 'El cliente no responde como esperaba. ¿Qué cambio primero?', '¿Cuándo adapto, cuándo paro y cuándo derivo?'].map((question, index) => (
            <div key={question}><span>0{index + 1}</span><strong>{question}</strong></div>
          ))}
        </div>
      </section>

      <section className="conversion-shift-section">
        <div className="conversion-shift-head">
          <p className={styles.eyebrow}>Lo que queremos que cambie</p>
          <h2>No se trata de saber más ejercicios. Se trata de sentirte más seguro cuando tienes que decidir.</h2>
          <p>La teoría importa. Pero el salto profesional llega cuando puedes convertirla en una decisión concreta para una persona concreta, observar qué ocurre y cambiar el plan sin perder el rumbo.</p>
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
          <div><p className={styles.eyebrow}>¿Te ves aquí?</p><h2>Está pensado para quien quiere empezar bien y para quien ya trabaja pero quiere dejar de improvisar.</h2></div>
          <p>No te hablamos como si todos llegaran con la misma experiencia. El punto de partida puede ser distinto; el objetivo es el mismo: tener criterio para trabajar con personas reales.</p>
        </div>
        <div className={styles.paymentGrid}>
          {entryProfiles.map(([number, title, result]) => (
            <article key={number} className={styles.entryCard}><span className={styles.cardNumber}>{number}</span><h3>{title}</h3><strong>{result}</strong></article>
          ))}
        </div>
      </section>

      <section className={styles.systemSection} id="recorrido">
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Cómo vas a aprender a trabajar</p>
          <h2>Primero entiendes. Después decides. Luego compruebas si tu decisión funciona.</h2>
          <p>No queremos que dependas de una plantilla universal. Queremos que tengas una secuencia sencilla para enfrentarte a casos distintos sin empezar de cero cada vez.</p>
        </div>
        <div className={styles.systemTrack}>
          {ghcSystem.map(([title, text], index) => (
            <article key={title} className={styles.systemStep}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="conversion-mid-cta">
        <div>
          <span>Programa Profesional de Entrenamiento Personal</span>
          <strong>Si lo que te falta no es otra rutina, sino saber qué hacer cuando la rutina deja de encajar, este recorrido está pensado para ti.</strong>
        </div>
        <Link href="/preventa/checkout?plan=single">Entrar por 1.690 €</Link>
      </section>

      <section className={styles.levelSection}>
        <div className={styles.sectionIntroRow}>
          <div><p className={styles.eyebrow}>El recorrido completo</p><h2>Tres niveles que te llevan de la base al trabajo real y de ahí a dirigir tu servicio.</h2></div>
          <p>No son tres carpetas con nombres bonitos. Cada nivel resuelve una etapa distinta y prepara la siguiente.</p>
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

      <section className={styles.faqSection}>
        <div className={styles.sectionIntroRow}>
          <div><p className={styles.eyebrow}>Qué hay dentro</p><h2>Los 30 módulos, explicados sin jerga.</h2></div>
          <p>Abre cada nivel y podrás ver qué vas a estudiar y para qué te sirve. Una frase por módulo, sin obligarte a interpretar títulos ambiguos.</p>
        </div>
        <div className={styles.faqList}>
          {moduleGroups.map((group) => (
            <details key={group.label}>
              <summary>{group.label}</summary>
              <div className={styles.proofList}>
                {group.modules.map(([number, title, description]) => (
                  <div key={number}>
                    <span>{number}</span>
                    <strong>{title} — {description}</strong>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Acompañamiento incluido en este programa</p>
          <h2>No queremos darte treinta módulos y dejarte solo cuando aparezcan las dudas de verdad.</h2>
          <p>
            Esta formación incorpora dos sesiones grupales al mes. Una nace de las preguntas que enviáis antes mediante un formulario: agrupamos las dudas, detectamos el tema que más se repite y hacemos una sesión centrada en resolverlo.
          </p>
          <p>
            La otra es un Hot Seat de casos reales: alumnos cuentan situaciones de su día a día y Alby explica cómo las analizaría, qué información pediría, qué opciones valoraría y por qué tomaría una decisión u otra.
          </p>
          <div className={styles.legalNote}><strong>Acompañamiento grupal, no disponibilidad infinita</strong><span>No incluye tutoría individual, WhatsApp personal, revisión privada ilimitada ni mentoría uno a uno.</span></div>
        </div>
        <div className={styles.scoreCard}>
          <span>Acompañamiento del programa</span>
          <strong>2</strong>
          <p>sesiones grupales al mes</p>
          <small>1 sesión sobre las dudas más solicitadas + 1 Hot Seat de problemas y casos reales.</small>
        </div>
      </section>

      <section className="conversion-proof-section">
        <div className="conversion-proof-copy">
          <p className={styles.eyebrow}>Una formación que ya tiene estructura</p>
          <h2>No estás comprando una idea que todavía hay que inventar.</h2>
          <p>Los tres niveles y los treinta módulos ya tienen una arquitectura académica cerrada. La preventa te permite entrar antes de la apertura con una condición económica reservada a la primera generación.</p>
          <div className="conversion-proof-list">
            <div><span>01</span><strong>3 niveles y 30 módulos conectados entre sí.</strong></div>
            <div><span>02</span><strong>Evaluación por módulo para comprobar comprensión antes de avanzar.</strong></div>
            <div><span>03</span><strong>Umbral académico del 80 % y certificados privados verificables.</strong></div>
            <div><span>04</span><strong>Apertura académica: 15 de octubre de 2026.</strong></div>
          </div>
        </div>
        <aside className="conversion-proof-card">
          <span>La pregunta que importa</span>
          <strong>¿Qué harías mañana si tu cliente no encaja en ninguna de las rutinas que conoces?</strong>
          <p>Ese es el tipo de situación para la que queremos prepararte.</p>
        </aside>
      </section>

      <section className="conversion-price-story" id="precio">
        <div className="conversion-price-head">
          <div>
            <p className={styles.eyebrow}>La condición fundadora, sin rodeos</p>
            <h2>Los tres niveles por separado suman 2.670 €. El pack oficial será 2.290 €. Ahora son 1.690 €.</h2>
          </div>
          <p>La Edición Fundadora incluye el programa completo. No quitamos módulos para bajar el precio: la diferencia económica existe porque entras antes de la apertura y formas parte de las primeras cien plazas.</p>
        </div>
        <div className="conversion-price-levels">
          {levels.map(([label, title, , price]) => (
            <div key={label}><span>{label} · {title}</span><strong>{price}</strong></div>
          ))}
        </div>
        <div className="conversion-price-path" aria-label="Comparación de precios">
          <div><span>Los 3 niveles por separado</span><strong>2.670 €</strong></div>
          <i>→</i>
          <div><span>Pack completo oficial</span><strong>2.290 €</strong></div>
          <i>→</i>
          <div className="featured"><span>Edición Fundadora · primeras 100 plazas</span><strong>1.690 €</strong><del>2.290 €</del></div>
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
          <Link href="/preventa/checkout?plan=single">Quiero mi plaza fundadora · 1.690 €</Link>
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Aprender también significa demostrarlo</p>
          <h2>No queremos que pases páginas. Queremos que puedas explicar por qué tomas una decisión.</h2>
          <p>El modelo contempla avance secuencial, evaluación por módulo y certificados privados verificables. El objetivo es comprobar comprensión y aplicación, no premiar que hayas llegado hasta el final de un vídeo.</p>
          <div className={styles.legalNote}><strong>Formación privada</strong><span>No constituye una titulación oficial ni una habilitación administrativa automática para ejercer.</span></div>
        </div>
        <div className={styles.scoreCard}><span>Umbral académico diseñado</span><strong>80 %</strong><p>por módulo</p><div className={styles.scoreTrack}><i /></div><small>Las evaluaciones y controles académicos forman parte del diseño de la plataforma Academy.</small></div>
      </section>

      <section className={styles.authoritySection}>
        <div className="conversion-authority-stat" aria-label="Más de treinta años de experiencia"><div><strong>30+</strong><span>años de experiencia</span></div></div>
        <div>
          <p className={styles.eyebrow}>Quién está detrás</p>
          <h2>Esta formación nace de una pregunta muy sencilla: “¿por qué estás haciendo eso con ese cliente?”</h2>
          <p>Alby Aguiar, fundador de GHC Training, dirige el programa desde una trayectoria de más de treinta años vinculada al entrenamiento, el rendimiento, la gestión de servicios y el trabajo con personas con necesidades diferentes.</p>
          <p>La idea no es que repitas lo que hace Alby. Es que aprendas a mirar un caso, ordenar la información, justificar una decisión y cambiarla cuando la respuesta de la persona te diga que debes hacerlo.</p>
        </div>
      </section>

      <section className={styles.paymentSection}>
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Elige cómo entrar</p>
          <h2>1.690 € para las primeras 100 plazas.</h2>
          <p>El pago único mantiene la mejor condición económica. Si prefieres dividirlo, existe una modalidad de dos cuotas con un total de 1.790 €.</p>
        </div>
        <div className={styles.paymentGrid}>
          <article className={styles.paymentCardFeatured}>
            <span className={styles.paymentLabel}>Mejor condición económica</span>
            <h3>Pago único</h3>
            <strong>1.690 €</strong>
            <p>Programa completo: tres niveles y treinta módulos. Un solo pago y 600 € menos que el precio oficial futuro del pack.</p>
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
          <div><p className={styles.eyebrow}>Antes de decidir</p><h2>Lo que necesitas saber antes de pagar.</h2></div>
          <p>Sin letra pequeña escondida detrás de un botón. Estas son las preguntas que más sentido tiene resolver antes de entrar.</p>
        </div>
        <div className={styles.faqList}>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="conversion-final-section">
        <div>
          <p className={styles.eyebrow}>Primera generación · GHC Academy</p>
          <h2>Si quieres sentirte más seguro cuando tengas que decidir, aquí tienes un recorrido para construir ese criterio.</h2>
          <p>La Edición Fundadora cierra el 15 de septiembre de 2026 o cuando se completen las cien plazas. La plataforma académica abre el 15 de octubre de 2026.</p>
        </div>
        <div className="conversion-final-action">
          <Link href="/preventa/checkout?plan=single">Entrar en la Edición Fundadora · 1.690 €</Link>
          <span>También disponible en 895 € + 895 € · total 1.790 €</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <GHCLogo size="sm" showText tagline />
        <p>GHC Academy · Programa Profesional de Entrenamiento Personal · Formación privada online · Edición Fundadora 2026.</p>
        <div><span>3 niveles</span><span>30 módulos</span><span>100 plazas fundadoras</span></div>
      </footer>
    </main>
  );
}
