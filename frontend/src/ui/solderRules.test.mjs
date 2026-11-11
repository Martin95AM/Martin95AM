import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAT, PARTS, temperatureAt, jointQuality, circuitComplete, scoreFor } from './solderRules.mjs';

test('la temperatura cruza una zona apta antes del sobrecalentamiento', () => {
  assert.equal(temperatureAt(0), HEAT.start);
  assert.equal(jointQuality(temperatureAt(100)), 'cold');
  assert.equal(jointQuality(HEAT.idealMin), 'good');
  assert.equal(jointQuality(HEAT.idealMax), 'good');
  assert.equal(jointQuality(HEAT.idealMax + 1), 'overheated');
  assert.equal(temperatureAt(100000), HEAT.max);
});

test('el circuito exige ambos pines de todos los componentes', () => {
  const placed = new Set(PARTS.map(part => part.id));
  const joints = new Set(PARTS.flatMap(part => [`${part.id}-0`, `${part.id}-1`]));
  assert.equal(circuitComplete(placed, joints), true);
  joints.delete('L1-1');
  assert.equal(circuitComplete(placed, joints), false);
  joints.add('L1-1');
  placed.delete('L1');
  assert.equal(circuitComplete(placed, joints), false);
});

test('el puntaje premia una reparación rápida y precisa', () => {
  assert.ok(scoreFor(20, 0) > scoreFor(20, 2));
  assert.ok(scoreFor(20, 0) > scoreFor(60, 0));
  assert.equal(scoreFor(10000, 100), 100);
});
