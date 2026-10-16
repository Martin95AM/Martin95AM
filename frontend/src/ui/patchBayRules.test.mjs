import test from 'node:test';
import assert from 'node:assert/strict';
import { countCrossings, createPatchPuzzle, swapPlugs } from './patchBayRules.mjs';

test('intercambiar dos plugs resuelve un cruce sin modificar el estado anterior', () => {
    const crossed = [1, 0, 2, 3];
    const clear = swapPlugs(crossed, 0, 1);
    assert.deepEqual(crossed, [1, 0, 2, 3]);
    assert.deepEqual(clear, [0, 1, 2, 3]);
    assert.equal(countCrossings(crossed), 1);
    assert.equal(countCrossings(clear), 0);
});

test('cada partida comienza con los cuatro cables y al menos dos cruces', () => {
    for (let attempt = 0; attempt < 30; attempt++) {
        const mapping = createPatchPuzzle();
        assert.deepEqual([...mapping].sort(), [0, 1, 2, 3]);
        assert.ok(countCrossings(mapping) >= 2);
    }
});
