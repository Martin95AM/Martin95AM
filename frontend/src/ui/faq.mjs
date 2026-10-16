import { PUBLIC_FACTS } from './publicFacts.mjs';

function warmReply(answer) {
    return `Claro, con gusto. ${answer}`;
}

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
        .replace(/^(?:todo bien|como estas|como andas|que tal|como va)\b\s*/, '');
    if (!withoutGreeting || /^(?:todo bien|como estas|como andas|que tal|como va)$/.test(normalized)) {
        return '¡Hola! Todo bien, gracias por preguntar. Me alegra charlar con vos. Puedo contarte sobre la experiencia, formación e idiomas de Martín. ¿Qué te gustaría saber?';
    }
    if (/^(?:hablame|contame|decime) de eso$/.test(withoutGreeting)) {
        const summary = facts.find(fact => fact.triggers.includes('resumen de martin'));
        return summary ? warmReply(summary.answer) : 'Claro. Puedo contarte sobre la experiencia, formación, habilidades e idiomas de Martín. ¿Por cuál querés empezar?';
    }
    if (/(quien eres|quien sos|que eres|que sos)/.test(withoutGreeting)) {
        return 'Soy la voz del cuarto de máquinas. Estoy para ayudarte con información pública aprobada sobre Martín y charlar un ratito con vos.';
    }
    if (/\b(?:hijo de puta|forra|forro|boluda|boludo)\b/.test(withoutGreeting)) {
        return 'Entiendo que algo pudo haberte molestado. Si querés, estoy acá para ayudarte con información sobre la experiencia, formación, habilidades e idiomas de Martín.';
    }
    const match = facts.find(fact => fact.triggers.some(trigger => withoutGreeting.includes(normalizeQuestion(trigger))));
    return match ? warmReply(match.answer) : 'Todavía no tengo información pública confirmada sobre eso. Si querés, puedo contarte sobre la experiencia, formación, habilidades e idiomas de Martín.';
}
