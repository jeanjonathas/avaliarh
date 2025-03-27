#!/bin/bash

# Script para identificar e corrigir arquivos que importam reconnectPrisma mas não o utilizam
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Verificando arquivos que importam reconnectPrisma...${NC}"

# Encontrar todos os arquivos que importam reconnectPrisma
IMPORT_FILES=$(grep -l "import.*reconnectPrisma.*from '@/lib/prisma'" --include="*.ts" --include="*.tsx" /home/jean/avaliarh/pages)

# Contador de arquivos verificados e corrigidos
CHECKED=0
FIXED=0

for FILE in $IMPORT_FILES; do
  CHECKED=$((CHECKED+1))
  
  # Verificar se o arquivo usa reconnectPrisma
  if ! grep -q "reconnectPrisma()" "$FILE"; then
    echo -e "${YELLOW}Arquivo importa mas não usa reconnectPrisma: ${FILE}${NC}"
    
    # Verificar se o arquivo faz operações com o prisma
    if grep -q "prisma\." "$FILE" || grep -q "prisma\$" "$FILE"; then
      echo -e "${YELLOW}  Arquivo faz operações com o prisma, adicionando reconnectPrisma()...${NC}"
      
      # Identificar o padrão de uso do prisma para inserir o reconnectPrisma antes
      FIRST_PRISMA_LINE=$(grep -n "prisma\." "$FILE" | head -1 | cut -d':' -f1)
      
      if [ -z "$FIRST_PRISMA_LINE" ]; then
        FIRST_PRISMA_LINE=$(grep -n "prisma\$" "$FILE" | head -1 | cut -d':' -f1)
      fi
      
      if [ -n "$FIRST_PRISMA_LINE" ]; then
        # Calcular a linha anterior para inserir o reconnectPrisma
        INSERT_LINE=$((FIRST_PRISMA_LINE - 1))
        
        # Determinar a indentação
        INDENT=$(sed -n "${INSERT_LINE}p" "$FILE" | sed -E 's/^([[:space:]]*).*$/\1/')
        
        # Inserir a linha com reconnectPrisma
        sed -i "${INSERT_LINE}a\\${INDENT}await reconnectPrisma();" "$FILE"
        
        echo -e "${GREEN}  Adicionado reconnectPrisma() antes da linha $FIRST_PRISMA_LINE${NC}"
        FIXED=$((FIXED+1))
      else
        echo -e "${RED}  Não foi possível identificar onde adicionar reconnectPrisma()${NC}"
      fi
    else
      echo -e "${YELLOW}  Arquivo não faz operações com o prisma, removendo importação...${NC}"
      
      # Remover a importação de reconnectPrisma
      sed -i 's/import { prisma, reconnectPrisma } from/import { prisma } from/g' "$FILE"
      
      echo -e "${GREEN}  Removida importação desnecessária de reconnectPrisma${NC}"
      FIXED=$((FIXED+1))
    fi
  else
    echo -e "${GREEN}Arquivo já usa reconnectPrisma corretamente: ${FILE}${NC}"
  fi
done

echo -e "${GREEN}Verificação concluída! $CHECKED arquivos verificados, $FIXED arquivos corrigidos.${NC}"
