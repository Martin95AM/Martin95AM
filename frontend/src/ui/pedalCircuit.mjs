import { PARTS, circuitComplete } from './solderRules.mjs';

const PART_BY_ID = new Map(PARTS.map(part => [part.id, part]));
const readyPin = (placed, soldered, id, pin) => placed.has(id) && soldered.has(`${id}-${pin}`);
const readyPart = (placed, soldered, id) => {
  const part = PART_BY_ID.get(id);
  return part && Array.from({ length: part.pins }, (_, pin) => readyPin(placed, soldered, id, pin)).every(Boolean);
};

function connected(edges, from, to) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const node = queue.shift();
    if (node === to) return true;
    for (const [a, b] of edges) {
      const next = a === node ? b : b === node ? a : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return false;
}

// Each edge represents a conducting component or an already soldered PCB
// trace. U1 conducts the audio signal only when its power and feedback pins
// are connected. D1/D2 and C2 are shunt branches off the audio path.
export function analyzeCircuit(placed, soldered, orientations = new Map()) {
  const power = readyPin(placed, soldered, 'U1', 3) && readyPin(placed, soldered, 'U1', 7);
  const input = readyPart(placed, soldered, 'C1') && readyPin(placed, soldered, 'U1', 2);
  const feedback = readyPin(placed, soldered, 'U1', 0) && readyPin(placed, soldered, 'U1', 1) && readyPart(placed, soldered, 'P1');
  const clippingPositive = readyPart(placed, soldered, 'D1') && orientations.get('D1') !== 'left';
  const clippingNegative = readyPart(placed, soldered, 'D2') && orientations.get('D2') === 'left';
  const filter = readyPart(placed, soldered, 'C2');
  const output = readyPart(placed, soldered, 'C3');
  const edges = [['AMP_OUT', 'CLIP']]; // R3 is mounted on the PCB.
  if (readyPart(placed, soldered, 'C1')) edges.push(['J1', 'AMP_IN']);
  if (power && input && feedback) edges.push(['AMP_IN', 'AMP_OUT']);
  if (output) edges.push(['CLIP', 'J2']);
  if (clippingPositive) edges.push(['CLIP', 'VREF_D1']);
  if (clippingNegative) edges.push(['CLIP', 'VREF_D2']);
  if (filter) edges.push(['CLIP', 'VREF_C2']);
  const signalPath = connected(edges, 'J1', 'J2');
  const complete = circuitComplete(placed, soldered);
  const ready = complete && signalPath && clippingPositive && clippingNegative && filter;

  let diagnosis = 'El pedal está listo: entrada, ganancia, recorte, filtro y salida conectados.';
  if (!power) diagnosis = 'Sin alimentación: soldá los pines 4 (masa) y 8 (+9 V) de U1.';
  else if (!input) diagnosis = 'Entrada abierta: C1 y el pin 3 de U1 deben llevar la guitarra al amplificador.';
  else if (!feedback) diagnosis = 'Falta ganancia: conectá la salida y realimentación de U1 con P1.';
  else if (!output) diagnosis = 'Salida abierta: C3 debe conectar el nodo CLIP con el jack J2.';
  else if (!clippingPositive && !clippingNegative) diagnosis = 'Hay señal, pero sin recorte por diodos: instalá D1 y D2.';
  else if (!clippingPositive || !clippingNegative) diagnosis = 'Recorte asimétrico: falta un diodo o su banda está invertida.';
  else if (!filter) diagnosis = 'La señal recorta, pero falta C2 para filtrar los agudos.';
  else if (!complete) diagnosis = 'La señal pasa, pero quedan pines de U1 sin soldar para cerrar la placa.';

  return { power, input, feedback, clippingPositive, clippingNegative, filter, output,
    signalPath, complete, ready, diagnosis, edges };
}

// Discrete audio-path model for the oscilloscope and synthetic test tone.
// Voltage is relative to the 4.5 V virtual ground. This models gain, diode
// thresholds, the output coupling path and a first-order tone filter.
export function simulateCircuit(analysis, { drive = .72, tone = .54, level = .6 } = {}, samples = 181) {
  const input = [];
  const output = [];
  const gain = 1 + (Math.max(0, Math.min(1, drive)) * 500000) / 4700;
  const cutoff = analysis.filter ? 350 + Math.max(0, Math.min(1, tone)) * 4500 : 14000;
  const dt = (4 / 110) / Math.max(1, samples - 1);
  const alpha = 1 - Math.exp(-2 * Math.PI * cutoff * dt);
  let filtered = 0;
  for (let i = 0; i < samples; i++) {
    const phase = i / Math.max(1, samples - 1) * Math.PI * 8;
    const guitar = .055 * Math.sin(phase) + .011 * Math.sin(phase * 3);
    input.push(guitar);
    if (!analysis.signalPath) { output.push(0); continue; }
    let amplified = Math.max(-3, Math.min(3, guitar * gain));
    if (analysis.clippingPositive) amplified = Math.min(.68, amplified);
    if (analysis.clippingNegative) amplified = Math.max(-.68, amplified);
    filtered += (amplified - filtered) * alpha;
    output.push(filtered * Math.max(0, Math.min(1, level)));
  }
  return { input, output, gain, cutoff };
}
