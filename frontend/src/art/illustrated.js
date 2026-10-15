import { FRAME_WIDTH, FRAME_HEIGHT } from './characters.js';

const sourceFor = key => key === 'guard' ? 'art-sensei'
    : key === 'tecnico_casual' ? 'art-technician'
    : key === 'martin_casual' ? 'art-martin-studio'
    : key === 'martin_casual_headphones' ? 'art-martin-studio-headphones'
    : key.startsWith('student_') ? 'art-student' : 'art-martin';

const beltColors = {
    yellow: [244, 190, 39], orange: [226, 105, 38], green: [48, 148, 81],
    blue: [46, 105, 184], brown: [111, 69, 43]
};
export const illustratedFrames = new Map();
export const WALK_START = 20;
export const WALK_FRAMES = 8;

// Cut the approved illustration at actual joints. Every walking frame is
// assembled from upper and lower limbs rather than sliding a flat silhouette.
const LEFT_ARM = {
    upper: [[25, 38], [39, 39], [39, 51], [35, 66], [23, 68], [18, 57]],
    lower: [[20, 60], [35, 61], [34, 75], [30, 89], [14, 91], [11, 80]],
    shoulder: [31, 44], joint: [27, 64]
};
const LEFT_LEG = {
    upper: [[34, 77], [49, 77], [49, 96], [42, 113], [24, 113], [25, 99]],
    lower: [[24, 106], [43, 106], [39, 125], [37, 133], [15, 133], [15, 125]],
    foot: [[13, 128], [39, 128], [43, 137], [43, 143], [8, 143], [8, 137]],
    hip: [39, 83], joint: [32, 109], ankle: [27, 132]
};
const mirror = points => points.map(([x, y]) => [FRAME_WIDTH - x, y]);
const limbs = [
    { ...LEFT_ARM, kind: 'arm' },
    { upper: mirror(LEFT_ARM.upper), lower: mirror(LEFT_ARM.lower),
        shoulder: [65, 44], joint: [69, 64], kind: 'arm' },
    { ...LEFT_LEG, kind: 'leg' },
    { upper: mirror(LEFT_LEG.upper), lower: mirror(LEFT_LEG.lower),
        foot: mirror(LEFT_LEG.foot), hip: [57, 83], joint: [64, 109], ankle: [69, 132], kind: 'leg' }
];

function path(ctx, points) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
}

function clippedPart(frame, points) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    path(ctx, points);
    ctx.clip();
    ctx.drawImage(frame, 0, 0);
    return canvas;
}

function articulatedParts(frame) {
    return limbs.map(limb => ({
        ...limb,
        upperImage: clippedPart(frame, limb.upper),
        lowerImage: clippedPart(frame, limb.lower),
        footImage: limb.foot ? clippedPart(frame, limb.foot) : null
    }));
}

function rotatePart(ctx, image, pivot, angle, length = 1) {
    ctx.save();
    ctx.translate(...pivot);
    ctx.rotate(angle);
    ctx.scale(1, length);
    ctx.translate(-pivot[0], -pivot[1]);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
}

function drawWalkingFrame(ctx, frame, direction, step, parts) {
    // A full left/right gait: heel contact, loading, mid-stance, toe-off,
    // then the same four phases on the opposite side. The hip drives the
    // stride; knee flexion peaks during swing, after the foot leaves ground.
    const phases = [
        { hip: 0.30, bob: 0 },
        { hip: 0.24, bob: 1 },
        { hip: 0.13, bob: 2 },
        { hip: 0.04, bob: 1 },
        { hip: -0.30, bob: 0 },
        { hip: -0.24, bob: 1 },
        { hip: -0.13, bob: 2 },
        { hip: -0.04, bob: 1 }
    ];
    // Only the leg in swing flexes. Its heel rises a few pixels toward the
    // body while the planted leg stays long enough to support the weight.
    const kneeFlex = [0, 0.07, 0.16, 0.09, 0, 0, 0, 0];
    const footRoll = [-0.08, 0.10, 0.30, 0.17, -0.08, 0, 0, 0];
    const phase = step % WALK_FRAMES;
    const { hip, bob } = phases[phase];
    const sideView = direction === 'left' || direction === 'right';
    ctx.save();
    if (direction === 'left') { ctx.translate(FRAME_WIDTH, 0); ctx.scale(-1, 1); }
    ctx.translate(0, bob);
    ctx.drawImage(frame, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const limb of parts) for (const polygon of [limb.upper, limb.lower, limb.foot].filter(Boolean)) {
        path(ctx, polygon);
        ctx.fill();
    }
    ctx.restore();

    // Draw legs behind the torso and arms over the sleeves. The elbow and
    // knee angles are independent from the shoulder and hip swing.
    for (const [legIndex, limb] of parts.filter(part => part.kind === 'leg').entries()) {
        // Both image-space rotations point the same way because the source
        // limbs are mirrored; visually one thigh advances as the other trails.
        const hipAngle = hip * (sideView ? 1 : 0.82);
        const limbPhase = (phase + legIndex * 4) % WALK_FRAMES;
        const flex = kneeFlex[limbPhase];
        const kneeAngle = Math.sign(hip) * flex;
        const pivot = limb.hip;
        ctx.save();
        ctx.translate(...pivot);
        ctx.rotate(hipAngle);
        ctx.translate(-pivot[0], -pivot[1]);
        // Perspective foreshortening lifts the heel by several display pixels
        // at peak swing; a smaller change disappeared at the game's 1/3 scale.
        ctx.save();
        ctx.translate(...limb.joint);
        ctx.rotate(kneeAngle);
        ctx.scale(1, 1 - flex * 1.8);
        ctx.translate(-limb.joint[0], -limb.joint[1]);
        ctx.drawImage(limb.lowerImage, 0, 0);
        // The ankle articulates independently: heel contact, toe-off, then a
        // lifted toe during swing. This remains visible at the game's scale.
        rotatePart(ctx, limb.footImage, limb.ankle, Math.sign(hip) * footRoll[limbPhase]);
        ctx.restore();
        ctx.drawImage(limb.upperImage, 0, 0);
        ctx.restore();
    }
    for (const limb of parts.filter(part => part.kind === 'arm')) {
        const shoulderAngle = -hip * (sideView ? 1.15 : 0.9);
        const elbowAngle = -Math.sign(hip) * (0.08 + Math.abs(hip) * 0.35);
        const pivot = limb.shoulder;
        ctx.save();
        ctx.translate(...pivot);
        ctx.rotate(shoulderAngle);
        ctx.translate(-pivot[0], -pivot[1]);
        rotatePart(ctx, limb.lowerImage, limb.joint, elbowAngle);
        ctx.drawImage(limb.upperImage, 0, 0);
        ctx.restore();
    }
    ctx.restore();
}

function drawSeatedFrame(ctx, frame, parts) {
    ctx.drawImage(frame, 0, 0);
    const legs = parts.filter(part => part.kind === 'leg');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const limb of legs) for (const polygon of [limb.upper, limb.lower, limb.foot]) {
        path(ctx, polygon);
        ctx.fill();
    }
    ctx.restore();
    for (const [index, limb] of legs.entries()) {
        const side = index === 0 ? 1 : -1;
        ctx.save();
        ctx.translate(...limb.hip);
        ctx.rotate(side * 0.63);
        ctx.translate(-limb.hip[0], -limb.hip[1]);
        ctx.save();
        ctx.translate(...limb.joint);
        ctx.rotate(-side * 0.62);
        ctx.scale(1, 0.64);
        ctx.translate(-limb.joint[0], -limb.joint[1]);
        ctx.drawImage(limb.lowerImage, 0, 0);
        ctx.drawImage(limb.footImage, 0, 0);
        ctx.restore();
        ctx.drawImage(limb.upperImage, 0, 0);
        ctx.restore();
    }
    ctx.drawImage(frame, 31, 74, 34, 13, 31, 74, 34, 13);
}

function sourceCanvas(scene, key) {
    const image = scene.textures.get(sourceFor(key)).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
    for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) {
        if (pixels.data[(y * canvas.width + x) * 4 + 3] < 80) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    return { canvas, bounds: { left, top, width: right - left + 2, height: bottom - top + 2 } };
}

function rankColoredFrame(frame, key) {
    const color = beltColors[key.replace('student_', '')];
    if (!color || key === 'student_yellow') return frame;
    const copy = document.createElement('canvas');
    copy.width = FRAME_WIDTH; copy.height = FRAME_HEIGHT;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(frame, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2], a = pixels.data[i + 3];
        if (a > 80 && r > 140 && g > 85 && b < 85 && r > b * 2 && g > b * 1.6) {
            const shade = Math.max(0.45, Math.min(1.2, (r + g) / 440));
            pixels.data[i] = color[0] * shade;
            pixels.data[i + 1] = color[1] * shade;
            pixels.data[i + 2] = color[2] * shade;
        }
    }
    ctx.putImageData(pixels, 0, 0);
    return copy;
}

function normalizedFrame(source) {
    const frame = document.createElement('canvas');
    frame.width = FRAME_WIDTH; frame.height = FRAME_HEIGHT;
    const ctx = frame.getContext('2d');
    const { left, top, width, height } = source.bounds;
    const scale = Math.min(88 / width, 132 / height);
    const w = width * scale, h = height * scale;
    ctx.drawImage(source.canvas, left, top, width, height, (FRAME_WIDTH - w) / 2, 5, w, h);
    return frame;
}

export function drawIllustratedFrame(ctx, frame, direction = 'down', pose = 'idle', step = 0, parts = null) {
    ctx.save();
    if (pose === 'walk') {
        drawWalkingFrame(ctx, frame, direction, step, parts || articulatedParts(frame));
        ctx.restore();
        return;
    }
    if (direction === 'left') { ctx.translate(FRAME_WIDTH, 0); ctx.scale(-1, 1); }
    if (pose === 'pushup') {
        ctx.translate(0, 85); ctx.scale(1, 0.38);
        ctx.drawImage(frame, 0, 0);
    } else if (pose === 'sit') {
        drawSeatedFrame(ctx, frame, parts || articulatedParts(frame));
    } else if (pose === 'punch' || pose === 'kick') {
        ctx.translate(pose === 'punch' ? 5 : 2, pose === 'kick' ? -3 : 0);
        ctx.drawImage(frame, 0, 0);
    } else {
        ctx.drawImage(frame, 0, 0);
    }
    ctx.restore();
}

export function createIllustratedTextures(scene) {
    const keys = ['martin', 'guard', 'martin_casual', 'martin_casual_headphones', 'tecnico_casual',
        ...Object.keys(beltColors).map(color => `student_${color}`)];
    illustratedFrames.clear();
    const baseFrames = new Map();
    for (const key of keys) {
        const sourceKey = sourceFor(key);
        if (!baseFrames.has(sourceKey)) baseFrames.set(sourceKey, normalizedFrame(sourceCanvas(scene, key)));
        const frame = rankColoredFrame(baseFrames.get(sourceKey), key);
        illustratedFrames.set(key, frame);
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const isStudent = key.startsWith('student_');
        const parts = isStudent ? null : articulatedParts(frame);
        const frameCount = isStudent ? 4 : WALK_START + WALK_FRAMES * 4 + (key === 'tecnico_casual' ? 1 : 0);
        const columns = isStudent ? 4 : 8;
        const texture = scene.textures.createCanvas(key, FRAME_WIDTH * columns,
            FRAME_HEIGHT * Math.ceil(frameCount / columns));
        for (let index = 0; index < frameCount; index++) {
            const x = index % columns * FRAME_WIDTH, y = Math.floor(index / columns) * FRAME_HEIGHT;
            texture.context.save(); texture.context.translate(x, y);
            const sitting = key === 'tecnico_casual' && index === WALK_START + WALK_FRAMES * 4;
            const walking = !isStudent && index >= WALK_START && !sitting;
            const direction = isStudent ? 'left' : ['down', 'left', 'right', 'up'][Math.floor((walking ? index - WALK_START : index) / (walking ? WALK_FRAMES : 4))] || 'down';
            const pose = isStudent ? index < 2 ? 'idle' : 'pushup'
                : sitting ? 'sit' : walking ? 'walk' : index >= 16 ? 'pushup' : 'idle';
            drawIllustratedFrame(texture.context, frame, direction, pose,
                walking ? (index - WALK_START) % WALK_FRAMES : index % 4, parts);
            texture.context.restore();
            texture.add(index, 0, x, y, FRAME_WIDTH, FRAME_HEIGHT);
        }
        texture.refresh();
    }
}
