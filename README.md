# ⚡ GHC Academy - STITCH 2.0
> **SPORT THROUGH SCIENCE**

Bienvenido a la infraestructura oficial de **GHC Academy**, una plataforma premium de e-learning especializada en biomecánica y alto rendimiento. Este sistema ha sido diseñado para ser autónomo, seguro y escalable.

## 🛠️ Mapa del Tesoro (Inventario de Archivos)

### 🏗️ Núcleo del Sistema
- `package.json`: Motor de dependencias (Next.js, Prisma, SumUp).
- `middleware.ts`: El portero invisible que protege la ruta `/admin`.
- `lib/prisma.ts`: Conector central de la base de datos.

### 🎨 Frontend & Layout
- `components/RootShell.tsx`: Navegación SPA (Anti-pantalla en blanco).
- `components/PDFViewer.tsx`: Visor con marca de agua antipiratería.
- `components/AIChatWidget.tsx`: Asistente de IA flotante 24/7.

### 🧠 Cerebro e Inteligencia
- `prisma/schema.prisma`: Estructura de tablas (Usuarios, Pagos, Exámenes, Afiliados).
- `lib/gating.ts`: Lógica de bloqueo de módulos por examen.
- `scripts/seed-db.ts`: Generador de datos de prueba (Alumnos y ventas).

### 💳 Pasarela de Pagos & API
- `pages/api/checkout/sumup.ts`: Iniciador de cobros con SumUp.
- `pages/api/webhooks/sumup.ts`: Activador automático de cursos tras el pago.
- `pages/api/ai/chat.ts`: Cerebro de la IA para soporte al alumno.

## 🚀 Guía de Lanzamiento (Deploy)

1. **Base de Datos:** Crea un proyecto en [Supabase](https://supabase.com) y pega la "Connection String" en tus variables de entorno como `DATABASE_URL`.
2. **Prisma:** Ejecuta `npx prisma db push` para crear las tablas y `npm run seed-db` para cargar los datos de prueba.
3. **Frontend:** Conecta este repositorio a [Vercel](https://vercel.com).
4. **Environment Variables:** Configura tus Keys de SumUp y OpenAI/Gemini en el panel de Vercel.

## 🔐 Manual de Seguridad: El Panel Admin
El acceso a la administración es **invisible**. 
- No existe el botón "/admin" en el menú público.
- Debes entrar manualmente escribiendo la URL tu-dominio.com/admin.
- El sistema solo te dejará entrar si tu usuario en la base de datos tiene el `role: 'ADMIN_ROLE'`. De lo contrario, verás un error 404 (página no encontrada).

---

## 🎖️ Agradecimientos
Proyecto desarrollado bajo la visión de unir la ciencia deportiva con la tecnología más avanzada.

**GHC ACADEMY**  
*SPORT THROUGH SCIENCE*
