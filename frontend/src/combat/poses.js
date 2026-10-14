import { DIRECTIONS } from './rules.mjs';
import { illustratedFrames } from '../art/illustrated.js';

// Coordinates on the normalized 96×144 illustrated frame. The same pivot and
// fist coordinates drive the pose art and the weapon grip, preventing drift.
const ARM = {
    pivot: [70, 42], hand: [75, 78],
    outline: [[67, 39], [75, 35], [82, 45], [86, 57], [87, 68],
        [84, 82], [77, 88], [65, 82], [65, 65], [66, 51]]
};
const LEG = {
    pivot: [56, 82],
    outline: [[49, 78], [62, 77], [70, 88], [78, 106],
        [85, 133], [82, 140], [63, 140], [56, 119], [49, 94]]
};

const ANGLES = {
    punch: {
        right: { windup: 25, strike: -80, recover: -35 },
        left: { windup: 25, strike: -80, recover: -35 },
        up: { windup: -30, strike: -160, recover: -80 },
        down: { windup: -50, strike: 5, recover: -20 }
    },
    kick: {
        right: { windup: 20, strike: -75, recover: -25 },
        left: { windup: 20, strike: -75, recover: -25 },
        up: { windup: 15, strike: -135, recover: -45 },
        down: { windup: -30, strike: 15, recover: -10 }
    }
};
const STRETCH = {
    punch: { down: { strike: 1.35 } },
    kick: { down: { strike: 1.30 } }
};

function rotated([x, y], [px, py], angle, stretch = 1) {
    const radians = angle * Math.PI / 180;
    const dx = x - px, dy = (y - py) * stretch;
    return [px + dx * Math.cos(radians) - dy * Math.sin(radians),
        py + dx * Math.sin(radians) + dy * Math.cos(radians)];
}

// World-space offsets from the actor centre, keyed by the hand on screen.
export function combatHandOffsets(direction, phase = 'strike', type = 'punch') {
    const angle = ANGLES[type]?.[direction]?.[phase] ?? 0;
    const stretch = STRETCH[type]?.[direction]?.[phase] ?? 1;
    const [movingX, movingY] = rotated(ARM.hand, ARM.pivot, angle, stretch);
    const toWorld = ([x, y]) => ({ x: (x - 48) / 3, y: (y - 72) / 3 });
    if (direction === 'left') {
        return { [-1]: toWorld([96 - movingX, movingY]), [1]: toWorld([75, 78]) };
    }
    return { [-1]: toWorld([21, 78]), [1]: toWorld([movingX, movingY]) };
}

function polygon(ctx, vertices) {
    ctx.beginPath();
    vertices.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
}

function extractPart(frame, outline) {
    const part = document.createElement('canvas');
    part.width = frame.width;
    part.height = frame.height;
    const ctx = part.getContext('2d');
    polygon(ctx, outline);
    ctx.clip();
    ctx.drawImage(frame, 0, 0);
    return part;
}

function drawPose(ctx, frame, direction, type, phase, parts) {
    const part = type === 'kick' ? LEG : ARM;
    const angle = ANGLES[type][direction][phase];
    const stretch = STRETCH[type]?.[direction]?.[phase] ?? 1;
    ctx.save();
    ctx.translate(48, 24);
    if (direction === 'left') { ctx.translate(96, 0); ctx.scale(-1, 1); }
    ctx.drawImage(frame, 0, 0);

    // Remove only the moving limb, preserving the approved head, gi and belt.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    polygon(ctx, part.outline);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(...part.pivot);
    ctx.rotate(angle * Math.PI / 180);
    ctx.scale(1, stretch);
    ctx.translate(-part.pivot[0], -part.pivot[1]);
    ctx.drawImage(type === 'kick' ? parts.leg : parts.arm, 0, 0);
    ctx.restore();
    // Keep the original sleeve/hip over the rotating cutout. This covers the
    // pivot seam and makes the extended limb visibly emerge from the body.
    if (type === 'punch') ctx.drawImage(frame, 63, 34, 12, 14, 63, 34, 12, 14);
    else ctx.drawImage(frame, 48, 75, 21, 18, 48, 75, 21, 18);
    ctx.restore();
}

export function createCombatPoses(scene) {
    for (const character of ['guard', 'martin']) {
        const frame = illustratedFrames.get(character);
        const parts = { arm: extractPart(frame, ARM.outline), leg: extractPart(frame, LEG.outline) };
        for (const direction of Object.keys(DIRECTIONS)) {
            for (const type of ['punch', 'kick']) {
                for (const phase of ['windup', 'strike', 'recover']) {
                    const key = `${character}-${direction}-${type}-${phase}`;
                    if (scene.textures.exists(key)) continue;
                    const texture = scene.textures.createCanvas(key, 192, 192);
                    drawPose(texture.context, frame, direction, type, phase, parts);
                    texture.refresh();
                }
            }
        }
    }
}
