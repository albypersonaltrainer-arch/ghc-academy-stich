'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

type State = 'idle' | 'saving' | 'saved' | 'error';

function attribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: (params.get('utm_source') || '').slice(0, 80),
    utmMedium: (params.get('utm_medium') || '').slice(0, 80),
    utmCampaign: (params.get('utm_campaign') || '').slice(0, 100),
  };
}

export function trackAcademyEvent(event: 'landing_view' | 'lead_cta' | 'checkout_click' | 'resource_view') {
  const params = new URLSearchParams(window.location.search);
  // No cookies, fingerprint, IP fields, email addresses or visitor identifiers.
  void fetch('/api/preventa/medicion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      event,
      path: window.location.pathname,
      source: params.get('utm_source') || '',
      campaign: params.get('utm_campaign') || '',
    }),
  }).catch(() => {});
}

export default function InterestLeadCard() {
  const [status, setStatus] = useState<State>('idle');
  const [message, setMessage] = useState('');
  useEffect(() => {
    trackAcademyEvent('landing_view');
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href*="/preventa/checkout"]');
      if (anchor) trackAcademyEvent('checkout_click');
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/preventa/interesados', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.get('firstName'),
          email: formData.get('email'),
          audience: formData.get('audience'),
          privacyAcknowledged: formData.get('privacy') === 'on',
          marketingConsent: formData.get('marketing') === 'on',
          companyWebsite: formData.get('companyWebsite'),
          ...attribution(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar tu solicitud.');
      form.reset();
      setStatus('saved');
      setMessage('Tus datos se han registrado correctamente. Puedes seguir explorando el programa y matricularte cuando lo decidas.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ha ocurrido un error.');
    }
  }

  const fieldStyle = {
    minWidth: 0, width: '100%', padding: '13px 15px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,.20)', background: '#111712',
    color: '#fff', font: 'inherit', boxSizing: 'border-box' as const,
  };
  return (
    <section id="solicitar-informacion" aria-label="Solicita información sobre GHC Academy"
      style={{ padding: '24px 22px 96px' }}>
      <div style={{ margin: '0 auto', maxWidth: 1040, padding: 'clamp(22px,4vw,56px)',
        borderRadius: 24, border: '1px solid rgba(34,214,91,.28)',
        background: 'linear-gradient(120deg,#101a12,#070a08)', color: '#f3f7f3' }}>
        <p style={{ color: '#54d878', letterSpacing: '.13em', fontSize: 12, fontWeight: 800 }}>
          ¿AÚN ESTÁS VALORANDO LA FORMACIÓN?
        </p>
        <h2 style={{ fontSize: 'clamp(30px,4vw,46px)', margin: '10px 0 18px', lineHeight: 1.09 }}>
          Descubre si GHC Academy encaja contigo
        </h2>
        <p style={{ color: '#c4d0c6', maxWidth: 700, lineHeight: 1.7, marginBottom: 22 }}>
          Déjanos tus datos para poder atender tu solicitud de información. Solo necesitamos lo esencial.
          Si ya lo tienes claro, puedes continuar directamente a la matrícula.
        </p>
        {status === 'saved' ? (
          <div role="status" style={{ border: '1px solid #54d878', borderRadius: 12, padding: 20 }}>
            <strong>Solicitud recibida.</strong> {message}
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 650 }}>
            <label style={{ display: 'grid', gap: 7, fontWeight: 650 }}>
              Nombre
              <input name="firstName" type="text" autoComplete="given-name" minLength={2} maxLength={80}
                placeholder="Tu nombre" required style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 7, fontWeight: 650 }}>
              Correo electrónico
              <input name="email" type="email" autoComplete="email" maxLength={254}
                placeholder="nombre@correo.com" required style={fieldStyle} />
            </label>
            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <legend style={{ fontWeight: 650, marginBottom: 9 }}>¿Cuál es tu situación?</legend>
              <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 15 }}>
                <input type="radio" name="audience" value="aspirante" required defaultChecked />
                Quiero empezar como entrenador personal
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 15 }}>
                <input type="radio" name="audience" value="profesional" required />
                Ya soy entrenador y quiero ampliar mi formación
              </label>
            </fieldset>
            <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} aria-hidden="true">
              <label>Web de empresa<input name="companyWebsite" autoComplete="off" tabIndex={-1}/></label>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'start', lineHeight: 1.5, fontSize: 13 }}>
              <input type="checkbox" name="privacy" required />
              <span>He leído la <Link href="/legal#privacidad" style={{ color: '#65e58a' }}>información de privacidad</Link> y solicito información sobre el programa. (Obligatorio)</span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'start', lineHeight: 1.5, fontSize: 13 }}>
              <input type="checkbox" name="marketing" />
              <span>Quiero recibir también novedades y comunicaciones comerciales de GHC Academy. (Opcional)</span>
            </label>
            {status === 'error' && <p role="alert" style={{ color: '#ffb0ae' }}>{message}</p>}
            <button type="submit" disabled={status === 'saving'} style={{
              background: '#29d658', color: '#051008', fontWeight: 850, border: 'none',
              borderRadius: 13, padding: 17, cursor: 'pointer', fontSize: 16,
            }}>
              {status === 'saving' ? 'Registrando…' : 'Solicitar información'}
            </button>
            <p style={{ color: '#9aafa0', margin: 0, fontSize: 12, lineHeight: 1.6 }}>
              Sin obligación de compra. Tus datos se utilizan para atender la solicitud; las comunicaciones comerciales son opcionales.
            </p>
          </form>
        )}
        <p style={{ margin: '24px 0 0', fontSize: 14, color: '#b0c0b4' }}>
          ¿Ya lo tienes decidido? <Link href="/preventa/checkout?plan=single" onClick={() => trackAcademyEvent('checkout_click')}
            style={{ color: '#73ec93', fontWeight: 750 }}>Matricúlate directamente por 1.690 € →</Link>
        </p>
      </div>
    </section>
  );
}
