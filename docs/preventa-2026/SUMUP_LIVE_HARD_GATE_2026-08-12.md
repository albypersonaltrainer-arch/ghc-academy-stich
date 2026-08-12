# SumUp LIVE · hard gate de Production

Fecha: 2026-08-12

## Regla inicial

La publicación del funnel de preventa y la autorización para mover dinero real son decisiones separadas.

Hasta recibir autorización expresa, Production mantuvo SumUp cerrado aunque existieran credenciales y merchant configurados.

## Autorización LIVE

El 2026-08-12 el propietario autorizó expresamente abrir SumUp LIVE.

La autorización queda versionada en `lib/preventa/sumup-client.ts` mediante un interruptor explícito y reversible. Preview/Sandbox conserva sus flags habituales.

## Gate adicional de Production

Antes de que un despliegue Production con SumUp LIVE pueda sustituir al despliegue vigente, `scripts/verify-sumup-live-production.mjs` exige:

- API key y merchant configurados;
- merchant autenticado en SumUp;
- `sandbox === false`;
- país ES;
- moneda EUR;
- `PREVENTA_PUBLIC_BASE_URL=https://ghcacademy.net`;
- secreto de token de checkout configurado;
- identidad contractual completa: titular, identificación fiscal, domicilio y correo legal.

Si cualquiera de estas comprobaciones falla, el build Production falla y el despliegue anterior permanece activo sin abrir cobros.

## Superficie pública

`/legal` solo se permite en Production cuando la identidad contractual está completa. Esto no abre ninguna ruta de Academy.

## Objetivo

Mantener una activación de dinero real explícita, auditable, reversible y bloqueada automáticamente frente a credenciales Sandbox o identidad contractual incompleta.
