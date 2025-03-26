#!/bin/bash

# Script para configurar acesso ao Prisma Studio em produção
# Uso: ./prisma-tunnel.sh [porta_local] [porta_remota] [usuario] [servidor]

# Definir valores padrão
PORTA_LOCAL=${1:-5555}
PORTA_REMOTA=${2:-5555}
USUARIO=${3:-"seu_usuario"}
SERVIDOR=${4:-"seu_servidor_producao"}

echo "=== Configuração de Acesso ao Prisma Studio em Produção ==="
echo ""
echo "Este script irá:"
echo "1. Criar um túnel SSH para o servidor de produção"
echo "2. Permitir que você acesse o Prisma Studio localmente"
echo ""
echo "Configuração:"
echo "- Porta Local: $PORTA_LOCAL"
echo "- Porta Remota: $PORTA_REMOTA"
echo "- Usuário: $USUARIO"
echo "- Servidor: $SERVIDOR"
echo ""
echo "Para iniciar o túnel, pressione ENTER."
echo "Para cancelar, pressione CTRL+C."
read

echo "Criando túnel SSH..."
echo "Após conectar, acesse o Prisma Studio em: http://localhost:$PORTA_LOCAL"
echo ""
echo "IMPORTANTE: Mantenha esta janela aberta enquanto estiver usando o Prisma Studio."
echo "Para encerrar, pressione CTRL+C."
echo ""

# Criar o túnel SSH
ssh -L $PORTA_LOCAL:localhost:$PORTA_REMOTA $USUARIO@$SERVIDOR -t "cd /caminho/para/seu/projeto && npx prisma studio --port $PORTA_REMOTA"
