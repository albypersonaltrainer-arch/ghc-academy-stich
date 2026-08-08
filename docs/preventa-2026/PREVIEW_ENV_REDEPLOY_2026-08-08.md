# GHC Academy · Preventa 2026 · Redeploy Preview

Fecha: 2026-08-08
Rama: `preventa-2026-auditoria-v0-1`

Este commit fuerza un nuevo Preview de Vercel después de configurar las variables privadas necesarias para probar la persistencia de preventa.

Variables esperadas en Preview:
- `NEXT_PUBLIC_SUPABASE_URL`
- `PREVENTA_PERSISTENCE_ENABLED=true`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PREVENTA_CHECKOUT_TOKEN_SECRET`

Gates de pago que deben permanecer cerrados:
- `SUMUP_CHECKOUT_ENABLED=false`
- `SUMUP_WEBHOOK_ENABLED=false`

No contiene secretos ni credenciales.
