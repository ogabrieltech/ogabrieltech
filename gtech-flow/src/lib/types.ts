export type LeadStatus = "Novo" | "Direcionado" | "Em atendimento" | "Concluído";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  interest: string;
  destination: string;
  status: LeadStatus;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  department: string;
  phone: string;
  active: boolean;
};

export type FlowStepType = "message" | "menu" | "question" | "redirect" | "hours" | "link" | "finish";

export type FlowStep = {
  id: string;
  type: FlowStepType;
  title: string;
  description: string;
};
