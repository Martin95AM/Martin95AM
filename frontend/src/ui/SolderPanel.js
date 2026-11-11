import { PARTS, HEAT, temperatureAt, jointQuality, circuitComplete, scoreFor } from './solderRules.mjs';
import './solder.css';

const STORAGE_KEY = 'martinquest-solder-lamp-v1';

export default class SolderPanel {
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;
    this.opened = false;
    this.completed = false;
    this.bestScore = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      this.completed = saved?.completed === true;
      this.bestScore = Number.isFinite(saved?.bestScore) ? saved.bestScore : 0;
    } catch { /* El juego sigue funcionando si el almacenamiento está deshabilitado. */ }

    this.root = document.createElement('div');
    this.root.className = 'solder-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="solder-panel" role="dialog" aria-modal="true" aria-labelledby="solder-title">
        <header class="solder-header">
          <div><span class="solder-kicker">CUARTO DE MÁQUINAS · MESA DE ELECTRÓNICA</span><h2 id="solder-title">Repará la lámpara</h2></div>
          <button class="solder-close" type="button" aria-label="Cerrar juego de soldadura">×</button>
        </header>
        <p class="solder-help">Elegí un componente y colocalo en su huella. Después, tocá un pin para calentar y volvé a tocarlo cuando la temperatura entre en la zona verde. Teclado: Tab y Enter.</p>
        <div class="solder-stats"><span class="solder-progress-label"></span><span class="solder-mistakes"></span><span class="solder-time"></span><span class="solder-best"></span></div>
        <div class="solder-progress" role="progressbar" aria-label="Pines soldados" aria-valuemin="0" aria-valuemax="8"><span></span></div>
        <h3 class="solder-section-title">Bandeja de componentes</h3>
        <div class="solder-tray" role="group" aria-label="Seleccionar componente"></div>
        <div class="solder-board" role="group" aria-label="Placa de circuito">
          <div class="solder-board-top"><span>PCB · LÁMPARA 01</span><span class="solder-board-light">● LUZ APAGADA</span></div>
          <div class="solder-slots"></div>
          <span class="solder-board-code">+12V ── R1 ── D1 ── C1 ── L1 ── GND</span>
        </div>
        <div class="solder-heat-console">
          <div class="solder-heat-top"><strong>Temperatura del soldador</strong><span class="solder-heat-readout">25 °C · En reposo</span></div>
          <div class="solder-heat-track"><span class="solder-ideal"></span><span class="solder-heat-needle"></span></div>
          <div class="solder-heat-scale"><span>25 °C</span><span>180–270 °C · unión buena</span><span>320 °C</span></div>
        </div>
        <div class="solder-footer"><p class="solder-status" role="status" aria-live="polite"></p>
          <div class="solder-actions"><button class="solder-reset" type="button">↺ Nueva placa</button><button class="solder-test" type="button" disabled>Probar circuito →</button></div>
        </div>
      </section>`;
    document.body.append(this.root);
    this.panel = this.root.querySelector('.solder-panel');
    this.tray = this.root.querySelector('.solder-tray');
    this.slots = this.root.querySelector('.solder-slots');
    this.status = this.root.querySelector('.solder-status');
    this.heatReadout = this.root.querySelector('.solder-heat-readout');
    this.heatNeedle = this.root.querySelector('.solder-heat-needle');
    this.testButton = this.root.querySelector('.solder-test');
    this.closeButton = this.root.querySelector('.solder-close');
    this.closeButton.addEventListener('click', () => this.close());
    this.root.querySelector('.solder-reset').addEventListener('click', () => this.startRound());
    this.testButton.addEventListener('click', () => this.testCircuit());
    this.tray.addEventListener('click', event => {
      const button = event.target.closest('[data-select]');
      if (button) this.selectPart(button.dataset.select);
    });
    this.slots.addEventListener('click', event => {
      const place = event.target.closest('[data-place]');
      const pad = event.target.closest('[data-pad]');
      if (place) this.placePart(place.dataset.place);
      else if (pad) this.handlePad(pad.dataset.pad);
    });
    this.root.addEventListener('pointerdown', event => { if (event.target === this.root) this.close(); });
    this.onKeyDown = event => {
      if (!this.opened) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      } else if (event.key === 'Tab') this.trapFocus(event);
    };
    window.addEventListener('keydown', this.onKeyDown, true);
    this.startRound();
  }

  startRound() {
    this.stopHeating();
    this.placed = new Set();
    this.soldered = new Set();
    this.selectedPart = null;
    this.mistakes = 0;
    this.won = false;
    this.startedAt = performance.now();
    this.pausedAt = this.opened ? null : this.startedAt;
    this.finalSeconds = null;
    this.setStatus('Elegí una pieza de la bandeja y buscá su huella en la placa.');
    this.updateMeter(HEAT.start);
    this.render();
  }

  selectPart(id) {
    if (this.placed.has(id) || this.won) return;
    this.selectedPart = id;
    this.setStatus(`Buscá la huella ${id} y colocá el componente.`);
    this.render();
    this.slots.querySelector(`[data-place="${id}"]`)?.focus();
  }

  placePart(id) {
    if (this.won || this.placed.has(id)) return;
    if (!this.selectedPart) { this.setStatus('Primero elegí una pieza de la bandeja.'); return; }
    if (this.selectedPart !== id) {
      this.mistakes++;
      this.setStatus(`Esa pieza corresponde a ${this.selectedPart}, no a ${id}.`);
      this.renderStats();
      return;
    }
    this.placed.add(id);
    this.selectedPart = null;
    this.setStatus(`${id} colocado. Tocá uno de sus pines para calentar el soldador.`);
    this.render();
    this.slots.querySelector(`[data-pad="${id}-0"]`)?.focus();
  }

  handlePad(key) {
    if (this.won || this.soldered.has(key)) return;
    const id = key.split('-')[0];
    if (!this.placed.has(id)) return;
    if (this.activeJoint && this.activeJoint !== key) {
      this.setStatus('Terminá primero la unión que está calentándose.');
      return;
    }
    if (this.activeJoint) { this.finishJoint(); return; }
    this.activeJoint = key;
    this.heatingStarted = performance.now();
    this.slots.querySelector(`[data-pad="${key}"]`)?.classList.add('heating');
    this.slots.querySelector(`[data-pad="${key}"]`)?.setAttribute('aria-pressed', 'true');
    this.setStatus('El soldador está calentando. Tocá el mismo pin otra vez en la zona verde.');
    this.tick();
  }

  tick() {
    if (!this.opened || !this.activeJoint) return;
    const temperature = temperatureAt(performance.now() - this.heatingStarted);
    this.updateMeter(temperature);
    if (temperature >= HEAT.max) { this.finishJoint(); return; }
    this.frame = requestAnimationFrame(() => this.tick());
  }

  finishJoint() {
    const key = this.activeJoint;
    if (!key) return;
    const temperature = temperatureAt(performance.now() - this.heatingStarted);
    const quality = jointQuality(temperature);
    this.stopHeating();
    this.updateMeter(temperature);
    if (quality === 'good') {
      this.soldered.add(key);
      this.setStatus(`Unión ${key.replace('-', ' · pin ')} lista a ${temperature} °C. ¡Buen pulso!`);
    } else {
      this.mistakes++;
      this.setStatus(quality === 'cold'
        ? `Soldadura fría (${temperature} °C). Volvé a calentar ese pin.`
        : `La pista se sobrecalentó (${temperature} °C). Dejala enfriar y probá otra vez.`);
    }
    this.render();
    if (circuitComplete(this.placed, this.soldered)) this.setStatus('Todos los pines están soldados. Probá el circuito.');
    else this.slots.querySelector('.solder-pad:not(:disabled)')?.focus();
  }

  stopHeating() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.activeJoint = null;
  }

  updateMeter(temperature) {
    this.heatNeedle.style.left = `${Math.min(100, temperature / HEAT.max * 100)}%`;
    const quality = jointQuality(temperature);
    this.heatReadout.textContent = `${temperature} °C · ${temperature === HEAT.start ? 'En reposo' : quality === 'good' ? '¡Soltá ahora!' : quality === 'cold' ? 'Calentando…' : 'Demasiado caliente'}`;
    this.heatReadout.className = `solder-heat-readout ${quality}`;
  }

  setStatus(message) { this.status.textContent = message; }

  render() {
    this.tray.innerHTML = PARTS.map(part => `
      <button type="button" class="solder-part ${part.kind} ${this.selectedPart === part.id ? 'selected' : ''}" data-select="${part.id}" ${this.placed.has(part.id) || this.won ? 'disabled' : ''}>
        <span class="part-symbol" aria-hidden="true">${part.id === 'R1' ? '▰' : part.id === 'C1' ? '▥' : part.id === 'D1' ? '▷│' : '◉'}</span>
        <span><strong>${part.id} · ${part.name}</strong><small>${part.detail}</small></span>
      </button>`).join('');
    this.slots.innerHTML = PARTS.map(part => {
      const placed = this.placed.has(part.id);
      const done = [0, 1].every(pin => this.soldered.has(`${part.id}-${pin}`));
      return `<div class="solder-slot ${placed ? 'placed' : ''} ${done ? 'complete' : ''}">
        <div class="slot-heading"><strong>${part.id}</strong><span>${part.name}</span></div>
        <div class="slot-body ${part.kind} ${placed ? 'installed' : ''}" aria-hidden="true">${placed ? part.id === 'R1' ? '▰' : part.id === 'C1' ? '▥' : part.id === 'D1' ? '▷│' : '◉' : '○'}</div>
        <div class="slot-pins">${[0, 1].map(pin => `<button type="button" class="solder-pad ${this.soldered.has(`${part.id}-${pin}`) ? 'done' : ''}" data-pad="${part.id}-${pin}" aria-label="Soldar pin ${pin + 1} de ${part.name}" aria-pressed="false" ${!placed || this.soldered.has(`${part.id}-${pin}`) || this.won ? 'disabled' : ''}></button>`).join('')}</div>
        ${placed ? `<span class="slot-caption">${done ? '2/2 uniones' : 'Soldá ambos pines'}</span>` : `<button type="button" class="solder-place" data-place="${part.id}">Colocar ${part.id}</button>`}
      </div>`;
    }).join('');
    this.panel.classList.toggle('won', this.won);
    this.root.querySelector('.solder-board-light').textContent = this.won ? '● LUZ ENCENDIDA' : '● LUZ APAGADA';
    this.testButton.disabled = !circuitComplete(this.placed, this.soldered) || this.won;
    this.testButton.textContent = this.won ? 'Circuito encendido ✓' : 'Probar circuito →';
    this.renderStats();
  }

  renderStats() {
    this.root.querySelector('.solder-progress-label').textContent = `${this.soldered.size}/8 pines soldados`;
    this.root.querySelector('.solder-mistakes').textContent = `${this.mistakes} errores`;
    this.root.querySelector('.solder-best').textContent = this.bestScore ? `Récord ${this.bestScore} pts` : 'Sin récord';
    this.root.querySelector('.solder-progress').setAttribute('aria-valuenow', String(this.soldered.size));
    this.root.querySelector('.solder-progress span').style.width = `${this.soldered.size / 8 * 100}%`;
    this.renderElapsed();
  }

  renderElapsed() {
    const seconds = this.finalSeconds ?? Math.floor((performance.now() - this.startedAt) / 1000);
    this.root.querySelector('.solder-time').textContent = `${Math.max(0, seconds)} s`;
  }

  testCircuit() {
    if (!circuitComplete(this.placed, this.soldered) || this.won) return;
    this.finalSeconds = Math.floor((performance.now() - this.startedAt) / 1000);
    const score = scoreFor(this.finalSeconds, this.mistakes);
    this.bestScore = Math.max(this.bestScore, score);
    this.completed = true;
    this.won = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, bestScore: this.bestScore })); }
    catch { /* El resultado queda visible aunque no se pueda guardar. */ }
    this.render();
    this.setStatus(`¡Circuito vivo! La lámpara del escritorio se encendió. ${score} puntos.`);
    this.onComplete();
  }

  trapFocus(event) {
    const focusable = [...this.panel.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    if (this.pausedAt && !this.won) this.startedAt += performance.now() - this.pausedAt;
    this.pausedAt = null;
    this.root.hidden = false;
    this.clockTimer = setInterval(() => { if (!this.won) this.renderElapsed(); }, 250);
    this.closeButton.focus();
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    this.pausedAt = performance.now();
    const wasHeating = Boolean(this.activeJoint);
    this.stopHeating();
    if (wasHeating) {
      this.updateMeter(HEAT.start);
      this.render();
      this.setStatus('Soldadura interrumpida. Tocá el pin para volver a calentar.');
    }
    clearInterval(this.clockTimer);
    this.root.hidden = true;
  }

  destroy() {
    this.close();
    window.removeEventListener('keydown', this.onKeyDown, true);
    this.root.remove();
  }
}
