import DrumEngine, { DRUM_PADS } from '../audio/DrumEngine.js';
import LoopSequencer from '../audio/LoopSequencer.js';
import './drum.css';

export default class DrumPanel {
    constructor() {
        this.engine = new DrumEngine();
        this.opened = false;
        this.heldKeys = new Set();
        this.flashTimers = new Map();
        this.root = document.createElement('div');
        this.root.className = 'drum-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="drum-panel" role="dialog" aria-modal="true" aria-labelledby="drum-title">
                <header class="drum-header">
                    <div><span class="drum-kicker">ESTUDIO · INSTRUMENTO 02</span><h2 id="drum-title">Batería de estudio</h2></div>
                    <button class="drum-close" type="button" aria-label="Cerrar batería">×</button>
                </header>
                <p class="drum-help">Marcá el ritmo con el teclado o tocá los pads con el mouse. Podés combinar sonidos.</p>
                <div class="drum-kit" role="group" aria-label="Pads de la batería"></div>
                <div class="drum-rack">
                    <div class="drum-rack-heading"><span>MEZCLA DEL KIT</span><span class="drum-live">● EN VIVO</span></div>
                    <div class="drum-controls">
                        <fieldset><legend>Dinámica · compresor</legend>
                            <label>Umbral <output data-value="threshold">−18 dB</output><input data-setting="threshold" type="range" min="-50" max="0" value="-18"></label>
                            <label>Ratio <output data-value="ratio">3:1</output><input data-setting="ratio" type="range" min="1" max="12" step="0.5" value="3"></label>
                        </fieldset>
                        <fieldset><legend>Espacio · sala</legend>
                            <label>Panorama <output data-value="pan">Centro</output><input data-setting="pan" type="range" min="-1" max="1" step="0.05" value="0"></label>
                            <label>Ambiente <output data-value="reverb">15%</output><input data-setting="reverb" type="range" min="0" max="1" step="0.01" value="0.15"></label>
                        </fieldset>
                    </div>
                </div>
                <p class="drum-footer">A · S · D · J · K · L para tocar &nbsp;·&nbsp; Esc para cerrar</p>
            </section>`;
        document.body.appendChild(this.root);

        this.padButtons = new Map();
        const kit = this.root.querySelector('.drum-kit');
        DRUM_PADS.forEach(pad => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `drum-pad drum-${pad.family}`;
            button.setAttribute('aria-label', `${pad.label}, tecla ${pad.key.toUpperCase()}`);
            button.innerHTML = `<span class="drum-pad-head"></span><span class="drum-pad-label">${pad.label}</span><kbd>${pad.key.toUpperCase()}</kbd>`;
            button.addEventListener('pointerdown', event => {
                event.preventDefault();
                this.hit(pad.key);
            });
            kit.appendChild(button);
            this.padButtons.set(pad.key, button);
        });

        this.root.querySelector('.drum-close').addEventListener('click', () => this.close());
        this.sequencer = new LoopSequencer({
            rows: DRUM_PADS.map((pad, index) => ({ ...pad, midi: [36, 38, 42, 46, 45, 49][index] })),
            isDrums: true, name: 'bateria', trigger: key => this.hit(key)
        });
        this.root.querySelector('.drum-rack').before(this.sequencer.element);
        this.root.addEventListener('pointerdown', event => {
            if (event.target === this.root) this.close();
        });
        this.root.querySelectorAll('[data-setting]').forEach(input => {
            input.addEventListener('input', () => {
                const name = input.dataset.setting;
                const value = Number(input.value);
                this.engine.setSetting(name, value);
                const labels = {
                    threshold: `${value} dB`,
                    ratio: `${value}:1`,
                    pan: Math.abs(value) < 0.01 ? 'Centro' : `${Math.round(Math.abs(value) * 100)}% ${value < 0 ? 'izq.' : 'der.'}`,
                    reverb: `${Math.round(value * 100)}%`
                };
                this.root.querySelector(`[data-value="${name}"]`).textContent = labels[name];
            });
        });

        this.onKeyDown = event => {
            if (!this.opened) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.close();
                return;
            }
            const key = event.key.toLowerCase();
            if (!this.padButtons.has(key)) return;
            // Keep arrow and letter shortcuts available while adjusting a slider.
            if (event.target instanceof HTMLInputElement) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!event.repeat && !this.heldKeys.has(key)) {
                this.heldKeys.add(key);
                this.hit(key);
            }
        };
        this.onKeyUp = event => {
            if (!this.opened) return;
            const key = event.key.toLowerCase();
            if (!this.padButtons.has(key)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.heldKeys.delete(key);
        };
        this.onBlur = () => this.heldKeys.clear();
        window.addEventListener('keydown', this.onKeyDown, true);
        window.addEventListener('keyup', this.onKeyUp, true);
        window.addEventListener('blur', this.onBlur);
    }

    async open() {
        if (this.opened) return;
        this.root.hidden = false;
        this.opened = true;
        this.root.querySelector('.drum-close').focus();
        await this.engine.start();
    }

    hit(key) {
        if (!this.opened) return;
        this.engine.hit(key);
        const button = this.padButtons.get(key);
        if (!button) return;
        clearTimeout(this.flashTimers.get(key));
        button.classList.add('playing');
        this.flashTimers.set(key, setTimeout(() => {
            button.classList.remove('playing');
            this.flashTimers.delete(key);
        }, 120));
    }

    close() {
        if (!this.opened) return;
        this.opened = false;
        this.root.hidden = true;
        this.heldKeys.clear();
        this.flashTimers.forEach(timer => clearTimeout(timer));
        this.flashTimers.clear();
        this.padButtons.forEach(button => button.classList.remove('playing'));
        this.engine.stopAll();
    }

    destroy() {
        this.close();
        window.removeEventListener('keydown', this.onKeyDown, true);
        window.removeEventListener('keyup', this.onKeyUp, true);
        window.removeEventListener('blur', this.onBlur);
        this.root.remove();
        this.sequencer.destroy();
        this.engine.destroy();
    }
}
