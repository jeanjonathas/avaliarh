import { sendInviteEmail } from '../../lib/email';
import nodemailer from 'nodemailer';

// Mock do nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
    }),
  }),
  createTestAccount: jest.fn().mockResolvedValue({
    user: 'test-user',
    pass: 'test-pass',
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
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Usar Object.defineProperty para definir NODE_ENV
    process.env.NODE_ENV = 'test';
  });
  
  afterEach(() => {
    // Restaurar o ambiente original após cada teste
    process.env = { ...originalEnv };
  });

  describe('sendInviteEmail', () => {
    it('should send an invite email successfully', async () => {
      const result = await sendInviteEmail(
        'test@example.com',
        'Test User',
        '1234'
      );

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.previewUrl).toBeDefined();
    });

    it('should include expiration date in email when provided', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      });

      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: mockSendMail,
      });

      await sendInviteEmail(
        'test@example.com',
        'Test User',
        '1234',
        expirationDate
      );

      // Verificar se o email contém informações sobre a expiração
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('expira');
      expect(emailCall.text).toContain('expira');
    });

    it('should handle errors when sending email', async () => {
      // Simular um erro no envio do email
      const mockError = new Error('Failed to send email');
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(mockError),
      });

      const result = await sendInviteEmail(
        'test@example.com',
        'Test User',
        '1234'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send email');
    });

    it('should use production configuration when in production environment', async () => {
      // Simular ambiente de produção
      process.env.NODE_ENV = 'production';
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_SECURE = 'false';
      process.env.EMAIL_USER = 'prod-user';
      process.env.EMAIL_PASSWORD = 'prod-pass';
      process.env.EMAIL_FROM = 'noreply@example.com';

      await sendInviteEmail(
        'test@example.com',
        'Test User',
        '1234'
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
