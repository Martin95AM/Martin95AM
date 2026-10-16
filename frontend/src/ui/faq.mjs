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
    if (!normalized) return 'Decime, ¿qué querés saber?';
    if (/\b(dni|documento de identidad|numero de documento|segundo nombre|segundo apellido|cuit|cuil|domicilio|direccion|calle|telefono|celular|whatsapp|correo|email|mail)\b/.test(normalized)) {
        return 'Ese dato es privado y no lo comparto.';
    }
    const withoutGreeting = normalized.replace(/^(?:hola|buenas(?: tardes| noches)?|buen dia)\b\s*/, '')
        .replace(/^(?:todo bien|como estas|como andas|que tal|como va)\b\s*/, '');
    if (!withoutGreeting || /^(?:todo bien|como estas|como andas|que tal|como va)$/.test(normalized)) {
        return '¡Hola! Bien, por suerte. ¿Vos cómo andás? Si querés saber algo de Martín, preguntame tranquilo.';
    }
    if (/^(?:hablame|contame|decime) de eso$/.test(withoutGreeting)) {
        const summary = facts.find(fact => fact.triggers.includes('resumen de martin'));
        return summary?.answer || 'Sí, de una. Puedo hablarte de la experiencia, formación, habilidades o idiomas de Martín. ¿Por dónde arrancamos?';
    }
    if (/(quien eres|quien sos|que eres|que sos)/.test(withoutGreeting)) {
        return 'Soy la voz del cuarto de máquinas. Estoy por acá para responder lo que quieras saber sobre Martín.';
    }
    if (/\b(?:hijo de puta|forra|forro|boluda|boludo)\b/.test(withoutGreeting)) {
        return 'Todo bien. Si querés, bajamos un cambio y seguimos: puedo ayudarte con información sobre Martín.';
    }
    const match = facts.find(fact => fact.triggers.some(trigger => withoutGreeting.includes(normalizeQuestion(trigger))));
    return match?.answer || 'Mmm, de eso no tengo un dato confirmado. Pero si querés te cuento sobre la experiencia, formación, habilidades o idiomas de Martín.';
}
