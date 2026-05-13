export interface NvidiaNIMChoice {
  index: number;
  message?: { role: string; content: string };
  delta?: { content?: string };
  finish_reason?: string;
}

export interface NvidiaNIMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface NvidiaNIMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: NvidiaNIMChoice[];
  usage?: NvidiaNIMUsage;
}
