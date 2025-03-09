@echo off
echo ===================================
echo  AvaliaRH - Exportacao de Banco de Dados
echo ===================================
echo.

:: Verificar se o diretório de exportação existe
if not exist "..\exports" mkdir "..\exports"

:: Verificar se o node está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [ERRO] Node.js nao encontrado. Por favor, instale o Node.js para continuar.
  exit /b 1
)

:: Verificar se o ts-node está instalado
call npx ts-node --version >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [INFO] Instalando ts-node...
  call npm install -g ts-node typescript @types/node
)

echo [INFO] Executando script de exportacao...
echo.

:: Executar o script TypeScript
call npx ts-node export-database.ts %*

if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERRO] Falha na exportacao do banco de dados.
  exit /b 1
)

echo.
echo [SUCESSO] Exportacao concluida!
echo Verifique a pasta 'exports' para os arquivos gerados.
echo.
