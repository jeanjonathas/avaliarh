# Guia de Implantação das Correções de Autenticação

Este guia descreve os passos necessários para implantar as correções de autenticação no ambiente de produção do AvaliaRH (Admitto).

## Pré-requisitos

- Acesso SSH ao servidor de produção
- Acesso ao repositório Git do projeto
- Docker e Docker Compose instalados no servidor

## Configuração Atual do Ambiente

O ambiente de produção utiliza Docker Swarm com a seguinte configuração:

- **Domínios**: admitto.com.br e admitto.app
- **Proxy Reverso**: Traefik com certificados SSL via Let's Encrypt
- **Banco de Dados**: PostgreSQL 14
- **Node.js**: Versão 18
- **Rede**: ralliugaNet (externa)

## Passos para Implantação

### 1. Backup do Ambiente Atual

Antes de aplicar qualquer alteração, faça um backup do ambiente atual:

```bash
# Backup do banco de dados
docker exec -t $(docker ps -q -f name=avaliarh_postgres) pg_dump -U postgres -d avaliacao_candidatos > backup_$(date +%Y%m%d).sql

# Backup do arquivo .env
cp /opt/avaliarh/.env /opt/avaliarh/.env.backup

# Backup do docker-compose.yml
cp /caminho/para/docker-compose.yml /caminho/para/docker-compose.yml.backup
```

### 2. Preparar as Alterações

Existem duas abordagens possíveis:

#### Opção A: Criar um Fork do Repositório com as Alterações

Esta é a abordagem recomendada, pois permite testar as alterações antes de aplicá-las em produção:

1. Crie um fork do repositório https://github.com/jeanjonathas/avaliarh.git
2. Clone o fork para sua máquina local
3. Aplique as alterações que fizemos nos seguintes arquivos:
   - middleware.ts
   - pages/api/auth/[...nextauth].ts
   - pages/admin/login.tsx
   - pages/superadmin/login.tsx
   - next.config.js
4. Adicione os scripts de diagnóstico na pasta scripts/
5. Adicione a documentação na pasta docs/
6. Faça commit e push das alterações para o seu fork
7. Atualize o docker-compose.yml para apontar para o seu fork

#### Opção B: Modificar os Arquivos Diretamente no Servidor

Se não for possível criar um fork, você pode modificar os arquivos diretamente no servidor:

1. Acesse o servidor via SSH
2. Crie um diretório temporário para as alterações:

```bash
mkdir -p /opt/avaliarh/hotfix
```

3. Copie os arquivos modificados para este diretório:

```bash
# Copie os arquivos modificados para o servidor
scp middleware.ts user@servidor:/opt/avaliarh/hotfix/
scp pages/api/auth/[...nextauth].ts user@servidor:/opt/avaliarh/hotfix/
scp pages/admin/login.tsx user@servidor:/opt/avaliarh/hotfix/
scp pages/superadmin/login.tsx user@servidor:/opt/avaliarh/hotfix/
scp next.config.js user@servidor:/opt/avaliarh/hotfix/
```

4. Modifique o docker-compose.yml para copiar esses arquivos para o contêiner durante a inicialização

### 3. Atualizar o Docker Compose

Edite o arquivo docker-compose.yml para incluir as novas variáveis de ambiente e volumes:

```yaml
version: "3.7"
services:
  app:
    image: node:18
    entrypoint: ["/bin/bash", "-c"]
    command: [
      "git clone https://github.com/jeanjonathas/avaliarh.git /tmp/app && cd /tmp/app && npm install --no-fund --no-audit --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy && cp /opt/avaliarh/.env /tmp/app/.env && cp -f /opt/avaliarh/hotfix/* /tmp/app/ 2>/dev/null || true && npm run build && NODE_ENV=production npm run start"
    ]
    environment:
      - DATABASE_URL=postgresql://postgres:02e821629ceff274c853f24327a36132@postgres:5432/avaliacao_candidatos?schema=public
      - NODE_ENV=production
      - NEXTAUTH_SECRET=02e821629ceff274c853f24327a36132
      - NEXTAUTH_URL=https://admitto.com.br
      - NEXTAUTH_URL_INTERNAL=http://localhost:3000
      - NEXT_PUBLIC_DOMAIN=admitto.com.br
    volumes:
      - /opt/avaliarh/.env:/opt/avaliarh/.env
      - /opt/avaliarh/hotfix:/opt/avaliarh/hotfix
    networks:
      - avaliarh_network
    depends_on:
      - postgres
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      labels:
        - traefik.enable=true
        - traefik.http.routers.avaliarh.rule=Host(`admitto.com.br`) || Host(`admitto.app`)
        - traefik.http.routers.avaliarh.entrypoints=websecure
        - traefik.http.routers.avaliarh.tls=true
        - traefik.http.routers.avaliarh.tls.certresolver=letsencryptresolver
        - traefik.http.services.avaliarh.loadbalancer.server.port=3000
        - traefik.http.services.avaliarh.loadbalancer.passHostHeader=true
        - traefik.http.routers.avaliarh.service=avaliarh
```

As principais alterações são:
- Adição da variável `NEXT_PUBLIC_DOMAIN=admitto.com.br`
- Adição do volume `/opt/avaliarh/hotfix:/opt/avaliarh/hotfix`
- Modificação do comando para copiar os arquivos do hotfix: `cp -f /opt/avaliarh/hotfix/* /tmp/app/ 2>/dev/null || true`

### 4. Atualizar as Variáveis de Ambiente

Edite o arquivo `/opt/avaliarh/.env` para incluir as variáveis necessárias:

```bash
# Adicione ao arquivo .env
NEXT_PUBLIC_DOMAIN=admitto.com.br
```

### 5. Implantar as Alterações

```bash
# Aplicar as alterações no Docker Swarm
docker stack deploy -c docker-compose.yml avaliarh
```

### 6. Verificar os Logs

Monitore os logs para garantir que tudo está funcionando corretamente:

```bash
# Verificar logs do contêiner da aplicação
docker service logs -f avaliarh_app
```

### 7. Testar a Autenticação

Após a implantação, acesse as seguintes URLs para testar o funcionamento:

- https://admitto.com.br/admin/login
- https://admitto.com.br/superadmin/login

Verifique se o login e o redirecionamento estão funcionando corretamente.

## Diagnóstico de Autenticação em Produção

Para facilitar o diagnóstico de problemas de autenticação no ambiente de produção, foi adicionado um serviço específico no arquivo `docker-compose.yml`. Este serviço (`auth-diagnostic`) está configurado para:

1. Executar scripts de diagnóstico de autenticação
2. Salvar os resultados em arquivos de log
3. Não interferir com o funcionamento normal da aplicação

### Como usar o serviço de diagnóstico

O serviço está configurado com `replicas: 0` por padrão, o que significa que ele não será iniciado automaticamente. Para executar o diagnóstico:

```bash
# Escalar o serviço para 1 réplica
docker service scale avaliarh_auth-diagnostic=1

# Verificar os logs do serviço
docker service logs avaliarh_auth-diagnostic

# Acessar os logs de diagnóstico
docker exec -it $(docker ps -q -f name=avaliarh_app) cat /app/logs/auth-diagnostic-*.log

# Após concluir o diagnóstico, escalar de volta para 0
docker service scale avaliarh_auth-diagnostic=0
```

### Arquivos de diagnóstico

Os scripts de diagnóstico verificam:

- Configuração das variáveis de ambiente
- Headers HTTP fornecidos pelo Traefik
- Comportamento dos endpoints de autenticação
- Status dos serviços Docker e Traefik

Os resultados são salvos em arquivos de log no diretório `/app/logs/` com o formato `auth-diagnostic-YYYYMMDD-HHMMSS.log`.

### Aplicação das correções de autenticação

As correções de autenticação são aplicadas automaticamente durante a inicialização do serviço `app`, desde que o diretório `auth-fixes` esteja presente e montado corretamente no contêiner.

Para preparar os arquivos de correção:

1. Execute o script `prepare-auth-fixes.sh` no ambiente de desenvolvimento
2. Transfira o diretório `auth-fixes` gerado para o servidor de produção
3. Certifique-se de que o volume está corretamente configurado no `docker-compose.yml`
4. Torne os scripts executáveis no servidor de produção:

```bash
# No servidor de produção
chmod +x ./auth-fixes/scripts/*.js
```

5. Implante a stack atualizada:

```bash
docker stack deploy -c docker-compose.yml avaliarh
```

## Verificação Pós-implantação

Após a implantação, verifique os seguintes pontos:

1. **Acesso ao Login**: Verifique se as páginas de login estão acessíveis.
2. **Autenticação**: Teste o login com diferentes tipos de usuários.
3. **Redirecionamento**: Verifique se os redirecionamentos estão funcionando corretamente.
4. **Acesso a Rotas Protegidas**: Teste o acesso a rotas protegidas após o login.
5. **Logs**: Monitore os logs para identificar possíveis erros.

## Rollback em Caso de Problemas

Se surgirem problemas após a implantação, você pode reverter para a versão anterior:

```bash
# Remover o diretório de hotfix
rm -rf /opt/avaliarh/hotfix

# Restaurar o arquivo .env original
cp /opt/avaliarh/.env.backup /opt/avaliarh/.env

# Reimplantar o serviço
docker stack deploy -c docker-compose.yml.backup avaliarh
```

## Contato para Suporte

Se você encontrar problemas durante a implantação, entre em contato com a equipe de desenvolvimento para obter suporte adicional.
