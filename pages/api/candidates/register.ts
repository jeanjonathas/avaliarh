import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { name, email, birthDate, gender, phone, inviteCode } = req.body;

  if (!name || !email || !birthDate || !gender || !phone || !inviteCode) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    console.log(`Registrando candidato para o convite: ${inviteCode}`);

    // Buscar o candidato pelo código de convite
    const candidate = await prisma.candidate.findFirst({
      where: {
        inviteCode: inviteCode,
      },
    });

    if (!candidate) {
      console.log(`Convite não encontrado: ${inviteCode}`);
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // Verificar se o convite expirou
    if (candidate.inviteExpires && new Date(candidate.inviteExpires) < new Date()) {
      console.log(`Convite expirado: ${inviteCode}`);
      return res.status(400).json({ error: 'Este convite expirou' });
    }

    // Atualizar os dados do candidato
    const updatedCandidate = await prisma.candidate.update({
      where: {
        id: candidate.id,
      },
      data: {
        name,
        email,
        birthDate: new Date(birthDate),
        gender,
        phone,
        requiresProfileCompletion: false, // Marcar como perfil completo
      },
    });

    console.log(`Candidato registrado com sucesso: ${updatedCandidate.id}`);

    return res.status(200).json({
      success: true,
      message: 'Registro concluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao registrar candidato:', error);
    return res.status(500).json({ error: 'Erro ao registrar candidato' });
  }
}
