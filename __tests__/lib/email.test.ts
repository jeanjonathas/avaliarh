import { sendInviteEmail } from '../../lib/email';
import nodemailer from 'nodemailer';

// Mock do nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      envelope: {},
      accepted: ['test@example.com'],
      rejected: [],
      pending: [],
      response: 'OK',
    }),
  }),
  getTestMessageUrl: jest.fn().mockReturnValue('https://ethereal.email/message/test'),
}));

// Mock do módulo date-fns
jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('01 de março de 2025 às 10:00'),
}));

// Mock do módulo date-fns/locale
jest.mock('date-fns/locale', () => ({
  ptBR: {},
}));

describe('Email Service', () => {
  let originalNodeEnv: string | undefined;
  
  beforeAll(() => {
    // Guardar o valor original de NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });
  
  afterAll(() => {
    // Restaurar o valor original de NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Usar Object.defineProperty para evitar erro de propriedade read-only
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test' });
  });

  describe('sendInviteEmail', () => {
    it('should send invite email successfully', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        envelope: {},
        accepted: ['test@example.com'],
        rejected: [],
        pending: [],
        response: 'OK',
      });
      
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: mockSendMail,
      });

      const result = await sendInviteEmail(
        'test@example.com',
        'Test User',
        'ABCDEF',
        new Date()
      );
      
      expect(result.success).toBe(true);
      expect(result.previewUrl).toBeDefined();
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Convite'),
        html: expect.stringContaining('ABCDEF'),
      }));
    });

    it('should include expiration date in email when provided', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      
      const result = await sendInviteEmail(
        'test@example.com',
        'Test User',
        'ABCDEF',
        expirationDate
      );
      
      expect(result.success).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalled();
      
      // Verificar se a data de expiração está incluída no email
      const sendMailMock = nodemailer.createTransport().sendMail as jest.Mock;
      const emailContent = sendMailMock.mock.calls[0][0].html;
      
      expect(emailContent).toContain(expirationDate.toLocaleDateString('pt-BR'));
    });
    
    it('should handle errors when sending invite email', async () => {
      // Simular um erro ao enviar o email
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('Failed to send email')),
      });
      
      const result = await sendInviteEmail(
        'test@example.com',
        'Test User',
        'ABCDEF'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use production configuration when in production environment', async () => {
      // Simular ambiente de produção
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production' });
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_SECURE = 'false';
      process.env.EMAIL_USER = 'prod-user';
      process.env.EMAIL_PASSWORD = 'prod-pass';
      process.env.EMAIL_FROM = 'noreply@example.com';

      await sendInviteEmail(
        'test@example.com',
        'Test User',
        'ABCDEF'
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'prod-user',
          pass: 'prod-pass',
        },
      });
    });
  });
});
