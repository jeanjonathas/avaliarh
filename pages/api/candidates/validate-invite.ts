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
      return res.status(400).json({ 
        error: 'Este candidato já completou a avaliação',
        completed: true
      });
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
