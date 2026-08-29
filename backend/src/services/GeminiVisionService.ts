import type { DeliveryAddressAIResult } from './AIVisionService';

interface GeminiVisionConfig {
  apiKey: string;
  model?: string;
}

type FetchLike = typeof fetch;

const extractionPrompt = `Leia somente o endereço de ENTREGA presente nesta etiqueta logística brasileira.
Ignore remetente, valores, códigos de rota, códigos de barras, QR Code e instruções de devolução.
Não invente dados: retorne string vazia quando um campo não estiver legível.
Responda apenas um JSON com recipientName, zipCode, street, number, complement, neighborhood, city, state e confidence.
Normalize CEP como 00000-000 e UF com duas letras maiúsculas.`;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeResult(value: Record<string, unknown>): DeliveryAddressAIResult {
  const zipDigits = stringValue(value.zipCode).replace(/\D/g, '');
  const confidence = Number(value.confidence);

  return {
    recipientName: stringValue(value.recipientName),
    zipCode: zipDigits.length === 8 ? `${zipDigits.slice(0, 5)}-${zipDigits.slice(5)}` : stringValue(value.zipCode),
    street: stringValue(value.street),
    number: stringValue(value.number),
    complement: stringValue(value.complement),
    neighborhood: stringValue(value.neighborhood),
    city: stringValue(value.city),
    state: stringValue(value.state).toUpperCase().slice(0, 2),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
  };
}

function splitImageDataUrl(imageDataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageDataUrl);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

/**
 * Extracts delivery address fields using the Gemini API. The key remains on
 * the server and can use Gemini's free test quota when it is available.
 */
export async function extractAddressWithGemini(
  imageDataUrl: string,
  config: GeminiVisionConfig = { apiKey: process.env.GEMINI_API_KEY || '', model: process.env.GEMINI_MODEL },
  fetchImpl: FetchLike = fetch,
): Promise<DeliveryAddressAIResult | null> {
  const image = splitImageDataUrl(imageDataUrl);
  if (!config.apiKey || !image) return null;

  const model = config.model || 'gemini-2.5-flash';
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: extractionPrompt },
            { inline_data: { mime_type: image.mimeType, data: image.data } },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Falha no Gemini (HTTP ${response.status})`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
  if (typeof text !== 'string' || !text.trim()) return null;

  try {
    return normalizeResult(JSON.parse(text) as Record<string, unknown>);
  } catch {
    throw new Error('O Gemini retornou uma resposta inválida para a etiqueta');
  }
}
