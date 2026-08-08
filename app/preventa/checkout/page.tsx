import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import styles from '../flow.module.css';

export const metadata = {
  title: 'Checkout · Edición Fundadora · GHC Academy',
  description: 'Resumen y preparación de matrícula de la Edición Fundadora GHC Academy 2026.',
};

export default function CheckoutPreventaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.internalBanner}>
        <strong>Preview interna</strong>
        <span>El botón de pago está desactivado. No se realiza ningún cargo.</span>
      </div>

      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink} aria-label="Volver a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.headerCenter}>
          <span>●</span>
          Matrícula · Edición Fundadora 2026
        </div>
        <Link href="/preventa" className={styles.backLink}>← Volver a la oferta</Link>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Matrícula fundadora · Preview</p>
          <h1>Revisa exactamente qué estás contratando.</h1>
          <p>
            El checkout definitivo debe ser corto, claro y trazable: producto, modalidad de pago,
            datos necesarios e información precontractual antes de pasar a SumUp.
          </p>
        </section>

        <div className={styles.checkoutGrid}>
          <div className={styles.flow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>01</span>
                <div>
                  <h2>Resumen de matrícula</h2>
                  <p>Solo lo que condiciona la decisión de compra.</p>
                </div>
              </div>

              <div className={styles.productStrip}>
                <div><span>Producto</span><strong>Pack completo GHC Academy</strong></div>
                <div><span>Contenido</span><strong>3 niveles · 30 módulos</strong></div>
                <div><span>Edición</span><strong>Fundadora · máximo 100 plazas</strong></div>
                <div><span>Apertura</span><strong>Durante octubre de 2026</strong></div>
                <div><span>Formato</span><strong>Formación privada online</strong></div>
                <div><span>Acceso</span><strong>Mientras la plataforma esté operativa</strong></div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>02</span>
                <div>
                  <h2>Modalidad de pago</h2>
                  <p>La modalidad elegida debe quedar vinculada a la orden y a la confirmación contractual.</p>
                </div>
              </div>

              <div className={styles.paymentChoices}>
                <article className={styles.paymentChoice}>
                  <span className={styles.choiceLabel}>Seleccionada en esta Preview</span>
                  <h3>Pago único</h3>
                  <strong className={styles.price}>1.690 €</strong>
                  <p>Condición fundadora para las primeras 100 plazas.</p>
                </article>

                <article className={styles.paymentChoicePending}>
                  <span className={styles.choiceLabel}>Gate económico pendiente</span>
                  <h3>50 % + 50 %</h3>
                  <strong className={styles.price}>—</strong>
                  <p>Segundo pago 15 días naturales después del primero. El total será superior al pago único.</p>
                </article>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>03</span>
                <div>
                  <h2>Datos del comprador</h2>
                  <p>Minimización de datos: no convertir el checkout en una encuesta.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="nombre">Nombre</label>
                  <input id="nombre" type="text" placeholder="Nombre" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="apellidos">Apellidos</label>
                  <input id="apellidos" type="text" placeholder="Apellidos" />
                </div>
                <div className={styles.fieldFull}>
                  <label htmlFor="email">Correo electrónico</label>
                  <input id="email" type="email" placeholder="nombre@correo.com" />
                  <small>Cuenta, confirmación, acceso y soporte.</small>
                </div>
                <div className={styles.field}>
                  <label htmlFor="pais">País de residencia</label>
                  <select id="pais" defaultValue="">
                    <option value="" disabled>Selecciona país</option>
                    <option>España</option>
                    <option>México</option>
                    <option>Argentina</option>
                    <option>Colombia</option>
                    <option>Chile</option>
                    <option>Uruguay</option>
                    <option>Otro país hispanohablante</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="telefono">Teléfono · opcional</label>
                  <input id="telefono" type="tel" placeholder="+34 ..." />
                  <small>No implica consentimiento comercial.</small>
                </div>
                <div className={styles.fieldFull}>
                  <label htmlFor="fiscal">NIF / identificador fiscal · cuando proceda</label>
                  <input id="fiscal" type="text" placeholder="Solo si es necesario para facturación" />
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>04</span>
                <div>
                  <h2>Información esencial antes del pago</h2>
                  <p>Esta capa no sustituye las condiciones definitivas; muestra la arquitectura que debe quedar clara.</p>
                </div>
              </div>

              <div className={styles.precontractGrid}>
                <div className={styles.fact}><span>Naturaleza</span><strong>Formación privada. No es una titulación oficial ni una habilitación automática.</strong></div>
                <div className={styles.fact}><span>Inicio</span><strong>La plataforma abrirá durante octubre de 2026; el día exacto se comunicará cuando pueda garantizarse.</strong></div>
                <div className={styles.fact}><span>Contenido</span><strong>Tres niveles y treinta módulos dentro de la plataforma. El contenido principal no es descargable.</strong></div>
                <div className={styles.fact}><span>Evaluación</span><strong>Recorrido secuencial y umbral diseñado del 80 % por módulo, sujeto a Gate técnico.</strong></div>
                <div className={styles.fact}><span>Soporte</span><strong>Soporte técnico, administrativo y académico básico. Sin tutoría individual ni mentoría.</strong></div>
                <div className={styles.fact}><span>Continuidad</span><strong>Acceso al contenido adquirido mientras GHC Academy mantenga operativa la plataforma y el servicio.</strong></div>
              </div>

              <div className={styles.legalPending}>
                <strong>Gate jurídico:</strong> entidad contratante, impuestos, desistimiento, inicio del suministro digital,
                efectos del impago, versión de condiciones y etiqueta final del botón requieren validación de José Luis antes de cobrar.
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>05</span>
                <div>
                  <h2>Aceptaciones y consentimientos</h2>
                  <p>Separados y sin premarcar. El marketing nunca se mezcla con la aceptación contractual.</p>
                </div>
              </div>

              <div className={styles.checkList}>
                <label className={styles.checkRow}>
                  <input type="checkbox" />
                  <span><strong>Obligatoria · texto provisional.</strong> He leído la información precontractual y acepto las condiciones de contratación que resulten aprobadas para esta versión del checkout.</span>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" />
                  <span><strong>Obligatoria · texto provisional.</strong> Confirmo que conozco la naturaleza privada de GHC Academy y la ventana prevista de apertura en octubre de 2026.</span>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" />
                  <span className={styles.optional}><strong>Opcional.</strong> Quiero recibir comunicaciones comerciales propias de GHC Academy. Podré retirar el consentimiento en cualquier momento.</span>
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span>Resumen del pedido</span>
              <h2>Edición Fundadora 2026</h2>
            </div>

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}><span>Producto</span><strong>3 niveles · 30 módulos</strong></div>
              <div className={styles.summaryLine}><span>Modalidad</span><strong>Pago único</strong></div>
              <div className={styles.summaryLine}><span>Apertura</span><strong>Octubre 2026</strong></div>
              <div className={styles.summaryLine}><span>Plazas</span><strong>Máximo 100</strong></div>
              <div className={styles.summaryLine}><span>Valor separado</span><strong><s>2.670 €</s></strong></div>
              <div className={styles.summaryLine}><span>Pack oficial</span><strong><s>2.290 €</s></strong></div>
            </div>

            <div className={styles.total}>
              <span className={styles.totalLabel}>Total Edición Fundadora</span>
              <strong className={styles.totalPrice}>1.690 €</strong>
              <span className={styles.saving}>Ahorro de 980 € frente a niveles separados</span>
            </div>

            <button className={styles.payButton} type="button" disabled>
              Pago desactivado en Preview
            </button>
            <Link href="/preventa/confirmacion" className={styles.previewLink}>
              Ver pantalla de confirmación
            </Link>
            <p className={styles.secureNote}>
              En producción, este paso enviará al pago validado y conservará versión de condiciones,
              fecha, hora, atribución y evidencias necesarias.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
