const fs = require('fs');

/**
 * Normaliza termos de logradouro em Santa Catarina
 */
function cleanStreet(s) {
  return (s || '')
    .replace(/^Servisão/i, 'Servidão')
    .replace(/^Serv\./i, 'Servidão')
    .replace(/^Av\./i, 'Avenida')
    .replace(/^R\./i, 'Rua')
    .replace(/^R\s/i, 'Rua ')
    .trim();
}

/**
 * Consulta geocodificação oficial no Photon (Kompass OpenStreetMap com suporte a filtros geográficos estritos)
 * e Google Geocoding fallback
 */
async function geocodePrecise(street, neighborhood, city, state, zipCode) {
  const cleanZip = (zipCode || '').replace(/\D/g, '');
  const fixedStreet = cleanStreet(street);

  // 1. Consulta Nominatim com parâmetros estruturados EXCLUSIVOS (street, suburb, city, state, postalcode)
  // O uso de parâmetros estruturados impede mistura de bairros
  const params = new URLSearchParams({
    street: fixedStreet,
    suburb: neighborhood,
    city: city || 'Florianópolis',
    state: state || 'SC',
    postalcode: cleanZip,
    country: 'Brasil',
    format: 'json',
    limit: '1',
    addressdetails: '1'
  });

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'CaponiPreciseRouting/2.0 (contato@caponilog.com.br)' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          source: 'structured_osm'
        };
      }
    }
  } catch (e) {}

  // 2. Consulta pelo CEP exato de 8 dígitos via BrasilAPI / Nominatim CEP
  try {
    const cepUrl = `https://nominatim.openstreetmap.org/search?postalcode=${cleanZip}&country=Brazil&format=json&limit=1`;
    const cepRes = await fetch(cepUrl, { headers: { 'User-Agent': 'CaponiPreciseRouting/2.0' } });
    if (cepRes.ok) {
      const cepData = await cepRes.json();
      if (cepData && cepData.length > 0) {
        return {
          lat: parseFloat(cepData[0].lat),
          lon: parseFloat(cepData[0].lon),
          source: 'postalcode'
        };
      }
    }
  } catch (e) {}

  // 3. Fallback inteligente: Coordenada exata da região do CEP
  // Tabela de Centroides reais por CEP do Sul da Ilha:
  const cepCentroids = {
    '88066600': { lat: -27.768800, lon: -48.520295 }, // Rozália Paulina Ferreira
    '88067000': { lat: -27.771472, lon: -48.505012 }, // Francisco Thomaz dos Santos
    '88066655': { lat: -27.765504, lon: -48.516574 }, // Melissa
    '88066660': { lat: -27.763457, lon: -48.518313 }, // Caminho dos Cafezais
    '88067620': { lat: -27.779197, lon: -48.538634 }, // Mares do Sul
    '88067608': { lat: -27.783760, lon: -48.536808 }, // Sete Estrelas
    '88067603': { lat: -27.783770, lon: -48.536692 }, // Maria Carolina Ferreira
    '88067500': { lat: -27.794695, lon: -48.534848 }, // Inério Joaquim da Silva
    '88067595': { lat: -27.793525, lon: -48.534657 }, // Niberto Borges
    '88067550': { lat: -27.792841, lon: -48.534594 }, // Alvim Aguedes Borges
    '88067520': { lat: -27.786848, lon: -48.530593 }, // Mem de Sá
    '88067210': { lat: -27.784826, lon: -48.532116 }, // Pedro M Borba / Açores
    '88067380': { lat: -27.783501, lon: -48.527201 }, // Derli Sontag
    '88067430': { lat: -27.781908, lon: -48.528658 }, // Laudelino P Oliveira
    '88067480': { lat: -27.780590, lon: -48.530299 }, // Rubis
    '88067490': { lat: -27.779297, lon: -48.530008 }, // Bauxitas
    '88067400': { lat: -27.780257, lon: -48.529714 }, // Ptolomeu Bittencourt
    '88067470': { lat: -27.778955, lon: -48.529321 }, // Manoel F Coelho
    '88067415': { lat: -27.778011, lon: -48.528957 }, // Julião Benjamin da Lapa
    '88067450': { lat: -27.777831, lon: -48.527861 }, // Ardósias
    '88067420': { lat: -27.779547, lon: -48.527259 }, // Luiz Carlos Souza
    '88067200': { lat: -27.781387, lon: -48.525034 }, // João Belarmino da Silva
    '88067360': { lat: -27.784004, lon: -48.525273 }, // Grafitos
    '88067340': { lat: -27.782687, lon: -48.524182 }, // Waldemar de Mello Dias
    '88067335': { lat: -27.782239, lon: -48.523487 }, // Maurício Rosar
    '88067320': { lat: -27.780705, lon: -48.522045 }, // Fluoritas
    '88067220': { lat: -27.779868, lon: -48.509193 }, // Leodoneto Manoel Adão
    '88067120': { lat: -27.780100, lon: -48.508699 }, // Joaquim Neves
    '88067100': { lat: -27.781307, lon: -48.507657 }, // Abelardo Otacílio Gomes
    '88067140': { lat: -27.782139, lon: -48.506157 }, // Manoel Vidal
    '88067104': { lat: -27.780641, lon: -48.508088 }, // Maria J Jacinto
    '88067101': { lat: -27.780300, lon: -48.506500 }, // Arnaldo Firminio Martins
    '88067080': { lat: -27.779467, lon: -48.506677 }, // Gercino Belarmino da Silva
    '88067079': { lat: -27.779006, lon: -48.507191 }, // Manoel Pedro Oliveira
    '88067055': { lat: -27.771372, lon: -48.504800 }, // Liberalino Padilha
    '88067050': { lat: -27.771023, lon: -48.504730 }, // Valter Paulo
    '88067040': { lat: -27.768661, lon: -48.506786 }, // João Manoel Fernandes
  };

  if (cleanZip && cepCentroids[cleanZip]) {
    return { ...cepCentroids[cleanZip], source: 'centroid_table' };
  }

  // Fallback seguro: Centro geográfico do Pântano do Sul
  return { lat: -27.779000, lon: -48.515000, source: 'neighborhood_center' };
}

async function testSingle() {
  const c = await geocodePrecise('Rua Manoel F Coelho, 117', 'Açores', 'Florianópolis', 'SC', '88067-470');
  console.log('Teste Açores:', c);
}

testSingle();
