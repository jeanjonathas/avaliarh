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

    // Listar contêineres PostgreSQL do AvaliaRH
    const { stdout: postgresContainers } = await execPromise("docker ps --filter 'name=avaliarh_postgres' --format '{{.ID}}'");

    if (!postgresContainers.trim()) {
      throw new Error('Nenhum contêiner PostgreSQL do AvaliaRH encontrado');
    }

    // Pegar o ID do contêiner PostgreSQL do AvaliaRH
    const postgresContainerId = postgresContainers.split('\n')[0].trim();
    console.log(`[DB-CONFIG] ID do contêiner PostgreSQL do AvaliaRH detectado: ${postgresContainerId}`);

    return postgresContainerId;
  } catch (error) {
    console.error('[DB-CONFIG] Erro ao detectar serviço PostgreSQL:', error);
    return 'postgres'; // Fallback para o nome padrão
  }
}

module.exports = {
  getConfig,
  saveConfig,
  updatePostgresServiceName,
  detectPostgresServiceName
};
