#!/bin/bash

# Script para corrigir pontos e vírgulas faltantes nas importações de authOptions em arquivos API
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando correção de pontos e vírgulas nas importações em arquivos API...${NC}"

# Encontrar todos os arquivos API que têm a importação de authOptions sem ponto e vírgula
FILES=$(grep -l "import { authOptions } from '@/pages/api/auth/\[...nextauth\]'/" --include="*.ts" /home/jean/avaliarh/pages/api)

# Contador de arquivos corrigidos
COUNT=0

for FILE in $FILES; do
  echo -e "${YELLOW}Corrigindo: ${FILE}${NC}"
  
  # Substituir a importação sem ponto e vírgula por uma com ponto e vírgula
  sed -i "s/import { authOptions } from '@\/pages\/api\/auth\/\[...nextauth\]'\/$/import { authOptions } from '@\/pages\/api\/auth\/\[...nextauth\]';/" "$FILE"
  
  echo -e "${GREEN}  Arquivo corrigido com sucesso!${NC}"
  COUNT=$((COUNT+1))
done

echo -e "${GREEN}Correção concluída! $COUNT arquivos foram corrigidos.${NC}"
