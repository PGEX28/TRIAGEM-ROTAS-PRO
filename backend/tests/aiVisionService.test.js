const assert = require('node:assert/strict');
const test = require('node:test');

const { extractAddressWithAI } = require('../dist/services/AIVisionService.js');

test('sends a label image to the vision model and returns a normalized delivery address', async () => {
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recipientName: 'Lilian Dias',
          zipCode: '88063000',
          street: 'Servidão Águia Dourada',
          number: '61',
          complement: 'Casa 2',
          neighborhood: 'Campeche',
          city: 'Florianópolis',
          state: 'SC',
          confidence: 93,
        }),
      }),
    };
  };

  const result = await extractAddressWithAI(
    'data:image/jpeg;base64,etiqueta',
    { apiKey: 'test-key', model: 'gpt-4o-mini' },
    fetchMock,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(result.recipientName, 'Lilian Dias');
  assert.equal(result.zipCode, '88063-000');
  assert.equal(result.street, 'Servidão Águia Dourada');
  assert.equal(result.number, '61');
  assert.equal(result.confidence, 93);
});

test('does not call the AI when an API key is unavailable', async () => {
  const result = await extractAddressWithAI('data:image/jpeg;base64,etiqueta', { apiKey: '' });

  assert.equal(result, null);
});

test('reads structured text from the raw Responses API output array', async () => {
  const fetchMock = async () => ({
    ok: true,
    json: async () => ({
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: JSON.stringify({
            recipientName: 'Camille Walendorff',
            zipCode: '88063091',
            street: 'Rua Corruíras',
            number: '170',
            complement: 'prédio cinza',
            neighborhood: 'Campeche',
            city: 'Florianópolis',
            state: 'SC',
            confidence: 95,
          }),
        }],
      }],
    }),
  });

  const result = await extractAddressWithAI(
    'data:image/jpeg;base64,etiqueta',
    { apiKey: 'test-key', model: 'gpt-4o-mini' },
    fetchMock,
  );

  assert.equal(result?.recipientName, 'Camille Walendorff');
  assert.equal(result?.zipCode, '88063-091');
});
