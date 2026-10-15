import { DIRECTIONS } from './rules.mjs';
import { illustratedFrames } from '../art/illustrated.js';

// Cut the approved illustration at the shoulder/elbow and hip/knee. The thigh
// leads a kick; the shin extends only after the knee has been lifted.
const ARM = {
    shoulder: [70, 43], elbow: [78, 62], hand: [77, 79],
    upper: [[66, 38], [75, 35], [83, 44], [87, 58], [80, 67], [68, 65], [65, 52]],
    lower: [[70, 59], [86, 57], [87, 69], [84, 83], [77, 89], [65, 82], [65, 65]]
};
const LEG = {
    hip: [56, 82], knee: [68, 106],
    upper: [[49, 77], [63, 77], [72, 88], [77, 105], [68, 113], [55, 105], [49, 94]],
    lower: [[57, 101], [77, 102], [85, 133], [82, 141], [63, 141], [56, 119]]
};

// [weight shift, shoulder/hip angle, elbow/knee angle] in degrees.
const POSES = {
    punch: {
        windup: [-4, 18, 50], chamber: [-2, -26, -70],
        strike: [2, -72, -22], follow: [3, -78, -14], recover: [0, -25, -64]
    },
    kick: {
        windup: [1, -18, 48], chamber: [-2, -55, 83],
        strike: [-3, -77, 13], follow: [-3, -72, 19], recover: [0, -36, 70]
    },
    block: {
        windup: [0, -38, -75], chamber: [0, -52, -62],
        strike: [0, -58, -55], follow: [0, -58, -55], recover: [0, -25, -64]
    }
};

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

function angles(type, direction, phase) {
    const [lean, upper, lower] = POSES[type][phase];
    if (type === 'kick' && direction === 'down') {
        // A forward kick is foreshortened, not a straight leg at the floor.
        return [lean, upper * 0.68, lower * 0.72];
    }
    if (type === 'kick' && direction === 'up') return [lean, upper * 1.08, lower * 0.9];
    return [lean, upper, lower];
}

function rotatePoint([x, y], [px, py], degrees) {
    const radians = degrees * Math.PI / 180;
    const dx = x - px, dy = y - py;
    return [px + dx * Math.cos(radians) - dy * Math.sin(radians),
        py + dx * Math.sin(radians) + dy * Math.cos(radians)];
}

function jointPoint(point, root, joint, upper, lower) {
    return rotatePoint(rotatePoint(point, joint, lower), root, upper);
}

// World-space weapon grip follows the same shoulder and elbow as the art.
export function combatHandOffsets(direction, phase = 'strike', type = 'punch') {
    const [lean, upper, lower] = angles(type, direction, phase);
    const [handX, handY] = jointPoint(ARM.hand, ARM.shoulder, ARM.elbow, upper, lower);
    const moving = [(handX + lean - 48) / 3, (handY - 72) / 3];
    if (direction === 'left') moving[0] *= -1;
    // Only the striking hand follows the articulated punch. The opposite
    // hand stays by the hip; it must not rise with the moving fist.
    const guarding = { x: direction === 'left' ? 9 : -9, y: 2 };
    return direction === 'left'
        ? { [-1]: { x: moving[0], y: moving[1] }, [1]: guarding }
        : { [-1]: guarding, [1]: { x: moving[0], y: moving[1] } };
}

function drawJointed(ctx, upperImage, lowerImage, root, joint, upper, lower) {
    ctx.save();
    ctx.translate(...root);
    ctx.rotate(upper * Math.PI / 180);
    ctx.translate(-root[0], -root[1]);
    ctx.save();
    ctx.translate(...joint);
    ctx.rotate(lower * Math.PI / 180);
    ctx.translate(-joint[0], -joint[1]);
    ctx.drawImage(lowerImage, 0, 0);
    ctx.restore();
    ctx.drawImage(upperImage, 0, 0);
    ctx.restore();
}

function drawPose(ctx, frame, direction, type, phase, parts) {
    const limb = type === 'kick' ? LEG : ARM;
    const [lean, upper, lower] = angles(type, direction, phase);
    ctx.save();
    ctx.translate(48 + lean, 24 + (phase === 'chamber' ? 1 : 0));
    if (direction === 'left') { ctx.translate(96, 0); ctx.scale(-1, 1); }
    ctx.drawImage(frame, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const outline of [limb.upper, limb.lower]) {
        polygon(ctx, outline);
        ctx.fill();
    }
    ctx.restore();
    const images = type === 'kick' ? parts.kick : parts.punch;
    drawJointed(ctx, images.upper, images.lower,
        type === 'kick' ? LEG.hip : ARM.shoulder,
        type === 'kick' ? LEG.knee : ARM.elbow, upper, lower);
    if (type === 'kick') ctx.drawImage(frame, 49, 77, 15, 9, 49, 77, 15, 9);
    else ctx.drawImage(frame, 65, 38, 11, 11, 65, 38, 11, 11);
    ctx.restore();
}

export function createCombatPoses(scene) {
    for (const character of ['guard', 'martin']) {
        const frame = illustratedFrames.get(character);
        const parts = {
            punch: { upper: extractPart(frame, ARM.upper), lower: extractPart(frame, ARM.lower) },
            kick: { upper: extractPart(frame, LEG.upper), lower: extractPart(frame, LEG.lower) }
        };
        for (const direction of Object.keys(DIRECTIONS)) {
            for (const type of Object.keys(POSES)) {
                for (const phase of Object.keys(POSES[type])) {
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
