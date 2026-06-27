@echo off
REM =============================================================================
REM Doclify — deploy para XAMPP (Windows).
REM =============================================================================
REM Idempotente e seguro de rodar várias vezes. Faz:
REM   1. `npm run build` no projeto Astro (precisa de .env com PUBLIC_API_URL).
REM   2. Copia `dist\client\*` para `C:\xampp\htdocs\` (inclui .env, .htaccess).
REM   3. Copia `api\public\*` → `htdocs\api\public\` (com .htaccess preservado).
REM   4. Copia `api\.htaccess` → `htdocs\api\.htaccess` (roteia /api/* para
REM      para `public/index.php` — não confundir com o do passo 3, que é para
REM      topologia alternativa com DocumentRoot em `htdocs\api\public\`).
REM   5. Sincroniza `api\src`, `api\sql`, `api\bin` (deps PHP não vão no build).
REM   6. Copia `api\.env` se existir (preserva credenciais sensíveis, opcional).
REM   7. Smoke tests automatizados — `/api/health`, OPTIONS preflight.
REM
REM Uso (a partir de C:\desenvolvimento\doclify\):
REM     bin\deploy-xampp.bat
REM
REM Pré-requisitos:
REM     - XAMPP com Apache em :80 e PHP 8.2+
REM     - `mod_rewrite` carregado + AllowOverride FileInfo/All (default XAMPP)
REM     - MySQL/MariaDB rodando com banco `doclify` já migrado
REM     - `.env` e `api\.env` no projeto (você tem um exemplo em api\.env.example)
REM =============================================================================

setlocal EnableExtensions EnableDelayedExpansion

REM ----------------------------------------------------------------------------
REM Configuração
REM ----------------------------------------------------------------------------
set "PROJECT_DIR=%~dp0.."
set "HTDOCS_DIR=C:\xampp\htdocs"

REM ----------------------------------------------------------------------------
REM 1) Build do frontend.
REM ----------------------------------------------------------------------------
echo.
echo [1/6] npm run build
pushd "%PROJECT_DIR%"
    if errorlevel 1 (
        echo ERRO: nao foi possivel entrar em %PROJECT_DIR%
        exit /b 1
    )
    if not exist ".env" (
        echo AVISO: .env ausente na raiz do projeto Astro.
        echo        Crie com PUBLIC_API_URL=http://localhost/api antes do build.
        echo        astro.config.mjs falha o build sem essa variavel.
        popd
        exit /b 1
    )
    call npm run build
    if errorlevel 1 (
        echo ERRO: npm run build falhou
        popd
        exit /b 1
    )
popd

REM ----------------------------------------------------------------------------
REM 2) Copia dist\client\* → htdocs (frontend estatico).
REM    XCopy preserva dotfiles (.htaccess, .env) por padrao.
REM ----------------------------------------------------------------------------
echo.
echo [2/6] XCopy dist\client\* -> %HTDOCS_DIR%
xcopy /E /Y /I /Q "%PROJECT_DIR%\dist\client\*" "%HTDOCS_DIR%" >nul
if errorlevel 1 (
    echo ERRO: copia de dist\client falhou
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 3) Sincroniza api\public\*  → htdocs\api\public\ (mantem .htaccess).
REM ----------------------------------------------------------------------------
echo.
echo [3/6] XCopy api\public\* -> %HTDOCS_DIR%\api\public\
xcopy /E /Y /I /Q "%PROJECT_DIR%\api\public\*" "%HTDOCS_DIR%\api\public\" >nul
if errorlevel 1 (
    echo ERRO: copia de api\public falhou
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 4) Copia api\.htaccess → htdocs\api\.htaccess (ESSENCIAL!).
REM    Esse arquivo e o que faz /api/health chegar ao PHP via RewriteRule.
REM    Sem ele o Apache devolve 404 HTML em qualquer /api/* (causa raiz do bug
REM    "Google Sign-In passou mas login deu 404").
REM ----------------------------------------------------------------------------
echo.
echo [4/6] Copy api\.htaccess -> %HTDOCS_DIR%\api\.htaccess
copy /Y "%PROJECT_DIR%\api\.htaccess" "%HTDOCS_DIR%\api\.htaccess" >nul
if errorlevel 1 (
    echo ERRO: copia do api\.htaccess falhou
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 5) Sincroniza api\src, api\sql, api\bin (deps PHP nao vao para dist\).
REM ----------------------------------------------------------------------------
echo.
echo [5/6] XCopy api\{src,sql,bin} -> %HTDOCS_DIR%\api\
xcopy /E /Y /I /Q "%PROJECT_DIR%\api\src"  "%HTDOCS_DIR%\api\src"  >nul
xcopy /E /Y /I /Q "%PROJECT_DIR%\api\sql"  "%HTDOCS_DIR%\api\sql"  >nul
xcopy /E /Y /I /Q "%PROJECT_DIR%\api\bin"  "%HTDOCS_DIR%\api\bin"  >nul
if errorlevel 1 (
    echo ERRO: copia de api\src|sql|bin falhou
    exit /b 1
)

REM ----------------------------------------------------------------------------
REM 6) Sincroniza api\.env se existir (copia silenciosa).
REM ----------------------------------------------------------------------------
echo.
echo [6/6] Copy api\.env (se existir) -> %HTDOCS_DIR%\api\.env
if exist "%PROJECT_DIR%\api\.env" (
    copy /Y "%PROJECT_DIR%\api\.env" "%HTDOCS_DIR%\api\.env" >nul
    echo         OK
) else (
    echo         ausente: configure FRONTEND_ORIGIN, GOOGLE_CLIENT_ID e DB_* manualmente
)

REM ----------------------------------------------------------------------------
REM Smoke tests automatizados. Sem restart do Apache — leitura de .htaccess
REM acontece a cada request, entao as mudancas ja estao ativas.
REM ----------------------------------------------------------------------------
echo.
echo [smoke] GET http://localhost/api/health
curl -s -o NUL -w "        %{http_code} %{content_type}\n" -m 5 http://localhost/api/health

echo [smoke] OPTIONS http://localhost/api/auth/google  (preflight)
curl -s -o NUL -w "        %{http_code} %{content_type}\n" -m 5 ^
    -X OPTIONS ^
    -H "Origin: http://localhost" ^
    -H "Access-Control-Request-Method: POST" ^
    -H "Access-Control-Request-Headers: content-type" ^
    http://localhost/api/auth/google

echo [smoke] GET http://localhost/
curl -s -o NUL -w "        %{http_code} %{content_type}\n" -m 5 http://localhost/

echo.
echo Doclify deploy concluido.
echo Teste manualmente: http://localhost/login/  →  clique no botao Google.
exit /b 0
