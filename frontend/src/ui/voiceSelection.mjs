const MALE_VOICE_NAMES = /\b(pablo|jorge|diego|mateo|miguel|carlos|juan|enrique|raul|alvaro|federico|francisco|andres|nicolas|martin|manuel|tomas|male|masculino|hombre)\b/i;

export function isLikelyMaleVoice(voice) {
    const name = voice?.name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
    return MALE_VOICE_NAMES.test(name);
}

export function pickSpanishVoice(voices) {
    const spanish = voices.filter(voice => /^es(?:-|$)/i.test(voice.lang ?? ''));
    if (!spanish.length) return null;
    return spanish.sort((a, b) => {
        const score = voice => (isLikelyMaleVoice(voice) ? 100 : 0)
            + (/^es-AR$/i.test(voice.lang) ? 20 : /^es-(419|MX|UY)$/i.test(voice.lang) ? 15 : 10);
        return score(b) - score(a);
    })[0];
}
