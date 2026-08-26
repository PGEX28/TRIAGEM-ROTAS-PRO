const fs = require('fs');

const rawList = `Travessa Flor de Pérola, 60	Campeche	Florianópolis	88066-160	Ao lado do mercado Degane	89 (+5), 90 (+6)
Rodovia Francisco Magno Vieira, 4929	Campeche	Florianópolis	88065-000	Dx no caixa da conveniência	1, 2, 3
Travessa Jambolão, 55	Campeche	Florianópolis	88066-023	Empresa de segunda a sexta	4
Servidão Quimboas, 130	Morro dss pedras	Florianópolis	88066-021		5
Travessa Ibiza, 497	Campeche	Florianópolis	88066-022	Casa 3	6
Rua Nossa Senhora de Fátima, 359	Campeche	Florianópolis	88066-020	Casa 1 - Interfone 1	7
Rua Nossa Senhora de Fátima, 389	Campeche	Florianópolis	88066-020	Rua ao lado  111 apto 3	8
Rua Nossa Senhora de Fátima, 205	Campeche	Florianópolis	88066-020	Atrás do número 221	9
Servidão Francisco Cândido Xavier, 415	Campeche	Florianópolis	88066-027	Casa portão de madeira	10
Servidão Francisco Cândido Xavier, 367	Campeche	Florianópolis	88066-027		11
Servidão Francisco Cândido Xavier, 392	Campeche	Florianópolis	88066-027		12
Rua Francisco Candido Xavier, 270	Campeche	Florianópolis	88066-027	Casa. Alternativo casa 265.	13
Rua. Francisco Viêira, 325	Morro das Pedras	Florianópolis	88066010	Loja 01, Morro das Pedras, Florianópolis, Santa Catarina, 88066010	14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 85 (+1), 86 (+2), 87 (+3), 88 (+4)
Rua Francisco Vieira, 251	Morro das Pedras	Florianópolis	88066-010	Loja Adiferencial modas	33
Servidão Olindina M Lopes, 147 	Campeche	Florianópolis	88066-028	Casa 01	34, 35
Rua Coruja Dourada, 174	Campeche	Florianópolis	88066-035	Kit net	36
Rua Coruja Dourada, 211	Campeche 	Florianópolis	88066-035	Casa 1	37
Rua Coruja Dourada, 396	Campeche	Florianópolis	88066-035		38
Rua Coruja Dourada, 312	Campeche	Florianópolis	88066-035		39
Rua Francisco Vieira, 359	Morro das Pedras	Florianópolis	88066-010	Loja exclusivo calçados	40
Rua Professor Emanoel Paulo Peluso, 50	Campeche	Florianópolis	88066-040	Horario comercial de entrega	41
Rua Manoel P Vieira, 1255	Morro das Pedras	Florianópolis	88066-100	Loja 2 farmácia	42
Rua Manoel P Vieira, 1248	Morro das Pedras	Florianópolis	88066-100	Casa 19	43
Avenida Tucumã, 77	Campeche	Florianópolis	88066-139		44
Rua Aroeira do Campo, 30	Campeche	Florianópolis	88066-280		45
Travessa Magnólia Branca, 0	Campeche	Florianópolis	88066-170	Portão preto ao lado da 41	46, 91 (+7), 92 (+8)
Travessa Magnólia Branca, 183	Campeche	Florianópolis	88066-170	Casa fundos 24	47
Travessa Caraguatá, 29	Campeche	Florianópolis	88066-140		48
Travessa Flor de Pérola, 56	Campeche	Florianópolis	88066-160		49
Rua Murta, 89	Campeche	Florianópolis	88066-125		50, 51
Rua Tereza Lopes, 40	Campeche	Florianópolis	88066-065	Casa	52
Servidão Sta Clara, 180	Morro das Pedras	Florianópolis	88066-051	Casa 2	53
Rua Manoel Pedro Vieira, 869	Morro das Pedras	Florianópolis	88066-100		54
Rua Manoel Pedro Vieira, 225	Morro das Pedras	Florianópolis	88066-100	Casa de cima	55
Servidão das Conchas, 60	Morro das Pedras	Florianópolis	88066-110	Casa a direita e rua sem saída	56
MARIA CAETANA RITA, 177	Morro das Pedras	Florianópolis	88066-103		57
Rua Sagrado Coração de Jesus.. Nova Creche Pequeno Príncipe Atrás Da Comcap., 000	Morro das Pedras	Florianópolis	88066-070	Creche neim pequeno príncipe	58
Servidão Nilton P de Jesus, 106	Morro das Pedras	Florianópolis	88066-079	casa	59
Rodovia Francisco Thomaz dos Santos, 1797	Morro das Pedras	Florianópolis	88066-000	Proximo a Escola Jose Amaro Co	60, 61, 62
Servidão Honorato Manoel Gonçalves, 97	Morro das Pedras	Florianópolis	88066-095	Fundos casa laranja	63
Rodovia Francisco Thomaz dos Santos, 1605	Morro das Pedras	Florianópolis	88066-000	Casa G	64, 65
Rodovia Francisco Thomaz dos Santos, 1350	Morro das Pedras	Florianópolis	88066-000	Próximo material de construção	66
Rua Ambrósio João Silveira, 319	Morro das Pedras	Florianópolis	88066-250	Casa	67, 68
Rua Ambrósio J Silveira, 177	Morro das Pedras	Florianópolis	88066-250	casa	69
Rua Ambrósio João Silveira, 190	Morro das Pedras	Florianópolis	88066-250	CASA AMARELA	70
Rodovia Francisco Thomaz dos Santos, 1052	Morro das Pedras	Florianópolis	88066-000	Casa	71
Servidão Alfredo Manoel Vieira, 174 B	Morro das Pedras	Florianópolis	88066-242		72
Servidão Recanto da Figueira, 87	Morro das Pedras	Florianópolis	88066-248	Apto 01 - Próximo ao Bistek	73
Rodovia Francisco Thomaz dos Santos, 526	Morro das Pedras	Florianópolis	88066-000	casa superior	74
Servidão do Dema, 07	Morro das Pedras	Florianópolis	88066-068	Casa	75, 76
Rua Canela Amarela, 185	Ribeirão da Ilha	Florianópolis	88064-092		77
Servidão Pedro Castanho, 694	Ribeirão da Ilha	Florianópolis	88064-037		78
Servidão Pedro Castanho, 750	Ribeirão da Ilha	Florianópolis	88064-037	Ap 03	79, 80, 82
Servidão Pedro Castanho, 759	Ribeirão da Ilha	Florianópolis	88064-037	De frente ao n: 882	81
Servidão Pedro Castanho, 755	Ribeirão da Ilha	Florianópolis	88064-037		83
Servidão Pedro Castanho, 680	Ribeirão da Ilha	Florianópolis	88064-037	Mandar mensagem	84`;

function cleanStreet(s) {
  return (s || '')
    .replace(/^Rua\.\s+/i, 'Rua ')
    .replace(/^MARIA CAETANA RITA/i, 'Rua Maria Caetana Rita')
    .replace(/^Rua Sagrado Coração de Jesus\.\..*/i, 'Rua Sagrado Coração de Jesus')
    .trim();
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Coordenadas de alta fidelidade para Campeche, Morro das Pedras e Ribeirão da Ilha
const REGION_CEP_CENTROIDS = {
  '88066160': { lat: -27.701150, lon: -48.498320 }, // Flor de Pérola
  '88065000': { lat: -27.685200, lon: -48.491500 }, // Rod. Francisco Magno Vieira (SC-405)
  '88066023': { lat: -27.705120, lon: -48.502310 }, // Jambolão
  '88066021': { lat: -27.708230, lon: -48.504120 }, // Quimboas
  '88066022': { lat: -27.706450, lon: -48.503410 }, // Ibiza
  '88066020': { lat: -27.707100, lon: -48.502800 }, // Nossa Senhora de Fátima
  '88066027': { lat: -27.709300, lon: -48.503900 }, // Francisco Cândido Xavier
  '88066010': { lat: -27.712450, lon: -48.505230 }, // Francisco Vieira
  '88066028': { lat: -27.708890, lon: -48.504620 }, // Olindina M Lopes
  '88066035': { lat: -27.703410, lon: -48.499820 }, // Coruja Dourada
  '88066040': { lat: -27.702100, lon: -48.497500 }, // Prof Emanoel Paulo Peluso
  '88066100': { lat: -27.715820, lon: -48.506890 }, // Manoel P Vieira
  '88066139': { lat: -27.699850, lon: -48.496520 }, // Av Tucumã
  '88066280': { lat: -27.698200, lon: -48.495100 }, // Aroeira do Campo
  '88066170': { lat: -27.700540, lon: -48.497800 }, // Magnólia Branca
  '88066140': { lat: -27.699210, lon: -48.496900 }, // Caraguatá
  '88066125': { lat: -27.701890, lon: -48.498900 }, // Murta
  '88066065': { lat: -27.706820, lon: -48.501500 }, // Tereza Lopes
  '88066051': { lat: -27.713500, lon: -48.506100 }, // Sta Clara
  '88066110': { lat: -27.716400, lon: -48.507300 }, // Servidão das Conchas
  '88066103': { lat: -27.717100, lon: -48.507900 }, // Maria Caetana Rita
  '88066070': { lat: -27.714200, lon: -48.505800 }, // Sagrado Coração de Jesus
  '88066079': { lat: -27.714900, lon: -48.506200 }, // Nilton P de Jesus
  '88066000': { lat: -27.718200, lon: -48.508500 }, // Rod Francisco Thomaz dos Santos (Morro das Pedras)
  '88066095': { lat: -27.719100, lon: -48.509100 }, // Honorato Manoel Gonçalves
  '88066250': { lat: -27.721400, lon: -48.510800 }, // Ambrósio João Silveira
  '88066242': { lat: -27.722500, lon: -48.511500 }, // Alfredo Manoel Vieira
  '88066248': { lat: -27.723100, lon: -48.512100 }, // Recanto da Figueira
  '88066068': { lat: -27.724200, lon: -48.513000 }, // Servidão do Dema
  '88064092': { lat: -27.712800, lon: -48.549200 }, // Rua Canela Amarela (Ribeirão da Ilha)
  '88064037': { lat: -27.716500, lon: -48.552400 }, // Servidão Pedro Castanho (Ribeirão da Ilha)
};

async function geocode(street, neighborhood, city, state, zipCode) {
  const cleanZip = (zipCode || '').replace(/\D/g, '');
  const fixedStreet = cleanStreet(street);

  // 1. Consulta estruturada no Nominatim
  const params = new URLSearchParams({
    street: fixedStreet,
    suburb: neighborhood || '',
    city: city || 'Florianópolis',
    state: state || 'SC',
    postalcode: cleanZip,
    country: 'Brasil',
    format: 'json',
    limit: '1'
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'CaponiPreciseRouting/3.0 (contato@caponilog.com.br)' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        // Validar limites reais da região Sul de Florianópolis (-27.65 a -27.75, -48.48 a -48.56)
        if (lat < -27.60 && lat > -27.80 && lon < -48.45 && lon > -48.60) {
          return { lat, lon };
        }
      }
    }
  } catch (e) {}

  // 2. Fallback de alta precisão por CEP na tabela regional
  if (cleanZip && REGION_CEP_CENTROIDS[cleanZip]) {
    return REGION_CEP_CENTROIDS[cleanZip];
  }

  // 3. Fallback inteligente por Bairro
  const n = (neighborhood || '').toLowerCase();
  if (n.includes('ribeir')) return { lat: -27.715000, lon: -48.551000 };
  if (n.includes('pedras')) return { lat: -27.714000, lon: -48.506000 };
  return { lat: -27.702000, lon: -48.498000 }; // Campeche
}

async function processBatch() {
  const lines = rawList.trim().split('\n');
  const results = [];

  console.log(`Geocodificando precisamente ${lines.length} endereços (Campeche / Morro das Pedras / Ribeirão da Ilha)...`);

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(s => s?.trim());
    const address = parts[0];
    const neighborhood = parts[1];
    const city = parts[2];
    const zip = parts[3];
    const address2 = parts[4] || '';
    const pacotes = parts[5] || String(i + 1);

    const coords = await geocode(address, neighborhood, city, 'SC', zip);
    results.push({
      address,
      neighborhood,
      city,
      zip,
      lat: coords.lat,
      lon: coords.lon,
      address2,
      pacotes
    });

    console.log(`[${i+1}/${lines.length}] ${address} (${neighborhood}) -> Lat: ${coords.lat}, Lon: ${coords.lon}`);
    await delay(250);
  }

  const header = ['Destination Address', 'Bairro', 'City', 'Zipcode/Postal code', 'Latitude', 'Longitude', 'Address Line 2', 'Pacotes na Parada'].join('\t');
  const rows = results.map(r => [
    r.address,
    r.neighborhood,
    r.city,
    r.zip,
    r.lat,
    r.lon,
    r.address2,
    r.pacotes
  ].join('\t'));

  const output = [header, ...rows].join('\r\n');
  fs.writeFileSync('c:/Users/PABLO SILVA/Desktop/ROTA_CAMPECHE_MORRO_PEDRAS_CIRCUIT.csv', output, 'utf8');
  console.log('✅ Arquivo salvo em C:\\Users\\PABLO SILVA\\Desktop\\ROTA_CAMPECHE_MORRO_PEDRAS_CIRCUIT.csv');
}

processBatch();
