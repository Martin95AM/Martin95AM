// A small, self-contained Web Audio piano. The graph stays alive while the
// studio is open so sliders can change the sound of notes already playing.
export const PIANO_NOTES = [
    { key: 'a', label: 'Do', midi: 60, white: 0 },
    { key: 'w', label: 'Do♯', midi: 61, black: 0 },
    { key: 's', label: 'Re', midi: 62, white: 1 },
    { key: 'e', label: 'Re♯', midi: 63, black: 1 },
    { key: 'd', label: 'Mi', midi: 64, white: 2 },
    { key: 'f', label: 'Fa', midi: 65, white: 3 },
    { key: 't', label: 'Fa♯', midi: 66, black: 3 },
    { key: 'g', label: 'Sol', midi: 67, white: 4 },
    { key: 'y', label: 'Sol♯', midi: 68, black: 4 },
    { key: 'h', label: 'La', midi: 69, white: 5 },
    { key: 'u', label: 'La♯', midi: 70, black: 5 },
    { key: 'j', label: 'Si', midi: 71, white: 6 },
    { key: 'k', label: 'Do', midi: 72, white: 7 },
    { key: 'i', label: 'Do♯', midi: 73, black: 7 },
    { key: 'l', label: 'Re', midi: 74, white: 8 }
];

export default class PianoEngine {
    constructor() {
        this.context = null;
        this.voices = new Map();
        this.settings = { threshold: -22, ratio: 3, pan: 0, reverb: 0.18 };
    }

    async start() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return false;
            const ctx = this.context = new AudioContextClass();
            this.input = ctx.createGain();
            this.compressor = ctx.createDynamicsCompressor();
            this.dry = ctx.createGain();
            this.wet = ctx.createGain();
            this.panner = ctx.createStereoPanner();
            this.master = ctx.createGain();
            this.master.gain.value = 0.6;
            this.reverb = ctx.createConvolver();
            this.reverb.buffer = this.createImpulse(ctx);
            this.input.connect(this.compressor);
            this.compressor.connect(this.dry);
            this.compressor.connect(this.reverb);
            this.reverb.connect(this.wet);
            this.dry.connect(this.panner);
            this.wet.connect(this.panner);
            this.panner.connect(this.master);
            this.master.connect(ctx.destination);
            this.applySettings();
        }
        await this.context.resume();
        return true;
    }

    createImpulse(ctx) {
        const length = Math.floor(ctx.sampleRate * 1.7);
        const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
            }
        }
        return buffer;
    }

    setSetting(name, value) {
        if (!(name in this.settings)) return;
        this.settings[name] = Number(value);
        this.applySettings();
    }

    applySettings() {
        if (!this.context) return;
        const now = this.context.currentTime;
        this.compressor.threshold.setTargetAtTime(this.settings.threshold, now, 0.02);
        this.compressor.ratio.setTargetAtTime(this.settings.ratio, now, 0.02);
        this.compressor.knee.setTargetAtTime(12, now, 0.02);
        this.compressor.attack.setTargetAtTime(0.008, now, 0.02);
        this.compressor.release.setTargetAtTime(0.2, now, 0.02);
        this.panner.pan.setTargetAtTime(this.settings.pan, now, 0.02);
        this.dry.gain.setTargetAtTime(1 - this.settings.reverb * 0.35, now, 0.02);
        this.wet.gain.setTargetAtTime(this.settings.reverb, now, 0.02);
    }

    noteOn(key) {
        if (!this.context || this.voices.has(key)) return;
        const note = PIANO_NOTES.find(item => item.key === key);
        if (!note) return;
        const ctx = this.context;
        const now = ctx.currentTime;
        const fundamental = 440 * Math.pow(2, (note.midi - 69) / 12);
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.08, now + 0.45);
        envelope.connect(this.input);
        const oscillators = [1, 2, 3].map((multiple, index) => {
            const oscillator = ctx.createOscillator();
            const partial = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = fundamental * multiple;
            partial.gain.value = [1, 0.17, 0.06][index];
            oscillator.connect(partial).connect(envelope);
            oscillator.start(now);
            return oscillator;
        });
        this.voices.set(key, { envelope, oscillators });
    }

    noteOff(key) {
        const voice = this.voices.get(key);
        if (!voice || !this.context) return;
        const now = this.context.currentTime;
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setValueAtTime(Math.max(voice.envelope.gain.value, 0.0001), now);
        voice.envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        voice.oscillators.forEach(oscillator => oscillator.stop(now + 0.4));
        this.voices.delete(key);
    }

    stopAll() {
        for (const key of this.voices.keys()) this.noteOff(key);
    }

    async destroy() {
        this.stopAll();
        if (this.context) await this.context.close();
        this.context = null;
    }
}
