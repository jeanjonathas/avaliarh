import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

const prisma = new PrismaClient()

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
      const test = await prisma.test.findUnique({
        where: { id },
        include: {
          testSections: {
            include: {
              section: {
                include: {
                  questionSections: {
                    include: {
                      question: {
                        include: {
                          options: true,
                          categories: true
                        }
                      }
                    },
                    orderBy: {
                      order: 'asc'
                    }
                  }
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      })

      if (!test) {
        return res.status(404).json({ error: 'Teste não encontrado' })
      }

      return res.status(200).json(test)
    } catch (error) {
      console.error('Erro ao buscar teste:', error)
      return res.status(500).json({ error: 'Erro ao buscar teste' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { title, description, timeLimit, active } = req.body

      if (!title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' })
      }

      // Atualizar o teste
      const updatedTest = await prisma.test.update({
        where: { id },
        data: {
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          active: active ?? true,
        },
      })

      return res.status(200).json(updatedTest)
    } catch (error) {
      console.error('Erro ao atualizar teste:', error)
      return res.status(500).json({ error: 'Erro ao atualizar teste' })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { active } = req.body

      if (active === undefined) {
        return res.status(400).json({ error: 'Campo active é obrigatório' })
      }

      // Atualizar apenas o campo active do teste
      const updatedTest = await prisma.test.update({
        where: { id },
        data: { active },
      })

      return res.status(200).json(updatedTest)
    } catch (error) {
      console.error('Erro ao atualizar status do teste:', error)
      return res.status(500).json({ error: 'Erro ao atualizar status do teste' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se existem resultados de testes associados
      const testResults = await prisma.testResult.findMany({
        where: { testId: id },
      })

      if (testResults.length > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir este teste pois existem resultados associados a ele.' 
        })
      }

      // Excluir as relações do teste com seções (testSections)
      await prisma.testSection.deleteMany({
        where: { testId: id },
      })

      // Excluir o teste
      await prisma.test.delete({
        where: { id },
      })

      return res.status(200).json({ message: 'Teste excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir teste:', error)
      return res.status(500).json({ error: 'Erro ao excluir teste' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
