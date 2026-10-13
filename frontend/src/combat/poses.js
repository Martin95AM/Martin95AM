import { DIRECTIONS } from './rules.mjs';

// Build code-drawn poses around the existing head and uniform. Source art stays intact.
export function createCombatPoses(scene) {
    for (const character of ['guard', 'martin']) {
        for (const [direction, { frame }] of Object.entries(DIRECTIONS)) {
            for (const pose of ['block', 'punch', 'kick']) {
                const key = `${character}-${direction}-${pose}`;
                if (scene.textures.exists(key)) continue;
                const texture = scene.textures.createCanvas(key, 64, 64);
                const ctx = texture.context;
                ctx.imageSmoothingEnabled = false;
                const sourceFrame = scene.textures.getFrame(character, frame);
                const source = sourceFrame.source.image;
                const sx = sourceFrame.cutX;
                const sy = sourceFrame.cutY;
                const horizontal = direction === 'left' || direction === 'right';
                const sign = direction === 'left' ? -1 : 1;

                const limb = (points, width, color) => {
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.beginPath();
                    ctx.moveTo(...points[0]);
                    points.slice(1).forEach(point => ctx.lineTo(...point));
                    ctx.lineWidth = width + 2;
                    ctx.strokeStyle = '#6e7d91';
                    ctx.stroke();
                    ctx.lineWidth = width;
                    ctx.strokeStyle = color;
                    ctx.stroke();
                    const end = points[points.length - 1];
                    ctx.fillStyle = '#e0ac87';
                    ctx.fillRect(end[0] - 2, end[1] - 2, 5, 4);
                };

                // Wide, grounded stance; the kicking leg extends toward the target.
                limb([[28, 41], [25, 48], [22, 55]], 5, '#f5f5fa');
                if (pose === 'kick') {
                    const foot = horizontal ? [32 + sign * 26, 34] : [40, direction === 'up' ? 22 : 59];
                    limb([[35, 41], [39, 37], foot], 6, '#f5f5fa');
                } else {
                    limb([[35, 41], [39, 48], [43, 55]], 5, '#b9c3d2');
                }
                ctx.drawImage(source, sx + 7, sy + 20, 18, 16, 23, 28, 18, 16);
                ctx.drawImage(source, sx + 8, sy + 4, 16, 16, 24, 12, 16, 16);

                // Rear hand guards the chest. The lead arm blocks or extends for a punch.
                limb([[25, 30], [21, 35], [29, 33]], 4, '#b9c3d2');
                let hand;
                if (pose === 'punch') {
                    hand = horizontal ? [32 + sign * 26, 30] : [37, direction === 'up' ? 7 : 49];
                } else if (pose === 'block') {
                    hand = horizontal ? [32 + sign * 17, 17] : [44, 15];
                } else {
                    hand = [42, 23];
                }
                limb([[38, 30], hand], 5, '#f5f5fa');
                texture.refresh();
            }
        }
    }
}
