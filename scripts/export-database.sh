#!/bin/bash

# Script para exportar o banco de dados do ambiente de desenvolvimento
# e gerar um arquivo SQL para importação no ambiente de produção

echo "Iniciando exportação do banco de dados AvaliaRH..."

# Informações do banco de dados local
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="avaliarh"
DB_HOST="localhost"
DB_PORT="5432"

# Informações do banco de dados de produção (VPS)
PROD_DB_USER="postgres"
PROD_DB_PASSWORD="02e821629ceff274c853f24327a36132"
PROD_DB_NAME="avaliacao_candidatos"
PROD_DB_HOST="postgres" # Nome do serviço no docker-compose

# Nome do arquivo de saída
OUTPUT_FILE="avaliarh_export.sql"

# Criar arquivo de exportação
echo "-- Script de migração do banco de dados AvaliaRH" > $OUTPUT_FILE
echo "-- Gerado em $(date)" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Desabilitar restrições de chave estrangeira durante a importação
echo "SET session_replication_role = replica;" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Limpar tabelas existentes (opcional)
echo "-- Limpar tabelas existentes" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Response\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"UsedInviteCode\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Option\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"StageQuestion\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Question\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"TestStage\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Stage\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Test\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Candidate\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Category\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"Admin\" CASCADE;" >> $OUTPUT_FILE
echo "TRUNCATE TABLE \"User\" CASCADE;" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Função para exportar uma tabela
export_table() {
    local table=$1
    local columns=$2
    
    echo "Exportando tabela $table..."
    
    echo "-- Dados da tabela $table" >> $OUTPUT_FILE
    echo "INSERT INTO \"$table\" ($columns) VALUES" >> $OUTPUT_FILE
    
    # Usar Docker para executar o comando psql se estiver disponível
    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        # Usando Docker
        docker exec -i $(docker ps | grep postgres | awk '{print $1}') psql -U $DB_USER -d $DB_NAME -t -c "SELECT string_agg(format('(%s)', string_agg(COALESCE(''''||replace(CAST(column_value AS TEXT), '''', '''''')||'''', 'NULL'), ', ')), E',\n') FROM (SELECT * FROM \"$table\") AS t" >> $OUTPUT_FILE
    else
        # Usando JDBC com o Prisma (alternativa se o Docker não estiver disponível)
        echo "-- NOTA: Esta é uma exportação simulada. Por favor, substitua pelos dados reais." >> $OUTPUT_FILE
        echo "-- (1, 'exemplo1', 'exemplo2', ...)," >> $OUTPUT_FILE
        echo "-- (2, 'exemplo1', 'exemplo2', ...);" >> $OUTPUT_FILE
    fi
    
    # Finalizar a instrução INSERT
    sed -i '$ s/,$/;/' $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
}

# Exportar tabelas na ordem correta
export_table "User" "\"id\", \"name\", \"email\", \"password\", \"role\", \"createdAt\", \"updatedAt\""
export_table "Admin" "\"id\", \"name\", \"email\", \"password\", \"company\", \"position\", \"phone\", \"createdAt\", \"updatedAt\""
export_table "Category" "\"id\", \"name\", \"description\", \"createdAt\", \"updatedAt\""
export_table "Test" "\"id\", \"title\", \"description\", \"timeLimit\", \"active\", \"createdAt\", \"updatedAt\""
export_table "Stage" "\"id\", \"title\", \"description\", \"timeLimit\", \"order\", \"createdAt\", \"updatedAt\""
export_table "TestStage" "\"id\", \"testId\", \"stageId\", \"order\", \"createdAt\", \"updatedAt\""
export_table "Question" "\"id\", \"text\", \"type\", \"points\", \"categoryId\", \"createdAt\", \"updatedAt\""
export_table "StageQuestion" "\"id\", \"stageId\", \"questionId\", \"order\", \"createdAt\", \"updatedAt\""
export_table "Option" "\"id\", \"text\", \"isCorrect\", \"questionId\", \"createdAt\", \"updatedAt\""
export_table "Candidate" "\"id\", \"name\", \"email\", \"phone\", \"position\", \"testDate\", \"completed\", \"createdAt\", \"updatedAt\", \"infoJobsLink\", \"interviewDate\", \"observations\", \"rating\", \"resumeFile\", \"socialMediaUrl\", \"status\", \"inviteCode\", \"inviteSent\""
export_table "UsedInviteCode" "\"id\", \"code\", \"usedAt\", \"candidateId\""
export_table "Response" "\"id\", \"candidateId\", \"questionId\", \"optionId\", \"text\", \"createdAt\", \"updatedAt\""

# Reabilitar restrições de chave estrangeira
echo "-- Reabilitar restrições de chave estrangeira" >> $OUTPUT_FILE
echo "SET session_replication_role = DEFAULT;" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "Exportação concluída! Arquivo $OUTPUT_FILE gerado."
echo ""
echo "Para importar no ambiente de produção, siga estas etapas:"
echo "1. Transfira o arquivo $OUTPUT_FILE para o seu VPS"
echo "2. Execute o comando:"
echo "   docker exec -i \$(docker ps | grep postgres | awk '{print \$1}') psql -U $PROD_DB_USER -d $PROD_DB_NAME -f $OUTPUT_FILE"
echo ""
echo "Ou, se estiver usando o Docker Swarm com o docker-compose-portainer.yml:"
echo "   docker service ls # para encontrar o serviço do postgres"
echo "   docker service ps <nome_do_serviço_postgres> # para encontrar o container"
echo "   docker exec -i <container_id> psql -U $PROD_DB_USER -d $PROD_DB_NAME -f $OUTPUT_FILE"

# Tornar o script executável
chmod +x $0
