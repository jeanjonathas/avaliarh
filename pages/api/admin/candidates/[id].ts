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
          select: {
            id: true,
            title: true,
            timeLimit: true,
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
      const stageIdToNameMap: Record<string, string> = {};
      const stageOrderMap: Record<string, number> = {};
      
      // Inicializar o mapa de etapas com base nas etapas do teste
      if (candidate.test && candidate.test.TestStage) {
        candidate.test.TestStage.forEach(testStage => {
          const stageId = testStage.stage.id;
          const stageName = testStage.stage.title;
          const stageOrder = testStage.order || 0;
          
          // Inicializar o array de respostas para esta etapa
          responsesByStage[stageId] = [];
          
          // Mapear o ID da etapa para o nome
          stageIdToNameMap[stageId] = stageName;
          
          // Mapear o ID da etapa para a ordem
          stageOrderMap[stageId] = stageOrder;
          
          console.log(`Mapeando etapa: ${stageName} (${stageId})`);
        });
      }
      
      // Inicializar o objeto de respostas por etapa
      Object.keys(stageIdToNameMap).forEach(stageId => {
        responsesByStage[stageId] = [];
      });
      
      // Processar cada resposta para adicionar informações extras
      candidate.responses.forEach(response => {
        // Converter a resposta para o tipo com campos adicionais
        const typedResponse = response as unknown as ResponseWithSnapshot;
        
        // Criar uma cópia da resposta para processamento
        const processedResponse: any = { ...response };
        
        // Verificar se a resposta tem um stageId válido
        let stageId = typedResponse.stageId;
        let stageName = '';
        let stageFound = false;
        
        // Verificar se a etapa existe no mapa (ou seja, pertence ao teste atual)
        if (stageId && responsesByStage[stageId]) {
          stageName = stageIdToNameMap[stageId] || 'Etapa Desconhecida';
          stageFound = true;
          console.log(`Processando resposta para etapa: ${stageName} (${stageId})`);
          console.log(`Etapa pertence ao teste atual: ${stageName}`);
        } else if (stageId) {
          // A etapa não pertence ao teste atual, mas temos um ID
          console.log(`Processando resposta para etapa: ${stageIdToNameMap[stageId] || stageId} (${stageId})`);
          console.log(`Etapa não pertence ao teste atual: ${stageIdToNameMap[stageId] || stageId}. Verificando outras fontes...`);
          
          // Tentar encontrar a etapa pelo nome
          if (typedResponse.stageName) {
            const matchingStage = Object.entries(stageIdToNameMap).find(([id, name]) => 
              name.toLowerCase() === typedResponse.stageName?.toLowerCase()
            );
            
            if (matchingStage) {
              stageId = matchingStage[0];
              stageName = matchingStage[1];
              stageFound = true;
              console.log(`Etapa encontrada pelo nome: ${stageName} (${stageId})`);
            } else {
              console.log(`Etapa pelo nome não pertence ao teste atual: ${typedResponse.stageName}. Verificando outras fontes...`);
            }
          }
          
          // Tentar encontrar a etapa via questionSnapshot
          if (!stageFound && typedResponse.questionSnapshot) {
            const questionSnapshot = typeof typedResponse.questionSnapshot === 'string'
              ? JSON.parse(typedResponse.questionSnapshot)
              : typedResponse.questionSnapshot;
              
            if (questionSnapshot && questionSnapshot.stageName) {
              const matchingStage = Object.entries(stageIdToNameMap).find(([id, name]) => 
                name.toLowerCase() === questionSnapshot.stageName.toLowerCase()
              );
              
              if (matchingStage) {
                stageId = matchingStage[0];
                stageName = matchingStage[1];
                stageFound = true;
                console.log(`Etapa encontrada via questionSnapshot: ${stageName} (${stageId})`);
              } else {
                console.log(`Etapa via questionSnapshot não pertence ao teste atual: ${questionSnapshot.stageName}`);
              }
            }
          }
          
          // Se ainda não encontrou a etapa, tentar encontrar via testQuestions
          if (!stageFound && typedResponse.questionId) {
            try {
              // Encontrar a etapa atual da questão via testQuestions
              const testQuestion = candidate.test.testQuestions.find(tq => 
                tq.questionId === typedResponse.questionId
              );
              
              if (testQuestion && testQuestion.stageId && responsesByStage[testQuestion.stageId]) {
                stageId = testQuestion.stageId;
                stageName = stageIdToNameMap[stageId] || 'Etapa Desconhecida';
                stageFound = true;
                console.log(`Usando etapa atual da questão via testQuestions: ${stageName} (${stageId})`);
              }
            } catch (error) {
              console.error('Erro ao buscar etapa via testQuestions:', error);
            }
          }
        } else {
          console.log('Resposta sem etapa associada:', response.id);
        }
        
        // Adicionar informações da opção a partir do snapshot
        if (typedResponse.allOptionsSnapshot) {
          try {
            const allOptions = typeof typedResponse.allOptionsSnapshot === 'string'
              ? JSON.parse(typedResponse.allOptionsSnapshot)
              : typedResponse.allOptionsSnapshot;
            
            console.log(`allOptionsSnapshot para questão ${typedResponse.questionId} contém ${allOptions.length} opções: ${JSON.stringify(allOptions)}`);
            
            // Verificar se a opção selecionada existe no snapshot
            const selectedOption = allOptions.find((opt: any) => opt.id === typedResponse.optionId);
            if (selectedOption) {
              processedResponse.optionText = selectedOption.text;
              
              // Verificar se a opção é correta
              const isCorrect = selectedOption.isCorrect === true;
              
              // Verificar se há inconsistência entre o que foi armazenado e o que deveria ser
              if (processedResponse.isCorrectOption !== isCorrect) {
                console.log(`CORREÇÃO: Atualizando isCorrectOption de ${processedResponse.isCorrectOption} para ${isCorrect} para a resposta ${response.id}`);
                processedResponse.isCorrectOption = isCorrect;
              }
            }
          } catch (error) {
            console.error('Erro ao processar allOptionsSnapshot:', error);
          }
        }
        
        if (typedResponse.isCorrectOption !== undefined) {
          processedResponse.isCorrectOption = typedResponse.isCorrectOption;
        }
        
        // Adicionar informações da questão a partir do snapshot
        if (typedResponse.questionText) {
          processedResponse.questionText = typedResponse.questionText;
        }
        
        if (typedResponse.categoryName) {
          processedResponse.categoryName = typedResponse.categoryName;
        }
        
        // Processar o snapshot para garantir que é um objeto válido
        if (typedResponse.allOptionsSnapshot) {
          try {
            // Se for uma string, tentar parsear
            if (typeof typedResponse.allOptionsSnapshot === 'string') {
              typedResponse.allOptionsSnapshot = JSON.parse(typedResponse.allOptionsSnapshot);
            }
            
            // Verificar se é um array
            if (!Array.isArray(typedResponse.allOptionsSnapshot)) {
              console.error('allOptionsSnapshot não é um array:', typedResponse.allOptionsSnapshot);
              typedResponse.allOptionsSnapshot = [];
            } else {
              console.log(`allOptionsSnapshot para questão ${typedResponse.questionId} contém ${typedResponse.allOptionsSnapshot.length} opções:`, 
                JSON.stringify(typedResponse.allOptionsSnapshot));
            }
          } catch (error) {
            console.error('Erro ao processar allOptionsSnapshot:', error);
            typedResponse.allOptionsSnapshot = [];
          }
        } else {
          console.log(`Nenhum allOptionsSnapshot encontrado para questão ${typedResponse.questionId}`);
          typedResponse.allOptionsSnapshot = [];
        }
        
        // Usar os snapshots para obter mais informações
        if (typedResponse.allOptionsSnapshot) {
          const allOptionsSnapshot = typedResponse.allOptionsSnapshot;
            
          console.log(`allOptionsSnapshot para questão ${typedResponse.questionId} contém ${allOptionsSnapshot.length} opções:`, JSON.stringify(allOptionsSnapshot));
          
          // Preservar o allOptionsSnapshot na resposta processada
          processedResponse.allOptionsSnapshot = allOptionsSnapshot;
          
          // Encontrar a opção correta e a opção selecionada
          const correctOption = allOptionsSnapshot.find((opt: any) => opt.isCorrect);
          const selectedOption = allOptionsSnapshot.find((opt: any) => opt.id === response.optionId);
          
          if (correctOption) {
            processedResponse.correctOptionId = correctOption.id;
            processedResponse.correctOptionText = correctOption.text;
          }
          
          // Adicionar informações da opção selecionada
          if (selectedOption) {
            if (!processedResponse.optionText && selectedOption.text) {
              processedResponse.optionText = selectedOption.text;
            }
            
            if (processedResponse.isCorrectOption === undefined && selectedOption.isCorrect !== undefined) {
              processedResponse.isCorrectOption = selectedOption.isCorrect;
            }
          }
          
          // Garantir que isCorrectOption seja definido mesmo se selectedOption não tiver essa propriedade
          if (processedResponse.isCorrectOption === undefined) {
            // Verificar se a opção selecionada é a correta comparando IDs
            if (correctOption && correctOption.id === response.optionId) {
              processedResponse.isCorrectOption = true;
              console.log(`Definindo isCorrectOption=true para a resposta ${response.id} baseado na comparação de IDs`);
            } else {
              processedResponse.isCorrectOption = false;
              console.log(`Definindo isCorrectOption=false para a resposta ${response.id} baseado na comparação de IDs`);
            }
          }
        }
        
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
    let responsesToCorrect: string[] = [];

    // Verificar se o candidato tem um teste associado
    if (candidate.test) {
      console.log(`Candidato está associado ao teste: ${candidate.test.title}`);
      
      // Obter todas as etapas do teste através da relação TestStage
      const testStages = candidate.test.TestStage || [];
      console.log(`O teste possui ${testStages.length} etapas`);
      
      // Inicializar o mapa de ID para nome da etapa
      const stageIdToNameMap: Record<string, string> = {};
      
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
        stageIdToNameMap[stage.id] = stage.title;
        console.log(`Etapa do teste identificada: ${stage.title} (${stage.id})`);
      });
      
      // Obter todas as etapas do teste atual
      const testStageIds = testStages.map(ts => ts.stageId);
      console.log(`O teste possui ${testStageIds.length} etapas`);
      
      // Filtrar apenas as respostas que pertencem ao teste atual
      // Isso resolve o problema de respostas de testes antigos aparecerem
      const currentTestResponses = candidate.responses.filter(response => {
        const typedResponse = response as unknown as ResponseWithSnapshot;
        
        // Verificar se a resposta tem um stageId que pertence ao teste atual
        if (typedResponse.stageId && testStageIds.includes(typedResponse.stageId)) {
          console.log(`Resposta ${response.id} pertence ao teste atual via stageId direto`);
          return true;
        }
        
        // Verificar via questionSnapshot
        if (typedResponse.questionSnapshot) {
          try {
            const questionData = typeof typedResponse.questionSnapshot === 'string'
              ? JSON.parse(typedResponse.questionSnapshot)
              : typedResponse.questionSnapshot;
              
            if (questionData.stageId && testStageIds.includes(questionData.stageId)) {
              console.log(`Resposta ${response.id} pertence ao teste atual via questionSnapshot`);
              return true;
            }
          } catch (error) {
            console.error('Erro ao processar questionSnapshot:', error);
          }
        }
        
        // Verificar via testQuestions - método mais confiável
        if (typedResponse.questionId) {
          const testQuestion = candidate.test.testQuestions.find(tq => 
            tq.questionId === typedResponse.questionId
          );
          
          if (testQuestion && testStageIds.includes(testQuestion.stageId)) {
            console.log(`Resposta ${response.id} pertence ao teste atual via testQuestions`);
            
            // Atualizar o stageId da resposta para garantir consistência
            (response as any).stageId = testQuestion.stageId;
            
            return true;
          }
        }
        
        // Se chegou aqui, a resposta não pertence ao teste atual
        console.log(`Resposta ${response.id} não pertence ao teste atual e será ignorada`);
        return false;
      });
      
      // Substituir as respostas do candidato pelas respostas filtradas
      candidate.responses = currentTestResponses;
      
      console.log(`Processando ${currentTestResponses.length} respostas para cálculo de desempenho`);
      
      // Processar cada resposta para adicionar informações extras
      currentTestResponses.forEach(response => {
        // Converter a resposta para o tipo com campos adicionais
        const typedResponse = response as unknown as ResponseWithSnapshot;
        
        // Verificar se a resposta tem um stageId válido
        if (!typedResponse.stageId) {
          console.log('Resposta sem etapa associada:', response.id);
          return;
        }
        
        // Verificar se a etapa existe no mapa (ou seja, pertence ao teste atual)
        if (stageMap[typedResponse.stageId]) {
          console.log(`Analisando ID da etapa: ${typedResponse.stageId}`);
          
          // Incrementar o total de respostas para esta etapa
          stageMap[typedResponse.stageId].total++;
          
          // Verificar se a resposta está correta
          if (typedResponse.isCorrectOption) {
            stageMap[typedResponse.stageId].correct++;
            console.log(`Resposta correta para etapa ${stageMap[typedResponse.stageId].name}`);
          } else {
            console.log(`Resposta incorreta para etapa ${stageMap[typedResponse.stageId].name}`);
            
            // Verificar se há um problema de inconsistência com o optionId
            if (typedResponse.allOptionsSnapshot) {
              try {
                const allOptions = typeof typedResponse.allOptionsSnapshot === 'string'
                  ? JSON.parse(typedResponse.allOptionsSnapshot)
                  : typedResponse.allOptionsSnapshot;
                
                // Verificar se a opção selecionada deveria ser correta
                const selectedOption = allOptions.find((opt: any) => opt.id === typedResponse.optionId);
                const correctOption = allOptions.find((opt: any) => opt.isCorrect === true);
                
                if (selectedOption && correctOption) {
                  console.log(`Opção selecionada: ${selectedOption.text} (${selectedOption.id})`);
                  console.log(`Opção correta: ${correctOption.text} (${correctOption.id})`);
                  
                  // Se a opção selecionada é a mesma que a correta (comparando texto), mas o isCorrectOption é falso
                  // isso indica um problema de inconsistência
                  if (selectedOption.id === correctOption.id || 
                      selectedOption.text === correctOption.text) {
                    console.log(`POSSÍVEL ERRO DE INCONSISTÊNCIA DETECTADO: A opção selecionada parece ser a correta!`);
                    console.log(`Corrigindo a pontuação para esta resposta.`);
                    stageMap[typedResponse.stageId].correct++;
                    
                    // Marcar que esta resposta deveria ser correta para atualização posterior
                    responsesToCorrect.push(typedResponse.id);
                    console.log(`Adicionando resposta ${typedResponse.id} à lista de correções`);
                  }
                }
              } catch (error) {
                console.error('Erro ao verificar inconsistência nas opções:', error);
              }
            }
          }
        } else {
          // Tentar encontrar a etapa por outros meios
          console.log(`Etapa ${typedResponse.stageId} não encontrada no mapa. Tentando alternativas...`);
          
          // Verificar via testQuestions
          if (typedResponse.questionId) {
            const testQuestion = candidate.test.testQuestions.find(tq => 
              tq.questionId === typedResponse.questionId
            );
            
            if (testQuestion && stageMap[testQuestion.stageId]) {
              const stageId = testQuestion.stageId;
              console.log(`Encontrada etapa alternativa via testQuestions: ${stageMap[stageId].name} (${stageId})`);
              
              // Incrementar o total de respostas para esta etapa
              stageMap[stageId].total++;
              
              // Verificar se a resposta está correta
              if (typedResponse.isCorrectOption) {
                stageMap[stageId].correct++;
                console.log(`Resposta correta para etapa ${stageMap[stageId].name}`);
              } else {
                console.log(`Resposta incorreta para etapa ${stageMap[stageId].name}`);
                
                // Verificar se há um problema de inconsistência com o optionId
                if (typedResponse.allOptionsSnapshot) {
                  try {
                    const allOptions = typeof typedResponse.allOptionsSnapshot === 'string'
                      ? JSON.parse(typedResponse.allOptionsSnapshot)
                      : typedResponse.allOptionsSnapshot;
                    
                    // Verificar se a opção selecionada deveria ser correta
                    const selectedOption = allOptions.find((opt: any) => opt.id === typedResponse.optionId);
                    const correctOption = allOptions.find((opt: any) => opt.isCorrect === true);
                    
                    if (selectedOption && correctOption) {
                      console.log(`Opção selecionada: ${selectedOption.text} (${selectedOption.id})`);
                      console.log(`Opção correta: ${correctOption.text} (${correctOption.id})`);
                      
                      // Se a opção selecionada é a mesma que a correta (comparando texto), mas o isCorrectOption é falso
                      // isso indica um problema de inconsistência
                      if (selectedOption.id === correctOption.id || 
                          selectedOption.text === correctOption.text) {
                        console.log(`POSSÍVEL ERRO DE INCONSISTÊNCIA DETECTADO: A opção selecionada parece ser a correta!`);
                        console.log(`Corrigindo a pontuação para esta resposta.`);
                        stageMap[stageId].correct++;
                        
                        // Marcar que esta resposta deveria ser correta para atualização posterior
                        responsesToCorrect.push(typedResponse.id);
                        console.log(`Adicionando resposta ${typedResponse.id} à lista de correções`);
                      }
                    }
                  } catch (error) {
                    console.error('Erro ao verificar inconsistência nas opções:', error);
                  }
                }
              }
            }
          }
        }
      });
      
      // Calcular as pontuações por etapa
      stageScores = Object.values(stageMap).map(stage => {
        const percentage = stage.total > 0 ? Math.round((stage.correct / stage.total) * 100) : 0;
        return {
          ...stage,
          percentage
        };
      });
      
      console.log(`Calculadas ${stageScores.length} etapas de pontuação:`, JSON.stringify(stageScores));
      
      // Calcular a pontuação total
      const validResponses = currentTestResponses.filter(r => {
        const typedResponse = r as unknown as ResponseWithSnapshot;
        return stageMap[typedResponse.stageId] !== undefined;
      });
      
      let totalCorrect = validResponses.filter(r => {
        const typedResponse = r as unknown as ResponseWithSnapshot;
        
        // Verificar se a resposta está marcada como correta
        if (typedResponse.isCorrectOption) {
          return true;
        }
        
        // Verificar se há inconsistência (resposta correta marcada como incorreta)
        if (typedResponse.allOptionsSnapshot) {
          try {
            const allOptions = typeof typedResponse.allOptionsSnapshot === 'string'
              ? JSON.parse(typedResponse.allOptionsSnapshot)
              : typedResponse.allOptionsSnapshot;
            
            // Verificar se a opção selecionada deveria ser correta
            const selectedOption = allOptions.find((opt: any) => opt.id === typedResponse.optionId);
            const correctOption = allOptions.find((opt: any) => opt.isCorrect === true);
            
            if (selectedOption && correctOption) {
              // Se a opção selecionada é a mesma que a correta (comparando texto ou ID)
              // isso indica um problema de inconsistência
              if (selectedOption.id === correctOption.id || 
                  selectedOption.text === correctOption.text) {
                console.log(`Corrigindo pontuação: resposta ${typedResponse.id} deveria ser marcada como correta`);
                return true;
              }
            }
          } catch (error) {
            console.error('Erro ao verificar inconsistência nas opções:', error);
          }
        }
        
        return false;
      }).length;
      
      totalScore = validResponses.length > 0 ? 
        Math.round((totalCorrect / validResponses.length) * 100) : 0;
      
      // Atualizar as respostas que foram identificadas como incorretamente marcadas
      if (responsesToCorrect.length > 0) {
        console.log(`Atualizando ${responsesToCorrect.length} respostas com inconsistências...`);
        
        try {
          // Atualizar cada resposta para marcar como correta
          for (const responseId of responsesToCorrect) {
            await prisma.response.update({
              where: { id: responseId },
              data: { isCorrectOption: true }
            });
            console.log(`Resposta ${responseId} atualizada para correta`);
          }
        } catch (error) {
          console.error('Erro ao atualizar respostas com inconsistências:', error);
        }
      }
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