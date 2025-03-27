import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]'/

// Configuração para permitir upload de arquivos
export const config = {
  api: {
    bodyParser: false,
  },
};



// Função para criar diretório se não existir
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar a sessão do usuário
    await reconnectPrisma()
  const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Buscar o usuário e verificar se tem permissão
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o usuário é admin ou instrutor
    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'INSTRUCTOR' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }

    // Criar diretório específico para a empresa
    const companyId = user.company.id;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials', companyId);
    ensureDirectoryExists(uploadDir);

    // Configurar o formidable para upload
    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    // Processar o upload
    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Erro no upload:', err);
          res.status(500).json({ error: 'Erro ao processar o upload' });
          return resolve(true);
        }

        try {
          // Obter o arquivo
          const file = files.file?.[0];
          if (!file) {
            res.status(400).json({ error: 'Nenhum arquivo enviado' });
            return resolve(true);
          }

          // Gerar um nome de arquivo único
          const timestamp = Date.now();
          const originalFilename = file.originalFilename || 'arquivo';
          const fileExtension = path.extname(originalFilename);
          const newFilename = `${timestamp}_${path.basename(originalFilename, fileExtension)}${fileExtension}`;
          
          // Caminho completo do arquivo
          const finalPath = path.join(uploadDir, newFilename);
          
          // Renomear o arquivo para o nome único
          fs.renameSync(file.filepath, finalPath);
          
          // Caminho relativo para acesso via URL
          const relativePath = `/uploads/materials/${companyId}/${newFilename}`;
          
          // Responder com as informações do arquivo
          res.status(200).json({
            success: true,
            file: {
              fileName: originalFilename,
              filePath: relativePath,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          });
          
          return resolve(true);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          res.status(500).json({ error: 'Erro ao processar o arquivo' });
          return resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
