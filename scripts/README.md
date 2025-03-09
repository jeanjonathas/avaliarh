# Ferramentas de Exportação do Banco de Dados - AvaliaRH

Este diretório contém scripts para exportar dados do banco de dados PostgreSQL do AvaliaRH. As exportações podem ser feitas em formato SQL (para restauração) e JSON (para backup e análise).

## Arquivos Disponíveis

- `export-database.js` - Script JavaScript básico para exportação
- `export-database.ts` - Script TypeScript avançado com mais opções
- `export-db.bat` - Script de execução rápida para Windows

## Pré-requisitos

- Node.js instalado
- Projeto AvaliaRH configurado com variáveis de ambiente
- Conexão com o banco de dados PostgreSQL ativa

## Como Usar

### Método 1: Usando o script batch (Mais fácil - Windows)

1. Abra um terminal na pasta `scripts`
2. Execute o comando:
   ```
   export-db.bat
   ```
3. Os arquivos serão exportados para a pasta `exports` no diretório raiz do projeto

### Método 2: Usando o script TypeScript diretamente

1. Abra um terminal na pasta `scripts`
2. Execute o comando:
   ```
   npx ts-node export-database.ts
   ```

### Opções Avançadas

O script TypeScript suporta várias opções para personalizar a exportação:

```
Uso: ts-node export-database.ts [opções]

Opções:
  --format <formato>   Formato de exportação (sql, json, both) [padrão: both]
  --output <dir>       Diretório de saída [padrão: ../exports]
  --filename <nome>    Nome base do arquivo (sem extensão)
  --no-timestamp       Não incluir timestamp no nome do arquivo
  --compact            Gerar JSON compacto (sem indentação)
  --model <nome>       Exportar apenas um modelo específico
  --help               Exibir esta ajuda
```

### Exemplos

1. Exportar apenas em formato SQL:
   ```
   npx ts-node export-database.ts --format sql
   ```

2. Exportar para um diretório específico:
   ```
   npx ts-node export-database.ts --output C:\backups\avaliarh
   ```

3. Exportar apenas um modelo específico:
   ```
   npx ts-node export-database.ts --model Candidate
   ```

4. Exportar com nome personalizado:
   ```
   npx ts-node export-database.ts --filename backup_pre_deploy
   ```

## Estrutura dos Arquivos Exportados

### Arquivo SQL

O arquivo SQL contém comandos INSERT para todas as tabelas do banco de dados, organizados em uma transação. Pode ser usado para restaurar o banco de dados em caso de perda de dados.

### Arquivo JSON

O arquivo JSON contém todos os dados em formato estruturado, organizado por modelo. É útil para:
- Backup adicional
- Análise de dados
- Migração para outros sistemas
- Debugging

## Modelos Exportados

- User - Usuários do sistema
- Admin - Administradores
- tests - Testes disponíveis
- Stage - Etapas dos testes
- TestStage - Associações entre testes e etapas
- Category - Categorias de perguntas
- Question - Perguntas
- Option - Opções de resposta
- StageQuestion - Associações entre etapas e perguntas
- Candidate - Candidatos
- Response - Respostas dos candidatos
- UsedInviteCode - Códigos de convite utilizados

## Solução de Problemas

### Erro de Conexão com o Banco de Dados

Verifique se:
1. A variável de ambiente `DATABASE_URL` está configurada corretamente
2. O servidor PostgreSQL está em execução
3. As credenciais de acesso estão corretas

### Erro de Permissão ao Criar Arquivos

Verifique se:
1. Você tem permissão de escrita no diretório de saída
2. Nenhum dos arquivos de destino está aberto em outro programa

## Notas Importantes

- Os arquivos exportados podem conter informações sensíveis. Mantenha-os seguros.
- Senhas de usuários são exportadas em formato hash, conforme armazenadas no banco de dados.
- Para restaurar um banco de dados a partir do arquivo SQL, você pode usar ferramentas como `psql` ou interfaces gráficas como pgAdmin.
