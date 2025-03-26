// Configuração do banco de dados
// Este arquivo é gerado durante a instalação e contém informações sobre o ambiente

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração
const configPath = path.join(__dirname, '../.db-config.json');

// Verificar se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

// Função para obter a configuração atual
function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('[DB-CONFIG] Erro ao ler arquivo de configuração:', error);
  }
  
  // Configuração padrão se não existir arquivo
  // Em produção, usar 'avaliarh_postgres', em desenvolvimento usar 'avaliarh_postgres_1'
  return {
    postgresServiceName: isProduction ? 'avaliarh_postgres' : 'avaliarh_postgres_1',
    lastUpdated: new Date().toISOString()
  };
}

// Função para salvar a configuração
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[DB-CONFIG] Configuração salva com sucesso');
    return true;
  } catch (error) {
    console.error('[DB-CONFIG] Erro ao salvar configuração:', error);
    return false;
  }
}

// Função para atualizar o nome do serviço PostgreSQL
function updatePostgresServiceName(serviceName) {
  const config = getConfig();
  config.postgresServiceName = serviceName;
  config.lastUpdated = new Date().toISOString();
  return saveConfig(config);
}

// Função para detectar automaticamente o nome do serviço PostgreSQL
async function detectPostgresServiceName() {
  try {
    // Verificar se estamos em um contêiner Docker
    const isInDocker = fs.existsSync('/.dockerenv');
    console.log(`[DB-CONFIG] Executando em contêiner Docker: ${isInDocker}`);

    // Se estamos em um contêiner Docker e em produção, usar o nome do serviço fixo para produção
    if (isInDocker && isProduction) {
      console.log('[DB-CONFIG] Usando nome de serviço fixo para ambiente Docker em produção: avaliarh_postgres');
      updatePostgresServiceName('avaliarh_postgres');
      return 'avaliarh_postgres';
    }
    
    // Se estamos em um contêiner Docker e em desenvolvimento, usar o nome do serviço fixo para desenvolvimento
    if (isInDocker && !isProduction) {
      console.log('[DB-CONFIG] Usando nome de serviço fixo para ambiente Docker em desenvolvimento: avaliarh_postgres_1');
      updatePostgresServiceName('avaliarh_postgres_1');
      return 'avaliarh_postgres_1';
    }

    // Fora do contêiner, tentar usar o Docker CLI
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Listar contêineres PostgreSQL do AvaliaRH
    console.log('[DB-CONFIG] Procurando contêineres PostgreSQL do AvaliaRH...');
    try {
      const { stdout: postgresContainers } = await execPromise("docker ps --filter 'name=avaliarh_postgres' --format '{{.Names}}'");

      if (!postgresContainers.trim()) {
        console.log('[DB-CONFIG] Nenhum contêiner PostgreSQL do AvaliaRH encontrado, usando nome padrão: postgres');
        updatePostgresServiceName('postgres');
        return 'postgres';
      }

      // Pegar o nome do contêiner PostgreSQL do AvaliaRH
      const postgresContainerName = postgresContainers.split('\n')[0].trim();
      console.log(`[DB-CONFIG] Nome do contêiner PostgreSQL do AvaliaRH detectado: ${postgresContainerName}`);
      
      // Salvar o nome do serviço
      updatePostgresServiceName(postgresContainerName);
      
      return postgresContainerName;
    } catch (error) {
      console.error('[DB-CONFIG] Erro ao executar comando Docker:', error);
      // Usar o nome padrão de acordo com o ambiente
      const defaultName = isProduction ? 'avaliarh_postgres' : 'avaliarh_postgres_1';
      console.log(`[DB-CONFIG] Usando nome de serviço padrão para ${isProduction ? 'produção' : 'desenvolvimento'}: ${defaultName}`);
      updatePostgresServiceName(defaultName);
      return defaultName;
    }
  } catch (error) {
    console.error('[DB-CONFIG] Erro ao detectar serviço PostgreSQL:', error);
    // Usar o nome padrão de acordo com o ambiente
    const defaultName = isProduction ? 'avaliarh_postgres' : 'avaliarh_postgres_1';
    console.log(`[DB-CONFIG] Usando nome de serviço padrão para ${isProduction ? 'produção' : 'desenvolvimento'}: ${defaultName}`);
    updatePostgresServiceName(defaultName);
    return defaultName;
  }
}

module.exports = {
  getConfig,
  saveConfig,
  updatePostgresServiceName,
  detectPostgresServiceName
};
