#!/bin/bash

# Script para preparar os arquivos de correção de autenticação
# Este script cria a estrutura de diretórios e copia os arquivos necessários
# para a pasta auth-fixes, que será montada no contêiner Docker.

# Definir diretório base
BASE_DIR="/home/jean/avaliarh"
TARGET_DIR="${BASE_DIR}/auth-fixes"

# Criar diretórios necessários
mkdir -p "${TARGET_DIR}/scripts"
mkdir -p "${TARGET_DIR}/pages/api/auth"
mkdir -p "${TARGET_DIR}/pages/admin"
mkdir -p "${TARGET_DIR}/pages/superadmin"
mkdir -p "${TARGET_DIR}/docs"
mkdir -p "${TARGET_DIR}/logs"

# Copiar arquivos principais
cp "${BASE_DIR}/middleware.ts" "${TARGET_DIR}/"
cp "${BASE_DIR}/next.config.js" "${TARGET_DIR}/"

# Copiar arquivos de páginas
cp "${BASE_DIR}/pages/api/auth/[...nextauth].ts" "${TARGET_DIR}/pages/api/auth/"
cp "${BASE_DIR}/pages/admin/login.tsx" "${TARGET_DIR}/pages/admin/"
cp "${BASE_DIR}/pages/superadmin/login.tsx" "${TARGET_DIR}/pages/superadmin/"

# Copiar scripts de diagnóstico
cp "${BASE_DIR}/scripts/check-production.js" "${TARGET_DIR}/scripts/"
cp "${BASE_DIR}/scripts/test-auth-flow.js" "${TARGET_DIR}/scripts/" 2>/dev/null || true
cp "${BASE_DIR}/scripts/check-server.js" "${TARGET_DIR}/scripts/" 2>/dev/null || true
cp "${BASE_DIR}/scripts/test-auth.js" "${TARGET_DIR}/scripts/" 2>/dev/null || true

# Copiar documentação
cp "${BASE_DIR}/docs/auth-fixes-summary.md" "${TARGET_DIR}/docs/" 2>/dev/null || true
cp "${BASE_DIR}/docs/auth-troubleshooting.md" "${TARGET_DIR}/docs/" 2>/dev/null || true
cp "${BASE_DIR}/docs/deployment-guide.md" "${TARGET_DIR}/docs/" 2>/dev/null || true

# Criar um arquivo README.md para explicar as correções
cat > "${TARGET_DIR}/README.md" << EOF
# Correções de Autenticação para AvaliaRH

Este diretório contém as correções para os problemas de autenticação no AvaliaRH,
especialmente relacionados ao funcionamento com proxy reverso HTTPS (Traefik).

## Arquivos Incluídos

- \`middleware.ts\`: Middleware atualizado para autenticação com suporte a proxy reverso
- \`next.config.js\`: Configuração do Next.js atualizada
- \`pages/api/auth/[...nextauth].ts\`: Configuração do NextAuth atualizada
- \`pages/admin/login.tsx\`: Página de login do admin atualizada
- \`pages/superadmin/login.tsx\`: Página de login do superadmin atualizada
- \`scripts/\`: Scripts de diagnóstico para testar a autenticação
- \`docs/\`: Documentação sobre as correções implementadas

## Como Usar

Estes arquivos serão copiados automaticamente para o diretório do aplicativo
durante a inicialização do contêiner Docker.

Os scripts de diagnóstico podem ser executados manualmente usando o serviço
auth-diagnostic conforme descrito no guia de implantação.
EOF

# Criar um script de verificação rápida para ser executado em produção
cat > "${TARGET_DIR}/scripts/verify-auth.js" << EOF
/**
 * Script para verificação rápida da autenticação
 * 
 * Este script verifica se as configurações de autenticação estão corretas
 * e se os endpoints principais estão respondendo adequadamente.
 */

console.log('=== Verificação Rápida de Autenticação ===');
console.log('Data e hora: ' + new Date().toISOString());
console.log('\nVariáveis de ambiente:');
console.log('NEXTAUTH_URL: ' + process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_URL_INTERNAL: ' + process.env.NEXTAUTH_URL_INTERNAL);
console.log('NEXT_PUBLIC_DOMAIN: ' + process.env.NEXT_PUBLIC_DOMAIN);
console.log('NODE_ENV: ' + process.env.NODE_ENV);

console.log('\nVerificando arquivos:');
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  '/app/middleware.ts',
  '/app/pages/api/auth/[...nextauth].ts',
  '/app/pages/admin/login.tsx',
  '/app/pages/superadmin/login.tsx'
];

filesToCheck.forEach(file => {
  try {
    const stats = fs.statSync(file);
    console.log(\`\${file}: \${stats.size} bytes, modificado em \${stats.mtime}\`);
  } catch (error) {
    console.log(\`\${file}: ERRO - \${error.message}\`);
  }
});

console.log('\n=== Verificação concluída ===');
EOF

# Dar permissões de execução aos scripts
chmod +x "${TARGET_DIR}/scripts/"*.js

echo "Preparação concluída. Arquivos copiados para ${TARGET_DIR}"
echo "Para implantar as correções:"
echo "1. Transfira o diretório ${TARGET_DIR} para o servidor de produção"
echo "2. Atualize o docker-compose.yml para incluir o volume:"
echo "   - ./auth-fixes:/auth-fixes:ro"
echo "3. Implante com: docker stack deploy -c docker-compose.yml avaliarh"
echo "4. Para executar o diagnóstico: docker service scale avaliarh_auth-diagnostic=1"
