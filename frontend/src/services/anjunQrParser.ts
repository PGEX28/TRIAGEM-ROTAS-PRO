/**
 * ANJUN QR CODE PARSER
 * Parseia o QR code das etiquetas da Anjun Express (Shein, Temu, Shopee via Anjun).
 * O QR contém texto estruturado com dados de entrega.
 *
 * Formato típico Anjun/Shein multi-linha:
 *   AJ26080910833010
 *   Camille Walandorff
 *   Rua Corruíras prédio cinza
 *   170
 *   R Corruíras/Campeche
 *   Florianópolis/SC
 *   CEP: 88063091
 */

export interface ParsedAddress {
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  trackingCode?: string;
  confidence: number; // 0-100
}


/**
 * Extrai CEP de qualquer string no formato XXXXX-XXX ou XXXXXXXX
 */
function extractCep(text: string): string | null {
  const match = text.match(/\b(\d{5})-?(\d{3})\b/);
  return match ? `${match[1]}-${match[2]}` : null;
}

/**
 * Extrai UF do endereço (2 letras maiúsculas do estado brasileiro)
 */
function extractUF(text: string): string | null {
  const states = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
    'SP','SE','TO'
  ];
  for (const state of states) {
    const re = new RegExp(`\\b${state}\\b`, 'i');
    if (re.test(text)) return state;
  }
  return null;
}

/**
 * Tenta parsear o conteúdo de um QR Code da Anjun Express
 * Suporta múltiplos formatos: multi-linha sem labels, com labels (CEP:, Destinatário:), e JSON.
 */
export function parseAnjunQR(raw: string): ParsedAddress | null {
  try {
    const json = JSON.parse(raw);
    if (json.recipient || json.address || json.nome) {
      return parseFromJSON(json);
    }
  } catch (_) {}

  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const result: Partial<ParsedAddress> = { confidence: 0 };

  // === PASSO 1: Leitura de campos com label (CEP:, Destinatário:, etc.) ===
  for (const line of lines) {
    const cepLabel = line.match(/(?:cep|zip)[:\s]+(\d{5}-?\d{3})/i);
    if (cepLabel) {
      result.zipCode = cepLabel[1].replace(/(\d{5})(\d{3})$/, '$1-$2');
      result.confidence = (result.confidence || 0) + 30;
    }

    const destLabel = line.match(/^destinat[aá]rio[:\s]+(.+)/i);
    if (destLabel) {
      result.recipientName = destLabel[1].trim();
      result.confidence = (result.confidence || 0) + 25;
    }
  }

  // === PASSO 2: Código de rastreio Anjun ===
  const ajLineIdx = lines.findIndex(l => /^AJ\d{10,}/i.test(l));
  const ajMatch = raw.match(/\bAJ\d{10,}\b/i);
  if (ajMatch) {
    result.trackingCode = ajMatch[0];
    result.confidence = (result.confidence || 0) + 5;
  }

  // === PASSO 3: CEP (qualquer linha) ===
  if (!result.zipCode) {
    for (const line of lines) {
      const cep = extractCep(line);
      if (cep) {
        result.zipCode = cep;
        result.confidence = (result.confidence || 0) + 25;
        break;
      }
    }
  }

  // === PASSO 4: Linha Cidade/UF (ex: "Florianópolis/SC" ou "Florianópolis, SC") ===
  let ufLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const uf = extractUF(lines[i]);
    if (!uf) continue;

    result.state = uf;
    ufLineIdx = i;
    result.confidence = (result.confidence || 0) + 10;

    // Tenta extrair cidade (antes de "/" ou ",")
    const cityMatch = lines[i].match(/^([^/,]+)[/,]/) ||
                      lines[i].match(new RegExp(`(.+?)\\s+${uf}\\b`, 'i'));
    if (cityMatch) {
      const cityCandidate = cityMatch[1].trim();
      if (cityCandidate.length > 2 && !['R', 'Rua'].includes(cityCandidate)) {
        result.city = cityCandidate;
        result.confidence = (result.confidence || 0) + 10;
      }
    }
    break;
  }

  // === PASSO 5: Bairro (linha imediatamente antes de Cidade/UF) ===
  if (ufLineIdx > 0) {
    const bairroLine = lines[ufLineIdx - 1];
    if (bairroLine && !extractCep(bairroLine) && !/^AJ\d/i.test(bairroLine) && !/^\d{1,5}$/.test(bairroLine)) {
      // Formato "R Corruíras/Campeche" ou "Campeche"
      const parts = bairroLine.split('/');
      let bairro = parts[parts.length - 1].trim();
      bairro = bairro.replace(/^(r\.?\s+|rua\s+)/i, '').trim();
      if (bairro.length > 2) {
        result.neighborhood = bairro;
        result.confidence = (result.confidence || 0) + 10;
      }
    }
  }

  // === PASSO 6: Número (linha que é só dígitos, ex: "170") ===
  let numberLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i === ufLineIdx) continue;
    if (/^\d{1,5}[A-Za-z]?$/.test(lines[i])) {
      result.number = lines[i].trim();
      numberLineIdx = i;
      result.confidence = (result.confidence || 0) + 15;
      break;
    }
  }

  // === PASSO 7: Rua/Logradouro (linha antes do número, ou linha que começa com tipo de via) ===
  if (!result.street) {
    // Tenta linha explicitamente de logradouro
    for (let i = 0; i < lines.length; i++) {
      if (i === ufLineIdx || i === numberLineIdx) continue;
      if (/^(rua|r\.|av\.|avenida|serv|servidao|travessa|rod\.|estrada|alameda|\d)/i.test(lines[i])) {
        const streetLine = lines[i];
        // Remover complemento da linha da rua (ex: "Rua Corruíras prédio cinza" → street = "Rua Corruíras", complement = "prédio cinza")
        const compKeywords = /\b(pr[eé]dio|casa|apto|ap\.|bloco|bl\.|lote|fundos|kit\s*net|kitnet|sl\.|sala)\b/i;
        const compMatch = streetLine.match(new RegExp(`(.+?)\\s+(${compKeywords.source}.*)`, 'i'));
        if (compMatch) {
          result.street = compMatch[1].trim();
          if (!result.complement) result.complement = compMatch[2].trim();
        } else {
          result.street = streetLine.trim();
        }
        result.confidence = (result.confidence || 0) + 20;
        break;
      }
    }

    // Fallback: linha imediatamente antes do número
    if (!result.street && numberLineIdx > 0) {
      const candidate = lines[numberLineIdx - 1];
      if (candidate && !extractCep(candidate) && !/^AJ\d/i.test(candidate)) {
        const isName = /^[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ]/.test(candidate) && candidate.split(' ').length <= 4;
        if (!isName) {
          result.street = candidate.trim();
          result.confidence = (result.confidence || 0) + 15;
        }
      }
    }
  }

  // === PASSO 8: Destinatário (primeira linha com nome após código AJ) ===
  if (!result.recipientName) {
    const startIdx = ajLineIdx >= 0 ? ajLineIdx + 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (
        i === ufLineIdx || i === numberLineIdx ||
        extractCep(line) ||
        /^AJ\d/i.test(line) ||
        /^(rua|av|serv|travessa|rod|estrada)/i.test(line) ||
        line === result.street ||
        line === result.neighborhood
      ) continue;

      // Nome: começa com maiúscula, pelo menos 2 palavras
      if (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][a-záéíóúâêîôûãõàç]/.test(line) && line.includes(' ')) {
        result.recipientName = line.trim();
        result.confidence = (result.confidence || 0) + 20;
        break;
      }
    }
  }

  // === Defaults e limpeza final ===
  result.complement = result.complement || '';
  result.neighborhood = result.neighborhood || '';
  result.city = result.city || 'Florianópolis';
  result.state = result.state || 'SC';

  // Garantir que o número não está duplicado na rua
  if (result.street && result.number) {
    result.street = result.street.replace(new RegExp(`^${result.number}\\s*`), '').trim();
  }

  if ((result.confidence || 0) < 30) return null;

  return result as ParsedAddress;
}

/**
 * Parser para QR em formato JSON
 */
function parseFromJSON(json: Record<string, any>): ParsedAddress | null {
  try {
    return {
      recipientName: json.recipient || json.nome || json.destinatario || '',
      zipCode: json.cep || json.zip || json.zipCode || '',
      street: json.street || json.rua || json.logradouro || '',
      number: json.number || json.numero || '',
      complement: json.complement || json.complemento || '',
      neighborhood: json.neighborhood || json.bairro || '',
      city: json.city || json.cidade || '',
      state: json.state || json.uf || json.estado || '',
      trackingCode: json.tracking || json.rastreio || json.code || '',
      confidence: 90,
    };
  } catch {
    return null;
  }
}

/**
 * Verifica se o texto escaneado parece ser um QR de etiqueta de entrega
 * (em oposição a apenas um código de barras simples)
 */
export function looksLikeAddressQR(text: string): boolean {
  // QR de endereço tem múltiplas linhas OU um CEP OU tem palavras-chave de endereço
  if (text.includes('\n')) return true;
  if (/\b\d{5}-?\d{3}\b/.test(text)) return true;
  if (/\b(rua|av\.|avenida|servidao|travessa|alameda|campeche|cep)\b/i.test(text)) return true;
  if (/^AJ\d{10,}/i.test(text.split('\n')[0])) return true;
  return false;
}
