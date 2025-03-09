-- Verificar estrutura da tabela tests com saída formatada
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'tests' 
    OR table_name = 'Stage'
ORDER BY 
    table_name, ordinal_position;
