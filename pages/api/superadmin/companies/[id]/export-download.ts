import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verifica a autenticação
  const session = await getSession({ req });
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Apenas método GET é permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id } = req.query;
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ message: 'Nome do arquivo é obrigatório' });
    }

    const filePath = path.join('/tmp', filename as string);

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }

    // Lê o arquivo e envia como resposta
    const fileStream = fs.createReadStream(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    
    // Pipe do stream para a resposta
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    return res.status(500).json({ message: 'Erro ao baixar arquivo' });
  }
}
