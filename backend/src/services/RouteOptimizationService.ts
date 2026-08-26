import supabase from '../lib/supabase';

interface StopWithAddress {
  id: string;
  stop_number: number;
  order_number: number;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
}

/**
 * Extrai os dígitos numéricos do número do endereço para comparação
 */
function toAddressNum(numStr: string): number {
  const n = parseInt((numStr || '0').replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Extrai os 5 primeiros dígitos do CEP (região) para clusterização geográfica.
 * CEPs no Brasil são organizados geograficamente — CEPs próximos = endereços próximos.
 */
function cepPrefix(zipCode: string): number {
  const digits = (zipCode || '').replace(/\D/g, '');
  return parseInt(digits.slice(0, 5) || '0', 10);
}

/**
 * Normaliza nome de rua para ordenação (remove acentos, toLowerCase, remove tipo de logradouro)
 */
function normalizeStreet(street: string): string {
  return (street || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(rua|avenida|av|servidao|serv|travessa|trav|estrada|est|rodovia|rod|alameda|al|praca|pc)\s+/i, '')
    .trim();
}

/**
 * Normaliza nome de bairro para comparação
 */
function normalizeNeighborhood(n: string): string {
  return (n || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calcula a "distância" entre dois endereços usando CEP + bairro + rua.
 * Retorna um valor de 0 (muito próximos) a 100 (muito distantes).
 */
function addressDistance(a: StopWithAddress, b: StopWithAddress): number {
  if (!a.address || !b.address) return 100;

  // Diferença de CEP — quanto maior, mais longe
  const cepDiff = Math.abs(cepPrefix(a.address.zip_code) - cepPrefix(b.address.zip_code));
  // Uma diferença de 100 CEPs ≈ ~1km (heurística local para BR)
  const cepScore = Math.min(cepDiff / 200, 50); // máx 50 pontos por CEP

  // Mesmo bairro? Reduz muito a distância
  const sameNeighborhood = normalizeNeighborhood(a.address.neighborhood) === normalizeNeighborhood(b.address.neighborhood);
  const neighborhoodScore = sameNeighborhood ? 0 : 20;

  // Mesma rua? Muito próximos (apenas número diferente)
  const sameStreet = normalizeStreet(a.address.street) === normalizeStreet(b.address.street);
  const streetScore = sameStreet ? 0 : 10;

  // Diferença de número na mesma rua (para ordenar casas na mesma rua)
  const numDiff = sameStreet
    ? Math.abs(toAddressNum(a.address.number) - toAddressNum(b.address.number)) / 100
    : 0;

  return cepScore + neighborhoodScore + streetScore + numDiff;
}

/**
 * Algoritmo do Vizinho Mais Próximo (Nearest Neighbor) para otimização da rota.
 * Começa pela primeira parada registrada e a cada passo escolhe a mais próxima ainda não visitada.
 * Complexidade O(n²) — ótimo para rotas de até 500 paradas.
 */
function nearestNeighborSort(stops: StopWithAddress[]): StopWithAddress[] {
  if (stops.length <= 1) return stops;

  const unvisited = [...stops];
  const ordered: StopWithAddress[] = [];

  // Começar pelo stop_number mais baixo (primeiro bipado)
  const startIdx = unvisited.reduce((minIdx, s, i, arr) =>
    s.stop_number < arr[minIdx].stop_number ? i : minIdx, 0
  );
  ordered.push(...unvisited.splice(startIdx, 1));

  while (unvisited.length > 0) {
    const last = ordered[ordered.length - 1];
    let minDist = Infinity;
    let minIdx = 0;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = addressDistance(last, unvisited[i]);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }

    ordered.push(...unvisited.splice(minIdx, 1));
  }

  return ordered;
}

export class RouteOptimizationService {
  /**
   * Otimiza a ordem de entrega das paradas de um saco.
   * Usa algoritmo Nearest Neighbor baseado em CEP + bairro + rua + número.
   * Atualiza order_number de todas as stops e retorna a nova ordem.
   */
  static async optimizeRoute(bagId: string, orgId: string): Promise<{
    stops: Array<{ id: string; stop_number: number; order_number: number }>;
    totalStops: number;
  }> {
    // 1. Buscar todas as paradas com seus endereços
    const { data: stops, error } = await supabase
      .from('stops')
      .select(`
        id, stop_number, order_number,
        address:addresses(street, number, neighborhood, city, state, zip_code)
      `)
      .eq('bag_id', bagId)
      .eq('organization_id', orgId)
      .order('stop_number', { ascending: true });

    if (error) throw new Error(`Erro ao buscar paradas: ${error.message}`);
    if (!stops || stops.length === 0) return { stops: [], totalStops: 0 };

    // 2. Rodar algoritmo de otimização
    const optimized = nearestNeighborSort(stops as unknown as StopWithAddress[]);

    // 3. Atribuir novos order_number (1, 2, 3, ...)
    const updates = optimized.map((stop, idx) => ({
      id: stop.id,
      stop_number: stop.stop_number,
      order_number: idx + 1,
    }));

    // 4. Persistir no banco em paralelo
    await Promise.all(
      updates.map(({ id, order_number }) =>
        supabase
          .from('stops')
          .update({ order_number })
          .eq('id', id)
          .eq('organization_id', orgId)
      )
    );

    return {
      stops: updates,
      totalStops: updates.length,
    };
  }
}
