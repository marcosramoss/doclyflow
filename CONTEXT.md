# Doclyflow — Contexto do Projeto

> Documentação viva do **Doclyflow** — gerador web de levantamentos de requisitos com exportação em **PDF** e **Markdown**, persistência em **MySQL** via **API REST PHP vanilla**, autenticação exclusiva via **Google OAuth**. Reflete o estado atual do código na `main` — atualizado após o ciclo de robustez de PDF + títulos dinâmicos (R7+).

---

## 1. Visão Geral

O **Doclyflow** permite criar, organizar e exportar documentos de levantamento de requisitos diretamente no navegador. Os documentos persistem em **MySQL** através de uma **API REST PHP vanilla** em `api/`; autenticação exclusivamente via **Google OAuth** (Google Identity Services no frontend + verificação do ID token no backend). O token de sessão fica em `localStorage` do navegador.

**Funcionalidades-chave:**
- Landing page (hero com preview, features, "Como funciona", "Telas do sistema" com mockups reais + copy atrelada à UI do produto + decoration pills contextual)
- Login via Google (OAuth) — popup do Google Identity Services
- Página de login com redirect honoring `?next=`
- **Painel** de documentos com **filtros por status** e **busca textual**
- **Sidebar** fixa à esquerda com link "**Documentos**" + bloco de perfil (avatar do Google ou iniciais + nome + email) + botão "Sair da conta"
- CTA **"Novo Documento"** aparece no topo da lista em `/painel/` (única via, sem duplicidade)
- Formulário dinâmico de requisitos (funcionais e não-funcionais, baixa → crítica) + **picker de stack tecnológica** (14 nomes fixos como checkboxes + "Outra (especificar)" que abre input livre)
- **Rota de visualização** individual com estatísticas e agrupamento por tipo (`/painel/document?id=<id>`, 100% client-side)
- Exportação em **PDF profissional** via jsPDF (capa, badges, paginação automática)
- Exportação em **Markdown** (`## Stack Tecnológica` + listas numeradas de requisitos), ideal para uso como "skill" em IA
- **Cross-tab sync** via eventos `auth-change` e `storage`

---

## 2. Stack Tecnológica

| Camada              | Tecnologia                         | Versão        |
|---------------------|------------------------------------|---------------|
| Framework           | Astro                              | ^7.0 (100% static) |
| UI Islands          | React                              | ^19.0         |
| Estilização         | Tailwind CSS (via `@tailwindcss/vite`) | ^4.1.4     |
| Ícones              | lucide-react                       | ^0.473        |
| PDF                 | jsPDF                              | ^4.2.1        |
| Linguagem           | TypeScript (strict)                | ^5.7          |
| Autenticação        | Google Identity Services (GSI)     | —             |
| Testes              | Vitest + pdf-lib                   | ^4.1 / ^1.17  |
| OG image (script)   | @resvg/resvg-js                    | ^2.6          |
| Backend             | PHP 8.2 vanilla + MySQL 8          | —             |

> O projeto é **100% estático**. `astro.config.mjs` não declara nenhum SSR adapter — leitura dinâmica de `?id=<uuid>` em `/painel/document` é resolvida client-side dentro da ilha React `DocumentView`. O `astro.config.mjs` faz **fail-fast** se `PUBLIC_API_URL` não estiver definida no `.env` (com mensagem explicando como criar o arquivo).

A integração Tailwind v4 é feita **diretamente via plugin Vite** (sem `@astrojs/tailwind`). Tokens vivem em `src/styles/global.css` dentro de `@theme {}` e geram classes utilitárias automaticamente — **sem `tailwind.config.js`**.

---

## 3. Estrutura de Pastas

```
doclyflow/
├─ astro.config.mjs                 # config Astro (estático, fail-fast em PUBLIC_API_URL)
├─ package.json
├─ tsconfig.json
├─ .env                             # PUBLIC_API_URL=http://localhost/api (criar)
├─ .gitignore                       # ignora OAuth.md, .env, dist, etc.
├─ README.md                        # quick start do projeto inteiro
├─ CONTEXT.md                       # este arquivo
├─ doclyflow.md                       # plano original (roadmap cronológico)
├─ OAuth.md                         # ⚠️ client_id + client_secret — NUNCA comitar
├─ deploy/
│  ├─ README.md                     # guia de deploy XAMPP
│  └─ xampp-httpd-doclyflow.conf      # vhost Apache
├─ bin/
│  └─ deploy-xampp.bat              # build + sync + smoke tests
├─ api/                             # Backend PHP/MySQL
│  ├─ public/
│  │  ├─ index.php                  # front controller
│  │  └─ .htaccess                  # rewrite para Apache
│  ├─ src/
│  │  ├─ bootstrap.php              # PSR-4 autoloader + error handlers + .env
│  │  ├─ Env.php
│  │  ├─ Database.php               # Singleton PDO (time_zone = '+00:00')
│  │  ├─ Cors.php
│  │  ├─ Request.php                # Bearer token com fallback apache_request_headers()
│  │  ├─ Response.php
│  │  ├─ Router.php
│  │  ├─ Auth.php                   # Tokens opacos SHA-256 + Google tokeninfo verify
│  │  ├─ Validator.php
│  │  ├─ HttpException.php
│  │  ├─ routes.php                 # tabela de endpoints (sem /api/technologies)
│  │  └─ Controllers/{HealthController,AuthController,DocumentsController}.php
│  ├─ sql/
│  │  └─ schema.sql                 # canonical DROP+CREATE (OAuth-only users + documents.technologies TEXT)
│  ├─ bin/{migrate,seed}.php        # CLI PHP (migrate aplica schema.sql; seed popula demo user)
│  ├─ .env.example                  # FRONTEND_ORIGIN, DB_*, GOOGLE_CLIENT_ID, etc.
│  └─ .gitignore
└─ src/                             # Frontend Astro+React
   ├─ components/
   │  ├─ Header.astro               # Logo + HeaderUserMenu (Entrar | avatar+Sair)
   │  ├─ FeaturesGrid.astro         # Grid de features do hero
   │  ├─ GitHubStarsBadge.astro     # Badge de estrelas do GitHub (hero CTA)
   │  ├─ StepsTimeline.astro        # Timeline "Como funciona"
   │  ├─ ScreensSection.astro       # Seção "Telas do sistema" — 4 cards (mockup+texto em zigzag) com features real-coupling + decoration pills contextual (R8)
   │  ├─ ScreenCard.astro           # Wrapper de card reutilizado pela ScreensSection (zigzag-friendly: w-full + flip de ordem)
   │  └─ screens/                   # 4 mockups das telas do produto (Dashboard | Form | Requisitos view | PDF)
   ├─ data/
   │  ├─ api.ts                     # Singleton do apiClient (lê PUBLIC_API_URL do .env)
   │  ├─ apiClient.ts               # Camada fetch: ApiError + createApiClient + Bearer + 401
   │  ├─ auth.ts                    # Login/logout/getCurrentUser (delega para api.auth)
   │  ├─ storage.ts                 # Wrapper localStorage para token+user + auth-change
   │  ├─ store.ts                   # CRUD de documentos (delega para api.documents)
   │  └─ types.ts                   # Tipos do domínio + labels PT-BR (technologies: string[])
   ├─ layouts/
   │  └─ Layout.astro               # Layout base: html shell, header, footer
   ├─ pages/
   │  ├─ index.astro                # Landing page
   │  ├─ login.astro                # Tela de login (envolve LoginForm)
   │  └─ painel/
   │     ├─ index.astro             # Lista de documentos (sidebar + tabela + CTA "Novo Documento")
   │     ├─ novo.astro              # Criar/editar (`?id=` carrega existente)
   │     └─ document.astro          # Visualizar (lê `?id=` no client)
   ├─ react/                        # Componentes interativos (React Islands)
   │  ├─ AppSidebar.tsx             # Sidebar com link Documentos + perfil (com avatar) + Sair
   │  ├─ DashboardTable.tsx         # Lista com filtros + busca + ações, inclui CTA "Novo Documento"
   │  ├─ DocumentView.tsx           # Visualização + chips de stack + Exportar PDF/MD + título dinâmico
   │  ├─ HeaderUserMenu.tsx         # "Entrar" (deslogado) ou avatar + nome + Sair (logado)
   │  ├─ LoginForm.tsx              # Login Google (GSI), redirect `?next=`
   │  ├─ RequirementsForm.tsx       # Form de requisitos + picker de stack + validação + salvar + título dinâmico
   │  └─ hooks/
   │     └─ useDocumentTitle.ts     # Hook reutilizável: sincroniza <title> + og:title + twitter:title
   ├─ styles/
   │  └─ global.css                 # @import "tailwindcss" + @theme tokens
   └─ utils/
      ├─ dates.ts                   # formatDate / formatDateTime (Intl PT-BR)
      ├─ documentId.ts              # resolve ?id= no client (fallback SSG)
      ├─ pdfGenerator.ts            # jsPDF: layout estruturado, badges, paginação com quebras confiáveis
      ├─ pdfGenerator.test.ts       # suíte vitest (overflow, CRLF, integridade do buffer)
      └─ markdownGenerator.ts       # .md estruturado (título, stack, requisitos numerados)
```

> **Não existem mais** `src/data/technologiesCatalog.ts`, o diretório `api/sql/migrations/` (com `0001_oauth_columns.sql` e `0004_documents_technologies_text.sql`), nem o script `api/bin/migrate-oauth.php`. Evoluções antigas estão consolidadas em `api/sql/schema.sql` (canônico único).

---

## 4. Rotas

### Frontend (Astro) — todas estáticas

| Rota                 | Auth       | SSR | Descrição                                                |
|----------------------|------------|-----|----------------------------------------------------------|
| `/`                  | Pública    | Não | Landing page                                             |
| `/login`             | Pública    | Não | Formulário de login Google + redirect `?next=`           |
| `/painel`            | Protegida¹ | Não | Lista de documentos (sidebar + tabela + CTA "Novo Documento") |
| `/painel/novo`       | Protegida¹ | Não | Criar/editar (`?id=<id>` carrega existente)              |
| `/painel/document`   | Protegida¹ | Não | Visualizar (`?id=<uuid>` — resolvido client-side)        |

> **Por que `/painel` em vez de `/dashboard`?** XAMPP 8.x serve um Alias interno `/dashboard` que hijackeia a URL e exibe o painel Phoenicium dele. Para evitar o conflito sem tocar em Apache, a rota foi renomeada para `/painel` no R5.

> **Por que `/painel/document` sem `[id]`?** Mantendo o build 100% estático (sem SSR Node, sem `@astrojs/node`), a página `document.astro` é uma única página HTML que lê `?id=<uuid>` no `DocumentView.tsx`.

¹ **Proteção:** renderizada pelo `AppSidebar` no mount: se `!isAuthenticated()` → redireciona para `/login?next=<pathname>`. Hidratação como `client:only="react"` para evitar flash visual de proteção ausente.

### Backend (API em `api/`)

| Método | Rota                  | Auth   | Descrição                                   |
|--------|-----------------------|--------|---------------------------------------------|
| GET    | `/api/health`         | —      | Healthcheck (200 JSON)                      |
| POST   | `/api/auth/google`    | —      | Login Google OAuth (recebe ID token)        |
| POST   | `/api/auth/logout`    | Bearer | Invalida o token atual                      |
| GET    | `/api/auth/me`        | Bearer | Retorna `CurrentUser`                       |
| GET    | `/api/documents`      | Bearer | Lista documentos do usuário                 |
| GET    | `/api/documents/{id}` | Bearer | Detalha um documento (com `requirements[]`) |
| POST   | `/api/documents`      | Bearer | Cria documento (substitui requirements)     |
| PUT    | `/api/documents/{id}` | Bearer | Atualiza (substitui requirements opcionalmente) |
| DELETE | `/api/documents/{id}` | Bearer | Remove                                      |

> Frontend chama esses endpoints via `src/data/api.ts` (singleton do `apiClient`) com `Authorization: Bearer <token>`. Configurado por `PUBLIC_API_URL` no `.env` da raiz (default dev XAMPP: `http://localhost/api`).
>
> ⚠️ **Importante (deploy XAMPP):** o `api/.htaccess` precisa da regra `RewriteRule … [E=HTTP_AUTHORIZATION:%{HTTP:Authorization},L]` para reescrever o header `Authorization` em CGI/FastCGI; sem isso o backend rejeita POST/PUT com 401 "Missing Authorization header" mesmo com Bearer válido. O fallback em `Request::bearer()` usa `apache_request_headers()` para cobrir essa borda.

---

## 5. Camada de Dados

### 5.1 Tipos (`src/data/types.ts`)

```ts
type RequirementType      = 'functional' | 'non-functional';
type RequirementPriority  = 'low' | 'medium' | 'high' | 'critical';
type DocumentStatus       = 'draft' | 'in-progress' | 'completed';

interface Requirement        { id; type; priority; description; }

interface RequirementDocument {
  id; title; client; description; status;
  createdAt; updatedAt;
  requirements: Requirement[];
  technologies?: string[];   // nomes livres (sem catálogo, sem IDs)
}
```

**Sobre `technologies`:** após a simplificação do R6, é apenas um array de **strings com os nomes das tecnologias** escolhidas pelo autor (ex.: `["React", "TypeScript", "PostgreSQL"]`). Sem catálogo, sem ID, sem categorias — o usuário marca livremente os checkboxes do formulário, e o backend persiste como CSV em `documents.technologies` (coluna TEXT). O texto do campo "Outra (especificar)" também entra no mesmo array.

Labels PT-BR centralizados via constantes: `STATUS_LABEL`, `PRIORITY_LABEL`, `TYPE_LABEL`.

### 5.2 Documentos (`src/data/store.ts`)

API pública (era localStorage, agora async sobre a API): `getDocuments()` · `getDocument(id)` · `saveDocument(doc)` · `deleteDocument(id)` · `generateId()` · `resetStore()`.

- Backend (`api/`) é a fonte de verdade. Async via `api.documents.*`.
- `saveDocument(doc)`: tenta `PUT /documents/:id`; em 404 (id novo) faz fallback para `POST /documents`. Backend aceita `id` do cliente (validado por regex), permitindo URLs estáveis antes do servidor confirmar.
- `generateId()` continua no cliente (otimistic UI): retorna `doc-<hex16>` a partir de `crypto.randomUUID()`.
- `getDocuments()` já vem ordenado por `updatedAt` desc do backend.
- O body dos POST/PUT envia `technologies: string[]` **diretamente** (sem transformação intermediária — `apiClient` apenas JSON.stringify).

### 5.3 Autenticação (`src/data/auth.ts`)

API pública: `loginWithGoogle(idToken)` · `logout()` · `isAuthenticated()` · `getCurrentUser()` · `initialsOf(user)` · `AUTH_KEY` · `CurrentUser` · `LoginResult`.

- Token em `localStorage` chave **`doclyflow:auth:v1`** como `{ token, user, expiresAt }`.
- `CurrentUser` (retornado pelo backend): `{ id, name, email, picture: string | null }`. **`picture`** é a URL do avatar do Google Identity Services (`null` em contas que não compartilharam foto).
- `loginWithGoogle(idToken)` delega para `POST /api/auth/google` (envia o JWT cru).
- `logout()` é **async** — chama `POST /api/auth/logout` antes de limpar localStorage.
- `isAuthenticated()`/`getCurrentUser()` continuam sync (apenas leitura do storage) para uso em guards de redirect.
- Avatar renderizado: o `HeaderUserMenu` e o `AppSidebar` mostram `<img src={user.picture}>` (com `referrerPolicy="no-referrer"`) quando a URL existe; caem para `<span>{initialsOf(user)}</span>` caso contrário.
- Em 401 de qualquer chamada, o `apiClient` **não** limpa o storage automaticamente (mantém sessão — a UI mostra CTA de re-login). O guard do `AppSidebar` faz o redirect quando o usuário perde a sessão por navegação direta a `/painel/*`.

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
#   FRONTEND_ORIGIN=http://localhost
#   DB_HOST=127.0.0.1 / DB_PORT=3306 / DB_NAME=doclyflow / DB_USER=root / DB_PASS=
#   GOOGLE_CLIENT_ID=<…> / GOOGLE_CLIENT_SECRET=<…>
#
# 2. Aplicar schema (drop + recreate idempotente)
"C:\xampp\mysql\bin\mysql.exe" -uroot doclyflow < api/sql/schema.sql
#   ou:
php api/bin/migrate.php
#
# 3. Subir API (em :8080) — ou usar Apache do XAMPP, ver deploy/README.md
php -S 127.0.0.1:8080 -t api/public
```

> **Não há usuário seed.** A partir do R5, login é exclusivamente via Google OAuth — primeiro acesso de um `google_sub` cria o `users` automaticamente.

### 6.3 Modelo de dados (MySQL) — schema OAuth-only + stack CSV

| Tabela         | Colunas principais                                                              | Índices / FKs                                       |
|----------------|---------------------------------------------------------------------------------|-----------------------------------------------------|
| `users`        | id, name, email (UNIQUE), **google_sub** (UNIQUE), **picture** (NULL), created_at     | PK id, UNIQUE email, UNIQUE google_sub              |
| `user_tokens`  | id, user_id, token_hash (sha256, UNIQUE), expires_at, created_at                 | FK user_id → users (CASCADE)                        |
| `documents`    | id, user_id, title, client, description, **technologies** (TEXT, NULL, CSV), status, created_at, updated_at | FK user_id → users (CASCADE), CHECK status enum |
| `requirements` | id, document_id, type, description, priority, position                           | FK document_id → documents (CASCADE), CHECK type/priority |

- **Sem coluna `password_hash`** — modelo 100% OAuth.
- **`technologies TEXT DEFAULT NULL`** — uma única string CSV (ex.: `"React, PHP, MySQL"`). 64KB no MySQL, mais que suficiente para dezenas de tecnologias por documento. Decodificada pelo `DocumentsController::decodeTechnologies()` com tolerância a espaços extras e entradas duplicadas.
- Time-stamps em UTC. `Database.php` força `time_zone='+00:00'` na conexão.
- `updated_at` em `documents` tem `ON UPDATE CURRENT_TIMESTAMP`, mas o controller **também** seta `gmdate(...)` explicitamente para garantir comportamento previsível.
- IDs gerados como `doc-<hex8>` e `req-<hex6>` (legíveis + únicos).

> **Schema:** há **um único arquivo canônico** — `api/sql/schema.sql` (DROP+CREATE idempotente). Ele incorpora o estado OAuth-only **e** a coluna `documents.technologies TEXT` (CSV, NULL por default). Os arquivos `0001_oauth_columns.sql`, `0004_documents_technologies_text.sql` e `bin/migrate-oauth.php` foram consolidados nas próprias definições de tabela — não há mais migrations pontuais a aplicar. Quando o schema precisar evoluir com dados em prod (futuras colunas não-droppables), reintroduzir runner versionado + tabela de tracking de migrations.

### 6.4 Autenticação Google OAuth

- O frontend (Google Identity Services) obtém um **ID token JWT** assinado pelo Google.
- O frontend envia `POST /api/auth/google { token }`.
- O backend valida o token via `GET https://oauth2.googleapis.com/tokeninfo?id_token=<jwt>` — checa `aud == GOOGLE_CLIENT_ID`, `exp`.
- **Auto-registro** no primeiro login:
  - SELECT por `google_sub` → se existe, atualiza `name` e `picture` apenas se o perfil do Google trouxer valores novos **e** os atuais estiverem vazios.
  - Se não existe por `google_sub`, tenta por `email` (merge de conta se `email_verified=true`).
  - Caso ainda assim não exista, `INSERT` com `google_sub`, `name`, `email`, `picture`.
- Após autenticação, emite um **token opaco Sanctum-style** (`bin2hex(random_bytes(32))`) e armazena apenas o SHA-256 em `user_tokens`.

### 6.5 Request/response

- Body sempre `Content-Type: application/json`. JSON malformado → 400.
- Erros sempre `{ "error": string, "details": object }` com `details` vazio `{}` quando não há contexto.
- Status: 200 / 201 / 400 (validação) / 401 (token/credenciais) / 404 / 405 / 500.

### 6.6 CORS / preflight

- Origem controlada por `FRONTEND_ORIGIN` no `.env` (dev XAMPP: `http://localhost`).
- `OPTIONS` respondem **204 sem chamar o roteador** (evita 401 espúrio no preflight do browser).
- `Access-Control-Allow-Headers: Content-Type, Authorization`.
- Em Apache (XAMPP), o `.htaccess` reescreve o header `Authorization` para FastCGI — fundamental para POST/PUT funcionarem sem "Missing Authorization header".

### 6.7 Segurança

- `display_errors = Off` + `html_errors = Off` no bootstrap — nunca vaza HTML 500.
- `set_error_handler` converte warnings/notices em `ErrorException` (capturáveis).
- `set_exception_handler` + `register_shutdown_function` garantem **qualquer** crash responde JSON 500.
- Prepared statements em **100%** das queries (`PDO::ATTR_EMULATE_PREPARES = false` → mysqlnd native).
- Tokens: apenas SHA-256 armazenado → se o banco vazar, tokens crus não são comprometidos.
- **Sem senhas** — modelo OAuth-only elimina o vetor de password leak / reuse / breach.

### 6.8 Limitações conhecidas

- **Validação do ID token via `/tokeninfo`** — uma chamada de rede por login. Migrar para verificação local via JWKS (`firebase/php-jwt` ou Google Auth Library) quando o volume justificar.
- **CSV em `documents.technologies`** — nomes que contenham vírgula (ex.: "Vue.js, Next.js") quebram no split. Trade-off aceito na simplificação do R6; workaround futuro = trocar para `JSON` nativo do MySQL.
- **Sem versionamento de schema formal** — `schema.sql` é o canônico único para fresh installs. Migrador versionado (Phinx / Doctrine / tabela de tracking própria) será reintroduzido quando começar a haver evolução aditiva em banco não-vazio.
- **Single-process** — sem lock em tokens; sob concorrência extrema dois logouts simultâneos podem ambos serem nonce-OK.
- **N+1 no list** — `DocumentsController::index` faz 1 query por documento para carregar `requirements`. Refatorar para JOIN/IN quando volume crescer.

---

## 7. Componentes React (Ilhas)

| Componente         | Diretiva Astro         | Função                                                                          |
|--------------------|------------------------|---------------------------------------------------------------------------------|
| `HeaderUserMenu`   | `client:load`          | "Entrar" (deslogado) ou `<img src={user.picture}>` (com iniciais como fallback) + nome + email + Sair |
| `LoginForm`        | `client:load`          | Login Google (GSI), redirect `?next=`                                            |
| `AppSidebar`       | `client:only="react"`  | Sidebar fixa à esquerda: link "Documentos" + bloco de perfil (avatar do Google com fallback de iniciais) + botão "Sair da conta" |
| `DashboardTable`   | `client:load`          | Tabela de documentos com filtros de status (tabs com contadores) + busca + ações (view/edit/delete) + CTA "Novo Documento" no topo |
| `RequirementsForm` | `client:load`          | Form dinâmico de requisitos + card "Tecnologias" (14 checkboxes fixas + "Outra" com input livre) + validação + salvar |
| `DocumentView`     | `client:load`          | Visualização + chips de stack (`doc.technologies`) + estatísticas + grupos (funcionais/NF) + Exportar PDF + Exportar MD |

**Padrão:** `localStorage` é lido **apenas dentro de `useEffect`** (nunca no corpo do componente) para evitar mismatch de SSR/hidratação. O guard `hydrated` controla estados intermediários.

---

## 8. Geração de PDF + Markdown (`src/utils/`)

### PDF (`pdfGenerator.ts`)

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

**Robustez contra overflow (R7):** `drawWrappedText` itera linha-a-linha e chama `ensureSpace` por linha (quebras de página mid-parágrafo + normalização CRLF→LF); a seção "Descrição" tem `ensureSpace` antes do título; `renderRequirement` usa `lineHeightFactor = 14/11` casando com o tracking de `y` (`REQ_LINE_HEIGHT`) para que blocos vizinhos não se sobreponham. Coberto por `src/utils/pdfGenerator.test.ts` (6 testes vitest com fixtures de descrição/requisitos longos e verificação de integridade do buffer via `pdf-lib`).

### Markdown (`markdownGenerator.ts`)

- Função pública: `downloadDocumentMarkdown(doc)` — dispara download de `<safeName>_requisitos.md`.
- Função interna: `generateDocumentMarkdown(doc): string` — serializa o documento em `.md`.

**Estrutura do MD:**
1. `# <título>`
2. Bloco de metadados em blockquote (cliente, status, id, criado, atualizado)
3. `## Visão Geral` (opcional — só se houver descrição)
4. `## Stack Tecnológica` (opcional — lista `- <nome>` por item de `doc.technologies`)
5. `## Requisitos` com resumo inline
6. Sub-seções numeradas: `### Requisitos Funcionais (<n>)` e `### Requisitos Não-Funcionais (<n>)`
7. Rodapé com timestamp de exportação

Formato limpo para LLMs consumirem como skill — sem URLs, sem marcadores ruidosos.

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
- Inputs de formulário têm `<label htmlFor="…">` associado
- Checkboxes do card "Tecnologias" usam `<input type="checkbox" sr-only>` com `<span aria-hidden>` visual + `aria-label` no input — preserva foco/navegação por teclado e leitores de tela

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

# 2. Variáveis de ambiente (raiz e api)
echo "PUBLIC_API_URL=http://localhost/api" > .env
cp api/.env.example api/.env
# editar GOOGLE_CLIENT_ID/SECRET + credenciais DB + FRONTEND_ORIGIN

# 3. Backend (schema canônico — schema.sql já inclui OAuth-only + technologies TEXT)
"C:\xampp\mysql\bin\mysql.exe" -uroot doclyflow < api/sql/schema.sql

# 4. Dev (dois terminais) ou XAMPP
php -S 127.0.0.1:8080 -t api/public         # API em :8080 (dev)
npm run dev                                 # frontend em :4321
# …ou deploy XAMPP (bin/deploy-xampp.bat) servindo tudo em :80
```

Mais detalhes: `deploy/README.md` (deploy XAMPP), `api/README.md` (backend detalhado).

---

## 12. Limitações Conhecidas

### Frontend
- **Token em localStorage**: vulnerável a XSS. Para produção, mover para cookie HttpOnly + CSRF protection ou refresh tokens curtos.
- **Cobertura de testes parcial**: suíte vitest cobre `pdfGenerator.ts` (6 testes, R7). Faltam: `store.ts`, `auth.ts`, `apiClient.ts`, `markdownGenerator.ts` e o hook `useDocumentTitle`.
- **PDF sem fontes custom** ou imagens (apenas Helvetica built-in); suficiente até ~30 requisitos por documento.

### Backend
- `DocumentsController::index` faz **N+1** queries — agrupar requirements via JOIN quando o volume crescer.
- Validação de ID token via `/tokeninfo` (chamada externa por login) — JWKS local é "próximo passo".
- Sem rate-limiting, sem logs estruturados.

### Domain
- **CSV em `documents.technologies` quebra com vírgulas** no nome livre do campo "Outra" (ex.: `"Vue.js, Next.js"` ficaria `"Foo"`, `" Next.js"` após decode). Aceito na simplificação — troca futura para `JSON` nativo.
- **Avatar sem `onError` fallback explícito** — se a URL do Google der 404, fica ícone de imagem quebrada. Trivial de adicionar via `useState` + `onError`.

---

## 13. Próximos Passos Sugeridos

1. **Validação JWKS local** — migrar `AuthController::google` para verificação via JWKS (`firebase/php-jwt` + JWKS do Google) eliminando a chamada de rede em todo login.
2. **Refresh tokens** — encurtar TTL padrão + endpoint `/api/auth/refresh` para rotação sem novo login Google.
3. **Resolver N+1 + testes** — `DocumentsController::index` em batch + PHPUnit cobrindo `AuthController` (Google tokeninfo verify / auto-register / 401) e `DocumentsController` (CRUD + isolamento por user_id + CSV round-trip); Vitest no frontend para `storage`, `apiClient`, `markdownGenerator`.
4. **Migrations versionadas** — adicionar Phinx ou Doctrine Migrations quando schema começar a evoluir.
5. **Cookie HttpOnly em vez de localStorage** — para tirar o vetor XSS, setar o token via `Set-Cookie` no response do login.
6. **Trocar `documents.technologies` de TEXT/CSV para JSON** — elimina o problema de vírgulas em nomes livres e abre porta para queries estruturadas.
7. **Templates de documento** — presets por categoria (e-commerce, RH, mobile) para acelerar criação.
8. **Import inteligente** — gerar requisitos a partir de texto/IA.

---

## 14. Comandos

### Full-stack (dev)
```bash
# Backend
php api/bin/migrate.php                # aplica schema (drop+create)
php -S 127.0.0.1:8080 -t api/public    # API em :8080

# Frontend (em outro terminal)
npm run dev                             # dev em http://localhost:4321
npm run check                           # astro check (typecheck)
npm run test                            # vitest run (uma vez)
npm run test:watch                      # vitest em watch mode
```

### Full-stack (XAMPP — recomendado para "abrir e usar")
```bat
:: dentro de C:\desenvolvimento\doclyflow\
bin\deploy-xampp.bat                    :: build + sync + smoke tests
:: abrir http://localhost/ e fazer login com Google
```

Primeiro login com sua conta Google — você será auto-registrado (vinculado por `google_sub`). Configure origens autorizadas no GCP Cloud Console (`http://localhost` + `http://127.0.0.1`).

---

## 15. Histórico de Mudanças Recentes

- **R8 — Seção 'Telas do sistema' com features reais + decoration pills contextual**:
  - **Features por card**: nova prop `features: string[]` no array `SCREENS` de `src/components/ScreensSection.astro` lista 4 bullets por card com copy atrelada à UI real do produto — sincronizado com `DashboardTable.tsx` (status tabs reais, busca textual, filtros por status), `RequirementsForm.tsx` (form dinâmico de requisitos + picker de stack + validação cliente), `DocumentView.tsx` (StatCards com totais, grupos funcionais/NF, chips de stack) e `pdfGenerator.ts` (capa estruturada, badges, paginação automática). Política do header do `SCREENS`: tanto `features` quanto `pillLabels` devem refletir comportamento/UI real, não copy de marketing genérico.
  - **Decoration pills contextual**: nova prop `pillLabels: string[]` por card renderizada como 3 status pills conectadas — replica EXATA dos badges reais do `DashboardTable.tsx` (tipografia `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1` + paleta `STATUS_STYLES` slate→blue→emerald). Apenas os labels mudam por card: `Rascunho · Em andamento · Concluído` (status tabs reais) · `Dados · Requisitos · Tecnologias` (3 sections do form — `Dados` genuinamente encurtado de "Dados do projeto"; demais verbatim) · `Total · Funcionais · Críticos` (3 dos 4 StatCards, omitindo "Não-funcionais" por restrição de 3 colunas) · `Capa · Resumo · Rodapé` (3 partes estruturais do PDF). Cores fixas por status garantem hierarquia visual consistente entre os 4 cards; só os textos são contextual.
  - **Layout polish da decoration**: pills alinhados à esquerda em flow normal (`flex gap-3 pt-4 px-4`, não mais `absolute inset-0 flex justify-center`); connector lines verticalmente centradas via `items-center` no flex container (sem isso, o conector de 2px ficava no topo do cross-axis enquanto as pills ~28px tomavam todo o espaço); conector `h-0.5` (2px) sobre `bg-slate-400` resolve subpixel em HiDPI e garante contraste mínimo sobre o `bg-slate-50/60` da outer. `aria-hidden="true"` no bloco decorativo (conteúdo já vive nos bullets da feature list — leitor de tela pula). `relative` removido do outer (dead code desde a saída do wrapper absoluto).
  - **`ScreenCard.astro`**: adicionado `w-full` na `<figure>` para preencher a coluna em todas as variações do zigzag.

- **R7 — PDF robusto, títulos dinâmicos, suíte de testes**:
  - `pdfGenerator.ts`: fix de overflow de texto nas margens da folha. `drawWrappedText` itera linha-a-linha com `ensureSpace` por linha (quebras mid-parágrafo + normalização CRLF→LF); a seção "Descrição" ganhou `ensureSpace` antes do título; `renderRequirement` usa `lineHeightFactor = 14/11` casado com `REQ_LINE_HEIGHT` para que o tracking de `y` bata com a altura renderizada pelo jsPDF — blocos não se sobrepõem mais.
  - **Títulos dinâmicos** via novo hook `src/react/hooks/useDocumentTitle.ts`. `DocumentView` mostra `documentos - <nome do projeto>` ao abrir um doc; `RequirementsForm` mostra `Editar/Novo: <nome> · Doclyflow` enquanto o usuário digita. O hook atualiza `<title>`, `meta[property="og:title"]` e `meta[name="twitter:title"]` em tempo real. O fallback estático emitido pelo `Layout.astro` continua aparecendo no frame de pré-hydration.
  - **Suíte de testes vitest** com 6 testes em `src/utils/pdfGenerator.test.ts` (sanity, descrição longa, requisitos longos, newlines manuais, integridade do buffer via `pdf-lib`). Configuração em `vitest.config.ts`. Scripts `test` + `test:watch` adicionados ao `package.json`. DevDeps: `vitest@^4.1.10`, `pdf-lib@^1.17.1`.
  - Bump de dependências: `astro@^7.0.6`, `@astrojs/node@^11.0.2`, `jspdf@^4.2.1`. O build segue 100% estático — o adapter `@astrojs/node` instalado permanece para completude de tipos do Astro, sem ser usado em runtime.

- **R6 — Simplificação da Stack Tecnológica**: Picker de stack reformulado como **lista fixa de 14 nomes** (React, Vue.js, Next.js, Tailwind CSS, Node.js, TypeScript, PHP, Python, MySQL, PostgreSQL, Redis, Docker, GitHub Actions, MongoDB) + checkbox "Outra (especificar)" que revela input de texto livre. Persistido como `string[]` em `documents.technologies TEXT` (CSV). Conteúdo da antiga migration `0004_documents_technologies_text.sql` consolidado em `schema.sql`. Rota `GET /api/technologies` removida. Arquivos `src/data/technologiesCatalog.ts`, migrations `0002_*`/`0003_*`/`0004_*.sql` e o script `migrate-oauth.php` apagados.

- **R6.1 — Sidebar sem botão redundante**: Removido o botão "+ Novo Documento" da `AppSidebar` (a CTA já vive no topo de `/painel/` via `DashboardTable`). Mantido o link "Documentos" + bloco de perfil + Sair.

- **R6.2 — Avatar do Google**: `HeaderUserMenu` e `AppSidebar` agora mostram `<img src={user.picture} referrerPolicy="no-referrer" />` quando o usuário tem foto no Google; caem para `<span>{initialsOf(user)}</span>` caso contrário.

- **R6.3 — Exportação Markdown**: Novo `src/utils/markdownGenerator.ts` com `generateDocumentMarkdown(doc)` + `downloadDocumentMarkdown(doc)`. Layout: `# título` + blockquote de metadados + `## Visão Geral` + `## Stack Tecnológica` (lista plana) + `## Requisitos` + subseções numeradas. Botão "Exportar MD" adicionado ao `DocumentView`.

- **R5 — Google OAuth + Painel (XAMPP-friendly)**:
  - Substituição completa da autenticação por Google Identity Services + verificação do ID token via `oauth2.googleapis.com/tokeninfo` (Google aud check, `exp`, `email_verified`).
  - Schema consolidado em `api/sql/schema.sql`: `users` recebe `google_sub VARCHAR(255) NOT NULL UNIQUE` + `picture VARCHAR(512) NULL`, perde `password_hash` (era o conteúdo da antiga `0001_oauth_columns.sql`, agora absorvido no arquivo canônico). DROP+CREATE idempotente — `bin/migrate.php` aplica em qualquer banco vazio com um único comando.
  - Sidebar/Header/form rebranded: "RequisitaApp" → **Doclyflow**; "Acessar Dashboard" → "Acessar Painel"; "Workspace" → "Painel".
  - **Rename de rota `/dashboard` → `/painel`** — XAMPP 8.x serve um Alias `/dashboard` que hijackeia e exibe o painel Phoenicium dele. Renomear a pasta + URL refs evita ter que mexer no Apache.
  - **Rota `/dashboard/[id]` (SSR) → `/painel/document` (estática com `?id=`)** — remove dependência efetiva do adapter `@astrojs/node`. Build volta a ser 100% estático.
  - `.gitignore` agora cobre `OAuth.md`, `api/.env` e `.env` da raiz — vazamentos de `client_secret` evitados a nível de repo.

- **R4 — Frontend ligado à API**: `src/data/api.ts` + `apiClient.ts` + `storage.ts`; `src/data/auth.ts` e `store.ts` reescritos como wrappers async do `apiClient`; 6 componentes React atualizados para async + loading/error states; `.env` com `PUBLIC_API_URL`; backend tweak no `DocumentsController::create` para aceitar `id` do cliente (regex + 409 em conflito).

- **R3 — Backend PHP/MySQL**: scaffold completo em `api/` com PHP vanilla 8.2, MySQL 8, tokens opacos SHA256, CORS, error handlers globais, CRUD de documentos + auth endpoints.

- **R2 — Header + Auth mock**: header simplificado para apenas Logo + Entrar (ou avatar+Sair quando logado). Sidebar sticky à esquerda. Mock auth via localStorage com cross-tab sync.

- **R1 — Bootstrap**: scaffold completo de Astro 5 + React 19 + Tailwind v4 + jsPDF conforme `doclyflow.md`.
