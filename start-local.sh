#!/bin/bash

# Nome do container do banco de dados
DB_CONTAINER="avaliarh_postgres_dev"

echo "=========================================="
echo "   Reiniciando AvaliaRH Localmente"
echo "=========================================="

# 1. Matar qualquer processo rodando na porta 3000 (servidor Next.js anterior)
echo "🧹 Limpando processos na porta 3000..."
fuser -k 3000/tcp 2>/dev/null && echo "✅ Porta 3000 liberada."

# 2. Parar o container do banco de dados para garantir um reinício limpo
echo "⏹️  Parando banco de dados ($DB_CONTAINER)..."
docker stop $DB_CONTAINER 2>/dev/null

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null
then
    echo "❌ Erro: Docker não encontrado. Por favor, instale o Docker."
    exit 1
fi

# Verificar se o container já existe
if [ "$(docker ps -aq -f name=^/${DB_CONTAINER}$)" ]; then
    # Se o container existe, verificar se está rodando
    if [ ! "$(docker ps -q -f name=^/${DB_CONTAINER}$)" ]; then
        echo "📂 Iniciando container do banco de dados ($DB_CONTAINER)..."
        docker start $DB_CONTAINER
    else
        echo "✅ Banco de dados já está rodando."
    fi
else
    # Se não existe, criar e iniciar
    echo "🚀 Criando novo container do banco de dados ($DB_CONTAINER)..."
    docker run --name $DB_CONTAINER \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=avaliarh \
        -p 5432:5432 \
        -v avaliarh_postgres_data_dev:/var/lib/postgresql/data \
        -d postgres:14
fi

# Aguardar um pouco para garantir que o banco esteja pronto
echo "⏳ Aguardando banco de dados estabilizar (3s)..."
sleep 3

# Iniciar o servidor de desenvolvimento
echo "🔥 Iniciando servidor de desenvolvimento (next dev)..."
npm run dev
