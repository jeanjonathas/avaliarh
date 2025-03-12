import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { candidateId, stageId, responses, timeSpent } = req.body

      if (!candidateId || !responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ error: 'Dados inválidos' })
      }

      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: {
          id: candidateId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          completed: true,
          status: true,
          testId: true,
          timeSpent: true
        }
      })

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      console.log(`Recebidas ${responses.length} respostas para o candidato ${candidateId} (${candidate.name}) na etapa ${stageId}`);
      console.log(`Status atual do candidato: completed=${candidate.completed}, status=${candidate.status}`);
      
      // Atualizar o tempo total gasto pelo candidato
      if (timeSpent && typeof timeSpent === 'number') {
        const currentTimeSpent = candidate.timeSpent || 0;
        console.log(`Atualizando tempo gasto pelo candidato. Anterior: ${currentTimeSpent}s, Adicionando: ${timeSpent}s`);
        const updatedTimeSpent = currentTimeSpent + timeSpent;
        
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { 
            timeSpent: updatedTimeSpent 
          }
        });
        
        console.log(`Tempo total atualizado para ${updatedTimeSpent} segundos`);
      }
      
      // Salvar as respostas com snapshot das perguntas e opções
      const savedResponses = await Promise.all(
        responses.map(async (response: { questionId: string; optionId: string; timeSpent?: number }, index: number) => {
          console.log(`Processando resposta ${index + 1}/${responses.length}: questionId=${response.questionId}, optionId=${response.optionId}`);
          
          try {
            // Buscar a questão e a opção selecionada
            const question = await prisma.question.findUnique({
              where: { id: response.questionId },
              include: {
                options: true,
                Category: true
              }
            });

            if (!question) {
              console.error(`Questão não encontrada: ${response.questionId}`);
              return null;
            }

            // Verificar se a opção selecionada pertence à questão
            const selectedOption = question.options.find(opt => opt.id === response.optionId);
            if (!selectedOption) {
              console.error(`Opção não encontrada: ${response.optionId} para questão ${response.questionId}`);
              return null;
            }

            // Verificar se já existe uma resposta para esta questão e candidato
            const existingResponse = await prisma.response.findFirst({
              where: {
                candidateId,
                questionId: response.questionId
              }
            });

            // Buscar a etapa associada à questão
            const testQuestion = await prisma.testQuestion.findFirst({
              where: {
                questionId: response.questionId,
                testId: candidate.testId
              },
              include: {
                stage: true
              }
            });

            // Criar ou atualizar a resposta
            const responseData = {
              candidateId,
              questionId: response.questionId,
              optionId: response.optionId,
              stageId: stageId || testQuestion?.stageId || null,
              stageName: testQuestion?.stage?.title || null,
              isCorrectOption: selectedOption.isCorrect,
              optionText: selectedOption.text,
              questionText: question.text,
              categoryName: question.Category?.name || null,
              questionSnapshot: JSON.stringify(question),
              allOptionsSnapshot: JSON.stringify(question.options),
              timeSpent: response.timeSpent || null // Salvar o tempo gasto na resposta
            };

            if (existingResponse) {
              console.log(`Atualizando resposta existente: ${existingResponse.id}`);
              try {
                // Usar $executeRaw para atualizar a resposta existente
                // Isso contorna problemas de tipagem do Prisma Client
                const result = await prisma.$executeRaw`
                  UPDATE "Response"
                  SET 
                    "optionId" = ${response.optionId},
                    "questionText" = ${question.text},
                    "optionText" = ${selectedOption.text},
                    "isCorrectOption" = ${selectedOption.isCorrect},
                    "allOptionsSnapshot" = ${JSON.stringify(question.options)}::jsonb,
                    "questionSnapshot" = ${JSON.stringify(question)}::jsonb,
                    "categoryName" = ${question.Category?.name || null},
                    "stageName" = ${testQuestion?.stage?.title || null},
                    "stageId" = ${stageId || testQuestion?.stageId || null},
                    "timeSpent" = ${response.timeSpent || null},
                    "updatedAt" = NOW()
                  WHERE "id" = ${existingResponse.id}
                  RETURNING *;
                `;
                console.log(`Resposta atualizada com SQL raw: ${result}`);
                return existingResponse;
              } catch (error) {
                console.error('Erro ao atualizar resposta:', error);
                throw error;
              }
            } else {
              // Criar nova resposta com snapshot
              try {
                console.log(`Criando nova resposta para questão ${response.questionId}`);
                const newResponse = await prisma.response.create({
                  data: {
                    id: uuidv4(),
                    ...responseData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                });
                console.log(`Resposta criada com sucesso: ${newResponse.id}`);
                return newResponse;
              } catch (error) {
                console.error(`Erro ao criar resposta:`, error);
                // Tentar criar sem os campos adicionais em caso de erro
                if (error instanceof Prisma.PrismaClientValidationError) {
                  console.log('Tentando criar resposta apenas com campos básicos...');
                  
                  // Buscar a questão e a opção para obter os dados necessários
                  try {
                    const question = await prisma.question.findUnique({
                      where: { id: response.questionId },
                      include: { 
                        Category: true,
                        Stage: true,
                        options: true
                      }
                    });
                    
                    const selectedOption = await prisma.option.findUnique({
                      where: { id: response.optionId }
                    });
                    
                    if (!question || !selectedOption) {
                      console.error('Questão ou opção não encontrada');
                      return null;
                    }
                    
                    // Usar o Prisma.sql para criar a resposta diretamente no banco de dados
                    // Isso contorna problemas de tipagem do Prisma Client
                    const result = await prisma.$queryRaw`
                      INSERT INTO "Response" (
                        "id", 
                        "candidateId", 
                        "questionId", 
                        "optionId", 
                        "questionText", 
                        "optionText", 
                        "isCorrectOption", 
                        "stageName", 
                        "categoryName", 
                        "stageId",
                        "timeSpent",
                        "createdAt", 
                        "updatedAt"
                      ) 
                      VALUES (
                        ${uuidv4()}, 
                        ${candidateId}, 
                        ${response.questionId}, 
                        ${response.optionId}, 
                        ${question.text}, 
                        ${selectedOption.text}, 
                        ${selectedOption.isCorrect}, 
                        ${testQuestion?.stage?.title || null}, 
                        ${question.Category?.name || null}, 
                        ${stageId || testQuestion?.stageId || null},
                        ${response.timeSpent || null},
                        NOW(), 
                        NOW()
                      )
                      RETURNING *;
                    `;
                    
                    console.log('Resposta criada com SQL raw:', result);
                    return result[0];
                  } catch (innerError) {
                    console.error('Erro ao buscar dados para criar resposta:', innerError);
                    throw innerError;
                  }
                }
                throw error;
              }
            }
          } catch (error) {
            console.error('Erro ao processar resposta:', error);
            return null;
          }
        })
      )

      // Filtrar respostas nulas (caso alguma pergunta ou opção não tenha sido encontrada)
      const validResponses = savedResponses.filter(response => response !== null)

      console.log(`Salvas ${validResponses.length} respostas válidas de ${responses.length} recebidas`);
      
      // Verificar se todas as respostas da etapa foram respondidas
      if (stageId && validResponses.length > 0) {
        try {
          // Contar quantas questões existem nesta etapa
          const stageQuestions = await prisma.stageQuestion.count({
            where: {
              stageId: stageId
            }
          });
          
          // Contar quantas respostas o candidato já deu para questões desta etapa
          const answeredQuestions = await prisma.response.count({
            where: {
              candidateId: candidateId,
              questionId: {
                in: await prisma.stageQuestion.findMany({
                  where: { stageId: stageId },
                  select: { questionId: true }
                }).then(sq => sq.map(q => q.questionId))
              }
            }
          });
          
          console.log(`Etapa ${stageId}: ${answeredQuestions} de ${stageQuestions} questões respondidas`);
          
          // Se todas as questões da etapa foram respondidas, atualizar o progresso
          if (answeredQuestions >= stageQuestions) {
            console.log(`Todas as questões da etapa ${stageId} foram respondidas pelo candidato ${candidateId}`);
          }
        } catch (error) {
          console.error('Erro ao verificar progresso da etapa:', error);
          // Não interromper o fluxo se houver erro na verificação de progresso
        }
      }
      
      return res.status(201).json({ 
        success: true, 
        count: validResponses.length,
        candidateId: candidate.id,
        candidateName: candidate.name
      })
    } catch (error) {
      console.error('Erro ao salvar respostas:', error)
      // Retornar mais informações sobre o erro para facilitar o debug
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).json({ 
        error: 'Erro ao salvar respostas', 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
