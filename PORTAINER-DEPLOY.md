# Implantação do AvaliaRH via Portainer

Este documento contém instruções para implantar o sistema AvaliaRH em um ambiente Docker usando Portainer.

## Pré-requisitos

- Acesso a um servidor com Portainer instalado
- Rede Docker `ralliugaNet` já configurada
- Traefik configurado como proxy reverso com certificado SSL

## Arquivos de Implantação

Este repositório contém os seguintes arquivos para implantação:

- `docker-compose-portainer.yml`: Configuração do stack para Portainer
- `Dockerfile`: Instruções para construir a imagem da aplicação

## Volumes Externos

Antes de implantar, você precisa criar os seguintes volumes no Portainer:

```bash
avaliarh_postgres_data
```

## Implantação via Portainer

1. Acesse o Portainer no seu servidor
2. Navegue até "Stacks" e clique em "Add stack"
3. Dê um nome para o stack (ex: "avaliarh")
4. Na seção "Build method", selecione "Upload" e carregue o arquivo `docker-compose-portainer.yml`
5. Clique em "Deploy the stack"

## Configuração do Domínio

O sistema está configurado para ser acessado através do domínio:
```
avaliacao.doutoranimal.com.br
```

Certifique-se de que este domínio esteja configurado no seu DNS para apontar para o servidor onde o Portainer está hospedado.

## Variáveis de Ambiente

As seguintes variáveis de ambiente estão configuradas no arquivo docker-compose:

- `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
- `NEXTAUTH_SECRET`: Chave secreta para autenticação NextAuth
- `NEXTAUTH_URL`: URL base da aplicação

## Segurança

- A senha do banco de dados está definida como `02e821629ceff274c853f24327a36132`
- A chave secreta do NextAuth está definida como `1cb8ab490649f272b366a6343f0e223c`

**Nota**: Em um ambiente de produção, recomenda-se utilizar secrets do Docker Swarm ou outra solução de gerenciamento de segredos para armazenar senhas e chaves.

## Implantação via GitHub

Para implantar diretamente do GitHub:

1. Faça o fork deste repositório para sua conta do GitHub
2. No Portainer, navegue até "Stacks" e clique em "Add stack"
3. Dê um nome para o stack (ex: "avaliarh")
4. Na seção "Build method", selecione "Repository"
5. Insira a URL do seu repositório GitHub
6. Especifique o caminho para o arquivo docker-compose: `docker-compose-portainer.yml`
7. Clique em "Deploy the stack"

## Solução de Problemas

Se encontrar problemas durante a implantação:

1. Verifique os logs dos contêineres no Portainer
2. Certifique-se de que a rede `ralliugaNet` existe
3. Verifique se o Traefik está configurado corretamente
4. Confirme se os volumes externos foram criados antes da implantação
