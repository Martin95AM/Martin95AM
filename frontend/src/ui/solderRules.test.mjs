import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAT, PARTS, TOTAL_PINS, temperatureAt, jointQuality, orientationMatches, circuitComplete, scoreFor } from './solderRules.mjs';

test('la temperatura cruza una zona apta antes del sobrecalentamiento', () => {
  assert.equal(temperatureAt(0), HEAT.start);
  assert.equal(jointQuality(temperatureAt(100)), 'cold');
  assert.equal(jointQuality(HEAT.idealMin), 'good');
  assert.equal(jointQuality(HEAT.idealMax), 'good');
  assert.equal(jointQuality(HEAT.idealMax + 1), 'overheated');
  assert.equal(temperatureAt(100000), HEAT.max);
});

test('el circuito requiere todos los pines, incluidos los ocho de U1', () => {
  assert.equal(TOTAL_PINS, 21);
  const placed = new Set(PARTS.map(part => part.id));
  const joints = new Set(PARTS.flatMap(part => Array.from({ length: part.pins }, (_, pin) => `${part.id}-${pin}`)));
  assert.equal(circuitComplete(placed, joints), true);
  joints.delete('U1-7');
  assert.equal(circuitComplete(placed, joints), false);
  joints.add('U1-7');
  placed.delete('D2');
  assert.equal(circuitComplete(placed, joints), false);
});

test('los diodos opuestos exigen la banda del lado correcto', () => {
  const d1 = PARTS.find(part => part.id === 'D1');
  const d2 = PARTS.find(part => part.id === 'D2');
  assert.equal(orientationMatches(d1, false), true);
  assert.equal(orientationMatches(d1, true), false);
  assert.equal(orientationMatches(d2, false), false);
  assert.equal(orientationMatches(d2, true), true);
});

test('el puntaje premia una reparación rápida y precisa', () => {
  assert.ok(scoreFor(20, 0) > scoreFor(20, 2));
  assert.ok(scoreFor(20, 0) > scoreFor(60, 0));
  assert.equal(scoreFor(10000, 100), 100);
});
