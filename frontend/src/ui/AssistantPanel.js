import './assistant.css';
import { isLikelyMaleVoice, pickSpanishVoice } from './voiceSelection.mjs';

export default class AssistantPanel {
    constructor() {
        this.opened = false;
        this.history = [];
        this.apiUrl = import.meta.env.VITE_ASSISTANT_API_URL || (import.meta.env.DEV
            ? 'http://localhost:8080'
            : 'https://martin95am-assistant.martinarias95.workers.dev');
        this.pending = false;
        this.recognition = null;
        this.voice = null;
        this.synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.onVoicesChanged = () => { this.voice = pickSpanishVoice(this.synth.getVoices()); };
        this.synth?.addEventListener?.('voiceschanged', this.onVoicesChanged);
        this.root = document.createElement('div');
        this.root.className = 'assistant-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
                <header class="assistant-header">
                    <div><span class="assistant-kicker">CUARTO DE MÁQUINAS · TERMINAL CENTRAL</span><h2 id="assistant-title">La voz del cuarto de máquinas</h2></div>
                    <button class="assistant-close" type="button" aria-label="Cerrar terminal">×</button>
                </header>
                <p class="assistant-intro">Buenas, máquina. Preguntame por Martín o tirame cualquier tema para charlar. Se acepta micrófono, teclado y humor con un par de cables pelados.</p>
                <div class="assistant-log" role="log" aria-live="polite" aria-label="Conversación"></div>
                <form class="assistant-form">
                    <label for="assistant-question">Tu mensaje</label>
                    <div class="assistant-compose">
                        <input id="assistant-question" name="question" type="text" maxlength="500" autocomplete="off" placeholder="Escribime lo que quieras…" required>
                        <button class="assistant-mic" type="button" aria-label="Preguntar con micrófono">🎙 Hablar</button>
                        <button type="submit">Enviar</button>
                    </div>
                </form>
                <div class="assistant-footer">
                    <button class="assistant-new" type="button">Nueva charla</button>
                    <button class="assistant-stop" type="button">Detener voz</button>
                    <p class="assistant-status" role="status"></p>
                </div>
                <p class="assistant-voice-note">Voz generada por tu navegador: elijo una masculina en español si Chrome la tiene; si no, uso un tono más grave.</p>
                <p class="assistant-privacy">Tus mensajes se envían a Cloudflare para generar respuestas. No escribas datos sensibles. El reconocimiento de voz depende del navegador y puede procesar el audio en otro servicio; también podés escribir sin usar el micrófono.</p>
            </section>`;
        document.body.appendChild(this.root);
        this.log = this.root.querySelector('.assistant-log');
        this.form = this.root.querySelector('.assistant-form');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.input = this.root.querySelector('#assistant-question');
        this.mic = this.root.querySelector('.assistant-mic');
        this.status = this.root.querySelector('.assistant-status');
        this.root.querySelector('.assistant-close').addEventListener('click', () => this.close());
        this.root.querySelector('.assistant-new').addEventListener('click', () => this.newConversation());
        this.root.querySelector('.assistant-stop').addEventListener('click', () => this.stopVoice());
        this.root.addEventListener('pointerdown', event => {
            if (event.target === this.root) this.close();
        });
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            this.ask();
        });
        this.onKeyDown = event => {
            if (!this.opened) return;
            event.stopPropagation();
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            }
        };
        window.addEventListener('keydown', this.onKeyDown, true);
        this.setupMicrophone();
        this.append('Voz del cuarto', 'Buenas, máquina. ¿Qué querés saber?');
        if (!this.synth) {
            this.root.querySelector('.assistant-stop').disabled = true;
            this.status.textContent = 'Este navegador no tiene síntesis de voz; las respuestas seguirán apareciendo en texto.';
        }
    }

    setupMicrophone() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            this.mic.disabled = true;
            this.mic.title = 'El reconocimiento de voz no está disponible en este navegador.';
            return;
        }
        try {
            this.recognition = new Recognition();
        } catch {
            this.mic.disabled = true;
            this.mic.title = 'El reconocimiento de voz no está disponible en este navegador.';
            return;
        }
        this.recognition.lang = 'es-AR';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.onresult = event => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim();
            if (!transcript || !this.opened) return;
            this.input.value = transcript;
            this.ask();
        };
        this.recognition.onerror = event => {
            if (!this.opened) return;
            this.status.textContent = event.error === 'not-allowed'
                ? 'El navegador no permitió usar el micrófono.'
                : 'No pude entender el audio. Podés volver a intentar o escribir.';
        };
        this.recognition.onend = () => {
            this.mic.disabled = false;
            this.mic.classList.remove('listening');
            this.mic.setAttribute('aria-label', 'Preguntar con micrófono');
            this.mic.textContent = '🎙 Hablar';
        };
        this.mic.addEventListener('click', () => {
            this.stopVoice();
            try {
                this.recognition.start();
                this.mic.disabled = true;
                this.mic.classList.add('listening');
                this.mic.setAttribute('aria-label', 'Escuchando');
                this.mic.textContent = 'Escuchando…';
                this.status.textContent = 'Escuchando tu pregunta…';
            } catch {
                this.status.textContent = 'No pude iniciar el micrófono. Probá escribiendo.';
            }
        });
    }

    append(author, content) {
        const message = document.createElement('div');
        message.className = `assistant-message assistant-${author === 'Vos' ? 'user' : 'bot'}`;
        const label = document.createElement('strong');
        label.textContent = author;
        const body = document.createElement('p');
        body.textContent = content;
        message.append(label, body);
        this.log.appendChild(message);
        this.log.scrollTop = this.log.scrollHeight;
    }

    async ask() {
        const question = this.input.value.trim();
        if (!question || this.pending) return;
        this.append('Vos', question);
        this.input.value = '';
        if (!this.apiUrl) {
            this.status.textContent = 'El chat todavía no está conectado al servidor.';
            return;
        }
        this.pending = true;
        this.submitButton.disabled = true;
        this.status.textContent = 'Pensando…';
        try {
            const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}/api/assistant/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: question, history: this.history }),
                signal: AbortSignal.timeout(25000)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'No pude responder ahora. Probá otra vez.');
            if (typeof data.reply !== 'string' || !data.reply.trim()) {
                throw new Error('El servidor devolvió una respuesta incompleta. Probá otra vez.');
            }
            this.history.push({ role: 'user', content: question }, { role: 'assistant', content: data.reply.slice(0, 500) });
            this.history = this.history.slice(-10);
            this.append('Voz del cuarto', data.reply);
            this.status.textContent = 'Podés seguir charlando.';
            this.speak(data.reply);
        } catch (error) {
            this.status.textContent = error.name === 'TimeoutError'
                ? 'La respuesta tardó demasiado. Probá otra vez.'
                : error.message === 'Failed to fetch' ? 'No pude conectar con el servidor. Probá más tarde.' : error.message;
        } finally {
            this.pending = false;
            this.submitButton.disabled = false;
            this.input.focus();
        }
    }

    speak(reply) {
        if (!this.synth || !('SpeechSynthesisUtterance' in window)) return;
        this.synth.cancel();
        this.voice = pickSpanishVoice(this.synth.getVoices());
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = this.voice?.lang || 'es-AR';
        utterance.rate = 0.96;
        utterance.pitch = isLikelyMaleVoice(this.voice) ? 0.9 : 0.72;
        if (this.voice) utterance.voice = this.voice;
        utterance.onerror = () => {
            if (this.opened) this.status.textContent = 'No se pudo reproducir la voz; la respuesta sigue disponible en texto.';
        };
        this.synth.speak(utterance);
    }

    stopVoice() {
        this.synth?.cancel();
    }

    newConversation() {
        if (this.pending) return;
        this.stopVoice();
        this.history = [];
        this.log.replaceChildren();
        this.append('Voz del cuarto', 'Acá estoy, máquina. ¿De qué charlamos?');
        this.status.textContent = 'Nueva charla iniciada.';
        this.input.focus();
    }

    open() {
        this.previousFocus = document.activeElement;
        this.opened = true;
        this.root.hidden = false;
        this.input.focus();
    }

    close() {
        this.opened = false;
        this.recognition?.abort();
        this.stopVoice();
        this.root.hidden = true;
        this.previousFocus?.focus?.();
    }

    destroy() {
        this.close();
        window.removeEventListener('keydown', this.onKeyDown, true);
        this.synth?.removeEventListener?.('voiceschanged', this.onVoicesChanged);
        this.root.remove();
    }
}
