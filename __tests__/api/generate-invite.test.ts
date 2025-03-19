import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import * as emailService from '../../lib/email';
import * as inviteService from '../../lib/invites';

// Mock do módulo de email
jest.mock('../../lib/email', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue({
    success: true,
    previewUrl: 'https://ethereal.email/message/test',
  }),
}));

// Mock do módulo de convites
jest.mock('../../lib/invites', () => ({
  generateUniqueInviteCode: jest.fn().mockResolvedValue('ABCDEF'),
  saveUsedInviteCode: jest.fn().mockResolvedValue(undefined),
}));

// Mock do Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    candidate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock do next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock do auth options
jest.mock('../../lib/auth', () => ({
  authOptions: {},
}));

// Importar o handler depois dos mocks
const handler = require('../../pages/api/admin/candidates/generate-invite').default;

describe('Generate Invite API', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockPrisma: any;
  
  beforeEach(() => {
    // Resetar mocks
    jest.clearAllMocks();
    
    // Mock de request e response
    req = {
      method: 'POST',
      body: { 
        candidateId: 'test-candidate-id',
        expirationDays: 7,
        testId: 'test-id'
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    // Obter a instância mockada do Prisma
    mockPrisma = new PrismaClient();
    
    // Mock da sessão autenticada
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' }
    });

    // Mock para o teste existir
    mockPrisma.tests = {
      findUnique: jest.fn().mockResolvedValue({ id: 'test-id', name: 'Test' })
    };
  });
  
  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Não autorizado' });
  });
  
  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Método não permitido' });
  });
  
  it('should return 400 if candidateId is missing', async () => {
    req.body = {};
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'ID do candidato é obrigatório' });
  });
  
  it('should return 404 if candidate is not found', async () => {
    mockPrisma.candidate.findUnique.mockResolvedValue(null);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-candidate-id' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Candidato não encontrado' });
  });
  
  it('should generate a unique invite code', async () => {
    // Primeiro retorna um candidato existente, depois null (para simular um código único na segunda tentativa)
    mockPrisma.candidate.findUnique
      .mockResolvedValueOnce({ id: 'test-candidate-id', name: 'Test User', email: 'test@example.com' })
      .mockResolvedValueOnce({ id: 'existing-candidate' })
      .mockResolvedValueOnce(null);
    
    mockPrisma.candidate.update.mockResolvedValue({
      id: 'test-candidate-id',
      name: 'Test User',
      email: 'test@example.com',
      inviteCode: '1234',
      inviteSent: true,
      inviteExpires: expect.any(Date),
      inviteAttempts: 0,
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    // Deve ter chamado findUnique pelo menos 3 vezes
    // 1. Para encontrar o candidato pelo ID
    // 2. Para verificar se o código já existe
    // 3. Para verificar se o segundo código é único
    expect(mockPrisma.candidate.findUnique).toHaveBeenCalledTimes(3);
    
    // Verificar se atualizou o candidato com o código de convite
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'test-candidate-id' },
      data: {
        inviteCode: expect.any(String),
        inviteSent: true,
        inviteExpires: expect.any(Date),
        inviteAttempts: 0,
      },
    });
    
    // Verificar se enviou o email
    expect(emailService.sendInviteEmail).toHaveBeenCalledWith(
      'test@example.com',
      'Test User',
      expect.any(String),
      expect.any(Date)
    );
    
    // Verificar resposta
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      inviteCode: expect.any(String),
      inviteExpires: expect.any(Date),
      emailSent: true,
      emailPreviewUrl: 'https://ethereal.email/message/test',
      candidate: expect.any(Object),
    });
  });
  
  it('should handle email sending failure', async () => {
    mockPrisma.candidate.findUnique
      .mockResolvedValueOnce({ id: 'test-candidate-id', name: 'Test User', email: 'test@example.com' })
      .mockResolvedValueOnce(null);
    
    mockPrisma.candidate.update.mockResolvedValue({
      id: 'test-candidate-id',
      inviteCode: '1234',
    });
    
    // Simular falha no envio de email
    (emailService.sendInviteEmail as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Failed to send email',
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      inviteCode: expect.any(String),
      inviteExpires: expect.any(Date),
      emailSent: false,
      candidate: expect.any(Object),
    });
  });
  
  it('should handle database errors gracefully', async () => {
    mockPrisma.candidate.findUnique.mockRejectedValue(new Error('Database error'));
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao gerar convite' });
  });
  
  it('should use default expiration days if not provided', async () => {
    req.body = { candidateId: 'test-candidate-id' }; // Sem expirationDays
    
    mockPrisma.candidate.findUnique
      .mockResolvedValueOnce({ id: 'test-candidate-id', name: 'Test User', email: 'test@example.com' })
      .mockResolvedValueOnce(null);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    // Verificar se a data de expiração foi definida para 7 dias no futuro
    const updateCall = mockPrisma.candidate.update.mock.calls[0][0];
    const today = new Date();
    const expectedExpiration = new Date(today);
    expectedExpiration.setDate(today.getDate() + 7);
    
    // Comparar apenas o dia (para evitar problemas com milissegundos)
    expect(updateCall.data.inviteExpires.getDate()).toBe(expectedExpiration.getDate());
  });
});
