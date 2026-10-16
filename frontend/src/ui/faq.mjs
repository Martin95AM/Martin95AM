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
    if (/^(hola|buenas|buen dia|buenas tardes|buenas noches)$/.test(normalized)) {
        return '¡Hola! Podés preguntarme sobre Martín por escrito o con el micrófono.';
    }
    if (/(quien eres|quien sos|que eres|que sos)/.test(normalized)) {
        return 'Soy la voz del cuarto de máquinas. Respondo preguntas básicas con información pública aprobada sobre Martín.';
    }
    const match = facts.find(fact => fact.triggers.some(trigger => normalized.includes(normalizeQuestion(trigger))));
    return match?.answer || 'Todavía no tengo ese dato público aprobado sobre Martín. Prefiero decir que no lo sé antes que inventarlo.';
}
