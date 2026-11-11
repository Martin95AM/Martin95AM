export const PARTS = [
  { id: 'R1', name: 'Resistencia', kind: 'resistor', detail: 'Limita la corriente' },
  { id: 'D1', name: 'Diodo', kind: 'diode', detail: 'Protege la polaridad' },
  { id: 'C1', name: 'Capacitor', kind: 'capacitor', detail: 'Estabiliza la señal' },
  { id: 'L1', name: 'LED', kind: 'led', detail: 'Enciende la lámpara' }
];

export const HEAT = Object.freeze({ start: 25, idealMin: 180, idealMax: 270, max: 320, degreesPerSecond: 115 });

export function temperatureAt(elapsedMs) {
  return Math.min(HEAT.max, Math.round(HEAT.start + Math.max(0, elapsedMs) * HEAT.degreesPerSecond / 1000));
}

export function jointQuality(temperature) {
  if (temperature < HEAT.idealMin) return 'cold';
  if (temperature > HEAT.idealMax) return 'overheated';
  return 'good';
}

export function circuitComplete(placed, soldered) {
  return PARTS.every(part => placed.has(part.id) &&
    soldered.has(`${part.id}-0`) && soldered.has(`${part.id}-1`));
}

export function scoreFor(seconds, mistakes) {
  return Math.max(100, Math.round(1000 - Math.max(0, seconds) * 4 - Math.max(0, mistakes) * 40));
}
