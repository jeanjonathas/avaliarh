-- Script SQL para migrar dados entre bancos PostgreSQL com a mesma estrutura
-- Como usar:
-- 1. Ajuste os valores das variáveis no início do arquivo
-- 2. Execute no PostgreSQL do ambiente de desenvolvimento:
--    psql -U seu_usuario -d avaliarh_dev -f db-migrate.sql
-- 3. Copie o arquivo de saída gerado (avaliarh_export.sql)
-- 4. Execute no PostgreSQL do ambiente de produção:
--    psql -U usuario_producao -d avaliarh_prod -f avaliarh_export.sql

-- Exporta todos os dados das tabelas principais do AvaliaRH

\echo 'Iniciando exportação de dados do AvaliaRH...'
\o avaliarh_export.sql

-- Desabilitar restrições de chave estrangeira durante a importação
\echo 'SET session_replication_role = replica;'

-- Limpar tabelas existentes (opcional - remova esta seção se quiser preservar dados existentes)
\echo 'TRUNCATE TABLE "Response" CASCADE;'
\echo 'TRUNCATE TABLE "UsedInviteCode" CASCADE;'
\echo 'TRUNCATE TABLE "Option" CASCADE;'
\echo 'TRUNCATE TABLE "StageQuestion" CASCADE;'
\echo 'TRUNCATE TABLE "Question" CASCADE;'
\echo 'TRUNCATE TABLE "TestStage" CASCADE;'
\echo 'TRUNCATE TABLE "Stage" CASCADE;'
\echo 'TRUNCATE TABLE "Test" CASCADE;'
\echo 'TRUNCATE TABLE "Candidate" CASCADE;'
\echo 'TRUNCATE TABLE "Category" CASCADE;'
\echo 'TRUNCATE TABLE "Admin" CASCADE;'
\echo 'TRUNCATE TABLE "User" CASCADE;'

-- Exportar usuários
\echo '\echo ''Importando usuários...'''
\echo 'INSERT INTO "User" ("id", "name", "email", "password", "role", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L)',
    "id", "name", "email", "password", "role", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "User";
\qecho ';'

-- Exportar administradores
\echo '\echo ''Importando administradores...'''
\echo 'INSERT INTO "Admin" ("id", "name", "email", "password", "company", "position", "phone", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L, %L, %L)',
    "id", "name", "email", "password", "company", "position", "phone", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Admin";
\qecho ';'

-- Exportar categorias
\echo '\echo ''Importando categorias...'''
\echo 'INSERT INTO "Category" ("id", "name", "description", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L)',
    "id", "name", "description", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Category";
\qecho ';'

-- Exportar testes
\echo '\echo ''Importando testes...'''
\echo 'INSERT INTO "Test" ("id", "title", "description", "timeLimit", "active", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L)',
    "id", "title", "description", "timeLimit", "active", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Test";
\qecho ';'

-- Exportar etapas
\echo '\echo ''Importando etapas...'''
\echo 'INSERT INTO "Stage" ("id", "title", "description", "timeLimit", "order", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L)',
    "id", "title", "description", "timeLimit", "order", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Stage";
\qecho ';'

-- Exportar relações entre testes e etapas
\echo '\echo ''Importando relações entre testes e etapas...'''
\echo 'INSERT INTO "TestStage" ("id", "testId", "stageId", "order", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L)',
    "id", "testId", "stageId", "order", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "TestStage";
\qecho ';'

-- Exportar questões
\echo '\echo ''Importando questões...'''
\echo 'INSERT INTO "Question" ("id", "text", "type", "points", "categoryId", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L)',
    "id", "text", "type", "points", "categoryId", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Question";
\qecho ';'

-- Exportar relações entre etapas e questões
\echo '\echo ''Importando relações entre etapas e questões...'''
\echo 'INSERT INTO "StageQuestion" ("id", "stageId", "questionId", "order", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L)',
    "id", "stageId", "questionId", "order", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "StageQuestion";
\qecho ';'

-- Exportar opções
\echo '\echo ''Importando opções...'''
\echo 'INSERT INTO "Option" ("id", "text", "isCorrect", "questionId", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L)',
    "id", "text", "isCorrect", "questionId", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Option";
\qecho ';'

-- Exportar candidatos
\echo '\echo ''Importando candidatos...'''
\echo 'INSERT INTO "Candidate" ("id", "name", "email", "phone", "position", "testDate", "completed", "createdAt", "updatedAt", "infoJobsLink", "interviewDate", "observations", "rating", "resumeFile", "socialMediaUrl", "status", "inviteCode", "inviteSent") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    "id", "name", "email", "phone", "position", "testDate", "completed", "createdAt", "updatedAt", 
    "infoJobsLink", "interviewDate", "observations", "rating", "resumeFile", "socialMediaUrl", 
    "status", "inviteCode", "inviteSent"
  ), E',\n  '
)
FROM "Candidate";
\qecho ';'

-- Exportar códigos de convite usados
\echo '\echo ''Importando códigos de convite usados...'''
\echo 'INSERT INTO "UsedInviteCode" ("id", "code", "usedAt", "candidateId") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L)',
    "id", "code", "usedAt", "candidateId"
  ), E',\n  '
)
FROM "UsedInviteCode";
\qecho ';'

-- Exportar respostas
\echo '\echo ''Importando respostas...'''
\echo 'INSERT INTO "Response" ("id", "candidateId", "questionId", "optionId", "text", "createdAt", "updatedAt") VALUES'
\qecho '  '
SELECT string_agg(
  format('(%L, %L, %L, %L, %L, %L, %L)',
    "id", "candidateId", "questionId", "optionId", "text", "createdAt", "updatedAt"
  ), E',\n  '
)
FROM "Response";
\qecho ';'

-- Reabilitar restrições de chave estrangeira
\echo 'SET session_replication_role = DEFAULT;'

\echo '\echo ''Migração concluída com sucesso!'''

\o
\echo 'Exportação concluída! Arquivo avaliarh_export.sql gerado.'
\echo 'Para importar no ambiente de produção, execute:'
\echo 'psql -U usuario_producao -d avaliarh_prod -f avaliarh_export.sql'
