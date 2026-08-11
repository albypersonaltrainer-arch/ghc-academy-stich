import Link from 'next/link'
import styles from './legal.module.css'

export const metadata = {
  title: 'Información legal · GHC Academy',
  description: 'Condiciones de contratación, privacidad, desistimiento, pagos y venta internacional de GHC Academy.',
  robots: { index: false, follow: true }
}

const legalIdentity = {
  brand: 'GHC Academy · GHC Training — Health Through Strength',
  owner: process.env.NEXT_PUBLIC_GHC_LEGAL_NAME || 'PENDIENTE DE CONFIGURAR ANTES DE HABILITAR COBROS REALES',
  taxId: process.env.NEXT_PUBLIC_GHC_LEGAL_TAX_ID || 'PENDIENTE',
  address: process.env.NEXT_PUBLIC_GHC_LEGAL_ADDRESS || 'PENDIENTE',
  email: process.env.NEXT_PUBLIC_GHC_LEGAL_EMAIL || 'PENDIENTE'
}

const identityComplete = ![legalIdentity.owner, legalIdentity.taxId, legalIdentity.address, legalIdentity.email].some((value) => value === 'PENDIENTE' || value.startsWith('PENDIENTE DE'))

export default function LegalPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>GHC ACADEMY</Link>
        <div><strong>Marco legal global</strong><span>Versión GHC-LEGAL-GLOBAL-2026-08</span></div>
      </header>

      <section className={styles.hero}>
        <p>Información contractual y de privacidad</p>
        <h1>Condiciones legales de GHC Academy</h1>
        <span>Formación privada online · contratación internacional</span>
      </section>

      {!identityComplete ? (
        <aside className={styles.warning}>
          <strong>Documento preparado; contratación real todavía no habilitada.</strong>
          <p>Antes de conectar un proveedor de pago deben completarse la identidad jurídica/fiscal, domicilio y correo legal del prestador. Mientras falten esos datos esta página permanece fuera de indexación y no debe utilizarse para aceptar cobros reales.</p>
        </aside>
      ) : null}

      <nav className={styles.nav} aria-label="Índice legal">
        <a href="#aviso">Aviso legal</a>
        <a href="#contratacion">Contratación</a>
        <a href="#pagos">Pagos</a>
        <a href="#desistimiento">Desistimiento</a>
        <a href="#internacional">Internacional</a>
        <a href="#privacidad">Privacidad</a>
        <a href="#cookies">Cookies</a>
      </nav>

      <article className={styles.document}>
        <section id="aviso">
          <small>01</small><h2>Aviso legal e identidad del prestador</h2>
          <p>Este sitio y la plataforma formativa operan bajo la marca <strong>{legalIdentity.brand}</strong>.</p>
          <dl className={styles.identity}>
            <div><dt>Titular / prestador</dt><dd>{legalIdentity.owner}</dd></div>
            <div><dt>NIF / identificación fiscal</dt><dd>{legalIdentity.taxId}</dd></div>
            <div><dt>Domicilio</dt><dd>{legalIdentity.address}</dd></div>
            <div><dt>Contacto legal</dt><dd>{legalIdentity.email}</dd></div>
          </dl>
          <p>El acceso y uso de la web no atribuyen al usuario ningún derecho de propiedad sobre la plataforma, marca, materiales, software o contenidos de GHC Academy.</p>
        </section>

        <section id="contratacion">
          <small>02</small><h2>Condiciones generales de contratación y uso</h2>
          <h3>Naturaleza de la formación</h3>
          <p>GHC Academy ofrece formación privada online. Salvo que una oferta concreta indique expresamente otra cosa, su superación no equivale a una titulación oficial, no concede una licencia profesional universal ni sustituye los requisitos académicos, administrativos, colegiales, de experiencia o territoriales que puedan exigirse para ejercer una actividad profesional en el país o región del alumno.</p>
          <p>Los certificados emitidos por GHC Academy son certificados privados de formación y aprovechamiento. Acreditan la superación de los contenidos y evaluaciones internas indicados y pueden disponer de verificación digital pública.</p>

          <h3>Información previa a la compra</h3>
          <p>Antes de confirmar un pedido, el alumno verá las características esenciales del producto, precio total, moneda, impuestos cuando procedan, modalidad y calendario de pago, alcance del acceso, requisitos de progreso, naturaleza del contenido o servicio, información sobre desistimiento y las condiciones aplicables. El botón final de un checkout real indicará de forma inequívoca que la acción implica una obligación de pago.</p>

          <h3>Cuenta, acceso y propiedad intelectual</h3>
          <p>La matrícula y el acceso son personales e intransferibles. No está permitido compartir credenciales, facilitar el acceso a terceros, copiar masivamente, redistribuir, revender, publicar o explotar los materiales sin autorización. El alumno adquiere un derecho de acceso al producto contratado, no la propiedad de los contenidos ni una licencia de redistribución.</p>
          <p>La progresión puede estar sujeta simultáneamente a requisitos académicos y comerciales. El pago de un tramo no elimina la obligación de completar las lecciones o evaluaciones anteriores. GHC Academy puede actualizar materiales para corregir errores, incorporar evidencia o mejorar la experiencia, sin reducir sustancialmente el producto contratado.</p>

          <h3>Disponibilidad y continuidad</h3>
          <p>Cuando una oferta no establezca una duración concreta, el acceso se mantendrá mientras GHC Academy mantenga operativa la plataforma y el servicio, sujeto a estas condiciones. No se utiliza la expresión «de por vida». En caso de cierre, migración o cambio sustancial que afecte materialmente al acceso contratado, GHC aplicará las medidas de continuidad, migración, acceso alternativo o remedios que resulten exigibles por la normativa aplicable y comunicará el cambio con una antelación razonable cuando sea posible.</p>

          <h3>Soporte</h3>
          <p>Salvo que el producto indique expresamente tutoría, mentoring, revisión individual o sesiones en directo, la formación es autónoma. El soporte incluido es el descrito en cada oferta y puede comprender soporte técnico, administrativo y académico básico.</p>
        </section>

        <section id="pagos">
          <small>03</small><h2>Pagos, fraccionamiento, impagos y acceso</h2>
          <p>El checkout muestra el <strong>importe monetario final</strong> de cada modalidad disponible. GHC no presenta el fraccionamiento como un porcentaje abstracto cuando puede informar directamente de los importes que el alumno abonará.</p>
          <p>La política ordinaria de GHC Academy permite como máximo cuatro pagos. El número de pagos ofrecido depende del precio y del producto. El fraccionamiento interno actualmente configurado no añade coste financiero al consumidor. Si en el futuro se ofrece financiación con coste, se utilizará únicamente cuando el marco jurídico aplicable lo permita y, cuando proceda, mediante un proveedor financiero externo autorizado, con su información precontractual propia.</p>
          <p>En un plan fraccionado, cada pago confirmado habilita automáticamente el tramo comercial correspondiente del curso, sin saltarse la secuencialidad académica. El contenido ya adquirido y pagado no se retira por el mero impago de una cuota posterior; el contenido futuro permanece bloqueado hasta la regularización.</p>
          <p>GHC puede enviar recordatorios razonables antes y después del vencimiento. La política operativa general prevé recordatorio previo, aviso al vencimiento y recordatorios posteriores, con cierre del plan si persiste el impago durante el plazo configurado. El alumno recibirá información del estado y la administración conservará trazabilidad de los cambios. GHC puede conceder una extensión o corrección manual cuando exista causa justificada.</p>
          <p>El examen final y el certificado correspondiente a un producto sujeto a pagos fraccionados pueden requerir que el precio total esté satisfecho, además de los requisitos académicos.</p>
        </section>

        <section id="desistimiento">
          <small>04</small><h2>Desistimiento, inicio inmediato y reembolsos</h2>
          <h3>Política base GHC</h3>
          <p>Para compras de consumidores realizadas a distancia, GHC Academy aplica como política general un periodo de <strong>14 días naturales</strong> desde la formalización/primer pago confirmado, salvo que una norma imperativa aplicable reconozca al consumidor un derecho más amplio o establezca un cómputo diferente. Los derechos obligatorios del país del consumidor prevalecen cuando resulten aplicables.</p>

          <h3>«Quiero comenzar ahora»</h3>
          <p>Cuando el ordenamiento aplicable permita que el suministro inmediato de contenido digital afecte al derecho de desistimiento, el checkout podrá solicitar de forma separada: (1) la petición expresa de comenzar antes de que termine el plazo y (2) el reconocimiento expreso de la consecuencia legal sobre el desistimiento. La aceptación se registra con versión de condiciones, fecha y evidencia contractual y se confirma en soporte duradero.</p>
          <p><strong>Esta consecuencia no se presume globalmente.</strong> En países donde el derecho de retracto, revocación o arrepentimiento sea irrenunciable, tenga reglas distintas o no exista una excepción equivalente para contenido digital, el inicio inmediato no eliminará automáticamente ese derecho. GHC aplicará la norma territorial obligatoria y, si existe duda, la solicitud pasará a revisión en lugar de ser rechazada automáticamente.</p>

          <h3>Después del periodo aplicable</h3>
          <p>Una vez vencido válidamente el periodo de desistimiento/retracto aplicable —o cuando se haya perdido válidamente conforme a la ley territorial— GHC no ofrece una garantía voluntaria general de devolución por simple cambio de opinión. Esto no limita los derechos por falta de conformidad, servicio no suministrado, cobro duplicado, error de facturación, fraude, incumplimiento contractual u otros remedios obligatorios.</p>

          <h3>Productos híbridos o servicios</h3>
          <p>Cuando un producto incluya servicios humanos, tutorías, mentoring, directos u otras prestaciones diferenciables, la devolución y el desistimiento se calcularán según la naturaleza del contrato, la prestación efectivamente realizada y la ley aplicable. Si la normativa exige un importe proporcional por servicios ya prestados, se aplicará dicho régimen.</p>

          <h3>Cómo solicitarlo</h3>
          <p>El alumno podrá presentar una solicitud desde los canales de soporte habilitados o mediante el mecanismo electrónico disponible en su cuenta. GHC conservará el acuse, fecha, motivo, pedido afectado y resolución. Una solicitud basada en derechos obligatorios distintos del cambio de opinión será revisada aunque el periodo ordinario haya terminado.</p>
        </section>

        <section id="internacional">
          <small>05</small><h2>Venta internacional, ley aplicable y derechos territoriales</h2>
          <p>GHC Academy se comercializa internacionalmente. La disponibilidad de una formación en un país no significa que el certificado privado conceda por sí solo autorización para ejercer allí. El alumno debe comprobar los requisitos profesionales de su jurisdicción.</p>
          <p>Las presentes condiciones se interpretarán conforme a la ley del país del prestador en la medida legalmente permitida. <strong>Cuando el comprador sea consumidor, ninguna elección de ley o jurisdicción se utilizará para privarle de las protecciones imperativas que le correspondan por su residencia habitual o por otra normativa obligatoria aplicable.</strong></p>
          <p>GHC utiliza una política global de 14 días como base operativa, pero mantiene un motor territorial para no aplicar automáticamente una renuncia o excepción diseñada para España/UE en países con un régimen diferente. Entre otros ejemplos, las legislaciones de Argentina, Brasil, Colombia, México y Chile contienen plazos y condiciones propias para contratación a distancia. Las solicitudes procedentes de territorios no mapeados o con reglas dudosas se resuelven aplicando los derechos obligatorios y una revisión antes de denegar un derecho de consumidor.</p>
          <p>Los precios pueden mostrarse en euros. La entidad de pago, impuestos indirectos, retenciones, cambio de moneda o cargos propios del medio de pago pueden depender del territorio y serán informados cuando legalmente corresponda antes de la compra.</p>
        </section>

        <section id="privacidad">
          <small>06</small><h2>Política de privacidad</h2>
          <h3>Responsable y datos tratados</h3>
          <p>El responsable del tratamiento es el prestador identificado en el Aviso legal. Para operar Academy pueden tratarse datos de cuenta e identidad, contacto, país, matrícula, pedidos y pagos, aceptaciones legales, progreso académico, evaluaciones, certificados, soporte, seguridad, registros técnicos y comunicaciones relacionadas con el servicio.</p>
          <p>GHC no solicita datos de salud para una matrícula ordinaria salvo que un producto específico los necesite y exista una base jurídica y una información adicional adecuada. Los datos utilizados en evaluaciones o soporte se limitan a lo necesario para prestar el servicio.</p>

          <h3>Finalidades y bases</h3>
          <p>Los datos se utilizan para celebrar y ejecutar el contrato; autenticar y proteger cuentas; gestionar pagos, acceso, progreso, exámenes y certificados; atender soporte y reclamaciones; cumplir obligaciones legales, fiscales y de defensa de derechos; prevenir fraude y abuso; y, únicamente con la base jurídica adecuada, enviar comunicaciones comerciales.</p>
          <p>Las comunicaciones promocionales que requieran consentimiento se gestionarán separadamente de la aceptación necesaria para contratar y podrán darse de baja por un medio sencillo.</p>

          <h3>Destinatarios, encargados y transferencias</h3>
          <p>GHC puede utilizar proveedores de alojamiento, base de datos/autenticación, infraestructura web, correo transaccional, soporte y pagos. Solo se comunicarán los datos necesarios para cada finalidad. Cuando un tratamiento implique transferencias internacionales de datos, se utilizarán las garantías exigidas por la normativa aplicable. La lista operativa de proveedores se actualizará cuando se activen nuevos servicios como la pasarela de pago o el transporte de correo.</p>

          <h3>Conservación</h3>
          <p>Los datos se conservarán durante la relación contractual y posteriormente durante los plazos necesarios para obligaciones legales, fiscales, reclamaciones, seguridad y defensa de derechos. Los registros académicos y certificados podrán conservarse durante el tiempo necesario para mantener su verificación, con minimización de los datos públicos.</p>

          <h3>Derechos</h3>
          <p>Las personas pueden ejercer los derechos de acceso, rectificación, supresión, oposición, limitación, portabilidad y retirada del consentimiento cuando correspondan, así como los derechos adicionales reconocidos por su legislación local. También pueden acudir a la autoridad de protección de datos competente cuando tengan derecho a ello.</p>
        </section>

        <section id="cookies">
          <small>07</small><h2>Cookies y almacenamiento local</h2>
          <p>GHC Academy puede utilizar almacenamiento técnico estrictamente necesario para autenticación, seguridad, sesión, preferencias y funcionamiento solicitado por el usuario. Ese almacenamiento no se utiliza como autorización para publicidad comportamental.</p>
          <p>Si se incorporan analítica no esencial, publicidad, píxeles u otras tecnologías que legalmente requieran consentimiento, se activará un mecanismo de información y consentimiento previo adecuado al territorio antes de utilizarlas. El rechazo de tecnologías no esenciales no impedirá el acceso a las funciones que no dependan de ellas.</p>
        </section>

        <section>
          <small>08</small><h2>Reclamaciones, cambios y evidencia contractual</h2>
          <p>GHC conserva la versión de las condiciones aceptadas, precio, plan de pagos, país declarado, fecha/hora, consentimientos, confirmación contractual, cobros, vencimientos, accesos, comunicaciones relevantes, progreso, evaluaciones y solicitudes de reembolso o reclamación en la medida necesaria y legalmente permitida.</p>
          <p>Las condiciones aplicables a una compra son las aceptadas para ese pedido. Una modificación posterior no alterará retroactivamente elementos esenciales ya contratados salvo acuerdo válido, exigencia legal o cambio que resulte favorable al alumno. Las nuevas versiones se identificarán mediante un código de versión.</p>
          <p>Para incidencias, reclamaciones o ejercicio de derechos se utilizará el correo legal indicado en esta página y/o el centro de soporte de Academy.</p>
        </section>
      </article>

      <footer className={styles.footer}>
        <span>GHC Academy · Formación privada</span>
        <a href="#aviso">Identidad</a><a href="#desistimiento">Desistimiento</a><a href="#privacidad">Privacidad</a><a href="#cookies">Cookies</a>
      </footer>
    </main>
  )
}
