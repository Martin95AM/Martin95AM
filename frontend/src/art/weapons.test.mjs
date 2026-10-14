import assert from 'node:assert/strict';
import test from 'node:test';
import { drawWeapon } from './weapons.js';

class RecordingGraphics {
    paths = [];
    lineStyle(_width, color) { this.color = color; return this; }
    fillStyle() { return this; }
    fillPoints() { return this; }
    strokePoints() { return this; }
    beginPath() { this.points = []; return this; }
    moveTo(x, y) { this.points.push([x, y]); return this; }
    lineTo(x, y) { this.points.push([x, y]); return this; }
    strokePath() { this.paths.push({ color: this.color, points: this.points }); return this; }
}

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

const weapons = {
    bo: { scale: 0.72, handle: 0x493020, paired: false },
    sai: { scale: 0.70, handle: 0x382a27, paired: true },
    tonfa: { scale: 0.70, handle: 0x3b2b24, paired: true },
    nunchaku: { scale: 0.67, handle: 0x382a27, paired: false },
    kamas: { scale: 0.62, handle: 0x382a27, paired: true }
};

for (const [key, { scale, handle, paired }] of Object.entries(weapons)) {
    for (const direction of ['right', 'left', 'up', 'down']) {
        for (const attacking of [false, true]) {
            test(`${key} stays in the fist facing ${direction}${attacking ? ' while attacking' : ''}`, () => {
                const graphics = new RecordingGraphics();
                drawWeapon(graphics, key, 100, 100, direction, attacking, scale, 9);
                const handles = graphics.paths.filter(path => path.color === handle);
                const fists = paired ? [[91, 100], [109, 100]]
                    : [[direction === 'left' ? 91 : 109, 100]];
                for (const fist of fists) {
                    const distance = Math.min(...handles.flatMap(path => path.points.slice(1).map((point, index) =>
                        distanceToSegment(fist, path.points[index], point))));
                    assert.ok(distance < 1.2, `${key} grip is ${distance.toFixed(1)} px from ${fist}`);
                }
            });
        }
    }
}
