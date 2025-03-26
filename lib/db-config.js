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
    
    // Listar todos os contêineres PostgreSQL em execução
    const { stdout } = await execPromise("docker ps | grep postgres | awk '{print $NF}'");
    const containerNames = stdout.trim().split('\n').filter(Boolean);
    
    if (containerNames.length > 0) {
      // Encontrar o contêiner PostgreSQL do AvaliaRH
      const avaliaRHContainer = containerNames.find(name => name.includes('avaliarh'));
      
      if (avaliaRHContainer) {
        console.log(`[DB-CONFIG] Contêiner PostgreSQL do AvaliaRH detectado: ${avaliaRHContainer}`);
        updatePostgresServiceName(avaliaRHContainer);
        return avaliaRHContainer;
      } else {
        console.log(`[DB-CONFIG] Usando o primeiro contêiner PostgreSQL encontrado: ${containerNames[0]}`);
        updatePostgresServiceName(containerNames[0]);
        return containerNames[0];
      }
    }
  } catch (error) {
    console.error('[DB-CONFIG] Erro ao detectar serviço PostgreSQL:', error);
  }
  
  // Retornar o valor padrão se não for possível detectar
  return getConfig().postgresServiceName;
}

module.exports = {
  getConfig,
  saveConfig,
  updatePostgresServiceName,
  detectPostgresServiceName
};
