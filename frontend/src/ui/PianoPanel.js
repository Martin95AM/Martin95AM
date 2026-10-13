import PianoEngine, { PIANO_NOTES } from '../audio/PianoEngine.js';
import './piano.css';

export default class PianoPanel {
    constructor() {
        this.engine = new PianoEngine();
        this.opened = false;
        this.root = document.createElement('div');
        this.root.className = 'piano-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="piano-panel" role="dialog" aria-modal="true" aria-labelledby="piano-title">
                <header class="piano-header">
                    <div><span class="piano-kicker">ESTUDIO · INSTRUMENTO 01</span><h2 id="piano-title">Piano de estudio</h2></div>
                    <button class="piano-close" type="button" aria-label="Cerrar piano">×</button>
                </header>
                <p class="piano-help">Tocá con el teclado o con el mouse. Mantené varias teclas para formar acordes.</p>
                <div class="piano-keyboard" role="group" aria-label="Teclado del piano"></div>
                <div class="piano-rack">
                    <div class="piano-section-heading"><span>CADENA DE EFECTOS</span><span class="piano-live">● EN VIVO</span></div>
                    <div class="piano-controls">
                        <fieldset><legend>Dinámica · compresor</legend>
                            <label>Umbral <output data-value="threshold">−22 dB</output><input data-setting="threshold" type="range" min="-50" max="0" value="-22"></label>
                            <label>Ratio <output data-value="ratio">3:1</output><input data-setting="ratio" type="range" min="1" max="12" step="0.5" value="3"></label>
                        </fieldset>
                        <fieldset><legend>Espacio · ambiente</legend>
                            <label>Panorama <output data-value="pan">Centro</output><input data-setting="pan" type="range" min="-1" max="1" step="0.05" value="0"></label>
                            <label>Reverberación <output data-value="reverb">18%</output><input data-setting="reverb" type="range" min="0" max="1" step="0.01" value="0.18"></label>
                        </fieldset>
                    </div>
                </div>
                <p class="piano-footer">A–L: blancas · W E T Y U I: negras · Esc: cerrar</p>
            </section>`;
        document.body.appendChild(this.root);
        this.keyButtons = new Map();
        const keyboard = this.root.querySelector('.piano-keyboard');
        PIANO_NOTES.forEach(note => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `piano-key ${note.black === undefined ? 'white' : 'black'}`;
            button.style.left = note.black === undefined
                ? `${note.white * 100 / 9}%`
                : `${(note.black + 1) * 100 / 9 - 3.5}%`;
            button.setAttribute('aria-label', `${note.label}, tecla ${note.key.toUpperCase()}`);
            button.innerHTML = `<span>${note.label}</span><kbd>${note.key.toUpperCase()}</kbd>`;
            keyboard.appendChild(button);
            this.keyButtons.set(note.key, button);
            button.addEventListener('pointerdown', event => {
                event.preventDefault();
                button.setPointerCapture(event.pointerId);
                this.press(note.key);
            });
            button.addEventListener('pointerup', () => this.release(note.key));
            button.addEventListener('pointercancel', () => this.release(note.key));
            button.addEventListener('lostpointercapture', () => this.release(note.key));
        });
        this.root.querySelector('.piano-close').addEventListener('click', () => this.close());
        this.root.querySelectorAll('[data-setting]').forEach(input => {
            input.addEventListener('input', () => {
                const name = input.dataset.setting;
                const value = Number(input.value);
                this.engine.setSetting(name, value);
                const labels = {
                    threshold: `${value} dB`, ratio: `${value}:1`,
                    pan: Math.abs(value) < 0.01 ? 'Centro' : `${Math.round(Math.abs(value) * 100)}% ${value < 0 ? 'izq.' : 'der.'}`,
                    reverb: `${Math.round(value * 100)}%`
                };
                this.root.querySelector(`[data-value="${name}"]`).textContent = labels[name];
            });
        });
        this.onKeyDown = event => {
            if (!this.opened) return;
            if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
            const key = event.key.toLowerCase();
            if (!this.keyButtons.has(key)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!event.repeat) this.press(key);
        };
        this.onKeyUp = event => {
            if (this.opened && this.keyButtons.has(event.key.toLowerCase())) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.release(event.key.toLowerCase());
            }
        };
        this.onBlur = () => this.releaseAll();
        window.addEventListener('keydown', this.onKeyDown, true);
        window.addEventListener('keyup', this.onKeyUp, true);
        window.addEventListener('blur', this.onBlur);
    }

    async open() {
        this.root.hidden = false;
        this.opened = true;
        this.root.querySelector('.piano-close').focus();
        await this.engine.start();
    }

    press(key) {
        if (!this.opened) return;
        this.engine.noteOn(key);
        this.keyButtons.get(key)?.classList.add('pressed');
    }

    release(key) {
        this.engine.noteOff(key);
        this.keyButtons.get(key)?.classList.remove('pressed');
    }

    releaseAll() {
        this.engine.stopAll();
        this.keyButtons.forEach(button => button.classList.remove('pressed'));
    }

    close() {
        this.opened = false;
        this.root.hidden = true;
        this.releaseAll();
    }

    destroy() {
        this.close();
        window.removeEventListener('keydown', this.onKeyDown, true);
        window.removeEventListener('keyup', this.onKeyUp, true);
        window.removeEventListener('blur', this.onBlur);
        this.root.remove();
        this.engine.destroy();
    }
}
