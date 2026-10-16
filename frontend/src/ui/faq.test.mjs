import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuestion, normalizeQuestion } from './faq.mjs';

test('normalizes Spanish questions for matching', () => {
    assert.equal(normalizeQuestion('¿A qué se dedica?'), 'a que se dedica');
});

test('answers only from approved facts', () => {
    const facts = [{ triggers: ['ocupacion', 'a que se dedica'], answer: 'Respuesta autorizada.' }];
    assert.equal(answerQuestion('¿Cuál es su ocupación?', facts), 'Respuesta autorizada.');
    assert.equal(answerQuestion('¿Cuál es su DNI?', facts), 'Ese dato es privado y no lo comparto.');
});

test('does not invent personal information when the profile is empty', () => {
    assert.match(answerQuestion('¿Dónde vive Martín?', []), /no lo sé/);
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
