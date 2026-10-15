import assert from 'node:assert/strict';
import test from 'node:test';
import { drawWeapon } from './weapons.js';
import { combatHandOffsets } from '../combat/poses.js';

class RecordingGraphics {
    paths = [];
    polygons = [];
    lineStyle(_width, color) { this.color = color; return this; }
    fillStyle(color) { this.fillColor = color; return this; }
    fillPoints(points) { this.polygons.push({ color: this.fillColor, points }); return this; }
    strokePoints() { return this; }
    beginPath() { this.points = []; return this; }
    moveTo(x, y) { this.points.push([x, y]); return this; }
    lineTo(x, y) { this.points.push([x, y]); return this; }
    strokePath() { this.paths.push({ color: this.color, points: this.points }); return this; }
}

test('held sai has a longer middle blade and remains proportional to the fighter', () => {
    const graphics = new RecordingGraphics();
    drawWeapon(graphics, 'sai', 100, 100, 'right', false, 0.48, 9);
    const furthestX = color => Math.max(...graphics.polygons
        .filter(polygon => polygon.color === color)
        .flatMap(polygon => polygon.points.map(point => point.x)));
    const middleTip = furthestX(0xc8d3d9);
    const outerTip = furthestX(0xaab8c2);
    assert.ok(middleTip - outerTip >= 6, 'central blade extends clearly beyond both side prongs');
    assert.ok(middleTip - 109 <= 18, 'sai length stays below half the 48px fighter height');
    const centralBlades = graphics.polygons.filter(polygon => polygon.color === 0xc8d3d9);
    assert.ok(centralBlades.some(blade => blade.points.some(point => point.x < 85)),
        'rear sai is visible outside the torso instead of crossing it');
});

test('only the leading sai follows the punch; the guarding sai has less reach', () => {
    for (const direction of ['right', 'left']) {
        const guardingHand = direction === 'right' ? -1 : 1;
        const leadingHand = -guardingHand;
        const phases = ['windup', 'chamber', 'strike', 'follow', 'recover'];
        const anchors = phases.map(phase => combatHandOffsets(direction, phase));
        for (const anchor of anchors) {
            assert.deepEqual(anchor[guardingHand], anchors[0][guardingHand],
                'the far hand stays planted throughout the punch');
        }
        assert.ok(new Set(anchors.map(anchor => anchor[leadingHand].x.toFixed(2))).size > 1,
            'the striking hand advances while the other stays still');

        const graphics = new RecordingGraphics();
        const hands = anchors[2];
        drawWeapon(graphics, 'sai', 100, 100, direction, true, 0.48, hands);
        const blades = graphics.polygons.filter(polygon => polygon.color === 0xc8d3d9);
        const reach = (blade, hand) => Math.hypot(
            blade.points[2].x - (100 + hands[hand].x),
            blade.points[2].y - (100 + hands[hand].y)
        );
        const rear = reach(blades[guardingHand === -1 ? 0 : 1], guardingHand);
        const front = reach(blades[leadingHand === -1 ? 0 : 1], leadingHand);
        assert.ok(rear < front * 0.75, 'the far sai projects substantially less than the leading sai');
    }
});

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

const weapons = {
    bo: { scale: 0.72, handle: 0x493020, paired: false },
    sai: { scale: 0.48, handle: 0x382a27, paired: true },
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

for (const [key, { scale, handle, paired }] of Object.entries(weapons)) {
    for (const direction of ['right', 'left', 'up', 'down']) {
        for (const phase of ['windup', 'strike', 'recover']) {
            test(`${key} follows the moving fist facing ${direction} in ${phase}`, () => {
                const graphics = new RecordingGraphics();
                const hands = combatHandOffsets(direction, phase);
                drawWeapon(graphics, key, 100, 100, direction, phase === 'strike', scale, hands);
                const handles = graphics.paths.filter(path => path.color === handle);
                const primaryHand = direction === 'left' ? -1 : 1;
                for (const hand of paired ? [-1, 1] : [primaryHand]) {
                    const fist = [100 + hands[hand].x, 100 + hands[hand].y];
                    const distance = Math.min(...handles.flatMap(path => path.points.slice(1).map((point, index) =>
                        distanceToSegment(fist, path.points[index], point))));
                    assert.ok(distance < 1.2, `${key} grip is ${distance.toFixed(1)} px from ${fist}`);
                }
            });
        }
    }
}
