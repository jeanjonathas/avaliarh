import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Função para salvar o arquivo
const saveFile = async (file, candidateId) => {
  // Criar diretório de uploads se não existir
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  // Gerar nome de arquivo único
  const timestamp = new Date().getTime()
  const fileExtension = path.extname(file.originalFilename)
  const fileName = `${candidateId}_${timestamp}${fileExtension}`
  const filePath = path.join(uploadDir, fileName)

  // Copiar o arquivo para o diretório de uploads
  const data = fs.readFileSync(file.filepath)
  fs.writeFileSync(filePath, data)
  fs.unlinkSync(file.filepath)

  // Retornar o caminho relativo para salvar no banco de dados
  return `/uploads/${fileName}`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de candidato inválido' })
  }

  if (req.method === 'POST') {
    try {
      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: { id: id as string },
      })

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      // Processar o upload do arquivo
      const form = new formidable.IncomingForm()
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao processar o arquivo' })
        }

        const file = files.resume
        if (!file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' })
        }

        try {
          // Salvar o arquivo e obter o caminho
          const filePath = await saveFile(file, id)

          // Atualizar o candidato com o caminho do arquivo
          const updatedCandidate = await prisma.candidate.update({
            where: { id: id as string },
            data: { resumeFile: filePath },
          })

          return res.status(200).json({ success: true, filePath, candidate: updatedCandidate })
        } catch (error) {
          console.error('Erro ao salvar arquivo:', error)
          return res.status(500).json({ error: 'Erro ao salvar arquivo' })
        }
      })
    } catch (error) {
      console.error('Erro no upload de currículo:', error)
      return res.status(500).json({ error: 'Erro no upload de currículo' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
