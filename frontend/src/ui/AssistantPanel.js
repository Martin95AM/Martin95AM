import { answerQuestion } from './faq.mjs';
import './assistant.css';

export default class AssistantPanel {
    constructor() {
        this.opened = false;
        this.recognition = null;
        this.voice = null;
        this.synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.root = document.createElement('div');
        this.root.className = 'assistant-overlay';
        this.root.hidden = true;
        this.root.innerHTML = `
            <section class="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
                <header class="assistant-header">
                    <div><span class="assistant-kicker">CUARTO DE MÁQUINAS · TERMINAL CENTRAL</span><h2 id="assistant-title">La voz del cuarto de máquinas</h2></div>
                    <button class="assistant-close" type="button" aria-label="Cerrar terminal">×</button>
                </header>
                <p class="assistant-intro">Conversemos sobre la trayectoria de Martín. Podés escribir o usar el micrófono; te responderé en texto y con una voz en español.</p>
                <div class="assistant-log" role="log" aria-live="polite" aria-label="Conversación"></div>
                <form class="assistant-form">
                    <label for="assistant-question">Tu pregunta</label>
                    <div class="assistant-compose">
                        <input id="assistant-question" name="question" type="text" maxlength="500" autocomplete="off" placeholder="¿Qué querés saber sobre Martín?" required>
                        <button class="assistant-mic" type="button" aria-label="Preguntar con micrófono">🎙 Hablar</button>
                        <button type="submit">Enviar</button>
                    </div>
                </form>
                <div class="assistant-footer">
                    <button class="assistant-stop" type="button">Detener voz</button>
                    <p class="assistant-status" role="status"></p>
                </div>
                <p class="assistant-privacy">El reconocimiento de voz depende del navegador y puede procesar el audio en un servicio externo. También podés escribir sin usar el micrófono.</p>
            </section>`;
        document.body.appendChild(this.root);
        this.log = this.root.querySelector('.assistant-log');
        this.form = this.root.querySelector('.assistant-form');
        this.input = this.root.querySelector('#assistant-question');
        this.mic = this.root.querySelector('.assistant-mic');
        this.status = this.root.querySelector('.assistant-status');
        this.root.querySelector('.assistant-close').addEventListener('click', () => this.close());
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
        this.append('Sistema', 'Estoy lista para conversar sobre Martín: experiencia, formación, habilidades e idiomas. Solo usaré datos públicos aprobados.');
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

    ask() {
        const question = this.input.value.trim();
        if (!question) return;
        this.append('Vos', question);
        this.input.value = '';
        const reply = answerQuestion(question);
        this.append('Asistente', reply);
        this.status.textContent = 'Lista para otra pregunta.';
        this.speak(reply);
        this.input.focus();
    }

    speak(reply) {
        if (!this.synth || !('SpeechSynthesisUtterance' in window)) return;
        this.synth.cancel();
        if (!this.voice) {
            const voices = this.synth.getVoices();
            this.voice = voices.find(voice => voice.lang.toLowerCase() === 'es-ar')
                || voices.find(voice => voice.lang.toLowerCase().startsWith('es'))
                || null;
        }
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = 'es-AR';
        utterance.rate = 0.92;
        if (this.voice) utterance.voice = this.voice;
        utterance.onerror = () => {
            if (this.opened) this.status.textContent = 'No se pudo reproducir la voz; la respuesta sigue disponible en texto.';
        };
        this.synth.speak(utterance);
    }

    stopVoice() {
        this.synth?.cancel();
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
        this.root.remove();
    }
}
