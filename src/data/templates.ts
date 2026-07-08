// =============================================================================
// Doclyflow — templates de documento prontos
// =============================================================================
// Quatro modelos que aparecem no topo do formulário "Novo documento" como
// cards clicáveis. Cada template pré-popula título, descrição de contexto,
// status, requisitos (funcionais + não-funcionais) e stack tecnológica.
//
// Quando o usuário clica em um card, o `RequirementsForm` gera IDs novos
// para cada requisito (evita colisão se o mesmo template for aplicado
// várias vezes) e separa as tecnologias do catálogo (vão para os
// checkboxes) das customizadas (caem no campo "Outra (especificar)").
// =============================================================================

import type { RequirementPriority, RequirementType } from './types';

/** Requisito pré-preenchido em um template (sem `id` — gerado na aplicação). */
export interface TemplateRequirement {
  type: RequirementType;
  priority: RequirementPriority;
  description: string;
}

/** Lista de ícones lucide-react referenciados pelos templates. */
export type TemplateIconName =
  | 'ShoppingCart'
  | 'Users'
  | 'Briefcase'
  | 'Rocket';

export interface DocTemplate {
  /** slug kebab-case, identifica o template na UI. */
  id: string;
  /** Nome exibido no card. */
  name: string;
  /** Descrição curta (1-2 frases) exibida no card. */
  description: string;
  /** Classes Tailwind para o badge do ícone (bg + text). */
  accent: string;
  /** Nome do ícone lucide-react a renderizar no card. */
  icon: TemplateIconName;
  /** Título pré-preenchido no formulário. */
  title: string;
  /** Parágrafo de contexto pré-preenchido no campo descrição. */
  context: string;
  /** Requisitos (RF e RNF) que virão prontos. */
  requirements: TemplateRequirement[];
  /** Nomes de tecnologias pré-marcadas. Devem bater com o `TECH_CATALOG`
   *  do `RequirementsForm`; o que não bater vai para o campo "Outra". */
  technologies: string[];
}

export const TEMPLATES: DocTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description:
      'Catálogo, carrinho, checkout e gestão de pedidos para venda de produtos online.',
    accent: 'bg-blue-50 text-blue-600',
    icon: 'ShoppingCart',
    title: 'Sistema de E-commerce',
    context:
      'Plataforma de comércio eletrônico para venda de produtos online. ' +
      'Deve cobrir a jornada completa do cliente — desde a descoberta do ' +
      'produto no catálogo até a entrega — incluindo gestão de pedidos ' +
      'pelo painel administrativo.',
    requirements: [
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de produtos com nome, descrição, preço, fotos e categorias.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve exibir catálogo de produtos com filtros por categoria, faixa de preço e ordenação.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir adicionar produtos ao carrinho, alterar quantidades e remover itens.',
      },
      {
        type: 'functional',
        priority: 'critical',
        description:
          'O sistema deve oferecer fluxo de checkout com cálculo de frete, escolha de pagamento e confirmação do pedido.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de clientes com e-mail, senha e dados de entrega.',
      },
      {
        type: 'functional',
        priority: 'medium',
        description:
          'O sistema deve enviar e-mail de confirmação de pedido e atualização de status de envio.',
      },
      {
        type: 'non-functional',
        priority: 'high',
        description:
          'O sistema deve carregar a página inicial em menos de 2 segundos em conexão 3G.',
      },
      {
        type: 'non-functional',
        priority: 'critical',
        description:
          'O sistema deve estar em conformidade com a LGPD para tratamento de dados pessoais.',
      },
      {
        type: 'non-functional',
        priority: 'critical',
        description:
          'O sistema deve seguir o padrão PCI-DSS para processamento de pagamentos com cartão.',
      },
    ],
    technologies: ['React', 'Node.js', 'MySQL', 'Docker'],
  },
  {
    id: 'crm',
    name: 'CRM',
    description:
      'Gestão de leads, contatos, pipeline de vendas e atividades de relacionamento.',
    accent: 'bg-violet-50 text-violet-600',
    icon: 'Users',
    title: 'Sistema CRM',
    context:
      'Customer Relationship Management (CRM) para a equipe comercial. ' +
      'Centraliza leads, contatos e oportunidades em um pipeline de ' +
      'vendas, com histórico de interações e relatórios de conversão.',
    requirements: [
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de leads com nome, e-mail, telefone, empresa e origem.',
      },
      {
        type: 'functional',
        priority: 'critical',
        description:
          'O sistema deve gerenciar pipeline de vendas com etapas configuráveis (Lead, Qualificado, Proposta, Fechado).',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir registro de atividades (ligações, e-mails, reuniões) vinculadas a contatos e oportunidades.',
      },
      {
        type: 'functional',
        priority: 'medium',
        description:
          'O sistema deve oferecer relatórios de conversão por etapa e por período.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de contatos e empresas com histórico de interações.',
      },
      {
        type: 'non-functional',
        priority: 'medium',
        description:
          'O sistema deve integrar com Gmail e Outlook para sincronizar e-mails enviados e recebidos.',
      },
      {
        type: 'non-functional',
        priority: 'high',
        description:
          'O sistema deve ter controle de permissões por papel (admin, gerente, vendedor).',
      },
    ],
    technologies: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
  },
  {
    id: 'erp',
    name: 'ERP',
    description:
      'Estoque, vendas, compras, financeiro e relatórios gerenciais integrados.',
    accent: 'bg-amber-50 text-amber-600',
    icon: 'Briefcase',
    title: 'Sistema ERP',
    context:
      'Enterprise Resource Planning (ERP) para gestão integrada de ' +
      'operações. Cobre módulos financeiro, estoque, compras, vendas, ' +
      'cadastros e relatórios gerenciais em uma única plataforma.',
    requirements: [
      {
        type: 'functional',
        priority: 'critical',
        description:
          'O sistema deve oferecer módulo financeiro com controle de contas a pagar e a receber, fluxo de caixa e conciliação bancária.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve oferecer módulo de estoque com entradas, saídas, transferências entre filiais e inventário.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve oferecer módulo de compras com pedidos, cotações e cadastro de fornecedores.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve oferecer módulo de vendas com orçamentos, pedidos e emissão de NF-e.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de produtos com código, descrição, unidade de medida, NCM e tributação.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'O sistema deve permitir cadastro de clientes e fornecedores com dados fiscais completos.',
      },
      {
        type: 'functional',
        priority: 'medium',
        description:
          'O sistema deve oferecer relatórios gerenciais como DRE, balanço e fluxo de caixa projetado.',
      },
      {
        type: 'non-functional',
        priority: 'critical',
        description:
          'O sistema deve ser multi-empresa e multi-filial, com isolamento de dados por empresa.',
      },
      {
        type: 'non-functional',
        priority: 'high',
        description:
          'O sistema deve manter log de auditoria de todas as alterações críticas.',
      },
    ],
    technologies: ['React', 'TypeScript', 'PostgreSQL', 'Docker'],
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description:
      'Hero, features, depoimentos, pricing, FAQ e captura de leads para marketing.',
    accent: 'bg-emerald-50 text-emerald-600',
    icon: 'Rocket',
    title: 'Landing Page',
    context:
      'Página de apresentação (landing page) para campanhas de marketing ' +
      'digital. Foco em conversão: comunica valor rapidamente, gera ' +
      'confiança com prova social e captura leads para o time comercial.',
    requirements: [
      {
        type: 'functional',
        priority: 'critical',
        description:
          'A página deve ter seção hero com título, subtítulo e CTA principal.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'A página deve ter seção de features destacando 3-6 benefícios do produto/serviço.',
      },
      {
        type: 'functional',
        priority: 'high',
        description:
          'A página deve ter seção de depoimentos de clientes com foto, nome e empresa.',
      },
      {
        type: 'functional',
        priority: 'medium',
        description:
          'A página deve ter seção de pricing com 2-3 planos e comparação de funcionalidades.',
      },
      {
        type: 'functional',
        priority: 'medium',
        description:
          'A página deve ter seção de FAQ com perguntas frequentes em formato accordion.',
      },
      {
        type: 'functional',
        priority: 'critical',
        description:
          'A página deve ter formulário de contato / captura de lead integrado com CRM.',
      },
      {
        type: 'functional',
        priority: 'low',
        description:
          'A página deve ter footer com links institucionais e ícones de redes sociais.',
      },
      {
        type: 'non-functional',
        priority: 'high',
        description:
          'A página deve ser totalmente responsiva (mobile, tablet, desktop) com design mobile-first.',
      },
      {
        type: 'non-functional',
        priority: 'high',
        description:
          'A página deve seguir boas práticas de SEO: meta tags, Open Graph, sitemap e structured data.',
      },
      {
        type: 'non-functional',
        priority: 'medium',
        description:
          'A página deve atingir boas métricas de Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms).',
      },
    ],
    technologies: ['React', 'Tailwind CSS', 'TypeScript'],
  },
];

/** Busca um template pelo id. Retorna `undefined` se não existir. */
export function getTemplate(id: string): DocTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
