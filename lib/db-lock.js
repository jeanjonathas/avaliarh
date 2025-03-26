/**
 * Sistema de lock para garantir que todas as conexões vão para o mesmo banco de dados
 * Este módulo cria um arquivo de lock com o IP específico do contêiner PostgreSQL
 * para garantir que todas as consultas sejam roteadas para o mesmo banco de dados.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Caminho para o arquivo de lock
const LOCK_FILE_PATH = path.join(__dirname, '../.db-lock.json');

/**
 * Resolve o IP do contêiner PostgreSQL e salva no arquivo de lock
 */
async function resolveAndLockPostgresIP(hostName = 'postgres') {
  try {
    console.log(`[DB-LOCK] Resolvendo IP para o host: ${hostName}`);
    
    // Tentar obter o ID do contêiner da aplicação
    const { stdout: containerId } = await execPromise("hostname");
    console.log(`[DB-LOCK] ID do contêiner atual: ${containerId.trim()}`);
    
    // Usar o contêiner da aplicação para resolver o IP do PostgreSQL
    const { stdout: dnsLookup } = await execPromise(`getent hosts ${hostName}`);
    
    // Extrair o IP do resultado
    const ip = dnsLookup.trim().split(' ')[0];
    
    if (!ip) {
      throw new Error(`Não foi possível resolver o IP para ${hostName}`);
    }
    
    console.log(`[DB-LOCK] IP resolvido para ${hostName}: ${ip}`);
    
    // Salvar o IP no arquivo de lock
    const lockData = {
      postgresIP: ip,
      hostName: hostName,
      lockedAt: new Date().toISOString(),
      containerId: containerId.trim()
    };
    
    fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockData, null, 2), 'utf8');
    console.log(`[DB-LOCK] Lock criado com sucesso para IP: ${ip}`);
    
    return ip;
  } catch (error) {
    console.error(`[DB-LOCK] Erro ao resolver e bloquear IP: ${error.message}`);
    return null;
  }
}

/**
 * Obtém o IP bloqueado ou resolve um novo
 */
async function getLockedPostgresIP(hostName = 'postgres', forceResolve = false) {
  try {
    // Se forçar resolução ou o arquivo não existir, resolver o IP novamente
    if (forceResolve || !fs.existsSync(LOCK_FILE_PATH)) {
      return await resolveAndLockPostgresIP(hostName);
    }
    
    // Ler o IP do arquivo de lock
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf8'));
    console.log(`[DB-LOCK] Usando IP bloqueado: ${lockData.postgresIP} (host original: ${lockData.hostName})`);
    
    return lockData.postgresIP;
  } catch (error) {
    console.error(`[DB-LOCK] Erro ao obter IP bloqueado: ${error.message}`);
    console.log('[DB-LOCK] Tentando resolver novamente...');
    return await resolveAndLockPostgresIP(hostName);
  }
}

/**
 * Modifica a URL do banco de dados para usar o IP fixo em vez do nome do host
 */
async function getDatabaseUrlWithLockedIP(originalUrl) {
  try {
    // Extrair o host da URL original
    const urlParts = originalUrl.split('@');
    if (urlParts.length !== 2) {
      console.log('[DB-LOCK] Formato de URL inválido, usando original');
      return originalUrl;
    }
    
    const credentials = urlParts[0]; // postgresql://usuario:senha
    const hostAndDb = urlParts[1];   // host:porta/banco
    
    // Extrair o host da URL
    const hostParts = hostAndDb.split('/');
    const hostPort = hostParts[0].split(':');
    const originalHost = hostPort[0];
    const port = hostPort[1] || '5432';
    
    // Obter o IP do PostgreSQL
    const lockedIP = await getLockedPostgresIP(originalHost);
    
    if (!lockedIP) {
      console.log('[DB-LOCK] Não foi possível obter IP bloqueado, usando URL original');
      return originalUrl;
    }
    
    // Reconstruir a URL com o IP em vez do nome do host
    const dbName = hostParts.slice(1).join('/');
    const newUrl = `${credentials}@${lockedIP}:${port}/${dbName}`;
    
    // Log da URL (com senha ocultada)
    console.log('[DB-LOCK] URL modificada: ' + newUrl.replace(/:[^:@]+@/, ':****@'));
    
    return newUrl;
  } catch (error) {
    console.error(`[DB-LOCK] Erro ao modificar URL: ${error.message}`);
    return originalUrl;
  }
}

/**
 * Verifica a conectividade com o banco de dados usando o IP bloqueado
 */
async function checkDatabaseConnectivity() {
  try {
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf8'));
    const { stdout } = await execPromise(`ping -c 1 ${lockData.postgresIP}`);
    console.log(`[DB-LOCK] Conectividade com ${lockData.postgresIP}: OK`);
    return true;
  } catch (error) {
    console.error(`[DB-LOCK] Erro de conectividade: ${error.message}`);
    return false;
  }
}

module.exports = {
  resolveAndLockPostgresIP,
  getLockedPostgresIP,
  getDatabaseUrlWithLockedIP,
  checkDatabaseConnectivity
};
