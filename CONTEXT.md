# Doclify — Contexto do Projeto

> Documentação viva do **Doclify** — gerador web de levantamentos de requisitos com exportação em PDF, 100% client-side. Mantém arquitetura, convenções, modelo de dados e estado atualizados.

---

## 1. Visão Geral

O **Doclify** permite criar, organizar e exportar documentos de levantamento de requisitos em PDF diretamente no navegador. Os documentos persistem em MySQL (via API REST em `api/`); o token de sessão fica em `localStorage` do navegador.

**Funcionalidades-chave:**
- Landing page (hero com preview, features, "Como funciona")
- Autenticação mock (qualquer e-mail válido + senha ≥ 4 chars entra)
- Página de login com show/hide de senha e redirect honoring `?next=`
- Dashboard de documentos com **filtros por status** e **busca textual**
- **Sidebar sticky** à esquerda com Documentos + Novo Documento + info do usuário + logout
- Formulário dinâmico de requisitos (funcionais e não-funcionais, baixa → crítica)
- Visualização individual com estatísticas e agrupamento por tipo
- Exportação em PDF profissional via jsPDF (capa, badges, paginação automática)
- **Cross-tab sync** via eventos `auth-change` e `storage`

---

## 2. Stack Tecnológica

| Camada              | Tecnologia                         | Versão        |
|---------------------|------------------------------------|---------------|
| Framework           | Astro                              | ^5.4          |
| UI Islands          | React                              | ^19.0         |
| Estilização         | Tailwind CSS (via `@tailwindcss/vite`) | ^4.1.4     |
| Ícones              | lucide-react                       | ^0.473        |
| PDF                 | jsPDF                              | ^2.5          |
| SSR Adapter         | @astrojs/node                      | ^9.4          |
| Linguagem           | TypeScript (strict)                | ^5.7          |
| Backend (novo)      | PHP vanilla + MySQL                | PHP 8.2 / MySQL 8 |

A integração Tailwind v4 é feita **diretamente via plugin Vite** (sem `@astrojs/tailwind`). Tokens vivem em `src/styles/global.css` dentro de `@theme {}` e geram classes utilitárias automaticamente — **sem `tailwind.config.js`**.

---

## 3. Estrutura de Pastas

```
src/
├── components/             # Componentes Astro estáticos
│   └── Header.astro        # Logo + HeaderUserMenu (Entrar | avatar+Sair)
├── data/
│   ├── api.ts              # Singleton do apiClient (lê PUBLIC_API_URL do .env)
│   ├── apiClient.ts        # Camada fetch: ApiError + createApiClient + Bearer + 401
│   ├── auth.ts             # Login/logout/getCurrentUser (delega para api.auth)
│   ├── storage.ts          # Wrapper localStorage para token+user + auth-change
│   ├── store.ts            # CRUD de documentos (delega para api.documents)
│   └── types.ts            # Tipos do domínio + labels PT-BR
├── layouts/
│   └── Layout.astro        # Layout base: html shell, header, footer
├── pages/                  # Rotas baseadas em arquivo
│   ├── index.astro         # Landing page
│   ├── login.astro         # Tela de login (envolve LoginForm)
│   └── dashboard/
│       ├── index.astro     # Lista de documentos (sidebar + tabela)
│       ├── novo.astro      # Criar/editar (`?id=` carrega existente)
│       └── [id].astro      # Visualizar documento (SSR via adapter Node)
├── react/                  # Componentes interativos (React Islands)
│   ├── AppSidebar.tsx
│   ├── DashboardTable.tsx
│   ├── DocumentView.tsx
│   ├── HeaderUserMenu.tsx
│   ├── LoginForm.tsx
│   └── RequirementsForm.tsx
├── styles/
│   └── global.css          # @import "tailwindcss" + @theme tokens
└── utils/
    ├── dates.ts            # formatDate / formatDateTime (Intl PT-BR)
    └── pdfGenerator.ts     # jsPDF: layout estruturado, badges, paginação

api/                        # Backend PHP/MySQL (ainda não ligado ao frontend)
├── public/
│   ├── index.php           # Front controller
│   └── .htaccess           # Rewrite para Apache (opcional)
├── src/
│   ├── bootstrap.php       # PSR-4 autoloader + error handlers + .env
│   ├── Env.php             # Loader de KEY=VALUE
│   ├── Database.php        # Singleton PDO
│   ├── Cors.php            # CORS headers + preflight OPTIONS
│   ├── Request.php         # Wrapper de $_SERVER + php://input
│   ├── Response.php        # JSON responder (exit após echo)
│   ├── Router.php          # Roteador com addProtected
│   ├── Auth.php            # Tokens opacos + authenticate
│   ├── Validator.php       # Validação de entrada
│   ├── HttpException.php   # Status + message + details
│   ├── routes.php          # Tabela de endpoints
│   └── Controllers/{HealthController,AuthController,DocumentsController}.php
├── sql/schema.sql          # CREATE DATABASE + tabelas + CHECK constraints
├── bin/{migrate,seed}.php  # CLI PHP para schema e dados demo
├── .env.example
├── .gitignore
└── README.md
```

**Arquivos de configuração na raiz:** `astro.config.mjs`, `tsconfig.json`, `package.json`, `.gitignore`, `public/favicon.svg`, `CONTEXT.md`.

---

## 4. Rotas

### Frontend (Astro)

| Rota             | Tipo   | Auth      | SSR Adapter | Descrição                                      |
|------------------|--------|-----------|-------------|------------------------------------------------|
| `/`              | Estática | Pública | Não         | Landing page                                    |
| `/login`         | Estática | Pública | Não         | Formulário de login + redirect `?next=`         |
| `/dashboard`     | Estática | Protegida¹ | Não       | Lista de documentos (sidebar + tabela)         |
| `/dashboard/novo`| Estática | Protegida¹ | Não       | Criar/editar (`?id=<id>` carrega existente)    |
| `/dashboard/[id]`| **SSR**  | Protegida¹ | **Sim** (`prerender = false`) | Visualizar documento individual |

¹ **Proteção:** renderizada pelo `AppSidebar` no mount: se `!isAuthenticated()` → redireciona para `/login?next=<pathname>`. Hidratação como `client:only="react"` para evitar flash visual de proteção ausente.

### Backend (API em `api/`)

| Método | Rota                       | Auth      | Descrição                                   |
|--------|----------------------------|-----------|---------------------------------------------|
| GET    | `/api/health`              | —         | Healthcheck                                 |
| POST   | `/api/auth/login`          | —         | Login (auto-registra se usuário não existe) |
| POST   | `/api/auth/logout`         | Bearer    | Invalida o token atual                      |
| GET    | `/api/auth/me`             | Bearer    | Retorna o usuário autenticado               |
| GET    | `/api/documents`           | Bearer    | Lista documentos do usuário                 |
| GET    | `/api/documents/{id}`      | Bearer    | Detalha um documento                        |
| POST   | `/api/documents`           | Bearer    | Cria documento (substitui requirements)     |
| PUT    | `/api/documents/{id}`      | Bearer    | Atualiza (substitui requirements opcionalmente) |
| DELETE | `/api/documents/{id}`      | Bearer    | Remove                                      |

> Frontend chama esses endpoints via `src/data/api.ts` (singleton do `apiClient`) com `Authorization: Bearer <token>`. Configurado por `PUBLIC_API_URL` no `.env` da raiz (default dev: `http://127.0.0.1:8080/api`).

---

## 5. Camada de Dados

### 5.1 Tipos (`src/data/types.ts`)

```ts
type RequirementType      = 'functional' | 'non-functional';
type RequirementPriority  = 'low' | 'medium' | 'high' | 'critical';
type DocumentStatus       = 'draft' | 'in-progress' | 'completed';

interface Requirement     { id; type; priority; description; }
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

API pública (mesma da era mock): `login(email, password)` · `logout()` · `isAuthenticated()` · `getCurrentUser()` · `initialsOf(user)` · `AUTH_KEY` (exportada) + tipos `CurrentUser`, `LoginResult`.

- Token em localStorage chave **`doclify:auth:v1`** como `{ token, user }`.
- `login()`/`logout()` agora **async** — delegam para a API; em falha retorna `LoginResult = { ok:false, error }` ou silenciosamente limpa local.
- `isAuthenticated()`/`getCurrentUser()` continuam sync (apenas leitura do storage) para uso em guards de redirect.
- Em 401 de qualquer chamada, `apiClient` limpa o storage + dispara `auth-change` → sidebar/header reagem e o guard redireciona para `/login?next=…`.

---

## 6. Backend API (`api/`)

### 6.1 Stack

- **PHP 8.2 vanilla** — sem Composer/framework. Autoloader PSR-4 manual em `src/bootstrap.php`.
- **MySQL 8** — `CHECK` constraints para `status`/`type`/`priority`.
- **Sem dependências externas** — `password_hash` (bcrypt), `random_bytes`, `PDO`, `hash_hmac`.

### 6.2 Como rodar

```bash
# 1. Configurar credenciais
cp api/.env.example api/.env   # ou copy no Windows
# 2. Editar api/.env (DB_HOST, DB_USER, DB_PASS, FRONTEND_ORIGIN, ...)

# 3. Aplicar schema
php api/bin/migrate.php

# 4. Popular dados de teste
php api/bin/seed.php

# 5. Subir dev server
php -S 127.0.0.1:8080 -t api/public
```

Usuário de teste criado pelo seed: `demo@requisita.app` / `demo1234`.

### 6.3 Modelo de dados (MySQL)

| Tabela         | Colunas principais                                                | Índices / FKs                                       |
|----------------|-------------------------------------------------------------------|-----------------------------------------------------|
| `users`        | id, name, email (unique), password_hash, created_at               | PK id, UNIQUE email                                 |
| `user_tokens`  | id, user_id, token_hash (sha256), expires_at, created_at         | FK user_id → users (CASCADE), UNIQUE token_hash     |
| `documents`    | id, user_id, title, client, description, status, created_at, updated_at | FK user_id → users (CASCADE), CHECK(status ∈ {draft,in-progress,completed}) |
| `requirements` | id, document_id, type, description, priority, position            | FK document_id → documents (CASCADE), CHECK(type/priority) |

- Time-stamps armazenados em UTC. `Database.php` força `time_zone='+00:00'` na conexão.
- `updated_at` em `documents` tem `ON UPDATE CURRENT_TIMESTAMP`, mas o controller **também** seta `gmdate(...)` explicitamente para garantir comportamento previsível independente da conexão.
- IDs gerados como `doc-<hex8>` e `req-<hex6>` (legíveis + únicos).

### 6.4 Autenticação

- **Tokens opacos** estilo Laravel Sanctum:
  - Token cru: `bin2hex(random_bytes(32))` (64 chars hex).
  - Apenas o **hash SHA-256** armazenado em `user_tokens.token_hash`.
  - HTTP `Authorization: Bearer <token>`. Sem cookies → `credentials` não precisa.
- **Logout imediato**: DELETE na `user_tokens` revoga a sessão na hora.
- **TTL** configurável via `TOKEN_TTL_HOURS` (default 7 dias).
- **Auto-registro** no login (mesmo comportamento do mock frontend) — remover em produção para usuários não convidados.

### 6.5 Request/response

- Body sempre `Content-Type: application/json`. JSON malformado → 400.
- Erros sempre `{ "error": string, "details": object }` com `details` vazio `{}` (não `[]`) quando não há contexto.
- Status: 200 / 201 / 400 (validação) / 401 (token/credenciais) / 404 / 405 / 500.

### 6.6 CORS / preflight

- Origem controlada por `FRONTEND_ORIGIN` no `.env` (dev: `http://localhost:4321`).
- `OPTIONS` respondem **204 sem chamar o roteador** (evita 401 espúrio no preflight do browser).
- `Access-Control-Allow-Headers: Content-Type, Authorization`.

### 6.7 Segurança

- `display_errors = Off` + `html_errors = Off` no bootstrap — nunca vaza HTML 500.
- `set_error_handler` converte warnings/notices em `ErrorException` (capturáveis).
- `set_exception_handler` + `register_shutdown_function` garantem **qualquer** crash responde JSON 500.
- Prepared statements em **100%** das queries (`PDO::ATTR_EMULATE_PREPARES = false` → mysqlnd native).
- Senhas: `password_hash($p, PASSWORD_DEFAULT)` + `password_verify` — auto-update via `password_needs_rehash` quando o algoritmo default mudar.

### 6.8 Limitações conhecidas

- **Sem versionamento de schema** — apenas `schema.sql` único. Migrador versionado (ex.: Doctrine Migrations) é "próximo passo".
- **Single-process** — sem lock em tokens; sob concorrência extrema dois logouts simultâneos podem ambos serem nonce-OK (mitigado pelo curto tempo da operação).
- **N+1 no `hydrate`** — DocumentsController::index faz 1 query por documento para carregar requirements. Refatorar para batch quando o volume crescer.
- **Senhas**: PASSWORD_DEFAULT hoje é bcrypt; auto-update via `password_needs_rehash` cobre transição futura para argon2id.

---

## 7. Componentes React (Ilhas)

| Componente        | Diretiva Astro       | Função                                                       |
|-------------------|----------------------|--------------------------------------------------------------|
| `HeaderUserMenu`  | `client:load`        | "Entrar" (deslogado) ou avatar + nome + Sair (logado)        |
| `LoginForm`       | `client:load`        | Form e-mail/senha, show/hide, validação, redirect `?next=`    |
| `AppSidebar`      | `client:only="react"`| Sidebar sticky à esquerda: Documentos, + Novo Documento, user info, Sair |
| `DashboardTable`  | `client:load`        | Tabela com filtros de status (tabs com contadores) + busca + ações (view/edit/delete) |
| `RequirementsForm`| `client:load`        | Form dinâmico de requisitos, criar/editar, validação, salvar|
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

---



---

## 12. Limitações Conhecidas

### Frontend
- **Token em localStorage**: vulnerável a XSS. Para produção, mover para cookie HttpOnly + CSRF protection ou refresh tokens curtos.
- **SSR híbrido**: apenas `/dashboard/[id]` é SSR (via `@astrojs/node`); demais rotas são pré-renderizadas. `[id]` ainda precisa do fetch client-side (servidor não tem token) — flicker mínimo até hidratar.
- **Sem testes automatizados ainda** — alvo: Vitest para `store.ts`, `auth.ts`, `pdfGenerator.ts`; PHPUnit no backend.
- **PDF sem fontes custom** ou imagens (apenas Helvetica built-in); suficiente até ~30 requisitos por documento.
- **Login com auto-registro** no `AUTH_AUTO_REGISTER=true` (default) — horário de avaliação definido em `api/.env`.

### Backend
- **Sem versionamento de schema** (apenas um schema.sql único).
- `DocumentsController::index` faz **N+1** queries — agrupar requirements via JOIN quando o volume crescer.
- Sem rate-limiting, sem logs estruturados.

---

## 13. Próximos Passos Sugeridos

1. **Middleware SSR auth-aware** no Astro Node adapter — proteger `/dashboard/*` server-side (lê token de cookie ou Authorization) para evitar o flash do redirect client-side na `/dashboard/[id]`.
2. **Refresh tokens** — encurtar TTL padrão + endpoint `/api/auth/refresh` para rotação sem novo login.
3. **Resolver N+1 + testes** — `DocumentsController::index` em batch + PHPUnit cobrindo Auth (login/auto-register/rehash/401) e DocumentsController (CRUD + isolamento por user_id); Vitest no frontend para `storage`, `apiClient`.
4. **Migrations versionadas** — adicionar Doctrine Migrations ou Phinx quando schema começar a evoluir.
5. **Cookie HttpOnly em vez de localStorage** — para tirar o vetor XSS, setar o token via Set-Cookie do backend.
6. **Templates de documento** — presets por categoria (e-commerce, RH, mobile) para acelerar criação.
7. **Import inteligente** — gerar requisitos a partir de texto/IA.

---

## 14. Comandos

### Full-stack (dev)
```bash
# Backend
php api/bin/migrate.php                # aplica schema
php api/bin/seed.php                   # popula demo user + 3 docs
php -S 127.0.0.1:8080 -t api/public    # API em :8080

# Frontend (em outro terminal)
npm run dev                             # dev em http://localhost:4321
```
Login com `demo@requisita.app / demo1234` (seed) ou cadastre qualquer e-mail com ≥ 4 caracteres. O `.env` da raiz define `PUBLIC_API_URL=http://127.0.0.1:8080/api`.

---

## 15. Histórico de Mudanças Recentes

- **R4 — Frontend ligado à API**: `src/data/api.ts` + `apiClient.ts` + `storage.ts`; `src/data/auth.ts` e `store.ts` reescritos como wrappers async do `apiClient`; 6 componentes React (LoginForm, HeaderUserMenu, AppSidebar, DashboardTable, RequirementsForm, DocumentView) atualizados para async + loading/error states; `.env` com `PUBLIC_API_URL`; backend tweak no `DocumentsController::create` para aceitar `id` do cliente (regex + 409 em conflito).
- **R3 — Backend PHP/MySQL**: scaffold completo em `api/` com PHP vanilla 8.2, MySQL 8, tokens opacos SHA256, CORS, error handlers globais, CRUD de documentos + auth endpoints, scripts `migrate.php` e `seed.php`.
- **R2 — Header + Auth**: header simplificado para apenas Logo + Entrar (ou avatar+Sair quando logado). Sidebar sticky à esquerda com Documentos + Novo Documento. Mock auth via localStorage com cross-tab sync. Página `/login`.
- **R1 — Bootstrap**: scaffold completo de Astro 5 + React 19 + Tailwind v4 + jsPDF + `@astrojs/node@9` SSR adapter conforme `doclify.md`.
