import { fetchHistory, searchStocks, normalizeTicker, normalizePosition, readPortfolio, positionValue, MARKET_SOURCE } from './marketData.mjs';
import './market-phone.css';

const STORAGE_KEY = 'martinquest-market-portfolio-v1';
const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const compact = value => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const signed = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const localTime = stamp => new Date(stamp).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

function histogram(svg, bars, key, color) {
  const values = bars.map(bar => bar[key]);
  const low = key === 'volume' ? 0 : Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const width = 344 / bars.length;
  svg.innerHTML = `<line x1="8" y1="128" x2="352" y2="128" stroke="#54737d" stroke-width="1"/>` +
    bars.map((bar, index) => {
      const height = Math.max(2, (bar[key] - low) / span * 104);
      return `<rect x="${(8 + index * width + 1).toFixed(2)}" y="${(128 - height).toFixed(2)}" width="${Math.max(1, width - 2).toFixed(2)}" height="${height.toFixed(2)}" fill="${color}" opacity="${index === bars.length - 1 ? 1 : .72}"/>`;
    }).join('') + `<text x="8" y="17" fill="#cdebe5" font-size="11">${key === 'volume' ? compact(high) : money(high)}</text>` +
    `<text x="8" y="145" fill="#9dc2bd" font-size="10">${localTime(bars[0].timestamp)}</text>` +
    `<text x="350" y="145" text-anchor="end" fill="#9dc2bd" font-size="10">${localTime(bars.at(-1).timestamp)}</text>`;
}

export default class MarketPhonePanel {
  constructor(keyboardPlugin) {
    this.keyboardPlugin = keyboardPlugin;
    this.opened = false;
    this.selected = 'AAPL';
    this.cache = new Map();
    this.controllers = new Set();
    this.prices = new Map();
    this.portfolio = [];
    try { this.portfolio = readPortfolio(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { /* El celular funciona aunque el almacenamiento local esté bloqueado. */ }

    this.root = document.createElement('div');
    this.root.className = 'market-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `<section class="market-phone" role="dialog" aria-modal="true" aria-labelledby="market-title">
      <header class="market-header"><div><span class="market-eyebrow">CUARTO DE MÁQUINAS · CELULAR</span><h2 id="market-title">Mercado y cartera</h2></div><button class="market-close" type="button" aria-label="Guardar celular">×</button></header>
      <nav class="market-tabs" aria-label="Secciones del celular"><button type="button" data-tab="market" aria-current="page">📊 Mercados</button><button type="button" data-tab="portfolio">💼 Mi cartera</button></nav>
      <main class="market-content">
        <div class="market-view" data-view="market">
          <form class="market-search"><label for="market-ticker">Buscá por empresa o símbolo de EE.UU.</label><div><input id="market-ticker" name="ticker" value="AAPL" autocomplete="off" maxlength="60" placeholder="Tesla, YPF, Microsoft…"><button type="submit">Consultar</button></div></form>
          <div class="market-search-results" role="listbox" aria-label="Acciones encontradas" hidden></div>
          <p class="market-catalog-note">Buscá acciones, ETF y ADR por nombre o símbolo.</p>
          <p class="market-message" role="status" aria-live="polite"></p>
          <div class="market-quote" hidden><div class="market-quote-top"><div><span class="market-symbol"></span><small>Acción / ADR · USD</small></div><strong class="market-last"></strong></div><div class="market-quote-meta"><span class="market-change"></span><span class="market-stamp"></span></div></div>
          <div class="market-charts" hidden><div class="market-chart-header"><strong>Precio de cierre · barras horarias</strong><select class="market-range" aria-label="Cantidad de barras"><option value="24">24 barras</option><option value="50" selected>50 barras</option><option value="100">100 barras</option></select></div><svg class="market-chart market-price-chart" viewBox="0 0 360 150" role="img" aria-label="Histograma de precios de cierre"></svg><strong class="market-volume-title">Volumen operado</strong><svg class="market-chart market-volume-chart" viewBox="0 0 360 150" role="img" aria-label="Histograma de volumen operado"></svg></div>
          <form class="market-add"><strong>Agregar a mi cartera</strong><div><label>Cantidad<input name="quantity" type="number" min="0.000001" step="any" placeholder="Ej. 2,5" required></label><label>Costo promedio USD<input name="averageCost" type="number" min="0" step="any" placeholder="Ej. 150" required></label></div><button type="submit">Guardar posición</button></form>
        </div>
        <div class="market-view" data-view="portfolio" hidden><p class="market-portfolio-note">Cartera de este navegador. Los valores usan la última barra disponible de cada símbolo.</p><p class="market-portfolio-message" role="status" aria-live="polite"></p><div class="market-portfolio-list"></div><div class="market-totals"></div></div>
      </main>
      <footer class="market-foot">Datos: <a href="${MARKET_SOURCE}" target="_blank" rel="noopener noreferrer">Market History</a> · barras horarias de EE.UU. con demora. Cartera local; no se envía al proveedor.</footer>
    </section>`;
    document.body.append(this.root);
    this.phone = this.root.querySelector('.market-phone');
    this.content = this.root.querySelector('.market-content');
    this.message = this.root.querySelector('.market-message');
    this.portfolioMessage = this.root.querySelector('.market-portfolio-message');
    this.search = this.root.querySelector('.market-search');
    this.searchResults = this.root.querySelector('.market-search-results');
    this.addForm = this.root.querySelector('.market-add');
    this.root.querySelector('.market-close').addEventListener('click', () => this.close());
    this.root.addEventListener('pointerdown', event => { if (event.target === this.root) this.close(); });
    this.root.querySelector('.market-tabs').addEventListener('click', event => {
      const button = event.target.closest('[data-tab]');
      if (button) this.switchTab(button.dataset.tab);
    });
    this.search.elements.ticker.addEventListener('input', () => {
      clearTimeout(this.searchTimer);
      const query = this.search.elements.ticker.value.trim();
      if (query.length < 2) { this.hideSearchResults(); return; }
      this.searchTimer = setTimeout(() => this.lookupSymbols(query), 250);
    });
    this.searchResults.addEventListener('click', event => {
      const button = event.target.closest('[data-ticker]');
      if (button) this.loadTicker(button.dataset.ticker);
    });
    this.search.addEventListener('submit', event => {
      event.preventDefault();
      this.submitSearch();
    });
    this.root.querySelector('.market-range').addEventListener('change', () => this.renderCharts());
    this.addForm.addEventListener('submit', event => { event.preventDefault(); this.savePosition(); });
    this.root.querySelector('.market-portfolio-list').addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (button) this.handlePosition(button.dataset.action, button.dataset.ticker);
    });
    this.onKeyDown = event => {
      if (!this.opened) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(); }
      else if (event.key === 'Tab') this.trapFocus(event);
    };
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  async history(ticker) {
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.at < 5 * 60_000) return cached.bars;
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      const bars = await fetchHistory(ticker, controller.signal);
      this.cache.set(ticker, { bars, at: Date.now() });
      this.prices.set(ticker, bars.at(-1));
      return bars;
    } finally { this.controllers.delete(controller); }
  }

  hideSearchResults() {
    this.searchResults.hidden = true;
    this.searchResults.replaceChildren();
  }

  async lookupSymbols(query) {
    this.searchController?.abort();
    const controller = new AbortController();
    this.searchController = controller;
    try {
      const matches = await searchStocks(query, controller.signal);
      if (controller.signal.aborted || !this.opened || this.search.elements.ticker.value.trim() !== query) return null;
      this.searchResults.replaceChildren();
      for (const match of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.ticker = match.ticker;
        button.setAttribute('role', 'option');
        const symbol = document.createElement('strong');
        symbol.textContent = match.ticker;
        const name = document.createElement('span');
        name.textContent = match.name;
        button.append(symbol, name);
        this.searchResults.append(button);
      }
      this.searchResults.hidden = !matches.length;
      return matches;
    } catch (error) {
      if (error.name !== 'AbortError') this.message.textContent = error.message;
      return null;
    }
  }

  async submitSearch() {
    clearTimeout(this.searchTimer);
    const query = this.search.elements.ticker.value.trim();
    if (!query) return;
    const matches = await this.lookupSymbols(query);
    if (matches === null) return;
    const exact = matches.find(match => match.ticker === query.toUpperCase() || match.name.toLowerCase() === query.toLowerCase());
    if (exact) this.loadTicker(exact.ticker);
    else if (matches.length) this.message.textContent = 'Elegí una acción de los resultados encontrados.';
    else this.loadTicker(query);
  }

  async loadTicker(value) {
    let ticker;
    try { ticker = normalizeTicker(value); }
    catch (error) { this.message.textContent = error.message; return; }
    this.selected = ticker;
    this.searchController?.abort();
    this.hideSearchResults();
    this.search.elements.ticker.value = ticker;
    this.message.textContent = `Consultando ${ticker}…`;
    this.root.querySelector('.market-quote').hidden = true;
    this.root.querySelector('.market-charts').hidden = true;
    const request = Symbol();
    this.currentRequest = request;
    try {
      const bars = await this.history(ticker);
      if (!this.opened || this.currentRequest !== request) return;
      this.bars = bars;
      this.message.textContent = `${bars.length} barras reales recibidas. La última puede tener demora.`;
      this.renderQuote();
      this.renderCharts();
    } catch (error) {
      if (this.currentRequest !== request || error.name === 'AbortError') return;
      this.bars = null;
      this.message.textContent = error.message || 'No se pudieron cargar los datos.';
    }
  }

  renderQuote() {
    const last = this.bars.at(-1);
    const first = this.bars[0];
    const change = (last.close / first.close - 1) * 100;
    const quote = this.root.querySelector('.market-quote');
    quote.hidden = false;
    quote.querySelector('.market-symbol').textContent = this.selected;
    quote.querySelector('.market-last').textContent = money(last.close);
    quote.querySelector('.market-change').textContent = `${signed(change)} en las ${this.bars.length} barras`;
    quote.querySelector('.market-change').className = `market-change ${change >= 0 ? 'up' : 'down'}`;
    quote.querySelector('.market-stamp').textContent = `Última: ${localTime(last.timestamp)}`;
  }

  renderCharts() {
    if (!this.bars?.length) return;
    const count = Number(this.root.querySelector('.market-range').value);
    const bars = this.bars.slice(-count);
    this.root.querySelector('.market-charts').hidden = false;
    histogram(this.root.querySelector('.market-price-chart'), bars, 'close', '#73dadd');
    histogram(this.root.querySelector('.market-volume-chart'), bars, 'volume', '#e6b96e');
  }

  savePosition() {
    try {
      if (!this.bars || this.selected !== normalizeTicker(this.search.elements.ticker.value)) {
        throw new Error('Consultá primero ese símbolo para confirmar que tiene precios.');
      }
      const position = normalizePosition(this.selected, this.addForm.elements.quantity.value, this.addForm.elements.averageCost.value);
      const existing = this.portfolio.findIndex(item => item.ticker === position.ticker);
      if (existing >= 0) this.portfolio[existing] = position;
      else {
        if (this.portfolio.length >= 12) throw new Error('La cartera admite hasta 12 símbolos.');
        this.portfolio.push(position);
      }
      this.persist();
      this.addForm.reset();
      this.message.textContent = `${position.ticker} guardada en tu cartera local.`;
      this.switchTab('portfolio');
    } catch (error) { this.message.textContent = error.message; }
  }

  persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.portfolio)); }
    catch { this.portfolioMessage.textContent = 'No se pudo guardar la cartera en este navegador.'; }
  }

  handlePosition(action, ticker) {
    if (action === 'remove') {
      this.portfolio = this.portfolio.filter(item => item.ticker !== ticker);
      this.persist();
      this.renderPortfolio();
    } else if (action === 'view' || action === 'edit') {
      this.switchTab('market');
      this.loadTicker(ticker).then(() => {
        if (action === 'edit') {
          const position = this.portfolio.find(item => item.ticker === ticker);
          if (position) {
            this.addForm.elements.quantity.value = position.quantity;
            this.addForm.elements.averageCost.value = position.averageCost;
            this.addForm.elements.quantity.focus();
          }
        }
      });
    }
  }

  switchTab(tab) {
    this.tab = tab;
    for (const view of this.root.querySelectorAll('[data-view]')) view.hidden = view.dataset.view !== tab;
    for (const button of this.root.querySelectorAll('[data-tab]')) {
      if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    this.content.scrollTop = 0;
    if (tab === 'portfolio') { this.renderPortfolio(); this.refreshPortfolio(); }
  }

  async refreshPortfolio() {
    if (!this.portfolio.length) return;
    this.portfolioMessage.textContent = 'Actualizando últimas barras de la cartera…';
    const tickers = this.portfolio.map(item => item.ticker);
    for (let index = 0; index < tickers.length; index += 3) {
      await Promise.allSettled(tickers.slice(index, index + 3).map(ticker => this.history(ticker)));
      if (!this.opened || this.tab !== 'portfolio') return;
      this.renderPortfolio();
    }
    this.portfolioMessage.textContent = 'Valores estimados con la última barra disponible; pueden estar demorados.';
  }

  renderPortfolio() {
    const list = this.root.querySelector('.market-portfolio-list');
    const totals = this.root.querySelector('.market-totals');
    if (!this.portfolio.length) {
      list.innerHTML = '<p class="market-empty">Todavía no agregaste acciones. Buscá un símbolo en Mercados para empezar.</p>';
      totals.textContent = '';
      this.portfolioMessage.textContent = '';
      return;
    }
    let cost = 0;
    let value = 0;
    let priced = 0;
    list.innerHTML = this.portfolio.map(position => {
      const quote = this.prices.get(position.ticker);
      const metrics = quote ? positionValue(position, quote.close) : null;
      if (metrics) { cost += metrics.cost; value += metrics.value; priced++; }
      return `<article class="market-position"><div><strong>${position.ticker}</strong><span>${position.quantity} acc. · costo ${money(position.averageCost)}</span></div><div class="market-position-value"><strong>${metrics ? money(metrics.value) : 'Sin precio'}</strong><small class="${metrics && metrics.profit < 0 ? 'down' : 'up'}">${metrics ? `${money(metrics.profit)} · ${signed(metrics.profitPercent ?? 0)}` : 'Consultando…'}</small></div><div class="market-position-actions"><button type="button" data-action="view" data-ticker="${position.ticker}">Gráfico</button><button type="button" data-action="edit" data-ticker="${position.ticker}">Editar</button><button type="button" data-action="remove" data-ticker="${position.ticker}" aria-label="Quitar ${position.ticker} de la cartera">Quitar</button></div></article>`;
    }).join('');
    totals.innerHTML = `<span>${priced}/${this.portfolio.length} posiciones con precio</span><strong>Valor estimado: ${money(value)}</strong><span>Costo: ${money(cost)} · Resultado: ${money(value - cost)}</span>`;
  }

  trapFocus(event) {
    const elements = [...this.phone.querySelectorAll('button:not(:disabled), input:not(:disabled), select, a[href]')].filter(element => element.getClientRects().length);
    if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
  }

  open() {
    if (this.opened) return;
    // Phaser captures movement and interaction letters at the window level.
    // Pause its manager so native text inputs can receive every character.
    this.keyboardWasEnabled = this.keyboardPlugin.manager.enabled;
    this.keyboardPlugin.resetKeys();
    this.keyboardPlugin.manager.enabled = false;
    this.opened = true;
    this.root.hidden = false;
    this.root.querySelector('.market-close').focus();
    this.switchTab('market');
    this.loadTicker(this.selected);
  }

  close() {
    if (!this.opened) return;
    this.keyboardPlugin.manager.enabled = this.keyboardWasEnabled;
    this.keyboardPlugin.resetKeys();
    this.opened = false;
    this.currentRequest = null;
    clearTimeout(this.searchTimer);
    this.searchController?.abort();
    this.hideSearchResults();
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.root.hidden = true;
  }

  destroy() {
    this.close();
    window.removeEventListener('keydown', this.onKeyDown, true);
    this.root.remove();
  }
}
