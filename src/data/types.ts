// Tipos do domínio do Doclyflow

export type RequirementType = 'functional' | 'non-functional';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';
export type DocumentStatus = 'draft' | 'in-progress' | 'completed';

export interface Requirement {
  id: string;
  type: RequirementType;
  description: string;
  priority: RequirementPriority;
}

export interface RequirementDocument {
  id: string;
  title: string;
  client: string;
  description: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  requirements: Requirement[];
  /**
   * Stack tecnológica escolhida pelo autor — apenas strings com os NOMES das
   * tecnologias (ex.: ["React", "TypeScript", "PostgreSQL"]). Sem catálogo,
   * sem ID — o usuário marca livremente os checkboxes do formulário e cada
   * nome é persistido como texto. Persistido em `documents.technologies`
   * (coluna TEXT) como CSV. `[]` ou ausente = sem stack.
   *
   * Inclui também o texto do checkbox "Outra" quando o usuário preenche o
   * input customizado; como é apenas uma string, vai no mesmo array.
   */
  technologies?: string[];
}

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Rascunho',
  'in-progress': 'Em andamento',
  completed: 'Concluído',
};

export const PRIORITY_LABEL: Record<RequirementPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const TYPE_LABEL: Record<RequirementType, string> = {
  functional: 'Funcional',
  'non-functional': 'Não-Funcional',
};
