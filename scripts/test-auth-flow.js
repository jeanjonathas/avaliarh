/**
 * Script para testar o fluxo de autenticação e middleware
 * 
 * Este script simula o fluxo completo de autenticação e testa
 * o comportamento do middleware com diferentes tipos de usuários.
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const https = require('https');
const http = require('http');
const { parse } = require('url');

// Inicializar o cliente Prisma
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

// Configurações
const config = {
  protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  host: process.env.NODE_ENV === 'production' ? 'avaliarh.com.br' : 'localhost',
  port: process.env.NODE_ENV === 'production' ? 443 : 3000,
  // Credenciais de teste (substitua por credenciais válidas)
  credentials: {
    superadmin: {
      email: 'superadmin@example.com',
      password: 'senha_super_admin'
    },
    admin: {
      email: 'admin@example.com',
      password: 'senha_admin'
    }
  }
};

// Função para fazer uma requisição HTTP/HTTPS
async function makeRequest(path, options = {}) {
  const url = `${config.protocol}://${config.host}:${config.port}${path}`;
  console.log(`Fazendo requisição para: ${url}`);
  
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    // Ignorar erros de certificado em ambiente de desenvolvimento
    agent: config.protocol === 'https' ? new https.Agent({ rejectUnauthorized: false }) : null
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      headers: response.headers,
      data,
      cookies: response.headers.get('set-cookie')
    };
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error.message);
    throw error;
  }
}

// Função para fazer login
async function login(userType) {
  const credentials = config.credentials[userType];
  if (!credentials) {
    throw new Error(`Tipo de usuário desconhecido: ${userType}`);
  }
  
  console.log(`\n=== Tentando login como ${userType} ===`);
  
  try {
    // Fazer a requisição de login
    const loginPath = userType === 'superadmin' ? '/api/auth/callback/credentials' : '/api/auth/callback/credentials';
    const response = await makeRequest(loginPath, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    console.log(`Status da resposta: ${response.status}`);
    console.log('Cookies recebidos:', response.cookies || 'Nenhum');
    
    // Extrair o cookie de sessão
    const sessionCookie = response.cookies?.match(/(next-auth\.session-token|__Secure-next-auth\.session-token)=[^;]+/)?.[0];
    
    if (!sessionCookie) {
      console.log('Nenhum cookie de sessão encontrado na resposta');
      return null;
    }
    
    console.log('Cookie de sessão extraído:', sessionCookie);
    return sessionCookie;
  } catch (error) {
    console.error(`Erro ao fazer login como ${userType}:`, error.message);
    return null;
  }
}

// Função para testar acesso a rotas protegidas
async function testProtectedRoutes(sessionCookie, userType) {
  if (!sessionCookie) {
    console.log('Nenhum cookie de sessão fornecido, não é possível testar rotas protegidas');
    return;
  }
  
  console.log(`\n=== Testando rotas protegidas como ${userType} ===`);
  
  const routes = [
    '/api/admin/test',
    '/api/superadmin/test',
    '/admin/dashboard',
    '/superadmin/dashboard'
  ];
  
  for (const route of routes) {
    try {
      console.log(`\nTestando acesso a: ${route}`);
      
      const response = await makeRequest(route, {
        headers: {
          Cookie: sessionCookie
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status >= 300 && response.status < 400) {
        console.log(`Redirecionamento para: ${response.headers.get('location')}`);
      } else if (response.status === 200) {
        console.log('Acesso permitido');
      } else if (response.status === 401) {
        console.log('Não autenticado');
      } else if (response.status === 403) {
        console.log('Não autorizado');
      }
    } catch (error) {
      console.error(`Erro ao testar ${route}:`, error.message);
    }
  }
}

// Função para testar o fluxo completo
async function testAuthFlow() {
  console.log('=== Iniciando teste de fluxo de autenticação ===');
  console.log('Configuração:', {
    protocol: config.protocol,
    host: config.host,
    port: config.port
  });
  
  // Testar login como superadmin
  const superadminCookie = await login('superadmin');
  if (superadminCookie) {
    await testProtectedRoutes(superadminCookie, 'superadmin');
  }
  
  // Testar login como admin
  const adminCookie = await login('admin');
  if (adminCookie) {
    await testProtectedRoutes(adminCookie, 'admin');
  }
  
  console.log('\n=== Teste de fluxo de autenticação concluído ===');
}

// Função para verificar usuários no banco de dados
async function checkUsers() {
  console.log('\n=== Verificando usuários no banco de dados ===');
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true
      }
    });
    
    console.log(`Total de usuários: ${users.length}`);
    
    for (const user of users) {
      console.log(`\nUsuário: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Papel: ${user.role}`);
      console.log(`ID da Empresa: ${user.companyId || 'N/A'}`);
    }
  } catch (error) {
    console.error('Erro ao verificar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar os testes
async function main() {
  try {
    // Verificar usuários no banco de dados
    await checkUsers();
    
    // Testar o fluxo de autenticação
    await testAuthFlow();
  } catch (error) {
    console.error('Erro durante os testes:', error);
  }
}

// Executar o script
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
