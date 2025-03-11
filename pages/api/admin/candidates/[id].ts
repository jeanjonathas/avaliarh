import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

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

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de candidato inválido' })
  }

  if (req.method === 'GET') {
    try {
      console.log(`Buscando candidato com ID: ${id}`);
      
      // Buscar o candidato com informações do teste associado e snapshots das respostas
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: {
          responses: {
            include: {
              option: true,
              question: {
                include: {
                  Stage: true,
                  Category: true
                }
              }
            }
          }
        }
      });
      
      // Verificar se o candidato tem respostas
      if (candidate) {
        console.log('Verificando respostas do candidato:', candidate.id);
        console.log('Respostas iniciais:', candidate.responses ? candidate.responses.length : 0);
        
        // Buscar respostas diretamente independentemente se já foram encontradas ou não
        // Isso garante que tenhamos todas as respostas disponíveis
        const responses = await prisma.response.findMany({
          where: { candidateId: id },
          include: {
            option: true,
            question: {
              include: {
                Stage: true,
                Category: true
              }
            }
          }
        });
        
        console.log(`Encontradas ${responses.length} respostas diretamente para o candidato ${id}`);
        
        if (responses.length > 0) {
          // Atualizar o objeto do candidato com as respostas encontradas
          candidate.responses = responses;
          console.log('Respostas atualizadas no objeto do candidato');
        }
      }
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }
      
      console.log(`Candidato encontrado: ${candidate.name}, testId: ${candidate.testId}`);
      console.log(`Status de conclusão do teste: ${candidate.completed}`);
      console.log(`Quantidade de respostas: ${candidate.responses ? candidate.responses.length : 'nenhuma'}`);
      
      if (candidate.responses && candidate.responses.length > 0) {
        console.log(`Encontradas ${candidate.responses.length} respostas para o candidato`);
        
        // Mostrar todas as respostas encontradas
        console.log(`Detalhando todas as ${candidate.responses.length} respostas:`);
        candidate.responses.forEach((response: any, index) => {
          console.log(`Resposta ${index + 1}:`);
          console.log(`- ID: ${response.id}`);
          
          // Acessar os textos da questão e opção de várias formas possíveis
          let questionText = 'N/A';
          let optionText = 'N/A';
          let stageName = 'N/A';
          
          // Tentar obter o texto da questão
          if (response.questionText) {
            questionText = response.questionText;
          } else if (response.question && response.question.text) {
            questionText = response.question.text;
          }
          
          // Tentar obter o texto da opção
          if (response.optionText) {
            optionText = response.optionText;
          } else if (response.option && response.option.text) {
            optionText = response.option.text;
          }
          
          // Tentar obter o nome da etapa
          if (response.stageName) {
            stageName = response.stageName;
          } else if (response.question && response.question.Stage && response.question.Stage.title) {
            stageName = response.question.Stage.title;
          }
          
          console.log(`- Texto da questão: ${questionText}`);
          console.log(`- Texto da opção: ${optionText}`);
          console.log(`- Nome da etapa: ${stageName}`);
          
          // Verificar se temos snapshots
          const hasQuestionSnapshot = !!(response.questionSnapshot);
          const hasOptionsSnapshot = !!(response.allOptionsSnapshot);
          
          console.log(`- Tem questionSnapshot: ${hasQuestionSnapshot}`);
          console.log(`- Tipo do questionSnapshot: ${hasQuestionSnapshot ? typeof response.questionSnapshot : 'N/A'}`);
          console.log(`- Tem allOptionsSnapshot: ${hasOptionsSnapshot}`);
          console.log(`- Tipo do allOptionsSnapshot: ${hasOptionsSnapshot ? typeof response.allOptionsSnapshot : 'N/A'}`);
          
          // Tentar parsear os snapshots se forem strings
          if (hasQuestionSnapshot && typeof response.questionSnapshot === 'string') {
            try {
              const parsed = JSON.parse(response.questionSnapshot);
              console.log(`- questionSnapshot parseado: ${JSON.stringify(parsed).substring(0, 100)}...`);
            } catch (e: any) {
              console.error(`- Erro ao parsear questionSnapshot: ${e.message}`);
            }
          }
          
          if (hasOptionsSnapshot && typeof response.allOptionsSnapshot === 'string') {
            try {
              const parsed = JSON.parse(response.allOptionsSnapshot);
              console.log(`- allOptionsSnapshot parseado: ${JSON.stringify(parsed).substring(0, 100)}...`);
            } catch (e: any) {
              console.error(`- Erro ao parsear allOptionsSnapshot: ${e.message}`);
            }
          }
        });
      } else {
        console.log('Nenhuma resposta encontrada para este candidato');
      }
      
      let stageScores = [];
      let totalScore = 0;
      
      // Se o candidato completou o teste e tem respostas
      if (candidate.completed && candidate.responses.length > 0) {
        console.log(`Candidato completou o teste com ${candidate.responses.length} respostas`);
        
        // Buscar informações do teste que o candidato realizou
        let testInfo = null;
        if (candidate.testId) {
          try {
            testInfo = await prisma.tests.findUnique({
              where: { id: candidate.testId },
              include: {
                TestStage: {
                  include: {
                    stage: true
                  }
                }
              }
            });
            
            // Buscar as questões para cada etapa
            if (testInfo && testInfo.TestStage) {
              for (const testStage of testInfo.TestStage) {
                const stageQuestions = await prisma.stageQuestion.findMany({
                  where: { stageId: testStage.stage.id },
                  include: { question: true }
                });
                
                // Adicionar as questões à etapa (não existe no modelo, mas usamos para cálculos)
                testStage.stage['questions'] = stageQuestions;
              }
            }
          } catch (error) {
            console.error('Erro ao buscar informações do teste:', error);
          }
        }
        
        if (testInfo && testInfo.TestStage && testInfo.TestStage.length > 0) {
          console.log(`Teste encontrado: ${testInfo.title} com ${testInfo.TestStage.length} etapas`);
          
          // Agrupar respostas por etapa
          const stageResponses = {};
          const stageQuestions = {};
          
          // Inicializar contadores para cada etapa do teste
          testInfo.TestStage.forEach(testStage => {
            const stage = testStage.stage;
            stageResponses[stage.id] = {
              id: stage.id,
              name: stage.title,
              correct: 0,
              total: 0,
              percentage: 0
            };
            // Usar o número de questões que encontramos para a etapa
            stageQuestions[stage.id] = stage['questions'] ? stage['questions'].length : 0;
          });
          
          // Processar as respostas do candidato
          candidate.responses.forEach(response => {
            const stageId = response.question.stageId;
            
            // Verificar se a etapa existe no teste atual
            if (stageResponses[stageId]) {
              stageResponses[stageId].total++;
              if (response.option.isCorrect) {
                stageResponses[stageId].correct++;
              }
            }
          });
          
          // Calcular percentuais e preparar array final
          stageScores = Object.values(stageResponses).map((stage: any) => {
            const percentage = stage.total > 0 ? Math.round((stage.correct / stage.total) * 100) : 0;
            return {
              id: stage.id,
              name: stage.name,
              correct: stage.correct,
              total: stage.total,
              percentage
            };
          });
          
          // Calcular pontuação geral
          const totalCorrect = stageScores.reduce((sum, stage) => sum + stage.correct, 0);
          const totalQuestions = stageScores.reduce((sum, stage) => sum + stage.total, 0);
          totalScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
          
          console.log(`Pontuação calculada: ${totalScore}%, ${totalCorrect}/${totalQuestions} respostas corretas`);
        } else {
          console.log('Teste não encontrado ou candidato sem testId definido');
          
          // Calcular pontuação baseada apenas nas respostas, sem informações do teste
          // Agrupar por etapa usando as respostas disponíveis
          const stageMap: Record<string, {
            id: string;
            name: string;
            correct: number;
            total: number;
          }> = {};
          
          candidate.responses.forEach(response => {
            const stageId = response.question.stageId;
            const stageName = response.question.Stage?.title || 'Desconhecida';
            
            if (!stageMap[stageId]) {
              stageMap[stageId] = {
                id: stageId,
                name: stageName,
                correct: 0,
                total: 0
              };
            }
            
            stageMap[stageId].total++;
            if (response.option.isCorrect) {
              stageMap[stageId].correct++;
            }
          });
          
          stageScores = Object.values(stageMap).map(stage => {
            const percentage = stage.total > 0 ? Math.round((stage.correct / stage.total) * 100) : 0;
            return {
              id: stage.id,
              name: stage.name,
              correct: stage.correct,
              total: stage.total,
              percentage
            };
          });
          
          // Calcular pontuação geral
          const totalCorrect = candidate.responses.filter(r => r.option.isCorrect).length;
          totalScore = candidate.responses.length > 0 ? 
            Math.round((totalCorrect / candidate.responses.length) * 100) : 0;
            
          console.log(`Pontuação calculada sem informações do teste: ${totalScore}%`);
        }
      } else {
        console.log('Candidato não completou o teste ou não tem respostas');
      }
      
      // Formatar datas para evitar problemas de serialização
      const formattedCandidate = {
        ...candidate,
        testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
        interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
        inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
        createdAt: candidate.createdAt ? candidate.createdAt.toISOString() : null,
        updatedAt: candidate.updatedAt ? candidate.updatedAt.toISOString() : null,
        inviteAttempts: Number(candidate.inviteAttempts), // Converter possível BigInt
        // Manter as respostas para exibição na aba de respostas
        responses: candidate.responses
      };

      // Garantir que todos os valores BigInt sejam convertidos para Number
      const serializedCandidate = convertBigIntToNumber({
        ...formattedCandidate,
        score: totalScore,
        stageScores: stageScores
      });
      
      console.log(`Retornando candidato com ${stageScores.length} etapas de pontuação`);
      return res.status(200).json(serializedCandidate);
    } catch (error) {
      console.error('Erro ao buscar candidato:', error);
      return res.status(500).json({ error: 'Erro ao buscar candidato' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        name,
        email,
        phone,
        position,
        status,
        rating,
        observations,
        infoJobsLink,
        socialMediaUrl,
        interviewDate,
        linkedin,
        github,
        portfolio,
        resumeUrl
      } = req.body;

      // Validação básica
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
      }

      // Atualizar o candidato
      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          position,
          status: status || 'PENDING',
          rating: rating ? parseFloat(rating) : null,
          observations,
          infoJobsLink,
          socialMediaUrl,
          linkedin,
          github,
          portfolio,
          resumeUrl,
          interviewDate: interviewDate ? new Date(interviewDate) : null
        }
      });

      return res.status(200).json(updatedCandidate);
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error);
      return res.status(500).json({ error: 'Erro ao atualizar candidato' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      // Excluir o candidato
      await prisma.candidate.delete({
        where: { id }
      });

      return res.status(200).json({ success: true, message: 'Candidato excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      return res.status(500).json({ error: 'Erro ao excluir candidato' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
