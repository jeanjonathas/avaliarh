import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/categories`);
    
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
      console.log(`[CATEGORY] Iniciando busca de categorias (${new Date().toISOString()})`);
      
      // Forçar desconexão e reconexão para garantir dados frescos
      await reconnectPrisma();
      
      // Buscar categorias com contagem de questões usando métodos nativos do Prisma
      const categories = await prisma.category.findMany({
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

      console.log(`[CATEGORY] Encontradas ${categories.length} categorias`);

      // Formatar a resposta para manter compatibilidade com o frontend
      const formattedCategories = categories.map(category => ({
        ...category,
        questionsCount: category._count.questions
      }));

      // Desconectar Prisma após a consulta
      console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
      await prisma.$disconnect();
      
      return res.status(200).json(formattedCategories);
    }

    // POST - Criar uma nova categoria global
    if (req.method === 'POST') {
      const { name, description } = req.body;

      // Validar dados
      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      // Verificar se já existe uma categoria com o mesmo nome
      const existingCategory = await prisma.category.findFirst({
        where: {
          name
        }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Já existe uma categoria com este nome' });
      }

      // Criar categoria
      const newCategory = await prisma.category.create({
        data: {
          name,
          description: description || ''
        }
      });

      return res.status(201).json(newCategory);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro ao processar requisição de categorias:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
