# SumUp LIVE · hard gate de Production

Fecha: 2026-08-12

## Regla

En Production, SumUp no puede habilitar checkout ni webhook únicamente por disponer de credenciales y de los flags operativos habituales.

Además se exige de forma explícita:

`SUMUP_LIVE_ENABLED=true`

Mientras ese interruptor no exista con valor `true` en Production:

- `SUMUP_CHECKOUT_ENABLED` no habilita cobros reales;
- `SUMUP_WEBHOOK_ENABLED` no habilita procesamiento live;
- Preview/Sandbox mantiene su funcionamiento habitual;
- la preventa puede publicarse sin activar dinero real.

## Objetivo

Separar de forma inequívoca la publicación del funnel de preventa de la autorización posterior para activar cobros reales.
