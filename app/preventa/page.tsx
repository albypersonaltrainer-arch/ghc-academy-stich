import Link from 'next/link';
import GHCLogo from '../components/GHCLogo';
import styles from './preventa.module.css';

export const metadata = {
  title: 'Edición Fundadora 2026 · GHC Academy',
  description:
    'Tres niveles, treinta módulos y un sistema profesional para comprender, evaluar, programar, aplicar y revisar el entrenamiento personal.',
};

const entryProfiles = [
  {
    number: '01',
    title: 'Ya trabajas en el sector',
    tension:
      'Tienes experiencia y conocimientos, pero necesitas integrarlos en un sistema que te ayude a decidir con más orden y consistencia.',
    possibility: 'Actualizar, conectar y sistematizar lo que ya sabes.',
  },
  {
    number: '02',
    title: 'Estás estudiando',
    tension:
      'Recibes materias separadas y te cuesta convertirlas en decisiones aplicables a una persona real.',
    possibility: 'Conectar teoría, evaluación y práctica profesional.',
  },
  {
    number: '03',
    title: 'Buscas una reconversión',
    tension:
      'No quieres empezar copiando rutinas ni acumulando certificados sin comprender el trabajo que vas a realizar.',
    possibility: 'Construir una preparación estructurada desde la base.',
  },
  {
    number: '04',
    title: 'El entrenamiento despertó una vocación',
    tension:
      'Has vivido el proceso como usuario y ahora quieres saber si puedes convertir ese interés en una capacidad profesional responsable.',
    possibility: 'Pasar de la experiencia personal al criterio profesional.',
  },
];

const ghcSystem = [
  ['Comprender', 'Entender mecanismos y contexto antes de aplicar recetas.'],
  ['Evaluar', 'Observar qué ocurre, qué limita y qué información importa.'],
  ['Decidir', 'Priorizar con criterio en lugar de acumular opciones.'],
  ['Programar', 'Convertir objetivos y restricciones en una estructura razonada.'],
  ['Aplicar', 'Llevar el plan a sesiones, tareas y decisiones concretas.'],
  ['Revisar', 'Medir, interpretar y ajustar sin repetir por inercia.'],
  ['Dirigir', 'Ordenar el servicio, la comunicación y la responsabilidad profesional.'],
];

const levels = [
  {
    label: 'Nivel 1',
    title: 'Construir la base',
    text: 'Organizar los fundamentos necesarios para comprender a la persona, el movimiento y la lógica del entrenamiento antes de programar.',
    marker: 'Módulos 1–10',
  },
  {
    label: 'Nivel 2',
    title: 'Integrar y programar',
    text: 'Relacionar evaluación, objetivos, variables y contexto para diseñar decisiones coherentes y progresiones individualizadas.',
    marker: 'Módulos 11–20',
  },
  {
    label: 'Nivel 3',
    title: 'Aplicar, revisar y dirigir',
    text: 'Profundizar en la aplicación profesional, el análisis de casos, la revisión del proceso y la dirección responsable del servicio.',
    marker: 'Módulos 21–30',
  },
];

const proofItems = [
  'Tres niveles estructurados y treinta módulos cerrados.',
  'Herramientas originales GHC para ordenar la toma de decisiones.',
  'Casos, laboratorios, evaluaciones y proyectos de aplicación.',
  'Sistema de certificados privados verificables ya construido.',
];

const founderBenefits = [
  {
    title: 'Condición económica fundadora',
    text: 'Precio especial de preventa. Los importes se incorporarán únicamente después del Gate económico.',
  },
  {
    title: '15 % en futuras formaciones propias',
    text: 'Beneficio personal sujeto a condiciones, exclusiones y redacción jurídica definitiva.',
  },
  {
    title: 'Actualizaciones de los niveles adquiridos',
    text: 'Correcciones, mejoras y nuevas ediciones de esos mismos niveles, conforme a las condiciones finales.',
  },
  {
    title: 'Prioridad en plazas limitadas',
    text: 'Acceso anticipado o preferente cuando una futura formación propia establezca un periodo reservado.',
  },
];

const faqs = [
  {
    question: '¿Qué incluye la Edición Fundadora?',
    answer:
      'El pack completo de GHC Academy: tres niveles y treinta módulos. Durante la preventa no se venderán niveles individuales.',
  },
  {
    question: '¿Cuándo abre la plataforma?',
    answer:
      'La apertura académica está prevista durante octubre de 2026. El día exacto se comunicará cuando pueda garantizarse.',
  },
  {
    question: '¿Es una titulación oficial?',
    answer:
      'No. GHC Academy es una formación privada. Su superación no equivale a una titulación oficial, una licencia profesional universal ni una habilitación automática para ejercer.',
  },
  {
    question: '¿Cómo se avanza por los módulos?',
    answer:
      'El recorrido está diseñado para ser secuencial. La publicación final del desbloqueo, el umbral del 80 % y los intentos requiere validación técnica extremo a extremo antes de abrir cobros.',
  },
  {
    question: '¿Habrá tutoría individual?',
    answer:
      'La V1 contempla soporte técnico, administrativo y académico básico. No incluye mentoría ni tutoría personalizada.',
  },
  {
    question: '¿Puedo descargar el contenido?',
    answer:
      'El contenido académico principal se consulta dentro de la plataforma. La cuenta es personal y no permite compartir credenciales ni redistribuir materiales.',
  },
  {
    question: '¿Cuándo cierra la preventa?',
    answer:
      'El 15 de septiembre de 2026 a las 23:59, hora de Madrid, o antes si se completan las cien plazas fundadoras.',
  },
];

export default function PreventaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.internalBanner} role="status">
        <strong>Borrador interno</strong>
        <span>No publicar, cobrar ni prometer hasta superar los Gates jurídico, técnico y económico.</span>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="Ir a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>

        <div className={styles.editionTag}>
          <span className={styles.liveDot} />
          Edición Fundadora 2026 · Hasta 100 plazas
        </div>

        <a href="#estado-preventa" className={styles.headerCta}>
          Estado de la matrícula
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>De acumular conocimientos a saber decidir</p>
          <h1>
            No necesitas acumular más información.
            <span>Necesitas aprender a decidir.</span>
          </h1>
          <p className={styles.heroLead}>
            Una formación integral y aplicada para quienes quieren iniciarse, actualizarse o
            desarrollarse profesionalmente en el entrenamiento personal.
          </p>
          <p className={styles.heroSupport}>
            Tres niveles. Treinta módulos. Un sistema para comprender, evaluar, programar,
            aplicar y revisar.
          </p>

          <div className={styles.heroActions}>
            <a href="#edicion-fundadora" className={styles.primaryCta}>
              Conocer la Edición Fundadora
            </a>
            <a href="#recorrido" className={styles.secondaryCta}>
              Ver cómo está construida
            </a>
          </div>

          <div className={styles.heroFacts} aria-label="Datos principales">
            <div>
              <strong>3</strong>
              <span>Niveles</span>
            </div>
            <div>
              <strong>30</strong>
              <span>Módulos</span>
            </div>
            <div>
              <strong>100</strong>
              <span>Plazas fundadoras</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Trabajo profesional en entrenamiento personal">
          <figure className={styles.heroMainImage}>
            <img
              src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=88"
              alt="Profesional supervisando una sesión de entrenamiento"
            />
            <figcaption>
              <span>Evaluar antes de prescribir</span>
              <strong>Criterio aplicado a personas reales</strong>
            </figcaption>
          </figure>

          <figure className={styles.heroDetailImage}>
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=86"
              alt="Pantalla con datos y análisis de rendimiento"
            />
          </figure>

          <div className={styles.heroDecisionCard}>
            <span>Sistema GHC</span>
            <strong>Observar → priorizar → decidir → revisar</strong>
            <div className={styles.decisionBars} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>El problema no siempre es saber poco</p>
          <h2>Información sin arquitectura no se convierte automáticamente en criterio.</h2>
        </div>

        <div className={styles.problemGrid}>
          <div className={styles.problemText}>
            <p>
              Puedes haber estudiado anatomía, ejercicios, nutrición o programación y seguir sin
              tener claro qué observar, qué priorizar o cómo adaptar una decisión a una persona
              real.
            </p>
            <p>
              GHC Academy nace para ordenar ese proceso: comprender antes de aplicar, priorizar
              antes de acumular y revisar antes de repetir.
            </p>
          </div>

          <div className={styles.questionPanel}>
            {[
              '¿Qué debo evaluar?',
              '¿Qué es prioritario ahora?',
              '¿Cómo adapto el programa?',
              '¿Cuándo debo ajustar?',
              '¿Cuándo debo derivar?',
              '¿Cómo documento el proceso?',
            ].map((question) => (
              <div key={question}>
                <span>+</span>
                <strong>{question}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.entrySection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>Cuatro puertas de entrada</p>
            <h2>Puedes llegar desde lugares distintos y buscar el mismo destino.</h2>
          </div>
          <p>
            El punto común no es la ocupación actual. Es la intención seria de estudiar,
            comprender y asumir la responsabilidad de trabajar con otras personas.
          </p>
        </div>

        <div className={styles.entryGrid}>
          {entryProfiles.map((profile) => (
            <article key={profile.number} className={styles.entryCard}>
              <span className={styles.cardNumber}>{profile.number}</span>
              <h3>{profile.title}</h3>
              <p>{profile.tension}</p>
              <strong>{profile.possibility}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.editorialBand}>
        <figure className={styles.editorialImageWide}>
          <img
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=86"
            alt="Entrenamiento supervisado en un entorno profesional"
          />
        </figure>
        <div className={styles.editorialCopy}>
          <p className={styles.eyebrow}>La posibilidad profesional</p>
          <h2>De la improvisación a una preparación estructurada.</h2>
          <div className={styles.contrastList}>
            <div>
              <span>Información dispersa</span>
              <strong>Criterio integrado</strong>
            </div>
            <div>
              <span>Rutinas copiadas</span>
              <strong>Programas razonados</strong>
            </div>
            <div>
              <span>Sesiones aisladas</span>
              <strong>Servicio profesional</strong>
            </div>
            <div>
              <span>Repetición por inercia</span>
              <strong>Revisión y ajuste</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.systemSection} id="recorrido">
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>El mecanismo</p>
          <h2>El Sistema GHC convierte contenidos en una secuencia de decisiones.</h2>
          <p>
            La formación no se plantea como una colección de ejercicios, sino como una arquitectura
            para comprender, evaluar, decidir, programar, aplicar, revisar y dirigir.
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

      <section className={styles.levelSection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>El recorrido completo</p>
            <h2>Tres niveles conectados. Treinta módulos. Una progresión.</h2>
          </div>
          <p>
            Todos los niveles forman parte del producto desde la apertura. El avance efectivo está
            diseñado para depender del progreso del alumno, no de una liberación mensual artificial.
          </p>
        </div>

        <div className={styles.levelGrid}>
          {levels.map((level, index) => (
            <article key={level.label} className={styles.levelCard}>
              <div className={styles.levelTopline}>
                <span>{level.label}</span>
                <strong>{level.marker}</strong>
              </div>
              <div className={styles.levelIndex}>{index + 1}</div>
              <h3>{level.title}</h3>
              <p>{level.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.proofSection}>
        <div className={styles.proofVisual}>
          <figure>
            <img
              src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=86"
              alt="Aplicación práctica de entrenamiento de fuerza"
            />
          </figure>
          <div className={styles.proofBadge}>
            <span>Trabajo ya realizado</span>
            <strong>Núcleo académico cerrado</strong>
          </div>
        </div>

        <div className={styles.proofCopy}>
          <p className={styles.eyebrow}>La prueba no es una promesa</p>
          <h2>GHC Academy ya tiene una estructura académica completa.</h2>
          <div className={styles.proofList}>
            {proofItems.map((item, index) => (
              <div key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.evaluationSection}>
        <div>
          <p className={styles.eyebrow}>Aprendizaje y evaluación</p>
          <h2>El progreso debe demostrarse, no presumirse.</h2>
          <p>
            El modelo académico contempla avance secuencial, evaluación por módulo y certificados
            privados verificables por nivel y al completar los treinta módulos.
          </p>
          <div className={styles.legalNote}>
            <strong>Naturaleza privada</strong>
            <span>
              Los certificados GHC Academy no constituyen una titulación oficial ni una habilitación
              administrativa automática. La redacción definitiva está sujeta a revisión jurídica.
            </span>
          </div>
        </div>

        <div className={styles.scoreCard}>
          <span>Umbral académico diseñado</span>
          <strong>80 %</strong>
          <p>por módulo</p>
          <div className={styles.scoreTrack} aria-hidden="true">
            <i />
          </div>
          <small>Flujo técnico pendiente de validación extremo a extremo antes de publicar.</small>
        </div>
      </section>

      <section className={styles.founderSection} id="edicion-fundadora">
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Primera generación</p>
          <h2>Edición Fundadora GHC Academy 2026</h2>
          <p>
            Una condición real reservada a las primeras cien plazas y disponible hasta el 15 de
            septiembre de 2026 a las 23:59, hora de Madrid, o hasta completar el cupo.
          </p>
        </div>

        <div className={styles.benefitGrid}>
          {founderBenefits.map((benefit, index) => (
            <article key={benefit.title} className={styles.benefitCard}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.deadlineStrip}>
          <div>
            <span>Cierre ordinario</span>
            <strong>15 septiembre 2026 · 23:59 Madrid</strong>
          </div>
          <div>
            <span>Cierre anticipado</span>
            <strong>Al completar 100 plazas</strong>
          </div>
          <div>
            <span>Apertura académica</span>
            <strong>Durante octubre de 2026</strong>
          </div>
        </div>
      </section>

      <section className={styles.authoritySection}>
        <div className={styles.authorityMark} aria-hidden="true">
          GHC
        </div>
        <div>
          <p className={styles.eyebrow}>Dirección académica</p>
          <h2>Una academia construida desde la ciencia aplicada y la experiencia real.</h2>
          <p>
            Alby Aguiar, fundador de GHC Training, dirige el proyecto académico desde una trayectoria
            de más de veinte años vinculada al entrenamiento, el rendimiento, la gestión de servicios
            y el trabajo con personas con necesidades diferentes.
          </p>
          <p>
            Su enfoque prioriza comprender el cómo y el porqué: mecanismos antes que dogmas,
            fisiología antes que memorización y decisiones antes que recetas.
          </p>
        </div>
      </section>

      <section className={styles.paymentSection} id="estado-preventa">
        <div className={styles.sectionIntroCenter}>
          <p className={styles.eyebrow}>Modalidades previstas</p>
          <h2>La matrícula todavía no está abierta.</h2>
          <p>
            Los precios, condiciones contractuales y enlaces de pago permanecerán bloqueados hasta
            superar los Gates económico, jurídico y técnico.
          </p>
        </div>

        <div className={styles.paymentGrid}>
          <article className={styles.paymentCardFeatured}>
            <span className={styles.paymentLabel}>Mejor condición económica</span>
            <h3>Pago único</h3>
            <strong>Importe pendiente</strong>
            <p>El precio fundador se incorporará después de la aprobación económica final.</p>
            <button type="button" disabled>
              Matrícula pendiente de apertura
            </button>
          </article>

          <article className={styles.paymentCard}>
            <span className={styles.paymentLabel}>Modalidad alternativa</span>
            <h3>50 % + 50 %</h3>
            <strong>Total pendiente</strong>
            <p>Segundo pago previsto quince días después del primero. Redacción legal pendiente.</p>
            <button type="button" disabled>
              Matrícula pendiente de apertura
            </button>
          </article>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionIntroRow}>
          <div>
            <p className={styles.eyebrow}>Preguntas esenciales</p>
            <h2>Claridad antes de contratar.</h2>
          </div>
          <p>
            Estas respuestas son una versión de trabajo. Las cuestiones contractuales se enlazarán a
            las condiciones definitivas cuando reciban validación jurídica.
          </p>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalSection}>
        <div>
          <p className={styles.eyebrow}>La decisión profesional empieza antes de la matrícula</p>
          <h2>
            Puedes seguir acumulando contenidos o empezar a construir orden, criterio y
            responsabilidad.
          </h2>
          <p>Esta será la primera generación de GHC Academy.</p>
        </div>
        <a href="#estado-preventa" className={styles.primaryCta}>
          Consultar estado de apertura
        </a>
      </section>

      <footer className={styles.footer}>
        <GHCLogo size="sm" showText tagline />
        <p>
          GHC Academy · Formación privada online · Textos legales, identidad del prestador,
          contratación, privacidad, cookies y desistimiento pendientes de validación final.
        </p>
        <div>
          <span>Aviso legal · Pendiente</span>
          <span>Privacidad · Pendiente</span>
          <span>Condiciones · Pendiente</span>
        </div>
      </footer>
    </main>
  );
}
