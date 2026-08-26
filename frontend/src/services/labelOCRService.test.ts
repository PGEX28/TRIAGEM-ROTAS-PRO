import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDestinatarioBlock, parseLabelText } from './labelOCRService.ts';

test('prioriza a janela do CEP em etiqueta Temu sem cabeçalho de destinatário', () => {
  const result = parseLabelText([
    'TEMU',
    'Elementary Innovation Pte. Ltd.',
    'Serviço: express',
    'Lilian Dias',
    '5199255****',
    '88063-000 Florianópolis SC BRAZIL',
    'Servidao aguia dourada 61 Casa 2 Av Pequeno',
    'Príncipe Campeche',
    'AJ260811130407301',
    'REMETENTE',
    'Foshan Wanwei Sub-warehouse',
  ].join('\n'));

  assert.ok(result);
  assert.equal(result.recipientName, 'Lilian Dias');
  assert.equal(result.zipCode, '88063-000');
  assert.equal(result.street, 'Servidao aguia dourada');
  assert.equal(result.neighborhood, 'Campeche');
});

test('extrai o endereço Temu mesmo sem a âncora DESTINATÁRIO', () => {
  const result = parseDestinatarioBlock([
    'Lilian Dias',
    '5199255****',
    '88063-000 Florianópolis SC BRAZIL',
    'Servidao aguia dourada 61 Casa 2 Av Pequeno',
    'Príncipe Campeche',
  ].join('\n'));

  assert.ok(result);
  assert.equal(result.recipientName, 'Lilian Dias');
  assert.equal(result.zipCode, '88063-000');
  assert.equal(result.street, 'Servidao aguia dourada');
  assert.equal(result.number, '61');
  assert.equal(result.complement, 'Casa 2 Av Pequeno Príncipe');
  assert.equal(result.neighborhood, 'Campeche');
  assert.equal(result.city, 'Florianópolis');
  assert.equal(result.state, 'SC');
});

test('separa os campos do endereço Shein', () => {
  const result = parseDestinatarioBlock([
    'Camille Walendorff',
    'Rua Corruíras prédio cinza',
    '170',
    'R Corruíras/Campeche',
    'Florianópolis/SC',
    'CEP: 88063091',
  ].join('\n'));

  assert.ok(result);
  assert.equal(result.recipientName, 'Camille Walendorff');
  assert.equal(result.zipCode, '88063-091');
  assert.equal(result.street, 'Rua Corruíras');
  assert.equal(result.number, '170');
  assert.equal(result.complement, 'prédio cinza');
  assert.equal(result.neighborhood, 'Campeche');
  assert.equal(result.city, 'Florianópolis');
  assert.equal(result.state, 'SC');
});
