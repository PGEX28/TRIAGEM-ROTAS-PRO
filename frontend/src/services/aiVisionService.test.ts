import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldUseAIResult } from './aiVisionEligibility.ts';

test('uses AI output only when it has a reliable delivery field', () => {
  assert.equal(shouldUseAIResult({ recipientName: 'Lilian Dias', zipCode: '88063-000', confidence: 90 }), true);
  assert.equal(shouldUseAIResult({ recipientName: '', zipCode: '', confidence: 90 }), false);
  assert.equal(shouldUseAIResult({ recipientName: 'Lilian Dias', zipCode: '', confidence: 90 }), false);
  assert.equal(shouldUseAIResult({ recipientName: 'Lilian Dias', zipCode: '', confidence: 20 }), false);
});
