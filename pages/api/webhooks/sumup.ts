import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { event_type, data } = req.body;

  // Verificamos que el pago de SumUp sea exitoso
  if (event_type === 'CHECKOUT_SUCCESSFUL') {
    const transactionId = data.id.replace('SU-', '');

    try {
      // 1. Actualizamos la transacción a COMPLETED
      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' }
      });

      // 2. Le damos acceso al curso al alumno automáticamente
      await prisma.enrollment.create({
        data: {
          userId: transaction.userId,
          courseId: 'ID_DEL_CURSO_REFERENCIADO' // Esto debería venir de la transacción o el metadata
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error al procesar webhook:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  return res.status(200).json({ received: true });
}
