import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { PrismaClient, Candidate, Response } from '@prisma/client'

// Função auxiliar para converter BigInt para Number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToNumber(obj[key]);
    }
    return result;
  }

  return obj;
}

// Definir tipos personalizados para as respostas com relacionamentos incluídos
type ResponseWithRelations = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  timeSpent: number;
  candidateId: string;
  questionId: string;
  optionId: string;
  questionText: string;
  optionText: string;
  isCorrectOption: boolean;
  stageId?: string;
  stageName?: string;
  categoryId?: string;
  categoryName?: string;
  question?: {
    text: string;
    stageId: string;
    categoryId: string;
    Stage?: {
      id: string;
      title: string;
    };
    Category?: {
      id: string;
      name: string;
    };
  };
  option?: {
    text: string;
    isCorrect: boolean;
  };
};

// Tipo para o resultado processado
type ProcessedResponse = {
  id: string;
  candidateId: string;
  questionId: string;
  optionId: string;
  questionText: string;
  optionText: string;
  isCorrectOption: boolean;
  stageId: string;
  stageName: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
  timeSpent: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // GET - Buscar candidato por ID
    if (req.method === 'GET') {
      // Buscar o candidato básico
      const candidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }
      
      // Buscar as respostas do candidato com informações completas
      const responses = await prisma.response.findMany({
        where: { candidateId: id },
        include: {
          question: {
            include: {
              Stage: true,
              Category: true
            }
          },
          option: true
        }
      }) as unknown as ResponseWithRelations[];
      
      // Mapear as respostas para incluir informações da etapa e categoria
      const processedResponses: ProcessedResponse[] = responses.map(response => ({
        id: response.id,
        candidateId: response.candidateId,
        questionId: response.questionId,
        optionId: response.optionId,
        questionText: response.questionText || response.question?.text || '',
        optionText: response.optionText || response.option?.text || '',
        isCorrectOption: response.isCorrectOption || response.option?.isCorrect || false,
        stageId: response.question?.stageId || response.stageId || '',
        stageName: response.question?.Stage?.title || response.stageName || '',
        categoryId: response.question?.categoryId || '',
        categoryName: response.question?.Category?.name || '',
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        timeSpent: response.timeSpent || 0
      }));
      
      // Verificar se o candidato completou o teste com base nas respostas
      let candidateCompleted = candidate.completed;
      let candidateStatus = candidate.status;
      if (processedResponses.length > 0 && (!candidate.completed || candidate.status === 'PENDING')) {
        // Se há respostas mas o candidato não está marcado como completo ou está como PENDING, atualizamos
        candidateCompleted = true;
        candidateStatus = 'APPROVED';
        await prisma.candidate.update({
          where: { id },
          data: { 
            completed: true,
            status: 'APPROVED'
          }
        });
        console.log(`Candidato ${id} marcado como completo e aprovado com base nas respostas.`);
      }
      
      // Buscar o teste associado ao candidato
      const test = candidate.testId 
        ? await prisma.tests.findUnique({ 
            where: { id: candidate.testId },
            include: {
              TestStage: {
                include: {
                  stage: true
                }
              }
            }
          })
        : null;
      
      // Obter os IDs das etapas que pertencem ao teste do candidato
      const testStageIds = test?.TestStage?.map(ts => ts.stageId) || [];
      
      // Calcular pontuações por etapa
      const stageScores = [];
      const stageMap = new Map();
      
      // Processar respostas para calcular pontuações por etapa
      for (const response of processedResponses) {
        // Verificar se a etapa pertence ao teste do candidato
        if (response.stageId && response.stageName && testStageIds.includes(response.stageId)) {
          const stageId = response.stageId;
          const stageName = response.stageName;
          
          if (!stageMap.has(stageId)) {
            stageMap.set(stageId, {
              id: stageId,
              name: stageName,
              correct: 0,
              total: 0
            });
          }
          
          const stageData = stageMap.get(stageId);
          stageData.total += 1;
          
          if (response.isCorrectOption) {
            stageData.correct += 1;
          }
        }
      }
      
      // Obter a ordem das etapas do teste
      const stageOrder = {};
      if (test && test.TestStage) {
        test.TestStage.forEach((ts, index) => {
          stageOrder[ts.stageId] = index;
        });
      }
      
      // Converter o mapa em array e calcular percentual para cada etapa
      stageMap.forEach(value => {
        // Calcular o percentual de acertos para esta etapa
        const percentage = value.total > 0 ? parseFloat((value.correct / value.total * 100).toFixed(1)) : 0;
        
        // Adicionar o percentual ao objeto da etapa
        stageScores.push({
          ...value,
          percentage,
          order: stageOrder[value.id] || 999 // Usar 999 como valor padrão para etapas sem ordem definida
        });
      });
      
      // Ordenar as etapas conforme a ordem definida no teste
      stageScores.sort((a, b) => a.order - b.order);
      
      // Calcular a pontuação total
      let totalScore = 0;
      if (stageScores.length > 0) {
        const totalCorrect = stageScores.reduce((acc, stage) => acc + stage.correct, 0);
        const totalQuestions = stageScores.reduce((acc, stage) => acc + stage.total, 0);
        totalScore = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
      } else if (candidate && 'score' in candidate && candidate.score !== undefined && candidate.score !== null) {
        // Se não temos stageScores mas temos um score armazenado, usamos ele
        const candidateScore = Number(candidate.score);
        totalScore = candidateScore > 1 ? parseFloat(candidateScore.toFixed(1)) : parseFloat((candidateScore * 100).toFixed(1));
      }
      
      // Formatar datas para evitar problemas de serialização
      const formattedCandidate: any = {
        ...candidate,
        testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
        interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
        inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
        createdAt: candidate.createdAt ? candidate.createdAt.toISOString() : null,
        updatedAt: candidate.updatedAt ? candidate.updatedAt.toISOString() : null,
      };
      
      // Garantir que todas as respostas tenham os campos necessários
      if (candidate) {
        const formattedResponses = processedResponses.map(response => {
          // Formatar datas para evitar problemas de serialização
          return {
            ...response,
            createdAt: response.createdAt ? response.createdAt.toISOString() : null,
            updatedAt: response.updatedAt ? response.updatedAt.toISOString() : null
          };
        });
        
        // Adicionar respostas e teste ao formattedCandidate
        formattedCandidate.responses = formattedResponses;
        
        formattedCandidate.test = test ? {
          id: test.id,
          title: test.title,
          description: test.description,
          TestStage: test.TestStage.map(ts => ({
            stageId: ts.stageId,
            stage: {
              id: ts.stage.id,
              title: ts.stage.title
            }
          })),
          createdAt: test.createdAt.toISOString(),
          updatedAt: test.updatedAt.toISOString()
        } : null;
        formattedCandidate.stageScores = stageScores;
        formattedCandidate.score = totalScore; // Adicionar o score para compatibilidade com código existente
        formattedCandidate.totalScore = totalScore; // Adicionar o totalScore para o novo código
        formattedCandidate.completed = candidateCompleted;
        formattedCandidate.status = candidateStatus; // Usar o status atualizado
        
        return res.status(200).json({ 
          candidate: convertBigIntToNumber(formattedCandidate)
        });
      }
    }
    
    // PUT - Atualizar candidato
    if (req.method === 'PUT') {
      const { 
        name, 
        email, 
        phone, 
        position, 
        observations,
        status,
        rating,
        testDate,
        interviewDate,
        inviteCode,
        inviteExpires,
        instagram,
        showResults,
        score
      } = req.body;
      
      // Verificar se o candidato existe
      const existingCandidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }
      
      // Atualizar candidato usando uma abordagem segura com Prisma
      try {
        // Primeiro, atualize os campos padrão usando o Prisma
        const updatedCandidate = await prisma.candidate.update({
          where: { id },
          data: {
            name: name || undefined,
            email: email || undefined,
            phone: phone !== undefined ? phone : undefined,
            position: position !== undefined ? position : undefined,
            observations: observations !== undefined ? observations : undefined,
            status: status || undefined,
            rating: rating !== undefined ? Number(rating) : undefined,
            testDate: testDate ? new Date(testDate) : undefined,
            interviewDate: interviewDate ? new Date(interviewDate) : undefined,
            inviteCode: inviteCode !== undefined ? inviteCode : undefined,
            inviteExpires: inviteExpires ? new Date(inviteExpires) : undefined
          }
        });
        
        // Agora, se os campos instagram, showResults ou score foram fornecidos,
        // atualize-os usando SQL raw para evitar problemas de tipo
        if (instagram !== undefined || showResults !== undefined || score !== undefined) {
          // Construir a consulta SQL dinamicamente
          let query = 'UPDATE "Candidate" SET ';
          const queryParams: any[] = [];
          let paramIndex = 1;
          
          if (instagram !== undefined) {
            query += `instagram = $${paramIndex}, `;
            queryParams.push(instagram);
            paramIndex++;
          }
          
          if (showResults !== undefined) {
            query += `"showResults" = $${paramIndex}, `;
            queryParams.push(showResults);
            paramIndex++;
          }
          
          if (score !== undefined) {
            query += `score = $${paramIndex}, `;
            queryParams.push(Number(score));
            paramIndex++;
          }
          
          // Adicionar a atualização do updatedAt
          query += `"updatedAt" = NOW() WHERE id = $${paramIndex} RETURNING *`;
          queryParams.push(id);
          
          // Executar a consulta
          const rawResult = await prisma.$queryRawUnsafe(query, ...queryParams);
          
          // Se houver resultado, use-o; caso contrário, use o resultado da atualização anterior
          if (Array.isArray(rawResult) && rawResult.length > 0) {
            const updatedCandidateRaw = rawResult[0];
            
            // Formatar datas para evitar problemas de serialização
            const formattedCandidate: any = {
              ...updatedCandidateRaw,
              testDate: updatedCandidateRaw.testDate ? updatedCandidateRaw.testDate.toISOString() : null,
              interviewDate: updatedCandidateRaw.interviewDate ? updatedCandidateRaw.interviewDate.toISOString() : null,
              inviteExpires: updatedCandidateRaw.inviteExpires ? updatedCandidateRaw.inviteExpires.toISOString() : null,
              createdAt: updatedCandidateRaw.createdAt ? updatedCandidateRaw.createdAt.toISOString() : null,
              updatedAt: updatedCandidateRaw.updatedAt ? updatedCandidateRaw.updatedAt.toISOString() : null
            };
            
            return res.status(200).json({ 
              candidate: convertBigIntToNumber(formattedCandidate)
            });
          }
        }
        
        // Se não houve atualização via SQL raw ou se ela não retornou resultados,
        // use o resultado da atualização via Prisma
        const formattedCandidate: any = {
          ...updatedCandidate,
          testDate: updatedCandidate.testDate ? updatedCandidate.testDate.toISOString() : null,
          interviewDate: updatedCandidate.interviewDate ? updatedCandidate.interviewDate.toISOString() : null,
          inviteExpires: updatedCandidate.inviteExpires ? updatedCandidate.inviteExpires.toISOString() : null,
          createdAt: updatedCandidate.createdAt ? updatedCandidate.createdAt.toISOString() : null,
          updatedAt: updatedCandidate.updatedAt ? updatedCandidate.updatedAt.toISOString() : null
        };
        
        return res.status(200).json({ 
          candidate: convertBigIntToNumber(formattedCandidate)
        });
      } catch (updateError) {
        console.error('Erro ao atualizar candidato:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar candidato', details: updateError.message });
      }
    }
    
    // DELETE - Excluir candidato
    if (req.method === 'DELETE') {
      // Verificar se o candidato existe
      const existingCandidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }
      
      // Excluir respostas do candidato primeiro para evitar violação de chave estrangeira
      await prisma.response.deleteMany({
        where: { candidateId: id }
      });
      
      // Excluir o candidato
      await prisma.candidate.delete({
        where: { id }
      });
      
      return res.status(200).json({ 
        success: true,
        message: 'Candidato excluído com sucesso'
      });
    }
    
    // Método não suportado
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de candidatos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}