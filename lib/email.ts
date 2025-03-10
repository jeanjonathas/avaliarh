import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configurações do serviço de email
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Resultado do envio de email
interface EmailResult {
  success: boolean;
  error?: string;
  previewUrl?: string | false; // URL para visualizar o email (apenas em desenvolvimento)
}

// Obter configurações de email do ambiente
function getEmailConfig(): EmailConfig {
  // Verificar se estamos em ambiente de produção
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Usar configurações de produção dos env vars
    return {
      host: process.env.EMAIL_HOST || '',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
      from: process.env.EMAIL_FROM || 'noreply@avaliarh.com',
    };
  } else {
    // Em desenvolvimento, usar Ethereal (serviço de teste do Nodemailer)
    return {
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email', // Será substituído pelo createTestAccount
        pass: 'ethereal.pass',
      },
      from: 'desenvolvimento@avaliarh.com',
    };
  }
}

// Criar transportador de email
async function createTransporter() {
  const config = getEmailConfig();
  
  // Se não estamos em produção, criar uma conta de teste
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      config.auth.user = testAccount.user;
      config.auth.pass = testAccount.pass;
    } catch (error) {
      console.error('Erro ao criar conta de teste Ethereal:', error);
    }
  }
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

// Formatar data de expiração em português
function formatExpirationDate(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

// Enviar email de convite para o candidato
export async function sendInviteEmail(
  to: string, 
  name: string, 
  inviteCode: string,
  expirationDate?: Date
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter();
    const config = getEmailConfig();
    
    // Texto de expiração (se aplicável)
    const expirationText = expirationDate 
      ? `Este código expira em ${formatExpirationDate(expirationDate)}.`
      : '';
    
    // Conteúdo HTML do email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 10px;">AvaliaRH</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Sistema de Avaliação de Candidatos</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>Olá <strong>${name}</strong>,</p>
          <p>Você foi convidado(a) para participar do nosso processo seletivo. Para iniciar sua avaliação, utilize o código de convite abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f5f5f5; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">
              ${inviteCode}
            </div>
            ${expirationDate ? `<p style="color: #e74c3c; margin-top: 10px;">${expirationText}</p>` : ''}
          </div>
          
          <p>Para iniciar o teste, acesse <a href="https://avaliarh.com" style="color: #3498db; text-decoration: none;">avaliarh.com</a> e insira o código acima.</p>
          
          <p>Boa sorte!</p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; color: #7f8c8d; font-size: 12px;">
          <p>Este é um email automático. Por favor, não responda a esta mensagem.</p>
          <p>&copy; ${new Date().getFullYear()} AvaliaRH - Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    // Versão em texto simples do email
    const textContent = `
      AvaliaRH - Sistema de Avaliação de Candidatos
      
      Olá ${name},
      
      Você foi convidado(a) para participar do nosso processo seletivo. Para iniciar sua avaliação, utilize o código de convite abaixo:
      
      ${inviteCode}
      
      ${expirationText}
      
      Para iniciar o teste, acesse avaliarh.com e insira o código acima.
      
      Boa sorte!
      
      Este é um email automático. Por favor, não responda a esta mensagem.
      &copy; ${new Date().getFullYear()} AvaliaRH - Todos os direitos reservados.
    `;
    
    // Enviar o email
    const info = await transporter.sendMail({
      from: `"AvaliaRH" <${config.from}>`,
      to,
      subject: 'Convite para Avaliação de Candidato',
      text: textContent,
      html: htmlContent,
    });
    
    // Em desenvolvimento, retornar URL de visualização do Ethereal
    const previewUrl = process.env.NODE_ENV !== 'production' 
      ? nodemailer.getTestMessageUrl(info)
      : undefined;
    
    return {
      success: true,
      previewUrl,
    };
    
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar email',
    };
  }
}
