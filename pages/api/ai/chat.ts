import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, userId } = req.body;

  try {
    // 1. Aquí integrarías la llamada a OpenAI/Gemini
    // 2. Usarías los contenidos de tus módulos como "Contexto" (RAG)
    
    const aiResponse = "He analizado los módulos de GHC sobre Biomecánica y, según los estudios de 2024, la respuesta es...";

    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    return res.status(500).json({ error: 'Error en el cerebro de IA' });
  }
}
