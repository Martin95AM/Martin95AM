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

export function drawIllustratedFrame(ctx, frame, direction = 'down', pose = 'idle', step = 0) {
    ctx.save();
    if (direction === 'left') { ctx.translate(FRAME_WIDTH, 0); ctx.scale(-1, 1); }
    if (pose === 'pushup') {
        ctx.translate(0, 85); ctx.scale(1, 0.38);
        ctx.drawImage(frame, 0, 0);
    } else if (pose === 'walk') {
        const shifts = [-5, -1, 5, 1];
        const shift = shifts[step % 4];
        const bob = [0, 2, 0, 1][step % 4];
        ctx.drawImage(frame, 0, 0, 96, 82, 0, bob, 96, 82);
        ctx.drawImage(frame, 0, 82, 96, 62, shift, 82 + bob, 96, 62);
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
        const texture = scene.textures.createCanvas(key, FRAME_WIDTH * 4, FRAME_HEIGHT * (isStudent ? 1 : 5));
        for (let index = 0; index < (isStudent ? 4 : 20); index++) {
            const x = index % 4 * FRAME_WIDTH, y = Math.floor(index / 4) * FRAME_HEIGHT;
            texture.context.save(); texture.context.translate(x, y);
            const direction = isStudent ? 'left' : ['down', 'left', 'right', 'up'][Math.floor(index / 4)] || 'down';
            const pose = isStudent ? index < 2 ? 'idle' : 'pushup' : index >= 16 ? 'pushup' : index % 4 === 0 ? 'idle' : 'walk';
            drawIllustratedFrame(texture.context, frame, direction, pose, index % 4);
            texture.context.restore();
            texture.add(index, 0, x, y, FRAME_WIDTH, FRAME_HEIGHT);
        }
        texture.refresh();
    }
}
