#!/bin/bash

# Script para corrigir automaticamente arquivos que importam reconnectPrisma mas não o utilizam
# Criado por Cascade AI

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando correção automática de reconnectPrisma...${NC}"

# Encontrar todos os arquivos que importam reconnectPrisma mas não o utilizam
ARQUIVOS=$(comm -23 <(find /home/jean/avaliarh/pages -name "*.ts" -exec grep -l "import.*reconnectPrisma.*from '@/lib/prisma'" {} \; | sort) <(find /home/jean/avaliarh/pages -name "*.ts" -exec grep -l "reconnectPrisma()" {} \; | sort))

# Contador de arquivos
TOTAL=$(echo "$ARQUIVOS" | wc -l)
CORRIGIDOS=0
REMOVIDOS=0
IGNORADOS=0

echo -e "${YELLOW}Encontrados $TOTAL arquivos que importam reconnectPrisma mas não o utilizam.${NC}"

for ARQUIVO in $ARQUIVOS; do
  echo -e "\n${YELLOW}Analisando: ${ARQUIVO}${NC}"
  
  # Verificar se o arquivo usa o prisma para operações de banco de dados
  if grep -q "prisma\." "$ARQUIVO" || grep -q "prisma\$" "$ARQUIVO"; then
    echo -e "  ${GREEN}Arquivo usa o prisma para operações de banco de dados.${NC}"
    
    # Encontrar a primeira linha que usa o prisma
    PRIMEIRA_LINHA_PRISMA=$(grep -n "prisma\." "$ARQUIVO" | head -1 | cut -d':' -f1)
    
    if [ -z "$PRIMEIRA_LINHA_PRISMA" ]; then
      PRIMEIRA_LINHA_PRISMA=$(grep -n "prisma\$" "$ARQUIVO" | head -1 | cut -d':' -f1)
    fi
    
    if [ -n "$PRIMEIRA_LINHA_PRISMA" ]; then
      echo -e "  ${GREEN}Primeira operação prisma encontrada na linha $PRIMEIRA_LINHA_PRISMA.${NC}"
      
      # Determinar a indentação
      LINHA_ANTERIOR=$((PRIMEIRA_LINHA_PRISMA - 1))
      INDENTACAO=$(sed -n "${LINHA_ANTERIOR}p" "$ARQUIVO" | sed -E 's/^([[:space:]]*).*$/\1/')
      
      # Inserir a linha com reconnectPrisma antes da primeira operação
      sed -i "${LINHA_ANTERIOR}a\\${INDENTACAO}// Garantir que a conexão com o banco de dados esteja ativa\n${INDENTACAO}await reconnectPrisma();" "$ARQUIVO"
      
      echo -e "  ${GREEN}✓ Adicionado reconnectPrisma() antes da linha $PRIMEIRA_LINHA_PRISMA${NC}"
      CORRIGIDOS=$((CORRIGIDOS+1))
    else
      echo -e "  ${RED}Não foi possível identificar onde adicionar reconnectPrisma()${NC}"
      IGNORADOS=$((IGNORADOS+1))
    fi
  else
    echo -e "  ${YELLOW}Arquivo não faz operações com o prisma, removendo importação...${NC}"
    
    # Remover a importação de reconnectPrisma
    sed -i 's/import { prisma, reconnectPrisma } from/import { prisma } from/g' "$ARQUIVO"
    
    echo -e "  ${GREEN}✓ Removida importação desnecessária de reconnectPrisma${NC}"
    REMOVIDOS=$((REMOVIDOS+1))
  fi
  
  # Corrigir pontos e vírgulas faltantes nas importações
  if grep -q "import.*from.*'/" "$ARQUIVO"; then
    echo -e "  ${YELLOW}Corrigindo pontos e vírgulas faltantes nas importações...${NC}"
    sed -i "s/import \(.*\) from \(.*\)'\/$/import \1 from \2';/g" "$ARQUIVO"
    echo -e "  ${GREEN}✓ Pontos e vírgulas corrigidos nas importações${NC}"
  fi
done

echo -e "\n${GREEN}Correção concluída!${NC}"
echo -e "${GREEN}Total de arquivos analisados: $TOTAL${NC}"
echo -e "${GREEN}Arquivos com reconnectPrisma adicionado: $CORRIGIDOS${NC}"
echo -e "${GREEN}Arquivos com importação removida: $REMOVIDOS${NC}"
echo -e "${GREEN}Arquivos ignorados: $IGNORADOS${NC}"

echo -e "\n${YELLOW}Recomendação: Verifique manualmente os arquivos ignorados, se houver.${NC}"
