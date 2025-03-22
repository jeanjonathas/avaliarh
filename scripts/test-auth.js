/**
 * Script para testar a autenticação e o middleware
 * 
 * Este script simula requisições para verificar se o middleware
 * está funcionando corretamente com o NextAuth e o proxy reverso.
 */

const https = require('https');
const http = require('http');
const { parse } = require('url');

// Configurações
const config = {
  protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  host: process.env.NODE_ENV === 'production' ? 'avaliarh.com.br' : 'localhost',
  port: process.env.NODE_ENV === 'production' ? 443 : 3000,
  paths: [
    '/api/admin/test',
    '/api/superadmin/test',
    '/admin/dashboard',
    '/superadmin/dashboard',
    '/admin/login'
  ],
  // Cookie de teste (substitua por um cookie válido para testar autenticação)
  cookie: ''
};

// Função para fazer uma requisição HTTP/HTTPS
function makeRequest(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'AvaliaRH-Test-Script',
      }
    };

    if (cookie) {
      options.headers.Cookie = cookie;
    }

    const client = config.protocol === 'https' ? https : http;

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.length > 0 ? data : null,
          url: path
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Função principal para testar as rotas
async function testRoutes() {
  console.log('Iniciando testes de autenticação e middleware...');
  console.log('Configuração:', {
    protocol: config.protocol,
    host: config.host,
    port: config.port
  });
  
  console.log('\n=== Testando rotas sem autenticação ===');
  for (const path of config.paths) {
    try {
      const response = await makeRequest(path);
      console.log(`${path}: ${response.statusCode} ${getStatusMessage(response.statusCode)}`);
      
      // Verificar redirecionamentos
      if (response.statusCode >= 300 && response.statusCode < 400) {
        console.log(`  → Redirecionamento para: ${response.headers.location}`);
      }
    } catch (error) {
      console.error(`Erro ao testar ${path}:`, error.message);
    }
  }
  
  if (config.cookie) {
    console.log('\n=== Testando rotas com autenticação ===');
    for (const path of config.paths) {
      try {
        const response = await makeRequest(path, config.cookie);
        console.log(`${path}: ${response.statusCode} ${getStatusMessage(response.statusCode)}`);
        
        // Verificar redirecionamentos
        if (response.statusCode >= 300 && response.statusCode < 400) {
          console.log(`  → Redirecionamento para: ${response.headers.location}`);
        }
      } catch (error) {
        console.error(`Erro ao testar ${path} com cookie:`, error.message);
      }
    }
  } else {
    console.log('\nNenhum cookie fornecido para testes autenticados.');
    console.log('Para testar com autenticação, faça login na aplicação e copie o cookie da sessão.');
  }
}

// Função auxiliar para obter mensagem do status HTTP
function getStatusMessage(statusCode) {
  const statusMessages = {
    200: 'OK',
    301: 'Moved Permanently',
    302: 'Found',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  };
  
  return statusMessages[statusCode] || '';
}

// Executar os testes
testRoutes().catch(error => {
  console.error('Erro durante os testes:', error);
});
