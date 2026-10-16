import { PUBLIC_FACTS } from './publicFacts.mjs';

export function normalizeQuestion(value) {
    return value.toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function createAnswerer(facts = PUBLIC_FACTS) {
    const repetitions = new Map();
    return question => {
        const key = normalizeQuestion(question);
        const count = repetitions.get(key) || 0;
        repetitions.set(key, count + 1);
        return answerQuestion(question, facts, count);
    };
}

export function answerQuestion(question, facts = PUBLIC_FACTS, repetition = 0) {
    const normalized = normalizeQuestion(question);
    const alternate = repetition % 2 === 1;
    if (!normalized) return 'Decime, ¿qué querés saber?';
    if (/\b(dni|documento de identidad|numero de documento|segundo nombre|segundo apellido|cuit|cuil|domicilio|direccion|calle|telefono|celular|whatsapp|correo|email|mail)\b/.test(normalized)) {
        return alternate ? 'Prefiero cuidar su privacidad; ese dato no lo puedo compartir.' : 'Ese dato es privado y no lo comparto.';
    }
    const withoutGreeting = normalized.replace(/^(?:hola|buenas(?: tardes| noches)?|buen dia)\b\s*/, '')
        .replace(/^(?:todo bien|como estas|como andas|que tal|como va)\b\s*/, '');
    if (!withoutGreeting || /^(?:todo bien|como estas|como andas|que tal|como va)$/.test(normalized)) {
        return alternate ? '¡Hola de nuevo! Todo bien por acá. ¿Qué te gustaría charlar sobre Martín?' : '¡Hola! Bien, por suerte. ¿Vos cómo andás? Si querés saber algo de Martín, preguntame tranquilo.';
    }
    if (/^(?:(?:bien(?: bien)?|todo bien|muy bien|re bien) )?(?:(?:aqui|aca) )?(?:(?:estoy|ando) )?estudiando(?: .*)?$/.test(normalized)) {
        return alternate ? '¡Qué bien! ¿Y qué materia estás viendo?' : '¡Qué bueno! ¿Qué estás estudiando?';
    }
    if (/^(?:bien(?: bien)?|todo bien|muy bien|re bien)(?: gracias)?$/.test(normalized)) {
        return alternate ? 'Qué bueno saberlo. ¿En qué andás hoy?' : '¡Me alegra! ¿Qué estás haciendo hoy?';
    }
    if (/^(?:hablame|contame|decime) de eso$/.test(withoutGreeting)) {
        const summary = facts.find(fact => fact.triggers.includes('resumen de martin'));
        return summary ? (alternate ? summary.alternative || `Te lo cuento de otra manera: ${summary.answer}` : summary.answer)
            : (alternate ? 'Dale. ¿Te interesa su trabajo, sus estudios o los idiomas que habla?' : 'Sí, de una. Puedo hablarte de la experiencia, formación, habilidades o idiomas de Martín. ¿Por dónde arrancamos?');
    }
    if (/(quien eres|quien sos|que eres|que sos)/.test(withoutGreeting)) {
        return alternate ? 'Podés pensar en mí como la voz de este espacio: charlamos sobre la trayectoria de Martín.' : 'Soy la voz del cuarto de máquinas. Estoy por acá para responder lo que quieras saber sobre Martín.';
    }
    if (/\b(?:hijo de puta|forra|forro|boluda|boludo)\b/.test(withoutGreeting)) {
        return alternate ? 'Está bien. Si algo te molestó, podemos seguir con calma. Preguntame sobre Martín cuando quieras.' : 'Todo bien. Si querés, bajamos un cambio y seguimos: puedo ayudarte con información sobre Martín.';
    }
    const match = facts.find(fact => fact.triggers.some(trigger => withoutGreeting.includes(normalizeQuestion(trigger))));
    if (match) return alternate ? match.alternative || `Te lo cuento de otra manera: ${match.answer}` : match.answer;
    return alternate ? 'No tengo una respuesta confirmada para eso. ¿Querés preguntarme por el trabajo o los estudios de Martín?' : 'Mmm, de eso no tengo un dato confirmado. Pero si querés te cuento sobre la experiencia, formación, habilidades o idiomas de Martín.';
}
