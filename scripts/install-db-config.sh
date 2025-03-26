#!/bin/bash

# Script para instalar a configuração do banco de dados no servidor
# Este script deve ser executado durante o processo de implantação

echo "=== CONFIGURAÇÃO DO BANCO DE DADOS AVALIARH ==="
echo "Iniciando configuração do banco de dados..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Por favor, instale o Node.js."
    exit 1
fi

# Diretório da aplicação
APP_DIR="/app"
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="."
fi

# Criar diretório de scripts se não existir
mkdir -p "$APP_DIR/scripts"

# Verificar se o arquivo de configuração já existe
if [ -f "$APP_DIR/.db-config.json" ]; then
    echo "Arquivo de configuração encontrado:"
    cat "$APP_DIR/.db-config.json"
    echo ""
    
    read -p "Deseja reconfigurar? (s/N): " RECONFIGURE
    if [ "$RECONFIGURE" != "s" ] && [ "$RECONFIGURE" != "S" ]; then
        echo "Mantendo configuração existente."
        exit 0
    fi
fi

# Detectar contêineres PostgreSQL
echo "Detectando contêineres PostgreSQL..."
POSTGRES_CONTAINERS=$(docker ps | grep postgres || echo "Nenhum contêiner PostgreSQL encontrado")
echo "$POSTGRES_CONTAINERS"

# Listar contêineres PostgreSQL
if docker ps | grep -q postgres; then
    echo -e "\nContêineres PostgreSQL encontrados:"
    docker ps | grep postgres
    
    # Tentar encontrar o contêiner PostgreSQL do AvaliaRH
    AVALIARH_POSTGRES=$(docker ps | grep postgres | grep avaliarh | awk '{print $NF}' || echo "")
    
    if [ -n "$AVALIARH_POSTGRES" ]; then
        echo -e "\nContêiner PostgreSQL do AvaliaRH detectado: $AVALIARH_POSTGRES"
        POSTGRES_SERVICE="$AVALIARH_POSTGRES"
    else
        # Usar o primeiro contêiner PostgreSQL encontrado
        POSTGRES_SERVICE=$(docker ps | grep postgres | head -n 1 | awk '{print $NF}')
        echo -e "\nUsando o primeiro contêiner PostgreSQL encontrado: $POSTGRES_SERVICE"
    fi
else
    echo "Nenhum contêiner PostgreSQL encontrado. Usando valor padrão 'postgres'."
    POSTGRES_SERVICE="postgres"
fi

# Criar arquivo de configuração
echo "Criando arquivo de configuração..."
cat > "$APP_DIR/.db-config.json" << EOF
{
  "postgresServiceName": "$POSTGRES_SERVICE",
  "lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Arquivo de configuração criado:"
cat "$APP_DIR/.db-config.json"

# Testar conectividade
echo -e "\nTestando conectividade com o banco de dados..."
APP_CONTAINER=$(docker ps | grep avaliarh_app | awk '{print $1}' || echo "")

if [ -n "$APP_CONTAINER" ]; then
    echo "Contêiner da aplicação encontrado: $APP_CONTAINER"
    
    if docker exec "$APP_CONTAINER" ping -c 1 "$POSTGRES_SERVICE" &> /dev/null; then
        echo "Conectividade com o banco de dados OK!"
    else
        echo "ERRO: Não foi possível conectar ao banco de dados usando o nome '$POSTGRES_SERVICE'."
        echo "Verifique se os contêineres estão na mesma rede Docker."
    fi
else
    echo "Contêiner da aplicação não encontrado. Não foi possível testar a conectividade."
fi

echo -e "\nConfiguração concluída com sucesso!"
echo "Reinicie a aplicação para aplicar as alterações."
