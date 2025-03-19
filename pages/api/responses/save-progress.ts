import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * API para salvar o progresso parcial de respostas de candidatos
 * Similar ao endpoint /api/responses, mas específico para salvamento de progresso
 * Não marca a etapa como concluída
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { candidateId, stageId, responses, timeSpent } = req.body;

    if (!candidateId || !stageId || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    console.log(`Salvando progresso para candidato ${candidateId} na etapa ${stageId}`);
    console.log(`Total de respostas: ${responses.length}`);

    // Buscar o candidato
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        testId: true,
        companyId: true,
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }

    // Buscar a etapa
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        TestStage: {
          where: { testId: candidate.testId },
        }
      }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Etapa não encontrada' });
    }

    // Processar cada resposta
    const savedResponses = await Promise.all(
      responses.map(async (response: { questionId: string; optionId: string; timeSpent?: number, optionsOrder?: string[] }) => {
        console.log(`Processando resposta: questionId=${response.questionId}, optionId=${response.optionId}`);
        
        try {
          // Buscar a questão diretamente com sua relação com a etapa
          const questionWithStage = await prisma.question.findUnique({
            where: { id: response.questionId },
            include: {
              stage: true,
              options: true,
              categories: true
            }
          });

          if (!questionWithStage) {
            console.error(`Questão ${response.questionId} não encontrada`);
            return null;
          }

          // Buscar a opção selecionada
          const selectedOption = questionWithStage.options.find(
            option => option.id === response.optionId
          );

          if (!selectedOption) {
            console.error(`Opção ${response.optionId} não encontrada para a questão ${response.questionId}`);
            return null;
          }

          // Buscar o TestStage para obter informações da etapa
          const testStage = questionWithStage.stageId ? await prisma.testStage.findFirst({
            where: {
              testId: candidate.testId,
              stageId: questionWithStage.stageId,
            },
            include: {
              stage: true,
            }
          }) : null;

          // Verificar se já existe uma resposta para esta questão
          const existingResponse = await prisma.response.findUnique({
            where: {
              candidateId_questionId: {
                candidateId,
                questionId: response.questionId,
              }
            }
          });

          // Verificar se a questão é do tipo opinativo
          const isOpinionQuestion = questionWithStage.type?.includes('OPINION') || false;
          
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
                             questionWithStage.options.map((o: any) => o.id) || 
                             null;
          
          // Criar ou atualizar a resposta
          const responseData = {
            candidateId,
            questionId: response.questionId,
            optionId: response.optionId,
            questionText: questionWithStage.text,
            optionText: selectedOption.text,
            timeSpent: response.timeSpent || 0,
            companyId: candidate.companyId || questionWithStage.companyId,
            // Para questões opinativas, todas as respostas são consideradas corretas
            isCorrect: isOpinionQuestion ? true : selectedOption.isCorrect,
            // Campos de snapshot
            questionSnapshot: questionWithStage,
            stageId: stageId || testStage?.stageId || null,
            stageName: testStage?.stage?.title || null,
            categoryName: questionWithStage.categories?.[0]?.name || null,
            // Campos específicos para questões opinativas
            optionCharacteristic,
            optionOriginalOrder,
            optionsOrder: optionsOrder ? JSON.stringify(optionsOrder) : null,
            questionType: questionWithStage.type || 'MULTIPLE_CHOICE'
          };

          if (existingResponse) {
            console.log(`Atualizando resposta existente: ${existingResponse.id}`);
            try {
              // Preparar os dados para o JSON que será armazenado em allOptions
              const allOptionsData = {
                options: questionWithStage.options,
                _questionSnapshot: JSON.stringify(questionWithStage),
                _allOptionsSnapshot: JSON.stringify(questionWithStage.options),
                _categoryName: questionWithStage.categories?.[0]?.name || null,
                _stageName: testStage?.stage?.title || null,
                _stageId: stageId || testStage?.stageId || null
              };

              // Usar $executeRaw para atualizar a resposta existente
              const result = await prisma.$executeRaw`
                UPDATE "Response"
                SET 
                  "questionText" = ${questionWithStage.text},
                  "optionText" = ${selectedOption.text},
                  "optionId" = ${response.optionId},
                  "timeSpent" = ${response.timeSpent || 0},
                  "companyId" = ${candidate.companyId || questionWithStage.companyId}, 
                  "isCorrect" = ${isOpinionQuestion ? true : selectedOption.isCorrect},
                  "questionSnapshot" = ${JSON.stringify(questionWithStage)}::jsonb,
                  "stageId" = ${stageId || testStage?.stageId || null},
                  "stageName" = ${testStage?.stage?.title || null},
                  "categoryName" = ${questionWithStage.categories?.[0]?.name || null},
                  "optionCharacteristic" = ${optionCharacteristic},
                  "optionOriginalOrder" = ${optionOriginalOrder},
                  "optionsOrder" = ${optionsOrder ? JSON.stringify(optionsOrder) : null}::jsonb,
                  "questionType" = ${questionWithStage.type || 'MULTIPLE_CHOICE'},
                  "updatedAt" = NOW()
                WHERE "id" = ${existingResponse.id}
                RETURNING *;
              `;
              console.log(`Resposta atualizada com sucesso: ${existingResponse.id}`);
              return existingResponse;
            } catch (error) {
              console.error('Erro ao atualizar resposta existente:', error);
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
            createData.allOptions = questionWithStage.options;
            
            // Criar nova resposta com snapshot
            try {
              console.log(`Criando nova resposta para questão ${response.questionId}`);
              const newResponse = await prisma.response.create({
                data: createData
              });
              console.log(`Resposta criada com sucesso: ${newResponse.id}`);
              return newResponse;
            } catch (error) {
              console.error('Erro ao criar nova resposta:', error);
              
              // Tentar criar com SQL raw como fallback
              console.log('Tentando criar resposta com SQL raw...');
              
              try {
                // Usar SQL raw diretamente para inserir a resposta
                const rawResult = await prisma.$executeRaw`
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
                    ${questionWithStage.text}, 
                    ${selectedOption.text}, 
                    ${response.timeSpent || 0},
                    ${JSON.stringify({
                      options: questionWithStage.options,
                      _questionSnapshot: JSON.stringify(questionWithStage),
                      _allOptionsSnapshot: JSON.stringify(questionWithStage.options),
                      _categoryName: questionWithStage.categories?.[0]?.name || null,
                      _stageName: testStage?.stage?.title || null,
                      _stageId: stageId || testStage?.stageId || null
                    })}::jsonb,
                    ${candidate.companyId || questionWithStage.companyId}, 
                    ${isOpinionQuestion ? true : selectedOption.isCorrect},
                    ${JSON.stringify(questionWithStage)}::jsonb,
                    ${stageId || testStage?.stageId || null},
                    ${testStage?.stage?.title || null},
                    ${questionWithStage.categories?.[0]?.name || null},
                    ${optionCharacteristic},
                    ${optionOriginalOrder},
                    ${optionsOrder ? JSON.stringify(optionsOrder) : null}::jsonb,
                    ${questionWithStage.type || 'MULTIPLE_CHOICE'},
                    NOW(), 
                    NOW()
                  )
                  RETURNING *;
                `;
                console.log('Resposta criada com sucesso via SQL raw');
                return { id: uuidv4(), success: true };
              } catch (rawError) {
                console.error('Erro ao criar resposta via SQL raw:', rawError);
                throw rawError;
              }
            }
          }
        } catch (error) {
          console.error(`Erro ao processar resposta para questão ${response.questionId}:`, error);
          return null;
        }
      })
    );

    // Filtrar respostas nulas (que falharam)
    const validResponses = savedResponses.filter(r => r !== null);
    
    console.log(`Progresso salvo com sucesso. ${validResponses.length}/${responses.length} respostas processadas.`);
    
    // Atualizar o tempo gasto pelo candidato
    if (timeSpent) {
      try {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { timeSpent: timeSpent }
        });
        console.log(`Tempo gasto atualizado para o candidato ${candidateId}: ${timeSpent} segundos`);
      } catch (error) {
        console.error('Erro ao atualizar tempo gasto pelo candidato:', error);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Progresso salvo com sucesso',
      savedResponses: validResponses.length,
      totalResponses: responses.length
    });
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
