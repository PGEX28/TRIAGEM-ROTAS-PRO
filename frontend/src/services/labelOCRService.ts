/**
 * LabelOCRService
 * Usa Tesseract.js para reconhecer texto em fotos de etiquetas Anjun/Shein/Temu.
 *
 * Estratégia de extração:
 * 1. Pré-processa a imagem (escala de cinza + contraste alto) para melhorar OCR
 * 2. Localiza o bloco "DESTINATÁRIO" como âncora
 * 3. Lê APENAS as linhas entre "DESTINATÁRIO" e a próxima seção (REMETENTE, DEVOLUÇÃO, etc.)
 * 4. Aplica parser específico para os formatos Shein e Temu
 */

import type { ParsedAddress } from './anjunQrParser';

export interface OCRResult {
  raw: string;
  destinatarioBlock: string;
  parsed: ParsedAddress | null;
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────
// Pré-processamento de imagem
// ─────────────────────────────────────────────────────────────────

/**
 * Converte imagem para escala de cinza de alto contraste.
 * Isso melhora drasticamente a leitura do OCR em etiquetas impressas.
 */
export function preprocessImageForOCR(source: HTMLCanvasElement | HTMLVideoElement): Blob {
  const canvas = document.createElement('canvas');
  const isVideo = source instanceof HTMLVideoElement;
  canvas.width = isVideo ? source.videoWidth : source.width;
  canvas.height = isVideo ? source.videoHeight : source.height;

  const ctx = canvas.getContext('2d')!;

  // Fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenhar fonte
  ctx.drawImage(source as any, 0, 0, canvas.width, canvas.height);

  // Converter para escala de cinza de alto contraste
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Luminância
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Threshold binário (>128 = branco, <=128 = preto) para máximo contraste
    const bin = lum > 140 ? 255 : 0;
    data[i] = bin;
    data[i + 1] = bin;
    data[i + 2] = bin;
  }

  ctx.putImageData(imageData, 0, 0);

  // Retornar como blob (sincrono via dataURL)
  const dataURL = canvas.toDataURL('image/png');
  return dataURLtoBlob(dataURL);
}

function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// ─────────────────────────────────────────────────────────────────
// Captura da câmera
// ─────────────────────────────────────────────────────────────────

export function captureFromCamera(videoElement: HTMLVideoElement): Blob {
  return preprocessImageForOCR(videoElement);
}

// ─────────────────────────────────────────────────────────────────
// OCR principal
// ─────────────────────────────────────────────────────────────────

let workerRef: any = null;

async function getWorker() {
  if (workerRef) return workerRef;
  const Tesseract = await import('tesseract.js');
  // Apenas português + inglês, sem dados desnecessários
  workerRef = await Tesseract.createWorker('por+eng', 1, {
    logger: () => {},
  });
  return workerRef;
}

export async function extractTextFromImage(source: Blob | File | string): Promise<OCRResult> {
  const worker = await getWorker();

  const { data } = await worker.recognize(source);
  const rawText = data.text;

  // Extrair apenas o bloco do destinatário
  const destinatarioBlock = extractDestinatarioBlock(rawText);

  // Parsear o bloco
  const parsed = parseDestinatarioBlock(destinatarioBlock || rawText);

  return {
    raw: rawText,
    destinatarioBlock: destinatarioBlock || '',
    parsed,
    confidence: Math.round(data.confidence),
  };
}

// ─────────────────────────────────────────────────────────────────
// Extração do bloco DESTINATÁRIO
// ─────────────────────────────────────────────────────────────────

/**
 * Localiza o bloco "DESTINATÁRIO" na saída do OCR e retorna
 * apenas as linhas entre essa âncora e a próxima seção da etiqueta.
 *
 * Âncoras de fim de bloco (seções que NÃO são do destinatário):
 * - REMETENTE, DEVOLUÇÃO, Instrução, Declaração, Data de publicação, etc.
 */
function extractDestinatarioBlock(rawText: string): string | null {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim());

  // Encontrar a linha que contém "DESTINATÁRIO" (pode estar parcialmente lida)
  const destPatterns = [
    /DESTINAT[AÁ]RIO/i,
    /DESTINA\s*T[AÁ]/i,
    /DESTIN[AÁ]/i,
  ];

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (destPatterns.some(p => p.test(lines[i]))) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  // Padrões que marcam o FIM do bloco do destinatário
  const endPatterns = [
    /REMETENTE/i,
    /DEVOLU[CÇ][AÃ]O/i,
    /instru[cç][aã]o/i,
    /Declara[cç][aã]o/i,
    /Data de publica/i,
    /Emiss[aã]o/i,
    /Assinatura/i,
    /Recebedor/i,
    /SC-W-H001/i,  // código de warehouse (cabeçalho)
    /AJ\d{15,}/i,  // código de barras Anjun
    /GUARULHOS/i,
    /China/i,
    /FRETE/i,
    /Seguro/i,
    /Total BRL/i,
  ];

  // Também parar quando há muitas linhas sem conteúdo relevante
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endPatterns.some(p => p.test(lines[i]))) {
      endIdx = i;
      break;
    }
  }

  const block = lines
    .slice(startIdx + 1, endIdx) // linhas APÓS "DESTINATÁRIO"
    .filter(l => l.length > 1)
    .join('\n');

  return block || null;
}

// ─────────────────────────────────────────────────────────────────
// Parser do bloco do destinatário
// ─────────────────────────────────────────────────────────────────

const SKIP_PATTERNS = [
  /^SC-W-[AH]\d+/i,         // SC-W-A001, SC-W-H001
  /^BG-\d+/i,               // pedido Temu BG-xxx
  /^Pedido[:\s]/i,           // "Pedido: BG-xxx"
  /^\d{4,}\*+$/,             // telefone mascarado 5199255****
  /^CN$/i,                   // indicador de país
  /^880$/,                   // código de rota Anjun
  /^\d{3,4}$/,               // códigos numéricos curtos
  /^PRC$/i,                  // serviço
  /SC\/\d+/i,                // SC/1115
  /^[A-Z]{2}-[A-Z]-[AH]\d+/i, // padrões de código
];

function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(line.trim()));
}

/**
 * Extrai CEP de uma linha de texto
 */
function extractCEP(text: string): string | null {
  const m = text.match(/\b(\d{5})-?(\d{3})\b/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/**
 * Verifica se uma linha contém uma UF brasileira de forma confiável
 */
function extractUF(text: string): string | null {
  const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  for (const s of states) {
    // Exige que a UF esteja delimitada por espaço, /, vírgula ou fim de string
    if (new RegExp(`(?:^|[\\s/,])${s}(?:[\\s/,]|$)`).test(text)) return s;
  }
  return null;
}

/**
 * Verifica se uma linha parece ser um nome próprio brasileiro
 */
function looksLikePersonName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 6) return false;
  // Cada palavra começa com maiúscula e tem pelo menos 2 letras
  const isCapWord = (w: string) => /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][a-záéíóúâêîôûãõàç]{1,}$/.test(w);
  const capitalCount = words.filter(isCapWord).length;
  // Pelo menos metade das palavras são capitalizadas
  return capitalCount >= Math.ceil(words.length / 2);
}

/**
 * Verifica se uma linha parece ser um logradouro
 */
function looksLikeStreet(line: string): boolean {
  return /^(rua|r\.|av\.|avenida|servidao|servidão|travessa|rod\.|rodovia|estrada|alameda|serv\.|sd\.)/i.test(line.trim());
}

/**
 * Parser principal do bloco do destinatário.
 * Funciona sem labels ("Destinatário:", "CEP:", etc.) — deduz os campos
 * pela posição, formato e conteúdo de cada linha.
 */
export function parseDestinatarioBlock(block: string): ParsedAddress | null {
  const lines = block
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1 && !shouldSkipLine(l));

  if (lines.length === 0) return null;

  const result: Partial<ParsedAddress> = {
    confidence: 0,
    complement: '',
    neighborhood: '',
    city: 'Florianópolis',
    state: 'SC',
  };

  let usedIndices = new Set<number>();

  // === 1. CEP ===
  for (let i = 0; i < lines.length; i++) {
    const cep = extractCEP(lines[i]);
    if (cep) {
      result.zipCode = cep;
      result.confidence = (result.confidence || 0) + 25;
      // Se o CEP está em uma linha com a cidade (ex: "88063-000  Florianópolis SC BRAZIL")
      const cityLine = lines[i];
      const uf = extractUF(cityLine);
      if (uf) {
        result.state = uf;
        const cityMatch = cityLine.match(/\b([A-Za-zÀ-ÿ\s]+?)\s+(?:SC|SP|RJ|RS|PR|MG|BA|GO|PE|CE|DF)\b/i);
        if (cityMatch) {
          const city = cityMatch[1].replace(/\d{5}-?\d{3}/, '').trim();
          if (city.length > 2) result.city = city;
        }
        result.confidence = (result.confidence || 0) + 15;
      }
      usedIndices.add(i);
      break;
    }
  }

  // === 2. Linha Cidade/UF separada (ex: "Florianópolis/SC" ou "Florianópolis SC") ===
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue;
    const uf = extractUF(lines[i]);
    if (!uf) continue;

    // Só considera se não for a linha do CEP com cidade já processada
    result.state = uf;

    // Extrair cidade antes da UF
    const m = lines[i].match(/^([A-Za-zÀ-ÿ\s]+?)\s*[/,\s]\s*(?:SC|SP|RJ|RS|PR|MG|BA|GO|PE|CE|DF)/i);
    if (m) {
      const city = m[1].replace(/BRAZIL/gi, '').trim();
      if (city.length > 2) {
        result.city = city;
        result.confidence = (result.confidence || 0) + 10;
      }
    }

    usedIndices.add(i);
    result.confidence = (result.confidence || 0) + 10;
    break;
  }

  // === 3. Rua/Logradouro ===
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue;
    if (looksLikeStreet(lines[i])) {
      const streetLine = lines[i];

      // Separar o número da rua se estiver na mesma linha
      const numInLine = streetLine.match(/\b(\d{1,5})\b/);
      if (numInLine && !result.number) {
        result.number = numInLine[1];
        result.confidence = (result.confidence || 0) + 5;
      }

      // Separar complemento (casa, apto, bloco, prédio, fundos, etc.)
      const compMatch = streetLine.match(/\b(pr[eé]dio\s+\w+|casa\s*\d*|apto\s*\d*|ap\s*\d*|bloco\s*\w*|bl\s*\w*|fundos|kit\s*net|kitnet)\b.*/i);
      if (compMatch) {
        result.complement = compMatch[0].trim();
      }

      // Rua limpa: remover número e complemento
      let street = streetLine
        .replace(/\b\d{1,5}\b/, '')
        .replace(/\b(pr[eé]dio\s+\w+|casa\s*\d*|apto\s*\d*|ap\s*\d*|bloco\s*\w*|bl\s*\w*|fundos|kit\s*net|kitnet)\b.*/i, '')
        .trim();

      if (street.length > 3) {
        result.street = street;
        result.confidence = (result.confidence || 0) + 20;
      }

      usedIndices.add(i);
      break;
    }
  }

  // === 4. Número isolado (linha só com número, ex: "170") ===
  if (!result.number) {
    for (let i = 0; i < lines.length; i++) {
      if (usedIndices.has(i)) continue;
      if (/^\d{1,5}[A-Za-z]?$/.test(lines[i].trim())) {
        result.number = lines[i].trim();
        result.confidence = (result.confidence || 0) + 10;
        usedIndices.add(i);
        break;
      }
    }
  }

  // === 5. Bairro ===
  // Formato: "R Corruíras/Campeche" ou "Campeche" isolado
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue;
    const l = lines[i];
    // Linha curta sem CEP, sem UF, sem número isolado, sem ser rua
    if (
      !extractCEP(l) &&
      !extractUF(l) &&
      !looksLikeStreet(l) &&
      !/^\d/.test(l) &&
      l.length >= 3 && l.length <= 50 &&
      !looksLikePersonName(l) // bairro não parece nome próprio completo
    ) {
      // Remove prefixo "R " ou "Rua "
      let bairro = l.replace(/^[Rr]\.?\s+/, '').trim();
      // Se tiver "/" pega a última parte (bairro)
      if (bairro.includes('/')) {
        const parts = bairro.split('/');
        bairro = parts[parts.length - 1].trim();
      }
      if (bairro.length >= 3 && !/BRAZIL/i.test(bairro)) {
        result.neighborhood = bairro;
        result.confidence = (result.confidence || 0) + 10;
        usedIndices.add(i);
        break;
      }
    }
  }

  // === 6. Complemento adicional (se não foi capturado na linha da rua) ===
  if (!result.complement) {
    for (let i = 0; i < lines.length; i++) {
      if (usedIndices.has(i)) continue;
      const compMatch = lines[i].match(/^(casa\s*\d+|apto\s*\d+|ap\s*\d+|bloco\s*\w+|pr[eé]dio\s+\w+|fundos|kit\s*net)/i);
      if (compMatch) {
        result.complement = lines[i].trim();
        usedIndices.add(i);
        break;
      }
    }
  }

  // === 7. Destinatário (nome próprio) ===
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue;
    if (looksLikePersonName(lines[i]) && !looksLikeStreet(lines[i])) {
      result.recipientName = lines[i].trim();
      result.confidence = (result.confidence || 0) + 20;
      usedIndices.add(i);
      break;
    }
  }

  // === 8. Endereço Temu em linha única ===
  // Formato: "Servidao aguia dourada 61 Casa 2 Av Pequeno"
  // Caso o logradouro não tenha sido detectado ainda (não começa com "Rua"/"Av"...)
  if (!result.street) {
    for (let i = 0; i < lines.length; i++) {
      if (usedIndices.has(i)) continue;
      const l = lines[i];
      // Linha longa que contém número e parece endereço
      if (l.length > 10 && /\b\d{1,5}\b/.test(l) && !extractCEP(l) && !extractUF(l)) {
        const numMatch = l.match(/\b(\d{1,5})\b/);
        if (numMatch && !result.number) result.number = numMatch[1];

        const compMatch = l.match(/\b(casa\s*\d*|apto\s*\d*|pr[eé]dio\s+\w*|bloco\s*\w*|fundos)\b.*/i);
        if (compMatch && !result.complement) result.complement = compMatch[0].trim();

        let street = l
          .replace(/\b\d{1,5}\b/, '')
          .replace(/\b(casa\s*\d*|apto\s*\d*|pr[eé]dio\s+\w*|bloco\s*\w*|fundos)\b.*/i, '')
          .trim();

        if (street.length > 5) {
          result.street = street;
          result.confidence = (result.confidence || 0) + 15;
          usedIndices.add(i);
          break;
        }
      }
    }
  }

  // Validação mínima: precisamos de pelo menos CEP ou cidade + algum endereço ou nome
  const hasMinData =
    (result.zipCode || result.city !== 'Florianópolis') &&
    (result.street || result.recipientName);

  if (!hasMinData && (result.confidence || 0) < 30) return null;

  return {
    recipientName: result.recipientName || '',
    zipCode: result.zipCode || '',
    street: result.street || '',
    number: result.number || '',
    complement: result.complement || '',
    neighborhood: result.neighborhood || '',
    city: result.city || 'Florianópolis',
    state: result.state || 'SC',
    confidence: result.confidence || 0,
  };
}

export async function terminateOCRWorker() {
  if (workerRef) {
    await workerRef.terminate();
    workerRef = null;
  }
}
