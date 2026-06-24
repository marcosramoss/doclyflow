// Tipos do domínio do RequisitaApp

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
