import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import handler from '../../pages/api/candidates/validate-invite';

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

describe('Validate Invite API', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockPrisma: any;
  
  beforeEach(() => {
    // Resetar mocks
    jest.clearAllMocks();
    
    // Mock de request e response
    req = {
      method: 'POST',
      body: { inviteCode: 'ABCDEF' },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    // Obter a instância mockada do Prisma
    mockPrisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});
  });
  
  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Método não permitido' });
  });
  
  it('should return 400 if inviteCode is missing', async () => {
    req.body = {};
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Código de convite é obrigatório' });
  });
  
  it('should return 404 if candidate is not found', async () => {
    mockPrisma.candidate.findUnique.mockResolvedValue(null);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: 'ABCDEF' },
      select: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Código de convite inválido' });
  });
  
  it('should return 400 if invite has expired', async () => {
    // Data de expiração no passado
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    mockPrisma.candidate.findUnique.mockResolvedValue({
      id: 'test-id',
      inviteExpires: pastDate,
      inviteAttempts: 0,
      completed: false,
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: { inviteAttempts: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'O código de convite expirou' });
  });
  
  it('should return 400 if max attempts exceeded', async () => {
    mockPrisma.candidate.findUnique.mockResolvedValue({
      id: 'test-id',
      inviteExpires: new Date(Date.now() + 86400000), // Expira amanhã
      inviteAttempts: 5, // Já atingiu o limite de tentativas
      completed: false,
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: { inviteAttempts: 6 },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ 
      error: 'Número máximo de tentativas excedido. Entre em contato com o administrador.'
    });
  });
  
  it('should return 400 if candidate already completed the test', async () => {
    mockPrisma.candidate.findUnique.mockResolvedValue({
      id: 'test-id',
      inviteExpires: new Date(Date.now() + 86400000), // Expira amanhã
      inviteAttempts: 0,
      completed: true, // Já completou o teste
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Este candidato já completou a avaliação' });
  });
  
  it('should validate invite successfully and reset attempts', async () => {
    const candidate = {
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123456789',
      position: 'Developer',
      inviteExpires: new Date(Date.now() + 86400000), // Expira amanhã
      inviteAttempts: 2,
      completed: false,
    };
    
    mockPrisma.candidate.findUnique.mockResolvedValue(candidate);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    // Verificar se incrementou as tentativas
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: { inviteAttempts: 3 },
    });
    
    // Verificar se resetou as tentativas após sucesso
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: { inviteAttempts: 0 },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      candidate: {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        position: 'Developer',
      },
    });
  });
  
  it('should handle errors gracefully', async () => {
    mockPrisma.candidate.findUnique.mockRejectedValue(new Error('Database error'));
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao validar convite' });
  });
});
