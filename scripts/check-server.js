/**
 * Script para verificar o status do servidor e diagnosticar problemas de autenticação
 * 
 * Este script verifica a configuração do servidor e testa a conexão
 * com o banco de dados e o funcionamento do NextAuth.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Inicializar o cliente Prisma
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

// Função para verificar variáveis de ambiente
async function checkEnvironmentVariables() {
  console.log('\n=== Verificando variáveis de ambiente ===');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NODE_ENV'
  ];
  
  const optionalVars = [
    'NEXTAUTH_URL_INTERNAL',
    'NEXT_PUBLIC_DOMAIN'
  ];
  
  let allRequiredVarsPresent = true;
  
  // Verificar variáveis obrigatórias
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${maskSensitiveData(varName, process.env[varName])}`);
    } else {
      console.log(`❌ ${varName}: Não definido`);
      allRequiredVarsPresent = false;
    }
  }
  
  // Verificar variáveis opcionais
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`ℹ️ ${varName}: ${process.env[varName]}`);
    } else {
      console.log(`ℹ️ ${varName}: Não definido (opcional)`);
    }
  }
  
  return allRequiredVarsPresent;
}

// Função para mascarar dados sensíveis
function maskSensitiveData(varName, value) {
  if (varName === 'DATABASE_URL') {
    // Mascarar a URL do banco de dados
    try {
      const url = new URL(value);
      if (url.password) {
        url.password = '****';
      }
      return url.toString();
    } catch (e) {
      return '****';
    }
  } else if (varName === 'NEXTAUTH_SECRET') {
    // Mascarar o segredo do NextAuth
    return value.substring(0, 3) + '****' + value.substring(value.length - 3);
  }
  
  return value;
}

// Função para verificar a conexão com o banco de dados
async function checkDatabaseConnection() {
  console.log('\n=== Verificando conexão com o banco de dados ===');
  
  try {
    // Tentar executar uma consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexão com o banco de dados: OK');
    
    // Verificar tabelas do NextAuth
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableNames = tables.map(t => t.table_name);
    console.log(`ℹ️ Tabelas encontradas: ${tableNames.length}`);
    
    // Verificar se existem usuários no banco
    const userCount = await prisma.user.count();
    console.log(`ℹ️ Número de usuários: ${userCount}`);
    
    return true;
  } catch (error) {
    console.log('❌ Erro na conexão com o banco de dados:');
    console.error(error);
    return false;
  }
}

// Função para verificar arquivos de configuração
async function checkConfigFiles() {
  console.log('\n=== Verificando arquivos de configuração ===');
  
  const files = [
    { path: '.env', required: false },
    { path: '.env.local', required: false },
    { path: '.env.production', required: false },
    { path: 'next.config.js', required: true },
    { path: 'middleware.ts', required: true },
    { path: 'pages/api/auth/[...nextauth].ts', required: true }
  ];
  
  let allRequiredFilesPresent = true;
  
  for (const file of files) {
    const filePath = path.join(process.cwd(), file.path);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file.path}: ${stats.size} bytes, modificado em ${stats.mtime.toLocaleString()}`);
    } else {
      console.log(`${file.required ? '❌' : 'ℹ️'} ${file.path}: Não encontrado${file.required ? ' (obrigatório)' : ' (opcional)'}`);
      if (file.required) {
        allRequiredFilesPresent = false;
      }
    }
  }
  
  return allRequiredFilesPresent;
}

// Função para verificar informações do sistema
async function checkSystemInfo() {
  console.log('\n=== Informações do sistema ===');
  
  console.log(`ℹ️ Sistema operacional: ${os.type()} ${os.release()}`);
  console.log(`ℹ️ Memória total: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
  console.log(`ℹ️ Memória livre: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`);
  console.log(`ℹ️ CPUs: ${os.cpus().length}`);
  console.log(`ℹ️ Hostname: ${os.hostname()}`);
  console.log(`ℹ️ Diretório atual: ${process.cwd()}`);
  console.log(`ℹ️ Versão do Node: ${process.version}`);
  
  // Verificar portas em uso
  try {
    const { execSync } = require('child_process');
    const portsOutput = execSync('netstat -tuln | grep LISTEN').toString();
    console.log('\nℹ️ Portas em uso:');
    console.log(portsOutput);
  } catch (error) {
    console.log('ℹ️ Não foi possível verificar as portas em uso');
  }
}

// Função principal
async function main() {
  console.log('=== Diagnóstico do Servidor AvaliaRH ===');
  console.log(`Data e hora: ${new Date().toLocaleString()}`);
  
  try {
    const envOk = await checkEnvironmentVariables();
    const dbOk = await checkDatabaseConnection();
    const filesOk = await checkConfigFiles();
    await checkSystemInfo();
    
    console.log('\n=== Resumo do diagnóstico ===');
    console.log(`Variáveis de ambiente: ${envOk ? '✅ OK' : '❌ Problemas encontrados'}`);
    console.log(`Conexão com o banco de dados: ${dbOk ? '✅ OK' : '❌ Problemas encontrados'}`);
    console.log(`Arquivos de configuração: ${filesOk ? '✅ OK' : '❌ Problemas encontrados'}`);
    
    if (envOk && dbOk && filesOk) {
      console.log('\n✅ Todos os testes passaram! O servidor parece estar configurado corretamente.');
      console.log('Para testar a autenticação, execute o script test-auth.js');
    } else {
      console.log('\n❌ Foram encontrados problemas na configuração do servidor.');
      console.log('Revise os itens marcados com ❌ e corrija-os antes de continuar.');
    }
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o diagnóstico
main().catch(error => {
  console.error('Erro fatal durante o diagnóstico:', error);
  process.exit(1);
});
