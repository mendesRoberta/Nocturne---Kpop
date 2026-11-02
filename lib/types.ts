export interface GroundingSource {
  title: string;
  url: string;
}

export interface BiasDetails {
  id: string;
  name: string;
  image: string;
  fullName?: string;
  group?: string;
  age?: number;
  trendingSong?: string;
  position?: string;
  agency?: string;
  bioSummary?: string;
  sources?: GroundingSource[];
}

export interface BiasValidationResponse {
  isKpopIdol: boolean;
  stageName?: string;
  fullName?: string;
  group?: string;
  age?: number;
  trendingSong?: string;
  position?: string;
  agency?: string;
  bioSummary?: string;
  errorMsg?: string;
  telemetry?: {
    model: string;
    latencyMs: number;
    grounded: boolean;
    sources: GroundingSource[];
    interactionId?: string;
  };
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughtSummary?: string;
  sources?: GroundingSource[];
  model?: string;
  grounded?: boolean;
  latencyMs?: number;
  totalTokens?: number;
  createdAt: string;
}
