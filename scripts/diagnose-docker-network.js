// Script para diagnosticar problemas de rede no Docker
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// Importar configuração do banco de dados
let dbConfig;
try {
  dbConfig = require('../lib/db-config');
} catch (error) {
  console.error('Erro ao carregar módulo de configuração do banco de dados:', error);
  dbConfig = {
    getConfig: () => ({ postgresServiceName: 'postgres' })
  };
}

async function runCommand(command) {
  console.log(`\n> Executando: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error('STDERR:', stderr);
    return stdout;
  } catch (error) {
    console.error(`Erro ao executar comando: ${error.message}`);
    return '';
  }
}

async function diagnoseDockerNetwork() {
  console.log('=== DIAGNÓSTICO DE REDE DOCKER PARA AVALIARH ===');
  
  // Verificar variáveis de ambiente
  console.log('\n=== VARIÁVEIS DE AMBIENTE ===');
  const databaseUrl = process.env.DATABASE_URL || 'não definido';
  console.log('DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
  
  // Extrair o host da URL do banco de dados
  let dbHost = 'postgres';
  if (databaseUrl && databaseUrl.includes('@')) {
    dbHost = databaseUrl.split('@')[1].split(':')[0];
  }
  console.log(`Host do banco de dados na URL: ${dbHost}`);
  
  // Verificar configuração atual
  const config = dbConfig.getConfig();
  console.log('\n=== CONFIGURAÇÃO DO BANCO DE DADOS ===');
  console.log(JSON.stringify(config, null, 2));
  
  // Listar contêineres em execução
  console.log('\n=== CONTÊINERES EM EXECUÇÃO ===');
  await runCommand('docker ps');
  
  // Listar contêineres PostgreSQL
  console.log('\n=== CONTÊINERES POSTGRESQL ===');
  const postgresContainers = await runCommand('docker ps | grep postgres');
  
  if (!postgresContainers) {
    console.log('Nenhum contêiner PostgreSQL encontrado!');
    console.log('PROBLEMA: Seu banco de dados não está em execução.');
    return;
  }
  
  // Listar redes Docker
  console.log('\n=== REDES DOCKER ===');
  await runCommand('docker network ls');
  
  // Verificar rede avaliarh_network
  console.log('\n=== VERIFICANDO REDE AVALIARH_NETWORK ===');
  const networkExists = await runCommand('docker network ls | grep avaliarh_network');
  
  if (!networkExists) {
    console.log('PROBLEMA: A rede avaliarh_network não existe!');
    console.log('SOLUÇÃO: Crie a rede com o comando: docker network create avaliarh_network');
    return;
  }
  
  // Inspecionar a rede avaliarh_network
  console.log('\n=== INSPECIONANDO REDE AVALIARH_NETWORK ===');
  const networkInspect = await runCommand('docker network inspect avaliarh_network');
  
  // Verificar contêineres na rede
  console.log('\n=== CONTÊINERES NA REDE AVALIARH_NETWORK ===');
  
  // Verificar se o contêiner avaliarh_postgres existe
  console.log('\n=== VERIFICANDO CONTÊINER AVALIARH_POSTGRES ===');
  const postgresContainer = await runCommand('docker ps --filter "name=avaliarh_postgres" --format "{{.Names}}"');
  
  if (!postgresContainer) {
    console.log('PROBLEMA: O contêiner avaliarh_postgres não existe ou não está em execução!');
    console.log('SOLUÇÃO: Verifique se o contêiner está sendo criado corretamente no docker-compose.yml');
  } else {
    console.log(`Contêiner PostgreSQL encontrado: ${postgresContainer.trim()}`);
    
    // Testar conexão com o banco de dados
    console.log('\n=== TESTE DE CONEXÃO COM O BANCO DE DADOS ===');
    
    // Verificar se estamos em um contêiner Docker
    const isInDocker = fs.existsSync('/.dockerenv');
    
    if (isInDocker) {
      console.log('Executando em um contêiner Docker');
      
      // Testar conexão com postgres
      await runCommand('ping -c 3 postgres || echo "Não foi possível conectar ao host postgres"');
      
      // Testar conexão com avaliarh_postgres
      await runCommand('ping -c 3 avaliarh_postgres || echo "Não foi possível conectar ao host avaliarh_postgres"');
      
      // Testar conexão com o IP do PostgreSQL
      const postgresIP = await runCommand('getent hosts postgres | awk \'{print $1}\'');
      if (postgresIP) {
        console.log(`IP do host postgres: ${postgresIP.trim()}`);
        await runCommand(`ping -c 3 ${postgresIP.trim()}`);
      }
    } else {
      console.log('Executando fora de um contêiner Docker');
      
      // Obter o ID do contêiner da aplicação
      const appContainer = await runCommand('docker ps --filter "name=avaliarh_app" --format "{{.ID}}"');
      
      if (appContainer) {
        console.log(`Contêiner da aplicação encontrado: ${appContainer.trim()}`);
        
        // Testar conexão a partir do contêiner da aplicação
        await runCommand(`docker exec ${appContainer.trim()} ping -c 3 postgres || echo "Não foi possível conectar ao host postgres"`);
        await runCommand(`docker exec ${appContainer.trim()} ping -c 3 avaliarh_postgres || echo "Não foi possível conectar ao host avaliarh_postgres"`);
      } else {
        console.log('Contêiner da aplicação não encontrado');
      }
    }
  }
  
  // Sugerir solução
  console.log('\n=== DIAGNÓSTICO E RECOMENDAÇÕES ===');
  console.log('1. Verifique se o contêiner PostgreSQL está definido com container_name: avaliarh_postgres no docker-compose.yml');
  console.log('2. Verifique se ambos os contêineres (app e postgres) estão na mesma rede (avaliarh_network)');
  console.log('3. Modifique o DATABASE_URL para usar o nome correto do serviço PostgreSQL');
  console.log('4. Execute o script de configuração antes de iniciar a aplicação: node scripts/setup-db-config.js');
  console.log('5. Reinicie todos os contêineres após fazer as alterações');
}

// Executar diagnóstico
diagnoseDockerNetwork().catch(console.error);
