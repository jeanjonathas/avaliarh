#!/bin/bash

# Script para verificar se todos os arquivos foram atualizados corretamente
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Verificando atualizações de autenticação...${NC}"

# Verificar importações de getSession
IMPORT_FILES=$(grep -r "import.*getSession.*from 'next-auth/react'" --include="*.tsx" --include="*.ts" /home/jean/avaliarh/pages)

if [ -n "$IMPORT_FILES" ]; then
  echo -e "${YELLOW}Arquivos que ainda importam getSession:${NC}"
  echo "$IMPORT_FILES"
else
  echo -e "${GREEN}Todos os arquivos foram atualizados para não importar getSession.${NC}"
fi

# Verificar uso de getSession()
USAGE_FILES=$(grep -r "getSession(" --include="*.tsx" --include="*.ts" /home/jean/avaliarh/pages | grep -v "// Verificar autenticação usando getServerSession em vez de getSession")

if [ -n "$USAGE_FILES" ]; then
  echo -e "${YELLOW}Arquivos que ainda usam getSession():${NC}"
  echo "$USAGE_FILES"
else
  echo -e "${GREEN}Todos os arquivos foram atualizados para não usar getSession().${NC}"
fi

# Verificar pontos e vírgulas faltantes
SEMICOLON_FILES=$(grep -r "import { authOptions } from '@/pages/api/auth/\[...nextauth\]'/" --include="*.tsx" --include="*.ts" /home/jean/avaliarh/pages)

if [ -n "$SEMICOLON_FILES" ]; then
  echo -e "${YELLOW}Arquivos com pontos e vírgulas faltantes:${NC}"
  echo "$SEMICOLON_FILES"
else
  echo -e "${GREEN}Todos os arquivos têm pontos e vírgulas corretos nas importações.${NC}"
fi

echo -e "${GREEN}Verificação concluída!${NC}"
