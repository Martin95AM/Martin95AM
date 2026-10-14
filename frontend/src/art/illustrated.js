import { FRAME_WIDTH, FRAME_HEIGHT } from './characters.js';

const sourceFor = key => key === 'guard' ? 'art-sensei'
    : key === 'braian_casual' ? 'art-technician'
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

// The studio uses the same illustrated Martín, with his gi repainted as a
// dark jacket, jeans and shoes. Keep the source shading, silhouette and face.
function studioMartinFrame(frame, headphones) {
    const copy = document.createElement('canvas');
    copy.width = FRAME_WIDTH; copy.height = FRAME_HEIGHT;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(frame, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height);
    for (let y = 32; y < copy.height; y++) {
        for (let x = 0; x < copy.width; x++) {
            const i = (y * copy.width + x) * 4;
            const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
            if (pixels.data[i + 3] < 40) continue;
            const redBelt = x > 30 && x < 66 && y > 61 && y < 100
                && r > 35 && g < r * 0.7 && b < r * 0.7;
            const cloth = Math.max(r, g, b) - Math.min(r, g, b) < 60 && r > 55;
            const skin = r > g + 25 && g > b + 8;
            let base;
            if (y >= 130 && skin) base = [32, 39, 51];
            else if (redBelt || cloth) base = y < 79 ? [39, 57, 77] : [42, 67, 105];
            else continue;
            const shade = Math.max(0.42, Math.min(1.35, (r + g + b) / 550));
            for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = base[channel] * shade;
        }
    }
    ctx.putImageData(pixels, 0, 0);
    // A simple shirt opening and jacket hem replace the gi's red-belt focal
    // point while staying readable at the map's 32×48 display size.
    ctx.fillStyle = '#1a2634';
    ctx.beginPath(); ctx.moveTo(44, 43); ctx.lineTo(50, 43); ctx.lineTo(51, 74);
    ctx.lineTo(44, 74); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6d8495'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(51, 45); ctx.lineTo(51, 73); ctx.stroke();
    ctx.fillStyle = '#24364d'; ctx.fillRect(37, 77, 23, 3);
    if (headphones) {
        ctx.strokeStyle = '#1b2532'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(37, 27); ctx.lineTo(37, 16);
        ctx.quadraticCurveTo(48, 0, 59, 16); ctx.lineTo(59, 27); ctx.stroke();
        ctx.fillStyle = '#c78a48';
        ctx.fillRect(35, 19, 5, 11); ctx.fillRect(57, 19, 5, 11);
        ctx.fillStyle = '#253a50';
        ctx.fillRect(36, 21, 3, 7); ctx.fillRect(58, 21, 3, 7);
    }
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
    const keys = ['martin', 'guard', 'martin_casual', 'martin_casual_headphones', 'braian_casual',
        ...Object.keys(beltColors).map(color => `student_${color}`)];
    illustratedFrames.clear();
    const baseFrames = new Map();
    for (const key of keys) {
        const sourceKey = sourceFor(key);
        if (!baseFrames.has(sourceKey)) baseFrames.set(sourceKey, normalizedFrame(sourceCanvas(scene, key)));
        const frame = key.startsWith('martin_casual')
            ? studioMartinFrame(baseFrames.get(sourceKey), key.endsWith('_headphones'))
            : rankColoredFrame(baseFrames.get(sourceKey), key);
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
