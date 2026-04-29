/*
  ARCHIVO: /lib/gating.ts
  DESCRIPCIÓN: Lógica de negocio para verificar si un alumno puede acceder a un módulo específico.
*/

import { prisma } from './prisma'; 

export async function checkModuleAccess(userId: string, moduleId: string) {
  // 1. Obtenemos el módulo al que se intenta acceder
  const currentModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true }
  });

  if (!currentModule) {
    throw new Error("Módulo no encontrado");
  }

  // 2. Si es el primer módulo (order = 1), el acceso es libre
  if (currentModule.order === 1) {
    return { allowed: true, message: "Acceso permitido al módulo inicial." };
  }

  // 3. Buscamos el módulo inmediatamente anterior en el mismo curso
  const previousModule = await prisma.module.findFirst({
    where: {
      courseId: currentModule.courseId,
      order: currentModule.order - 1
    },
    include: { exam: true }
  });

  // 4. Si el módulo anterior no tiene examen, permitimos el paso
  if (!previousModule || !previousModule.exam) {
    return { allowed: true, message: "El módulo anterior no requiere evaluación." };
  }

  // 5. Verificamos si existe un intento de examen aprobado para el módulo anterior
  const passedAttempt = await prisma.examAttempt.findFirst({
    where: {
      userId: userId,
      examId: previousModule.exam.id,
      passed: true
    }
  });

  if (passedAttempt) {
    return { allowed: true, message: "Examen previo aprobado. Acceso concedido." };
  } else {
    return { 
      allowed: false, 
      message: "Contenido bloqueado. Debes aprobar el examen del módulo anterior con al menos un 70%." 
    };
  }
}
