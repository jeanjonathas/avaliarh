import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

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
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do teste inválido' })
  }

  // Verificar se o teste existe
  try {
    const testExists = await prisma.test.findUnique({
      where: {
        id: id
      }
    });

    if (!testExists) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar teste:', error);
    return res.status(500).json({ error: 'Erro ao verificar teste' });
  }

  // Adicionar estágio ao teste (POST)
  if (req.method === 'POST') {
    try {
      const { title, description } = req.body;

      // Se estamos recebendo um stageId, é porque queremos associar um estágio existente
      if (req.body.stageId) {
        const { stageId, order } = req.body;
        
        if (!stageId) {
          return res.status(400).json({ error: 'ID do estágio é obrigatório' });
        }

        console.log('Recebido stageId:', stageId);
        console.log('Recebido order:', order);
        console.log('Tipo do stageId:', typeof stageId);
        console.log('Tipo do id do teste:', typeof id);

        try {
          // Verificar se o estágio existe usando Prisma Client
          console.log('Verificando se o estágio existe...');
          const stage = await prisma.stage.findUnique({
            where: {
              id: stageId
            }
          });
          
          console.log('Resultado da verificação do estágio:', stage);

          if (!stage) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
          }

          // Verificar se o estágio já está associado ao teste
          console.log('Verificando se o estágio já está associado ao teste...');
          const existingTestStage = await prisma.testStage.findFirst({
            where: {
              testId: id,
              stageId: stageId
            }
          });
          
          console.log('Associação existente:', existingTestStage);
          
          if (existingTestStage) {
            return res.status(400).json({ error: 'Este estágio já está associado a este teste' });
          }

          // Criar a associação usando Prisma Client
          console.log('Criando associação entre estágio e teste...');
          const testStage = await prisma.testStage.create({
            data: {
              testId: id,
              stageId: stageId,
              order: order || 0
            }
          });
          
          console.log('Associação criada com sucesso:', testStage);
          return res.status(201).json(testStage);
        } catch (error) {
          console.error('Erro ao processar requisição:', error);
          return res.status(500).json({ error: 'Erro ao processar requisição: ' + error.message });
        }
      } 
      // Se não recebemos um stageId, é porque queremos criar um novo estágio
      else if (title) {
        // Criar um novo estágio
        try {
          // 1. Criar o estágio primeiro
          const newStage = await prisma.stage.create({
            data: {
              title: title,
              description: description || null,
              order: 0
            }
          });
          
          console.log('Novo estágio criado:', newStage);
          
          // 2. Associar o estágio ao teste na tabela TestStage
          const testStage = await prisma.testStage.create({
            data: {
              testId: id,
              stageId: newStage.id,
              order: 0
            }
          });
          
          console.log('Novo estágio criado e associado ao teste:', testStage);
          return res.status(201).json({ success: true, stageId: newStage.id });
        } catch (insertError) {
          console.error('Erro ao criar novo estágio:', insertError);
          return res.status(500).json({ error: 'Erro ao criar novo estágio: ' + insertError.message });
        }
      } else {
        return res.status(400).json({ error: 'É necessário fornecer um stageId existente ou um título para criar um novo estágio' });
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro ao processar requisição: ' + error.message });
    }
  } 
  // Obter todos os estágios de um teste (GET)
  else if (req.method === 'GET') {
    try {
      // Buscar estágios usando a tabela de junção TestStage
      // Adicionando logs para debug
      console.log('Buscando estágios para o teste:', id);
      
      const stages = await prisma.testStage.findMany({
        where: {
          testId: id
        },
        include: {
          stage: true
        },
        orderBy: {
          order: 'asc'
        }
      });
      
      console.log('Resultado da busca de estágios:', stages);
      
      // Se não encontrar nenhum estágio usando a nova tabela, tente buscar pelo método antigo
      if (!stages || stages.length === 0) {
        console.log('Nenhum estágio encontrado na tabela TestStage, tentando método antigo');
        
        const oldStages = await prisma.stage.findMany({
          where: {
            testId: id
          },
          orderBy: {
            order: 'asc'
          }
        });
        
        console.log('Estágios encontrados pelo método antigo:', oldStages);
        
        // Se encontrar estágios pelo método antigo, migre-os para a nova estrutura
        if (oldStages && oldStages.length > 0) {
          console.log('Migrando estágios antigos para a nova estrutura');
          // Migrar estágios antigos para a nova estrutura
          for (let i = 0; i < oldStages.length; i++) {
            const stage = oldStages[i];
            
            // Verificar se já existe um registro na tabela TestStage
            const existingTestStage = await prisma.testStage.findFirst({
              where: {
                testId: id,
                stageId: stage.id
              }
            });
            
            if (!existingTestStage) {
              console.log('Criando registro na tabela TestStage para o estágio:', stage.id);
              // Criar registro na tabela TestStage
              await prisma.testStage.create({
                data: {
                  testId: id,
                  stageId: stage.id,
                  order: stage.order || 0
                }
              });
            }
          }
          
          return res.status(200).json(oldStages);
        }
      }
      
      console.log('Etapas encontradas para o teste:', id, stages);
      return res.status(200).json(stages);
    } catch (error) {
      console.error('Erro ao buscar estágios do teste:', error);
      return res.status(500).json({ error: 'Erro ao buscar estágios do teste' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
