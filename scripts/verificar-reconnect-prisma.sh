#!/bin/bash

# Script para verificar arquivos que importam reconnectPrisma mas não o utilizam
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Verificando arquivos que importam reconnectPrisma...${NC}"

# Encontrar todos os arquivos que importam reconnectPrisma mas não o utilizam
ARQUIVOS=$(comm -23 <(find /home/jean/avaliarh/pages -name "*.ts" -exec grep -l "import.*reconnectPrisma.*from '@/lib/prisma'" {} \; | sort) <(find /home/jean/avaliarh/pages -name "*.ts" -exec grep -l "reconnectPrisma()" {} \; | sort))

# Contador de arquivos
TOTAL=$(echo "$ARQUIVOS" | wc -l)

echo -e "${YELLOW}Encontrados $TOTAL arquivos que importam reconnectPrisma mas não o utilizam:${NC}"

# Listar os arquivos com numeração
echo "$ARQUIVOS" | nl

echo -e "\n${GREEN}Para cada arquivo, você pode:${NC}"
echo -e "1. ${YELLOW}Adicionar reconnectPrisma() antes das operações do Prisma${NC}"
echo -e "2. ${YELLOW}Remover a importação se não for necessária${NC}"
echo -e "3. ${YELLOW}Corrigir pontos e vírgulas faltantes nas importações${NC}"

echo -e "\n${GREEN}Exemplo de como adicionar reconnectPrisma():${NC}"
echo -e "// Antes da primeira operação com o Prisma"
echo -e "await reconnectPrisma();"
echo -e "const resultado = await prisma.algumaTabela.findUnique({ ... });"

echo -e "\n${GREEN}Exemplo de como corrigir importações:${NC}"
echo -e "import { NextApiRequest, NextApiResponse } from 'next';"
echo -e "import { getServerSession } from 'next-auth/next';"
echo -e "import { prisma, reconnectPrisma } from '@/lib/prisma';"
echo -e "import { authOptions } from '@/pages/api/auth/[...nextauth]';"
