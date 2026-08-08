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
    name: 'Confirmación de pago único',
    trigger: 'Pago único aprobado',
    subject: 'Tu matrícula fundadora en GHC Academy está registrada',
    preheader: 'Confirmación de tu plaza, importe y apertura prevista.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Hemos registrado correctamente tu matrícula en la Edición Fundadora de GHC Academy.',
      'Has adquirido el pack completo de tres niveles y treinta módulos mediante pago único. La plataforma abrirá durante octubre de 2026; comunicaremos el día concreto cuando podamos garantizarlo.',
      'GHC Academy es una formación privada. Sus certificados son privados y verificables, pero no equivalen por sí mismos a una titulación oficial ni a una habilitación administrativa automática.',
      'Guarda este correo como parte de la confirmación de tu matrícula.'
    ],
    facts: [
      { label: 'Modalidad', value: 'Pago único' },
      { label: 'Importe abonado', value: '1.690 €' },
      { label: 'Saldo pendiente', value: '0 €' },
      { label: 'Producto', value: '3 niveles · 30 módulos' },
      { label: 'Apertura prevista', value: 'Durante octubre de 2026' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Ver estado de mi matrícula'
  },
  {
    code: 'E02',
    name: 'Confirmación primer 50 %',
    trigger: 'Primera cuota aprobada',
    subject: 'Hemos registrado el primer pago de tu matrícula fundadora',
    preheader: 'Tu primera cuota está registrada. Consulta el saldo y el vencimiento.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Hemos registrado el primer pago de tu matrícula en la Edición Fundadora de GHC Academy.',
      'La modalidad fraccionada tiene un precio total de 1.790 €, dividido en dos pagos de 895 €. La segunda cuota vence 15 días naturales después del primer pago.',
      'Mientras exista una deuda vencida no se activará el acceso académico. Conservaremos tu expediente abierto conforme a las condiciones aprobadas para que puedas regularizarlo.',
      'Guarda este correo: contiene el vencimiento de tu segunda cuota y los datos de tu matrícula.'
    ],
    facts: [
      { label: 'Modalidad', value: '895 € + 895 €' },
      { label: 'Pagado hoy', value: '895 €' },
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Segundo vencimiento', value: '{{second_payment_due_date}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Ver mi matrícula'
  },
  {
    code: 'E03',
    name: 'Recordatorio preventivo',
    trigger: '3 días antes del segundo vencimiento',
    subject: 'Tu segunda cuota de GHC Academy vence en 3 días',
    preheader: 'Recordatorio preventivo de tu segundo pago de 895 €.',
    tone: 'neutral',
    body: [
      'Hola {{nombre}},',
      'Te escribimos para recordarte con antelación que la segunda cuota de tu matrícula fundadora vence dentro de tres días.',
      'El importe pendiente es de 895 €. No necesitas hacer nada hoy si ya tienes previsto completarlo antes de la fecha indicada.',
      'Este mensaje es únicamente preventivo para que puedas organizar el pago sin prisas.'
    ],
    facts: [
      { label: 'Importe pendiente', value: '895 €' },
      { label: 'Vencimiento', value: '{{second_payment_due_date}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Completar segundo pago'
  },
  {
    code: 'E04',
    name: 'Segundo pago vence hoy',
    trigger: 'Fecha de vencimiento',
    subject: 'Hoy vence la segunda cuota de tu matrícula fundadora',
    preheader: 'Completa hoy el segundo pago de 895 €.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Hoy vence la segunda cuota de tu matrícula fundadora en GHC Academy.',
      'El importe pendiente es de 895 €. Si ya has realizado el pago y este mensaje se ha cruzado con la confirmación, no necesitas hacer nada.',
      'Si todavía no lo has completado, puedes hacerlo desde el enlace asociado a tu matrícula.'
    ],
    facts: [
      { label: 'Importe pendiente', value: '895 €' },
      { label: 'Vence', value: 'Hoy · {{second_payment_due_date}}' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Completar segundo pago'
  },
  {
    code: 'E05',
    name: 'Pago pendiente',
    trigger: 'Día 1 tras vencimiento',
    subject: 'Tu segunda cuota aparece pendiente',
    preheader: 'Tu expediente sigue abierto para que puedas regularizar el pago.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'La segunda cuota de tu matrícula aparece todavía pendiente después de su fecha de vencimiento.',
      'Tu expediente continúa abierto para que puedas regularizarlo. Mientras exista deuda vencida, el acceso académico no podrá activarse.',
      'Si has pagado recientemente, espera a recibir la confirmación. Si has tenido una incidencia real, utiliza el canal de soporte indicado.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Estado', value: 'Pendiente de regularización' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar pago'
  },
  {
    code: 'E06',
    name: 'Recordatorio de regularización',
    trigger: 'Día 7 tras vencimiento',
    subject: 'Recordatorio sobre tu matrícula pendiente de regularización',
    preheader: 'Tu expediente continúa abierto.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Han pasado siete días desde el vencimiento de la segunda cuota y tu matrícula continúa pendiente de regularización.',
      'El expediente sigue abierto. El importe pendiente es de 895 € y el acceso académico permanece bloqueado mientras exista deuda vencida.',
      'Si necesitas resolver una incidencia relacionada con el pago, contacta con {{support_email}}.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Estado', value: 'Expediente abierto' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar matrícula'
  },
  {
    code: 'E07',
    name: 'Queda un mes',
    trigger: 'Día 30 tras vencimiento',
    subject: 'Tu expediente de matrícula sigue abierto',
    preheader: 'Aún puedes regularizar la segunda cuota antes del cierre del expediente.',
    tone: 'warning',
    body: [
      'Hola {{nombre}},',
      'Tu segunda cuota continúa pendiente y el expediente de matrícula sigue abierto.',
      'De acuerdo con las condiciones aprobadas, el expediente puede mantenerse abierto hasta 60 días desde el vencimiento, salvo una excepción expresamente aprobada.',
      'Aún puedes regularizar el saldo de 895 € antes de que se alcance el plazo de cierre.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Situación', value: 'Expediente abierto · acceso bloqueado' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar matrícula'
  },
  {
    code: 'E08',
    name: 'Último aviso',
    trigger: 'Día 53 tras vencimiento',
    subject: 'Último aviso antes del cierre de tu expediente',
    preheader: 'Quedan 7 días para el cierre previsto del expediente.',
    tone: 'critical',
    body: [
      'Hola {{nombre}},',
      'Este es el último aviso ordinario antes del cierre previsto de tu expediente de matrícula.',
      'Han transcurrido 53 días desde el vencimiento de la segunda cuota. Si el saldo de 895 € no se regulariza, el expediente alcanzará el día 60 pendiente de pago.',
      'Si existe una incidencia excepcional que debamos conocer, contacta con {{support_email}} antes del cierre.'
    ],
    facts: [
      { label: 'Saldo pendiente', value: '895 €' },
      { label: 'Días hasta cierre previsto', value: '7 días' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Regularizar ahora'
  },
  {
    code: 'E09',
    name: 'Cancelación del expediente',
    trigger: 'Día 60 tras vencimiento, salvo excepción',
    subject: 'Cierre de tu expediente de matrícula',
    preheader: 'Tu expediente se ha cerrado por falta de regularización del segundo pago.',
    tone: 'critical',
    body: [
      'Hola {{nombre}},',
      'Ha transcurrido el plazo previsto de regularización sin que conste completado el segundo pago de tu matrícula.',
      'Por este motivo, el expediente queda cerrado conforme a las condiciones aplicables, salvo que exista una excepción previamente aprobada y registrada.',
      'Este cierre no convierte una deuda pendiente en acceso académico ni activa la formación. Conservaremos la trazabilidad necesaria de la orden y de las comunicaciones.'
    ],
    facts: [
      { label: 'Estado', value: 'Expediente cerrado' },
      { label: 'Saldo no regularizado', value: '895 €' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ]
  },
  {
    code: 'E10',
    name: 'Segundo pago completado',
    trigger: 'Segunda cuota aprobada',
    subject: 'Tu matrícula fundadora ya está completamente abonada',
    preheader: 'Hemos registrado tu segunda cuota de 895 €.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'Hemos registrado correctamente la segunda cuota de tu matrícula fundadora.',
      'Tu modalidad fraccionada queda completamente abonada: 895 € + 895 €, total 1.790 €.',
      'La plataforma abrirá durante octubre de 2026. Recibirás un correo específico de apertura y acceso cuando el entorno académico esté operativo y tu matrícula sea apta para activación.',
      'Gracias por formar parte de la primera generación de GHC Academy.'
    ],
    facts: [
      { label: 'Total abonado', value: '1.790 €' },
      { label: 'Saldo pendiente', value: '0 €' },
      { label: 'Estado de pago', value: 'Completado' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Ver estado de mi matrícula'
  },
  {
    code: 'E11',
    name: 'Apertura y acceso',
    trigger: 'Plataforma operativa + matrícula apta',
    subject: 'GHC Academy ya está abierta: activa tu acceso',
    preheader: 'Tu matrícula está apta y ya puedes entrar en la plataforma.',
    tone: 'success',
    body: [
      'Hola {{nombre}},',
      'La plataforma de GHC Academy ya está operativa y tu matrícula cumple las condiciones para activar el acceso.',
      'Dentro encontrarás los tres niveles y treinta módulos. El recorrido es secuencial: cada módulo se desbloquea al superar el anterior con el umbral académico establecido.',
      'El contenido principal se consulta dentro de la plataforma. El soporte incluido es técnico, administrativo y académico básico; no incluye tutoría individual ni mentoría personalizada.',
      'Bienvenido a la primera generación de GHC Academy.'
    ],
    facts: [
      { label: 'Producto', value: '3 niveles · 30 módulos' },
      { label: 'Estado', value: 'Acceso habilitable' },
      { label: 'Referencia', value: '{{order_reference}}' }
    ],
    cta: 'Entrar en GHC Academy'
  }
];
