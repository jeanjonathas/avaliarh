# AvaliaRH - Sistema de Avaliação de Candidatos

Sistema moderno para avaliação de candidatos com interface para candidatos e administradores, desenvolvido com Next.js, TypeScript e PostgreSQL.

## Funcionalidades

- **Área do Candidato**:
  - Tela de boas-vindas com explicação do teste
  - Sistema de convites com códigos de 4 dígitos
  - Formulário para dados básicos
  - Teste com múltiplas etapas e questões de múltipla escolha
  - Tela de agradecimento ao finalizar

- **Área do Administrador**:
  - Login seguro com NextAuth.js
  - Dashboard com visualização de dados e gráficos
  - Cadastro e gerenciamento de candidatos
  - Sistema de convites com envio por email
  - Gerenciamento de testes, etapas e questões
  - Visualização de resultados e relatórios

## Tecnologias

- Next.js 14.1.0
- React 18
- TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth.js para autenticação
- Nodemailer para envio de emails
- TailwindCSS para estilização
- Material UI (MUI)
- Chart.js para visualizações
- Formik e Yup para validação de formulários
- Jest para testes automatizados
- date-fns para formatação de datas (com suporte a localização pt-BR)

## Estrutura do Projeto

```
/
├── components/           # Componentes React reutilizáveis
├── contexts/             # Contextos React (NotificationContext, etc.)
├── hooks/                # Hooks personalizados
├── lib/                  # Utilitários e funções auxiliares
│   ├── auth.ts           # Configuração de autenticação
│   ├── email.ts          # Serviço de email
│   ├── prisma.ts         # Cliente Prisma
│   └── ...
├── pages/                # Rotas e páginas da aplicação
│   ├── admin/            # Páginas administrativas
│   │   ├── candidate/    # Gerenciamento de candidatos
│   │   ├── test/         # Gerenciamento de testes
│   │   └── ...
│   ├── api/              # API Routes
│   │   ├── admin/        # Endpoints administrativos
│   │   ├── auth/         # Autenticação
│   │   ├── candidates/   # Endpoints para candidatos
│   │   └── ...
│   ├── auth/             # Páginas de autenticação
│   ├── teste/            # Interface de teste para candidatos
│   └── ...
├── prisma/               # Modelo de dados e migrações
│   ├── migrations/       # Migrações do banco de dados
│   ├── schema.prisma     # Schema do Prisma
│   └── seed.ts           # Dados iniciais
├── public/               # Arquivos estáticos
├── scripts/              # Scripts utilitários
├── styles/               # Estilos globais
└── ...
```

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
   EMAIL_SERVER="smtp://usuario:senha@smtp.example.com:587"
   EMAIL_FROM="noreply@example.com"
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

## Sistema de Notificação

O AvaliaRH possui um sistema de notificação centralizado que permite exibir mensagens de feedback ao usuário de forma consistente em toda a aplicação:

### Como Utilizar:

1. **Importar o hook useNotification:**
```typescript
import { useNotification } from '../contexts/NotificationContext';
```

2. **Obter acesso às funções de notificação:**
```typescript
const { showToast, showModal, closeModal } = useNotification();
```

3. **Exibir um toast (mensagem temporária):**
```typescript
// Parâmetros: mensagem, tipo, duração (opcional, padrão: 10000ms)
showToast('Operação realizada com sucesso!', 'success');
showToast('Atenção! Verifique os campos obrigatórios.', 'warning');
showToast('Erro ao processar a solicitação.', 'error');
showToast('Esta é uma mensagem informativa.', 'info');
```

4. **Exibir um modal de confirmação:**
```typescript
showModal(
  'Confirmar Exclusão',
  'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
  () => {
    // Função a ser executada quando o usuário confirmar
    deleteItem(id);
  },
  {
    type: 'warning',
    confirmText: 'Excluir',
    cancelText: 'Cancelar'
  }
);
```

## Sistema de Convites

O sistema implementa um mecanismo de convites para candidatos:

- Geração de códigos de 4 dígitos para candidatos
- Validação de convites com limite de tentativas (máximo: 5)
- Data de expiração configurável (padrão: 7 dias)
- Envio de emails com convites formatados
- Suporte a ambientes de desenvolvimento (Ethereal) e produção

## Problemas Comuns e Soluções

### 1. Gerenciamento de Estado em Formulários

Para resolver problemas de gerenciamento de estado em formulários de perguntas:

```tsx
<Formik
  initialValues={prepareInitialValues()}
  validationSchema={getValidationSchema()}
  enableReinitialize={true}  // Sempre permitir reinicialização para carregar valores iniciais
  onSubmit={handleSubmit}
>
```

### 2. Erro "operator does not exist: text = uuid" no PostgreSQL

Para resolver este erro, implemente uma solução usando campos ocultos no frontend:

```typescript
// No componente de formulário
<Field
  as="select"
  name="categoryId"
  onChange={(e) => {
    const categoryId = e.target.value;
    // Encontrar o UUID correspondente
    if (categoryId) {
      const selectedCategory = categories.find(cat => cat.id === categoryId);
      if (selectedCategory) {
        setFieldValue('categoryUuid', selectedCategory.id);
      }
    } else {
      setFieldValue('categoryUuid', '');
    }
  }}
/>

{/* Campo oculto para armazenar o UUID */}
<Field type="hidden" name="categoryUuid" />
```

### 3. Confusão entre IDs de diferentes entidades

Na tela de detalhes de teste, existem várias entidades relacionadas com IDs próprios:
- `test.id`: ID do teste
- `testStage.id`: ID da associação entre teste e etapa (tabela TestStage)
- `testStage.stage.id`: ID da etapa propriamente dita (tabela Stage)

Sempre verifique qual ID é necessário para cada operação:
- Para operações na tabela Stage: usar `testStage.stage.id`
- Para operações na tabela TestStage: usar `testStage.id`

### 4. Nomes incorretos de modelos Prisma

Ao acessar modelos do Prisma, use o cliente com nomes de modelos em minúsculas:
```typescript
// Correto
await prisma.testStage.findMany();

// Alternativa com SQL raw
await prisma.$executeRaw`DELETE FROM "TestStage" WHERE "stageId" = ${id}`;
```

### 5. Restrições de chave estrangeira na exclusão

Use transações para garantir que todas as operações sejam concluídas com sucesso:
```typescript
await prisma.$transaction(async (tx) => {
  // Primeiro remover associações
  await tx.$executeRaw`DELETE FROM "TestStage" WHERE "stageId" = ${id}`;
  
  // Depois excluir a etapa
  await tx.$executeRaw`DELETE FROM "Stage" WHERE id = ${id}`;
});
```

### 6. Tratamento inadequado de erros HTTP

Implemente tratamento específico para diferentes códigos de status:
```typescript
if (!response.ok) {
  // Se o status for 404, a etapa não foi encontrada
  if (response.status === 404) {
    throw new Error('Etapa não encontrada');
  }
  
  // Para outros erros, tentar obter a mensagem de erro da API
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || 'Erro ao excluir etapa');
}
```

## Boas Práticas

1. **Logs detalhados**: Adicionar logs detalhados tanto no frontend quanto no backend para facilitar a depuração
2. **Validação de dados**: Sempre validar dados antes de enviar para a API
3. **Tipagem explícita**: Usar TypeScript com tipagem explícita para evitar erros de tipo
4. **Nomenclatura consistente**: Manter um padrão de nomenclatura para IDs e variáveis
5. **Transações**: Usar transações do Prisma para operações que afetam múltiplas tabelas
6. **Tratamento de erros**: Implementar tratamento específico para diferentes tipos de erros
7. **Logout correto**: Usar a função `signOut()` do NextAuth em vez de redirecionamentos manuais

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.
