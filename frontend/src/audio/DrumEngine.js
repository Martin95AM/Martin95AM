// Percussion is synthesized on demand so the kit works without audio assets.
export const DRUM_PADS = [
    { key: 'a', id: 'kick', label: 'Bombo', family: 'low', midi: 36, midiNotes: [35, 36] },
    { key: 's', id: 'snare', label: 'Redoblante', family: 'mid', midi: 38, midiNotes: [38, 40] },
    { key: 'd', id: 'tomLow', label: 'Tom grave', family: 'mid', midi: 41, midiNotes: [41, 43] },
    { key: 'f', id: 'tomMid', label: 'Tom medio', family: 'mid', midi: 45, midiNotes: [45, 47] },
    { key: 'g', id: 'tomHigh', label: 'Tom agudo', family: 'mid', midi: 48, midiNotes: [48, 50] },
    { key: 'h', id: 'hat', label: 'Hi-hat', family: 'high', midi: 42, midiNotes: [42, 44, 46] },
    { key: 'j', id: 'ride', label: 'Ride', family: 'high', midi: 51, midiNotes: [51, 53, 59] },
    { key: 'k', id: 'crash1', label: 'Crash 1', family: 'high', midi: 49, midiNotes: [49] },
    { key: 'l', id: 'crash2', label: 'Crash 2', family: 'high', midi: 57, midiNotes: [57] }
];

export default class DrumEngine {
    constructor() {
        this.context = null;
        this.active = new Set();
        this.settings = {
            threshold: -18, ratio: 3, attack: 3, release: 140, makeup: 0,
            delayTime: 250, delayFeedback: 0.35, delayWidth: 0.6, delayMix: 0.2,
            filterFrequency: 12000, filterType: 'lowpass', dryMix: 0.85,
            pan: 0, reverb: 0.15, output: -6
        };
    }

    async start() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return false;
            const ctx = this.context = new AudioContextClass();
            this.input = ctx.createGain();
            this.compressor = ctx.createDynamicsCompressor();
            this.makeup = ctx.createGain();
            this.filter = ctx.createBiquadFilter();
            this.dry = ctx.createGain();
            this.wet = ctx.createGain();
            this.delay = ctx.createDelay(1.1);
            this.delayFeedback = ctx.createGain();
            this.delayWet = ctx.createGain();
            this.panner = ctx.createStereoPanner();
            this.master = ctx.createGain();
            this.reverb = ctx.createConvolver();
            this.reverb.buffer = this.createImpulse(ctx);
            this.noiseBuffer = this.createNoise(ctx);
            this.master.gain.value = 0.72;
            this.input.connect(this.compressor).connect(this.makeup).connect(this.filter);
            this.filter.connect(this.dry).connect(this.panner);
            this.filter.connect(this.reverb).connect(this.wet).connect(this.panner);
            this.filter.connect(this.delay);
            this.delay.connect(this.delayFeedback).connect(this.delay);
            this.delay.connect(this.delayWet).connect(this.panner);
            this.panner.connect(this.master).connect(ctx.destination);
            this.applySettings();
        }
        await this.context.resume();
        this.applySettings();
        return true;
    }

    createNoise(ctx) {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    createImpulse(ctx) {
        const length = Math.ceil(ctx.sampleRate * 1.4);
        const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.7;
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
        this.compressor.knee.setTargetAtTime(10, now, 0.02);
        this.compressor.attack.setTargetAtTime(this.settings.attack / 1000, now, 0.02);
        this.compressor.release.setTargetAtTime(this.settings.release / 1000, now, 0.02);
        this.makeup.gain.setTargetAtTime(Math.pow(10, this.settings.makeup / 20), now, 0.02);
        this.filter.type = this.settings.filterType;
        this.filter.frequency.setTargetAtTime(this.settings.filterFrequency, now, 0.02);
        this.delay.delayTime.setTargetAtTime(this.settings.delayTime / 1000, now, 0.02);
        this.delayFeedback.gain.setTargetAtTime(this.settings.delayFeedback, now, 0.02);
        this.panner.pan.setTargetAtTime(this.settings.pan, now, 0.02);
        this.dry.gain.setTargetAtTime(this.settings.dryMix, now, 0.02);
        this.wet.gain.setTargetAtTime(this.settings.reverb, now, 0.02);
        this.delayWet.gain.setTargetAtTime(this.settings.delayMix * (0.65 + this.settings.delayWidth * 0.35), now, 0.02);
        this.master.gain.setTargetAtTime(Math.pow(10, this.settings.output / 20), now, 0.02);
    }

    // Every source belongs to a hit. Keeping the sources makes close() able to
    // silence a long cymbal or reverb tail immediately.
    hit(key, midiNote = null) {
        if (!this.context) return;
        const pad = DRUM_PADS.find(item => item.key === key);
        if (!pad) return;
        const ctx = this.context;
        const now = ctx.currentTime;
        const voice = { sources: [], nodes: [], stopped: false };
        this.active.add(voice);

        const envelope = (level, duration, attack = 0.002) => {
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(level, now + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            gain.connect(this.input);
            voice.nodes.push(gain);
            return gain;
        };
        const tone = (type, startHz, endHz, level, duration) => {
            const oscillator = ctx.createOscillator();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(startHz, now);
            oscillator.frequency.exponentialRampToValueAtTime(endHz, now + duration);
            oscillator.connect(envelope(level, duration));
            voice.sources.push(oscillator);
            oscillator.start(now);
            oscillator.stop(now + duration + 0.02);
        };
        const noise = (filterType, frequency, level, duration) => {
            const source = ctx.createBufferSource();
            source.buffer = this.noiseBuffer;
            const filter = ctx.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.value = frequency;
            source.connect(filter).connect(envelope(level, duration));
            voice.nodes.push(filter);
            voice.sources.push(source);
            source.start(now);
            source.stop(now + duration + 0.02);
        };

        switch (pad.id) {
            case 'kick':
                tone('sine', 155, 43, 0.94, 0.48);
                noise('lowpass', 600, 0.12, 0.035);
                break;
            case 'snare':
                noise('highpass', 1450, 0.56, 0.23);
                tone('triangle', 195, 120, 0.25, 0.13);
                break;
            case 'hat':
                noise('highpass', midiNote === 46 ? 5800 : 6800, midiNote === 46 ? 0.23 : 0.31, midiNote === 46 ? 0.67 : 0.075);
                break;
            case 'tomLow':
            case 'tomMid':
            case 'tomHigh': {
                const base = pad.id === 'tomLow' ? 155 : pad.id === 'tomMid' ? 205 : 275;
                tone('sine', base, base * 0.43, 0.68, 0.43);
                noise('lowpass', 1100, 0.08, 0.04);
                break;
            }
            case 'ride':
                noise('highpass', 4700, 0.22, 1.25);
                tone('square', 820, 780, 0.025, 0.8);
                break;
            case 'crash1':
            case 'crash2':
                noise('highpass', pad.id === 'crash1' ? 3600 : 4300, 0.32, 1.65);
                tone('square', pad.id === 'crash1' ? 860 : 1050, 740, 0.035, 0.8);
                break;
        }

        let remaining = voice.sources.length;
        voice.sources.forEach(source => {
            source.onended = () => {
                if (--remaining === 0) this.clearVoice(voice);
            };
        });
    }

    clearVoice(voice) {
        if (!this.active.has(voice)) return;
        this.active.delete(voice);
        voice.sources.forEach(source => { source.onended = null; source.disconnect(); });
        voice.nodes.forEach(node => node.disconnect());
    }

    stopAll() {
        if (!this.context) return;
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(0, now);
        for (const voice of [...this.active]) {
            voice.sources.forEach(source => {
                try { source.stop(now); } catch { /* Already ended. */ }
            });
            this.clearVoice(voice);
        }
    }

    async destroy() {
        this.stopAll();
        if (this.context) await this.context.close();
        this.context = null;
    }
}
