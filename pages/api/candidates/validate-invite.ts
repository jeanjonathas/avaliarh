import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

// Função para gerar um token de segurança baseado no ID do candidato e uma chave secreta
function generateSecurityToken(candidateId: string): string {
  // Em produção, use uma variável de ambiente para a chave secreta
  const secretKey = process.env.SECURITY_TOKEN_SECRET || 'avaliarh-security-key';
  return crypto
    .createHmac('sha256', secretKey)
    .update(candidateId)
    .digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { inviteCode, securityToken } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Código de convite é obrigatório' });
    }
    
    console.log(`Validando código de convite: ${inviteCode}`);
    
    // Buscar o candidato pelo código de convite usando SQL raw
    // Incluindo o testId, status e score na consulta
    const candidates = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        position, 
        completed, 
        status,
        "inviteExpires", 
        "inviteAttempts",
        "testId",
        "processId",
        observations,
        instagram,
        score,
        "showResults",
        "requestPhoto",
        "photoUrl"
      FROM "Candidate"
      WHERE "inviteCode" = ${inviteCode}
    `;
    
    const candidate = Array.isArray(candidates) && candidates.length > 0 ? candidates[0] : null;
    
    // Se o candidato não for encontrado, retornar erro
    if (!candidate) {
      // Em um ambiente de produção, você poderia rastrear tentativas por IP
      // para evitar ataques de força bruta
      return res.status(404).json({ error: 'Código de convite inválido' });
    }
    
    // Incrementar o contador de tentativas (mantemos o contador para fins de log, mas não limitamos mais)
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = "inviteAttempts" + 1
      WHERE id = ${candidate.id}
    `;
    
    // Verificar se o convite expirou
    if (candidate.inviteExpires && new Date() > new Date(candidate.inviteExpires)) {
      return res.status(400).json({ error: 'O código de convite expirou' });
    }
    
    // Verificar se o candidato já completou o teste
    console.log(`Status do candidato: completed=${candidate.completed}, status=${candidate.status}`);
    
    if (candidate.completed || candidate.status === 'APPROVED') {
      console.log(`Candidato ${candidate.id} (${candidate.name}) já completou a avaliação`);
      
      try {
        console.log(`Buscando respostas para o candidato ${candidate.id}`);
        
        // Buscar as respostas do candidato para exibição
        const responses = await prisma.response.findMany({
          where: { candidateId: candidate.id }
        });
        
        console.log(`Encontradas ${responses.length} respostas para o candidato ${candidate.id}`);
        
        // Buscar snapshots separadamente para evitar problemas de tipo
        const responsesWithSnapshots = await prisma.$queryRaw`
          SELECT id, "questionSnapshot", "stageName", "questionType", "optionsOrder", "optionId"
          FROM "Response"
          WHERE "candidateId" = ${candidate.id}
        ` as any[];
        
        console.log(`Encontrados ${responsesWithSnapshots.length} snapshots para o candidato ${candidate.id}`);
        
        // Verificar se o candidato está associado a um processo seletivo e buscar a configuração showResults
        let showResultsToCandidate = candidate.showResults === true; // Valor padrão do candidato
        
        if (candidate.processId) {
          // Buscar a configuração do processo seletivo
          const process = await prisma.selectionProcess.findUnique({
            where: { id: candidate.processId },
            include: {
              stages: {
                select: { showResultsToCandidate: true }
              }
            }
          });
          
          if (process && process.stages.length > 0) {
            // Se qualquer etapa do processo tiver showResultsToCandidate como false, não mostrar resultados
            const allStagesShowResults = process.stages.every(stage => stage.showResultsToCandidate === true);
            showResultsToCandidate = allStagesShowResults;
            
            console.log(`Configuração showResultsToCandidate do processo: ${showResultsToCandidate}`);
          }
        }
        
        // Combinar os resultados
        const combinedResponses = responses.map(response => {
          const snapshot = responsesWithSnapshots.find(r => r.id === response.id);
          return {
            ...response,
            questionSnapshot: snapshot?.questionSnapshot,
            stageName: snapshot?.stageName || 'Sem Etapa',
            questionType: snapshot?.questionType || 'MULTIPLE_CHOICE',
            optionsOrder: snapshot?.optionsOrder,
            optionId: snapshot?.optionId
          };
        });
        
        // Formatar as respostas para exibição
        const formattedResponses = combinedResponses.map(response => {
          // Tentar obter o texto da questão e opção de várias fontes possíveis
          let questionText = response.questionText || '';
          let optionText = response.optionText || '';
          let stageName = response.stageName || 'Sem Etapa';
          
          // Processar o snapshot da questão se existir e se o questionText ainda não estiver definido
          if (!questionText && response.questionSnapshot) {
            try {
              const questionSnapshot = typeof response.questionSnapshot === 'string' 
                ? JSON.parse(response.questionSnapshot) 
                : response.questionSnapshot;
              
              questionText = questionSnapshot.text || '';
              
              // Se temos informações sobre a opção selecionada, vamos tentar extrair o texto
              if (response.optionId && questionSnapshot.options) {
                const selectedOption = questionSnapshot.options.find((opt: any) => opt.id === response.optionId);
                if (selectedOption) {
                  optionText = selectedOption.text || '';
                }
              }
            } catch (error) {
              console.error('Erro ao processar questionSnapshot:', error);
            }
          }
          
          return {
            id: response.id,
            questionText,
            optionText,
            stageName
          };
        });
        
        // Agrupar respostas por etapa
        const responsesByStage: { [key: string]: any[] } = {};
        
        formattedResponses.forEach(response => {
          if (!responsesByStage[response.stageName]) {
            responsesByStage[response.stageName] = [];
          }
          
          responsesByStage[response.stageName].push(response);
        });
        
        // Extrair dados de pontuação do campo observations se existirem
        let scoreData = {
          score: candidate.score || 0,
          totalQuestions: 0,
          accuracyRate: 0
        };
        
        if (candidate.observations) {
          try {
            const parsedObservations = JSON.parse(candidate.observations);
            if (parsedObservations.score !== undefined && 
                parsedObservations.totalQuestions !== undefined && 
                parsedObservations.accuracyRate !== undefined) {
              // Normalizar a taxa de acerto para garantir que seja um valor entre 0 e 1
              // Se o valor já estiver entre 0 e 1, mantemos como está
              // Se for maior que 1, assumimos que é um percentual (0-100) e dividimos por 100
              const normalizedAccuracyRate = 
                parsedObservations.accuracyRate > 1 
                  ? parsedObservations.accuracyRate / 100 
                  : parsedObservations.accuracyRate;
              
              scoreData = {
                score: parsedObservations.score,
                totalQuestions: parsedObservations.totalQuestions,
                accuracyRate: normalizedAccuracyRate
              };
            }
          } catch (e) {
            console.error('Erro ao analisar observations:', e);
          }
        }
        
        // Retornar um status 200 (sucesso) em vez de 400 (erro)
        return res.status(200).json({ 
          success: true,
          message: 'Este candidato já completou a avaliação',
          completed: true,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          responsesByStage,
          showResults: showResultsToCandidate,
          scoreData
        });
      } catch (error) {
        console.error('Erro ao processar respostas do candidato:', error);
        // Ainda retornar um status 200 mesmo em caso de erro, mas indicando que não foi possível recuperar as respostas
        return res.status(200).json({ 
          success: true,
          message: 'Este candidato já completou a avaliação, mas não foi possível recuperar suas respostas',
          completed: true,
          candidateName: candidate.name,
          candidateEmail: candidate.email
        });
      }
    }
    
    // Buscar informações do teste associado, se houver
    let test = null;
    let stageCount = 0;
    
    if (candidate.testId) {
      console.log(`Buscando informações do teste ID: ${candidate.testId}`);
      
      // Buscar informações básicas do teste
      const tests = await prisma.$queryRaw`
        SELECT id, title, description, "timeLimit"
        FROM "Test"
        WHERE id = ${candidate.testId}
      `;
      
      test = Array.isArray(tests) && tests.length > 0 ? tests[0] : null;
      
      if (test) {
        // Contar quantas etapas o teste tem
        const testStages = await prisma.testStage.findMany({
          where: {
            testId: candidate.testId
          },
          orderBy: {
            order: 'asc'
          }
        });
        
        stageCount = testStages.length;
        console.log(`Teste encontrado: ${test.title}, com ${stageCount} etapas`);
        
        // Adicionar o número de etapas ao objeto de teste
        test.stageCount = stageCount;
      } else {
        console.log(`Teste com ID ${candidate.testId} não encontrado`);
      }
    }
    
    // Buscar a configuração requestCandidatePhoto da primeira etapa do processo seletivo
    let requestCandidatePhoto = true; // Valor padrão
    let showResultsToCandidate = true; // Valor padrão
    
    if (candidate.processId) {
      try {
        const processStages = await prisma.processStage.findMany({
          where: { processId: candidate.processId },
          orderBy: { order: 'asc' },
          select: { 
            requestCandidatePhoto: true,
            showResultsToCandidate: true
          }
        });
        
        if (processStages.length > 0) {
          // Usar a configuração da primeira etapa
          requestCandidatePhoto = processStages[0].requestCandidatePhoto === true;
          showResultsToCandidate = processStages[0].showResultsToCandidate === true;
          console.log(`Configuração requestCandidatePhoto da primeira etapa: ${requestCandidatePhoto}`);
          console.log(`Configuração showResultsToCandidate da primeira etapa: ${showResultsToCandidate}`);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações da etapa do processo:', error);
      }
    }
    
    // Resetar o contador de tentativas após um login bem-sucedido
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = 0
      WHERE id = ${candidate.id}
    `;
    
    // Retornar os dados do candidato e do teste associado
    console.log(`Retornando dados do candidato ${candidate.id} (${candidate.name}) e teste associado`);
    
    // Gerar um token de segurança para este candidato
    const candidateSecurityToken = generateSecurityToken(candidate.id);
    
    return res.status(200).json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        position: candidate.position || null,
        testId: candidate.testId || null,
        completed: candidate.completed,
        status: candidate.status,
        observations: candidate.observations,
        instagram: candidate.instagram,
        score: candidate.score,
        showResults: showResultsToCandidate, // Usar a configuração da etapa do processo
        requestPhoto: requestCandidatePhoto, // Usar a configuração da etapa do processo
        photoUrl: candidate.photoUrl
      },
      test: test,
      securityToken: candidateSecurityToken
    });
  } catch (error) {
    console.error('Erro ao validar convite:', error);
    return res.status(500).json({ error: 'Erro ao validar convite' });
  } finally {
    await prisma.$disconnect();
  }
}
