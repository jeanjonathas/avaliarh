import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

// Função auxiliar para converter BigInt para Number
function convertBigIntToNumber(obj: any): any {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        obj[key] = Number(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        convertBigIntToNumber(obj[key]);
      }
    }
  }
  return obj;
}

// Definir a interface para a resposta
interface ResponseWithSnapshot {
  id: string;
  candidateId: string;
  questionId: string;
  optionId: string;
  createdAt: Date;
  updatedAt: Date;
  stageName: string | null;
  stageId: string | null;
  isCorrectOption: boolean;
  optionText: string;
  questionText: string;
  categoryName: string | null;
  questionSnapshot: any;
  allOptionsSnapshot: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;

  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const prisma = new PrismaClient();
    
    // Buscar o candidato com suas respostas
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        responses: true,
        test: {
          include: {
            TestStage: {
              include: {
                stage: true
              },
              orderBy: {
                order: 'asc'
              }
            },
            testQuestions: {
              include: {
                question: true,
                stage: true
              }
            }
          }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Processar as respostas, se houver
    if (candidate.responses && candidate.responses.length > 0) {
      console.log(`Processando ${candidate.responses.length} respostas`);
      
      // Criar um mapa para armazenar as respostas agrupadas por etapa
      const responsesByStage: Record<string, any[]> = {};
      
      // Criar um mapa para relacionar IDs de etapas com seus nomes
      const stageIdToNameMap: Record<string, string> = {};
      
      // Preencher o mapa de IDs de etapas para nomes
      if (candidate.test && candidate.test.TestStage) {
        candidate.test.TestStage.forEach(testStage => {
          const stageId = testStage.stage.id;
          const stageName = testStage.stage.title;
          stageIdToNameMap[stageId] = stageName;
          
          // Inicializar o array de respostas para esta etapa
          responsesByStage[stageId] = [];
          
          console.log(`Mapeando etapa: ${stageName} (${stageId})`);
        });
      }
      
      // Inicializar o objeto de respostas por etapa
      Object.keys(stageIdToNameMap).forEach(stageId => {
        responsesByStage[stageId] = [];
      });
      
      // Agrupar respostas por etapa
      candidate.responses.forEach(response => {
        let stageName = 'Sem Etapa';
        let stageId = '';
        let stageFound = false;
        
        // Converter a resposta para o tipo com campos adicionais
        const typedResponse = response as unknown as ResponseWithSnapshot;
        
        // Tentar obter o stageId diretamente da resposta
        if (typedResponse.stageId) {
          stageId = typedResponse.stageId;
          stageName = typedResponse.stageName || 'Sem Etapa';
          
          console.log(`Processando resposta para etapa: ${stageName} (${stageId})`);
          
          // Verificar se esta etapa pertence ao teste atual
          if (stageIdToNameMap[stageId]) {
            stageFound = true;
            console.log(`Etapa pertence ao teste atual: ${stageName}`);
          } else {
            console.log(`Etapa não pertence ao teste atual: ${stageName}. Verificando outras fontes...`);
          }
        }
        
        // Se não encontrou a etapa via stageId, tentar pelo campo stageName
        if (!stageFound && typedResponse.stageName) {
          stageName = typedResponse.stageName;
          
          // Verificar se esta etapa pertence ao teste atual pelo nome
          const stageEntry = Object.entries(stageIdToNameMap).find(([id, name]) => name === stageName);
          if (stageEntry) {
            stageId = stageEntry[0];
            stageFound = true;
            console.log(`Etapa encontrada pelo nome: ${stageName} (${stageId})`);
          } else {
            console.log(`Etapa pelo nome não pertence ao teste atual: ${stageName}. Verificando outras fontes...`);
          }
        }
        
        // Tentar pelo questionSnapshot
        if (!stageFound && typedResponse.questionSnapshot) {
          try {
            const questionData = typeof typedResponse.questionSnapshot === 'string' 
              ? JSON.parse(typedResponse.questionSnapshot) 
              : typedResponse.questionSnapshot;
            
            if (questionData.stageId) {
              stageId = questionData.stageId;
              stageName = questionData.stageName || 'Sem Etapa';
              
              // Verificar se esta etapa pertence ao teste atual
              if (stageIdToNameMap[stageId]) {
                stageFound = true;
                console.log(`Etapa encontrada via questionSnapshot: ${stageName} (${stageId})`);
              } else {
                console.log(`Etapa via questionSnapshot não pertence ao teste atual: ${stageName}`);
                
                // Verificar se a questão está associada ao teste atual através de testQuestions
                if (candidate.test && candidate.test.testQuestions) {
                  const testQuestion = candidate.test.testQuestions.find(tq => 
                    tq.questionId === response.questionId
                  );
                  
                  if (testQuestion) {
                    stageId = testQuestion.stageId;
                    stageName = stageIdToNameMap[stageId] || 'Etapa Desconhecida';
                    stageFound = true;
                    console.log(`Usando etapa atual da questão via testQuestions: ${stageName} (${stageId})`);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Erro ao processar questionSnapshot:', error);
          }
        }
        
        // Se não encontrou nenhuma etapa válida, tentar encontrar a etapa correta via testQuestions
        if (!stageFound && candidate.test && candidate.test.testQuestions) {
          const testQuestion = candidate.test.testQuestions.find(tq => 
            tq.questionId === response.questionId
          );
          
          if (testQuestion) {
            stageId = testQuestion.stageId;
            stageName = stageIdToNameMap[stageId] || 'Etapa Desconhecida';
            stageFound = true;
            console.log(`Etapa encontrada via testQuestions: ${stageName} (${stageId})`);
          } else if (candidate.test.TestStage && candidate.test.TestStage.length > 0) {
            // Se não encontramos a questão em testQuestions, usar a primeira etapa como último recurso
            const firstStage = candidate.test.TestStage[0];
            stageName = firstStage.stage.title;
            stageId = firstStage.stage.id;
            
            stageFound = true;
            console.log(`Usando primeira etapa do teste como fallback: ${stageName} (${stageId})`);
          }
        }
        
        // Criar uma cópia da resposta para processamento
        const processedResponse: any = {
          id: response.id,
          questionId: response.questionId,
          optionId: response.optionId,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          stageName: stageName,
          stageId: stageId
        };
        
        // Adicionar informações da opção a partir do snapshot
        if (typedResponse.optionText) {
          processedResponse.optionText = typedResponse.optionText;
        }
        
        if (typedResponse.isCorrectOption !== undefined) {
          processedResponse.isCorrect = typedResponse.isCorrectOption;
        }
        
        // Adicionar informações da questão a partir do snapshot
        if (typedResponse.questionText) {
          processedResponse.questionText = typedResponse.questionText;
        }
        
        if (typedResponse.categoryName) {
          processedResponse.categoryName = typedResponse.categoryName;
        }
        
        // Usar os snapshots para obter mais informações
        if (typedResponse.questionSnapshot) {
          const questionSnapshot = typeof typedResponse.questionSnapshot === 'string'
            ? JSON.parse(typedResponse.questionSnapshot)
            : typedResponse.questionSnapshot;
            
          if (!processedResponse.questionText && questionSnapshot.text) {
            processedResponse.questionText = questionSnapshot.text;
          }
          
          if (!processedResponse.categoryName && questionSnapshot.categoryName) {
            processedResponse.categoryName = questionSnapshot.categoryName;
          }
        }
        
        if (typedResponse.allOptionsSnapshot) {
          const allOptionsSnapshot = typeof typedResponse.allOptionsSnapshot === 'string'
            ? JSON.parse(typedResponse.allOptionsSnapshot)
            : typedResponse.allOptionsSnapshot;
            
          processedResponse.allOptions = allOptionsSnapshot;
          
          // Encontrar a opção selecionada no snapshot
          const selectedOption = allOptionsSnapshot.find((opt: any) => opt.id === response.optionId);
          if (selectedOption) {
            if (!processedResponse.optionText && selectedOption.text) {
              processedResponse.optionText = selectedOption.text;
            }
            
            if (processedResponse.isCorrect === undefined && selectedOption.isCorrect !== undefined) {
              processedResponse.isCorrect = selectedOption.isCorrect;
            }
          }
        }
        
        // Adicionar a resposta ao grupo da etapa correspondente
        if (stageFound && stageId && responsesByStage[stageId]) {
          responsesByStage[stageId].push(processedResponse);
          console.log(`Adicionando resposta à etapa: ${stageName} (${stageId})`);
        } else {
          // Se não encontrou uma etapa válida, adicionar à primeira etapa como fallback
          if (Object.keys(responsesByStage).length > 0) {
            const firstStageId = Object.keys(responsesByStage)[0];
            responsesByStage[firstStageId].push(processedResponse);
            console.log(`Adicionando resposta à primeira etapa como fallback: ${stageIdToNameMap[firstStageId]} (${firstStageId})`);
          } else {
            console.log(`Não foi possível adicionar a resposta a nenhuma etapa válida.`);
          }
        }
      });
      
      // Converter o mapa de respostas agrupadas para um array
      const flattenedResponses = Object.values(responsesByStage).flat();
      
      // Substituir as respostas originais pelas processadas
      candidate.responses = flattenedResponses;
      
      // Adicionar informação sobre etapas vazias
      if (candidate.test && candidate.test.TestStage) {
        // Criar um array para armazenar informações sobre todas as etapas
        const allStages = [];
        
        // Mapear todas as etapas do teste
        candidate.test.TestStage.forEach(testStage => {
          const stageId = testStage.stage.id;
          const stageName = testStage.stage.title;
          const stageOrder = testStage.order || 0;
          
          // Verificar se a etapa tem respostas
          const hasResponses = responsesByStage[stageId] && responsesByStage[stageId].length > 0;
          
          // Adicionar informação da etapa
          allStages.push({
            id: stageId,
            name: stageName,
            order: stageOrder,
            hasResponses: hasResponses,
            responsesCount: hasResponses ? responsesByStage[stageId].length : 0
          });
        });
        
        // Adicionar informações das etapas ao candidato
        (candidate as any).testStages = allStages;
      }
    }

    // Calcular pontuações por etapa
    let stageScores = [];
    let totalScore = 0;

    // Verificar se o candidato tem um teste associado
    if (candidate.test) {
      console.log(`Candidato está associado ao teste: ${candidate.test.title}`);
      
      // Obter todas as etapas do teste através da relação TestStage
      const testStages = candidate.test.TestStage || [];
      console.log(`O teste possui ${testStages.length} etapas`);
      
      // Inicializar o mapa com todas as etapas do teste
      const stageMap: Record<string, {
        id: string;
        name: string;
        correct: number;
        total: number;
      }> = {};
      
      // Adicionar todas as etapas do teste ao mapa
      testStages.forEach(testStage => {
        const stage = testStage.stage;
        stageMap[stage.id] = {
          id: stage.id,
          name: stage.title,
          correct: 0,
          total: 0
        };
        console.log(`Etapa do teste identificada: ${stage.title} (${stage.id})`);
      });
      
      // Processar as respostas do candidato, se houver
      if (candidate.responses && candidate.responses.length > 0) {
        console.log(`Processando ${candidate.responses.length} respostas para cálculo de desempenho`);
        
        // Processar cada resposta
        candidate.responses.forEach(response => {
          // Converter a resposta para o tipo com campos adicionais
          const typedResponse = response as unknown as ResponseWithSnapshot;
          
          // Verificar se a resposta tem um stageId válido
          if (!typedResponse.stageId) {
            console.log('Resposta sem etapa associada:', response.id);
            return;
          }
          
          let stageId = typedResponse.stageId;
          
          console.log(`Analisando ID da etapa: ${stageId}`);
          
          // Verificar se a etapa existe no mapa (apenas processar etapas que pertencem ao teste atual)
          if (stageMap[stageId]) {
            stageMap[stageId].total++;
            
            // Verificar se a resposta está correta
            if (typedResponse.isCorrectOption) {
              stageMap[stageId].correct++;
              console.log(`Resposta correta para etapa ${stageMap[stageId].name}`);
            } else {
              console.log(`Resposta incorreta para etapa ${stageMap[stageId].name}`);
            }
          } else {
            console.log(`Etapa ${stageId} não pertence ao teste atual, ignorando para cálculo de pontuação`);
          }
        });
      }
      
      // Calcular percentuais para cada etapa
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
      
      console.log(`Calculadas ${stageScores.length} etapas de pontuação:`, JSON.stringify(stageScores));
      
      // Calcular pontuação geral apenas para as respostas das etapas do teste atual
      const validResponses = candidate.responses.filter(r => {
        // Converter a resposta para o tipo com campos adicionais
        const typedR = r as unknown as ResponseWithSnapshot;
        // Verificar se a resposta tem um stageId válido e se pertence a uma etapa do teste atual
        return typedR.stageId && stageMap[typedR.stageId];
      });
      
      // Contar respostas corretas usando o campo isCorrectOption
      const totalCorrect = validResponses.filter(r => {
        const typedR = r as unknown as ResponseWithSnapshot;
        return typedR.isCorrectOption === true;
      }).length;
      
      totalScore = validResponses.length > 0 ? 
        Math.round((totalCorrect / validResponses.length) * 100) : 0;
    }

    // Formatar datas para evitar problemas de serialização
    const formattedCandidate = {
      ...candidate,
      testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
      interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
      inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
      createdAt: candidate.createdAt ? candidate.createdAt.toISOString() : null,
      updatedAt: candidate.updatedAt ? candidate.updatedAt.toISOString() : null,
      score: totalScore,
      stageScores: stageScores
    };

    return res.status(200).json(convertBigIntToNumber(formattedCandidate));
  } else if (req.method === 'DELETE') {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const prisma = new PrismaClient();
    
    try {
      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        select: { id: true, name: true }
      });

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' });
      }

      console.log(`Excluindo candidato: ${candidate.name} (${candidate.id})`);

      // Primeiro excluir todas as respostas associadas ao candidato
      await prisma.response.deleteMany({
        where: { candidateId: id }
      });

      console.log(`Respostas do candidato excluídas com sucesso`);

      // Em seguida, excluir o candidato
      await prisma.candidate.delete({
        where: { id }
      });

      console.log(`Candidato excluído com sucesso`);

      return res.status(200).json({ 
        success: true, 
        message: 'Candidato excluído com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}