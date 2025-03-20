# AvaliaRH - Plataforma Completa de Avaliação e Desenvolvimento de Talentos

Uma solução moderna e abrangente para processos de recrutamento, seleção e desenvolvimento de colaboradores, com análises avançadas de perfil, testes de inteligência e compatibilidade. Desenvolvido com Next.js, TypeScript e PostgreSQL.

## Principais Recursos

- **Testes de Inteligência**
  - Avaliação de habilidades cognitivas e raciocínio lógico
  - Testes padronizados com análise comparativa e percentis
  - Métricas de tempo e desempenho por questão

- **Análise de Personalidade**
  - Identificação de traços comportamentais e valores
  - Compatibilidade com perfis desejados para cada posição
  - Baseado em modelos psicológicos validados

- **Testes Personalizados**
  - Editor intuitivo para criação de avaliações específicas
  - Suporte a múltiplos formatos de questões
  - Banco com milhares de questões pré-configuradas

- **Dashboards e Relatórios**
  - Visualização de dados em tempo real
  - Gráficos interativos e relatórios detalhados
  - Exportação em múltiplos formatos

- **Compatibilidade Avançada**
  - Algoritmos de matching entre candidatos e vagas
  - Identificação do melhor match técnico e comportamental
  - Recomendações personalizadas

- **Treinamento de Colaboradores**
  - Identificação de gaps de conhecimento
  - Planos de desenvolvimento personalizados
  - Acompanhamento de evolução contínua

## Áreas do Sistema

### Área do Candidato
- Interface intuitiva e responsiva
- Sistema de convites com códigos seguros
- Formulário para dados pessoais e profissionais
- Testes com múltiplas etapas e formatos
- Feedback personalizado (quando habilitado)
- Visualização condicional de resultados conforme configuração

### Área Administrativa
- Login seguro com múltiplos níveis de acesso
- Dashboard completo com KPIs e métricas
- Gerenciamento de candidatos e processos seletivos
- Sistema de convites com envio automatizado
- Configuração de testes, etapas e questões
- Análise detalhada de resultados
- Observações e notas de entrevista estruturadas

## Tecnologias

- **Frontend**
  - Next.js 14+
  - React 18
  - TypeScript
  - TailwindCSS
  - Material UI (MUI)
  - Chart.js para visualizações
  - React Icons

- **Backend**
  - API Routes do Next.js
  - PostgreSQL
  - Prisma ORM
  - NextAuth.js para autenticação
  - Nodemailer para comunicações

- **DevOps & Infraestrutura**
  - Docker e Docker Compose
  - Traefik para proxy reverso
  - GitHub Actions para CI/CD
  - Jest para testes automatizados

## Padrões de Desenvolvimento

- **Carregamento Consistente**
  - Estados de loading em todas as páginas
  - Componentes de skeleton durante carregamento
  - Tratamento adequado de erros
  - Experiência de usuário fluida sem piscadas de tela

- **Segurança**
  - Autenticação robusta com NextAuth.js
  - Proteção contra CSRF
  - Validação de dados com Zod e Yup
  - Sanitização de inputs

- **Acessibilidade**
  - Componentes acessíveis com ARIA
  - Suporte a navegação por teclado
  - Contraste adequado e legibilidade
  - Responsividade para todos os dispositivos

## Estrutura do Projeto

```
/
├── components/           # Componentes React reutilizáveis
│   ├── admin/            # Componentes da área administrativa
│   ├── candidates/       # Componentes da área do candidato
│   ├── charts/           # Visualizações e gráficos
│   ├── common/           # Componentes compartilhados
│   └── ui/               # Componentes de interface
├── contexts/             # Contextos React (Notificação, Tema, etc.)
├── hooks/                # Hooks personalizados
├── lib/                  # Utilitários e funções auxiliares
│   ├── auth.ts           # Configuração de autenticação
│   ├── email.ts          # Serviço de email
│   ├── prisma.ts         # Cliente Prisma
│   └── utils/            # Funções utilitárias
├── pages/                # Rotas e páginas da aplicação
│   ├── admin/            # Área administrativa
│   ├── api/              # Endpoints da API
│   ├── candidato/        # Área do candidato
│   └── ...
├── prisma/               # Esquema e migrações do banco de dados
├── public/               # Arquivos estáticos
└── styles/               # Estilos globais
```

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Docker e Docker Compose (opcional)

### Configuração Local

1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/avaliarh.git
   cd avaliarh
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente
   ```bash
   cp .env.example .env.local
   # Edite .env.local com suas configurações
   ```

4. Execute as migrações do banco de dados
   ```bash
   npx prisma migrate dev
   ```

5. Inicie o servidor de desenvolvimento
   ```bash
   npm run dev
   ```

### Configuração com Docker

1. Configure as variáveis de ambiente
   ```bash
   cp .env.example .env
   # Edite .env com suas configurações
   ```

2. Inicie os containers
   ```bash
   docker-compose up -d
   ```

## Contribuição

Contribuições são bem-vindas! Por favor, siga estas etapas:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---

Desenvolvido com ❤️ pela equipe AvaliaRH
