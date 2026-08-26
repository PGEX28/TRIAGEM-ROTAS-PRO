-- =============================================
-- SEED DATA — Sistema Caponi
-- Dados de demonstração realistas
-- =============================================

-- Organização
INSERT INTO organizations (id, name, city, state) VALUES
('00000000-0000-0000-0000-000000000001', 'Caponi Logística', 'Florianópolis', 'SC');

-- Configurações
INSERT INTO settings (organization_id, operation_name, city, state, auto_print, sound_enabled, auto_group, ocr_min_confidence) VALUES
('00000000-0000-0000-0000-000000000001', 'Triagem Florianópolis', 'Florianópolis', 'SC', false, true, true, 60);

-- NOTA: usuários devem ser criados via Supabase Auth.
-- Os IDs abaixo são placeholders para o seed.
-- Execute o seed APÓS criar os usuários no dashboard Supabase.

-- Endereços (normalizado)
INSERT INTO addresses (id, organization_id, street, number, complement, neighborhood, city, state, zip_code, normalized_key) VALUES
('addr-0001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rua Corruíras', '170', 'Prédio cinza', 'Campeche', 'Florianópolis', 'SC', '88063-091', 'rua corruiras 170 campeche florianopolis sc 88063091'),
('addr-0002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Servidão Águia Dourada', '61', 'Casa 2', 'Campeche', 'Florianópolis', 'SC', '88063-000', 'servidao aguia dourada 61 campeche florianopolis sc 88063000'),
('addr-0003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rua Deputado Antônio Edu Vieira', '1200', 'Apto 302', 'Pantanal', 'Florianópolis', 'SC', '88040-001', 'rua deputado antonio edu vieira 1200 pantanal florianopolis sc 88040001'),
('addr-0004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Avenida Pequeno Príncipe', '88', NULL, 'Campeche', 'Florianópolis', 'SC', '88063-100', 'avenida pequeno principe 88 campeche florianopolis sc 88063100'),
('addr-0005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rua João Pio Duarte Silva', '404', 'Bloco B, Apto 12', 'Córrego Grande', 'Florianópolis', 'SC', '88037-000', 'rua joao pio duarte silva 404 corrego grande florianopolis sc 88037000'),
('addr-0006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rodovia SC-405', '3200', 'Prédio principal', 'Rio Tavares', 'Florianópolis', 'SC', '88048-301', 'rodovia sc405 3200 rio tavares florianopolis sc 88048301'),
('addr-0007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rua Lauro Linhares', '589', NULL, 'Trindade', 'Florianópolis', 'SC', '88036-002', 'rua lauro linhares 589 trindade florianopolis sc 88036002'),
('addr-0008-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Servidão Dona Benta', '25', 'Casa', 'Armação do Pântano do Sul', 'Florianópolis', 'SC', '88066-000', 'servidao dona benta 25 armacao pantano sul florianopolis sc 88066000'),
('addr-0009-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rua das Acácias', '78', 'Fundos', 'Lagoa da Conceição', 'Florianópolis', 'SC', '88062-000', 'rua das acacias 78 lagoa da conceicao florianopolis sc 88062000'),
('addr-0010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Travessa Anita Garibaldi', '15', NULL, 'Centro', 'Florianópolis', 'SC', '88010-000', 'travessa anita garibaldi 15 centro florianopolis sc 88010000');
