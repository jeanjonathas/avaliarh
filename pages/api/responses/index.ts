import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { registerCandidateProgress } from '../../../lib/utils/candidate-progress'

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

      // Log detalhado das respostas recebidas
      console.log(`Recebidas ${responses.length} respostas para processamento:`)
      responses.forEach((response, index) => {
        console.log(`[${index + 1}/${responses.length}] questionId=${response.questionId}, optionId=${response.optionId}`)
      })

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
          companyId: true, // Adicionar o campo companyId
        }
      });

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      console.log(`Recebidas ${responses.length} respostas para o candidato ${candidateId} (${candidate.name}) na etapa ${stageId}`);
      console.log(`Status atual do candidato: completed=${candidate.completed}, status=${candidate.status}`);
      
      // Atualizar o tempo total gasto pelo candidato
      if (timeSpent && typeof timeSpent === 'number') {
        // Buscar o tempo atual diretamente do banco de dados
        const candidateWithTime = await prisma.$queryRaw`
          SELECT "timeSpent" FROM "Candidate" WHERE id = ${candidateId}
        ` as Array<{timeSpent: number | null}>;
        
        const currentTimeSpent = candidateWithTime[0]?.timeSpent || 0;
        console.log(`Atualizando tempo gasto pelo candidato. Anterior: ${currentTimeSpent}s, Adicionando: ${timeSpent}s`);
        const updatedTimeSpent = currentTimeSpent + timeSpent;
        
        // Usando uma query SQL direta para atualizar o timeSpent
        await prisma.$executeRaw`
          UPDATE "Candidate"
          SET "timeSpent" = ${updatedTimeSpent}
          WHERE id = ${candidateId}
        `;
        
        console.log(`Tempo total atualizado para ${updatedTimeSpent} segundos`);
      }
      
      // Salvar as respostas com snapshot das perguntas e opções
      const savedResponses = await Promise.all(
        responses.map(async (response: { questionId: string; optionId: string; timeSpent?: number, optionsOrder?: string[] }, index: number) => {
          console.log(`Processando resposta ${index + 1}/${responses.length}: questionId=${response.questionId}, optionId=${response.optionId}`);
          
          try {
            // Buscar a questão para obter mais informações
            const question = await prisma.question.findUnique({
              where: {
                id: response.questionId
              },
              include: {
                options: true,
                categories: true,
                stage: true
              }
            });

            if (!question) {
              console.error(`Questão não encontrada: ${response.questionId}`);
              return null;
            }

            // Buscar a opção selecionada
            const selectedOption = await prisma.option.findUnique({
              where: {
                id: response.optionId
              }
            });

            if (!selectedOption) {
              console.error(`Opção não encontrada: ${response.optionId} para questão ${response.questionId}`);
              return null;
            }

            // Buscar informações sobre o estágio
            const testQuestion = await prisma.question.findUnique({
              where: {
                id: response.questionId
              },
              include: {
                stage: true
              }
            });

            // Verificar se já existe uma resposta para esta questão e candidato
            const existingResponse = await prisma.response.findFirst({
              where: {
                candidateId,
                questionId: response.questionId
              }
            });

            // Verificar se a questão é do tipo opinativo
            const isOpinionQuestion = question.type?.includes('OPINION') || false;
            
            // Obter a característica/personalidade associada à opção selecionada (para questões opinativas)
            const optionCharacteristic = (selectedOption as any).characteristic || 
                                        (selectedOption as any).personality || 
                                        null;
            
            // Determinar a posição original da opção antes do embaralhamento (se disponível)
            const optionOriginalOrder = (selectedOption as any).originalPosition || 
                                       selectedOption.position || 
                                       null;
            
            // Capturar a ordem em que as opções foram apresentadas ao candidato
            const optionsOrder = (response as any).optionsOrder || 
                               question.options.map((o: any) => o.id) || 
                               null;
            
            // Criar ou atualizar a resposta
            const responseData = {
              candidateId,
              questionId: response.questionId,
              optionId: response.optionId,
              questionText: question.text,
              optionText: selectedOption.text,
              timeSpent: response.timeSpent || 0,
              companyId: candidate.companyId || question.companyId,
              // Para questões opinativas, todas as respostas são consideradas corretas
              isCorrect: isOpinionQuestion ? true : selectedOption.isCorrect,
              // Campos de snapshot
              questionSnapshot: question,
              stageId: stageId || testQuestion?.stageId || null,
              stageName: testQuestion?.stage?.title || null,
              categoryName: question.categories?.[0]?.name || null,
              // Campos específicos para questões opinativas
              optionCharacteristic,
              optionOriginalOrder,
              optionsOrder: optionsOrder ? JSON.stringify(optionsOrder) : null,
              questionType: question.type || 'MULTIPLE_CHOICE'
            };

            if (existingResponse) {
              console.log(`Atualizando resposta existente: ${existingResponse.id}`);
              try {
                // Preparar os dados para o JSON que será armazenado em allOptions
                const allOptionsData = {
                  options: question.options,
                  _questionSnapshot: JSON.stringify(question),
                  _allOptionsSnapshot: JSON.stringify(question.options),
                  _categoryName: question.categories?.[0]?.name || null,
                  _stageName: testQuestion?.stage?.title || null,
                  _stageId: stageId || testQuestion?.stageId || null
                };

                // Usar $executeRaw para atualizar a resposta existente
                // Isso contorna problemas de tipagem do Prisma Client
                const result = await prisma.$executeRaw`
                  UPDATE "Response"
                  SET 
                    "questionText" = ${question.text},
                    "optionText" = ${selectedOption.text},
                    "optionId" = ${response.optionId},
                    "timeSpent" = ${response.timeSpent || 0},
                    "companyId" = ${candidate.companyId || question.companyId}, 
                    "isCorrect" = ${isOpinionQuestion ? true : selectedOption.isCorrect},
                    "questionSnapshot" = ${JSON.stringify(question)}::jsonb,
                    "stageId" = ${stageId || testQuestion?.stageId || null},
                    "stageName" = ${testQuestion?.stage?.title || null},
                    "categoryName" = ${question.categories?.[0]?.name || null},
                    "optionCharacteristic" = ${optionCharacteristic},
                    "optionOriginalOrder" = ${optionOriginalOrder},
                    "optionsOrder" = ${optionsOrder ? JSON.stringify(optionsOrder) : null}::jsonb,
                    "questionType" = ${question.type || 'MULTIPLE_CHOICE'},
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
              // Criar objeto com os campos que existem no modelo Response
              const createData: any = {
                id: uuidv4(),
                candidateId: responseData.candidateId,
                questionId: responseData.questionId,
                optionId: responseData.optionId,
                questionText: responseData.questionText,
                optionText: responseData.optionText,
                timeSpent: responseData.timeSpent,
                companyId: responseData.companyId,
                isCorrect: responseData.isCorrect,
                questionSnapshot: responseData.questionSnapshot,
                stageId: responseData.stageId,
                stageName: responseData.stageName,
                categoryName: responseData.categoryName,
                optionCharacteristic: responseData.optionCharacteristic,
                optionOriginalOrder: responseData.optionOriginalOrder,
                optionsOrder: responseData.optionsOrder,
                questionType: responseData.questionType,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Definir allOptions separadamente para evitar erros de tipagem
              createData.allOptions = question.options;
              
              // Criar nova resposta com snapshot
              try {
                console.log(`Criando nova resposta para questão ${response.questionId}`);
                const newResponse = await prisma.response.create({
                  data: createData
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
                        categories: true,
                        stage: true,
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
                        "timeSpent",
                        "allOptions",
                        "companyId",
                        "isCorrect",
                        "questionSnapshot",
                        "stageId",
                        "stageName",
                        "categoryName",
                        "optionCharacteristic",
                        "optionOriginalOrder",
                        "optionsOrder",
                        "questionType",
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
                        ${response.timeSpent || 0},
                        ${JSON.stringify({
                          options: question.options,
                          _questionSnapshot: JSON.stringify(question),
                          _allOptionsSnapshot: JSON.stringify(question.options),
                          _categoryName: question.categories?.[0]?.name || null,
                          _stageName: testQuestion?.stage?.title || null,
                          _stageId: stageId || testQuestion?.stageId || null
                        })}::jsonb,
                        ${candidate.companyId || question.companyId}, 
                        ${isOpinionQuestion ? true : selectedOption.isCorrect},
                        ${JSON.stringify(question)}::jsonb,
                        ${stageId || testQuestion?.stageId || null},
                        ${testQuestion?.stage?.title || null},
                        ${question.categories?.[0]?.name || null},
                        ${optionCharacteristic},
                        ${optionOriginalOrder},
                        ${optionsOrder ? JSON.stringify(optionsOrder) : null}::jsonb,
                        ${question.type || 'MULTIPLE_CHOICE'},
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
      const validResponses = savedResponses.filter(response => response !== null);

      console.log(`Salvas ${validResponses.length} respostas válidas de ${responses.length} recebidas`);
      
      // Verificar se todas as respostas da etapa foram respondidas
      if (stageId && validResponses.length > 0) {
        try {
          // Contar quantas questões existem nesta etapa
          const stageQuestions = await prisma.question.count({
            where: {
              stageId: stageId
            }
          });
          
          // Contar quantas respostas o candidato já deu para questões desta etapa
          const answeredQuestions = await prisma.response.count({
            where: {
              candidateId: candidateId,
              questionId: {
                in: await prisma.question.findMany({
                  where: { stageId: stageId },
                  select: { id: true }
                }).then(questions => questions.map(q => q.id))
              }
            }
          });
          
          console.log(`Etapa ${stageId}: ${answeredQuestions} de ${stageQuestions} questões respondidas`);
          
          // Se todas as questões da etapa foram respondidas, atualizar o progresso
          if (answeredQuestions >= stageQuestions) {
            console.log(`Todas as questões da etapa ${stageId} foram respondidas pelo candidato ${candidateId}`);
            
            // Buscar informações sobre a etapa para obter o nome
            let stageName = '';
            try {
              const stage = await prisma.stage.findUnique({
                where: { id: stageId },
                select: { title: true }
              });
              
              if (stage) {
                stageName = stage.title || '';
              }
              
              // Usar a função utilitária para registrar o progresso do candidato
              const progressResult = await registerCandidateProgress(candidateId, stageId, stageName);
              
              if (!progressResult.success) {
                console.warn('Aviso ao registrar progresso:', progressResult.message);
                // Continuar mesmo com aviso para não bloquear o fluxo do candidato
              }
            } catch (progressError) {
              console.error('Erro ao registrar progresso:', progressError);
            }
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
        candidateName: candidate.name,
      });
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      // Retornar mais informações sobre o erro para facilitar o debug
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).json({ 
        error: 'Erro ao salvar respostas', 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
