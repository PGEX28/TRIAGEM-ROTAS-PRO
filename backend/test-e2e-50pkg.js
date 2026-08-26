const fs = require('fs');

// Dataset completo com 60 pacotes reais abrangendo Norte e Sul da Ilha de Florianópolis
const PACKAGES = [
  // ==========================================
  // 🏝️ SUL DA ILHA
  // ==========================================
  // Campeche
  { barcode: 'PKG-SUL-001', name: 'Ana Souza', street: 'Trav. Flor de Pérola', number: '60', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-160', complement: 'Ao lado do mercado Degane' },
  { barcode: 'PKG-SUL-002', name: 'João Melo', street: 'Rod. Francisco Magno Vieira', number: '4929', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88065-000', complement: 'Cx na conveniência' },
  { barcode: 'PKG-SUL-003', name: 'Pedro Lima', street: 'Trav. Jambolão', number: '55', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-023', complement: 'Segunda a sexta' },
  { barcode: 'PKG-SUL-004', name: 'Felipe Santos', street: 'Trav. Ibiza', number: '497', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-022', complement: 'Casa 3' },
  { barcode: 'PKG-SUL-005', name: 'Lúcia de Fátima Ramos', street: 'R. N. Sra. de Fátima', number: '359', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-020', complement: 'Casa 1 - Interfone 1' },
  { barcode: 'PKG-SUL-006', name: 'Bruno Xavier Martins', street: 'Rua Francisco Cândido Xavier', number: '415', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-027', complement: 'Portão de madeira' },
  { barcode: 'PKG-SUL-007', name: 'Gabriela Lopes', street: 'Rua Olindina M Lopes', number: '147', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-028', complement: 'Casa 01' },
  { barcode: 'PKG-SUL-008', name: 'Renata Castro', street: 'R. Coruja Dourada', number: '174', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-035', complement: 'Kit net' },
  { barcode: 'PKG-SUL-009', name: 'Mariana Peluso', street: 'R. Prof. Emanoel Paulo Peluso', number: '50', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-040', complement: 'Horário comercial' },
  { barcode: 'PKG-SUL-010', name: 'Camila Fernandes', street: 'Av. Tucumã', number: '77', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-139', complement: '' },
  { barcode: 'PKG-SUL-011', name: 'Letícia Cardoso', street: 'Rua Magnólia Branca', number: '41', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-170', complement: 'Portão preto ao lado' },
  { barcode: 'PKG-SUL-012', name: 'Vanessa Nogueira', street: 'Trav. Caraguatá', number: '29', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-140', complement: '' },
  { barcode: 'PKG-SUL-013', name: 'Guilherme Vargas', street: 'R. Aroeira do Campo', number: '30', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-280', complement: '' },
  { barcode: 'PKG-SUL-014', name: 'Tatiane Barbosa', street: 'R. Murta', number: '89', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-125', complement: '' },
  { barcode: 'PKG-SUL-015', name: 'Tereza Cristina Lopes', street: 'R. Tereza Lopes', number: '40', neighborhood: 'Campeche', city: 'Florianópolis', state: 'SC', zip_code: '88066-065', complement: 'Casa' },

  // Morro das Pedras & Armação
  { barcode: 'PKG-SUL-016', name: 'Carla Silveira', street: 'Rua Quimboas', number: '130', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-021', complement: 'Casa dos fundos' },
  { barcode: 'PKG-SUL-017', name: 'Gabriel Rodrigues', street: 'R. Francisco Vieira', number: '325', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-010', complement: 'Loja 01' },
  { barcode: 'PKG-SUL-018', name: 'Juliana Vieira Machado', street: 'R. Manoel P Vieira', number: '1255', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-100', complement: 'Loja 2 Farmácia' },
  { barcode: 'PKG-SUL-019', name: 'Clara Schmidt', street: 'Rua Sta Clara', number: '180', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-051', complement: 'Casa 2' },
  { barcode: 'PKG-SUL-020', name: 'Eduardo Conchas', street: 'Rua das Conchas', number: '60', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-110', complement: 'Casa à direita' },
  { barcode: 'PKG-SUL-021', name: 'Maria Caetana Rita', street: 'R. Maria Caetana Rita', number: '177', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-103', complement: '' },
  { barcode: 'PKG-SUL-022', name: 'Nilton Paulo de Jesus', street: 'Rua Nilton P de Jesus', number: '106', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-079', complement: 'Casa' },
  { barcode: 'PKG-SUL-023', name: 'Thomaz Santos Jr', street: 'Rua Francisco Thomaz dos Santos', number: '1797', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-000', complement: 'Próx Escola José Amaro' },
  { barcode: 'PKG-SUL-024', name: 'Honorato Manoel Gonçalves', street: 'Rua Honorato Manoel Gonçalves', number: '97', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-095', complement: 'Fundos casa laranja' },
  { barcode: 'PKG-SUL-025', name: 'Ambrósio João Silveira', street: 'R. Ambrósio João Silveira', number: '319', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-250', complement: 'Casa' },
  { barcode: 'PKG-SUL-026', name: 'Alfredo Manoel Vieira', street: 'Rua Alfredo M Vieira', number: '174', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-242', complement: '' },
  { barcode: 'PKG-SUL-027', name: 'Priscila Figueira', street: 'Rua Recanto da Figueira', number: '87', neighborhood: 'Morro das Pedras', city: 'Florianópolis', state: 'SC', zip_code: '88066-248', complement: 'Apto 01 - Próx ao Bistek' },
  { barcode: 'PKG-SUL-028', name: 'Leodoneto Manoel Adão', street: 'Rua Leodoneto Manoel Adão', number: '142', neighborhood: 'Armação do Pântano do Sul', city: 'Florianópolis', state: 'SC', zip_code: '88066-220', complement: 'Casa amarela' },
  { barcode: 'PKG-SUL-029', name: 'Liberalino Padilha', street: 'R. Liberalino Padilha', number: '55', neighborhood: 'Armação do Pântano do Sul', city: 'Florianópolis', state: 'SC', zip_code: '88066-055', complement: '' },

  // Pântano do Sul & Ribeirão da Ilha
  { barcode: 'PKG-SUL-030', name: 'Pedro Castanho Filho', street: 'Rua Pedro Castanho', number: '694', neighborhood: 'Ribeirão da Ilha', city: 'Florianópolis', state: 'SC', zip_code: '88064-037', complement: '' },
  { barcode: 'PKG-SUL-031', name: 'Rozália Ferreira', street: 'Estrada Rozália Paulina Ferreira', number: '4780', neighborhood: 'Pântano do Sul', city: 'Florianópolis', state: 'SC', zip_code: '88066-600', complement: 'Esmalteria' },
  { barcode: 'PKG-SUL-032', name: 'Mares do Sul Pousada', street: 'R. Mares do Sul', number: '80', neighborhood: 'Pântano do Sul', city: 'Florianópolis', state: 'SC', zip_code: '88067-620', complement: 'Recepção' },

  // ==========================================
  // 🏖️ NORTE DA ILHA
  // ==========================================
  // Ingleses do Rio Vermelho
  { barcode: 'PKG-NOR-033', name: 'Marcos Armando Bulos', street: 'Rod. Armando Calil Bulos', number: '5400', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-001', complement: 'Loja 04 Comercial' },
  { barcode: 'PKG-NOR-034', name: 'Patrícia Dom Becker', street: 'Estrada Dom João Becker', number: '850', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-600', complement: 'Apto 204 Bloco B' },
  { barcode: 'PKG-NOR-035', name: 'José Manoel Pacífico', street: 'Rua José Manoel Pacífico', number: '116', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-116', complement: 'Casa portão branco' },
  { barcode: 'PKG-NOR-036', name: 'Cláudio Botafogo', street: 'R. Botafogo dos Ingleses', number: '340', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-073', complement: 'Sobrado 2' },
  { barcode: 'PKG-NOR-037', name: 'Luciana Floresta', street: 'Rua Floresta', number: '88', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-643', complement: '' },
  { barcode: 'PKG-NOR-038', name: 'Manoel Laureano', street: 'R. Manoel Laureano dos Santos', number: '210', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-445', complement: 'Casa dos fundos' },
  { barcode: 'PKG-NOR-039', name: 'Fábio Veredas', street: 'Rua Veredas', number: '75', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-333', complement: 'Casa 01' },
  { barcode: 'PKG-NOR-040', name: 'Tatiana Saguis', street: 'R. dos Saguis', number: '150', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-498', complement: '' },
  { barcode: 'PKG-NOR-041', name: 'Três Marias Residencial', street: 'Rua Três Marias', number: '412', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-200', complement: 'Interfone 101' },
  { barcode: 'PKG-NOR-042', name: 'Caminho do Mar Cond.', street: 'R. Caminho do Mar', number: '95', neighborhood: 'Ingleses do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88058-520', complement: 'Portaria' },

  // São João do Rio Vermelho
  { barcode: 'PKG-NOR-043', name: 'Gualberto Soares Mercado', street: 'Rod. João Gualberto Soares', number: '7200', neighborhood: 'São João do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88060-000', complement: 'Mercado Rio Vermelho' },
  { barcode: 'PKG-NOR-044', name: 'Dário Manoel Ferreira', street: 'Rua Dário Manoel Ferreira', number: '190', neighborhood: 'São João do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88060-400', complement: 'Casa verde' },
  { barcode: 'PKG-NOR-045', name: 'Manoel Cezário Coelho', street: 'R. Manoel Cezário Coelho', number: '315', neighborhood: 'São João do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88060-421', complement: 'Casa 3' },
  { barcode: 'PKG-NOR-046', name: 'Cândido Pereira Santos', street: 'Rua Cândido Pereira dos Santos', number: '82', neighborhood: 'São João do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88060-350', complement: '' },
  { barcode: 'PKG-NOR-047', name: 'Manoel Rafael da Silva', street: 'R. Manoel Rafael da Silva', number: '410', neighborhood: 'São João do Rio Vermelho', city: 'Florianópolis', state: 'SC', zip_code: '88060-380', complement: 'Oficina mecânica' },

  // Canasvieiras, Cachoeira & Ponta das Canas
  { barcode: 'PKG-NOR-048', name: 'Nações Hotel', street: 'Av. das Nações', number: '620', neighborhood: 'Canasvieiras', city: 'Florianópolis', state: 'SC', zip_code: '88054-010', complement: 'Recepção Hotel' },
  { barcode: 'PKG-NOR-049', name: 'Milton Leite da Costa', street: 'Av. Milton Leite da Costa', number: '450', neighborhood: 'Canasvieiras', city: 'Florianópolis', state: 'SC', zip_code: '88054-000', complement: 'Apto 302' },
  { barcode: 'PKG-NOR-050', name: 'Madre Maria Vilac', street: 'Av. Madre Maria Vilac', number: '1280', neighborhood: 'Canasvieiras', city: 'Florianópolis', state: 'SC', zip_code: '88054-001', complement: 'Restaurante' },
  { barcode: 'PKG-NOR-051', name: 'Antenor Borges', street: 'Rua Antenor Borges', number: '205', neighborhood: 'Canasvieiras', city: 'Florianópolis', state: 'SC', zip_code: '88054-070', complement: 'Casa 2 fundos' },
  { barcode: 'PKG-NOR-052', name: 'Vila Esperança', street: 'R. Vila Esperança', number: '78', neighborhood: 'Canasvieiras', city: 'Florianópolis', state: 'SC', zip_code: '88054-150', complement: '' },
  { barcode: 'PKG-NOR-053', name: 'Luiz Boiteux Piazza', street: 'Av. Luiz Boiteux Piazza', number: '3100', neighborhood: 'Cachoeira do Bom Jesus', city: 'Florianópolis', state: 'SC', zip_code: '88056-000', complement: 'Condomínio Sol Nascente' },
  { barcode: 'PKG-NOR-054', name: 'Manoel Firmiano', street: 'Rua Manoel Firmiano', number: '94', neighborhood: 'Ponta das Canas', city: 'Florianópolis', state: 'SC', zip_code: '88056-751', complement: 'Pousada Ponta' },
  { barcode: 'PKG-NOR-055', name: 'Pescadores Vila', street: 'R. dos Pescadores', number: '112', neighborhood: 'Ponta das Canas', city: 'Florianópolis', state: 'SC', zip_code: '88056-700', complement: 'Peixaria' },

  // Jurerê Internacional & Ratones
  { barcode: 'PKG-NOR-056', name: 'Maurício Sirotsky Sobrinho', street: 'Rod. Maurício Sirotsky Sobrinho', number: '2500', neighborhood: 'Jurerê', city: 'Florianópolis', state: 'SC', zip_code: '88053-700', complement: 'Posto Ipiranga' },
  { barcode: 'PKG-NOR-057', name: 'Búzios Mansão', street: 'Av. dos Búzios', number: '1800', neighborhood: 'Jurerê Internacional', city: 'Florianópolis', state: 'SC', zip_code: '88053-300', complement: 'Residência' },
  { barcode: 'PKG-NOR-058', name: 'Lagostas Villa', street: 'Av. das Lagostas', number: '340', neighborhood: 'Jurerê Internacional', city: 'Florianópolis', state: 'SC', zip_code: '88053-330', complement: '' },
  { barcode: 'PKG-NOR-059', name: 'Dourados Casa', street: 'Av. dos Dourados', number: '510', neighborhood: 'Jurerê Internacional', city: 'Florianópolis', state: 'SC', zip_code: '88053-310', complement: 'Casa com jardim' },
  { barcode: 'PKG-NOR-060', name: 'Maria Odília Ramos', street: 'Rua Maria Odília Ramos', number: '650', neighborhood: 'Ratones', city: 'Florianópolis', state: 'SC', zip_code: '88052-100', complement: 'Sítio Recanto Verde' },
];

const FLORIPA_OFFICIAL_STREETS = {
  // Sul da Ilha
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
  'francisco candido xavier': 'Servidão Francisco Cândido Xavier',
  'alfredo m vieira': 'Servidão Alfredo Manoel Vieira',
  'recanto da figueira': 'Servidão Recanto da Figueira',
  'nilton p de jesus': 'Servidão Nilton Pedro de Jesus',
  'honorato manoel goncalves': 'Servidão Honorato Manoel Gonçalves',
  'santa clara': 'Servidão Santa Clara',
  'sta clara': 'Servidão Santa Clara',
  'das conchas': 'Servidão das Conchas',
  'pedro castanho': 'Servidão Pedro Castanho',
  'mares do sul': 'Servidão Mares do Sul',
  'sete estrelas': 'Servidão Sete Estrelas',
  'maria carolina ferreira': 'Servidão Maria Carolina Ferreira',
  'niberto borges': 'Servidão Niberto Borges',
  'alvim aguedes borges': 'Servidão Alvim Aguedes Borges',
  'mem de sa': 'Servidão Mem de Sá',
  'pedro m borba': 'Servidão Pedro Manoel Borba',
  'leodoneto manoel adao': 'Servidão Leodoneto Manoel Adão',
  'liberalino padilha': 'Servidão Liberalino Padilha',
  'joao manoel fernandes': 'Servidão João Manoel Fernandes',
  'gercino belarmino': 'Servidão Professor Gercino Belarmino',
  'melissa': 'Servidão Melissa',
  'pequeno principe': 'Avenida Pequeno Príncipe',
  'campeche': 'Avenida Campeche',
  'tucuma': 'Avenida Tucumã',
  'francisco magno vieira': 'Rodovia Francisco Magno Vieira',
  'francisco thomaz dos santos': 'Rodovia Francisco Thomaz dos Santos',
  'baldicero filomeno': 'Rodovia Baldicero Filomeno',
  'rozalia paulina ferreira': 'Estrada Rozália Paulina Ferreira',
  'nossa senhora de fatima': 'Rua Nossa Senhora de Fátima',
  'manoel pedro vieira': 'Rua Manoel Pedro Vieira',
  'manoel p vieira': 'Rua Manoel Pedro Vieira',
  'francisco vieira': 'Rua Francisco Vieira',
  'prof emanoel paulo peluso': 'Rua Professor Emanoel Paulo Peluso',
  'aroeira do campo': 'Rua Aroeira do Campo',
  'murta': 'Rua Murta',
  'tereza lopes': 'Rua Tereza Lopes',
  'maria caetana rita': 'Rua Maria Caetana Rita',
  'sagrado coracao de jesus': 'Rua Sagrado Coração de Jesus',
  'ambrosio joao silveira': 'Rua Ambrósio João Silveira',

  // Norte da Ilha
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
};

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com']);

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function extractStreetCore(street) {
  return street
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(r\.|r|rua|av\.|av|avn\.|aven\.|avenida|serv\.|serv|sd\.|sv\.|servidao|servidão|trav\.|trav|tv\.|tv|travessa|rod\.|rod|rodv\.|rodovia|est\.|estr\.|est|estrada|al\.|al|alameda|pça\.|pça|pc\.|pc|praca|praça|cond\.|cond|condominio|condomínio)\s+/i, '')
    .replace(/[,\.;:'"()\/#!@$%^&*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandStreetName(street) {
  if (!street) return '';
  let s = street.trim();

  // 1. Dicionário Oficial de Floripa
  const core = extractStreetCore(s);
  if (FLORIPA_OFFICIAL_STREETS[core]) {
    return FLORIPA_OFFICIAL_STREETS[core];
  }

  // 2. Prefixos gerais
  const prefixMap = [
    [/^(r\.|r|rua)\s+/i, 'Rua '],
    [/^(av\.|av|avn\.|aven\.|avenida)\s+/i, 'Avenida '],
    [/^(serv\.|serv|sd\.|sv\.|servidao|servidão)\s+/i, 'Servidão '],
    [/^(trav\.|trav|tv\.|tv|travessa)\s+/i, 'Travessa '],
    [/^(rod\.|rod|rodv\.|rodovia)\s+/i, 'Rodovia '],
    [/^(est\.|estr\.|est|estrada)\s+/i, 'Estrada '],
    [/^(al\.|al|alameda)\s+/i, 'Alameda '],
    [/^(pça\.|pça|pc\.|pc|praca|praça)\s+/i, 'Praça '],
    [/^(cond\.|cond|condominio|condomínio)\s+/i, 'Condomínio '],
  ];

  for (const [regex, replacement] of prefixMap) {
    if (regex.test(s)) {
      s = s.replace(regex, replacement);
      break;
    }
  }

  const expansions = [
    [/\b(nossa\s+sra\.?|n\.?\s*sra\.?|n\.?\s*sa\.?|n\.?\s*s\.)\s+/gi, 'Nossa Senhora '],
    [/\bsta\.?\s+/gi, 'Santa '],
    [/\bsto\.?\s+/gi, 'Santo '],
    [/\bs\.\s*(francisco|pedro|josé|jose|joão|joao|sebastião|sebastiao|bento|marcos|lucas|mateus|paulo|tomé|tome|caetano|cristóvão|cristovao|brás|bras)\b/gi, 'São $1'],
    [/\bprof\.\s+/gi, 'Professor '],
    [/\bprofa\.\s+/gi, 'Professora '],
    [/\bdr\.\s+/gi, 'Doutor '],
    [/\bdra\.\s+/gi, 'Doutora '],
  ];

  for (const [regex, replacement] of expansions) {
    s = s.replace(regex, replacement);
  }

  s = s.replace(/\s+/g, ' ').trim();
  return toTitleCase(s);
}

function normalizeZipCode(zip) {
  const digits = (zip || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return zip ? zip.trim() : '';
}

function generateCleanCircuitFile() {
  const headers = [
    'Destination Address',
    'Address Line 2',
    'Bairro',
    'City',
    'State',
    'Zipcode/Postal code',
    'Pacotes na Parada',
  ];

  const stopMap = new Map();
  let stopCounter = 1;

  PACKAGES.forEach((pkg, index) => {
    const cleanStreet = expandStreetName(pkg.street);
    const cleanNumber = pkg.number.trim();
    const fullStreet = cleanNumber ? `${cleanStreet}, ${cleanNumber}` : cleanStreet;
    const cleanNeighborhood = toTitleCase(pkg.neighborhood);
    const cleanCity = toTitleCase(pkg.city);
    const cleanState = pkg.state.toUpperCase().trim();
    const cleanZip = normalizeZipCode(pkg.zip_code);

    const key = `${cleanStreet.toLowerCase()}_${cleanNumber}_${cleanZip}`.replace(/\s+/g, '_');

    let stopInfo = stopMap.get(key);
    if (!stopInfo) {
      stopInfo = {
        stopNumber: stopCounter++,
        address: fullStreet,
        neighborhood: cleanNeighborhood,
        city: cleanCity,
        state: cleanState,
        zip: cleanZip,
        complements: [],
        packages: [],
      };
      stopMap.set(key, stopInfo);
    }

    const notePart = [pkg.complement, `Dest: ${pkg.name}`].filter(Boolean).join(' - ');
    if (notePart && !stopInfo.complements.includes(notePart)) {
      stopInfo.complements.push(notePart);
    }
    stopInfo.packages.push(index + 1);
  });

  const lines = [headers.join('\t')];

  stopMap.forEach((stop) => {
    const notes = stop.complements.join(' | ');
    const pkgDisplay = stop.packages.join(', ');

    const line = [
      stop.address,
      notes,
      stop.neighborhood,
      stop.city,
      stop.state,
      stop.zip,
      pkgDisplay,
    ].join('\t');

    lines.push(line);
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  fs.writeFileSync('c:/Users/PABLO SILVA/Desktop/PROJETO CAPONI/backend/TESTE_CIRCUIT_50_PACOTES_NORMALIZADOS.csv', csvContent, 'utf8');
  console.log(`✅ ${PACKAGES.length} pacotes gerados com sucesso abrangendo Norte e Sul da Ilha!`);
}

generateCleanCircuitFile();
