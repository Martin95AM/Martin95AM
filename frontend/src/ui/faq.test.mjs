import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuestion, createAnswerer, normalizeQuestion } from './faq.mjs';
import { PUBLIC_FACTS } from './publicFacts.mjs';

test('normalizes Spanish questions for matching', () => {
    assert.equal(normalizeQuestion('¿A qué se dedica?'), 'a que se dedica');
});

test('answers only from approved facts', () => {
    const facts = [{ triggers: ['ocupacion', 'a que se dedica'], answer: 'Respuesta autorizada.' }];
    assert.equal(answerQuestion('¿Cuál es su ocupación?', facts), 'Respuesta autorizada.');
    assert.equal(answerQuestion('¿Cuál es su DNI?', facts), 'Ese dato es privado y no lo comparto.');
});

test('does not invent personal information when the profile is empty', () => {
    assert.match(answerQuestion('¿Dónde vive Martín?', []), /no tengo un dato confirmado/);
});

test('never answers requests for explicitly excluded personal data', () => {
    const facts = [{ triggers: ['dni', 'segundo nombre'], answer: 'No debe aparecer.' }];
    assert.equal(answerQuestion('¿Cuál es su DNI?', facts), 'Ese dato es privado y no lo comparto.');
    assert.equal(answerQuestion('¿Cuál es su segundo nombre?', facts), 'Ese dato es privado y no lo comparto.');
    assert.equal(answerQuestion('¿Cuál es su CUIT?', facts), 'Ese dato es privado y no lo comparto.');
    assert.equal(answerQuestion('¿Cuál es su domicilio?', facts), 'Ese dato es privado y no lo comparto.');
});

test('answers professional questions from the curated profile', () => {
    assert.match(answerQuestion('¿Qué estudia Martín?'), /Inteligencia Artificial y Robótica/);
    assert.match(answerQuestion('¿Qué idiomas habla?'), /inglés, italiano y alemán/);
    assert.match(answerQuestion('¿En qué trabajó?'), /Nipper Estudios/);
});

test('handles greetings and common HR questions naturally', () => {
    assert.match(answerQuestion('Hola todo bien'), /Bien, por suerte/);
    assert.match(answerQuestion('Hola, ¿cómo andás?'), /Bien, por suerte/);
    assert.match(answerQuestion('Hablame de eso'), /Martín Arias combina tecnología y audio/);
    assert.match(answerQuestion('Dime todos los datos de Martín que puedas darme'), /Nipper Estudios/);
    assert.match(answerQuestion('¿De qué trabaja?'), /Nipper Estudios/);
    assert.match(answerQuestion('Hola, ¿a qué se dedica Martín?'), /Nipper Estudios/);
    assert.match(answerQuestion('¿Qué puede aportar en un trabajo?'), /informática, audio/);
});

test('repeated questions get a different safe answer in the same conversation', () => {
    for (const question of ['hola como andas?', '¿En qué trabajó Martín?', '¿Qué idiomas habla?', '¿Cuál es su DNI?', '¿Cuánto mide?']) {
        const answer = createAnswerer();
        const first = answer(question);
        const second = answer(question.toUpperCase());
        assert.notEqual(second, first, `Repeated answer for ${question}`);
        assert.equal(answer(question), first, `Third answer should rotate for ${question}`);
    }
    const answer = createAnswerer();
    assert.match(answer('¿Cuál es su DNI?'), /privado/);
    assert.match(answer('¿Cuál es su DNI?'), /privacidad/);
});

test('keeps all published answers concise and omits excluded data', () => {
    for (const fact of PUBLIC_FACTS) {
        for (const reply of [fact.answer, fact.alternative]) {
            assert.ok(reply, `Missing answer variant: ${fact.triggers[0]}`);
            assert.ok(reply.split(/\s+/).length <= 110, `Too long: ${fact.triggers[0]}`);
            assert.doesNotMatch(reply, /\b(?:DNI|CUIT|CUIL|segundo nombre)\b/i);
        }
        assert.notEqual(fact.answer, fact.alternative);
    }
});
