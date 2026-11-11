import { PARTS, TOTAL_PINS, HEAT, temperatureAt, jointQuality, orientationMatches, circuitComplete, scoreFor } from './solderRules.mjs';
import { schematicMarkup, waveformPath } from './solderVisuals.mjs';
import './solder.css';
import './solder-pedal.css';

const STORAGE_KEY = 'martinquest-solder-distortion-v1';
const OLD_STORAGE_KEY = 'martinquest-solder-lamp-v1';

function partSymbol(part, flipped = false) {
  if (part.kind === 'diode') return flipped ? '│◁' : '▷│';
  return { capacitor: '▥', chip: '▣', pot: '◉' }[part.kind];
}

export default class SolderPanel {
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;
    this.opened = false;
    this.completed = false;
    this.bestScore = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
      this.completed = saved?.completed === true || old?.completed === true;
      this.bestScore = Number.isFinite(saved?.bestScore) ? saved.bestScore : 0;
    } catch { /* El juego sigue funcionando si el almacenamiento está deshabilitado. */ }

    this.root = document.createElement('div');
    this.root.className = 'solder-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="solder-panel" role="dialog" aria-modal="true" aria-labelledby="solder-title">
        <header class="solder-header">
          <div><span class="solder-kicker">CUARTO DE MÁQUINAS · MESA DE ELECTRÓNICA</span><h2 id="solder-title">Armá un pedal de distorsión</h2></div>
          <button class="solder-close" type="button" aria-label="Cerrar juego de soldadura">×</button>
        </header>
        <p class="solder-help">Circuito de recorte duro inspirado en pedales clásicos. Seguí la señal, colocá cada pieza y soldá sus pines en la zona verde. Los diodos van en sentidos opuestos: girá D2 antes de instalarlo.</p>
        <div class="solder-schematic"><div class="solder-schematic-heading"><strong>ESQUEMA DE SEÑAL · 9 V</strong><span>R1, R2, R3, divisor VREF y LEVEL ya montados</span></div>${schematicMarkup()}<small class="solder-schematic-hint">Deslizá el esquema hacia un lado para ver la salida →</small></div>
        <div class="solder-stats"><span class="solder-progress-label"></span><span class="solder-mistakes"></span><span class="solder-time"></span><span class="solder-best"></span></div>
        <div class="solder-progress" role="progressbar" aria-label="Pines soldados" aria-valuemin="0" aria-valuemax="${TOTAL_PINS}"><span></span></div>
        <div class="solder-heat-console">
          <div class="solder-heat-top"><strong>Temperatura del soldador</strong><span class="solder-heat-readout">25 °C · En reposo</span></div>
          <div class="solder-heat-track"><span class="solder-ideal"></span><span class="solder-heat-needle"></span></div>
          <div class="solder-heat-scale"><span>25 °C</span><span>180–270 °C · unión buena</span><span>320 °C</span></div>
        </div>
        <div class="solder-tray-heading"><h3 class="solder-section-title">Componentes por instalar</h3><button class="solder-rotate" type="button" disabled>↻ Girar diodo</button></div>
        <div class="solder-tray" role="group" aria-label="Seleccionar componente"></div>
        <div class="solder-board" role="group" aria-label="Placa de circuito">
          <div class="solder-board-top"><span>PCB · DISTORSIÓN / 9 V</span><span class="solder-board-light">● SEÑAL ABIERTA</span></div>
          <div class="solder-slots"></div>
          <span class="solder-board-code">J1 → C1 → U1 + P1 → R3 → D1 ∥ D2 → C2 → C3 → LEVEL → J2</span>
        </div>
        <div class="solder-footer"><p class="solder-status" role="status" aria-live="polite"></p>
          <div class="solder-actions"><button class="solder-reset" type="button">↺ Nueva placa</button><button class="solder-test" type="button" disabled>Probar circuito →</button></div>
        </div>
        <div class="solder-scope" hidden>
          <div class="solder-scope-title"><strong>OSCILOSCOPIO · SEÑAL DE PRUEBA</strong><span>Azul: guitarra limpia · ámbar: salida recortada</span></div>
          <svg class="solder-wave" viewBox="0 0 845 112" role="img" aria-label="Comparación entre la señal limpia y la señal distorsionada"><path class="solder-wave-grid" d="M0 29H845M0 84H845M0 56H845"/><path class="solder-wave-clean"/><path class="solder-wave-dirty"/></svg>
          <div class="solder-controls"><label>DRIVE <input data-control="drive" type="range" min="0" max="100" value="72"><span data-value="drive">72%</span></label><label>TONO <input data-control="tone" type="range" min="0" max="100" value="54"><span data-value="tone">54%</span></label><label>LEVEL <input data-control="level" type="range" min="0" max="100" value="60"><span data-value="level">60%</span></label><button class="solder-audio" type="button">▶ Escuchar tono de prueba</button></div>
          <small>Simulación visual y tono sintetizado para escuchar el efecto; el circuito mostrado es educativo.</small>
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
    this.rotateButton = this.root.querySelector('.solder-rotate');
    this.scope = this.root.querySelector('.solder-scope');
    this.closeButton = this.root.querySelector('.solder-close');
    this.closeButton.addEventListener('click', () => this.close());
    this.root.querySelector('.solder-reset').addEventListener('click', () => this.startRound());
    this.testButton.addEventListener('click', () => this.testCircuit());
    this.rotateButton.addEventListener('click', () => this.rotateSelected());
    this.scope.addEventListener('input', event => { if (event.target.matches('[data-control]')) this.updateScope(); });
    this.root.querySelector('.solder-audio').addEventListener('click', () => this.toggleAudio());
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
    this.flipped = false;
    this.mistakes = 0;
    this.won = false;
    this.stopAudio();
    this.scope.hidden = true;
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
    this.flipped = false;
    const part = PARTS.find(item => item.id === id);
    this.setStatus(part.stripe ? `Buscá ${id}. La banda debe quedar a la ${part.stripe === 'right' ? 'derecha' : 'izquierda'}.` : `Buscá la huella ${id} y colocá el componente.`);
    this.render();
    this.slots.querySelector(`[data-place="${id}"]`)?.focus();
  }

  rotateSelected() {
    const part = PARTS.find(item => item.id === this.selectedPart);
    if (!part?.stripe || this.won) return;
    this.flipped = !this.flipped;
    this.setStatus(`Banda de ${part.id} a la ${this.flipped ? 'izquierda' : 'derecha'}; la placa indica ${part.stripe === 'left' ? 'izquierda' : 'derecha'}.`);
    this.render();
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
    const part = PARTS.find(item => item.id === id);
    if (!orientationMatches(part, this.flipped)) {
      this.mistakes++;
      this.setStatus(`La banda de ${id} está al revés. Girá el diodo para que apunte a la ${part.stripe === 'left' ? 'izquierda' : 'derecha'}.`);
      this.renderStats();
      return;
    }
    this.placed.add(id);
    this.selectedPart = null;
    this.flipped = false;
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
    if (circuitComplete(this.placed, this.soldered)) this.setStatus('Camino de señal completo. Probá el pedal de distorsión.');
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
        <span class="part-symbol" aria-hidden="true">${partSymbol(part, this.selectedPart === part.id && this.flipped)}</span>
        <span><strong>${part.id} · ${part.value}</strong><small>${part.name} · ${part.stage}</small></span>
      </button>`).join('');
    this.slots.innerHTML = PARTS.map(part => {
      const placed = this.placed.has(part.id);
      const pins = Array.from({ length: part.pins }, (_, pin) => `${part.id}-${pin}`);
      const displayPins = part.kind === 'chip' ? [0, 1, 2, 3, 7, 6, 5, 4] : Array.from({ length: part.pins }, (_, pin) => pin);
      const solderedCount = pins.filter(key => this.soldered.has(key)).length;
      const done = solderedCount === part.pins;
      return `<div class="solder-slot ${part.kind} ${placed ? 'placed' : ''} ${done ? 'complete' : ''}">
        <div class="slot-heading"><strong>${part.id} · ${part.value}</strong><span>${part.stage}</span></div>
        <div class="slot-body ${part.kind} ${placed ? 'installed' : ''}" aria-hidden="true">${placed ? part.kind === 'chip' ? '4558' : partSymbol(part, part.stripe === 'left') : '○'}</div>
        <div class="slot-pins">${displayPins.map(pin => { const key = `${part.id}-${pin}`; return `<button type="button" class="solder-pad ${this.soldered.has(key) ? 'done' : ''}" data-pad="${key}" aria-label="Soldar pin ${pin + 1} de ${part.id} ${part.name}" aria-pressed="false" ${!placed || this.soldered.has(key) || this.won ? 'disabled' : ''}></button>`; }).join('')}</div>
        ${part.stripe ? `<span class="slot-polarity">Banda ◀ ${part.stripe === 'left' ? 'IZQUIERDA' : 'DERECHA ▶'}</span>` : ''}
        ${placed ? `<span class="slot-caption">${solderedCount}/${part.pins} uniones</span>` : `<button type="button" class="solder-place" data-place="${part.id}">Colocar ${part.id}</button>`}
      </div>`;
    }).join('');
    const selected = PARTS.find(part => part.id === this.selectedPart);
    this.rotateButton.disabled = !selected?.stripe || this.won;
    this.rotateButton.textContent = selected?.stripe ? `↻ Girar ${selected.id} · banda ${this.flipped ? '◀' : '▶'}` : '↻ Girar diodo';
    this.panel.classList.toggle('won', this.won);
    this.root.querySelector('.solder-board-light').textContent = this.won ? '● SEÑAL ACTIVA' : '● SEÑAL ABIERTA';
    this.testButton.disabled = !circuitComplete(this.placed, this.soldered) || this.won;
    this.testButton.textContent = this.won ? 'Pedal funcionando ✓' : 'Probar pedal →';
    this.renderStats();
  }

  renderStats() {
    this.root.querySelector('.solder-progress-label').textContent = `${this.soldered.size}/${TOTAL_PINS} pines soldados`;
    this.root.querySelector('.solder-mistakes').textContent = `${this.mistakes} errores`;
    this.root.querySelector('.solder-best').textContent = this.bestScore ? `Récord ${this.bestScore} pts` : 'Sin récord';
    this.root.querySelector('.solder-progress').setAttribute('aria-valuenow', String(this.soldered.size));
    this.root.querySelector('.solder-progress span').style.width = `${this.soldered.size / TOTAL_PINS * 100}%`;
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
    this.scope.hidden = false;
    this.updateScope();
    this.setStatus(`¡Pedal funcionando! La señal se recorta y se encendió el piloto de la mesa. ${score} puntos.`);
    this.onComplete();
  }

  updateScope() {
    const read = name => Number(this.scope.querySelector(`[data-control="${name}"]`).value) / 100;
    const drive = read('drive');
    const tone = read('tone');
    const level = read('level');
    for (const name of ['drive', 'tone', 'level']) {
      this.scope.querySelector(`[data-value="${name}"]`).textContent = `${Math.round(read(name) * 100)}%`;
    }
    this.scope.querySelector('.solder-wave-clean').setAttribute('d', waveformPath(0, 1, false));
    this.scope.querySelector('.solder-wave-dirty').setAttribute('d', waveformPath(drive, tone, true, level));
    if (this.audio) {
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = i / (curve.length - 1) * 2 - 1;
        curve[i] = Math.max(-.72, Math.min(.72, x * (1 + drive * 7))) / .72;
      }
      this.audio.shaper.curve = curve;
      this.audio.filter.frequency.value = 500 + tone * 4500;
      this.audio.volume.gain.value = level * .09;
    }
  }

  toggleAudio() {
    if (this.audio) { this.stopAudio(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { this.setStatus('Este navegador no puede reproducir el tono de prueba.'); return; }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const preamp = context.createGain();
    const shaper = context.createWaveShaper();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 110;
    preamp.gain.value = .25;
    filter.type = 'lowpass';
    oscillator.connect(preamp).connect(shaper).connect(filter).connect(volume).connect(context.destination);
    this.audio = { context, oscillator, shaper, filter, volume };
    this.updateScope();
    oscillator.start();
    context.resume();
    this.scope.querySelector('.solder-audio').textContent = '■ Detener tono';
  }

  stopAudio() {
    if (!this.audio) return;
    this.audio.oscillator.stop();
    this.audio.context.close();
    this.audio = null;
    this.scope.querySelector('.solder-audio').textContent = '▶ Escuchar tono de prueba';
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
    this.stopAudio();
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
