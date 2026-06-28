# Doclyflow

> **Levantamentos de requisitos que viram PDFs profissionais — direto do navegador, com a sua conta Google.**

Doclyflow é um aplicativo web para criar, organizar e exportar documentos de levantamento de requisitos em **PDF estruturado**, sem complicação. Tudo em nuvem: você escreve no navegador, vê o resultado renderizado em tempo real e baixa um PDF pronto pra compartilhar. Persistência em MySQL via API PHP, autenticação via **Google OAuth**.

---

## ✨ Funcionalidades

- **Login com Google** — sem senha pra lembrar, sem cadastro manual
- **Editor dinâmico de requisitos** — funcionais e não-funcionais, prioridade baixa → crítica
- **Filtros por status + busca textual** — encontre um documento em segundos
- **Sidebar de navegação** — Documentos / Novo Documento / perfil / logout
- **Exportação PDF profissional** — capa, badges de prioridade, agrupamento por tipo, paginação automática
- **Cross-tab sync** — abrir o painel em duas abas funciona como esperado

---

## 🚀 Quick start

```bash
# 1. Instalar dependências do frontend
npm install

# 2. Configurar a URL da API
echo "PUBLIC_API_URL=http://localhost/api" > .env

# 3. Configurar o backend (PHP + MySQL — XAMPP por exemplo)
cp api/.env.example api/.env            # editar GOOGLE_CLIENT_ID/SECRET + DB_*

# 4. Criar/atualizar schema (idempotente — dropa e recria)
"C:\xampp\mysql\bin\mysql.exe" -uroot doclyflow < api/sql/schema.sql
# ou: php api/bin/migrate.php

# 5. Subir tudo (variantes A ou B):

# A) Dev: dois terminais
php -S 127.0.0.1:8080 -t api/public    # API em :8080
npm run dev                            # frontend em :4321

# B) "Abrir e usar" via XAMPP: build + sync + smoke tests
bin\deploy-xampp.bat                   # frontend+API servidos pelo Apache em :80
```

Primeiro login = auto-registro (vinculado via `google_sub`). Configure as origens autorizadas no [GCP Cloud Console](https://console.cloud.google.com/apis/credentials): `http://localhost` e `http://127.0.0.1`.

Mais detalhes:
- Deploy XAMPP & smoke tests → [`deploy/README.md`](deploy/README.md)
- Backend PHP/MySQL & endpoints → [`api/README.md`](api/README.md)
- Arquitetura completa, modelo de dados, convenções → [`CONTEXT.md`](CONTEXT.md)
- Roadmap original → [`doclyflow.md`](doclyflow.md)

---

## 🛠️ Stack

| Camada                 | Tecnologia                         |
|------------------------|------------------------------------|
| Framework              | Astro 5 (100% static build)        |
| UI Islands             | React 19                           |
| Estilização            | Tailwind CSS v4 (via Vite plugin)  |
| Ícones                 | lucide-react                       |
| Geração de PDF         | jsPDF                              |
| Autenticação           | Google Identity Services (OAuth)   |
| Backend                | PHP 8.2 vanilla + MySQL 8          |

**Open Graph image (`public/og-image.png`)** — gerada via `npm run gen:og` (script em `scripts/generate-og-image.mjs` que usa `@resvg/resvg-js`, renderer WASM/NAPI sem dependências nativas). Roda automaticamente antes de `npm run build` (hook `prebuild`). Para rebranding, edite cores/texto no SVG inline do script e rode `npm run gen:og` — o PNG é commitado em `public/` e servido estático pelo Astro. Substitui o logo-doclyflow.svg nas tags `og:image`/`twitter:image` porque o Twitter/X rejeita SVG em `summary_large_image`.

---

## 🔐 Segurança

- O `client_secret` do Google vive em `OAuth.md` no root **apenas para conveniência dev local** — esse arquivo **nunca é commitado** (coberto por `.gitignore`).
- Em deploy/produção, use **env vars reais** + secret manager.
- Se houver qualquer suspeita de leak, rotacione o `client_secret` no GCP Cloud Console imediatamente.

---

## 🧭 Estrutura (resumo)

```
doclyflow/
├─ src/                     # Frontend Astro+React
│  ├─ pages/painel/         # /painel, /painel/novo, /painel/document
│  ├─ react/                # 6 ilhas: LoginForm, AppSidebar, DashboardTable, …
│  ├─ data/                 # apiClient + store + auth + types
│  ├─ layouts/, components/
│  ├─ styles/global.css     # tokens do tema (sem tailwind.config.js)
│  └─ utils/dates.ts, pdfGenerator.ts
├─ api/                     # Backend PHP/MySQL
│  ├─ public/index.php      # front controller
│  ├─ src/Controllers/      # Health, Auth (Google), Documents
│  ├─ sql/schema.sql        # bloco único paste-able
│  └─ bin/migrate.php       # aplica schema via shell
├─ deploy/                  # xampp vhost + script deploy-xampp.bat
├─ astro.config.mjs         # 100% estático, fail-fast em PUBLIC_API_URL ausente
├─ package.json
├─ .env (criar)             # PUBLIC_API_URL=http://localhost/api
└─ OAuth.md (NÃO comitar)   # credenciais Google p/ dev local
```

---

## 🧪 Smoke checks depois do deploy

| URL                                     | Esperado                                       |
|-----------------------------------------|------------------------------------------------|
| `http://localhost/api/health`           | `200 {"status":"ok"}`                          |
| `http://localhost/`                     | Landing page renderiza                         |
| `http://localhost/login/`               | Botão "Entrar com Google" visível              |
| `http://localhost/painel/`              | Redireciona para `/login?next=/painel/` se deslogado |
| `http://localhost/painel/novo/`         | Idem (deslogado → redireciona)                 |
| `http://localhost/painel/document?id=x` | Idem (deslogado → redireciona)                 |

---

## 📜 Licença

Privado — uso interno.
