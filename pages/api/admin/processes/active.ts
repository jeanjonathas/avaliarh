import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { prisma } from '../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação usando o middleware centralizado
  const token = await getToken({ req })
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return res.status(403).json({ error: 'Permissão negada' })
  }

  if (req.method === 'GET') {
    try {
      // Obter o ID da empresa do token
      const companyId = token.companyId as string

      // Verificar se companyId existe
      if (!companyId) {
        return res.status(400).json({ error: 'ID da empresa não encontrado' });
      }

      // Buscar processos seletivos ativos
      const activeProcesses = await prisma.selectionProcess.findMany({
        where: {
          companyId: companyId
        },
        select: {
          id: true,
          name: true,
          jobPosition: true,
          description: true,
          vacancyCount: true,
          registrationStart: true,
          registrationEnd: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              candidates: true
            }
          },
          candidates: {
            select: {
              id: true,
              status: true,
              completed: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 5 // Limitar a 5 processos mais recentes
      })

      // Transformar os dados para o formato esperado pelo frontend
      const formattedProcesses = activeProcesses.map(process => {
        // Calcular o progresso com base nos candidatos que completaram o processo
        const totalCandidates = process._count.candidates
        const completedCandidates = process.candidates.filter(c => c.completed).length
        const progress = totalCandidates > 0 
          ? Math.round((completedCandidates / totalCandidates) * 100) 
          : 0

        // Verificar se o processo está ativo com base nas datas de registro
        const now = new Date()
        const isActive = process.registrationEnd 
          ? new Date(process.registrationEnd) >= now 
          : true

        return {
          id: process.id,
          title: process.name,
          position: process.jobPosition,
          status: isActive ? 'ACTIVE' : 'COMPLETED',
          candidateCount: totalCandidates,
          startDate: process.registrationStart 
            ? process.registrationStart.toISOString().split('T')[0] 
            : process.createdAt.toISOString().split('T')[0],
          endDate: process.registrationEnd 
            ? process.registrationEnd.toISOString().split('T')[0] 
            : null,
          progress: progress
        }
      })

      return res.status(200).json(formattedProcesses)
    } catch (error) {
      console.error('Erro ao buscar processos seletivos ativos:', error)
      return res.status(500).json({ error: 'Erro ao buscar processos seletivos ativos' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
