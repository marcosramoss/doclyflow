# Deploy — XAMPP (Windows)

Configuração dedicada para rodar o Doclyflow inteiramente sob o Apache do
XAMPP, sem depender de `php -S` (built-in) ou `npm run dev` (Astro dev
server). Tudo em **uma porta (:80)** com Apache servindo o frontend
estático e a API PHP — coerente com o fluxo de "abrir XAMPP e usar".

## TL;DR — caminho rápido

Se esta é a primeira vez, copie manualmente os passos de **§ 1
(pré-requisitos)** e **§ 4 (vhost)** uma única vez. A partir daí, o
ciclo de "rebuildar + deployar" cabe em:

```bat
:: a partir de C:\desenvolvimento\doclyflow\
bin\deploy-xampp.bat
```

O script faz build, copia todos os dotfiles corretos (incluindo
`api/.htaccess` que é o ponto crítico — ver § 5), re-sincroniza
`api/src|sql|bin|public`, e roda três smoke tests automáticos no fim.
Após ele imprimir "Doclyflow deploy concluído", abra `http://localhost/`
e clique em "Entrar com Google".

## 1. Pré-requisitos

- XAMPP com PHP 8.2+, MySQL/MariaDB e Apache (padrão do XAMPP 8.x+).
- `mod_rewrite` habilitado (vem por default — verificar `LoadModule
  rewrite_module modules/mod_rewrite.so` descomentado em
  `C:\xampp\apache\conf\httpd.conf`).
- `AllowOverride FileInfo` ou `All` no `<Directory>` da sua DocumentRoot
  (o vhost em § 4 já define isso).
- Variáveis de ambiente populadas antes do build:
  - `.env` na raiz do projeto Astro:
    ```
    PUBLIC_API_URL=http://localhost/api
    ```
  - `api/.env`:
    ```
    FRONTEND_ORIGIN=http://localhost
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_NAME=doclyflow
    DB_USER=root
    DB_PASS=
    TOKEN_TTL_HOURS=168
    GOOGLE_CLIENT_ID=<…>
    GOOGLE_CLIENT_SECRET=<…>
    ```
- Schema do banco aplicado:
  ```bash
  "C:\xampp\php\php.exe" api\bin\migrate.php
  ```

> O `astro.config.mjs` falha o build se `PUBLIC_API_URL` não estiver
> setada. Isso evita o bug clássico de esquecer e cair no fallback
> `http://127.0.0.1:8080/api` (que nada escuta).

## 2. Build do frontend (manual)

```bat
:: dentro de C:\desenvolvimento\doclyflow\
npm install
npm run build                          :: gera dist\client\
xcopy /E /Y /I dist\client\* C:\xampp\htdocs\
```

O `xcopy` preserva `api/`, `server/`, `.astro/` que já estiverem no
destino. **Use `bin\deploy-xampp.bat`** (caminho § TL;DR) em vez desta
sequência manual — ele também sincroniza `api\.htaccess` (essencial,
ver § 5) e roda smoke tests.

## 3. Banco de dados

```bash
# dropar + recriar do zero (XAMPP defaults: root sem senha)
"C:\xampp\mysql\bin\mysql.exe" -u root -p
mysql> DROP DATABASE IF EXISTS doclyflow;
mysql> exit

"C:\xampp\php\php.exe" "C:\xampp\htdocs\api\bin\migrate.php"
"C:\xampp\php\php.exe" "C:\xampp\htdocs\api\bin\seed.php"
```

## 4. Apache vhost

Siga os passos em `deploy/xampp-httpd-doclyflow.conf`:

1. Copie `deploy/xampp-httpd-doclyflow.conf` para
   `C:\xampp\apache\conf\extra\`.
2. Abra `C:\xampp\apache\conf\httpd.conf` e adicione ao final:
   ```
   Include conf/extra/httpd-doclyflow.conf
   ```
3. Reinicie o Apache pelo painel do XAMPP.

## 5. ⚠️ Por que existem DOIS `.htaccess` em `api/`

A causa-raiz do bug "Google Sign-In passou mas login deu 404" foi o
`.htaccess` estar na pasta errada — ou faltando. Existem dois arquivos
para duas topologias de deploy distintas:

| Topologia                                              | `.htaccess` necessário                    | Onde fica                       | RewriteRule                                       |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------- | ------------------------------------------------- |
| `DocumentRoot = C:\xampp\htdocs` (padrão Doclyflow)      | **`api/.htaccess`**                      | `htdocs\api\.htaccess`          | `^.*$ public/index.php` (com `RewriteBase /api/`) |
| `DocumentRoot = C:\xampp\htdocs\api\public` (raro)     | `api/public/.htaccess`                   | `htdocs\api\public\.htaccess`   | `^ index.php`                                     |

**Por que o de `api/public/` sozinho não basta** no deploy padrão? O
Apache só consulta `.htaccess` de diretórios **acima** da URL. Para
`/api/health`, os candidatos são `htdocs/api/.htaccess` e
`htdocs/.htaccess` — este último não existe no XAMPP padrão. Sem
`htdocs/api/.htaccess`, o rewrite nunca roda e o Apache devolve 404
HTML puro. O Google Sign-In pop-up mesmo assim aparece porque GIS é
100% client-side — daí a confusão inicial de "Google passou mas login
deu 404".

**Sintoma típico de `.htaccess` faltando:** `GET /api/health` →
**404 HTML**. `POST /api/auth/google` também cai em 404 quando o
rewrite não dispara, mas observações de debug podem confundir esse
sintoma com outros erros (ex.: `.env` ausente produz 500 independente
do rewrite). Antes de generalizar, sempre verificar com `.env`
configurado E Apache restart limpo.

**Por que isso só apareceu em produção** e não no `php -S`?
O built-in server do PHP não lê `.htaccess` — ele roteia tudo via
`api/public/index.php` direto, então o bug ficou invisível durante o
desenvolvimento enquanto esse servidor estava em :8080.

**Cura:** garantir que `api/.htaccess` foi copiado para
`htdocs\api\.htaccess` — `bin\deploy-xampp.bat` faz isso
automaticamente (passo 4 do script). `Options -MultiViews` desabilita
negociação de conteúdo do Apache que pode interceptar requests com
match profundo antes do rewrite rodar — também é parte do porquê o
rewrite não estava disparando antes.

## 6. Smoke tests

- http://localhost/api/health             — `{"status":"ok"}` em JSON
- http://localhost/login/                 — botão Google Sign-In visível
- http://localhost/painel/                — redireciona para /login (sem token)
- Click no Google Sign-In → popup Google → callback → `/painel`

`bin\deploy-xampp.bat` executa três smoke tests automaticamente no fim
(status, content-type). Para pré-flight CORS:

```bash
curl -i -X OPTIONS http://localhost/api/auth/google \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

## 7. Origens autorizadas no Google Cloud Console

Acesse [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
e adicione em **Authorized JavaScript origins** do client OAuth usado:

- `http://localhost`
- `http://127.0.0.1`

Sem isso, o popup do Google é bloqueado por origem não autorizada.
