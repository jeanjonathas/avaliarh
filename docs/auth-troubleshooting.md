# Guia de Solução de Problemas de Autenticação no AvaliaRH

Este documento fornece orientações para resolver problemas comuns de autenticação no sistema AvaliaRH, especialmente quando executado atrás de um proxy reverso com HTTPS.

## Problemas Comuns

### 1. Middleware não reconhece o token JWT

**Sintomas:**
- Usuário consegue fazer login, mas é redirecionado de volta para a página de login
- Erros 401 (Não Autenticado) ao acessar rotas protegidas
- Logs mostram "Token não encontrado" no middleware

**Soluções:**
- Verifique se `NEXTAUTH_SECRET` está configurado corretamente e é o mesmo em todos os ambientes
- Certifique-se de que `NEXTAUTH_URL` aponta para a URL correta com HTTPS
- Configure `NEXTAUTH_URL_INTERNAL` para o endereço interno do servidor (geralmente http://localhost:3000)
- Verifique se os cookies estão sendo configurados com a opção `secure` em produção

### 2. Loops de Redirecionamento

**Sintomas:**
- Navegador mostra erro de "muitos redirecionamentos"
- Usuário é constantemente redirecionado entre páginas de login e dashboard

**Soluções:**
- Verifique a lógica do middleware para garantir que as páginas de login não estão protegidas
- Certifique-se de que a verificação de sessão na página de login está funcionando corretamente
- Adicione logs detalhados para rastrear o fluxo de redirecionamento

### 3. Problemas com Proxy Reverso

**Sintomas:**
- Autenticação funciona localmente, mas falha em produção com proxy reverso
- Cookies não são enviados corretamente entre requisições

**Soluções:**
- Configure o proxy reverso para encaminhar os headers de autenticação corretamente
- Certifique-se de que o proxy está configurado para preservar os cookies
- Verifique se a configuração SSL está correta e os certificados são válidos

## Scripts de Diagnóstico

O projeto inclui dois scripts para ajudar a diagnosticar problemas:

1. **check-server.js**: Verifica a configuração do servidor, conexão com o banco de dados e variáveis de ambiente
   ```bash
   node scripts/check-server.js
   ```

2. **test-auth.js**: Testa as rotas de autenticação e verifica o comportamento do middleware
   ```bash
   node scripts/test-auth.js
   ```

## Configuração Recomendada

### Variáveis de Ambiente

```env
# Configuração básica
NODE_ENV=production

# Configuração do NextAuth
NEXTAUTH_SECRET=seu_segredo_seguro_aqui
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# Configuração do domínio
NEXT_PUBLIC_DOMAIN=seu-dominio.com
```

### Middleware

O middleware deve ser configurado para:
- Verificar corretamente o token JWT
- Permitir acesso às páginas de login e recursos públicos
- Redirecionar usuários não autenticados para a página de login
- Verificar permissões baseadas no papel (role) do usuário

### NextAuth

A configuração do NextAuth deve incluir:
- Estratégia JWT para sessões
- Configuração de cookies segura para ambiente de produção
- Callbacks para incluir informações de papel (role) no token e na sessão

## Procedimento de Reset

Se os problemas persistirem após tentar as soluções acima, considere fazer um reset para um commit estável conhecido:

```bash
git reset --hard 4c1b9b3773bcb46c5adb86c1ebcb0ca5d3c70e68
git clean -fd
npm install
npm run build
```

Este commit contém uma implementação funcional antes das alterações para SSL e pode ser usado como base para implementar as correções necessárias.

## Logs e Depuração

Para obter mais informações sobre problemas de autenticação:

1. Ative o modo de depuração no NextAuth:
   ```javascript
   debug: process.env.NODE_ENV !== 'production'
   ```

2. Adicione logs detalhados no middleware:
   ```javascript
   console.log('Middleware - Token JWT:', token ? 'Presente' : 'Ausente')
   ```

3. Verifique os logs do servidor para mensagens de erro específicas

## Contato para Suporte

Se você continuar enfrentando problemas após tentar estas soluções, entre em contato com a equipe de desenvolvimento para obter suporte adicional.
