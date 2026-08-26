/**
 * LabelOCRService
 * Usa Tesseract.js para reconhecer texto em fotos de etiquetas de entrega.
 * Funciona offline, sem necessidade de API key externa.
 *
 * Lazy-loaded: o worker Tesseract só é inicializado na primeira chamada.
 */

import { parseAnjunQR } from './anjunQrParser';
import type { ParsedAddress } from './anjunQrParser';

export interface OCRResult {
  raw: string;
  parsed: ParsedAddress | null;
  confidence: number; // 0-100
}

let workerReady = false;
let workerRef: any = null;

/**
 * Inicializa o worker Tesseract (lazy load)
 */
async function getWorker() {
  if (workerRef && workerReady) return workerRef;

  // Import dinâmico para não aumentar o bundle inicial
  const Tesseract = await import('tesseract.js');
  const worker = await Tesseract.createWorker('por+eng', 1, {
    logger: () => {}, // silenciar logs
  });

  workerRef = worker;
  workerReady = true;
  return worker;
}

/**
 * Extrai texto de uma imagem (File, Blob ou URL) usando OCR
 */
export async function extractTextFromImage(
  source: File | Blob | string
): Promise<OCRResult> {
  const worker = await getWorker();

  const {
    data: { text, confidence },
  } = await worker.recognize(source);

  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remover linhas com caracteres de lixo (menos de 3 chars ou só símbolos)
    .split('\n')
    .filter((line: string) => line.trim().length > 2)
    .join('\n');

  const parsed = parseOCRText(cleanText);

  return {
    raw: cleanText,
    parsed,
    confidence: Math.round(confidence),
  };
}

/**
 * Extrai dados estruturados de uma etiqueta Temu/Shein/Anjun a partir do texto OCR.
 * Cobre o formato impresso típico dessas etiquetas.
 */
export function parseOCRText(text: string): ParsedAddress | null {
  // Delegar primeiro ao parser do QR (que também aceita texto livre)
  const fromQR = parseAnjunQR(text);
  if (fromQR && fromQR.confidence >= 30) return fromQR;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const result: Partial<ParsedAddress> = { confidence: 0 };

  // === CEP ===
  for (const line of lines) {
    const cepMatch = line.match(/\b(\d{5})-?(\d{3})\b/);
    if (cepMatch) {
      result.zipCode = `${cepMatch[1]}-${cepMatch[2]}`;
      result.confidence = (result.confidence || 0) + 25;
      break;
    }
  }

  // === Estado (UF) ===
  const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  let ufLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    for (const state of states) {
      if (new RegExp(`\\b${state}\\b`).test(lines[i])) {
        result.state = state;
        ufLineIdx = i;
        result.confidence = (result.confidence || 0) + 10;
        break;
      }
    }
    if (result.state) break;
  }

  // === Cidade (linha com UF) ===
  if (ufLineIdx >= 0) {
    const cityLine = lines[ufLineIdx];
    const cityMatch = cityLine.match(/([A-Za-zÀ-ÿ\s]+?)(?:\s+SC|\s+SP|\s+RJ|\s+RS|\s+PR|\s+MG|\s+BA|\s+GO|\s+PE|\s+CE|,\s*\w{2})/i);
    if (cityMatch) {
      result.city = cityMatch[1].trim();
      result.confidence = (result.confidence || 0) + 10;
    }
  }

  // === Linha de endereço completa (CEP + cidade) ou só endereço ===
  // Formato Temu: "88063-000 Florianópolis SC BRAZIL"
  //               "Servidao aguia dourada 61 Casa 2 Av Pequeno Príncipe Campeche"
  for (const line of lines) {
    if (/^(rua|r\.|av|avenida|servidao|servidão|travessa|rod|rodovia|est|estrada|alameda|sd|serv)/i.test(line)) {
      // Extrair número
      const numMatch = line.match(/\b(\d{1,5})\b/);
      if (numMatch && !result.number) {
        result.number = numMatch[1];
        result.confidence = (result.confidence || 0) + 10;
      }

      // Extrair rua (sem número e complemento)
      let street = line
        .replace(/\b\d{1,5}\b/, '')
        .replace(/\b(casa|apto|ap|bl|bloco|lote|fundos)\s*\w*/gi, '')
        .trim();
      result.street = street;
      result.confidence = (result.confidence || 0) + 20;

      // Complemento
      const compMatch = line.match(/\b(casa\s*\d+|apto\s*\d+|ap\s*\d+|bl\s*\w+|bloco\s*\w+|fundos|kit\s*net|kitnet)\b/i);
      if (compMatch) result.complement = compMatch[0].trim();
      break;
    }
  }

  // === Destinatário ===
  // Linha APÓS "DESTINATÁRIO" label, ou primeira linha que parece nome
  let destNext = false;
  for (const line of lines) {
    if (/^destinat[aá]rio/i.test(line)) {
      destNext = true;
      continue;
    }
    if (destNext) {
      if (line.length > 3 && /[A-Za-zÀ-ÿ]/.test(line) && !/^\d/.test(line)) {
        result.recipientName = line.trim();
        result.confidence = (result.confidence || 0) + 20;
        break;
      }
    }
  }

  // Fallback destinatário: primeira linha que parece nome próprio
  if (!result.recipientName) {
    for (const line of lines) {
      if (
        /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][a-záéíóúâêîôûãõàç]+ [A-ZÁÉÍÓÚ][a-záéíóú]+/.test(line) &&
        line.split(' ').length >= 2 &&
        line.split(' ').length <= 5 &&
        !/\d{5}/.test(line) &&
        !/^(rua|av|serv|rod)/i.test(line)
      ) {
        result.recipientName = line.trim();
        result.confidence = (result.confidence || 0) + 15;
        break;
      }
    }
  }

  result.complement = result.complement || '';
  result.neighborhood = result.neighborhood || '';
  result.city = result.city || 'Florianópolis';
  result.state = result.state || 'SC';

  if ((result.confidence || 0) < 25) return null;
  return result as ParsedAddress;
}

/**
 * Captura uma foto da câmera e retorna como Blob
 */
export async function captureFromCamera(
  videoElement: HTMLVideoElement
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(videoElement, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao capturar imagem da câmera'));
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Libera o worker Tesseract (chamar ao desmontar o componente)
 */
export async function terminateOCRWorker() {
  if (workerRef) {
    await workerRef.terminate();
    workerRef = null;
    workerReady = false;
  }
}
