export type AcademyTopic = {
  slug: string;
  title: string;
  category: keyof typeof academyGroupLabels;
  description: string;
  introduction: string;
  guidance: string;
  example: string;
  caution: string;
};
export const academyGroupLabels = {
  "compra": "Elegir una formación",
  "inicio": "Empezar en la profesión",
  "profesionales": "Desarrollo profesional",
  "conocimientos": "Fundamentos aplicados",
  "aplicacion": "Casos y adaptaciones",
  "legal": "Titulaciones y ejercicio"
} as const;
export const academyTopics: AcademyTopic[] = [
{
  "slug": "curso-entrenador-personal-online",
  "title": "Curso de entrenador personal online: cómo elegirlo",
  "category": "compra",
  "description": "Una formación online útil debe enseñar a valorar personas, interpretar información y tomar decisiones, no limitarse a mostrar rutinas.",
  "introduction": "Una formación online útil debe enseñar a valorar personas, interpretar información y tomar decisiones, no limitarse a mostrar rutinas.",
  "guidance": "Compara el temario real, la progresión entre módulos, el sistema de evaluación y las oportunidades de trasladar la teoría a casos. El número de vídeos por sí solo no indica profundidad. Pregunta también qué acompañamiento existe y cómo se documenta el aprendizaje.",
  "example": "Imagina dos programas: uno reúne cientos de ejercicios y otro plantea qué hacer cuando un cliente llega con historial de dolor, poco tiempo y objetivos contradictorios. El segundo puede ofrecer más criterio incluso con menos material audiovisual.",
  "caution": "Evita interpretar una certificación privada como habilitación legal automática. Comprueba siempre qué exige la normativa del territorio donde pretendes trabajar."
},
{
  "slug": "formacion-entrenador-personal-online",
  "title": "Formación de entrenador personal online: contenidos imprescindibles",
  "category": "compra",
  "description": "Un itinerario profesional necesita unir bases científicas con evaluación, programación y relación con el cliente.",
  "introduction": "Un itinerario profesional necesita unir bases científicas con evaluación, programación y relación con el cliente.",
  "guidance": "Busca anatomía funcional, fisiología, biomecánica, principios de entrenamiento, valoración inicial, periodización, adherencia y seguridad. Los temas deben conectarse entre sí y avanzar de conceptos sencillos a decisiones complejas.",
  "example": "Un alumno comprende la progresión cuando puede explicar por qué escoge una variante de sentadilla, qué observará en la técnica y cuándo ajustaría la carga. Esa justificación vale más que reproducir una ficha cerrada.",
  "caution": "Una promesa de salida laboral no sustituye a la calidad académica ni a los requisitos de ejercicio profesional de cada comunidad o país."
},
{
  "slug": "curso-personal-trainer-online",
  "title": "Curso personal trainer online: qué aprenderás de verdad",
  "category": "compra",
  "description": "Detrás del nombre personal trainer hay competencias distintas: entrenar, valorar, comunicar y revisar resultados.",
  "introduction": "Detrás del nombre personal trainer hay competencias distintas: entrenar, valorar, comunicar y revisar resultados.",
  "guidance": "Un curso amplio debería enseñar a observar cómo se mueve alguien, programar según objetivos y capacidades, explicar la elección de ejercicios y gestionar expectativas. Revisa si incluye evaluaciones y el nivel de acompañamiento disponible.",
  "example": "Ante una clienta que abandona por falta de tiempo, el entrenador no solo modifica el calendario. Revisa barreras, disponibilidad, prioridades y dosis mínima de entrenamiento que puede mantenerse.",
  "caution": "Desconfía de la idea de que aprobar un curso privado garantiza automáticamente poder ejercer en cualquier territorio."
},
{
  "slug": "programa-entrenamiento-personal-online",
  "title": "Programa de entrenamiento personal online: itinerario formativo",
  "category": "compra",
  "description": "No es lo mismo comprar rutinas de entrenamiento que estudiar para diseñar y supervisar programas de otras personas.",
  "introduction": "No es lo mismo comprar rutinas de entrenamiento que estudiar para diseñar y supervisar programas de otras personas.",
  "guidance": "Una trayectoria formativa debe conectar tres decisiones: qué información recopilar, cómo convertirla en un plan y cómo modificarlo al observar la respuesta. En ese orden tienen sentido la anatomía, la valoración, la fuerza y el seguimiento.",
  "example": "Un caso de preparación física general puede comenzar con objetivos y antecedentes, continuar con pruebas ajustadas al nivel y terminar con revisiones periódicas del programa. La programación es un proceso, no una hoja definitiva.",
  "caution": "Si tu prioridad es el reconocimiento académico oficial, verifica expresamente qué titulación obtienes antes de matricularte."
},
{
  "slug": "precio-curso-entrenador-personal",
  "title": "Precio de un curso de entrenador personal: qué comparar",
  "category": "compra",
  "description": "El precio de una formación no se evalúa bien sin considerar su alcance, el acompañamiento y su utilidad para el trabajo.",
  "introduction": "El precio de una formación no se evalúa bien sin considerar su alcance, el acompañamiento y su utilidad para el trabajo.",
  "guidance": "Compara horas reales de estudio, contenido verificable, acceso a actualizaciones, evaluaciones, condiciones de pago y tiempo estimado de dedicación. Si hay varios niveles, comprueba qué competencias aporta cada uno.",
  "example": "Una oferta con precio inferior puede exigir después adquirir especializaciones esenciales por separado. Otra puede integrar bases, programación y aplicación profesional desde el inicio. Haz la comparación con el recorrido completo.",
  "caution": "El precio alto tampoco demuestra calidad por sí solo. Solicita documentación de los contenidos y revisa las condiciones de contratación y devolución."
},
{
  "slug": "como-ser-entrenador-personal",
  "title": "Cómo ser entrenador personal: primeros pasos",
  "category": "inicio",
  "description": "Antes de dar recomendaciones a clientes, conviene definir qué formación necesitas, qué responsabilidades asumirás y dónde vas a trabajar.",
  "introduction": "Antes de dar recomendaciones a clientes, conviene definir qué formación necesitas, qué responsabilidades asumirás y dónde vas a trabajar.",
  "guidance": "Empieza por comprender la regulación aplicable en tu ubicación. Después construye bases de anatomía, fisiología, entrenamiento y evaluación; practica con casos supervisados o simulados y aprende cuándo derivar a profesionales sanitarios.",
  "example": "Una primera entrevista puede revelar que el objetivo declarado de perder peso no explica la falta de continuidad. Una buena valoración incluye disponibilidad, preferencias, experiencia y límites profesionales.",
  "caution": "Los requisitos de ejercicio y las vías académicas varían según país y comunidad. Una formación privada es complementaria y no sustituye títulos exigidos por ley."
},
{
  "slug": "que-estudiar-entrenador-personal",
  "title": "Qué estudiar para ser entrenador personal",
  "category": "inicio",
  "description": "La preparación de un entrenador no debe reducirse a escoger ejercicios o dominar un único método.",
  "introduction": "La preparación de un entrenador no debe reducirse a escoger ejercicios o dominar un único método.",
  "guidance": "Una base sólida combina movimiento humano, respuestas al esfuerzo, entrenamiento de fuerza y resistencia, planificación, primeros principios de seguridad y comunicación. La capacidad de razonar casos une estas áreas.",
  "example": "Si una persona tolera mal un estímulo, estudiar fisiología ayuda a entender la respuesta; estudiar biomecánica ayuda a seleccionar tareas y estudiar adherencia ayuda a sostener el proceso.",
  "caution": "Antes de elegir una escuela, diferencia formación privada, titulaciones oficiales y requisitos profesionales. No son categorías equivalentes."
},
{
  "slug": "formacion-trabajar-entrenador-personal",
  "title": "Formación para trabajar como entrenador personal: ruta de aprendizaje",
  "category": "inicio",
  "description": "Formarse para trabajar con otras personas exige combinar conocimiento, observación y límites de actuación.",
  "introduction": "Formarse para trabajar con otras personas exige combinar conocimiento, observación y límites de actuación.",
  "guidance": "La secuencia recomendable comienza con fundamentos, continúa con diseño de programas y termina con la resolución de casos. Haz hincapié en entrevistas iniciales, variables de carga, progresión y registro de resultados.",
  "example": "Dos clientes con el mismo objetivo de fuerza pueden necesitar planes diferentes según historial, disponibilidad y experiencia. Aprender a justificar esos cambios demuestra que el alumno supera las recetas.",
  "caution": "Ningún programa privado garantiza por sí mismo elegibilidad legal para ejercer; comprueba la normativa antes de ofrecer servicios."
},
{
  "slug": "empezar-entrenador-personal",
  "title": "Cómo empezar como entrenador personal sin improvisar",
  "category": "inicio",
  "description": "El comienzo profesional se complica cuando se confunden entusiasmo, conocimiento y responsabilidad.",
  "introduction": "El comienzo profesional se complica cuando se confunden entusiasmo, conocimiento y responsabilidad.",
  "guidance": "Define a quién puedes atender dentro de tus competencias, utiliza una recogida de información ordenada y plantea objetivos medibles. Aprende a registrar decisiones y a revisar el plan según respuesta y adherencia.",
  "example": "Para una persona sedentaria, empezar no significa prescribir la rutina más exigente. Significa elegir una dosis inicial asumible, enseñar técnica, observar tolerancia y ajustar progresivamente.",
  "caution": "Evita diagnosticar lesiones o enfermedades si esa tarea no está dentro de tus competencias y habilitaciones."
},
{
  "slug": "estudiar-entrenamiento-personal-desde-cero",
  "title": "Estudiar entrenamiento personal desde cero: plan realista",
  "category": "inicio",
  "description": "Empezar sin conocimientos previos es viable si el aprendizaje está ordenado y hay tiempo para practicar.",
  "introduction": "Empezar sin conocimientos previos es viable si el aprendizaje está ordenado y hay tiempo para practicar.",
  "guidance": "Organiza el estudio en bloques: función del cuerpo, movimiento, entrenamiento, valoración, programación y práctica con casos. Antes de pasar al siguiente bloque, comprueba que puedes explicar lo aprendido con tus propias palabras.",
  "example": "Tras estudiar movimientos básicos, analiza por qué modificarías una sentadilla para alguien con poca movilidad de tobillo. No basta con repetir una variante vista en un vídeo.",
  "caution": "La velocidad de estudio no equivale a dominio. Reserva tiempo para revisar errores, repasar y resolver dudas."
},
{
  "slug": "formacion-avanzada-entrenadores-personales",
  "title": "Formación avanzada para entrenadores personales",
  "category": "profesionales",
  "description": "Un entrenador con experiencia puede necesitar menos recetas y más capacidad para razonar situaciones difíciles.",
  "introduction": "Un entrenador con experiencia puede necesitar menos recetas y más capacidad para razonar situaciones difíciles.",
  "guidance": "La formación avanzada debe conectar pruebas, programación, fatiga, adherencia, objetivos y contexto. Es importante aprender a comparar alternativas y justificar por qué una estrategia resulta preferible para un caso concreto.",
  "example": "Un cliente progresa en fuerza, pero empieza a faltar a sesiones. El problema puede estar menos en la selección de ejercicios que en la dosis de carga y la organización de su semana.",
  "caution": "Evita confundir una técnica novedosa con progreso profesional. La evidencia y la observación del cliente siguen siendo prioritarias."
},
{
  "slug": "especializacion-entrenamiento-personal",
  "title": "Especialización en entrenamiento personal: elegir un área",
  "category": "profesionales",
  "description": "Especializarse no consiste solo en acumular cursos: implica acotar el tipo de problema que sabes resolver.",
  "introduction": "Especializarse no consiste solo en acumular cursos: implica acotar el tipo de problema que sabes resolver.",
  "guidance": "Valora experiencia previa, demanda real, alcance de tu profesión y profundidad de la formación. Fuerza, adultos mayores, adherencia o poblaciones con necesidades específicas requieren competencias y, en ocasiones, coordinación interdisciplinar.",
  "example": "Si trabajas con adultos mayores, no basta con memorizar una lista de ejercicios seguros. Debes considerar autonomía, capacidad funcional, progresión, riesgos y objetivos relevantes para su vida.",
  "caution": "La especialización privada no modifica los límites legales o clínicos de tu profesión."
},
{
  "slug": "actualizar-conocimientos-entrenador",
  "title": "Actualizar conocimientos como entrenador personal",
  "category": "profesionales",
  "description": "La actualización profesional tiene sentido cuando cambia cómo evalúas y decides, no solo cuando amplías tu biblioteca.",
  "introduction": "La actualización profesional tiene sentido cuando cambia cómo evalúas y decides, no solo cuando amplías tu biblioteca.",
  "guidance": "Revisa periódicamente fundamentos y evidencia, identifica afirmaciones que ya no puedes sostener y prueba pequeñas mejoras medibles. Documenta qué resultado esperas y qué información te llevaría a cambiar de criterio.",
  "example": "Si un método que aplicas a todos tus clientes funciona de forma desigual, revisa para quién resulta apropiado, qué variables influyen y si existe una alternativa mejor ajustada.",
  "caution": "Evita trasladar conclusiones de un único estudio a cualquier cliente sin valorar población, contexto y limitaciones."
},
{
  "slug": "programacion-entrenamiento-entrenadores",
  "title": "Programación del entrenamiento para entrenadores personales",
  "category": "profesionales",
  "description": "Programar es organizar estímulos y descansos en función del objetivo y de la respuesta individual.",
  "introduction": "Programar es organizar estímulos y descansos en función del objetivo y de la respuesta individual.",
  "guidance": "Parte de la valoración, decide prioridades, selecciona variables controlables y prevé revisiones. Volumen, intensidad, frecuencia, recuperación y adherencia deben considerarse conjuntamente, no como casillas independientes.",
  "example": "Una planificación de ocho semanas pierde utilidad si un cliente cambia de turno laboral. El profesional necesita criterios para reorganizar la frecuencia y mantener lo esencial del estímulo.",
  "caution": "No confundas el documento de planificación con la intervención: el seguimiento y los ajustes también forman parte del programa."
},
{
  "slug": "evaluacion-fisica-clientes",
  "title": "Evaluación física de clientes en entrenamiento personal",
  "category": "profesionales",
  "description": "La evaluación inicial debe recoger información útil para decidir, sin convertirse en una batería interminable de pruebas.",
  "introduction": "La evaluación inicial debe recoger información útil para decidir, sin convertirse en una batería interminable de pruebas.",
  "guidance": "Pregunta por objetivos, antecedentes relevantes, actividad, disponibilidad, preferencias y barreras. Elige pruebas relacionadas con las decisiones que vas a tomar; registra una línea de base que permita comparar progresos.",
  "example": "Para mejorar la fuerza de una persona principiante, quizá baste comenzar observando patrones sencillos, tolerancia al esfuerzo y consistencia, en lugar de exigir una prueba máxima.",
  "caution": "Las señales de alarma y problemas de salud requieren derivación o valoración por el profesional competente; una evaluación deportiva no reemplaza una consulta clínica."
},
{
  "slug": "anatomia-aplicada-entrenamiento",
  "title": "Anatomía aplicada al entrenamiento: de la teoría a la práctica",
  "category": "conocimientos",
  "description": "Conocer nombres de músculos resulta insuficiente si no entiendes cómo contribuyen al movimiento.",
  "introduction": "Conocer nombres de músculos resulta insuficiente si no entiendes cómo contribuyen al movimiento.",
  "guidance": "Relaciona articulaciones, tejidos, rangos de movimiento, función muscular y tareas concretas. El análisis anatómico tiene valor cuando orienta la selección de ejercicios y la interpretación de limitaciones.",
  "example": "Al estudiar el hombro, analiza cómo cambian demandas y posiciones entre empujar por encima de la cabeza y realizar un remo, sin asumir que existe un único ejercicio correcto para todos.",
  "caution": "La anatomía por sí sola no permite diagnosticar lesiones ni predecir el riesgo individual con precisión absoluta."
},
{
  "slug": "biomecanica-entrenadores-personales",
  "title": "Biomecánica para entrenadores personales: conceptos útiles",
  "category": "conocimientos",
  "description": "La biomecánica ayuda a describir fuerzas y movimientos, pero debe interpretarse junto con el resto de la información del cliente.",
  "introduction": "La biomecánica ayuda a describir fuerzas y movimientos, pero debe interpretarse junto con el resto de la información del cliente.",
  "guidance": "Aprende planos, palancas, momentos de fuerza, estabilidad y variaciones técnicas. El objetivo no es imponer una postura universal, sino comprender cómo cambia una tarea al modificar su ejecución.",
  "example": "Elevar el talón en una sentadilla altera la demanda y puede facilitar determinadas posiciones. La utilidad de esa modificación depende del objetivo, de la persona y de cómo responde al ejercicio.",
  "caution": "Evita convertir análisis aislados de postura en diagnósticos o sentencias sobre dolor y lesión."
},
{
  "slug": "fisiologia-ejercicio-entrenadores",
  "title": "Fisiología del ejercicio para entrenadores: adaptación y recuperación",
  "category": "conocimientos",
  "description": "La fisiología permite comprender por qué una carga provoca una respuesta y cómo gestionar su repetición.",
  "introduction": "La fisiología permite comprender por qué una carga provoca una respuesta y cómo gestionar su repetición.",
  "guidance": "Estudia sistemas energéticos, fatiga, recuperación, capacidad cardiovascular, adaptaciones neuromusculares y relación entre estímulo y descanso. Conecta estos principios con decisiones de frecuencia y progresión.",
  "example": "Tras varias sesiones intensas, una persona refiere sueño deficiente y rendimiento menor. Antes de aumentar la carga, revisa recuperación, contexto y distribución de esfuerzos.",
  "caution": "La respuesta al entrenamiento no es idéntica en todas las personas; el seguimiento individual importa tanto como los principios generales."
},
{
  "slug": "valoracion-inicial-entrenamiento",
  "title": "Valoración inicial en entrenamiento personal: preguntas clave",
  "category": "conocimientos",
  "description": "Una valoración útil aclara de dónde parte el cliente y qué condiciona la intervención.",
  "introduction": "Una valoración útil aclara de dónde parte el cliente y qué condiciona la intervención.",
  "guidance": "Explora objetivos prioritarios, experiencia, disponibilidad, antecedentes, motivación, movimientos relevantes y posibles motivos para derivación. Elige mediciones con propósito y explica cómo se usarán.",
  "example": "Si alguien quiere ganar masa muscular pero solo dispone de dos sesiones semanales, ese dato modifica más la programación inicial que conocer una cifra aislada de composición corporal.",
  "caution": "No recojas datos sanitarios que no necesitas ni prometas diagnósticos. Define claramente tu ámbito profesional."
},
{
  "slug": "planificacion-entrenamiento-personalizado",
  "title": "Planificación del entrenamiento personalizado: método paso a paso",
  "category": "conocimientos",
  "description": "La personalización comienza al justificar prioridades y finaliza cuando el plan se adapta a los resultados.",
  "introduction": "La personalización comienza al justificar prioridades y finaliza cuando el plan se adapta a los resultados.",
  "guidance": "Ordena cuatro decisiones: objetivo, punto de partida, estímulo viable y revisión. Determina qué medirás, cuándo ajustarás y qué alternativas existen si el contexto cambia.",
  "example": "Una persona con poca adherencia puede mejorar con menos sesiones pero mejor distribuidas. La planificación efectiva busca que el estímulo programado sea también realizable.",
  "caution": "No copies sin cambios plantillas diseñadas para otro nivel, historia o disponibilidad."
},
{
  "slug": "entrenamiento-dolor-cronico",
  "title": "Entrenamiento para personas con dolor crónico: límites y adaptación",
  "category": "aplicacion",
  "description": "El dolor crónico exige escuchar a la persona, individualizar el esfuerzo y trabajar dentro de las competencias profesionales.",
  "introduction": "El dolor crónico exige escuchar a la persona, individualizar el esfuerzo y trabajar dentro de las competencias profesionales.",
  "guidance": "No asumas que un diagnóstico determina automáticamente un conjunto fijo de ejercicios. Recaba indicaciones relevantes, coordínate con profesionales sanitarios cuando corresponda y ajusta actividad, progresión y objetivos funcionales.",
  "example": "Una persona puede tolerar mejor sesiones breves y graduales que intentos esporádicos de alta intensidad. Registrar tolerancia, objetivos y continuidad ayuda a decidir próximas cargas.",
  "caution": "El entrenador no debe diagnosticar la causa del dolor ni sustituir el tratamiento clínico. Los signos de alarma requieren evaluación sanitaria."
},
{
  "slug": "entrenamiento-fuerza-adultos-mayores",
  "title": "Entrenamiento de fuerza en adultos mayores: adaptación profesional",
  "category": "aplicacion",
  "description": "La fuerza puede vincularse a funciones cotidianas, confianza y participación, con programas ajustados a cada persona.",
  "introduction": "La fuerza puede vincularse a funciones cotidianas, confianza y participación, con programas ajustados a cada persona.",
  "guidance": "Considera historial de actividad, equilibrio, movilidad funcional, tolerancia al esfuerzo y objetivos de autonomía. Prioriza ejercicios que puedan ejecutarse con seguridad y progresen según la respuesta.",
  "example": "Levantarse de una silla puede usarse como referencia funcional y punto de partida para un trabajo de tren inferior, combinándolo con otras tareas si el contexto lo permite.",
  "caution": "La edad cronológica no sustituye una evaluación individual. Consulta indicaciones médicas cuando existan condiciones que lo requieran."
},
{
  "slug": "entrenamiento-poblaciones-especiales",
  "title": "Entrenamiento en poblaciones especiales: principios y competencias",
  "category": "aplicacion",
  "description": "La etiqueta población especial agrupa situaciones distintas que no deberían tratarse mediante una única receta.",
  "introduction": "La etiqueta población especial agrupa situaciones distintas que no deberían tratarse mediante una única receta.",
  "guidance": "Identifica la condición, los objetivos funcionales, el historial y los límites del servicio. Adapta la progresión según capacidad y coordina con profesionales sanitarios cuando sea necesario.",
  "example": "Dos clientes con una misma enfermedad declarada pueden tolerar estímulos muy diferentes. La decisión debe centrarse en datos individuales y competencias del entrenador.",
  "caution": "Una formación deportiva, por avanzada que sea, no permite realizar actos reservados a profesiones sanitarias."
},
{
  "slug": "adaptacion-entrenamiento-limitaciones",
  "title": "Cómo adaptar el entrenamiento ante limitaciones individuales",
  "category": "aplicacion",
  "description": "Adaptar significa conservar el objetivo de la sesión modificando la tarea para que resulte practicable.",
  "introduction": "Adaptar significa conservar el objetivo de la sesión modificando la tarea para que resulte practicable.",
  "guidance": "Ajusta rango, posición, volumen, intensidad, apoyo externo o complejidad técnica. Evalúa la respuesta y comprueba que la variante sigue sirviendo al objetivo previsto.",
  "example": "Si una persona no tolera una zancada sin apoyo, puede comenzar utilizando una superficie estable o una variante menos exigente mientras desarrolla capacidad.",
  "caution": "Modificar ejercicios para entrenar no equivale a tratar una lesión. Ante problemas clínicos, coordina con el profesional responsable."
},
{
  "slug": "adherencia-entrenamiento-personal",
  "title": "Adherencia al entrenamiento personal: cómo mejorar la continuidad",
  "category": "aplicacion",
  "description": "El mejor plan pierde utilidad si la persona no puede o no quiere sostenerlo.",
  "introduction": "El mejor plan pierde utilidad si la persona no puede o no quiere sostenerlo.",
  "guidance": "Investiga barreras reales, disponibilidad, preferencias, confianza, expectativas y experiencias previas. Diseña un plan flexible con opciones para semanas difíciles y revisa los motivos de abandono sin culpabilizar.",
  "example": "Quien viaja por trabajo puede necesitar un plan base y una alternativa breve para desplazamientos, sin dar por perdida toda la progresión cuando cambia la agenda.",
  "caution": "No utilices presión o mensajes de culpa para forzar conductas. La autonomía y la comunicación profesional también importan."
},
{
  "slug": "certificacion-privada-entrenador-personal",
  "title": "Certificación privada de entrenador personal: qué acredita",
  "category": "legal",
  "description": "Una certificación privada describe formación realizada por una entidad, pero no equivale automáticamente a un título oficial.",
  "introduction": "Una certificación privada describe formación realizada por una entidad, pero no equivale automáticamente a un título oficial.",
  "guidance": "Revisa quién emite el certificado, qué contenidos y evaluaciones acredita, si es verificable y qué reconocimiento tiene. Pregunta expresamente si confiere alguna habilitación legal, sin asumir que la respuesta será afirmativa.",
  "example": "Una academia puede evaluar conocimientos con rigor y expedir un certificado propio, mientras que el ejercicio de determinadas funciones profesionales depende de normas y títulos oficiales distintos.",
  "caution": "No confundas publicidad sobre acreditación o validez internacional con homologación administrativa. Comprueba las afirmaciones en fuentes oficiales."
},
{
  "slug": "formacion-privada-titulacion-oficial",
  "title": "Formación privada y titulación oficial: diferencias prácticas",
  "category": "legal",
  "description": "Ambas pueden aportar aprendizaje, pero tienen naturaleza jurídica y usos diferentes.",
  "introduction": "Ambas pueden aportar aprendizaje, pero tienen naturaleza jurídica y usos diferentes.",
  "guidance": "Una titulación oficial forma parte de un sistema educativo regulado. Una formación privada establece sus contenidos, requisitos y certificados propios. Para decidir, separa lo que quieres aprender de la acreditación que te exigen.",
  "example": "Puedes cursar formación complementaria para profundizar en biomecánica o programación y seguir necesitando una titulación oficial para determinados trabajos según territorio.",
  "caution": "Que un curso tenga muchas horas o evaluaciones exigentes no lo convierte por sí solo en titulación oficial."
},
{
  "slug": "requisitos-ejercer-entrenador-personal",
  "title": "Requisitos para ejercer de entrenador personal: qué comprobar",
  "category": "legal",
  "description": "Los requisitos dependen de dónde prestes el servicio y de qué funciones profesionales desempeñes.",
  "introduction": "Los requisitos dependen de dónde prestes el servicio y de qué funciones profesionales desempeñes.",
  "guidance": "Identifica comunidad autónoma o país de ejercicio, actividad concreta, regulación profesional, obligaciones empresariales y seguros que correspondan. Busca información oficial vigente y asesoramiento especializado si hay dudas.",
  "example": "Trabajar presencialmente en un gimnasio y ofrecer entrenamiento online desde otra jurisdicción puede exigir revisar reglas distintas. No basta con trasladar sin más los requisitos de otro lugar.",
  "caution": "Esta guía es orientativa; no sustituye la revisión de la normativa aplicable ni asesoramiento jurídico."
},
{
  "slug": "normativa-entrenador-personal-madrid",
  "title": "Normativa del entrenador personal en la Comunidad de Madrid: orientación",
  "category": "legal",
  "description": "En Madrid conviene distinguir las exigencias de cualificación profesional de los certificados de formación complementaria.",
  "introduction": "En Madrid conviene distinguir las exigencias de cualificación profesional de los certificados de formación complementaria.",
  "guidance": "Consulta la normativa vigente de profesiones del deporte en la Comunidad de Madrid y las indicaciones de la administración competente. Verifica si la actividad que quieres desarrollar corresponde a una profesión regulada y qué títulos se admiten.",
  "example": "Una persona con formación privada avanzada puede disponer de conocimientos útiles, pero debe comprobar por separado su situación jurídica antes de ofrecer determinados servicios profesionales.",
  "caution": "No presentamos esta información como dictamen legal ni afirmamos que matricularse en GHC Academy habilite automáticamente para ejercer."
},
{
  "slug": "duracion-curso-entrenador-personal-online",
  "title": "Cuánto dura un curso de entrenador personal online",
  "category": "legal",
  "description": "La duración nominal no cuenta toda la historia: importa también la profundidad y cómo se acredita el aprendizaje.",
  "introduction": "La duración nominal no cuenta toda la historia: importa también la profundidad y cómo se acredita el aprendizaje.",
  "guidance": "Diferencia horas de vídeo, horas estimadas de estudio, evaluaciones, práctica autónoma y tiempo de acceso. Un formato flexible puede requerir planificación personal para completar contenidos con criterio.",
  "example": "Dos alumnos pueden dedicar tiempos muy distintos a un mismo módulo según sus bases previas y cuánto practiquen los casos. Una estimación de horas es una guía, no una garantía de dominio.",
  "caution": "Pregunta si existen plazos obligatorios, bloqueos de acceso o requisitos de evaluación antes de contratar."
}
];
