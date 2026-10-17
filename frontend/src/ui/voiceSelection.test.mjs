import test from 'node:test';
import assert from 'node:assert/strict';
import { isLikelyMaleVoice, pickSpanishVoice } from './voiceSelection.mjs';

test('prioriza una voz masculina en español aunque no sea argentina', () => {
    const voices = [
        { name: 'Elvira', lang: 'es-AR' },
        { name: 'Microsoft Jorge', lang: 'es-MX' },
        { name: 'Alex', lang: 'en-US' }
    ];
    assert.equal(pickSpanishVoice(voices).name, 'Microsoft Jorge');
});

test('si no hay voz masculina usa español argentino y detecta nombres con tildes', () => {
    assert.equal(pickSpanishVoice([{ name: 'Lucia', lang: 'es-ES' }, { name: 'Sofia', lang: 'es-AR' }]).name, 'Sofia');
    assert.equal(isLikelyMaleVoice({ name: 'Álvaro', lang: 'es-ES' }), true);
    assert.equal(pickSpanishVoice([{ name: 'Alex', lang: 'en-US' }]), null);
});
