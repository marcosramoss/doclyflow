# Plano de Desenvolvimento: Doclify (Gerador de Levantamento de Requisitos)

Este documento estabelece o cronograma, a arquitetura e os passos de implementação para o aplicativo web de geração e exportação de levantamentos de requisitos em PDF.

---

## 🛠️ Stack Tecnológica

* **Framework Principal:** Astro (última versão, focado em performance)
* **Biblioteca de UI:** React (última versão, via integração do Astro para as ilhas interativas)
* **Estilização:** Tailwind CSS v4 (estilização moderna e utilitária)
* **Ícones:** Lucide React (ícones limpos e consistentes)
* **Geração de PDF:** jsPDF (geração client-side estruturada)

---

## 📐 Arquitetura de Pastas Sugerida

Para manter o projeto Astro + React organizado (usando a abordagem de ilhas de interatividade):

```text
src/
├── components/          # Componentes globais Astro / UI estática
│   └── ui/              # Botões, inputs e tabelas genéricas
├── layouts/             # Layout base (Layout.astro)
├── pages/               # Roteamento baseado em arquivos (Astro)
│   ├── index.astro      # Landing Page
│   └── dashboard/
│       ├── index.astro  # Aba: Todos os Documentos (Tabela)
│       ├── novo.astro   # Aba: Criar Documento (Formulário)
│       └── [id].astro   # Tela do Documento Individual (Visualização)
├── react/               # Componentes interativos em React
│   ├── DashboardTable.tsx
│   ├── RequirementsForm.tsx
│   └── DocumentView.tsx
└── utils/               # Helpers e lógica do jsPDF
    └── pdfGenerator.ts