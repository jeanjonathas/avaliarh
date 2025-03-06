# Sistema de Avaliação de Candidatos

Sistema moderno para avaliação de candidatos com interface para candidatos e administradores.

## Funcionalidades

- **Área do Candidato**:
  - Tela de boas-vindas com explicação do teste
  - Formulário para dados básicos
  - Teste com 6 etapas (10 questões de múltipla escolha cada)
  - Tela de agradecimento ao finalizar

- **Área do Administrador**:
  - Login seguro
  - Visualização dos resultados dos candidatos
  - Cadastro e gerenciamento de perguntas

## Tecnologias

- Next.js 14
- React 18
- PostgreSQL
- Prisma ORM
- NextAuth.js para autenticação
- TailwindCSS para estilização
- TypeScript

## Configuração para Desenvolvimento

### Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando

### Instalação

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure o arquivo `.env` com suas variáveis de ambiente:
   ```
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/avaliacao_candidatos"
   NEXTAUTH_SECRET="sua_chave_secreta"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. Execute as migrações do banco de dados:
   ```
   npx prisma migrate dev
   ```
5. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```
6. Acesse http://localhost:3000

### Configuração Inicial

1. Acesse a área de administrador com as credenciais padrão:
   - Email: admin@empresa.com
   - Senha: admin123
2. Altere a senha padrão imediatamente após o primeiro login
3. Comece a cadastrar perguntas para o teste

## Implantação em Produção

### Método 1: Implantação Direta com Docker Compose

1. Clone o repositório no servidor:
   ```bash
   git clone https://github.com/jeanjonathas/avaliarh.git
   cd avaliarh
   ```

2. Crie a rede Docker (se ainda não existir):
   ```bash
   docker network create ralliugaNet
   ```

3. Inicie os serviços com Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Para visualizar os logs:
   ```bash
   docker-compose logs -f
   ```

5. Para parar os serviços:
   ```bash
   docker-compose down
   ```

### Método 2: Implantação com Portainer

1. Acesse o Portainer no seu servidor
2. Navegue até "Stacks" e clique em "Add stack"
3. Dê um nome para o stack (ex: "avaliarh")
4. Na seção "Build method", selecione "Repository"
5. Insira a URL do repositório: `https://github.com/jeanjonathas/avaliarh.git`
6. Especifique o caminho para o arquivo: `docker-compose-portainer.yml`
7. Clique em "Deploy the stack"

### Configuração do Traefik para SSL

Se você estiver usando Traefik como proxy reverso, certifique-se de que:

1. O Traefik esteja configurado com um resolver Let's Encrypt chamado `letsencryptresolver`
2. O entrypoint `websecure` esteja configurado para a porta 443
3. A rede `ralliugaNet` esteja conectada ao Traefik

## Estrutura do Projeto

- `/pages` - Rotas e páginas da aplicação
- `/components` - Componentes React reutilizáveis
- `/prisma` - Modelo de dados e migrações
- `/styles` - Estilos globais
- `/lib` - Utilitários e funções auxiliares
- `/public` - Arquivos estáticos
