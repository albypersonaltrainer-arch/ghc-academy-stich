/*
  ARCHIVO: /pages/api/checkout/sumup.ts
  DESCRIPCIÓN: Endpoint para iniciar el proceso de pago con la pasarela SumUp.
*/

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, courseId, affiliateId } = req.body;

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: course.price,
        provider: 'SUMUP',
        status: 'PENDING',
        affiliateId: affiliateId || null
      }
    });

    // Simulación de respuesta de API de SumUp
    const sumupResponse = {
      checkout_id: `SU-${transaction.id}`,
      status: 'PENDING',
      redirect_url: `https://gateway.sumup.com/pay/checkout/${transaction.id}`
    };

    return res.status(200).json({
      url: sumupResponse.redirect_url,
      transactionId: transaction.id
    });

  } catch (error) {
    console.error('Error en SumUp Checkout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
