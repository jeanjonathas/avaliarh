#!/bin/bash

echo "Iniciando atualização do AvaliaRH..."

# Opção 1: Atualização rápida (apenas pull e rebuild)
if [ "$1" == "quick" ]; then
  echo "Realizando atualização rápida..."
  docker exec $(docker ps -q -f name=avaliarh_app) bash -c "cd /app && git pull && npm install --no-fund --no-audit --legacy-peer-deps && npx prisma generate && npm run build"
  docker service update --force avaliarh_app
  echo "Atualização rápida concluída!"

# Opção 2: Atualização completa (usando o arquivo update-app.yml)
else
  echo "Realizando atualização completa..."
  docker stack deploy -c update-app.yml avaliarh-update
  
  echo "Aguardando conclusão da atualização..."
  # Aguardar até que o serviço de rebuild seja concluído
  while true; do
    status=$(docker service ps avaliarh-update_rebuild --format "{{.CurrentState}}" | head -n 1)
    if [[ "$status" == "Complete" ]]; then
      break
    fi
    echo "Aguardando... Estado atual: $status"
    sleep 10
  done
  
  echo "Reiniciando o serviço app..."
  docker service update --force avaliarh_app
  
  echo "Removendo stack de atualização..."
  docker stack rm avaliarh-update
  
  echo "Atualização completa concluída!"
fi
