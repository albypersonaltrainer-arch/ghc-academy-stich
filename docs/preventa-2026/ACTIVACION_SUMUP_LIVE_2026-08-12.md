# Activación SumUp LIVE · 12/08/2026

Estado operativo:
- El propietario ha creado y configurado una nueva `SUMUP_API_KEY` desde la cuenta real de SumUp.
- La clave se ha guardado únicamente en Vercel Production; no se versiona ni se copia en documentación.
- Production debe resolver el `merchant_code` mediante `/v0.1/me` y verificar el merchant contra SumUp antes de habilitar checkout/webhook.
- El gate exige merchant no Sandbox, país ES, moneda EUR, persistencia lista, token de checkout válido e identidad contractual completa.
- El gate no crea ningún checkout durante la verificación.
- GHC Academy continúa cerrada y fuera de la superficie pública; únicamente la preventa y sus rutas comprador permanecen autorizadas.

Este commit se utiliza además para forzar un nuevo despliegue Production después de la rotación de la credencial LIVE.
