export const MARKET_SOURCE = 'https://getmarkethistory.com';
const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

export function normalizeTicker(value) {
  const ticker = String(value ?? '').trim().toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) throw new Error('Ingresá un símbolo válido de EE.UU. o un ADR, por ejemplo AAPL o YPF.');
  return ticker;
}

export function parseHistory(body, ticker) {
  const bars = String(body).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
    .filter(row => row.symbol === ticker && Number.isFinite(row.close) && row.close > 0 &&
      Number.isFinite(row.volume) && row.volume >= 0 && Number.isFinite(Date.parse(row.timestamp)))
    .map(row => ({ timestamp: row.timestamp, close: row.close, volume: row.volume,
      open: Number.isFinite(row.open) ? row.open : row.close,
      high: Number.isFinite(row.high) ? row.high : row.close,
      low: Number.isFinite(row.low) ? row.low : row.close }));
  bars.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (!bars.length) throw new Error(`No hay barras disponibles para ${ticker}.`);
  return bars.slice(-100);
}

export async function fetchHistory(ticker, signal) {
  const symbol = normalizeTicker(ticker);
  const response = await fetch(`${MARKET_SOURCE}/api/v1/bars/stocks/us/${encodeURIComponent(symbol)}/1h`, { signal });
  if (response.status === 404) throw new Error(`No se encontró ${symbol} entre las acciones de EE.UU. y ADR.`);
  if (!response.ok) throw new Error(`El proveedor respondió ${response.status}. Intentá otra vez más tarde.`);
  return parseHistory(await response.text(), symbol);
}

export function parseStockSearch(body) {
  if (!Array.isArray(body?.results)) return [];
  return body.results.filter(row => row.dataset === 'stocks/us' && row.status === 'active')
    .map(row => {
      try { return { ticker: normalizeTicker(row.ticker), name: String(row.name || row.ticker) }; }
      catch { return null; }
    }).filter(Boolean).slice(0, 12);
}

export async function searchStocks(query, signal) {
  const term = String(query ?? '').trim().slice(0, 60);
  if (!term) return [];
  const parameters = new URLSearchParams({ q: term, dataset: 'stocks/us', status: 'active', limit: '12' });
  const response = await fetch(`${MARKET_SOURCE}/api/v1/search?${parameters}`, { signal });
  if (!response.ok) throw new Error('No se pudo consultar el catálogo de acciones.');
  return parseStockSearch(await response.json());
}

export function normalizePosition(ticker, quantity, averageCost) {
  const symbol = normalizeTicker(ticker);
  const units = Number(quantity);
  const cost = Number(averageCost);
  if (!Number.isFinite(units) || units <= 0 || !Number.isFinite(cost) || cost < 0) {
    throw new Error('Ingresá una cantidad mayor que cero y un costo promedio válido.');
  }
  return { ticker: symbol, quantity: units, averageCost: cost };
}

export function readPortfolio(value) {
  if (!Array.isArray(value)) return [];
  const positions = [];
  for (const item of value.slice(0, 12)) {
    try { positions.push(normalizePosition(item.ticker, item.quantity, item.averageCost)); }
    catch { /* Se ignoran entradas dañadas del almacenamiento local. */ }
  }
  return positions;
}

export function positionValue(position, close) {
  const cost = position.quantity * position.averageCost;
  const value = position.quantity * close;
  return { cost, value, profit: value - cost, profitPercent: cost > 0 ? (value - cost) / cost * 100 : null };
}
