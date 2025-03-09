-- Verificar se a tabela TestStage existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'TestStage'
);

-- Verificar a estrutura da tabela TestStage
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'TestStage'
ORDER BY 
    ordinal_position;
