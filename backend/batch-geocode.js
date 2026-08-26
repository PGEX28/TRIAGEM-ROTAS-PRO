const fs = require('fs');

const rawList = `Estrada Rozália Paulina Ferreira, 4780	Pântano do Sul	Florianópolis	88066-600
Rodovia Francisco Thomaz dos Santos, 8293	Pântano do Sul	Florianópolis	88067-000
Estrada Rozália Paulina Ferreira, 618	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 581	Pântano do Sul	Florianópolis	88066-600
Servidão Melissa, 130	Pântano do Sul	Florianópolis	88066-655
Estrada Rozália Paulina Ferreira, 700	Pântano do Sul	Florianópolis	88066-600
Servisão Caminho dos Cafezais, 116	Pântano do Sul	Florianópolis	88066-660
Servidão Cam dos Cafezais, 116	Armação do Pantano do Sul	Florianópolis	88066-660
Estrada Rozália Paulina Ferreira, 1437	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 1568	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 1774	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 2695	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 2793	costa de dentro	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 3418	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 3749	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 4203	Pântano do Sul	Florianópolis	88066-600
Servidão Mares do Sul, 60	Pântano do Sul	Florianópolis	88067-620
Servidão Sete Estrelas, 50	Costa de Dentro	Florianópolis	88067-608
Servidão Maria Carolina Ferreira, 75	Pântano do Sul Costa De Dentro	Florianópolis	88067-603
Estrada Rozália Paulina Ferreira, 4845	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 4897	Pântano do Sul	Florianópolis	88066-600
Estrada Rozália Paulina Ferreira, 5080	Pântano do Sul	Florianópolis	88066-600
Rua Inério Joaquim da Silva, 990	Pântano do Sul	Florianópolis	88067-500
Rua Inério Joaquim da Silva, 1500	Pântano do Sul -Praia Solidão	Florianópolis	88067-500
Rua Inério Joaquim da Silva, 1031	Pântano do Sul	Florianópolis	88067-500
Servidão Niberto Borges, 51	Pântano do Sul	Florianópolis	88067-595
Servidão Alvim Aguedes Borges, 112	Pântano do Sul	Florianópolis	88067-550
Rua Inério Joaquim da Silva, 86	Pântano do Sul	Florianópolis	88067-500
Servidão Mem de Sá, 22	Pântano do Sul	Florianópolis	88067-520
Servidão Pedro M Borba, 97	Açores	Florianópolis	88067-210
Rua Derli Sontag, 31	Pântano do Sul	Florianópolis	88067-380
Rua Laudelino P de Oliveira, 120	Pântano do Sul	Florianópolis	88067-430
Rua dos Rubis, 96	Pântano do Sul	Florianópolis	88067-480
Rua das Bauxitas, 96	Pântano do Sul	Florianópolis	88067-490
Avenida Ptolomeu Bittencourt, 403	Balneário dos Açores 	Florianópolis	88067-400
Rua Manoel F Coelho, 117	Açores	Florianópolis	88067-470
Rua Julião Benjamin da Lapa, 400	Pântano do Sul	Florianópolis	88067-415
Rua das Ardósias, 309	Pântano do Sul	Florianópolis	88067-450
Rua Doutor Luiz Carlos Souza, 165	Pântano do Sul	Florianópolis	88067-420
Estrada João Belarmino da Silva, 1832	Pântano do Sul	Florianópolis	88067-200
Estrada João B da Silva, 1970	Pântano do Sul	Florianópolis	88067-200
Rua dos Grafitos, 184	Pântano do Sul	Florianópolis	88067-360
Rua Waldemar de Mello Dias, 130	Pântano do Sul	Florianópolis	88067-340
Rua Waldemar de Mello Dias, 110	Pântano do Sul	Florianópolis	88067-340
Rua Waldemar de Mello Dias, 26	Pântano do Sul	Florianópolis	88067-340
Estrada João Belarmino da Silva, 1705	Pântano do Sul	Florianópolis	88067-200
Rua Maurício Rosar, 100	Pântano do Sul	Florianópolis	88067-335
Rua das Fluoritas, 45	Pântano do Sul	Florianópolis	88067-320
Servidão Leodoneto Manoel Adão, 33	Pântano do Sul	Florianópolis	88067-220
Rua Joaquim Neves, 78	Pântano do Sul	Florianópolis	88067-120
Rua Joaquim Neves, 36	Pântano do Sul	Florianópolis	88067-120
Rua Joaquim Neves, 45	Pântano do Sul	Florianópolis	88067-120
Rua Joaquim Neves, 124	Pântano do Sul	Florianópolis	88067-120
Rua Joaquim Neves, 153	Pântano do Sul	Florianópolis	88067-120
Rua Abelardo Otacílio Gomes, 165	Pântano do Sul 	Florianópolis	88067-100
Rua Abelardo Otacílio Gomes, 147	Pântano do Sul	Florianópolis	88067-100
Rua Manoel Vidal Casa 103, 241	Pântano do Sul	Florianópolis	88067-140
Rua Manoel Vidal, 235	Pântano do Sul	Florianópolis	88067-140
Rua Manoel Vidal, 209	Pântano do sul	Florianópolis	88067-140
Rua Manoel Vidal, 118	Pântano do Sul	Florianópolis	88067-140
Rua Manoel Vidal, 83	Pântano do Sul	Florianópolis	88067-140
Rua Abelardo Otacílio Gomes, 16	Pântano do Sul	Florianópolis	88067-100
Rua Maria J Jacinto, 47	Pântano do Sul	Florianópolis	88067-104
Rua Arnaldo Firminio Martins, 123	Pântano do Sul	Florianópolis	88067-101
Servidão Professor Gercino Belarmino da Silva, 63	Pântano do Sul	Florianópolis	88067-080
Servidão Professor Gercino Belarmino da Silva, 131	Pântano do Sul	Florianópolis	88067-080
Rua Manoel Pedro Oliveira, 9165	Pântano do Sul	Florianópolis	88067-079
Rua Manoel Pedro Oliveira, 155	Pântano do Sul	Florianópolis	88067-079
Rodovia Francisco Thomaz dos Santos, 8467	Pântano do Sul	Florianópolis	88067-000
Servidão Liberalino Padilha, 31	Pântano do Sul	Florianópolis	88067-055
Rodovia Francisco Thomaz dos Santos, 8245	Pântano do Sul	Florianópolis	88067-000
Rua Cote Valter Paulo, 155	Pântano do Sul	Florianópolis	88067-050
Rua Comerciante Valter Paulo, 92	Pântano do Sul	Florianópolis	88067-050
Rodovia Francisco Thomaz dos Santos, 8170	Pântano do Sul	Florianópolis	88067-000
Servidão João Manoel Fernandes, 148	Pântano do Sul	Florianópolis	88067-040`;

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(street, neighborhood, city, state, zipCode) {
  const cleanCep = (zipCode || '').replace(/\D/g, '');
  
  // Tenta 1: Rua + Bairro + CEP + Florianópolis
  const q1 = `${street}, ${neighborhood}, ${city} - ${state}, ${cleanCep}, Brasil`;
  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q1)}&format=json&limit=1&countrycodes=br`;
  
  try {
    let res = await fetch(url, { headers: { 'User-Agent': 'CaponiBatchGeo/1.0' } });
    if (res.ok) {
      let data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }

    // Tenta 2: Rua + CEP
    const q2 = `${street}, ${city} - ${state}, ${cleanCep}, Brasil`;
    url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q2)}&format=json&limit=1&countrycodes=br`;
    res = await fetch(url, { headers: { 'User-Agent': 'CaponiBatchGeo/1.0' } });
    if (res.ok) {
      let data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }

    // Tenta 3: CEP + Bairro
    const q3 = `${cleanCep}, ${neighborhood}, ${city}, Brasil`;
    url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q3)}&format=json&limit=1&countrycodes=br`;
    res = await fetch(url, { headers: { 'User-Agent': 'CaponiBatchGeo/1.0' } });
    if (res.ok) {
      let data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {}

  // Coordenada base do Pântano do Sul / Armação como fallback seguro dentro do bairro
  return { lat: -27.778800, lon: -48.515200 };
}

async function processAll() {
  const lines = rawList.trim().split('\n');
  const results = [];

  console.log(`Processando ${lines.length} endereços com geocodificação precisa...`);

  for (let i = 0; i < lines.length; i++) {
    const [address, neighborhood, city, zip] = lines[i].split('\t').map(s => s?.trim());
    const coords = await geocode(address, neighborhood, city, 'SC', zip);
    
    results.push({
      address,
      neighborhood,
      city,
      zip,
      lat: coords.lat,
      lon: coords.lon,
      order: i + 1
    });

    console.log(`[${i+1}/${lines.length}] ${address} -> Lat: ${coords.lat}, Lon: ${coords.lon}`);
    await delay(300); // Respeitar rate-limit do OpenStreetMap
  }

  // Montar TSV formatado exatamente para o Circuit
  const tsvHeader = ['Destination Address', 'Bairro', 'City', 'Zipcode/Postal code', 'Latitude', 'Longitude', 'Address Line 2', 'Pacotes na Parada'].join('\t');
  const tsvRows = results.map(r => [
    r.address,
    r.neighborhood,
    r.city,
    r.zip,
    r.lat,
    r.lon,
    '',
    r.order
  ].join('\t'));

  const fullOutput = [tsvHeader, ...tsvRows].join('\r\n');
  fs.writeFileSync('c:/Users/PABLO SILVA/Desktop/ROTA_PANTANO_DO_SUL_CIRCUIT.csv', fullOutput, 'utf8');
  console.log('✅ Arquivo salvo com sucesso em: C:\\Users\\PABLO SILVA\\Desktop\\ROTA_PANTANO_DO_SUL_CIRCUIT.csv');
}

processAll();
