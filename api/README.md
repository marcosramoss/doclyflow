# Doclyflow API

Backend PHP/MySQL para o Doclyflow. Stack **PHP 8.2 vanilla** (sem Composer/framework),
banco MySQL 8, autenticação por tokens opacos com hash SHA-256.

> O frontend Astro+React (em `../src`) continua funcionando com seu próprio
> mock em `localStorage`. Esta API existe para ser plugada quando você
> quiser trocar a persistência local por um backend real.

## Estrutura

```
api/
├── public/
│   ├── index.php          # Front controller
│   └── .htaccess          # Rewrite para Apache (opcional)
├── src/
│   ├── bootstrap.php      # Autoloader PSR-4 + error handlers + .env
│   ├── Env.php            # Loader de KEY=VALUE
│   ├── Database.php       # Singleton PDO
│   ├── Cors.php           # CORS headers + preflight OPTIONS
│   ├── Request.php        # Wrapper de $_SERVER + php://input
│   ├── Response.php       # JSON responder (exit após echo)
│   ├── Router.php         # Roteador com addProtected
│   ├── Auth.php           # Tokens opacos + authenticate
│   ├── Validator.php      # Validação de entrada
│   ├── HttpException.php  # Status + message + details
│   ├── routes.php         # Tabela de endpoints
│   └── Controllers/
│       ├── HealthController.php
│       ├── AuthController.php
│       └── DocumentsController.php
├── sql/
│   └── schema.sql         # CREATE DATABASE + TABLES
├── bin/
│   ├── migrate.php        # php api/bin/migrate.php
│   └── seed.php           # php api/bin/seed.php
├── .env.example
├── .gitignore
└── README.md
```

## Requisitos

* PHP **8.2+** com extensões: `pdo_mysql`, `mysqlnd`, `mbstring`, `openssl`, `json`.
* MySQL **8.0.16+** (necessário para `CHECK` constraints — recomendado) ou 5.7+ sem CHECK.
* Opcional: CLI `mysql` no PATH para `php api/bin/migrate.php` usar;
  sem ele, o script recorre a um split por `;` via PDO (best-effort).

## Configuração

Copie `.env.example` para `.env` e ajuste credenciais:

```bash
# Linux/macOS
cp api/.env.example api/.env

# Windows
copy api\.env.example api\.env
```

Edite `api/.env`:

```ini
FRONTEND_ORIGIN=http://localhost:4321
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=doclyflow
DB_USER=root
DB_PASS=
TOKEN_TTL_HOURS=168
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

## Comandos

```bash
# 1. Aplicar schema
php api/bin/migrate.php

# 2. Popular dados de teste (demo@requisita.app / demo1234)
php api/bin/seed.php

# 3. Subir o servidor de desenvolvimento
php -S 127.0.0.1:8080 -t api/public
```

A API então responde em `http://127.0.0.1:8080/api/...`.

## Endpoints

| Método | Rota                       | Auth      | Descrição                                  |
|--------|----------------------------|-----------|--------------------------------------------|
| GET    | `/api/health`              | —         | Healthcheck                                |
| POST   | `/api/auth/google`         | —         | Login Google OAuth (recebe ID token)       |
| POST   | `/api/auth/logout`         | Bearer    | Invalida o token atual                     |
| GET    | `/api/auth/me`             | Bearer    | Retorna o usuário autenticado              |
| GET    | `/api/documents`           | Bearer    | Lista documentos do usuário                |
| GET    | `/api/documents/{id}`      | Bearer    | Detalha um documento                       |
| POST   | `/api/documents`           | Bearer    | Cria documento (substitui requirements)    |
| PUT    | `/api/documents/{id}`      | Bearer    | Atualiza (substitui requirements se enviado)|
| DELETE | `/api/documents/{id}`      | Bearer    | Remove                                     |

> Login é feito exclusivamente via Google OAuth (Google Identity Services no
> frontend + verificação do ID token via `oauth2.googleapis.com/tokeninfo`).
> O usuário é auto-registrado na primeira autenticação; o backend vincula
> contas por `google_sub` e mantém a primeira vista de `name`/`picture`.

## Exemplo de uso

```bash
# Login Google OAuth — encurte: troque <id_token> pelo JWT retornado pelo
# Google Identity Services no frontend (Accounts: gsi/client).
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"<id_token>"}' \
  | php -r 'echo json_decode(file_get_contents("php://stdin"))->token;')

# Me
curl -s http://127.0.0.1:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Listar documentos
curl -s http://127.0.0.1:8080/api/documents \
  -H "Authorization: Bearer $TOKEN"
```

## Convenção de erros

Toda resposta de erro segue o formato:

```json
{ "error": "Missing required fields", "details": { "fields": ["title"] } }
```

| Status | Significado                                       |
|--------|---------------------------------------------------|
| 400    | Validação de entrada                              |
| 401    | Token ausente / inválido / expirado / credenciais |
| 404    | Rota ou recurso não encontrado                    |
| 405    | Método HTTP não suportado                         |
| 500    | Erro interno (mensagem genérica — logs no stderr) |

## Autenticação

* Tokens são strings hex de 64 caracteres (`bin2hex(random_bytes(32))`).
* Apenas o hash SHA-256 do token vai para `user_tokens`. Se o banco vazar,
  os tokens não são comprometidos.
* Logout apaga a linha — revogação instantânea.
* `Authorization: Bearer <token>` em todas as rotas protegidas.

## Próximos passos

* Validar o ID token localmente via JWKS (`firebase/php-jwt` ou Google Auth
  Library) ao invés do endpoint `/tokeninfo` — elimina uma chamada de rede.
* Refresh tokens (rotacionar antes da expiração).
* `composer require` Symfony Console + Doctrine Migrations para schema versionado.
* Rate limiting e logs estruturados.
> Bancos legados (pré-OAuth): rode `php api/bin/migrate-oauth.php` após o
> `migrate.php` para adicionar `google_sub`/`picture` e remover `password_hash`
> de forma idempotente.
