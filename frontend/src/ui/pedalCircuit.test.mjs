import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from './solderRules.mjs';
import { analyzeCircuit, simulateCircuit } from './pedalCircuit.mjs';

function assembled() {
  return {
    placed: new Set(PARTS.map(part => part.id)),
    soldered: new Set(PARTS.flatMap(part => Array.from({ length: part.pins }, (_, pin) => `${part.id}-${pin}`))),
    orientations: new Map([['D1', 'right'], ['D2', 'left']])
  };
}

test('la placa vacía no transporta señal y diagnostica la alimentación', () => {
  const analysis = analyzeCircuit(new Set(), new Set());
  assert.equal(analysis.signalPath, false);
  assert.equal(analysis.ready, false);
  assert.match(analysis.diagnosis, /Sin alimentación/);
  assert.ok(simulateCircuit(analysis).output.every(value => value === 0));
});

test('el camino de J1 a J2 depende de alimentación, entrada, realimentación y salida', () => {
  const board = assembled();
  assert.equal(analyzeCircuit(board.placed, board.soldered, board.orientations).ready, true);
  board.soldered.delete('U1-7');
  assert.match(analyzeCircuit(board.placed, board.soldered, board.orientations).diagnosis, /alimentación/);
  board.soldered.add('U1-7');
  board.soldered.delete('P1-1');
  assert.equal(analyzeCircuit(board.placed, board.soldered, board.orientations).signalPath, false);
  board.soldered.add('P1-1');
  board.soldered.delete('C3-0');
  assert.equal(analyzeCircuit(board.placed, board.soldered, board.orientations).signalPath, false);
});

test('un diodo ausente produce recorte asimétrico y dos diodos limitan ambas crestas', () => {
  const board = assembled();
  const full = analyzeCircuit(board.placed, board.soldered, board.orientations);
  const symmetric = simulateCircuit(full, { drive: 1, tone: 1, level: 1 }).output;
  assert.ok(Math.max(...symmetric) <= .69);
  assert.ok(Math.min(...symmetric) >= -.69);
  board.soldered.delete('D2-1');
  const partial = analyzeCircuit(board.placed, board.soldered, board.orientations);
  assert.equal(partial.signalPath, true);
  assert.equal(partial.ready, false);
  assert.match(partial.diagnosis, /asimétrico/);
  const asym = simulateCircuit(partial, { drive: 1, tone: 1, level: 1 }).output;
  assert.ok(Math.min(...asym) < -.8);
  board.soldered.add('D2-1');
  board.orientations.set('D2', 'right');
  assert.equal(analyzeCircuit(board.placed, board.soldered, board.orientations).clippingNegative, false);
});

test('C2 cambia el filtro y Drive modifica la salida', () => {
  const board = assembled();
  const full = analyzeCircuit(board.placed, board.soldered, board.orientations);
  const low = simulateCircuit(full, { drive: .05, tone: .5, level: 1 });
  const high = simulateCircuit(full, { drive: .8, tone: .5, level: 1 });
  assert.ok(high.gain > low.gain);
  assert.notDeepEqual(high.output, low.output);
  board.soldered.delete('C2-0');
  const unfiltered = analyzeCircuit(board.placed, board.soldered, board.orientations);
  assert.equal(unfiltered.signalPath, true);
  assert.equal(unfiltered.ready, false);
  assert.ok(simulateCircuit(unfiltered).cutoff > simulateCircuit(full).cutoff);
});
