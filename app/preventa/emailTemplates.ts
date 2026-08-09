export type PreventaEmailTemplate = {
  code: string;
  name: string;
  trigger: string;
  subject: string;
  preheader: string;
  body: string[];
  facts?: { label: string; value: string }[];
  cta?: string;
  tone: 'success' | 'neutral' | 'warning' | 'critical';
};

export const preventaEmailTemplates: PreventaEmailTemplate[] = [
  {
    code: 'E01',
    name: 'Matrícula confirmada · pago único',
    trigger: 'Pago único de 1.690 € confirmado por el proveedor',
    subject: 'Matrícula confirmada · Bienvenido a la Edición Fundadora de GHC Academy',
    preheader: 'Tu pago está confirmado y tu plaza fundadora ha quedado registrada.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Tu matrícula está confirmada.',
      'Hemos recibido y verificado correctamente tu pago y tu incorporación a la Edición Fundadora 2026 de GHC Academy ha quedado formalizada.',
      'Formas parte de las primeras 100 plazas de esta edición.',
      'La apertura de la plataforma está prevista durante octubre de 2026. Conforme a las condiciones de tu matrícula, el núcleo académico contratado estará disponible no más tarde del 31 de octubre de 2026, salvo que concurra una causa legalmente justificable y te informemos de ella y de tus derechos.',
      'Antes de la apertura recibirás un nuevo correo con la fecha concreta y, cuando la plataforma esté operativa, las instrucciones para activar tu acceso.',
      'GHC Academy es una formación privada online. Los certificados que obtengas serán privados y verificables y acreditarán la formación y el aprovechamiento realizados dentro de GHC Academy; no constituyen por sí mismos una titulación oficial ni una habilitación administrativa automática.',
      'Conserva este correo como confirmación de tu matrícula.'
    ],
    facts: [
      { label: 'Modalidad', value: 'Pago único' },
      { label: 'Importe abonado', value: '1.690 €' },
      { label: 'Saldo pendiente', value: '0 €' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Formación', value: '3 niveles · 30 módulos' },
      { label: 'Apertura prevista', value: 'Durante octubre de 2026' },
      { label: 'Referencia', value: '{{order_reference}}' },
      { label: 'Condiciones aceptadas', value: '{{terms_version}}' },
      { label: 'Privacidad', value: '{{privacy_version}}' }
    ],
    cta: 'Ver estado de mi matrícula'
  },
  {
    code: 'E02',
    name: 'Matrícula confirmada · primera cuota',
    trigger: 'Primera cuota de 895 € confirmada por el proveedor',
    subject: 'Primera cuota confirmada · Tu matrícula fundadora está registrada',
    preheader: 'Has abonado 895 €. Te indicamos el saldo y la fecha exacta del segundo pago.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Hemos recibido y verificado correctamente la primera cuota de tu matrícula en la Edición Fundadora 2026 de GHC Academy.',
      'Tu contratación fraccionada ha quedado formalizada por un precio total de 1.790 €, dividido en dos cuotas de 895 €.',
      'La primera cuota ya está abonada. La segunda cuota todavía no está vencida: vencerá el {{second_payment_due_date}}, exactamente 15 días naturales después de la confirmación efectiva de este primer pago.',
      'Tu plaza Fundador queda asociada a este expediente mientras la contratación permanezca vigente y se cumplan las condiciones aplicables.',
      'Cuando confirmemos la segunda cuota, tu matrícula quedará completamente abonada y recibirás una nueva confirmación.',
      'La plataforma abrirá durante octubre de 2026. El acceso académico se activará cuando la plataforma esté operativa y tu matrícula reúna las condiciones de acceso.',
      'Conserva este correo como confirmación del primer pago y de la fecha de tu segundo vencimiento.'
    ],
    facts: [
      { label: 'Modalidad', value: '895 € + 895 €' },
      { label: 'Precio total', value: '1.790 €' },
      { label: 'Abonado', value: '895 €' },
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Segundo vencimiento', value: '{{second_payment_due_date}}' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Referencia', value: '{{order_reference}}' },
      { label: 'Condiciones aceptadas', value: '{{terms_version}}' },
      { label: 'Privacidad', value: '{{privacy_version}}' }
    ],
    cta: 'Ver mi matrícula'
  },
  {
    code: 'E03',
    name: 'Recordatorio · faltan 3 días',
    trigger: '3 días naturales antes del vencimiento de la segunda cuota',
    subject: 'Tu segunda cuota de GHC Academy vence en 3 días',
    preheader: 'Recordatorio preventivo: quedan 895 € pendientes y todavía estás dentro de plazo.',
    tone: 'neutral',
    body: [
      'Hola {{nombre}},',
      'Te escribimos con antelación para recordarte que la segunda cuota de tu matrícula fundadora vence dentro de tres días.',
      'El importe pendiente es de 895 € y todavía estás dentro del plazo ordinario de pago.',
      'No necesitas hacer nada si ya tienes previsto completarlo antes de la fecha indicada. Si prefieres dejarlo resuelto ahora, puedes utilizar el enlace asociado a tu matrícula.',
      'Si el pago ya hubiera sido confirmado y este mensaje se hubiera cruzado con nuestra actualización, puedes ignorarlo.'
    ],
    facts: [
      { label: 'Importe pendiente', value: '895 €' },
      { label: 'Vencimiento', value: '{{second_payment_due_date}}' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Completar segundo pago'
  },
  {
    code: 'E04',
    name: 'Recordatorio · vence hoy',
    trigger: 'Fecha de vencimiento de la segunda cuota',
    subject: 'Hoy vence la segunda cuota de tu matrícula fundadora',
    preheader: 'Hoy vence el segundo pago de 895 € de tu modalidad fraccionada.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Hoy vence la segunda cuota de tu matrícula fundadora en GHC Academy.',
      'El importe pendiente es de 895 €. Al completarlo, el precio total de tu modalidad fraccionada quedará íntegramente abonado: 1.790 €.',
      'Si ya has realizado el pago y este mensaje se ha cruzado con la confirmación del proveedor, no necesitas hacer nada.',
      'Si todavía no lo has completado, puedes hacerlo desde el enlace asociado a tu matrícula.'
    ],
    facts: [
      { label: 'Importe pendiente', value: '895 €' },
      { label: 'Vence', value: 'Hoy · {{second_payment_due_date}}' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Completar segundo pago'
  },
  {
    code: 'E05',
    name: 'Segundo pago vencido · día 1',
    trigger: '1 día natural después del vencimiento sin segundo pago confirmado',
    subject: 'Tu segunda cuota aparece pendiente de regularización',
    preheader: 'El vencimiento ha pasado, pero tu expediente continúa abierto.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'La segunda cuota de tu matrícula aparece pendiente después de su fecha de vencimiento.',
      'Tu expediente continúa abierto para que puedas regularizarlo. Mientras exista una deuda vencida, el acceso académico podrá permanecer sin activar o suspendido conforme a las condiciones aplicables.',
      'El saldo pendiente es de 895 €.',
      'Si has pagado recientemente, espera a recibir nuestra confirmación. Si has tenido una incidencia con el pago, puedes escribirnos a {{support_email}}.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Vencimiento original', value: '{{second_payment_due_date}}' },
      { label: 'Estado', value: 'Pendiente de regularización' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar pago'
  },
  {
    code: 'E06',
    name: 'Regularización · día 7',
    trigger: '7 días naturales después del vencimiento sin segundo pago confirmado',
    subject: 'Tu matrícula continúa pendiente de regularización',
    preheader: 'Han pasado 7 días desde el vencimiento y tu expediente sigue abierto.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Han pasado siete días desde el vencimiento de la segunda cuota y tu matrícula continúa pendiente de regularización.',
      'El expediente sigue abierto. El importe pendiente es de 895 € y el acceso académico permanece condicionado a que la situación de pago quede regularizada.',
      'La apertura del expediente durante este periodo no elimina el vencimiento original ni modifica el precio total contratado.',
      'Si existe una incidencia real que debamos revisar, contacta con {{support_email}} e indica tu referencia de matrícula.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Estado', value: 'Expediente abierto · pago vencido' },
      { label: 'Vencimiento original', value: '{{second_payment_due_date}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar matrícula'
  },
  {
    code: 'E07',
    name: 'Regularización · día 30',
    trigger: '30 días naturales después del vencimiento sin segundo pago confirmado',
    subject: 'Tu expediente sigue abierto · queda un mes de regularización ordinaria',
    preheader: 'Aún puedes completar la segunda cuota antes del cierre previsto del expediente.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Tu segunda cuota continúa pendiente y el expediente de matrícula sigue abierto.',
      'De acuerdo con las condiciones de contratación, el expediente puede mantenerse abierto durante un máximo de 60 días desde el vencimiento, salvo que exista una excepción expresamente aprobada.',
      'Han transcurrido 30 días. Aún puedes regularizar el saldo de 895 € antes de alcanzar el plazo ordinario de cierre.',
      'Si tienes una incidencia de pago que todavía no nos hayas comunicado, escríbenos a {{support_email}}.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Situación', value: 'Expediente abierto · pago vencido' },
      { label: 'Días desde vencimiento', value: '30 días' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar matrícula'
  },
  {
    code: 'E08',
    name: 'Último aviso ordinario · día 53',
    trigger: '53 días naturales después del vencimiento sin segundo pago confirmado',
    subject: 'Último aviso ordinario antes del cierre de tu expediente',
    preheader: 'Quedan 7 días para alcanzar el plazo de 60 días de regularización.',
    tone: 'critical',
    body: [
      'Hola {{nombre}},',
      'Este es el último aviso ordinario antes del cierre previsto de tu expediente de matrícula.',
      'Han transcurrido 53 días desde el vencimiento de la segunda cuota y el saldo pendiente continúa siendo de 895 €.',
      'Si no se regulariza el pago, al alcanzar el día 60 GHC Academy podrá resolver la contratación y liberar la plaza Fundador conforme a las condiciones aplicables.',
      'Si existe una incidencia excepcional que debamos conocer, contacta con {{support_email}} antes de que se alcance ese plazo.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Días hasta el plazo de cierre', value: '7 días' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar ahora'
  },
  {
    code: 'E09',
    name: 'Cierre de expediente por impago',
    trigger: 'Cierre efectivo del expediente tras 60 días desde el vencimiento sin regularización',
    subject: 'Tu expediente de matrícula ha sido cerrado',
    preheader: 'La contratación se ha cerrado por falta de regularización del segundo pago.',
    tone: 'critical',
    body: [
      'Hola {{nombre}},',
      'Ha transcurrido el periodo ordinario de 60 días desde el vencimiento de la segunda cuota sin que conste completado el pago pendiente.',
      'Por este motivo, GHC Academy ha cerrado el expediente de esta matrícula conforme a las condiciones aplicables y la plaza Fundador asociada ha quedado liberada.',
      'El cierre del expediente no activa acceso académico ni convierte automáticamente la primera cuota en una penalización o depósito no reembolsable. Cualquier consecuencia económica pendiente se determinará conforme a las condiciones aceptadas y a la normativa imperativa que resulte aplicable.',
      'Si consideras que existe un pago no identificado o una incidencia que deba revisarse, contacta con {{support_email}} indicando la referencia de esta matrícula.'
    ],
    facts: [
      { label: 'Estado', value: 'Expediente cerrado' },
      { label: 'Segundo pago no regularizado', value: '895 €' },
      { label: 'Plaza Fundador', value: 'Liberada' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ]
  },
  {
    code: 'E10',
    name: 'Matrícula completamente abonada',
    trigger: 'Segunda cuota de 895 € confirmada por el proveedor',
    subject: 'Matrícula completada · Tu Edición Fundadora está íntegramente abonada',
    preheader: 'Hemos confirmado la segunda cuota. Tu saldo pendiente es 0 €.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Hemos recibido y verificado correctamente la segunda cuota de tu matrícula fundadora.',
      'Tu modalidad fraccionada queda completamente abonada: 895 € + 895 €, total 1.790 €.',
      'No queda ningún saldo pendiente asociado al precio de esta matrícula.',
      'Tu plaza Fundador queda confirmada. La plataforma abrirá durante octubre de 2026 y recibirás un correo específico con la fecha concreta y las instrucciones de acceso cuando el entorno académico esté operativo.',
      'Gracias por formar parte de la primera generación de GHC Academy. Conserva este correo como confirmación del pago completo.'
    ],
    facts: [
      { label: 'Modalidad', value: '895 € + 895 €' },
      { label: 'Total abonado', value: '1.790 €' },
      { label: 'Saldo pendiente', value: '0 €' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Estado', value: 'Matrícula completamente abonada' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Ver estado de mi matrícula'
  },
  {
    code: 'E11',
    name: 'Apertura y acceso a GHC Academy',
    trigger: 'Plataforma operativa + matrícula apta para activación',
    subject: 'GHC Academy ya está abierta · Activa tu acceso',
    preheader: 'Tu matrícula está apta y ya puedes entrar en la plataforma.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'GHC Academy ya está operativa y tu matrícula cumple las condiciones para activar el acceso.',
      'Dentro encontrarás el recorrido completo contratado: tres niveles y treinta módulos.',
      'La formación es secuencial. Cada módulo se desbloquea al superar los requisitos del anterior y el umbral académico previsto es del 80 % en la evaluación correspondiente.',
      'Podrás avanzar a tu propio ritmo. El contenido principal se consulta dentro de la plataforma y tu progreso quedará asociado a tu cuenta personal.',
      'El soporte incluido cubre cuestiones técnicas, administrativas y académicas básicas; no incluye tutoría individual ni mentoría personalizada salvo que se contrate o anuncie expresamente un servicio adicional.',
      'Bienvenido a la primera generación de GHC Academy.'
    ],
    facts: [
      { label: 'Formación', value: '3 niveles · 30 módulos' },
      { label: 'Progresión', value: 'Secuencial · umbral académico 80 %' },
      { label: 'Plaza Fundador', value: 'n.º {{founder_place_number}}' },
      { label: 'Estado', value: 'Acceso habilitado' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Entrar en GHC Academy'
  },
  {
    code: 'E12',
    name: 'Intento de pago rechazado',
    trigger: 'Checkout verificado por SumUp con estado FAILED',
    subject: 'No hemos podido confirmar tu pago de GHC Academy',
    preheader: 'El intento no se ha registrado como pago. Puedes volver a intentarlo con una nueva sesión.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'El proveedor de pagos no ha podido completar el último intento asociado a tu matrícula.',
      'Ese intento no se ha registrado como importe abonado en GHC Academy y no hemos aplicado ninguna confirmación de pago basándonos únicamente en la pantalla del checkout.',
      'Puedes volver a intentarlo desde una nueva sesión de pago. Si tu banco muestra una retención temporal pese a que el pago fue rechazado, su liberación depende de la entidad emisora y del proveedor de pagos.',
      'Si el problema se repite o crees que el cargo sí llegó a completarse, contacta con {{support_email}} e indica tu referencia de matrícula antes de realizar intentos adicionales.'
    ],
    facts: [
      { label: 'Pago intentado', value: '{{attempted_amount}}' },
      { label: 'Cuota', value: '{{installment_description}}' },
      { label: 'Estado', value: 'Pago no confirmado' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Intentar el pago de nuevo'
  },
  {
    code: 'E13',
    name: 'Sesión de pago caducada',
    trigger: 'Checkout verificado por SumUp con estado EXPIRED',
    subject: 'Tu sesión de pago ha caducado',
    preheader: 'No hemos registrado esa sesión como pago. Abre una nueva para continuar.',
    tone: 'neutral',
    body: [
      'Hola {{nombre}},',
      'La sesión de pago que abriste para GHC Academy ha caducado antes de que recibiéramos una confirmación de pago válida.',
      'No hemos registrado esa sesión como importe abonado.',
      'Si deseas continuar, abre una nueva sesión desde tu matrícula. Cada nueva sesión vuelve a comprobar el estado real de la orden antes de generar el enlace de pago.',
      'Si crees que llegaste a pagar antes de que la sesión caducara, no repitas el pago: contacta con {{support_email}} e indica tu referencia para que podamos comprobarlo.'
    ],
    facts: [
      { label: 'Importe de la sesión', value: '{{attempted_amount}}' },
      { label: 'Cuota', value: '{{installment_description}}' },
      { label: 'Estado', value: 'Sesión caducada · pago no confirmado' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Abrir una nueva sesión de pago'
  },
  {
    code: 'E14',
    name: 'Reembolso total confirmado',
    trigger: 'Reembolso total verificado y aplicado a la matrícula',
    subject: 'Reembolso confirmado · GHC Academy',
    preheader: 'Hemos registrado el reembolso total de los importes abonados en esta matrícula.',
    tone: 'neutral',
    body: [
      'Hola {{nombre}},',
      'Hemos registrado el reembolso total correspondiente a esta matrícula de GHC Academy.',
      'Los importes que constaban como abonados en la orden han quedado marcados como reembolsados y el saldo económico reconocido por GHC Academy para esta matrícula ha sido revertido.',
      'La plaza Fundador asociada a esta matrícula ha quedado liberada y esta orden no habilitará acceso académico.',
      'La fecha en la que el abono resulte visible en tu cuenta puede depender del proveedor de pagos y de tu entidad financiera. Cuando resulte aplicable un plazo legal específico, se respetará dicho plazo.',
      'Conserva este correo como confirmación de la operación. Si necesitas revisar cualquier dato, contacta con {{support_email}} indicando la referencia de matrícula y la referencia de reembolso.'
    ],
    facts: [
      { label: 'Importe reembolsado', value: '{{refunded_amount}}' },
      { label: 'Estado', value: 'Reembolso total registrado' },
      { label: 'Plaza Fundador', value: 'Liberada' },
      { label: 'Referencia de matrícula', value: '{{order_reference}}' },
      { label: 'Referencia de reembolso', value: '{{refund_reference}}' }
    ]
  }
];
