import type { ParsedAddress } from './anjunQrParser';
import { api } from '../lib/api';
import { shouldUseAIResult, type AIPartialAddress } from './aiVisionEligibility';

type AIAddressResponse = Partial<ParsedAddress> & AIPartialAddress;

export interface VisionExtractionResult {
  address: ParsedAddress | null;
  error?: string;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível preparar a foto para leitura por IA.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export { shouldUseAIResult } from './aiVisionEligibility';

/**
 * Uses the server-side AI endpoint. If unavailable, callers fall back to the
 * local OCR without exposing an API key in the browser.
 */
export async function extractAddressWithAI(blob: Blob): Promise<VisionExtractionResult> {
  try {
    const imageDataUrl = await blobToDataUrl(blob);
    const { data } = await api.post('/vision/extract-address', { imageDataUrl });
    const address = data?.address as AIAddressResponse | null;
    if (!data?.available || !shouldUseAIResult(address)) {
      return { address: null, error: typeof data?.error === 'string' ? data.error : undefined };
    }

    return {
      address: {
        recipientName: address.recipientName || '',
        zipCode: address.zipCode || '',
        street: address.street || '',
        number: address.number || '',
        complement: address.complement || '',
        neighborhood: address.neighborhood || '',
        city: address.city || '',
        state: address.state || '',
        confidence: address.confidence || 0,
      },
    };
  } catch (requestError) {
    const error = requestError as { response?: { data?: { error?: unknown } } };
    return {
      address: null,
      error: typeof error.response?.data?.error === 'string' ? error.response.data.error : undefined,
    };
  }
}
