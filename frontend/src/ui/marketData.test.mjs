import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTicker, parseHistory, parseStockSearch, normalizePosition, readPortfolio, positionValue } from './marketData.mjs';

test('acepta símbolos y descarta datos de mercado inválidos', () => {
  assert.equal(normalizeTicker(' ypf '), 'YPF');
  assert.throws(() => normalizeTicker('AAPL/otro'), /símbolo válido/);
  const body = [
    { symbol: 'AAPL', timestamp: '2026-11-10T14:00:00Z', close: 210, volume: 100 },
    { symbol: 'AAPL', timestamp: '2026-11-10T15:00:00Z', close: null, volume: 110 },
    { symbol: 'MSFT', timestamp: '2026-11-10T16:00:00Z', close: 320, volume: 200 },
    { symbol: 'AAPL', timestamp: '2026-11-10T16:00:00Z', close: 211, volume: 120 }
  ].map(JSON.stringify).join('\n');
  assert.deepEqual(parseHistory(body, 'AAPL').map(bar => bar.close), [210, 211]);
});

test('la cartera valida cantidades y calcula el resultado por posición', () => {
  assert.deepEqual(normalizePosition(' aapl ', '2.5', '100'), { ticker: 'AAPL', quantity: 2.5, averageCost: 100 });
  assert.throws(() => normalizePosition('AAPL', 0, 100), /cantidad/);
  assert.equal(readPortfolio([{ ticker: 'AAPL', quantity: 2, averageCost: 100 }, { ticker: 'BAD/', quantity: 1, averageCost: 1 }]).length, 1);
  assert.deepEqual(positionValue({ quantity: 2, averageCost: 100 }, 120), { cost: 200, value: 240, profit: 40, profitPercent: 20 });
});

test('el buscador ofrece cualquier acción activa del catálogo de EE.UU.', () => {
  const result = parseStockSearch({ results: [
    { dataset: 'stocks/us', status: 'active', ticker: 'TSLA', name: 'Tesla, Inc.' },
    { dataset: 'stocks/us', status: 'inactive', ticker: 'OLD', name: 'Old Inc.' },
    { dataset: 'crypto/spot', status: 'active', ticker: 'BTCUSDT', name: 'Bitcoin' }
  ] });
  assert.deepEqual(result, [{ ticker: 'TSLA', name: 'Tesla, Inc.' }]);
});
