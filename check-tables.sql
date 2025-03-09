-- Verificar estrutura da tabela tests
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tests';

-- Verificar estrutura da tabela Stage
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Stage';
