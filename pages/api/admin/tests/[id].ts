import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar teste por ID usando SQL raw
      const tests = await prisma.$queryRaw`
        SELECT 
          t.id, 
          t.title, 
          t.description, 
          t."timeLimit", 
          t.active, 
          t."createdAt", 
          t."updatedAt"
        FROM "tests" t
        WHERE t.id = ${id}
      `;

      const test = Array.isArray(tests) && tests.length > 0 ? tests[0] : null;

      if (!test) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Formatar resposta - não tentamos buscar seções do teste
      // já que a tabela TestSection não existe no banco de dados atual
      const formattedTest = {
        ...test,
        testSections: [] // Array vazio para evitar erros no frontend
      };

      return res.status(200).json(formattedTest);
    } catch (error) {
      console.error('Erro ao buscar teste:', error);
      return res.status(500).json({ error: 'Erro ao buscar teste' });
    }
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { title, description, timeLimit, active } = req.body;

      if (req.method === 'PUT' && !title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' });
      }

      // Construir conjunto de campos a serem atualizados
      let updateFields = '';
      const updates = [];

      if (title !== undefined) {
        updates.push(`title = '${title}'`);
      }
      
      if (description !== undefined) {
        updates.push(`description = ${description ? `'${description}'` : 'NULL'}`);
      }
      
      if (timeLimit !== undefined) {
        updates.push(`"timeLimit" = ${timeLimit ? parseInt(timeLimit) : 'NULL'}`);
      }
      
      if (active !== undefined) {
        updates.push(`active = ${active}`);
      }
      
      updates.push(`"updatedAt" = NOW()`);
      
      // Atualizar o teste usando SQL raw com string de atualização
      const updateQuery = `
        UPDATE "tests"
        SET ${updates.join(', ')}
        WHERE id = '${id}'
      `;
      
      await prisma.$executeRawUnsafe(updateQuery);

      // Buscar o teste atualizado
      const updatedTests = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          active, 
          "createdAt", 
          "updatedAt"
        FROM "tests"
        WHERE id = ${id}
      `;

      const updatedTest = Array.isArray(updatedTests) && updatedTests.length > 0 
        ? updatedTests[0] 
        : null;

      if (!updatedTest) {
        return res.status(404).json({ error: 'Teste não encontrado após atualização' });
      }

      return res.status(200).json(updatedTest);
    } catch (error) {
      console.error('Erro ao atualizar teste:', error);
      return res.status(500).json({ error: 'Erro ao atualizar teste' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se o teste existe
      const existingTests = await prisma.$queryRaw`
        SELECT id FROM "tests" WHERE id = ${id}
      `;

      if (!Array.isArray(existingTests) || existingTests.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Excluir o teste
      await prisma.$executeRaw`
        DELETE FROM "tests" WHERE id = ${id}
      `;

      return res.status(200).json({ success: true, message: 'Teste excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir teste:', error);
      return res.status(500).json({ error: 'Erro ao excluir teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
