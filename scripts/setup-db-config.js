// Script para configurar o nome do serviço PostgreSQL durante a instalação
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const dbConfig = require('../lib/db-config');

async function setupDbConfig() {
  console.log('=== CONFIGURAÇÃO DO BANCO DE DADOS ===');
  console.log('Detectando serviço PostgreSQL...');
  
  try {
    // Listar todos os contêineres Docker em execução
    const { stdout: dockerPs } = await execPromise('docker ps');
    console.log('\nContêineres em execução:');
    console.log(dockerPs);
    
    // Listar contêineres PostgreSQL
    const { stdout: postgresContainers } = await execPromise("docker ps | grep postgres");
    console.log('\nContêineres PostgreSQL:');
    console.log(postgresContainers || 'Nenhum contêiner PostgreSQL encontrado');
    
    // Listar redes Docker
    const { stdout: networks } = await execPromise('docker network ls');
    console.log('\nRedes Docker:');
    console.log(networks);
    
    // Detectar automaticamente o nome do serviço PostgreSQL
    const serviceName = await dbConfig.detectPostgresServiceName();
    console.log(`\nNome do serviço PostgreSQL detectado: ${serviceName}`);
    
    // Verificar se o contêiner está acessível
    try {
      const { stdout: pingResult } = await execPromise(`docker exec $(docker ps -q -f name=avaliarh_app) ping -c 1 ${serviceName}`);
      console.log('\nTeste de conectividade:');
      console.log(pingResult);
      console.log('\nO serviço PostgreSQL está acessível a partir do contêiner da aplicação.');
    } catch (error) {
      console.error('\nErro ao testar conectividade:');
      console.error(error.message);
      console.log('\nO serviço PostgreSQL pode não estar acessível a partir do contêiner da aplicação.');
    }
    
    // Salvar configuração
    const config = dbConfig.getConfig();
    console.log('\nConfiguração atual:');
    console.log(JSON.stringify(config, null, 2));
    
    console.log('\nConfiguração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a configuração:', error);
  }
}

// Executar o script
setupDbConfig().catch(console.error);
