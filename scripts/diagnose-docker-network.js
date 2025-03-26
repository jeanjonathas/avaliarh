// Script para diagnosticar problemas de rede no Docker
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runCommand(command) {
  console.log(`\n> Executando: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error('STDERR:', stderr);
  } catch (error) {
    console.error(`Erro ao executar comando: ${error.message}`);
  }
}

async function diagnoseDockerNetwork() {
  console.log('=== DIAGNÓSTICO DE REDE DOCKER ===');
  
  // Verificar variáveis de ambiente
  console.log('\n=== VARIÁVEIS DE AMBIENTE ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'não definido');
  
  // Listar contêineres em execução
  await runCommand('docker ps');
  
  // Obter o ID do contêiner da aplicação
  let appContainerId;
  try {
    const { stdout } = await execPromise("docker ps | grep avaliarh_app | awk '{print $1}'");
    appContainerId = stdout.trim();
    console.log(`\nID do contêiner da aplicação: ${appContainerId}`);
  } catch (error) {
    console.error('Não foi possível encontrar o contêiner da aplicação');
    return;
  }
  
  // Listar redes Docker
  await runCommand('docker network ls');
  
  // Obter informações sobre a rede do contêiner
  await runCommand(`docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' ${appContainerId}`);
  
  // Obter a rede do contêiner
  let networkName;
  try {
    const { stdout } = await execPromise(`docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' ${appContainerId}`);
    networkName = stdout.trim();
    console.log(`\nRede do contêiner: ${networkName}`);
  } catch (error) {
    console.error('Não foi possível determinar a rede do contêiner');
    return;
  }
  
  // Inspecionar a rede
  await runCommand(`docker network inspect ${networkName}`);
  
  // Testar conexão com o banco de dados a partir do contêiner
  console.log('\n=== TESTE DE CONEXÃO COM O BANCO DE DADOS ===');
  await runCommand(`docker exec ${appContainerId} ping -c 3 postgres`);
  
  // Tentar conexão com o banco de dados usando o nome específico
  console.log('\n=== TESTE DE CONEXÃO COM NOME ESPECÍFICO ===');
  await runCommand(`docker exec ${appContainerId} ping -c 3 avaliarh_postgres.1 || echo "Não foi possível resolver avaliarh_postgres.1"`);
  
  // Verificar se o contêiner do PostgreSQL está na mesma rede
  console.log('\n=== VERIFICANDO CONTÊINER DO POSTGRESQL ===');
  await runCommand(`docker ps | grep postgres`);
  
  // Sugerir solução
  console.log('\n=== RECOMENDAÇÕES ===');
  console.log('1. Verifique se o contêiner do PostgreSQL está na mesma rede do contêiner da aplicação');
  console.log('2. Verifique se o nome do host no DATABASE_URL corresponde ao nome do serviço no docker-compose.yml');
  console.log('3. Tente usar o endereço IP do contêiner PostgreSQL em vez do nome do host');
}

// Executar diagnóstico
diagnoseDockerNetwork().catch(console.error);
