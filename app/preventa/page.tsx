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
    'Buscas una formación que te dé una base seria antes de trabajar con personas: entender el cuerpo, valorar, programar, adaptar, comunicar y saber dónde están tus límites profesionales.',
  ],
  [
    '02',
    'Ya eres entrenador personal',
    'Ya tienes experiencia, pero quieres ampliar conocimientos, ordenar lo que has aprendido por separado y sentir más seguridad cuando aparece un caso que no encaja en lo habitual.',
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
    'Módulos 1–10',
    '690 €',
    'Construyes los fundamentos del entrenador personal: profesión, anatomía, kinesiología, fisiología, principios del entrenamiento, nutrición, evaluación, movimiento, técnica, seguridad y responsabilidad.',
  ],
  [
    'Nivel 2',
    'Profundizar, programar y adaptar',
    'Módulos 11–20',
    '890 €',
    'Llevas esa base a objetivos y situaciones más complejas: hipertrofia, fuerza, resistencia, periodización, nutrición avanzada, patologías, poblaciones especiales, preparación física, recuperación y retorno al entrenamiento.',
  ],
  [
    'Nivel 3',
    'Convertirte en un profesional completo',
    'Módulos 21–30',
    '1.090 €',
    'Integras la parte humana y profesional: adherencia, comunicación, experiencia de cliente, marketing ético, precios, procesos, liderazgo, riesgo, evidencia, tecnología, IA y dirección estratégica.',
  ],
];

const moduleGroups = [
  {
    label: 'Nivel 1 · Fundamentos profesionales',
    modules: [
      ['01', 'La profesión del entrenador personal', 'Qué hace un entrenador, qué decisiones le corresponden, dónde están sus límites y cómo trabajar con ética, tecnología y responsabilidad.'],
      ['02', 'Anatomía y kinesiología I', 'Entender huesos, articulaciones, dolor y variaciones del movimiento para interpretar mejor a la persona y adaptar el trabajo sin convertir observaciones en diagnósticos.'],
      ['03', 'Anatomía y kinesiología II', 'Comprender músculo, tejido conjuntivo, control neural y producción de fuerza para saber qué exige una tarea al cuerpo.'],
      ['04', 'Fisiología I', 'Entender la respuesta cardiovascular y respiratoria al esfuerzo para ajustar intensidad y entrenar con mayor seguridad.'],
      ['05', 'Fisiología II', 'Comprender cómo responden los sistemas nervioso, endocrino y metabólico y cómo esa respuesta afecta al entrenamiento y la recuperación.'],
      ['06', 'Principios del entrenamiento', 'Aprender a manejar dosis, adaptación, progresión, fatiga y planificación para que un programa tenga una lógica y pueda evolucionar.'],
      ['07', 'Nutrición aplicada al entrenamiento', 'Manejar nutrición general, hidratación y suplementos con criterio, sabiendo qué puedes orientar y qué requiere otro profesional.'],
      ['08', 'Evaluación profesional del cliente', 'Saber qué preguntar, qué comprobar, qué medir y cuándo reevaluar para que la valoración sirva realmente para tomar decisiones.'],
      ['09', 'Movimiento, patrones y técnica', 'Enseñar y adaptar movimientos, seleccionar tareas y corregir lo que importa sin depender de una técnica única para todo el mundo.'],
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
  ['De', 'Estudiar conceptos como piezas sueltas', 'A', 'Entender cómo se relacionan entre sí'],
  ['De', 'Memorizar información', 'A', 'Comprender qué significa y cuándo importa'],
  ['De', 'Saber teoría pero dudar al aplicarla', 'A', 'Convertir conocimiento en decisiones concretas'],
  ['De', 'Sentir que siempre te falta una respuesta', 'A', 'Tener un proceso para razonar la siguiente decisión'],
];

const faqs = [
  ['¿Qué incluye exactamente la Edición Fundadora?', 'El Programa Profesional de Entrenamiento Personal completo: tres niveles, treinta módulos, recorrido secuencial, evaluaciones y acompañamiento grupal propio de esta formación. Durante la preventa no se venden niveles individuales.'],
  ['¿Me sirve si todavía no trabajo como entrenador personal?', 'Sí. El Nivel 1 empieza construyendo la base profesional y el recorrido avanza de forma progresiva. La formación no presupone que ya tengas clientes, pero sí exige estudio, práctica y responsabilidad.'],
  ['¿Y si ya soy entrenador personal?', 'El objetivo no es hacerte empezar de cero, sino ampliar y ordenar lo que ya sabes, detectar lagunas y conectar conocimientos para que puedas justificar, adaptar y revisar mejor tus decisiones.'],
  ['¿Qué acompañamiento grupal incluye?', 'El programa incluye dos sesiones grupales al mes: una sesión construida a partir de las dudas y temas más solicitados por los alumnos mediante formulario previo, y una sesión Hot Seat para analizar problemas y casos reales del día a día profesional. No es tutoría individual ni disponibilidad personal permanente.'],
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
            No vas a estudiar treinta temas aislados. Vas a aprender a comprenderlos, relacionarlos y utilizarlos para trabajar con más criterio, más seguridad y una visión mucho más completa del entrenamiento personal.
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
          <div className={styles.heroFacts}>
            <div><strong>3</strong><span>Niveles conectados</span></div>
            <div><strong>30</strong><span>Módulos</span></div>
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
          <strong>La seguridad profesional no se finge. Se construye entendiendo mejor tu profesión y teniendo más recursos para pensar.</strong>
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
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>Dos puntos de partida</p>
            <h2>Tanto si quieres convertirte en entrenador personal como si ya ejerces, el objetivo es que tu preparación crezca de verdad.</h2>
          </div>
          <p>
            No partimos de la idea de que todos saben lo mismo. Partimos de una necesidad común: comprender mejor, ampliar recursos y poder trabajar con más seguridad y criterio.
          </p>
        </div>
        <div className={styles.paymentGrid}>
          {entryProfiles.map(([number, title, result]) => (
            <article key={number} className={styles.entryCard}>
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
          <h2>Saber más es importante. Entender mejor y saber utilizar ese conocimiento es lo que cambia tu forma de trabajar.</h2>
          <p>
            El programa está diseñado para que cada área sume a las demás. Anatomía no va por un lado, fisiología por otro y programación por otro: el valor aparece cuando empiezas a ver cómo se relacionan.
          </p>
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
          <div>
            <p className={styles.eyebrow}>El mapa de conocimientos</p>
            <h2>Esto no es un curso centrado en ejercicios. Es una formación amplia para entender la profesión de entrenador personal.</h2>
          </div>
          <p>
            Estas son algunas de las grandes áreas que vas a recorrer. Cada una aporta una pieza distinta y el programa está construido para que acabes conectándolas.
          </p>
        </div>
        <div className={styles.entryGrid}>
          {knowledgeAreas.map(([number, title, text]) => (
            <article key={number} className={styles.entryCard}>
              <span className={styles.cardNumber}>{number}</span>
              <h3>{title}</h3>
              <strong>{text}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.levelSection} id="contenido">
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>El programa completo</p>
            <h2>Tres niveles. Treinta módulos. De los fundamentos del cuerpo a la dirección de tu servicio profesional.</h2>
          </div>
          <p>
            La profundidad crece nivel a nivel. Primero construyes la base, después aprendes a trabajar con situaciones más complejas y finalmente integras la parte humana, profesional y estratégica.
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
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>Qué vas a estudiar exactamente</p>
            <h2>Los 30 módulos, uno por uno y con una explicación clara de para qué sirven.</h2>
          </div>
          <p>
            No queremos que compres por un nombre bonito. Abre cada nivel y mira el contenido real antes de decidir.
          </p>
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

      <section className={styles.systemSection}>
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Cómo está pensado el aprendizaje</p>
          <h2>No basta con acumular información. Queremos que puedas convertirla en comprensión y después en criterio.</h2>
          <p>
            El recorrido busca que avances desde el conocimiento hasta la aplicación: aprender, entender, relacionar, evaluar, decidir, aplicar y revisar.
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
          <strong>La meta no es que termines diciendo “he visto treinta módulos”. Es que notes que sabes más, entiendes más y tienes más herramientas para ejercer tu profesión.</strong>
        </div>
        <a href="#acompanamiento">Ver el acompañamiento</a>
      </section>

      <section className={styles.evaluationSection} id="acompanamiento">
        <div>
          <p className={styles.eyebrow}>Acompañamiento incluido</p>
          <h2>Porque hay dudas que aparecen cuando empiezas a conectar la teoría con situaciones reales.</h2>
          <p>
            El programa incorpora dos sesiones grupales al mes. Una se construye a partir de las preguntas que enviáis previamente mediante un formulario: agrupamos las dudas, detectamos el tema que más se repite y dedicamos una sesión a trabajarlo.
          </p>
          <p>
            La otra es un Hot Seat de casos reales: alumnos plantean situaciones de su día a día y Alby explica cómo las analizaría, qué información pediría, qué opciones valoraría y qué razonamiento seguiría.
          </p>
          <div className={styles.legalNote}>
            <strong>Acompañamiento grupal</strong>
            <span>No incluye tutoría individual, WhatsApp personal, revisión privada ilimitada ni mentoría uno a uno.</span>
          </div>
        </div>
        <div className={styles.scoreCard}>
          <span>Acompañamiento del programa</span>
          <strong>2</strong>
          <p>sesiones grupales al mes</p>
          <small>1 sesión sobre las dudas más solicitadas + 1 Hot Seat de problemas y casos reales.</small>
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Aprender también significa demostrarlo</p>
          <h2>Queremos comprobar que entiendes lo que estudias, no que simplemente hayas pasado por el contenido.</h2>
          <p>
            El modelo contempla avance secuencial, evaluación por módulo y certificados privados verificables. El objetivo es comprobar comprensión y aplicación antes de seguir avanzando.
          </p>
          <div className={styles.legalNote}>
            <strong>Formación privada</strong>
            <span>No constituye una titulación oficial ni una habilitación administrativa automática para ejercer.</span>
          </div>
        </div>
        <div className={styles.scoreCard}>
          <span>Umbral académico diseñado</span>
          <strong>80 %</strong>
          <p>por módulo</p>
          <div className={styles.scoreTrack}><i /></div>
          <small>Las evaluaciones y controles académicos forman parte del diseño de la plataforma Academy.</small>
        </div>
      </section>

      <section className={styles.authoritySection}>
        <div className="conversion-authority-stat" aria-label="Más de treinta años de experiencia">
          <div><strong>30+</strong><span>años de experiencia</span></div>
        </div>
        <div>
          <p className={styles.eyebrow}>Quién está detrás</p>
          <h2>Una formación construida desde más de treinta años dentro del entrenamiento, el rendimiento y la gestión de personas y servicios.</h2>
          <p>
            Alby Aguiar, fundador de GHC Training, dirige el programa desde una trayectoria vinculada al entrenamiento, el rendimiento, la gestión de servicios y el trabajo con personas con necesidades diferentes.
          </p>
          <p>
            GHC Academy nace para reunir en un mismo recorrido conocimientos que muchas veces se aprenden separados y convertirlos en una forma de entender la profesión: saber qué estás viendo, por qué importa, qué puedes hacer con esa información y cuándo necesitas cambiar de rumbo o derivar.
          </p>
        </div>
      </section>

      <section className="conversion-proof-section">
        <div className="conversion-proof-copy">
          <p className={styles.eyebrow}>Una formación con estructura real</p>
          <h2>Antes de abrir la preventa, los tres niveles y los treinta módulos ya estaban definidos.</h2>
          <p>
            No estás comprando una lista de temas por desarrollar. La arquitectura académica del programa está cerrada y la apertura de la plataforma está fijada para el 15 de octubre de 2026.
          </p>
          <div className="conversion-proof-list">
            <div><span>01</span><strong>3 niveles y 30 módulos conectados entre sí.</strong></div>
            <div><span>02</span><strong>Evaluación por módulo para comprobar comprensión antes de avanzar.</strong></div>
            <div><span>03</span><strong>Umbral académico del 80 % y certificados privados verificables.</strong></div>
            <div><span>04</span><strong>Apertura académica: 15 de octubre de 2026.</strong></div>
          </div>
        </div>
        <aside className="conversion-proof-card">
          <span>Lo que queremos que te lleves</span>
          <strong>Más conocimiento. Más comprensión. Más recursos. Más seguridad para ejercer como entrenador personal.</strong>
          <p>Ese es el hilo que conecta los tres niveles.</p>
        </aside>
      </section>

      <section className="conversion-price-story" id="precio">
        <div className="conversion-price-head">
          <div>
            <p className={styles.eyebrow}>Ahora sí: la condición fundadora</p>
            <h2>Los tres niveles por separado suman 2.670 €. El pack completo oficial será 2.290 €. La Edición Fundadora son 1.690 €.</h2>
          </div>
          <p>
            Primero queríamos que vieras qué estás comprando. La condición fundadora incluye el programa completo: los tres niveles, los treinta módulos, las evaluaciones y el acompañamiento grupal.
          </p>
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
          <div className="featured">
            <span>Edición Fundadora · primeras 100 plazas</span>
            <strong>1.690 €</strong>
            <del>2.290 €</del>
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

      <section className={styles.paymentSection}>
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Elige cómo entrar</p>
          <h2>Pago único de 1.690 € o dos pagos de 895 €.</h2>
          <p>
            El pago único mantiene la mejor condición económica. La modalidad fraccionada suma 1.790 € y la segunda cuota vence quince días naturales después del primer pago confirmado.
          </p>
        </div>
        <div className={styles.paymentGrid}>
          <article className={styles.paymentCardFeatured}>
            <span className={styles.paymentLabel}>Mejor condición económica</span>
            <h3>Pago único</h3>
            <strong>1.690 €</strong>
            <p>Programa completo: tres niveles, treinta módulos, evaluaciones y acompañamiento grupal.</p>
            <Link href={singleHref} className={styles.primaryCta} style={{ width: '100%', marginTop: 22 }}>
              Elegir pago único · 1.690 €
            </Link>
          </article>
          <article className={styles.paymentCard}>
            <span className={styles.paymentLabel}>Modalidad alternativa</span>
            <h3>895 € + 895 €</h3>
            <strong>1.790 € total</strong>
            <p>Primera cuota al matricularte. Segunda cuota de 895 € quince días naturales después del primer pago confirmado.</p>
            <Link href={splitHref} className={styles.secondaryCta} style={{ width: '100%', marginTop: 22 }}>
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
        <div>
          <p className={styles.eyebrow}>Primera generación · GHC Academy</p>
          <h2>Si quieres convertirte en entrenador personal con una base sólida, o llevar mucho más lejos la preparación que ya tienes, este es el recorrido que hemos construido para ello.</h2>
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
        <div><span>3 niveles</span><span>30 módulos</span><span>100 plazas fundadoras</span></div>
      </footer>
    </main>
  );
}
