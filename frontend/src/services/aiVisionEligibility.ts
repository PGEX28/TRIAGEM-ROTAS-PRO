export interface AIPartialAddress {
  recipientName?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  confidence?: number;
}

export function shouldUseAIResult(result: AIPartialAddress | null): result is AIPartialAddress {
  if (!result || (result.confidence || 0) < 60) return false;
  return Boolean(result.zipCode || (result.street && result.number));
}

export function formatVisionFallbackStatus(reason?: string): string {
  return `${reason || 'IA indisponível ou leitura inconclusiva.'} Tentando OCR local...`;
}
