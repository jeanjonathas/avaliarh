-- Verificar se a tabela Category já existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Category') THEN
        -- Criar a tabela Category se não existir
        CREATE TABLE "Category" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Verificar se a coluna categoryId existe na tabela Question
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Question' AND column_name = 'categoryId') THEN
        -- Adicionar a coluna categoryId na tabela Question
        ALTER TABLE "Question" ADD COLUMN "categoryId" UUID;
        
        -- Adicionar a chave estrangeira
        ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
