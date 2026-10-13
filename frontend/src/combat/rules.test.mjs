import test from 'node:test';
import assert from 'node:assert/strict';
import { canHit, facingTarget, STRIKES } from './rules.mjs';

test('punches only land within reach and in front of the attacker', () => {
    const actor = { x: 320, y: 320 };
    assert.equal(canHit(actor, { x: 320, y: 370 }, 'down', STRIKES.punch.reach), true);
    assert.equal(canHit(actor, { x: 320, y: 375 }, 'down', STRIKES.punch.reach), false);
    assert.equal(canHit(actor, { x: 320, y: 270 }, 'down', STRIKES.punch.reach), false);
    assert.equal(canHit(actor, { x: 360, y: 320 }, 'down', STRIKES.punch.reach), false);
    assert.equal(canHit(actor, actor, 'down', STRIKES.punch.reach), false);
});

test('kicks reach farther, with more time to dodge and recover', () => {
    assert.equal(canHit({ x: 0, y: 0 }, { x: 65, y: 0 }, 'right', STRIKES.kick.reach), true);
    assert.equal(canHit({ x: 0, y: 0 }, { x: 65, y: 0 }, 'right', STRIKES.punch.reach), false);
    assert.ok(STRIKES.kick.windup > STRIKES.punch.windup);
    assert.ok(STRIKES.kick.cooldown > STRIKES.punch.cooldown);
});

test('Sensei can face and hit targets in all four directions', () => {
    const actor = { x: 0, y: 0 };
    for (const [direction, target] of Object.entries({
        up: { x: 0, y: -40 }, down: { x: 0, y: 40 },
        left: { x: -40, y: 0 }, right: { x: 40, y: 0 }
    })) {
        assert.equal(facingTarget(actor, target), direction);
        assert.equal(canHit(actor, target, direction, STRIKES.punch.reach), true);
    }
});
