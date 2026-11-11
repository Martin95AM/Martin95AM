// Functional diagram of the playable hard-clipping circuit. Supporting
// bias, feedback and output level parts are printed as preinstalled parts.
export function schematicMarkup() {
  return `<svg class="solder-schematic-svg" viewBox="0 0 860 157" role="img" aria-label="Esquema: guitarra, capacitor de entrada, amplificador RC4558 con control Drive, resistencia limitadora, dos diodos opuestos a referencia de 4,5 voltios, filtro de tono, capacitor de salida y amplificador">
    <defs><marker id="solder-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#d9b674"/></marker></defs>
    <g class="schematic-wire" fill="none" stroke="#c3a769" stroke-width="2">
      <path d="M25 66H92M113 66H219M302 66H362M410 66H660M682 66H824" marker-end="url(#solder-arrow)"/>
      <path d="M247 39V20H315V40H302M232 94V100M232 123V130H632M312 66V20M470 66V97M510 66V97M596 66V96"/>
      <path d="M470 116V130M510 116V130M596 116V130"/>
    </g>
    <g fill="#e4d6b7" font-family="monospace" font-size="11" font-weight="700">
      <text x="16" y="50">J1</text><text x="82" y="49">C1</text><text x="221" y="50">U1A</text>
      <text x="365" y="49">R3 · 10k</text><text x="446" y="49">D1</text><text x="495" y="49">D2</text>
      <text x="572" y="49">C2</text><text x="645" y="49">C3</text><text x="798" y="49">J2</text>
      <text x="261" y="15">P1 · DRIVE 500k</text><text x="240" y="119">R2 · 4k7</text><text x="331" y="94" fill="#a7d8bf">CLIP</text>
      <text x="192" y="145" fill="#9fd4c4">VREF = 4,5 V · divisor de 9 V preinstalado</text>
      <text x="708" y="92" fill="#a7d8bf">LEVEL → AMPLI</text>
    </g>
    <g class="schematic-symbol" fill="none" stroke="#f3deb2" stroke-width="2">
      <path d="M99 54V78M107 54V78"/><path d="M220 37L220 95L302 66Z"/><path d="M362 66l8 -7l8 14l8 -14l8 14l8 -14l8 7"/><path d="M232 100l-6 4l12 4l-12 4l12 4l-6 7"/>
      <path d="M667 54V78M675 54V78"/><path d="M590 99H602M590 107H602"/>
      <path d="M461 99L478 107L461 115Z M478 99V115"/><path d="M519 99L502 107L519 115Z M502 99V115"/>
      <circle cx="247" cy="20" r="4" fill="#f3deb2"/><circle cx="312" cy="20" r="4" fill="#f3deb2"/>
    </g>
    <g fill="#e4d6b7" font-family="monospace" font-size="10"><text x="74" y="92">47 nF</text><text x="222" y="110">RC4558</text><text x="574" y="122">10 nF</text><text x="642" y="92">1 µF</text></g>
  </svg>`;
}

export function waveformPath(drive, tone, clipped = true, level = 1) {
  const points = [];
  let smooth = 0;
  for (let i = 0; i <= 180; i++) {
    const phase = i / 180 * Math.PI * 7;
    const input = Math.sin(phase) * .74 + Math.sin(phase * 3) * .1;
    const raw = clipped ? Math.max(-.72, Math.min(.72, input * (1 + drive * 7))) : input;
    smooth += (raw - smooth) * (clipped ? .08 + tone * .7 : 1);
    const y = (clipped ? 84 : 29) - smooth * (clipped ? level : 1) * 23;
    points.push(`${i === 0 ? 'M' : 'L'}${(i / 180 * 820 + 12).toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join('');
}
