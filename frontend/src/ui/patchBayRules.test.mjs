import test from 'node:test';
import assert from 'node:assert/strict';
import { PATCH_STAGES, countCrossings, createPatchPuzzle, getHintPair, swapPlugs } from './patchBayRules.mjs';

test('intercambiar dos plugs no modifica el estado anterior', () => {
    const crossed = [1, 0, 2, 3];
    const clear = swapPlugs(crossed, 0, 1);
    assert.deepEqual(crossed, [1, 0, 2, 3]);
    assert.deepEqual(clear, [0, 1, 2, 3]);
    assert.equal(countCrossings(crossed), 1);
    assert.equal(countCrossings(clear), 0);
});

test('los tres desafíos crean permutaciones con suficientes cruces', () => {
    for (const stage of PATCH_STAGES) {
        for (let attempt = 0; attempt < 30; attempt++) {
            const mapping = createPatchPuzzle(Math.random, stage.channels, stage.minCrossings);
            assert.deepEqual([...mapping].sort(), Array.from({ length: stage.channels }, (_, i) => i));
            assert.ok(countCrossings(mapping) >= stage.minCrossings);
        }
    }
});

test('la pista propone un intercambio que conecta al menos una salida', () => {
    const mapping = [2, 0, 3, 1];
    const pair = getHintPair(mapping);
    assert.deepEqual(pair, [0, 1]);
    assert.equal(swapPlugs(mapping, ...pair)[0], 0);
    assert.equal(getHintPair([0, 1, 2, 3]), null);
});

test('una fuente aleatoria degenerada no deja el juego en un bucle', () => {
    assert.deepEqual(createPatchPuzzle(() => 0.999, 4, 2), [3, 2, 1, 0]);
    assert.throws(() => createPatchPuzzle(Math.random, 7), RangeError);
});
