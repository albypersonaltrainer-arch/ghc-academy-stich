// scripts/seed-db.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed de GHC Academy...');

  // 1. Crear Administrador
  await prisma.user.upsert({
    where: { email: 'admin@demo' },
    update: {},
    create: {
      email: 'admin@demo',
      name: 'Admin GHC',
      role: 'ADMIN',
    },
  });

  // 2. Crear 10 Alumnos
  const studentEmails = [
    'juan@demo', 'maria@demo', 'carlos@demo', 'elena@demo', 'pablo@demo', 
    'ana@demo', 'sergio@demo', 'laura@demo', 'diego@demo', 'marta@demo'
  ];

  for (const email of studentEmails) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split('@')[0].toUpperCase(),
        role: 'STUDENT',
      },
    });
  }

  // 3. Crear Curso y Módulos con Exámenes
  const course = await prisma.course.create({
    data: {
      title: 'Fundamentos de Alto Rendimiento',
      description: 'Lleva tu físico al siguiente nivel con ciencia.',
      price: 199.99,
      level: 1,
      modules: {
        create: [
          {
            title: 'Módulo 1: Nutrición Celular',
            order: 1,
            content: { videoUrl: 'signed-url-1', pdfUrl: 'pdf-1' },
            exam: {
              create: {
                questions: [{ q: '¿Proteína base?', options: ['A', 'B'], correct: 0 }],
                minScore: 0.7
              }
            }
          },
          {
            title: 'Módulo 2: Biomecánica Avanzada',
            order: 2,
            content: { videoUrl: 'signed-url-2', pdfUrl: 'pdf-2' },
          }
        ]
      }
    }
  });

  // 4. Crear 15 Transacciones
  for (let i = 0; i < 15; i++) {
    await prisma.transaction.create({
      data: {
        userId: (await prisma.user.findFirst({ where: { role: 'STUDENT' } }))?.id || '',
        amount: 199.99,
        status: i % 3 === 0 ? 'COMPLETED' : 'PENDING',
        provider: 'SUMUP',
      }
    });
  }

  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
