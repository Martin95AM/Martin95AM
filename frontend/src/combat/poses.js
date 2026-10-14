import { DIRECTIONS } from './rules.mjs';
import { drawIllustratedFrame, illustratedFrames } from '../art/illustrated.js';

export function createCombatPoses(scene) {
    for (const character of ['guard', 'martin']) {
        for (const direction of Object.keys(DIRECTIONS)) {
            for (const pose of ['block', 'punch', 'kick']) {
                const key = `${character}-${direction}-${pose}`;
                if (scene.textures.exists(key)) continue;
                const texture = scene.textures.createCanvas(key, 192, 192);
                texture.context.save();
                texture.context.translate(48, 24);
                drawIllustratedFrame(texture.context, illustratedFrames.get(character), direction, pose);
                texture.context.restore();
                texture.refresh();
            }
        }
    }
}
