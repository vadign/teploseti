export type District = 'Советский' | 'Октябрьский' | 'Кольцово';

export type NodeType = 'source' | 'junction' | 'heat_substation';

export interface NetNode {
  id: string;
  name: string;
  type: NodeType;
  address?: string;
  district: District;
  x: number;
  y: number;
}

export interface NetEdgePlan {
  diameter_mm: number;
  flow_kg_s_plan: number;
  pressure_bar_plan: number;
  temp_c_plan_min?: number;
  temp_c_plan_max?: number;
}

export interface NetEdge {
  id: string;
  from: string;
  to: string;
  directed: boolean;
  plan: NetEdgePlan;
}

export type EventType =
  | 'pressure_low'
  | 'pressure_high'
  | 'temperature_low'
  | 'temperature_high'
  | 'leak_suspected'
  | 'data_completeness';

export type Severity = 'info' | 'warning' | 'critical';

export interface RegulationRef {
  id: string;
  title: string;
  reference?: string;
}

export interface RuleRef {
  id: string;
  regulationId: string;
  version: string;
}

export interface DeviationEvent {
  id: string;
  objectType: 'node' | 'edge';
  objectId: string;
  type: EventType;
  severity: Severity;
  timestamp: string;
  measuredValue?: number;
  expectedMin?: number;
  expectedMax?: number;
  rule: RuleRef;
  sourceSystem?: string;
  comment?: string;
}

export interface DigitalTwin {
  id: string;
  name: string;
  type: NodeType;
  address?: string;
  district: District;
  eventsCount: {
    info: number;
    warning: number;
    critical: number;
    total: number;
  };
  completenessPct: number;
  regulations: RegulationRef[];
  sources: string[];
}

export type EdgeStatus = Severity | 'ok';
