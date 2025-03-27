import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Check authentication
  await reconnectPrisma()
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Get user and check if they are an admin
  const user = await prisma.$queryRaw`
    SELECT u.id, u."companyId", r.name as role
    FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = ${session.user.id}
  `;

  if (!Array.isArray(user) || user.length === 0 || user[0].role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB max file size
    });

    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          res.status(500).json({ error: 'Erro ao processar o upload' });
          return resolve(true);
        }

        try {
          const file = files.file?.[0];
          const type = fields.type?.[0];

          if (!file) {
            res.status(400).json({ error: 'Nenhum arquivo enviado' });
            return resolve(true);
          }

          // Generate a unique filename
          const fileExtension = path.extname(file.originalFilename || '');
          const fileName = `${uuidv4()}${fileExtension}`;
          
          // Move the file to the final destination with the new name
          const finalPath = path.join(uploadDir, fileName);
          fs.renameSync(file.filepath, finalPath);

          // Create a public URL for the file
          const publicUrl = `/uploads/${fileName}`;

          // Return the URL to the client
          res.status(200).json({ url: publicUrl });
          return resolve(true);
        } catch (error) {
          console.error('Error handling upload:', error);
          res.status(500).json({ error: 'Erro ao processar o upload' });
          return resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error in upload handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
