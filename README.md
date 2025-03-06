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

## Configuração

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

## Estrutura do Projeto

- `/pages` - Rotas e páginas da aplicação
- `/components` - Componentes React reutilizáveis
- `/prisma` - Modelo de dados e migrações
- `/styles` - Estilos globais
- `/lib` - Utilitários e funções auxiliares
- `/public` - Arquivos estáticos
