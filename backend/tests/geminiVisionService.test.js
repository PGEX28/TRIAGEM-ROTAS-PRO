const assert = require('node:assert/strict');
const test = require('node:test');

const { extractAddressWithGemini } = require('../dist/services/GeminiVisionService.js');

test('sends the label image to Gemini and returns the delivery address', async () => {
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                recipientName: 'Camille Walendorff',
                zipCode: '88063091',
                street: 'Rua Corruíras',
                number: '170',
                complement: 'prédio cinza',
                neighborhood: 'Campeche',
                city: 'Florianópolis',
                state: 'SC',
                confidence: 94,
              }),
            }],
          },
        }],
      }),
    };
  };

  const result = await extractAddressWithGemini(
    'data:image/jpeg;base64,etiqueta',
    { apiKey: 'gemini-test-key', model: 'gemini-2.5-flash' },
    fetchMock,
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /models\/gemini-2.5-flash:generateContent$/);
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'gemini-test-key');
  assert.equal(result?.recipientName, 'Camille Walendorff');
  assert.equal(result?.zipCode, '88063-091');
});
