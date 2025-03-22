import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação
  const session = await getSession({ req })
  
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' })
  }
  
  // Verificar se o usuário é um administrador
  const user = await prisma.$queryRaw`
    SELECT role FROM "User" WHERE email = ${session.user?.email}
  `
  
  if (!user || !Array.isArray(user) || user.length === 0 || user[0].role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado' })
  }
  
  // Obter parâmetros de filtro
  const { startDate, endDate } = req.query
  
  // Validar datas
  const startDateFilter = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 3))
  const endDateFilter = endDate ? new Date(endDate as string) : new Date()
  
  try {
    // Buscar cursos
    const courses = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        created_at
      FROM "Course"
      WHERE created_at BETWEEN ${startDateFilter} AND ${endDateFilter}
      ORDER BY created_at DESC
    `
    
    // Buscar estatísticas de matrícula
    const enrollmentStats = await prisma.$queryRaw`
      SELECT 
        c.id as "courseId",
        COUNT(DISTINCT e.student_id) as count,
        AVG(e.progress) as avg_progress
      FROM "Course" c
      LEFT JOIN "Enrollment" e ON c.id = e.course_id
      WHERE c.created_at BETWEEN ${startDateFilter} AND ${endDateFilter}
      GROUP BY c.id
    `
    
    // Buscar estatísticas de acesso
    const accessStats = await prisma.$queryRaw`
      SELECT 
        c.id as "courseId",
        COUNT(a.id) as access_count,
        SUM(a.time_spent) as total_time_spent
      FROM "Course" c
      LEFT JOIN "CourseAccess" a ON c.id = a.course_id
      WHERE a.access_date BETWEEN ${startDateFilter} AND ${endDateFilter}
      GROUP BY c.id
    `
    
    // Buscar progresso dos alunos
    const studentProgress = await prisma.$queryRaw`
      SELECT 
        s.id,
        s.user_id as "userId",
        u.name,
        AVG(e.progress) as avg_progress,
        COUNT(DISTINCT e.course_id) as enrolled_courses
      FROM "Student" s
      JOIN "User" u ON s.user_id = u.id
      LEFT JOIN "Enrollment" e ON s.id = e.student_id
      WHERE e.enrollment_date BETWEEN ${startDateFilter} AND ${endDateFilter}
      GROUP BY s.id, s.user_id, u.name
      ORDER BY AVG(e.progress) DESC
      LIMIT 10
    `
    
    // Retornar todos os dados
    return res.status(200).json({
      courses,
      enrollmentStats,
      accessStats,
      studentProgress
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return res.status(500).json({ message: 'Erro ao buscar estatísticas', error })
  }
}
