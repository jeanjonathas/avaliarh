import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/globalcategories`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // GET - Listar todas as categorias globais
    if (req.method === 'GET') {
      // Buscar categorias globais com contagem de questões usando métodos nativos do Prisma
      const categories = await prisma.globalCategory.findMany({
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      // Formatar a resposta para manter compatibilidade com o frontend
      const formattedCategories = categories.map(category => ({
        ...category,
        questionsCount: category._count.questions
      }));

      return res.status(200).json(formattedCategories);
    }

    // POST - Criar uma nova categoria global
    if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
      }

      // Criar nova categoria global usando métodos nativos do Prisma
      const newCategory = await prisma.globalCategory.create({
        data: {
          name,
          description: description || null
        }
      });

      return res.status(201).json(newCategory);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de categorias globais:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
