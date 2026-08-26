/**
 * ANJUN QR CODE PARSER
 * Parseia o QR code das etiquetas da Anjun Express (Shein, Temu, Shopee via Anjun).
 * O QR contém texto estruturado com dados de entrega.
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
 * O conteúdo tipicamente tem este formato:
 * 
 * AJxxxxxxxxx\nNOME DO DESTINATÁRIO\nRua X, N - Bairro\nCidade/UF\nCEP: XXXXX-XXX
 * 
 * Ou pode ser JSON, ou texto livre de múltiplas linhas.
 */
export function parseAnjunQR(raw: string): ParsedAddress | null {
  try {
    // Tentar JSON primeiro
    const json = JSON.parse(raw);
    if (json.recipient || json.address || json.nome) {
      return parseFromJSON(json);
    }
  } catch (_) {
    // Não é JSON, continuar com texto
  }

  // Limpar e dividir em linhas
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const result: Partial<ParsedAddress> = { confidence: 0 };

  // Extrair CEP de todas as linhas
  for (const line of lines) {
    const cep = extractCep(line);
    if (cep) {
      result.zipCode = cep;
      result.confidence = (result.confidence || 0) + 25;
      break;
    }
  }

  // Extrair UF
  let ufLine = '';
  for (const line of lines) {
    const uf = extractUF(line);
    if (uf) {
      result.state = uf;
      ufLine = line;
      result.confidence = (result.confidence || 0) + 10;
      break;
    }
  }

  // Extrair cidade (última palavra antes do UF na linha que tem o estado)
  if (ufLine && result.state) {
    const cityMatch = ufLine.match(new RegExp(`([A-Za-zÀ-ÿ ]+?)[\s/,]+${result.state}`, 'i'));
    if (cityMatch) {
      result.city = cityMatch[1].trim();
      result.confidence = (result.confidence || 0) + 10;
    }
    // Fallback: última palavra antes da UF
    if (!result.city) {
      const beforeState = ufLine.split(/[\s/,]+/);
      const stateIdx = beforeState.findIndex((w) => w.toUpperCase() === result.state);
      if (stateIdx > 0) {
        result.city = beforeState.slice(Math.max(0, stateIdx - 3), stateIdx).join(' ').trim();
        if (result.city) result.confidence = (result.confidence || 0) + 10;
      }
    }
  }

  // Extrair número do endereço
  let addressLine = '';
  for (const line of lines) {
    if (/\b\d{1,5}\b/.test(line) && line !== ufLine) {
      const numMatch = line.match(/\b(\d{1,5})\b/);
      if (numMatch) {
        result.number = numMatch[1];
        addressLine = line;
        result.confidence = (result.confidence || 0) + 10;
        break;
      }
    }
  }

  // Extrair rua/logradouro (linha do endereço sem número)
  if (addressLine) {
    let street = addressLine.replace(/\b\d{1,5}\b/, '').replace(/[,;-]/g, '').trim();
    // Limpar palavras como "casa", "apto", etc.
    street = street.replace(/\b(casa|apto|ap|bl|bloco|lote|loja|sl|sala)\b.*/i, '').trim();
    if (street.length > 3) {
      result.street = street;
      result.confidence = (result.confidence || 0) + 15;
    }

    // Extrair complemento
    const compMatch = addressLine.match(/\b(casa|apto|ap|bl|bloco|lote)\s*\d+.*/i);
    if (compMatch) {
      result.complement = compMatch[0].trim();
    }
  }

  // Extrair bairro (palavra/frase após número, antes de cidade)
  const neighborhoodCandidates = lines.filter(
    (l) => l !== addressLine && l !== ufLine && !extractCep(l)
  );
  if (neighborhoodCandidates.length > 0) {
    // Pegar linha que NÃO é o nome (geralmente mais curta e depois do endereço)
    const lastLines = neighborhoodCandidates.slice(-2);
    for (const l of lastLines) {
      if (l.length > 3 && l.length < 50 && !l.match(/^AJ/i)) {
        result.neighborhood = l.replace(/[,;]/g, '').trim();
        result.confidence = (result.confidence || 0) + 10;
        break;
      }
    }
  }

  // Extrair nome do destinatário (primeira linha que não seja código AJ)
  for (const line of lines) {
    if (!line.match(/^AJ\d/i) && !line.match(/^\d{5}/) && !extractCep(line)) {
      // Parece ser um nome se tem letras e não é um endereço
      if (/^[A-Za-zÀ-ÿ]/.test(line) && !line.match(/^(rua|av|avenida|est|rod|tv|travessa|servidao|serv)/i)) {
        result.recipientName = line.trim();
        result.confidence = (result.confidence || 0) + 20;
        break;
      }
    }
  }

  // Extrair código de rastreio Anjun
  const ajMatch = raw.match(/\bAJ\d{15,}\b/i);
  if (ajMatch) {
    result.trackingCode = ajMatch[0];
  }

  // Forçar defaults para campos vazios
  result.complement = result.complement || '';
  result.neighborhood = result.neighborhood || '';

  // Só retornar se temos pelo menos 3 campos preenchidos com confidence razoável
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
  if (/\b(rua|av\.|avenida|servidao|travessa|alameda)\b/i.test(text)) return true;
  return false;
}
