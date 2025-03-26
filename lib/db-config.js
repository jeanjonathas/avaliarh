// Configuração do banco de dados
// Este arquivo é gerado durante a instalação e contém informações sobre o ambiente

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração
const configPath = path.join(__dirname, '../.db-config.json');

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
  return {
    postgresServiceName: 'postgres',
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
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Verificar se estamos em um contêiner Docker
    const isInDocker = fs.existsSync('/.dockerenv');
    console.log(`[DB-CONFIG] Executando em contêiner Docker: ${isInDocker}`);

    // Se estamos em um contêiner Docker, usar o nome do serviço fixo
    if (isInDocker) {
      console.log('[DB-CONFIG] Usando nome de serviço fixo para ambiente Docker: avaliarh_postgres');
      updatePostgresServiceName('avaliarh_postgres');
      return 'avaliarh_postgres';
    }

    // Listar contêineres PostgreSQL do AvaliaRH
    console.log('[DB-CONFIG] Procurando contêineres PostgreSQL do AvaliaRH...');
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
    console.error('[DB-CONFIG] Erro ao detectar serviço PostgreSQL:', error);
    console.log('[DB-CONFIG] Usando nome de serviço padrão: postgres');
    return 'postgres'; // Fallback para o nome padrão
  }
}

module.exports = {
  getConfig,
  saveConfig,
  updatePostgresServiceName,
  detectPostgresServiceName
};
