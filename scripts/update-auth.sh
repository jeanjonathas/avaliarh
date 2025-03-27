#!/bin/bash

# Script para atualizar a autenticação de getSession para getServerSession
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando atualização de autenticação...${NC}"

# Encontrar todos os arquivos que usam getSession
FILES=$(find /home/jean/avaliarh/pages/api -type f -name "*.ts" -exec grep -l "getSession" {} \;)

# Contador de arquivos atualizados
COUNT=0

for FILE in $FILES; do
  echo -e "${YELLOW}Processando: ${FILE}${NC}"
  
  # Verificar se o arquivo já usa getServerSession
  if grep -q "getServerSession" "$FILE"; then
    echo -e "${YELLOW}  Arquivo já usa getServerSession, pulando...${NC}"
    continue
  fi
  
  # Substituir a importação
  sed -i 's/import { getSession } from '\''next-auth\/react'\''/import { getServerSession } from '\''next-auth\/next'\''/' "$FILE"
  
  # Verificar se o arquivo já importa authOptions
  if ! grep -q "authOptions" "$FILE"; then
    # Adicionar a importação de authOptions após a importação do prisma
    if grep -q "import.*prisma" "$FILE"; then
      sed -i '/import.*prisma/ a import { authOptions } from '\''@\/pages\/api\/auth\/[...nextauth]'\''/' "$FILE"
    else
      # Se não encontrar importação do prisma, adicionar após a primeira importação
      sed -i '1,/import/ s/import.*$/&\nimport { authOptions } from '\''@\/pages\/api\/auth\/[...nextauth]'\''/' "$FILE"
    fi
  fi
  
  # Substituir a chamada getSession por getServerSession
  sed -i 's/const session = await getSession({ req })/const session = await getServerSession(req, res, authOptions)/' "$FILE"
  sed -i 's/await getSession({ req })/await getServerSession(req, res, authOptions)/' "$FILE"
  
  # Adicionar reconnectPrisma se o arquivo importa prisma mas não usa reconnectPrisma
  if grep -q "import.*prisma" "$FILE" && ! grep -q "reconnectPrisma" "$FILE"; then
    # Substituir a importação do prisma para incluir reconnectPrisma
    sed -i 's/import { prisma } from/import { prisma, reconnectPrisma } from/' "$FILE"
    
    # Adicionar chamada para reconnectPrisma antes da autenticação
    sed -i 's/const session = await getServerSession/await reconnectPrisma()\n  const session = await getServerSession/' "$FILE"
  fi
  
  # Adicionar log de erro de autenticação
  sed -i 's/return res.status(401).json({ message: '\''Não autenticado'\'' })/console.log("[AUTH ERROR] Não autenticado no endpoint")\n      return res.status(401).json({ message: '\''Não autenticado'\'' })/' "$FILE"
  
  echo -e "${GREEN}  Arquivo atualizado com sucesso!${NC}"
  COUNT=$((COUNT+1))
done

echo -e "${GREEN}Atualização concluída! $COUNT arquivos foram atualizados.${NC}"
echo -e "${YELLOW}Importante: Verifique manualmente os arquivos atualizados para garantir que as substituições foram feitas corretamente.${NC}"
