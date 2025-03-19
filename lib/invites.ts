import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gera um código de convite único com 6 caracteres alfanuméricos
 * O formato segue o padrão como TNLBT6 (letras maiúsculas e números)
 * 
 * @returns Promise<string> Código de convite único
 */
export async function generateUniqueInviteCode(): Promise<string> {
  let isUnique = false;
  let inviteCode = '';
  
  while (!isUnique) {
    // Gerar um código alfanumérico de 6 caracteres
    // Usando caracteres que são fáceis de ler e digitar (sem caracteres ambíguos como 0/O, 1/I/l)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    
    // Gerar 6 caracteres aleatórios
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    inviteCode = code;
    
    // Verificar se o código já está em uso por algum candidato (em qualquer empresa)
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        inviteCode: inviteCode
      }
    });
    
    // Verificar se o código já foi usado anteriormente (histórico global)
    const usedInviteCode = await prisma.usedInviteCode.findUnique({
      where: {
        code: inviteCode
      }
    });
    
    // O código é único se não existir nenhum candidato com ele e não estiver no histórico
    if (!existingCandidate && !usedInviteCode) {
      isUnique = true;
    }
  }
  
  return inviteCode;
}

/**
 * Salva um código de convite usado no histórico
 * 
 * @param code Código de convite a ser salvo
 * @param candidateId ID do candidato
 * @param companyId ID da empresa
 * @param testId ID do teste
 */
export async function saveUsedInviteCode(
  code: string,
  candidateId: string,
  companyId: string,
  testId: string
): Promise<void> {
  try {
    await prisma.usedInviteCode.create({
      data: {
        code,
        usedAt: new Date(),
        candidateId,
        companyId,
        testId
      }
    });
    console.log(`Código ${code} salvo no histórico`);
  } catch (error) {
    // Se o código já estiver no histórico, apenas ignorar o erro
    console.log(`Código ${code} já existe no histórico ou erro ao salvar: ${error}`);
  }
}
