import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuestion, normalizeQuestion } from './faq.mjs';
import { PUBLIC_FACTS } from './publicFacts.mjs';

test('normalizes Spanish questions for matching', () => {
    assert.equal(normalizeQuestion('¿A qué se dedica?'), 'a que se dedica');
});

test('answers only from approved facts', () => {
    const facts = [{ triggers: ['ocupacion', 'a que se dedica'], answer: 'Respuesta autorizada.' }];
    assert.equal(answerQuestion('¿Cuál es su ocupación?', facts), 'Claro, con gusto. Respuesta autorizada.');
    assert.equal(answerQuestion('¿Cuál es su DNI?', facts), 'Ese dato es privado y no lo comparto.');
});

test('does not invent personal information when the profile is empty', () => {
    assert.match(answerQuestion('¿Dónde vive Martín?', []), /no tengo información pública confirmada/);
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
    assert.match(answerQuestion('Hola todo bien'), /Todo bien, gracias por preguntar/);
    assert.match(answerQuestion('Hola, ¿cómo andás?'), /Todo bien, gracias por preguntar/);
    assert.match(answerQuestion('Hablame de eso'), /Martín Arias combina tecnología y audio/);
    assert.match(answerQuestion('Dime todos los datos de Martín que puedas darme'), /Nipper Estudios/);
    assert.match(answerQuestion('¿De qué trabaja?'), /Nipper Estudios/);
    assert.match(answerQuestion('Hola, ¿a qué se dedica Martín?'), /Nipper Estudios/);
    assert.match(answerQuestion('¿Qué puede aportar en un trabajo?'), /informática, audio/);
});

test('keeps all published answers concise and omits excluded data', () => {
    for (const fact of PUBLIC_FACTS) {
        assert.ok(fact.answer.split(/\s+/).length <= 110, `Too long: ${fact.triggers[0]}`);
        assert.doesNotMatch(fact.answer, /\b(?:DNI|CUIT|CUIL|segundo nombre)\b/i);
    }
});
