// Pedal educativo de recorte duro a 9 V. La placa ya trae R1 (1 MΩ de
// polarización de entrada), R2 (4,7 kΩ a VREF), R3 (10 kΩ limitadora),
// el divisor de 4,5 V, su desacoplo y el control de nivel de salida.
// El jugador instala las siete piezas que cierran el camino de audio.
export const PARTS = Object.freeze([
  { id: 'C1', name: 'Entrada', value: '47 nF', kind: 'capacitor', stage: 'ENTRADA', pins: 2, detail: 'Bloquea la continua de la guitarra' },
  { id: 'U1', name: 'Amplificador', value: 'RC4558', kind: 'chip', stage: 'GANANCIA', pins: 8, detail: 'Amplifica alrededor de VREF = 4,5 V' },
  { id: 'P1', name: 'Drive', value: '500 kΩ', kind: 'pot', stage: 'GANANCIA', pins: 3, detail: 'Ajusta la realimentación de U1' },
  { id: 'D1', name: 'Clip +', value: '1N4148', kind: 'diode', stage: 'RECORTE', pins: 2, stripe: 'right', detail: 'Recorta la cresta positiva' },
  { id: 'D2', name: 'Clip −', value: '1N4148', kind: 'diode', stage: 'RECORTE', pins: 2, stripe: 'left', detail: 'Recorta la cresta negativa' },
  { id: 'C2', name: 'Tono', value: '10 nF', kind: 'capacitor', stage: 'FILTRO', pins: 2, detail: 'Con R3 filtra agudos (≈1,6 kHz)' },
  { id: 'C3', name: 'Salida', value: '1 µF', kind: 'capacitor', stage: 'SALIDA', pins: 2, detail: 'Aísla VREF antes del amplificador' }
]);

export const TOTAL_PINS = PARTS.reduce((sum, part) => sum + part.pins, 0);

export const HEAT = Object.freeze({ start: 25, idealMin: 180, idealMax: 270, max: 320, degreesPerSecond: 115 });

export function temperatureAt(elapsedMs) {
  return Math.min(HEAT.max, Math.round(HEAT.start + Math.max(0, elapsedMs) * HEAT.degreesPerSecond / 1000));
}

export function jointQuality(temperature) {
  if (temperature < HEAT.idealMin) return 'cold';
  if (temperature > HEAT.idealMax) return 'overheated';
  return 'good';
}

export function orientationMatches(part, flipped) {
  if (!part.stripe) return true;
  return (flipped ? 'left' : 'right') === part.stripe;
}

export function circuitComplete(placed, soldered) {
  return PARTS.every(part => placed.has(part.id) &&
    Array.from({ length: part.pins }, (_, pin) => `${part.id}-${pin}`).every(key => soldered.has(key)));
}

export function scoreFor(seconds, mistakes) {
  return Math.max(100, Math.round(1500 - Math.max(0, seconds) * 3 - Math.max(0, mistakes) * 35));
}
