import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';

// Schema para validação dos parâmetros de query
const querySchema = z.object({
  companyId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  console.log('[STUDENTS] Verificando sessão em training/students');
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    console.log('[STUDENTS] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[STUDENTS] Forçando reconexão do Prisma antes de acessar estudantes');
  await reconnectPrisma();

  // Verificar se o usuário é um administrador ou pertence à empresa
  console.log(`[STUDENTS] Buscando usuário com ID: ${session.user.id}`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true
    }
  });

  if (!user) {
    console.log('[STUDENTS] Erro: Usuário não encontrado');
    return res.status(404).json({ 
      success: false,
      error: 'Usuário não encontrado' 
    });
  }

  // Verificar se o usuário é um administrador ou pertence à empresa
  const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.COMPANY_ADMIN || user.role === Role.INSTRUCTOR;
  const companyId = user.companyId;

  if (!isAdmin || !companyId) {
    console.log('[STUDENTS] Acesso negado: Usuário não tem permissão');
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado' 
    });
  }

  // Tratar diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getStudents(req, res, isAdmin, companyId);
    case 'POST':
      return createStudent(req, res, isAdmin, companyId);
    default:
      return res.status(405).json({ 
        success: false,
        error: 'Método não permitido' 
      });
  }
}

// Função para listar estudantes
async function getStudents(
  req: NextApiRequest,
  res: NextApiResponse,
  isAdmin: boolean,
  userCompanyId: string | null
) {
  try {
    console.log(`[STUDENTS] Buscando estudantes para a empresa: ${userCompanyId}`);
    
    // Validar e extrair parâmetros de query
    const queryResult = querySchema.safeParse(req.query);
    if (!queryResult.success) {
      console.log('[STUDENTS] Erro: Parâmetros inválidos', queryResult.error.format());
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros inválidos', 
        details: queryResult.error.format() 
      });
    }

    const { companyId, search, page = 1, limit = 50 } = queryResult.data;

    // Verificar se o usuário tem acesso à empresa solicitada
    if (companyId && !isAdmin && companyId !== userCompanyId) {
      console.log('[STUDENTS] Acesso negado: Usuário não tem permissão para acessar esta empresa');
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado a esta empresa' 
      });
    }

    // Definir o ID da empresa a ser usado na consulta
    const targetCompanyId = companyId || userCompanyId;
    
    if (!targetCompanyId) {
      console.log('[STUDENTS] Erro: ID da empresa é obrigatório');
      return res.status(400).json({ 
        success: false,
        error: 'ID da empresa é obrigatório' 
      });
    }

    console.log(`[STUDENTS] Buscando estudantes para a empresa: ${targetCompanyId}`);

    // Calcular paginação
    const skip = (page - 1) * limit;

    // Construir a consulta para buscar estudantes usando Prisma
    const where: Prisma.StudentWhereInput = {
      companyId: targetCompanyId
    };

    // Adicionar condição de busca se fornecida
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Buscar estudantes
    const [students, totalStudents] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          courseEnrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          user: {
            name: 'asc'
          }
        },
        skip,
        take: limit
      }),
      prisma.student.count({ where })
    ]);

    console.log(`[STUDENTS] Encontrados ${totalStudents} estudantes`);

    // Formatar os resultados
    const formattedStudents = students.map(student => ({
      id: student.id,
      userId: student.userId,
      enrollmentDate: student.enrollmentDate,
      progress: student.progress,
      user: student.user,
      courseEnrollments: student.courseEnrollments.map(enrollment => ({
        id: enrollment.id,
        courseId: enrollment.courseId,
        enrollmentDate: enrollment.enrollmentDate,
        completionDate: enrollment.completionDate,
        progress: enrollment.progress,
        course: enrollment.course
      }))
    }));

    // Retornar dados com metadados de paginação
    console.log(`[STUDENTS] Retornando ${formattedStudents.length} estudantes`);
    return res.status(200).json({
      success: true,
      students: formattedStudents,
      pagination: {
        total: totalStudents,
        page,
        limit,
        totalPages: Math.ceil(totalStudents / limit),
      },
    });
  } catch (error) {
    console.error('[STUDENTS] Erro ao buscar estudantes:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar estudantes' 
    });
  }
}

// Função para criar um novo estudante
async function createStudent(
  req: NextApiRequest,
  res: NextApiResponse,
  isAdmin: boolean,
  userCompanyId: string | null
) {
  try {
    console.log('[STUDENTS] Criando novo estudante');
    const { name, email, courseIds } = req.body;

    // Validar campos obrigatórios
    if (!name || !email) {
      console.log('[STUDENTS] Erro: Campos obrigatórios ausentes');
      return res.status(400).json({ 
        success: false,
        error: 'Nome e email são obrigatórios' 
      });
    }

    // Verificar se o usuário já existe
    console.log(`[STUDENTS] Verificando se o email ${email} já existe`);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Verificar se o usuário já é um estudante
    let existingStudent = null;
    if (existingUser) {
      existingStudent = await prisma.student.findFirst({
        where: { userId: existingUser.id }
      });
    }

    if (existingUser) {
      // Se o usuário existe e já é um estudante
      if (existingStudent) {
        console.log(`[STUDENTS] Erro: Usuário ${email} já é um estudante`);
        return res.status(400).json({ 
          success: false,
          error: 'Este email já está registrado como estudante' 
        });
      }

      // Se o usuário existe mas não é um estudante, criar apenas o estudante
      console.log(`[STUDENTS] Usuário ${email} existe, mas não é estudante. Criando estudante.`);
      const student = await prisma.student.create({
        data: {
          userId: existingUser.id,
          companyId: userCompanyId as string,
          enrollmentDate: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Se courseIds foram fornecidos, matricular o estudante nos cursos
      if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
        console.log(`[STUDENTS] Matriculando estudante em ${courseIds.length} cursos`);
        const enrollments = await Promise.all(
          courseIds.map(courseId => 
            prisma.courseEnrollment.create({
              data: {
                studentId: student.id,
                courseId,
                enrollmentDate: new Date()
              }
            })
          )
        );

        console.log(`[STUDENTS] Estudante matriculado em ${enrollments.length} cursos`);
      }

      return res.status(201).json({
        success: true,
        student: {
          id: student.id,
          user: student.user
        }
      });
    }

    // Se o usuário não existe, criar usuário e estudante
    console.log(`[STUDENTS] Criando novo usuário e estudante para ${email}`);
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: Role.STUDENT,
          companyId: userCompanyId as string,
          // Senha temporária aleatória
          password: Math.random().toString(36).slice(-8)
        }
      });

      // Criar estudante
      const student = await tx.student.create({
        data: {
          userId: user.id,
          companyId: userCompanyId as string,
          enrollmentDate: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Matricular em cursos se fornecidos
      if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
        await Promise.all(
          courseIds.map(courseId => 
            tx.courseEnrollment.create({
              data: {
                studentId: student.id,
                courseId,
                enrollmentDate: new Date()
              }
            })
          )
        );
      }

      return student;
    });

    console.log(`[STUDENTS] Estudante criado com sucesso: ${result.id}`);
    return res.status(201).json({
      success: true,
      student: {
        id: result.id,
        user: result.user
      }
    });
  } catch (error) {
    console.error('[STUDENTS] Erro ao criar estudante:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao criar estudante' 
    });
  }
}
