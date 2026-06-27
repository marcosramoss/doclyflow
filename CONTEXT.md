# Doclify — Contexto do Projeto

> Documentação viva do **Doclify** — gerador web de levantamentos de requisitos com exportação em PDF, 100% client-side. Mantém arquitetura, convenções, modelo de dados e estado atualizados.

---

## 1. Visão Geral

O **Doclify** permite criar, organizar e exportar documentos de levantamento de requisitos em PDF diretamente no navegador. Os documentos persistem em **MySQL** através de uma **API REST PHP vanilla** em `api/`; autenticação exclusively via **Google OAuth** (Google Identity Services no frontend + verificação do ID token no backend). O token de sessão fica em `localStorage` do navegador.

**Funcionalidades-chave:**
- Landing page (hero com preview, features, "Como funciona")
- Login via Google (OAuth) — popup do Google Identity Services
- Página de login com redirect honoring `?next=`
- **Painel** de documentos com **filtros por status** e **busca textual**
- **Sidebar sticky** à esquerda com Documentos + Novo Documento + info do usuário + logout
- Formulário dinâmico de requisitos (funcionais e não-funcionais, baixa → crítica)
- **Rota de visualização** individual com estatísticas e agrupamento por tipo (`/painel/document?id=<id>`, 100% client-side)
- Exportação em PDF profissional via jsPDF (capa, badges, paginação automática)
- **Cross-tab sync** via eventos `auth-change` e `storage`

---

## 2. Stack Tecnológica

| Camada              | Tecnologia                         | Versão        |
|---------------------|------------------------------------|---------------|
| Framework           | Astro                              | ^5.4 (100% static) |
| UI Islands          | React                              | ^19.0         |
| Estilização         | Tailwind CSS (via `@tailwindcss/vite`) | ^4.1.4     |
| Ícones              | lucide-react                       | ^0.473        |
| PDF                 | jsPDF                              | ^2.5          |
| Linguagem           | TypeScript (strict)                | ^5.7          |
| Autenticação        | Google Identity Services (GSI)     | ^0.0          |
| Backend             | PHP 8.2 vanilla + MySQL 8          | —             |

> O projeto é **100% estático**. O adapter `@astrojs/node` ainda está no `package.json` (resíduo histórico) mas `astro.config.mjs` não o declara — todo o roteamento dinâmico (`?id=<uuid>` em `/painel/document`) é resolvido client-side dentro da ilha React `DocumentView`.

A integração Tailwind v4 é feita **diretamente via plugin Vite** (sem `@astrojs/tailwind`). Tokens vivem em `src/styles/global.css` dentro de `@theme {}` e geram classes utilitárias automaticamente — **sem `tailwind.config.js`**.

---

## 3. Estrutura de Pastas

```
doclify/
├─ astro.config.mjs                 # config Astro (sem SSR adapter)
├─ package.json
├─ tsconfig.json
├─ .env                             # PUBLIC_API_URL=http://localhost/api (criar)
├─ .gitignore                       # ignora OAuth.md, .env, dist, etc.
├─ README.md                        # quick start do projeto inteiro
├─ CONTEXT.md                       # este arquivo
├─ doclify.md                       # plano original (roadmap cronológico)
├─ OAuth.md                         # ⚠️ client_id + client_secret — NUNCA comitar
├─ deploy/
│  ├─ README.md                     # guia de deploy XAMPP
│  └─ xampp-httpd-doclify.conf      # vhost Apache
├─ bin/
│  └─ deploy-xampp.bat              # build + sync + 3 smoke tests (chamado manualmente)
├─ api/                             # Backend PHP/MySQL
│  ├─ public/
│  │  ├─ index.php                  # front controller
│  │  └─ .htaccess                  # rewrite para Apache (não usado em php -S)
│  ├─ src/
│  │  ├─ bootstrap.php              # PSR-4 autoloader + error handlers + .env
│  │  ├─ Env.php
│  │  ├─ Database.php               # Singleton PDO (time_zone = '+00:00')
│  │  ├─ Cors.php
│  │  ├─ Request.php
│  │  ├─ Response.php
│  │  ├─ Router.php
│  │  ├─ Auth.php                   # Tokens opacos SHA-256 + Google tokeninfo verify
│  │  ├─ Validator.php
│  │  ├─ HttpException.php
│  │  ├─ routes.php                 # tabela de endpoints
│  │  └─ Controllers/{HealthController,AuthController,DocumentsController}.php
│  ├─ sql/
│  │  ├─ schema.sql                 # bloco único paste-able (DROP+CREATE idempotente)
│  │  └─ migrations/
│  │     └─ 0001_oauth_columns.sql  # bridge não-destrutivo (somente leitura)
│  ├─ bin/{migrate,seed}.php        # CLI PHP
│  ├─ .env.example                  # FRONTEND_ORIGIN, DB_*, GOOGLE_CLIENT_ID, etc.
│  └─ .gitignore
├─ public/                          # assets servidos como raiz
│  ├─ favicon.svg
│  └─ logo-doclify.svg
└─ src/                             # Frontend Astro+React
   ├─ components/                   # Componentes Astro estáticos
   │  └─ Header.astro               # Logo + HeaderUserMenu (Entrar | avatar+Sair)
   ├─ data/
   │  ├─ api.ts                     # Singleton do apiClient (lê PUBLIC_API_URL do .env)
   │  ├─ apiClient.ts               # Camada fetch: ApiError + createApiClient + Bearer + 401
   │  ├─ auth.ts                    # Login/logout/getCurrentUser (delega para api.auth)
   │  ├─ storage.ts                 # Wrapper localStorage para token+user + auth-change
   │  ├─ store.ts                   # CRUD de documentos (delega para api.documents)
   │  └─ types.ts                   # Tipos do domínio + labels PT-BR
   ├─ layouts/
   │  └─ Layout.astro               # Layout base: html shell, header, footer
   ├─ pages/
   │  ├─ index.astro                # Landing page
   │  ├─ login.astro                # Tela de login (envolve LoginForm)
   │  └─ painel/
   │     ├─ index.astro             # Lista de documentos (sidebar + tabela)
   │     ├─ novo.astro              # Criar/editar (`?id=` carrega existente)
   │     └─ document.astro          # Visualizar (lê `?id=` no client)
   ├─ react/                        # Componentes interativos (React Islands)
   │  ├─ AppSidebar.tsx
   │  ├─ DashboardTable.tsx
   │  ├─ DocumentView.tsx
   │  ├─ HeaderUserMenu.tsx
   │  ├─ LoginForm.tsx
   │  └─ RequirementsForm.tsx
   ├─ styles/
   │  └─ global.css                 # @import "tailwindcss" + @theme tokens
   └─ utils/
      ├─ dates.ts                   # formatDate / formatDateTime (Intl PT-BR)
      └─ pdfGenerator.ts            # jsPDF: layout estruturado, badges, paginação
```

---

## 4. Rotas

### Frontend (Astro) — todas estáticas

| Rota            | Auth      | SSR    | Descrição                                      |
|-----------------|-----------|--------|------------------------------------------------|
| `/`             | Pública   | Não    | Landing page                                   |
| `/login`        | Pública   | Não    | Formulário de login Google + redirect `?next=` |
| `/painel`       | Protegida¹| Não    | Lista de documentos (sidebar + tabela)         |
| `/painel/novo`  | Protegida¹| Não    | Criar/editar (`?id=<id>` carrega existente)    |
| `/painel/document` | Protegida¹ | Não | Visualizar (`?id=<uuid>` — resolvido client-side) |

> **Por que `/painel` em vez de `/dashboard`?** XAMPP 8.x serve um Alias interno `/dashboard` que hijackeia a URL e exibe o painel Phoenicium dele. Para evitar o conflito sem tocar em Apache, a rota foi renomeada para `/painel` no R5.

> **Por que `/painel/document` sem `[id]`?** Mantendo o build 100% estático (sem SSR Node, sem `@astrojs/node`), a página `document.astro` é uma única página HTML que lê `?id=<uuid>` no `DocumentView.tsx`. URLs legadas no formato `/painel/<id>` ainda são reconhecidas via fallback de path.

¹ **Proteção:** renderizada pelo `AppSidebar` no mount: se `!isAuthenticated()` → redireciona para `/login?next=<pathname>`. Hidratação como `client:only="react"` para evitar flash visual de proteção ausente.

### Backend (API em `api/`)

| Método | Rota                       | Auth      | Descrição                                   |
|--------|----------------------------|-----------|---------------------------------------------|
| GET    | `/api/health`              | —         | Healthcheck (200 JSON)                      |
| POST   | `/api/auth/google`         | —         | Login Google OAuth (recebe ID token)        |
| POST   | `/api/auth/logout`         | Bearer    | Invalida o token atual                      |
| GET    | `/api/auth/me`             | Bearer    | Retorna `CurrentUser`                       |
| GET    | `/api/documents`           | Bearer    | Lista documentos do usuário                 |
| GET    | `/api/documents/{id}`      | Bearer    | Detalha um documento (com `requirements[]`) |
| POST   | `/api/documents`           | Bearer    | Cria documento (substitui requirements)     |
| PUT    | `/api/documents/{id}`      | Bearer    | Atualiza (substitui requirements opcionalmente) |
| DELETE | `/api/documents/{id}`      | Bearer    | Remove                                      |

> Frontend chama esses endpoints via `src/data/api.ts` (singleton do `apiClient`) com `Authorization: Bearer <token>`. Configurado por `PUBLIC_API_URL` no `.env` da raiz (default dev XAMPP: `http://localhost/api`).

---

## 5. Camada de Dados

### 5.1 Tipos (`src/data/types.ts`)

```ts
type RequirementType      = 'functional' | 'non-functional';
type RequirementPriority  = 'low' | 'medium' | 'high' | 'critical';
type DocumentStatus       = 'draft' | 'in-progress' | 'completed';

interface Requirement        { id; type; priority; description; }
interface RequirementDocument { id; title; client; description; status;
                                createdAt; updatedAt; requirements: Requirement[]; }
```

Labels PT-BR centralizados via constantes: `STATUS_LABEL`, `PRIORITY_LABEL`, `TYPE_LABEL`.

### 5.2 Documentos (`src/data/store.ts`)

API pública (mesma da era localStorage, agora async): `getDocuments()` · `getDocument(id)` · `saveDocument(doc)` · `deleteDocument(id)` · `generateId()` · `resetStore()`.

- Backend (`api/`) é a fonte de verdade. Async via `api.documents.*`.
- `saveDocument(doc)`: tenta `PUT /documents/:id`; em 404 (id novo) faz fallback para `POST /documents`. Backend aceita `id` do cliente (validado por regex), permitindo URLs estáveis antes do servidor confirmar.
- `generateId()` continua no cliente (otimistic UI): retorna `doc-<hex16>` a partir de `crypto.randomUUID()`.
- `getDocuments()` já vem ordenado por `updatedAt` desc do backend.

### 5.3 Autenticação (`src/data/auth.ts`)

API pública: `loginWithGoogle(idToken)` · `logout()` · `isAuthenticated()` · `getCurrentUser()` · `initialsOf(user)` · `AUTH_KEY` · `CurrentUser` · `LoginResult`.

- Token em `localStorage` chave **`doclify:auth:v1`** como `{ token, user, expiresAt }`.
- `CurrentUser` (retornado pelo backend): `{ id, name, email, picture }`.
- `loginWithGoogle(idToken)` delega para `POST /api/auth/google` (envia o JWT cru do Google Identity Services).
- `logout()` é **async** — chama `POST /api/auth/logout` antes de limpar localStorage.
- `isAuthenticated()`/`getCurrentUser()` continuam sync (apenas leitura do storage) para uso em guards de redirect.
- Em 401 de qualquer chamada, `apiClient` limpa o storage + dispara `auth-change` → sidebar/header reagem e o guard redireciona para `/login?next=…`.
- O parâmetro `?next=<pathname>` no `/login` é honrado depois do login bem-sucedido.

---

## 6. Backend API (`api/`)

### 6.1 Stack

- **PHP 8.2 vanilla** — sem Composer/framework. Autoloader PSR-4 manual em `src/bootstrap.php`.
- **MySQL 8** — `CHECK` constraints para `status`/`type`/`priority`.
- **Sem dependências externas** — `random_bytes`, `hash_hmac`, `PDO`, `curl` (para `/tokeninfo` do Google).

### 6.2 Como rodar (dev local com php -S)

```bash
# 1. Configurar credenciais
cp api/.env.example api/.env       # ou copy no Windows
# Editar api/.env:
#   FRONTEND_ORIGIN=http://localhost:4321  (ou http://localhost se usar XAMPP)
#   DB_HOST=127.0.0.1 / DB_PORT=3306 / DB_NAME=doclify / DB_USER=root / DB_PASS=
#   GOOGLE_CLIENT_ID=<…> / GOOGLE_CLIENT_SECRET=<…>
#
# 2. Aplicar schema (drop + recreate idempotente, pode colar bloco inteiro no sqleditor)
"C:\xampp\mysql\bin\mysql.exe" -uroot doclify < api/sql/schema.sql
#   ou simplesmente:
php api/bin/migrate.php
#
# 3. Subir API (em :8080) — ou usar Apache do XAMPP, ver deploy/README.md
php -S 127.0.0.1:8080 -t api/public
```

> **Não há mais usuário seed.** A partir do R5, login é exclusivamente via Google OAuth — primeiro acesso de um `google_sub` cria o `users` automaticamente.

### 6.3 Modelo de dados (MySQL) — schema OAuth-only

| Tabela         | Colunas principais                                                | Índices / FKs                                       |
|----------------|-------------------------------------------------------------------|-----------------------------------------------------|
| `users`        | id, name, email (UNIQUE), **google_sub** (UNIQUE), **picture** (NULL), created_at | PK id, UNIQUE email, UNIQUE google_sub |
| `user_tokens`  | id, user_id, token_hash (sha256, UNIQUE), expires_at, created_at  | FK user_id → users (CASCADE)                        |
| `documents`    | id, user_id, title, client, description, status, created_at, updated_at | FK user_id → users (CASCADE), CHECK status enum |
| `requirements` | id, document_id, type, description, priority, position            | FK document_id → documents (CASCADE), CHECK type/priority |

- **Sem coluna `password_hash`** — o flag `AUTH_AUTO_REGISTER` da era mock foi removido (R5).
- Time-stamps em UTC. `Database.php` força `time_zone='+00:00'` na conexão.
- `updated_at` em `documents` tem `ON UPDATE CURRENT_TIMESTAMP`, mas o controller **também** seta `gmdate(...)` explicitamente para garantir comportamento previsível.
- IDs gerados como `doc-<hex8>` e `req-<hex6>` (legíveis + únicos).

> **Migrations:** `api/sql/schema.sql` é o **canonical DROP+CREATE** paste-able (dropa tudo e recria do zero). `api/sql/migrations/0001_oauth_columns.sql` é o **bridge não-destrutivo** para upgrades de installs legados pré-OAuth. Os dois **NUNCA** devem rodar em sequência — `schema.sql` já contém o estado pós-migration-0001 (google_sub NOT NULL UNIQUE, picture DEFAULT NULL, sem password_hash).

### 6.4 Autenticação Google OAuth

- O frontend (Google Identity Services) obtém um **ID token JWT** assinado pelo Google.
- O frontend envia `POST /api/auth/google { token }`.
- O backend valida o token via `GET https://oauth2.googleapis.com/tokeninfo?id_token=<jwt>` — checa `aud == GOOGLE_CLIENT_ID`, assinatura, `exp`.
- **Auto-registro** no primeiro login:
  - SELECT por `google_sub` → se existe, atualiza `name` e `picture` apenas se o perfil do Google traga novos valores **e** os atuais estiverem vazios.
  - Se não existe por `google_sub`, tenta por `email` (merge de conta se o `email_verified=true`).
  - Caso ainda assim não exista, `INSERT` com `google_sub`, `name`, `email`, `picture`.
- Após autenticação, emite um **token opaco Sanctum-style** (`bin2hex(random_bytes(32))`) e armazena apenas o SHA-256 em `user_tokens`.

### 6.5 Request/response

- Body sempre `Content-Type: application/json`. JSON malformado → 400.
- Erros sempre `{ "error": string, "details": object }` com `details` vazio `{}` (não `[]`) quando não há contexto.
- Status: 200 / 201 / 400 (validação) / 401 (token/credenciais) / 404 / 405 / 500.

### 6.6 CORS / preflight

- Origem controlada por `FRONTEND_ORIGIN` no `.env` (dev XAMPP: `http://localhost`).
- `OPTIONS` respondem **204 sem chamar o roteador** (evita 401 espúrio no preflight do browser).
- `Access-Control-Allow-Headers: Content-Type, Authorization`.

### 6.7 Segurança

- `display_errors = Off` + `html_errors = Off` no bootstrap — nunca vaza HTML 500.
- `set_error_handler` converte warnings/notices em `ErrorException` (capturáveis).
- `set_exception_handler` + `register_shutdown_function` garantem **qualquer** crash responde JSON 500.
- Prepared statements em **100%** das queries (`PDO::ATTR_EMULATE_PREPARES = false` → mysqlnd native).
- Tokens: apenas SHA-256 armazenado → se o banco vazar, tokens crus não são comprometidos.
- **Sem senhas** — modelo OAuth-only elimina o vetor de password leak / reuse / breach.

### 6.8 Limitações conhecidas

- **Validação do ID token via `/tokeninfo`** — uma chamada de rede por login. Migrar para verificação local via JWKS (`firebase/php-jwt` ou Google Auth Library) quando o volume justificar.
- **Sem versionamento de schema formal** — apenas `schema.sql` canônico + `migrations/0001_*.sql` pontual. Migrador versionado (Phinx / Doctrine) é "próximo passo".
- **Single-process** — sem lock em tokens; sob concorrência extrema dois logouts simultâneos podem ambos serem nonce-OK.
- **N+1 no list** — `DocumentsController::index` faz 1 query por documento para carregar `requirements`. Refatorar para JOIN/IN quando volume crescer.

---

## 7. Componentes React (Ilhas)

| Componente        | Diretiva Astro       | Função                                                       |
|-------------------|----------------------|--------------------------------------------------------------|
| `HeaderUserMenu`  | `client:load`        | "Entrar" (deslogado) ou avatar + nome + Sair (logado)        |
| `LoginForm`       | `client:load`        | Login Google (GSI), redirect `?next=`                         |
| `AppSidebar`      | `client:only="react"`| Sidebar sticky à esquerda: Documentos, + Novo Documento, user info, Sair |
| `DashboardTable`  | `client:load`        | Tabela com filtros de status (tabs com contadores) + busca + ações (view/edit/delete) |
| `RequirementsForm`| `client:load`        | Form dinâmico de requisitos, criar/editar, validação, salvar |
| `DocumentView`    | `client:load`        | Visualização + estatísticas + grupos (funcionais/NF) + Exportar PDF |

**Padrão:** `localStorage` é lido **apenas dentro de `useEffect`** (nunca no corpo do componente) para evitar mismatch de SSR/hidratação. O guard `hydrated` controla estados intermediários.

---

## 8. Geração de PDF (`src/utils/pdfGenerator.ts`)

- Função pública: `downloadRequirementsPDF(doc)` — chama `pdf.save()` com nome sanitizado.
- Função interna: `generateRequirementsPDF(doc): jsPDF`.
- `previewRequirementsPDF(doc)` retorna `datauristring` (para preview embutido).

**Layout do PDF (A4):**
1. **Header bar** azul com título "Levantamento de Requisitos" + brand
2. **Bloco do projeto** (com badge de status) — título, cliente, status, data
3. **Descrição** do projeto (com fallback se vazia)
4. **Resumo** — total / funcionais / não-funcionais
5. **Requisitos agrupados** por tipo (funcionais → não-funcionais)
6. Cada requisito: número, descrição, badges (tipo + prioridade colorida)
7. **Footer** em cada página — data de geração + numeração `Página X de Y`

Paginação automática via `ensureSpace(y, needed)` que cria nova página quando o espaço restante é insuficiente.

---

## 9. Estilização (Tailwind v4)

**Tokens do tema (`src/styles/global.css`):**

```css
@theme {
  --color-brand-50 … --color-brand-900;  /* paleta azul corporativa */
  --font-sans: "Inter", ui-sans-serif, system-ui, …;
}
```

**Uso:** classes como `bg-brand-600`, `text-brand-700`, `ring-brand-200` são geradas automaticamente pelo scanner do Vite v4 (não há `tailwind.config.js`).

**Tipografia:** Inter via Google Fonts (preconnects no `<head>` do `Layout.astro`).

---

## 10. Convenções e Padrões

### Acessibilidade
- Modais sempre têm `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Modais fecham com tecla **Escape** (handler `keydown` em `useEffect`)
- Botões só com ícone têm `aria-label` (complementando `title`)
- Inputs de formulário têm `<label htmlFor="...">` associado

### Estado de UI
- `hydrated` flag para evitar renderizar dados sensíveis antes do `useEffect` rodar
- `window.location.href` é usado para navegação após mutações críticas (login/logout/delete) — hard navigation garante consistência
- Eventos `storage` + custom `auth-change` mantêm múltiplas abas sincronizadas

### Helpers compartilhados (frontend)
- Datas em `src/utils/dates.ts` (`Intl.DateTimeFormat('pt-BR', …)`)
- Não usamos `clsx`/`classnames` — composição via template literals

### Helpers compartilhados (backend)
- `Auth::hashToken` / `Auth::issue` / `Auth::authenticate` / `Auth::revokeByToken`
- `Validator::requireFields` / `Validator::email` / `Validator::oneOf` nos controllers
- `Response::json($data, $status)` e `Response::error($status, $msg, $details)`
- `HttpException($status, $msg, $details)` — capturada pelo Router → JSON no status correto

### Segurança
- **Nunca** commitar `OAuth.md`, `api/.env` ou `.env` da raiz (já cobertos por `.gitignore`).
- Rotação do client_secret OAuth = única resposta se houver leak suspeito.

---

## 11. Setup local (TL;DR)

```bash
# 1. Instalar deps
npm install

# 2. Variáveis de ambiente
echo "PUBLIC_API_URL=http://localhost/api" > .env

# 3. Backend
cp api/.env.example api/.env
# editar GOOGLE_CLIENT_ID/SECRET + credenciais DB
"C:\xampp\mysql\bin\mysql.exe" -uroot doclify < api/sql/schema.sql

# 4. Dev (dois terminais)
php -S 127.0.0.1:8080 -t api/public         # API em :8080
npm run dev                                 # frontend em :4321
# …ou deploy XAMPP (deploy/bin/deploy-xampp.bat) servindo tudo em :80
```

Mais detalhes: `deploy/README.md` (deploy XAMPP), `api/README.md` (backend detalhado).

---

## 12. Limitações Conhecidas

### Frontend
- **Token em localStorage**: vulnerável a XSS. Para produção, mover para cookie HttpOnly + CSRF protection ou refresh tokens curtos.
- **Sem testes automatizados ainda** — alvo: Vitest para `store.ts`, `auth.ts`, `pdfGenerator.ts`.
- **PDF sem fontes custom** ou imagens (apenas Helvetica built-in); suficiente até ~30 requisitos por documento.

### Backend
- `DocumentsController::index` faz **N+1** queries — agrupar requirements via JOIN quando o volume crescer.
- Validação de ID token via `/tokeninfo` (chamada externa por login) — JWKS local é "próximo passo".
- Sem rate-limiting, sem logs estruturados.

---

## 13. Próximos Passos Sugeridos

1. **Validação JWKS local** — migrar `AuthController::google` para verificação via JWKS (`firebase/php-jwt` + JWKS do Google) eliminando a chamada de rede em todo login.
2. **Refresh tokens** — encurtar TTL padrão + endpoint `/api/auth/refresh` para rotação sem novo login Google.
3. **Resolver N+1 + testes** — `DocumentsController::index` em batch + PHPUnit cobrindo `AuthController` (Google tokeninfo verify / auto-register / 401) e `DocumentsController` (CRUD + isolamento por user_id); Vitest no frontend para `storage`, `apiClient`.
4. **Migrations versionadas** — adicionar Phinx ou Doctrine Migrations quando schema começar a evoluir.
5. **Cookie HttpOnly em vez de localStorage** — para tirar o vetor XSS, setar o token via `Set-Cookie` no response do login.
6. **Templates de documento** — presets por categoria (e-commerce, RH, mobile) para acelerar criação.
7. **Import inteligente** — gerar requisitos a partir de texto/IA.

---

## 14. Comandos

### Full-stack (dev)
```bash
# Backend (curl alternativo para php -S — recomendado para dev com hot reload)
php api/bin/migrate.php                # aplica schema (drop+create)
php -S 127.0.0.1:8080 -t api/public    # API em :8080

# Frontend (em outro terminal)
npm run dev                             # dev em http://localhost:4321
```

### Full-stack (XAMPP — recomendado para "abrir e usar")
```bat
:: dentro de C:\desenvolvimento\doclify\
bin\deploy-xampp.bat                    :: build + sync + smoke tests
:: abrir http://localhost/ e fazer login com Google
```

Primeiro login com sua conta Google — você será auto-registrado (vinculado por `google_sub`). Configure origens autorizadas no GCP Cloud Console (`http://localhost` + `http://127.0.0.1`).

---

## 15. Histórico de Mudanças Recentes

- **R5 — Google OAuth + Painel (XAMPP-friendly)**:
  - Substituição completa da autenticação por Google Identity Services + verificação do ID token via `oauth2.googleapis.com/tokeninfo` (Google aud check, `exp`, `email_verified`).
  - Migration `api/sql/migrations/0001_oauth_columns.sql`: `users` recebe `google_sub VARCHAR(255) NOT NULL UNIQUE` + `picture VARCHAR(512) NULL`, perde `password_hash`. Aplicada na dev DB; `schema.sql` canônico agora reflete o estado OAuth-only (idempotente DROP+CREATE).
  - Sidebar/Header/form rebranded: "RequisitaApp" → **Doclify**; "Acessar Dashboard" → "Acessar Painel"; "Workspace" → "Painel".
  - **Rename de rota `/dashboard` → `/painel`** — XAMPP 8.x serve um Alias `/dashboard` que hijackeia e exibe o painel Phoenicium dele. Renomear a pasta + URL refs evita ter que mexer no Apache.
  - **Rota `/dashboard/[id]` (SSR) → `/painel/document` (estática com `?id=`)** — remove dependência efetiva do adapter `@astrojs/node`. Build volta a ser 100% estático.
  - Página `/painel/document` agora usa fallback de path (URLs legadas `/painel/<id>` ainda funcionam).
  - `.gitignore` agora cobre `OAuth.md`, `api/.env` e `.env` da raiz — vazamentos de `client_secret` evitados a nível de repo.

- **R4 — Frontend ligado à API**: `src/data/api.ts` + `apiClient.ts` + `storage.ts`; `src/data/auth.ts` e `store.ts` reescritos como wrappers async do `apiClient`; 6 componentes React atualizados para async + loading/error states; `.env` com `PUBLIC_API_URL`; backend tweak no `DocumentsController::create` para aceitar `id` do cliente (regex + 409 em conflito).

- **R3 — Backend PHP/MySQL**: scaffold completo em `api/` com PHP vanilla 8.2, MySQL 8, tokens opacos SHA256, CORS, error handlers globais, CRUD de documentos + auth endpoints.

- **R2 — Header + Auth mock**: header simplificado para apenas Logo + Entrar (ou avatar+Sair quando logado). Sidebar sticky à esquerda. Mock auth via localStorage com cross-tab sync.

- **R1 — Bootstrap**: scaffold completo de Astro 5 + React 19 + Tailwind v4 + jsPDF conforme `doclify.md`.
