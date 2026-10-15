const stepMs = bpm => 15000 / bpm;
const BARS = 24;
const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS * STEPS_PER_BAR;

function download(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

function base64(bytes) {
    const array = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
    let binary = ''; array.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function midiFile(events, isDrums, bpm) {
    const micros = Math.round(60000000 / bpm);
    const tempo = [0x00, 0xff, 0x51, 0x03, (micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255];
    const bytes = [...tempo]; let lastTick = 0;
    const vlq = n => { const out = [n & 127]; while ((n >>>= 7)) out.unshift((n & 127) | 128); return out; };
    events.sort((a, b) => a.tick - b.tick || a.off - b.off).forEach(event => {
        bytes.push(...vlq(event.tick - lastTick), event.off ? 0x80 | (isDrums ? 9 : 0) : 0x90 | (isDrums ? 9 : 0), event.note, event.off ? 0 : 100);
        lastTick = event.tick;
    });
    bytes.push(...vlq(Math.max(0, TOTAL_STEPS * 120 - lastTick)), 0xff, 0x2f, 0);
    const length = bytes.length;
    return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(length>>>24)&255,(length>>>16)&255,(length>>>8)&255,length&255,...bytes]);
}

function wavFile(rows, isDrums, bpm) {
    const rate = 44100, samples = new Float32Array(Math.ceil(rate * stepMs(bpm) * TOTAL_STEPS / 1000));
    rows.forEach((row, rowIndex) => row.notes.forEach(step => {
        const start = Math.floor(step * stepMs(bpm) / 1000 * rate), length = Math.floor(rate * .16);
        for (let i = 0; i < length && start + i < samples.length; i++) {
            const t = i / rate, env = Math.exp(-t * (isDrums ? 18 : 4));
            const freq = isDrums ? (rowIndex === 0 ? 75 : 170 + rowIndex * 110) : 440 * Math.pow(2, (row.midi - 69) / 12);
            samples[start + i] += (isDrums && rowIndex > 1 ? (Math.random() * 2 - 1) : Math.sin(2 * Math.PI * freq * t)) * env * .18;
        }
    }));
    const out = new ArrayBuffer(44 + samples.length * 2), view = new DataView(out);
    const put = (at, str) => [...str].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
    put(0, 'RIFF'); view.setUint32(4, out.byteLength - 8, true); put(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
    return out;
}

export default class LoopSequencer {
    constructor({ rows, isDrums, trigger, release, name }) {
        this.rows = rows.map(row => ({ ...row, notes: [] })); this.isDrums = isDrums; this.trigger = trigger; this.release = release; this.name = name; this.timer = null; this.step = 0; this.bar = 0; this.bpm = 120; this.humanize = 0; this.divisions = 16; this.gridEnabled = false; this.pending = new Set();
        this.element = document.createElement('section'); this.element.className = 'loop-sequencer';
        this.element.innerHTML = `<div class="loop-head"><strong data-loop-title>24 COMPASES · POSICIÓN LIBRE</strong><span data-status>Listo</span></div><div class="loop-email"><button data-action="previous" type="button">←</button><label>Compás <select data-bar></select> / 24</label><button data-action="next" type="button">→</button></div><p class="loop-hint" data-loop-hint>Clic para colocar · arrastrá para mover · doble clic para borrar</p><div class="loop-grid loop-free-grid"></div><div class="loop-actions"><button data-action="grid" type="button" aria-pressed="false">⊞ Grid: libre</button><button data-action="play" type="button">▶ Reproducir</button><button data-action="clear" type="button">Limpiar</button><button data-action="midi" type="button">↓ MIDI</button><button data-action="wav" type="button">↓ WAV</button></div><div class="loop-email"><label>Enviar mi loop a <input data-email type="email" autocomplete="email" placeholder="tu@email.com"></label><button data-action="email-midi" type="button">✉ MIDI</button><button data-action="email-wav" type="button">✉ WAV</button></div>`;
        const controls = document.createElement('div'); controls.className = 'loop-email';
        controls.innerHTML = '<label>BPM <input data-bpm type="number" min="40" max="240" value="120"></label><label>Divisiones <select data-divisions aria-label="Divisiones por compás"><option value="4">4</option><option value="8">8</option><option value="12">12</option><option value="16" selected>16</option><option value="24">24</option><option value="32">32</option></select> / compás</label><label>Humanizar <input data-humanize type="range" min="0" max="50" value="0"><output data-humanize-value>0%</output></label>';
        this.element.querySelector('.loop-grid').before(controls);
        controls.querySelector('[data-bpm]').addEventListener('change', event => { this.bpm = Math.max(40, Math.min(240, Number(event.target.value) || 120)); event.target.value = this.bpm; if (this.timer) { this.stop(); this.play(); } });
        controls.querySelector('[data-humanize]').addEventListener('input', event => { this.humanize = Number(event.target.value); controls.querySelector('[data-humanize-value]').textContent = `${this.humanize}%`; });
        controls.querySelector('[data-divisions]').addEventListener('change', event => { this.divisions = Number(event.target.value); this.updateGrid(); });
        const grid = this.element.querySelector('.loop-grid');
        const barSelect = this.element.querySelector('[data-bar]');
        for (let bar = 0; bar < BARS; bar++) barSelect.add(new Option(String(bar + 1), String(bar)));
        barSelect.addEventListener('change', () => this.showBar(Number(barSelect.value)));
        this.element.querySelector('[data-action="previous"]').addEventListener('click', () => this.showBar((this.bar + BARS - 1) % BARS));
        this.element.querySelector('[data-action="next"]').addEventListener('click', () => this.showBar((this.bar + 1) % BARS));
        this.rows.forEach(row => { const label = document.createElement('span'); label.textContent = row.label; grid.appendChild(label); const lane = document.createElement('div'); lane.className = 'loop-lane'; lane.setAttribute('aria-label', `Línea de tiempo de ${row.label}`); lane.addEventListener('click', event => { if (event.target !== lane) return; const fraction = this.fractionAt(event, lane); row.notes.push(this.positionAt(fraction)); this.showBar(this.bar); }); grid.appendChild(lane); row.lane = lane; });
        this.element.querySelector('[data-action="grid"]').addEventListener('click', () => { this.gridEnabled = !this.gridEnabled; this.updateGrid(); });
        this.element.querySelector('[data-action="play"]').addEventListener('click', () => this.toggle());
        this.element.querySelector('[data-action="clear"]').addEventListener('click', () => { this.rows.forEach(r => { r.notes.length = 0; }); this.showBar(this.bar); });
        this.element.querySelector('[data-action="midi"]').addEventListener('click', () => this.exportMidi());
        this.element.querySelector('[data-action="wav"]').addEventListener('click', () => download(wavFile(this.rows, this.isDrums, this.bpm), `${this.name}-loop.wav`, 'audio/wav'));
        this.element.querySelector('[data-action="email-midi"]').addEventListener('click', () => this.email('mid'));
        this.element.querySelector('[data-action="email-wav"]').addEventListener('click', () => this.email('wav'));
        this.updateGrid();
    }
    fractionAt(event, lane) { return Math.max(0, Math.min(.9999, (event.clientX - lane.getBoundingClientRect().left) / lane.clientWidth)); }
    // In Grid mode every lane segment is a writable cell. Its click and drag
    // target is the start of that cell, rather than the nearest loose position.
    positionAt(fraction) { const snapped = this.gridEnabled ? Math.floor(fraction * this.divisions) / this.divisions : fraction; return this.bar * STEPS_PER_BAR + Math.min(.9999, snapped) * STEPS_PER_BAR; }
    updateGrid() {
        const button = this.element.querySelector('[data-action="grid"]');
        const mode = this.gridEnabled ? `GRID · ${this.divisions}` : 'POSICIÓN LIBRE';
        this.element.querySelector('[data-loop-title]').textContent = `24 COMPASES · ${mode}`;
        this.element.querySelector('[data-loop-hint]').textContent = this.gridEnabled
            ? `Grid activa: las notas se ajustan a ${this.divisions} divisiones por compás · doble clic para borrar`
            : 'Clic para colocar · arrastrá para mover · doble clic para borrar';
        button.textContent = this.gridEnabled ? `⊞ Grid: ${this.divisions}` : '⊞ Grid: libre';
        button.setAttribute('aria-pressed', String(this.gridEnabled));
        this.rows.forEach(row => row.lane.style.setProperty('--loop-divisions', this.divisions));
    }
    toggle() { this.timer ? this.stop() : this.play(); }
    showBar(bar) { this.bar = bar; this.element.querySelector('[data-bar]').value = String(bar); this.rows.forEach(row => { row.lane.replaceChildren(); row.notes.filter(position => Math.floor(position / STEPS_PER_BAR) === bar).forEach(position => { const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'loop-note'; marker.style.left = `${(position / STEPS_PER_BAR - bar) * 100}%`; marker.setAttribute('aria-label', `${row.label}, posición ${(position % STEPS_PER_BAR).toFixed(2)}`); marker.addEventListener('dblclick', () => { row.notes.splice(row.notes.indexOf(position), 1); this.showBar(bar); }); marker.addEventListener('pointerdown', event => { event.stopPropagation(); marker.setPointerCapture(event.pointerId); }); marker.addEventListener('pointermove', event => { if (!marker.hasPointerCapture(event.pointerId)) return; const fraction = this.fractionAt(event, row.lane); const index = row.notes.indexOf(position); if (index >= 0) { position = this.positionAt(fraction); row.notes[index] = position; marker.style.left = `${(position / STEPS_PER_BAR - bar) * 100}%`; } }); row.lane.appendChild(marker); }); }); }
    play() { this.step = 0; this.element.querySelector('[data-action="play"]').textContent = '■ Detener'; this.element.querySelector('[data-status]').textContent = 'En reproducción'; this.tick(); this.timer = setInterval(() => this.tick(), stepMs(this.bpm)); }
    tick() { this.rows.forEach(row => row.notes.filter(position => position >= this.step && position < this.step + 1).forEach(position => { const delay = Math.max(0, (position - this.step) * stepMs(this.bpm) + (Math.random() - .5) * stepMs(this.bpm) * this.humanize / 100); const timer = setTimeout(() => { this.pending.delete(timer); this.trigger(row.key); if (this.release) { const off = setTimeout(() => { this.pending.delete(off); this.release(row.key); }, Math.min(105, stepMs(this.bpm) - 10)); this.pending.add(off); } }, delay); this.pending.add(timer); })); this.step = (this.step + 1) % TOTAL_STEPS; }
    stop() { clearInterval(this.timer); this.timer = null; this.pending.forEach(clearTimeout); this.pending.clear(); this.element.querySelector('[data-action="play"]').textContent = '▶ Reproducir'; this.element.querySelector('[data-status]').textContent = 'Listo'; }
    exportMidi() { download(this.midiBytes(), `${this.name}-loop.mid`, 'audio/midi'); }
    midiBytes() { const events = []; this.rows.forEach(row => row.notes.forEach(position => { const tick = Math.round(position * 120); events.push({ tick, note: row.midi, off: false }, { tick: tick + 100, note: row.midi, off: true }); })); return midiFile(events, this.isDrums, this.bpm); }
    async email(format) {
        const email = this.element.querySelector('[data-email]').value.trim();
        if (!email) { this.element.querySelector('[data-email]').focus(); return; }
        const bytes = format === 'wav' ? wavFile(this.rows, this.isDrums, this.bpm) : this.midiBytes();
        const status = this.element.querySelector('[data-status]'); status.textContent = 'Enviando…';
        try {
            const response = await fetch(`${window.MARTINQUEST_API_URL || 'http://localhost:8080'}/api/loops/email`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, filename: `${this.name}-loop.${format}`, data: base64(bytes) })
            });
            if (!response.ok) throw new Error();
            status.textContent = 'Enviado ✓';
        } catch {
            const stagingUrl = window.MARTINQUEST_STAGING_URL;
            if (!stagingUrl) { status.textContent = 'No se pudo enviar'; return; }
            try {
                await fetch(stagingUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'stage', email, filename: `${this.name}-loop.${format}`, data: base64(bytes) }) });
                status.textContent = 'Guardado para enviar';
            } catch { status.textContent = 'No se pudo guardar'; }
        }
    }
    destroy() { this.stop(); this.element.remove(); }
}
