// One controller per open instrument. MIDI access is requested only after a click.
export default class MidiInputController {
    constructor({ host, onNoteOn, onNoteOff }) {
        this.onNoteOn = onNoteOn;
        this.onNoteOff = onNoteOff;
        this.access = null;
        this.input = null;
        this.active = false;
        this.element = document.createElement('div');
        this.element.className = 'instrument-midi';
        this.element.innerHTML = '<button type="button" data-midi-connect>Conectar dispositivo MIDI</button><label>Entrada <select data-midi-input disabled><option value="">Sin dispositivo</option></select></label><span data-midi-status role="status">MIDI desconectado</span>';
        host.appendChild(this.element);
        this.button = this.element.querySelector('[data-midi-connect]');
        this.select = this.element.querySelector('[data-midi-input]');
        this.status = this.element.querySelector('[data-midi-status]');
        this.button.addEventListener('click', () => this.connect());
        this.select.addEventListener('change', () => this.chooseInput(this.select.value));
        this.handleMessage = event => {
            if (!this.active || !event.data || event.data.length < 3) return;
            const [status, note, velocity] = event.data;
            const command = status & 0xf0;
            if (command === 0x90 && velocity > 0) this.onNoteOn(note, velocity);
            else if (command === 0x80 || (command === 0x90 && velocity === 0)) this.onNoteOff?.(note);
        };
        this.handleStateChange = () => this.refreshInputs();
        if (!navigator.requestMIDIAccess || !window.isSecureContext) {
            this.button.disabled = true;
            this.status.textContent = 'MIDI requiere Chrome/Edge y HTTPS o localhost';
        }
    }

    async connect() {
        if (this.access) { this.active = true; this.refreshInputs(); return; }
        this.button.disabled = true;
        this.status.textContent = 'Solicitando acceso MIDI…';
        try {
            this.access = await navigator.requestMIDIAccess({ sysex: false });
            this.access.addEventListener('statechange', this.handleStateChange);
            this.active = true;
            this.refreshInputs();
            this.button.textContent = 'Actualizar dispositivos';
        } catch {
            this.status.textContent = 'Acceso MIDI denegado o no disponible';
        } finally {
            this.button.disabled = false;
        }
    }

    refreshInputs() {
        if (!this.access) return;
        const previous = this.input?.id;
        const inputs = [...this.access.inputs.values()].filter(input => input.state === 'connected');
        this.select.replaceChildren(new Option('Elegí una entrada', ''));
        inputs.forEach(input => this.select.add(new Option(input.name || `MIDI ${input.id}`, input.id)));
        this.select.disabled = !inputs.length;
        const selected = inputs.find(input => input.id === previous) || (inputs.length === 1 ? inputs[0] : null);
        this.chooseInput(selected?.id || '');
        if (!inputs.length) this.status.textContent = 'No hay dispositivos MIDI conectados';
    }

    chooseInput(id) {
        if (this.input) this.input.removeEventListener('midimessage', this.handleMessage);
        this.input = this.access?.inputs.get(id) || null;
        this.select.value = this.input?.id || '';
        if (this.input) this.input.addEventListener('midimessage', this.handleMessage);
        this.status.textContent = this.input ? `Escuchando ${this.input.name || 'MIDI'}` : 'Elegí una entrada MIDI';
    }

    suspend() { this.active = false; this.onNoteOff?.(null); }
    resume() { this.active = true; }
    destroy() {
        this.suspend();
        if (this.input) this.input.removeEventListener('midimessage', this.handleMessage);
        this.access?.removeEventListener('statechange', this.handleStateChange);
        this.element.remove();
    }
}
