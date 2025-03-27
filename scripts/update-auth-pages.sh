#!/bin/bash

# Script para atualizar a autenticação de getSession para getServerSession nas páginas
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando atualização de autenticação nas páginas...${NC}"

# Encontrar todos os arquivos que usam getSession
FILES=$(find /home/jean/avaliarh/pages -type f -name "*.tsx" -exec grep -l "getSession" {} \;)

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
  sed -i 's/import { getSession, useSession } from '\''next-auth\/react'\''/import { useSession } from '\''next-auth\/react'\''\nimport { getServerSession } from '\''next-auth\/next'\''/' "$FILE"
  sed -i 's/import { signIn, getSession } from '\''next-auth\/react'\''/import { signIn } from '\''next-auth\/react'\''\nimport { getServerSession } from '\''next-auth\/next'\''/' "$FILE"
  sed -i 's/import { useSession, getSession } from '\''next-auth\/react'\''/import { useSession } from '\''next-auth\/react'\''\nimport { getServerSession } from '\''next-auth\/next'\''/' "$FILE"
  sed -i 's/import { getSession, useSession, signOut } from '\''next-auth\/react'\''/import { useSession, signOut } from '\''next-auth\/react'\''\nimport { getServerSession } from '\''next-auth\/next'\''/' "$FILE"
  
  # Adicionar a importação de authOptions após a importação do getServerSession
  if ! grep -q "authOptions" "$FILE"; then
    sed -i '/import { getServerSession } from '\''next-auth\/next'\''/a import { authOptions } from '\''@\/pages\/api\/auth\/[...nextauth]'\''/' "$FILE"
  fi
  
  # Substituir a chamada getSession por getServerSession
  sed -i 's/const session = await getSession(context)/const session = await getServerSession(context.req, context.res, authOptions)/' "$FILE"
  sed -i 's/await getSession(context)/await getServerSession(context.req, context.res, authOptions)/' "$FILE"
  
  echo -e "${GREEN}  Arquivo atualizado com sucesso!${NC}"
  COUNT=$((COUNT+1))
done

echo -e "${GREEN}Atualização concluída! $COUNT arquivos foram atualizados.${NC}"
echo -e "${YELLOW}Importante: Verifique manualmente os arquivos atualizados para garantir que as substituições foram feitas corretamente.${NC}"
