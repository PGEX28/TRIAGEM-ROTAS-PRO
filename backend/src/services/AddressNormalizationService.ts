import supabase from '../lib/supabase';

export interface AddressInput {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  raw_text?: string;
}

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com']);

/**
 * Converte texto para Title Case respeitando regras gramaticais em português
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && LOWERCASE_WORDS.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Dicionário Oficial de Vias Notórias de Florianópolis (Sul, Norte, Leste, Centro e Continente).
 * Mapeia o termo-chave da rua para seu tipo de logradouro e nome oficial exato cadastrado no Google Maps / DNE.
 */
const FLORIPA_OFFICIAL_STREETS: Record<string, string> = {
  // === SUL DA ILHA (Campeche, Morro das Pedras, Armação, Pântano, Ribeirão, Tapera, Rio Tavares) ===
  'coruja dourada': 'Servidão Coruja Dourada',
  'quimboas': 'Servidão Quimboas',
  'ibiza': 'Travessa Ibiza',
  'flor de perola': 'Travessa Flor de Pérola',
  'flor de pérola': 'Travessa Flor de Pérola',
  'jambolao': 'Travessa Jambolão',
  'jambolão': 'Travessa Jambolão',
  'magnolia branca': 'Travessa Magnólia Branca',
  'magnólia branca': 'Travessa Magnólia Branca',
  'caraguata': 'Travessa Caraguatá',
  'caraguatá': 'Travessa Caraguatá',
  'olindina m lopes': 'Servidão Olindina Manoel Lopes',
  'olindina manoel lopes': 'Servidão Olindina Manoel Lopes',
  'francisco candido xavier': 'Servidão Francisco Cândido Xavier',
  'francisco cândido xavier': 'Servidão Francisco Cândido Xavier',
  'alfredo m vieira': 'Servidão Alfredo Manoel Vieira',
  'alfredo manoel vieira': 'Servidão Alfredo Manoel Vieira',
  'recanto da figueira': 'Servidão Recanto da Figueira',
  'recanto figueira': 'Servidão Recanto da Figueira',
  'nilton p de jesus': 'Servidão Nilton Pedro de Jesus',
  'nilton p. de jesus': 'Servidão Nilton Pedro de Jesus',
  'nilton pedro de jesus': 'Servidão Nilton Pedro de Jesus',
  'honorato manoel goncalves': 'Servidão Honorato Manoel Gonçalves',
  'honorato manoel gonçalves': 'Servidão Honorato Manoel Gonçalves',
  'santa clara': 'Servidão Santa Clara',
  'sta clara': 'Servidão Santa Clara',
  'das conchas': 'Servidão das Conchas',
  'conchas': 'Servidão das Conchas',
  'pedro castanho': 'Servidão Pedro Castanho',
  'mares do sul': 'Servidão Mares do Sul',
  'sete estrelas': 'Servidão Sete Estrelas',
  'maria carolina ferreira': 'Servidão Maria Carolina Ferreira',
  'niberto borges': 'Servidão Niberto Borges',
  'alvim aguedes borges': 'Servidão Alvim Aguedes Borges',
  'mem de sa': 'Servidão Mem de Sá',
  'mem de sá': 'Servidão Mem de Sá',
  'pedro m borba': 'Servidão Pedro Manoel Borba',
  'pedro m. borba': 'Servidão Pedro Manoel Borba',
  'pedro manoel borba': 'Servidão Pedro Manoel Borba',
  'leodoneto manoel adao': 'Servidão Leodoneto Manoel Adão',
  'leodoneto manoel adão': 'Servidão Leodoneto Manoel Adão',
  'liberalino padilha': 'Servidão Liberalino Padilha',
  'joao manoel fernandes': 'Servidão João Manoel Fernandes',
  'joão manoel fernandes': 'Servidão João Manoel Fernandes',
  'prof gercino belarmino': 'Servidão Professor Gercino Belarmino',
  'prof. gercino belarmino': 'Servidão Professor Gercino Belarmino',
  'gercino belarmino': 'Servidão Professor Gercino Belarmino',
  'melissa': 'Servidão Melissa',
  'vila do arvoredo': 'Servidão Vila do Arvoredo',
  'caminho dos cafezais': 'Servidão Caminho dos Cafezais',
  'pequeno principe': 'Avenida Pequeno Príncipe',
  'pequeno príncipe': 'Avenida Pequeno Príncipe',
  'campeche': 'Avenida Campeche',
  'tucuma': 'Avenida Tucumã',
  'tucumã': 'Avenida Tucumã',
  'francisco magno vieira': 'Rodovia Francisco Magno Vieira',
  'francisco thomaz dos santos': 'Rodovia Francisco Thomaz dos Santos',
  'baldicero filomeno': 'Rodovia Baldicero Filomeno',
  'aparicio ramos cordeiro': 'Rodovia Aparício Ramos Cordeiro',
  'aparício ramos cordeiro': 'Rodovia Aparício Ramos Cordeiro',
  'rozalia paulina ferreira': 'Estrada Rozália Paulina Ferreira',
  'rozália paulina ferreira': 'Estrada Rozália Paulina Ferreira',
  'nossa senhora de fatima': 'Rua Nossa Senhora de Fátima',
  'nossa senhora de fátima': 'Rua Nossa Senhora de Fátima',
  'n. sra. de fatima': 'Rua Nossa Senhora de Fátima',
  'n. sra. de fátima': 'Rua Nossa Senhora de Fátima',
  'manoel pedro vieira': 'Rua Manoel Pedro Vieira',
  'manoel p vieira': 'Rua Manoel Pedro Vieira',
  'manoel p. vieira': 'Rua Manoel Pedro Vieira',
  'm p vieira': 'Rua Manoel Pedro Vieira',
  'm. p. vieira': 'Rua Manoel Pedro Vieira',
  'francisco vieira': 'Rua Francisco Vieira',
  'prof emanoel paulo peluso': 'Rua Professor Emanoel Paulo Peluso',
  'prof. emanoel paulo peluso': 'Rua Professor Emanoel Paulo Peluso',
  'aroeira do campo': 'Rua Aroeira do Campo',
  'murta': 'Rua Murta',
  'tereza lopes': 'Rua Tereza Lopes',
  'maria caetana rita': 'Rua Maria Caetana Rita',
  'sagrado coracao de jesus': 'Rua Sagrado Coração de Jesus',
  'sagrado coração de jesus': 'Rua Sagrado Coração de Jesus',
  'ambrosio joao silveira': 'Rua Ambrósio João Silveira',
  'ambrósio joão silveira': 'Rua Ambrósio João Silveira',
  'antonio borges dos santos': 'Servidão Antônio Borges dos Santos',
  'antônio borges dos santos': 'Servidão Antônio Borges dos Santos',
  'manoel luiz duarte': 'Servidão Manoel Luiz Duarte',

  // === NORTE DA ILHA (Ingleses, Canasvieiras, Jurerê, Rio Vermelho, Santinho, Ponta das Canas, Ratones) ===
  'armando calil bulos': 'Rodovia Armando Calil Bulos',
  'joao gualberto soares': 'Rodovia João Gualberto Soares',
  'joão gualberto soares': 'Rodovia João Gualberto Soares',
  'jose carlos daux': 'Rodovia José Carlos Daux',
  'josé carlos daux': 'Rodovia José Carlos Daux',
  'mauricio sirotsky sobrinho': 'Rodovia Maurício Sirotsky Sobrinho',
  'maurício sirotsky sobrinho': 'Rodovia Maurício Sirotsky Sobrinho',
  'tertuliano brito xavier': 'Rodovia Tertuliano Brito Xavier',
  'dom joao becker': 'Estrada Dom João Becker',
  'dom joão becker': 'Estrada Dom João Becker',
  'geral do rio vermelho': 'Estrada Geral do Rio Vermelho',
  'jornalista jaime de arruda ramos': 'Estrada Jornalista Jaime de Arruda Ramos',
  'dario manoel ferreira': 'Servidão Dário Manoel Ferreira',
  'dário manoel ferreira': 'Servidão Dário Manoel Ferreira',
  'candido pereira dos santos': 'Servidão Cândido Pereira dos Santos',
  'cândido pereira dos santos': 'Servidão Cândido Pereira dos Santos',
  'manoel rafael da silva': 'Servidão Manoel Rafael da Silva',
  'manoel cezario coelho': 'Servidão Manoel Cezário Coelho',
  'manoel cezário coelho': 'Servidão Manoel Cezário Coelho',
  'botafogo dos ingleses': 'Servidão Botafogo dos Ingleses',
  'jose manoel pacifico': 'Servidão José Manoel Pacífico',
  'josé manoel pacífico': 'Servidão José Manoel Pacífico',
  'jose manoel de souza': 'Servidão José Manoel de Souza',
  'josé manoel de souza': 'Servidão José Manoel de Souza',
  'manoel laureano dos santos': 'Servidão Manoel Laureano dos Santos',
  'dos saguis': 'Servidão dos Saguis',
  'saguis': 'Servidão dos Saguis',
  'veredas': 'Servidão Veredas',
  'floresta': 'Servidão Floresta',
  'tres marias': 'Servidão Três Marias',
  'três marias': 'Servidão Três Marias',
  'caminho do mar': 'Servidão Caminho do Mar',
  'recanto dos passaros': 'Servidão Recanto dos Pássaros',
  'recanto dos pássaros': 'Servidão Recanto dos Pássaros',
  'vila esperanca': 'Servidão Vila Esperança',
  'vila esperança': 'Servidão Vila Esperança',
  'antenor borges': 'Servidão Antenor Borges',
  'manoel firmiano': 'Servidão Manoel Firmiano',
  'dos pescadores': 'Servidão dos Pescadores',
  'pescadores': 'Servidão dos Pescadores',
  'maria odilia ramos': 'Servidão Maria Odília Ramos',
  'maria odília ramos': 'Servidão Maria Odília Ramos',
  'luiz boiteux piazza': 'Avenida Luiz Boiteux Piazza',
  'milton leite da costa': 'Avenida Milton Leite da Costa',
  'das nacoes': 'Avenida das Nações',
  'das nações': 'Avenida das Nações',
  'madre maria vilac': 'Avenida Madre Maria Vilac',
  'dos buzios': 'Avenida dos Búzios',
  'dos búzios': 'Avenida dos Búzios',
  'das lagostas': 'Avenida das Lagostas',
  'dos dourados': 'Avenida dos Dourados',
  'dos pampos': 'Avenida dos Pampos',

  // === LESTE DA ILHA (Lagoa da Conceição, Barra da Lagoa, Joaquina) ===
  'das rendeiras': 'Avenida das Rendeiras',
  'rendeiras': 'Avenida das Rendeiras',
  'afonso delambert neto': 'Avenida Afonso Delambert Neto',
  'henrique veras do nascimento': 'Rua Henrique Veras do Nascimento',
  'laurindo januario da silveira': 'Rua Laurindo Januário da Silveira',
  'laurindo januário da silveira': 'Rua Laurindo Januário da Silveira',
  'prefeito acacio garibaldi sao thiago': 'Avenida Prefeito Acácio Garibaldi São Thiago',
  'prefeito acácio garibaldi são thiago': 'Avenida Prefeito Acácio Garibaldi São Thiago',
  'cidade de cordoba': 'Servidão Cidade de Córdoba',
  'cidade de córdoba': 'Servidão Cidade de Córdoba',
  'manoel pedro dos santos': 'Servidão Manoel Pedro dos Santos',
  'amaro coelho': 'Rua Amaro Coelho',

  // === CENTRO, BACIA DO ITACORUBI & CONTINENTE ===
  'beira mar norte': 'Avenida Jornalista Rubens de Arruda Ramos',
  'rubens de arruda ramos': 'Avenida Jornalista Rubens de Arruda Ramos',
  'madre benvenuta': 'Avenida Madre Benvenuta',
  'prof henrique da silva fontes': 'Avenida Professor Henrique da Silva Fontes',
  'prof. henrique da silva fontes': 'Avenida Professor Henrique da Silva Fontes',
  'henrique da silva fontes': 'Avenida Professor Henrique da Silva Fontes',
  'delfino conti': 'Rua Delfino Conti',
  'lauro linhares': 'Rua Lauro Linhares',
  'desembargador vitor lima': 'Rua Desembargador Vítor Lima',
  'desembargador vítor lima': 'Rua Desembargador Vítor Lima',
  'admar gonzaga': 'Rodovia Admar Gonzaga',
  'haroldo soares glavan': 'Rodovia Haroldo Soares Glavan',
  'eng max de souza': 'Avenida Engenheiro Max de Souza',
  'eng. max de souza': 'Avenida Engenheiro Max de Souza',
  'engenheiro max de souza': 'Avenida Engenheiro Max de Souza',
  'gov ivo silveira': 'Avenida Governador Ivo Silveira',
  'gov. ivo silveira': 'Avenida Governador Ivo Silveira',
  'governador ivo silveira': 'Avenida Governador Ivo Silveira',
  'leoberto leal': 'Avenida Leoberto Leal',
  'fulvio aducci': 'Rua Fúlvio Aducci',
  'fúlvio aducci': 'Rua Fúlvio Aducci',
  'gen eurico gaspar dutra': 'Rua General Eurico Gaspar Dutra',
  'general eurico gaspar dutra': 'Rua General Eurico Gaspar Dutra',
};

/**
 * Remove tipo de logradouro inicial para extrair o núcleo do nome da rua
 */
function extractStreetCore(street: string): string {
  return street
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(r\.|r|rua|av\.|av|avn\.|aven\.|avenida|serv\.|serv|sd\.|sv\.|servidao|servidão|trav\.|trav|tv\.|tv|travessa|rod\.|rod|rodv\.|rodovia|est\.|estr\.|est|estrada|al\.|al|alameda|pça\.|pça|pc\.|pc|praca|praça|cond\.|cond|condominio|condomínio|bco\.|bco|beco|pas\.|pass\.|passagem|vl\.|vila)\s+/i, '')
    .replace(/[,\.;:'"()\/#!@$%^&*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expande abreviações e corrige o tipo de logradouro oficial para Florianópolis
 */
export function expandStreetName(street: string): string {
  if (!street) return '';
  let s = street.trim();

  // 1. Verificar se o núcleo da via consta no Dicionário Oficial de Florianópolis
  const core = extractStreetCore(s);
  if (FLORIPA_OFFICIAL_STREETS[core]) {
    return FLORIPA_OFFICIAL_STREETS[core];
  }

  // 2. Expandir prefixos de logradouro gerais caso não esteja no dicionário estrito
  const prefixMap: [RegExp, string][] = [
    [/^(r\.|r|rua)\s+/i, 'Rua '],
    [/^(av\.|av|avn\.|aven\.|avenida)\s+/i, 'Avenida '],
    [/^(serv\.|serv|sd\.|sv\.|servidao|servidão)\s+/i, 'Servidão '],
    [/^(trav\.|trav|tv\.|tv|travessa)\s+/i, 'Travessa '],
    [/^(rod\.|rod|rodv\.|rodovia)\s+/i, 'Rodovia '],
    [/^(est\.|estr\.|est|estrada)\s+/i, 'Estrada '],
    [/^(al\.|al|alameda)\s+/i, 'Alameda '],
    [/^(pça\.|pça|pc\.|pc|praca|praça)\s+/i, 'Praça '],
    [/^(cond\.|cond|condominio|condomínio)\s+/i, 'Condomínio '],
    [/^(bco\.|bco|beco)\s+/i, 'Beco '],
    [/^(pas\.|pass\.|passagem)\s+/i, 'Passagem '],
    [/^(vl\.|vila)\s+/i, 'Vila '],
  ];

  for (const [regex, replacement] of prefixMap) {
    if (regex.test(s)) {
      s = s.replace(regex, replacement);
      break;
    }
  }

  // 3. Expandir títulos, nomes religiosos e honoríficos
  const expansions: [RegExp, string][] = [
    [/\b(nossa\s+sra\.?|n\.?\s*sra\.?|n\.?\s*sa\.?|n\.?\s*s\.)\s+/gi, 'Nossa Senhora '],
    [/\bsta\.?\s+/gi, 'Santa '],
    [/\bsto\.?\s+/gi, 'Santo '],
    [/\bs\.\s*(francisco|pedro|josé|jose|joão|joao|sebastião|sebastiao|bento|marcos|lucas|mateus|paulo|tomé|tome|caetano|cristóvão|cristovao|brás|bras)\b/gi, 'São $1'],
    [/\bprof\.\s+/gi, 'Professor '],
    [/\bprofa\.\s+/gi, 'Professora '],
    [/\bdr\.\s+/gi, 'Doutor '],
    [/\bdra\.\s+/gi, 'Doutora '],
    [/\beng\.\s+/gi, 'Engenheiro '],
    [/\benga\.\s+/gi, 'Engenheira '],
    [/\bcel\.\s+/gi, 'Coronel '],
    [/\bgen\.\s+/gi, 'General '],
    [/\bgal\.\s+/gi, 'General '],
    [/\bcap\.\s+/gi, 'Capitão '],
    [/\bmaj\.\s+/gi, 'Major '],
    [/\bten\.\s+/gi, 'Tenente '],
    [/\bsgt\.\s+/gi, 'Sargento '],
    [/\bgov\.\s+/gi, 'Governador '],
    [/\bdep\.\s+/gi, 'Deputado '],
    [/\bsen\.\s+/gi, 'Senador '],
    [/\bver\.\s+/gi, 'Vereador '],
    [/\bpres\.\s+/gi, 'Presidente '],
    [/\bdes\.\s+/gi, 'Desembargador '],
    [/\bmin\.\s+/gi, 'Ministro '],
    [/\bpe\.\s+/gi, 'Padre '],
  ];

  for (const [regex, replacement] of expansions) {
    s = s.replace(regex, replacement);
  }

  s = s.replace(/\bm\.\s*p\.\s*vieira\b/gi, 'Manoel Pedro Vieira');
  s = s.replace(/\bmanoel\s+p\s+vieira\b/gi, 'Manoel Pedro Vieira');
  s = s.replace(/\bm\s+p\s+vieira\b/gi, 'Manoel Pedro Vieira');
  s = s.replace(/\bm\.\s*lopes\b/gi, 'Manoel Lopes');
  s = s.replace(/\bm\s+lopes\b/gi, 'Manoel Lopes');
  s = s.replace(/\bp\.\s*de\s*jesus\b/gi, 'Pedro de Jesus');
  s = s.replace(/\bp\s+de\s*jesus\b/gi, 'Pedro de Jesus');

  s = s.replace(/\s+/g, ' ').trim();
  return toTitleCase(s);
}

/**
 * Normaliza e formata CEP para XXXXX-XXX
 */
export function normalizeZipCode(zip: string): string {
  const digits = (zip || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return zip ? zip.trim() : '';
}

/**
 * Normaliza texto de endereço para chave comparável de desduplicação
 */
export function normalizeAddressKey(text: string): string {
  let result = text.toLowerCase();

  const accentMap: [string, string][] = [
    ['ã', 'a'], ['à', 'a'], ['á', 'a'], ['â', 'a'], ['ä', 'a'],
    ['é', 'e'], ['ê', 'e'], ['è', 'e'],
    ['í', 'i'], ['ì', 'i'], ['î', 'i'],
    ['ó', 'o'], ['ô', 'o'], ['õ', 'o'], ['ö', 'o'],
    ['ú', 'u'], ['û', 'u'], ['ü', 'u'],
    ['ç', 'c'],
    ['ñ', 'n'],
  ];
  for (const [from, to] of accentMap) {
    result = result.split(from).join(to);
  }

  result = result
    .replace(/^(r\.|r|rua)\s+/i, 'rua ')
    .replace(/^(av\.|av|avenida)\s+/i, 'avenida ')
    .replace(/^(serv\.|serv|servidao|servidão)\s+/i, 'servidao ')
    .replace(/^(trav\.|trav|travessa)\s+/i, 'travessa ')
    .replace(/^(rod\.|rod|rodovia)\s+/i, 'rodovia ')
    .replace(/^(est\.|estr\.|estrada)\s+/i, 'estrada ');

  result = result.replace(/[,\.;:'"()\/#!@$%^&*]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Gera chave normalizada para um endereço estruturado
 */
export function buildAddressKey(addr: AddressInput): string {
  const expandedStreet = expandStreetName(addr.street || '');
  const parts = [
    expandedStreet,
    addr.number,
    addr.neighborhood,
    addr.city,
    addr.zip_code?.replace(/\D/g, ''),
  ].filter(Boolean).join(' ');

  return normalizeAddressKey(parts);
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Similaridade entre 0 e 1 baseada em Levenshtein
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

export class AddressNormalizationService {
  /**
   * Encontra endereço existente no banco por chave normalizada ou similaridade
   */
  static async findExisting(
    orgId: string,
    normalizedKey: string,
    zipCode?: string,
    streetNumber?: string  // NOVO: número da casa como hard constraint
  ): Promise<string | null> {
    // 1. Match exato por CEP + chave (mais preciso)
    if (zipCode) {
      const cleanZip = zipCode.replace(/\D/g, '');
      const { data } = await supabase
        .from('addresses')
        .select('id')
        .eq('organization_id', orgId)
        .eq('normalized_key', normalizedKey)
        .ilike('zip_code', `%${cleanZip.slice(0, 5)}%`)
        .limit(1)
        .single();
      if (data) return data.id;
    }

    // 2. Match exato por chave normalizada
    const { data: exact } = await supabase
      .from('addresses')
      .select('id')
      .eq('organization_id', orgId)
      .eq('normalized_key', normalizedKey)
      .limit(1)
      .single();
    if (exact) return exact.id;

    // 3. Busca por similaridade — SOMENTE se o número da casa for o mesmo
    // Endereços com números diferentes são SEMPRE pontos de entrega distintos.
    // Ex: "Rua X, 319" e "Rua X, 177" NUNCA podem ser mesclados, mesmo com 0.95 de similarity.
    if (streetNumber) {
      const { data: similar } = await supabase
        .rpc('find_matching_address_strict', {
          p_org_id: orgId,
          p_normalized_key: normalizedKey,
          p_zip_code: zipCode || null,
          p_street_number: streetNumber.trim(),
          p_similarity_threshold: 0.85,
        });
      if (similar) return similar as string;
    }
    // Sem número: fallback ao RPC original sem constraint (casos sem número na etiqueta)
    else {
      const { data: similar } = await supabase
        .rpc('find_matching_address', {
          p_org_id: orgId,
          p_normalized_key: normalizedKey,
          p_zip_code: zipCode || null,
          p_similarity_threshold: 0.90, // threshold mais alto quando não há número para filtrar
        });
      if (similar) return similar as string;
    }

    return null;
  }

  /**
   * Cria ou encontra endereço no banco já com dados 100% normalizados e sem abreviações
   */
  static async upsert(
    orgId: string,
    addr: AddressInput
  ): Promise<{ id: string; isNew: boolean }> {
    const cleanStreet = expandStreetName(addr.street || '');
    const cleanNeighborhood = toTitleCase(addr.neighborhood || '');
    const cleanCity = toTitleCase(addr.city || 'Florianópolis');
    const cleanState = (addr.state || 'SC').toUpperCase().trim();
    const zipNormalized = normalizeZipCode(addr.zip_code || '');
    const cleanNumber = (addr.number || '').trim();
    const cleanComplement = (addr.complement || '').trim();

    const normalizedKey = buildAddressKey({
      street: cleanStreet,
      number: cleanNumber,
      neighborhood: cleanNeighborhood,
      city: cleanCity,
      zip_code: zipNormalized,
    });

    const existingId = await this.findExisting(orgId, normalizedKey, zipNormalized, cleanNumber || undefined);
    if (existingId) {
      return { id: existingId, isNew: false };
    }

    // Criar novo endereço com formato limpo e expandido
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        organization_id: orgId,
        street: cleanStreet,
        number: cleanNumber,
        complement: cleanComplement,
        neighborhood: cleanNeighborhood,
        city: cleanCity,
        state: cleanState,
        zip_code: zipNormalized,
        normalized_key: normalizedKey,
        raw_text: addr.raw_text,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Erro ao criar endereço: ${error?.message}`);
    }

    return { id: data.id, isNew: true };
  }
}
