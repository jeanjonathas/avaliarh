-- Verificar o tipo de dados da coluna id na tabela tests
SELECT pg_typeof(id) FROM tests LIMIT 1;

-- Verificar o tipo de dados da coluna id na tabela Stage
SELECT pg_typeof(id) FROM "Stage" LIMIT 1;

-- Criar a tabela TestStage com os tipos corretos
DO $$
DECLARE
    test_id_type TEXT;
    stage_id_type TEXT;
BEGIN
    -- Obter o tipo de dados da coluna id na tabela tests
    EXECUTE 'SELECT pg_typeof(id) FROM tests LIMIT 1' INTO test_id_type;
    RAISE NOTICE 'Tipo de dados da coluna id na tabela tests: %', test_id_type;
    
    -- Obter o tipo de dados da coluna id na tabela Stage
    EXECUTE 'SELECT pg_typeof(id) FROM "Stage" LIMIT 1' INTO stage_id_type;
    RAISE NOTICE 'Tipo de dados da coluna id na tabela Stage: %', stage_id_type;
    
    -- Criar a tabela TestStage com os tipos corretos
    EXECUTE 'CREATE TABLE IF NOT EXISTS "TestStage" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "testId" ' || test_id_type || ' NOT NULL,
        "stageId" ' || stage_id_type || ' NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE("testId", "stageId"),
        CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"(id) ON DELETE CASCADE,
        CONSTRAINT "TestStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"(id) ON DELETE CASCADE
    )';
    
    RAISE NOTICE 'Tabela TestStage criada com sucesso';
END
$$;
