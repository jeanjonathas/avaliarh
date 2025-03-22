#!/bin/bash

# Script para executar o diagnóstico de autenticação no servidor de produção
# Este script facilita a execução do serviço de diagnóstico e a visualização dos logs

# Definir cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Diagnóstico de Autenticação AvaliaRH ===${NC}"
echo "Data e hora: $(date)"
echo

# Verificar se o Docker está em execução
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Erro: Docker não está em execução. Inicie o Docker e tente novamente.${NC}"
  exit 1
fi

# Verificar se o serviço auth-diagnostic existe
if ! docker service ls | grep -q "avaliarh_auth-diagnostic"; then
  echo -e "${RED}Erro: Serviço avaliarh_auth-diagnostic não encontrado.${NC}"
  echo "Verifique se o stack avaliarh foi implantado corretamente."
  exit 1
fi

# Função para executar o diagnóstico
run_diagnostic() {
  echo -e "${YELLOW}Iniciando serviço de diagnóstico...${NC}"
  docker service scale avaliarh_auth-diagnostic=1
  
  echo "Aguardando inicialização do serviço..."
  sleep 10
  
  # Verificar se o serviço está em execução
  while true; do
    if docker service ps avaliarh_auth-diagnostic | grep -q "Running"; then
      echo -e "${GREEN}Serviço iniciado com sucesso.${NC}"
      break
    elif docker service ps avaliarh_auth-diagnostic | grep -q "Failed"; then
      echo -e "${RED}Falha ao iniciar o serviço.${NC}"
      docker service logs avaliarh_auth-diagnostic
      docker service scale avaliarh_auth-diagnostic=0
      exit 1
    fi
    echo "Aguardando..."
    sleep 5
  done
  
  echo -e "${YELLOW}Executando diagnóstico...${NC}"
  echo "Isso pode levar alguns segundos."
  sleep 20
  
  # Obter o ID do contêiner
  CONTAINER_ID=$(docker ps -q -f name=avaliarh_auth-diagnostic)
  
  if [ -z "$CONTAINER_ID" ]; then
    echo -e "${RED}Não foi possível encontrar o contêiner do serviço.${NC}"
    docker service logs avaliarh_auth-diagnostic
    docker service scale avaliarh_auth-diagnostic=0
    exit 1
  fi
  
  # Verificar se o diagnóstico foi concluído
  echo -e "${YELLOW}Verificando logs do diagnóstico...${NC}"
  docker logs $CONTAINER_ID | grep -q "Diagnóstico concluído"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Diagnóstico concluído com sucesso.${NC}"
    
    # Obter o ID do contêiner da aplicação principal
    APP_CONTAINER_ID=$(docker ps -q -f name=avaliarh_app)
    
    if [ -n "$APP_CONTAINER_ID" ]; then
      echo -e "${YELLOW}Logs de diagnóstico:${NC}"
      docker exec $APP_CONTAINER_ID ls -la /app/logs/auth-diagnostic-*.log 2>/dev/null
      
      # Obter o arquivo de log mais recente
      LATEST_LOG=$(docker exec $APP_CONTAINER_ID ls -t /app/logs/auth-diagnostic-*.log 2>/dev/null | head -1)
      
      if [ -n "$LATEST_LOG" ]; then
        echo -e "${YELLOW}Conteúdo do log mais recente ($LATEST_LOG):${NC}"
        docker exec $APP_CONTAINER_ID cat $LATEST_LOG
      else
        echo -e "${RED}Nenhum arquivo de log encontrado.${NC}"
      fi
    else
      echo -e "${RED}Não foi possível encontrar o contêiner da aplicação.${NC}"
    fi
  else
    echo -e "${RED}O diagnóstico não foi concluído corretamente.${NC}"
    docker logs $CONTAINER_ID
  fi
  
  # Parar o serviço de diagnóstico
  echo -e "${YELLOW}Parando serviço de diagnóstico...${NC}"
  docker service scale avaliarh_auth-diagnostic=0
  echo -e "${GREEN}Serviço parado.${NC}"
}

# Função para verificar o status da autenticação
check_auth_status() {
  echo -e "${YELLOW}Verificando status da autenticação...${NC}"
  
  # Obter o ID do contêiner da aplicação principal
  APP_CONTAINER_ID=$(docker ps -q -f name=avaliarh_app)
  
  if [ -z "$APP_CONTAINER_ID" ]; then
    echo -e "${RED}Não foi possível encontrar o contêiner da aplicação.${NC}"
    exit 1
  fi
  
  # Verificar se o script verify-auth.js existe
  if docker exec $APP_CONTAINER_ID test -f /app/scripts/verify-auth.js; then
    echo -e "${GREEN}Executando verificação rápida...${NC}"
    docker exec $APP_CONTAINER_ID node /app/scripts/verify-auth.js
  else
    echo -e "${RED}Script de verificação rápida não encontrado.${NC}"
    echo "Verifique se as correções de autenticação foram aplicadas corretamente."
  fi
}

# Menu principal
PS3="Selecione uma opção: "
options=("Executar diagnóstico completo" "Verificar status da autenticação" "Sair")

select opt in "${options[@]}"
do
  case $opt in
    "Executar diagnóstico completo")
      run_diagnostic
      break
      ;;
    "Verificar status da autenticação")
      check_auth_status
      break
      ;;
    "Sair")
      echo "Saindo..."
      exit 0
      ;;
    *) 
      echo "Opção inválida"
      ;;
  esac
done

echo -e "${GREEN}Diagnóstico concluído.${NC}"
