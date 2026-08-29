export interface DeliveryAddressAIResult {
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  confidence: number;
}

interface AIVisionConfig {
  apiKey: string;
  model?: string;
}

type FetchLike = typeof fetch;

const addressSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recipientName', 'zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'confidence'],
  properties: {
    recipientName: { type: 'string' },
    zipCode: { type: 'string' },
    street: { type: 'string' },
    number: { type: 'string' },
    complement: { type: 'string' },
    neighborhood: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
  },
};

const extractionPrompt = `Leia somente o endereço de ENTREGA presente nesta etiqueta logística brasileira.
Ignore remetente, valores, códigos de rota, códigos de barras, QR Code e instruções de devolução.
Não invente dados: retorne string vazia quando um campo não estiver legível.
Normalize CEP como 00000-000 e UF com duas letras maiúsculas.
confidence deve refletir a confiabilidade da leitura dos dados de entrega.`;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeZipCode(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value;
}

function normalizeResult(value: Record<string, unknown>): DeliveryAddressAIResult {
  const confidence = Number(value.confidence);
  return {
    recipientName: stringValue(value.recipientName),
    zipCode: normalizeZipCode(stringValue(value.zipCode)),
    street: stringValue(value.street),
    number: stringValue(value.number),
    complement: stringValue(value.complement),
    neighborhood: stringValue(value.neighborhood),
    city: stringValue(value.city),
    state: stringValue(value.state).toUpperCase().slice(0, 2),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
  };
}

/**
 * Extracts delivery fields from a label image through the OpenAI Responses API.
 * The API key stays on the server; callers only send the image data URL.
 */
export async function extractAddressWithAI(
  imageDataUrl: string,
  config: AIVisionConfig = { apiKey: process.env.OPENAI_API_KEY || '', model: process.env.OPENAI_MODEL },
  fetchImpl: FetchLike = fetch,
): Promise<DeliveryAddressAIResult | null> {
  if (!config.apiKey || !imageDataUrl.startsWith('data:image/')) return null;

  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      store: false,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: extractionPrompt },
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
        ],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'delivery_address',
          strict: true,
          schema: addressSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha no OCR por IA (HTTP ${response.status})`);
  }

  const data = await response.json() as { output_text?: string };
  if (!data.output_text) return null;

  try {
    return normalizeResult(JSON.parse(data.output_text) as Record<string, unknown>);
  } catch {
    throw new Error('A IA retornou uma resposta inválida para a etiqueta');
  }
}
