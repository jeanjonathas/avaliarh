/**
 * Script para verificar a configuração do ambiente de produção
 * 
 * Este script verifica a configuração do ambiente de produção,
 * especialmente com relação ao proxy reverso Traefik e à autenticação.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { execSync } = require('child_process');

// Configurações
const config = {
  domains: ['admitto.com.br', 'admitto.app'],
  endpoints: [
    '/',
    '/admin/login',
    '/superadmin/login',
    '/api/auth/session'
  ],
  envVars: [
    'NEXTAUTH_URL',
    'NEXTAUTH_URL_INTERNAL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_DOMAIN',
    'NODE_ENV'
  ]
};

// Função para verificar se uma URL está acessível
async function checkUrl(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      method: 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'AvaliaRH-Diagnostic-Tool/1.0'
      },
      timeout: 5000,
      rejectUnauthorized: false // Ignorar erros de certificado
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          redirect: res.headers.location,
          contentType: res.headers['content-type'],
          data: data.length > 500 ? `${data.substring(0, 500)}... (truncado)` : data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

// Função para verificar os headers do Traefik
async function checkTraefikHeaders() {
  console.log('\n=== Verificando Headers do Traefik ===');
  
  for (const domain of config.domains) {
    console.log(`\nDomínio: ${domain}`);
    
    const url = `https://${domain}/`;
    console.log(`Verificando: ${url}`);
    
    const result = await checkUrl(url);
    
    if (result.error) {
      console.log(`  Erro: ${result.error}`);
      continue;
    }
    
    console.log(`  Status: ${result.status}`);
    
    // Verificar headers específicos do Traefik
    const traefikHeaders = [
      'x-forwarded-proto',
      'x-forwarded-host',
      'x-forwarded-for',
      'x-real-ip'
    ];
    
    for (const header of traefikHeaders) {
      console.log(`  ${header}: ${result.headers[header] || 'Não encontrado'}`);
    }
    
    // Verificar headers de segurança
    const securityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options'
    ];
    
    console.log('\n  Headers de Segurança:');
    for (const header of securityHeaders) {
      console.log(`  ${header}: ${result.headers[header] || 'Não encontrado'}`);
    }
  }
}

// Função para verificar endpoints específicos
async function checkEndpoints() {
  console.log('\n=== Verificando Endpoints ===');
  
  for (const domain of config.domains) {
    console.log(`\nDomínio: ${domain}`);
    
    for (const endpoint of config.endpoints) {
      const url = `https://${domain}${endpoint}`;
      console.log(`\nVerificando: ${url}`);
      
      const result = await checkUrl(url);
      
      if (result.error) {
        console.log(`  Erro: ${result.error}`);
        continue;
      }
      
      console.log(`  Status: ${result.status}`);
      
      if (result.status >= 300 && result.status < 400) {
        console.log(`  Redirecionamento para: ${result.redirect}`);
      }
      
      if (endpoint === '/api/auth/session') {
        try {
          const sessionData = JSON.parse(result.data);
          console.log(`  Sessão: ${sessionData && sessionData.user ? 'Ativa' : 'Inativa'}`);
        } catch (error) {
          console.log(`  Erro ao analisar dados da sessão: ${error.message}`);
        }
      }
    }
  }
}

// Função para verificar variáveis de ambiente
function checkEnvironmentVariables() {
  console.log('\n=== Verificando Variáveis de Ambiente ===');
  
  for (const envVar of config.envVars) {
    const value = process.env[envVar];
    console.log(`${envVar}: ${value ? (envVar.includes('SECRET') ? '******' : value) : 'Não definido'}`);
  }
}

// Função para verificar a configuração do Docker
function checkDockerConfiguration() {
  console.log('\n=== Verificando Configuração do Docker ===');
  
  try {
    // Verificar se o Docker está em execução
    const dockerVersion = execSync('docker --version').toString().trim();
    console.log(`Docker: ${dockerVersion}`);
    
    // Verificar se o Docker Swarm está ativo
    const swarmStatus = execSync('docker info | grep Swarm').toString().trim();
    console.log(`Swarm: ${swarmStatus}`);
    
    // Listar serviços relacionados ao AvaliaRH
    console.log('\nServiços do Docker Swarm:');
    const services = execSync('docker service ls | grep avaliarh').toString().trim();
    console.log(services || 'Nenhum serviço encontrado');
    
    // Verificar status dos contêineres
    console.log('\nContêineres em execução:');
    const containers = execSync('docker ps | grep avaliarh').toString().trim();
    console.log(containers || 'Nenhum contêiner encontrado');
  } catch (error) {
    console.log(`Erro ao verificar configuração do Docker: ${error.message}`);
  }
}

// Função para verificar a configuração do Traefik
function checkTraefikConfiguration() {
  console.log('\n=== Verificando Configuração do Traefik ===');
  
  try {
    // Verificar se o Traefik está em execução
    const traefikContainer = execSync('docker ps | grep traefik').toString().trim();
    console.log(`Traefik: ${traefikContainer ? 'Em execução' : 'Não encontrado'}`);
    
    if (traefikContainer) {
      // Obter informações sobre o contêiner do Traefik
      const containerId = traefikContainer.split(' ')[0];
      
      // Verificar routers do Traefik
      console.log('\nRouters do Traefik:');
      try {
        const routers = execSync(`docker exec ${containerId} traefik show routers | grep avaliarh`).toString().trim();
        console.log(routers || 'Nenhum router encontrado');
      } catch (error) {
        console.log('Não foi possível obter informações dos routers');
      }
      
      // Verificar services do Traefik
      console.log('\nServices do Traefik:');
      try {
        const services = execSync(`docker exec ${containerId} traefik show services | grep avaliarh`).toString().trim();
        console.log(services || 'Nenhum service encontrado');
      } catch (error) {
        console.log('Não foi possível obter informações dos services');
      }
    }
  } catch (error) {
    console.log(`Erro ao verificar configuração do Traefik: ${error.message}`);
  }
}

// Função principal
async function main() {
  console.log('=== Diagnóstico do Ambiente de Produção ===');
  console.log(`Data e hora: ${new Date().toISOString()}`);
  
  // Verificar variáveis de ambiente
  checkEnvironmentVariables();
  
  // Verificar configuração do Docker
  checkDockerConfiguration();
  
  // Verificar configuração do Traefik
  checkTraefikConfiguration();
  
  // Verificar headers do Traefik
  await checkTraefikHeaders();
  
  // Verificar endpoints
  await checkEndpoints();
  
  console.log('\n=== Diagnóstico Concluído ===');
}

// Executar o script
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
