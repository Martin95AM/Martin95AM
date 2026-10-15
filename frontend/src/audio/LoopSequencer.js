const STEP_MS = 125;

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

function midiFile(events, isDrums) {
    const tempo = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]; // 120 BPM
    const bytes = [...tempo]; let lastTick = 0;
    const vlq = n => n < 128 ? [n] : [0x80 | (n >> 7), n & 127];
    events.sort((a, b) => a.tick - b.tick || a.off - b.off).forEach(event => {
        bytes.push(...vlq(event.tick - lastTick), event.off ? 0x80 | (isDrums ? 9 : 0) : 0x90 | (isDrums ? 9 : 0), event.note, event.off ? 0 : 100);
        lastTick = event.tick;
    });
    bytes.push(0, 0xff, 0x2f, 0);
    const length = bytes.length;
    return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(length>>>24)&255,(length>>>16)&255,(length>>>8)&255,length&255,...bytes]);
}

function wavFile(rows, isDrums) {
    const rate = 44100, samples = new Float32Array(rate * 2);
    rows.forEach((row, rowIndex) => row.steps.forEach((on, step) => {
        if (!on) return;
        const start = Math.floor(step * STEP_MS / 1000 * rate), length = Math.floor(rate * .16);
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
        this.rows = rows.map(row => ({ ...row, steps: Array(16).fill(false) })); this.isDrums = isDrums; this.trigger = trigger; this.release = release; this.name = name; this.timer = null; this.step = 0;
        this.element = document.createElement('section'); this.element.className = 'loop-sequencer';
        this.element.innerHTML = `<div class="loop-head"><strong>LOOP · 16 PASOS</strong><span data-status>Listo</span></div><div class="loop-grid"></div><div class="loop-actions"><button data-action="play" type="button">▶ Reproducir</button><button data-action="clear" type="button">Limpiar</button><button data-action="midi" type="button">↓ MIDI</button><button data-action="wav" type="button">↓ WAV</button></div><div class="loop-email"><label>Enviar mi loop a <input data-email type="email" autocomplete="email" placeholder="tu@email.com"></label><button data-action="email-midi" type="button">✉ MIDI</button><button data-action="email-wav" type="button">✉ WAV</button></div>`;
        const grid = this.element.querySelector('.loop-grid');
        this.rows.forEach((row, r) => { const label = document.createElement('span'); label.textContent = row.label; grid.appendChild(label); row.steps.forEach((_, s) => { const cell = document.createElement('button'); cell.type = 'button'; cell.setAttribute('aria-label', `${row.label}, paso ${s + 1}`); cell.addEventListener('click', () => { row.steps[s] = !row.steps[s]; cell.classList.toggle('active', row.steps[s]); }); grid.appendChild(cell); }); });
        this.element.querySelector('[data-action="play"]').addEventListener('click', () => this.toggle());
        this.element.querySelector('[data-action="clear"]').addEventListener('click', () => { this.rows.forEach(r => r.steps.fill(false)); this.element.querySelectorAll('.loop-grid button').forEach(b => b.classList.remove('active')); });
        this.element.querySelector('[data-action="midi"]').addEventListener('click', () => this.exportMidi());
        this.element.querySelector('[data-action="wav"]').addEventListener('click', () => download(wavFile(this.rows, this.isDrums), `${this.name}-loop.wav`, 'audio/wav'));
        this.element.querySelector('[data-action="email-midi"]').addEventListener('click', () => this.email('mid'));
        this.element.querySelector('[data-action="email-wav"]').addEventListener('click', () => this.email('wav'));
    }
    toggle() { this.timer ? this.stop() : this.play(); }
    play() { this.step = 0; this.element.querySelector('[data-action="play"]').textContent = '■ Detener'; this.element.querySelector('[data-status]').textContent = 'En reproducción'; this.tick(); this.timer = setInterval(() => this.tick(), STEP_MS); }
    tick() { this.rows.forEach(row => { if (row.steps[this.step]) { this.trigger(row.key); if (this.release) setTimeout(() => this.release(row.key), Math.min(105, STEP_MS - 10)); } }); this.step = (this.step + 1) % 16; }
    stop() { clearInterval(this.timer); this.timer = null; this.element.querySelector('[data-action="play"]').textContent = '▶ Reproducir'; this.element.querySelector('[data-status]').textContent = 'Listo'; }
    exportMidi() { const events = []; this.rows.forEach(row => row.steps.forEach((on, step) => { if (on) { const tick = step * 120; events.push({ tick, note: row.midi, off: false }, { tick: tick + 100, note: row.midi, off: true }); } })); download(midiFile(events, this.isDrums), `${this.name}-loop.mid`, 'audio/midi'); }
    midiBytes() { const events = []; this.rows.forEach(row => row.steps.forEach((on, step) => { if (on) { const tick = step * 120; events.push({ tick, note: row.midi, off: false }, { tick: tick + 100, note: row.midi, off: true }); } })); return midiFile(events, this.isDrums); }
    async email(format) {
        const email = this.element.querySelector('[data-email]').value.trim();
        if (!email) { this.element.querySelector('[data-email]').focus(); return; }
        const bytes = format === 'wav' ? wavFile(this.rows, this.isDrums) : this.midiBytes();
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
