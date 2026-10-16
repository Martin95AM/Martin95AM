import { PATCH_CHANNELS, countCrossings, createPatchPuzzle, swapPlugs } from './patchBayRules.mjs';
import './patch-bay.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

export default class PatchBayPanel {
    constructor() {
        this.opened = false;
        this.mapping = createPatchPuzzle();
        this.selected = null;
        this.moves = 0;
        this.root = document.createElement('div');
        this.root.className = 'patch-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="patch-panel" role="dialog" aria-modal="true" aria-labelledby="patch-title">
                <header class="patch-header">
                    <div><span class="patch-kicker">ESTUDIO · PATCH BAY</span><h2 id="patch-title">Desenredá la señal</h2></div>
                    <button class="patch-close" type="button" aria-label="Cerrar patch bay">×</button>
                </header>
                <p class="patch-help">Los cables quedaron cruzados. Elegí dos plugs de la derecha para intercambiarlos hasta que cada color llegue a su salida. También podés usar Tab y Enter.</p>
                <div class="patch-meter"><span class="patch-status" role="status" aria-live="polite"></span><span class="patch-moves"></span></div>
                <div class="patch-board" role="group" aria-label="Juego de conexiones de la patch bay">
                    <svg class="patch-cables" viewBox="0 0 400 264" preserveAspectRatio="none" aria-hidden="true"></svg>
                    <div class="patch-rows"></div>
                </div>
                <div class="patch-footer"><span>ENTRADAS <span aria-hidden="true">→</span> SALIDAS</span><button class="patch-reset" type="button">Nueva mezcla</button></div>
            </section>`;
        document.body.appendChild(this.root);
        this.status = this.root.querySelector('.patch-status');
        this.movesLabel = this.root.querySelector('.patch-moves');
        this.cables = this.root.querySelector('.patch-cables');
        this.rows = this.root.querySelector('.patch-rows');
        this.outputs = [];

        PATCH_CHANNELS.forEach((channel, slot) => {
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
        });

        this.root.querySelector('.patch-close').addEventListener('click', () => this.close());
        this.root.querySelector('.patch-reset').addEventListener('click', () => this.newRound());
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
        this.render();
    }

    render() {
        this.cables.replaceChildren();
        this.mapping.forEach((source, slot) => {
            const startY = 33 + source * 66;
            const endY = 33 + slot * 66;
            const path = `M 0 ${startY} C 145 ${startY + 18}, 255 ${endY + 18}, 400 ${endY}`;
            for (const [className, color] of [['patch-cable-shadow', '#06121b'], ['patch-cable', PATCH_CHANNELS[source].color]]) {
                const cable = document.createElementNS(SVG_NS, 'path');
                cable.setAttribute('d', path);
                cable.setAttribute('class', className);
                cable.setAttribute('stroke', color);
                this.cables.appendChild(cable);
            }
            const output = this.outputs[slot];
            output.style.setProperty('--signal', PATCH_CHANNELS[source].color);
            output.classList.toggle('selected', this.selected === slot);
            output.classList.toggle('correct', source === slot);
            output.setAttribute('aria-pressed', String(this.selected === slot));
            output.setAttribute('aria-label', `Salida ${PATCH_CHANNELS[slot].label}, plug ${PATCH_CHANNELS[source].label}${source === slot ? ', conexión correcta' : ''}`);
            output.innerHTML = `<span class="patch-plug" aria-hidden="true"></span><span class="patch-label">${PATCH_CHANNELS[slot].label}</span>`;
        });
        const crossings = countCrossings(this.mapping);
        this.status.textContent = crossings === 0
            ? '¡Señal limpia! Todos los cables están en su salida.'
            : this.selected === null
                ? `${crossings} ${crossings === 1 ? 'cruce pendiente' : 'cruces pendientes'} · elegí un plug.`
                : `Plug seleccionado · elegí otro para intercambiarlos.`;
        this.movesLabel.textContent = `${this.moves} ${this.moves === 1 ? 'movimiento' : 'movimientos'}`;
        this.root.querySelector('.patch-board').classList.toggle('solved', crossings === 0);
    }

    choose(slot) {
        if (countCrossings(this.mapping) === 0) return;
        if (this.selected === null) this.selected = slot;
        else if (this.selected === slot) this.selected = null;
        else {
            this.mapping = swapPlugs(this.mapping, this.selected, slot);
            this.selected = null;
            this.moves++;
        }
        this.render();
    }

    newRound() {
        this.mapping = createPatchPuzzle();
        this.selected = null;
        this.moves = 0;
        this.render();
        if (this.opened) this.outputs[0].focus();
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
        this.close();
        window.removeEventListener('keydown', this.onKeyDown, true);
        this.root.remove();
    }
}
