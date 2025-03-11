import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

// Número máximo de tentativas permitidas
const MAX_ATTEMPTS = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Código de convite é obrigatório' });
    }
    
    console.log(`Validando código de convite: ${inviteCode}`);
    
    // Buscar o candidato pelo código de convite usando SQL raw
    // Incluindo o testId e status na consulta
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
        "testId"
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
    
    // Incrementar o contador de tentativas
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = "inviteAttempts" + 1
      WHERE id = ${candidate.id}
    `;
    
    // Verificar se o convite expirou
    if (candidate.inviteExpires && new Date() > new Date(candidate.inviteExpires)) {
      return res.status(400).json({ error: 'O código de convite expirou' });
    }
    
    // Verificar se excedeu o número máximo de tentativas
    if (candidate.inviteAttempts + 1 >= MAX_ATTEMPTS) {
      return res.status(400).json({ 
        error: 'Número máximo de tentativas excedido. Entre em contato com o administrador.'
      });
    }
    
    // Verificar se o candidato já completou o teste
    console.log(`Status do candidato: completed=${candidate.completed}, status=${candidate.status}`);
    
    if (candidate.completed || candidate.status === 'APPROVED') {
      console.log(`Candidato ${candidate.id} (${candidate.name}) já completou a avaliação`);
      
      console.log(`Buscando respostas para o candidato ${candidate.id}`);
      
      // Buscar as respostas do candidato para exibição
      const responses = await prisma.response.findMany({
        where: { candidateId: candidate.id },
        include: {
          question: {
            include: { Stage: true }
          },
          option: true
        }
      });
      
      console.log(`Encontradas ${responses.length} respostas para o candidato ${candidate.id}`);
      
      try {
        // Buscar snapshots separadamente para evitar problemas de tipo
        const responsesWithSnapshots = await prisma.$queryRaw`
          SELECT id, "questionSnapshot", "allOptionsSnapshot"
          FROM "Response"
          WHERE "candidateId" = ${candidate.id}
        ` as any[];
        
        console.log(`Encontrados ${responsesWithSnapshots.length} snapshots para o candidato ${candidate.id}`);
        
        // Combinar os resultados
        const combinedResponses = responses.map(response => {
          const snapshot = responsesWithSnapshots.find(r => r.id === response.id);
          return {
            ...response,
            questionSnapshot: snapshot?.questionSnapshot,
            allOptionsSnapshot: snapshot?.allOptionsSnapshot
          };
        });
        
        // Formatar as respostas para exibição
        const formattedResponses = combinedResponses.map(response => {
          // Tentar obter o texto da questão e opção de várias fontes possíveis
          let questionText = '';
          let optionText = '';
          let stageName = response.question.Stage?.title || 'Sem Etapa';
          
          // Processar o snapshot da questão se existir
          if (response.questionSnapshot) {
            try {
              const questionSnapshot = typeof response.questionSnapshot === 'string' 
                ? JSON.parse(response.questionSnapshot) 
                : response.questionSnapshot;
              
              questionText = questionSnapshot.text || '';
            } catch (error) {
              console.error('Erro ao processar questionSnapshot:', error);
              questionText = response.question.text || '';
            }
          } else {
            questionText = response.question.text || '';
          }
          
          // Buscar o texto da opção diretamente do banco de dados
          // O modelo Response já tem o texto da opção armazenado na coluna optionText
          try {
            // Tentar acessar a propriedade optionText diretamente
            const typedResponse = response as any;
            if (typedResponse.optionText) {
              optionText = typedResponse.optionText;
              console.log(`Usando optionText do banco: ${optionText}`);
            } else {
              // Fallback para o texto da opção relacionada
              optionText = response.option.text || '';
              console.log(`Usando option.text: ${optionText}`);
            }
          } catch (error) {
            console.error('Erro ao acessar optionText:', error);
            // Fallback para o texto da opção relacionada
            optionText = response.option.text || '';
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
        
        return res.status(400).json({ 
          error: 'Este candidato já completou a avaliação',
          completed: true,
          candidateName: candidate.name,
          responsesByStage
        });
      } catch (error) {
        console.error('Erro ao processar respostas do candidato:', error);
        return res.status(400).json({ 
          error: 'Este candidato já completou a avaliação, mas não foi possível recuperar suas respostas',
          completed: true,
          candidateName: candidate.name
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
        FROM tests
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
    
    // Resetar o contador de tentativas após um login bem-sucedido
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = 0
      WHERE id = ${candidate.id}
    `;
    
    // Retornar os dados do candidato e do teste associado
    console.log(`Retornando dados do candidato ${candidate.id} (${candidate.name}) e teste associado`);
    
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
        status: candidate.status
      },
      test: test
    });
  } catch (error) {
    console.error('Erro ao validar convite:', error);
    return res.status(500).json({ error: 'Erro ao validar convite' });
  } finally {
    await prisma.$disconnect();
  }
}
