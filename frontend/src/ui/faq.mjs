import { PUBLIC_FACTS } from './publicFacts.mjs';

export function normalizeQuestion(value) {
    return value.toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function answerQuestion(question, facts = PUBLIC_FACTS) {
    const normalized = normalizeQuestion(question);
    if (!normalized) return 'Escribí una pregunta o usá el micrófono.';
    if (/\b(dni|documento de identidad|numero de documento|segundo nombre|segundo apellido|cuit|cuil|domicilio|direccion|calle|telefono|celular|whatsapp|correo|email|mail)\b/.test(normalized)) {
        return 'Ese dato es privado y no lo comparto.';
    }
    const withoutGreeting = normalized.replace(/^(?:hola|buenas(?: tardes| noches)?|buen dia)\b\s*/, '')
        .replace(/^(?:todo bien|como estas|que tal)\b\s*/, '');
    if (!withoutGreeting || /^(?:todo bien|como estas|que tal|como va)$/.test(normalized)) {
        return '¡Hola! Todo bien, gracias. Puedo contarte sobre la experiencia, formación e idiomas de Martín. ¿Qué te gustaría saber?';
    }
    if (/(quien eres|quien sos|que eres|que sos)/.test(withoutGreeting)) {
        return 'Soy la voz del cuarto de máquinas. Respondo preguntas básicas con información pública aprobada sobre Martín.';
    }
    if (/\b(?:hijo de puta|forra|forro|boluda|boludo)\b/.test(withoutGreeting)) {
        return 'Entiendo la frustración. Puedo contarte sobre la experiencia, formación, habilidades e idiomas de Martín.';
    }
    const match = facts.find(fact => fact.triggers.some(trigger => withoutGreeting.includes(normalizeQuestion(trigger))));
    return match?.answer || 'Sobre eso no lo sé con los datos públicos aprobados. Puedo hablar de su experiencia, formación, habilidades e idiomas.';
}
