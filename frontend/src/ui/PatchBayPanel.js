import { PATCH_CHANNELS, PATCH_STAGES, countCrossings, createPatchPuzzle, getHintPair, swapPlugs } from './patchBayRules.mjs';
import './patch-bay.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROW_HEIGHT = 58;

export default class PatchBayPanel {
    constructor() {
        this.opened = false;
        this.stageIndex = 0;
        this.selected = null;
        this.hintPair = null;
        this.moves = 0;
        this.history = [];
        this.soundEnabled = true;
        this.bestMoves = Array(PATCH_STAGES.length).fill(null);
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.root = document.createElement('div');
        this.root.className = 'patch-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="patch-panel" role="dialog" aria-modal="true" aria-labelledby="patch-title">
                <header class="patch-header">
                    <div><span class="patch-kicker">ESTUDIO · PATCH BAY</span><h2 id="patch-title">Desenredá la señal</h2></div>
                    <div class="patch-header-actions">
                        <button class="patch-sound" type="button" aria-label="Desactivar sonido" aria-pressed="true">♪ Sonido</button>
                        <button class="patch-close" type="button" aria-label="Cerrar patch bay">×</button>
                    </div>
                </header>
                <p class="patch-help">Intercambiá dos plugs de la derecha para que cada color llegue a su salida. Elegí un desafío, pedí una pista o deshacé un movimiento. Tab y Enter también funcionan.</p>
                <div class="patch-stages" role="group" aria-label="Dificultad de la patch bay"></div>
                <div class="patch-meter"><span class="patch-status" role="status" aria-live="polite"></span><span class="patch-moves"></span></div>
                <div class="patch-progress" role="progressbar" aria-label="Conexiones correctas" aria-valuemin="0"><span></span></div>
                <div class="patch-board" role="group" aria-label="Juego de conexiones de la patch bay">
                    <svg class="patch-cables" preserveAspectRatio="none" aria-hidden="true"></svg>
                    <div class="patch-rows"></div>
                </div>
                <div class="patch-footer">
                    <span class="patch-flow-label">ENTRADAS <span aria-hidden="true">→</span> SALIDAS</span>
                    <div class="patch-tools">
                        <button class="patch-undo" type="button">↶ Deshacer</button>
                        <button class="patch-hint" type="button">✦ Pista</button>
                        <button class="patch-reset" type="button">Nueva mezcla</button>
                        <button class="patch-next" type="button" hidden>Siguiente nivel →</button>
                    </div>
                </div>
            </section>`;
        document.body.appendChild(this.root);
        this.status = this.root.querySelector('.patch-status');
        this.movesLabel = this.root.querySelector('.patch-moves');
        this.progress = this.root.querySelector('.patch-progress');
        this.cables = this.root.querySelector('.patch-cables');
        this.rows = this.root.querySelector('.patch-rows');
        this.board = this.root.querySelector('.patch-board');
        this.undoButton = this.root.querySelector('.patch-undo');
        this.hintButton = this.root.querySelector('.patch-hint');
        this.nextButton = this.root.querySelector('.patch-next');
        this.soundButton = this.root.querySelector('.patch-sound');
        this.stageButtons = PATCH_STAGES.map((stage, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'patch-stage';
            button.textContent = `${index + 1} · ${stage.name} (${stage.channels})`;
            button.addEventListener('click', () => this.startRound(index));
            this.root.querySelector('.patch-stages').appendChild(button);
            return button;
        });
        this.root.querySelector('.patch-close').addEventListener('click', () => this.close());
        this.root.querySelector('.patch-reset').addEventListener('click', () => this.startRound(this.stageIndex));
        this.nextButton.addEventListener('click', () => this.startRound((this.stageIndex + 1) % PATCH_STAGES.length));
        this.undoButton.addEventListener('click', () => this.undo());
        this.hintButton.addEventListener('click', () => this.showHint());
        this.soundButton.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.soundButton.setAttribute('aria-pressed', String(this.soundEnabled));
            this.soundButton.setAttribute('aria-label', this.soundEnabled ? 'Desactivar sonido' : 'Activar sonido');
            this.soundButton.textContent = this.soundEnabled ? '♪ Sonido' : '♪ Silencio';
        });
        this.root.addEventListener('pointerdown', event => {
            if (event.target === this.root) this.close();
        });
        this.onKeyDown = event => {
            if (!this.opened || event.key !== 'Escape') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.close();
        };
        window.addEventListener('keydown', this.onKeyDown, true);
        this.startRound(0);
    }

    startRound(index) {
        this.cancelAnimation();
        this.stageIndex = index;
        const stage = PATCH_STAGES[index];
        this.mapping = createPatchPuzzle(Math.random, stage.channels, stage.minCrossings);
        this.selected = null;
        this.hintPair = null;
        this.moves = 0;
        this.history = [];
        this.buildBoard();
        this.render();
        if (this.opened) this.outputs[0].focus();
    }

    buildBoard() {
        this.rows.replaceChildren();
        this.cables.replaceChildren();
        this.outputs = [];
        this.cablePaths = [];
        const size = this.mapping.length;
        this.board.style.setProperty('--board-height', `${size * ROW_HEIGHT}px`);
        this.cables.setAttribute('viewBox', `0 0 400 ${size * ROW_HEIGHT}`);
        for (let slot = 0; slot < size; slot++) {
            const channel = PATCH_CHANNELS[slot];
            const row = document.createElement('div');
            row.className = 'patch-row';
            const source = document.createElement('div');
            source.className = 'patch-source';
            source.innerHTML = `<span class="patch-label">${channel.label}</span><span class="patch-jack" style="--signal:${channel.color}" aria-hidden="true"></span>`;
            const output = document.createElement('button');
            output.type = 'button';
            output.className = 'patch-output';
            output.addEventListener('click', () => this.choose(slot));
            row.append(source, document.createElement('span'), output);
            this.rows.appendChild(row);
            this.outputs.push(output);
            const paths = ['shadow', 'main', 'pulse'].map(kind => {
                const cable = document.createElementNS(SVG_NS, 'path');
                cable.setAttribute('class', `patch-cable-${kind}`);
                if (kind !== 'shadow') cable.setAttribute('stroke', channel.color);
                this.cables.appendChild(cable);
                return cable;
            });
            this.cablePaths.push(paths);
        }
    }

    drawCables(mapping, previous = null, progress = 1) {
        for (let source = 0; source < mapping.length; source++) {
            const startY = (source + 0.5) * ROW_HEIGHT;
            const slot = mapping.indexOf(source);
            const oldSlot = previous ? previous.indexOf(source) : slot;
            const endY = (oldSlot + (slot - oldSlot) * progress + 0.5) * ROW_HEIGHT;
            const curve = `M 0 ${startY} C 145 ${startY + 14}, 255 ${endY + 14}, 400 ${endY}`;
            for (const path of this.cablePaths[source]) path.setAttribute('d', curve);
        }
    }

    animateCables(previous) {
        if (this.reducedMotion.matches) {
            this.drawCables(this.mapping);
            return;
        }
        this.animating = true;
        const started = performance.now();
        const frame = now => {
            const t = Math.min(1, (now - started) / 380);
            const eased = 1 - Math.pow(1 - t, 3);
            this.drawCables(this.mapping, previous, eased);
            if (t < 1) this.animationFrame = requestAnimationFrame(frame);
            else {
                this.animating = false;
                this.animationFrame = null;
            }
        };
        this.animationFrame = requestAnimationFrame(frame);
    }

    cancelAnimation() {
        if (this.animationFrame != null) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
        this.animating = false;
    }

    render(previous = null) {
        for (let slot = 0; slot < this.mapping.length; slot++) {
            const source = this.mapping[slot];
            const output = this.outputs[slot];
            output.style.setProperty('--signal', PATCH_CHANNELS[source].color);
            output.classList.toggle('selected', this.selected === slot);
            output.classList.toggle('hinted', this.hintPair?.includes(slot) ?? false);
            output.classList.toggle('correct', source === slot);
            output.setAttribute('aria-pressed', String(this.selected === slot));
            output.setAttribute('aria-label', `Salida ${PATCH_CHANNELS[slot].label}, plug ${PATCH_CHANNELS[source].label}${source === slot ? ', conexión correcta' : ''}`);
            output.innerHTML = `<span class="patch-plug" aria-hidden="true"></span><span class="patch-label">${PATCH_CHANNELS[slot].label}</span>`;
        }
        if (previous) this.animateCables(previous);
        else this.drawCables(this.mapping);
        const crossings = countCrossings(this.mapping);
        const correct = this.mapping.filter((source, slot) => source === slot).length;
        const solved = crossings === 0;
        if (solved) {
            const best = this.bestMoves[this.stageIndex];
            if (best === null || this.moves < best) this.bestMoves[this.stageIndex] = this.moves;
        }
        this.status.textContent = solved
            ? `¡Señal limpia! ${this.mapping.length} canales conectados.`
            : this.hintPair
                ? `Pista: intercambiá las salidas ${PATCH_CHANNELS[this.hintPair[0]].label} y ${PATCH_CHANNELS[this.hintPair[1]].label}.`
                : this.selected !== null
                    ? `Plug seleccionado · elegí otro para intercambiarlo.`
                    : `${crossings} ${crossings === 1 ? 'cruce pendiente' : 'cruces pendientes'} · elegí un plug.`;
        const best = this.bestMoves[this.stageIndex];
        this.movesLabel.textContent = `${this.moves} ${this.moves === 1 ? 'movimiento' : 'movimientos'}${best === null ? '' : ` · récord ${best}`}`;
        this.progress.setAttribute('aria-valuemax', String(this.mapping.length));
        this.progress.setAttribute('aria-valuenow', String(correct));
        this.progress.querySelector('span').style.width = `${correct / this.mapping.length * 100}%`;
        this.board.classList.toggle('solved', solved);
        this.root.querySelector('.patch-panel').classList.toggle('solved', solved);
        this.undoButton.disabled = this.history.length === 0;
        this.hintButton.disabled = solved;
        this.nextButton.hidden = !solved;
        this.nextButton.textContent = this.stageIndex === PATCH_STAGES.length - 1 ? 'Volver al inicio →' : 'Siguiente nivel →';
        this.stageButtons.forEach((button, index) => {
            button.classList.toggle('active', index === this.stageIndex);
            button.setAttribute('aria-pressed', String(index === this.stageIndex));
        });
    }

    choose(slot) {
        if (this.animating || countCrossings(this.mapping) === 0) return;
        if (this.selected === null) this.selected = slot;
        else if (this.selected === slot) this.selected = null;
        else {
            const previous = [...this.mapping];
            this.history.push(previous);
            this.mapping = swapPlugs(this.mapping, this.selected, slot);
            this.selected = null;
            this.hintPair = null;
            this.moves++;
            this.render(previous);
            this.playNotes(countCrossings(this.mapping) === 0 ? [523, 659, 784] : [240 + (6 - countCrossings(this.mapping)) * 38]);
            return;
        }
        this.render();
    }

    undo() {
        if (this.animating || this.history.length === 0) return;
        const previous = [...this.mapping];
        this.mapping = this.history.pop();
        this.moves--;
        this.selected = null;
        this.hintPair = null;
        this.render(previous);
        this.playNotes([220]);
    }

    showHint() {
        if (countCrossings(this.mapping) === 0) return;
        this.selected = null;
        this.hintPair = getHintPair(this.mapping);
        this.render();
        this.outputs[this.hintPair[0]].focus();
    }

    playNotes(frequencies) {
        if (!this.soundEnabled) return;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
            this.audioContext ??= new AudioCtor();
            if (this.audioContext.state === 'suspended') this.audioContext.resume().catch(() => {});
            frequencies.forEach((frequency, index) => {
                const start = this.audioContext.currentTime + index * 0.09;
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, start);
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(0.035, start + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
                oscillator.connect(gain).connect(this.audioContext.destination);
                oscillator.start(start);
                oscillator.stop(start + 0.2);
            });
        } catch { /* Audio is optional; the puzzle stays playable. */ }
    }

    open() {
        if (this.opened) return;
        this.previousFocus = document.activeElement;
        this.opened = true;
        this.root.hidden = false;
        this.outputs[0].focus();
    }

    close() {
        if (!this.opened) return;
        this.opened = false;
        this.root.hidden = true;
        this.previousFocus?.focus?.();
    }

    destroy() {
        this.cancelAnimation();
        this.close();
        window.removeEventListener('keydown', this.onKeyDown, true);
        this.audioContext?.close().catch(() => {});
        this.root.remove();
    }
}
