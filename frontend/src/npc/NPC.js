import Phaser from "phaser";
import { ART_SCALE } from '../art/characters.js';

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x = 0, y = 0, textureKey = "guard", name = "NPC", dialogLines = [], animationKey = "", patrol = []) {
        super(scene, x, y, textureKey, 0);
        this.scene = scene;
        this.name = name;
        this.dialogLines = dialogLines;
        this.animationKey = animationKey;
        this.direction = 'down';
        this.patrol = patrol;
        this.patrolIndex = 0;
        this.patrolPauseUntil = scene.time.now + 700;
        this.patrolSpeed = 44;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        // This remains a dynamic, immovable body: its own velocity can patrol
        // the room, while Martín cannot shove a character off its route.
        this.setImmovable(true);
        this.body.allowGravity = false;
        this.setOrigin(0.5);
        this.setScale(ART_SCALE);
        this.body.setSize(24 / ART_SCALE, 24 / ART_SCALE);
        this.body.setOffset(4 / ART_SCALE, 12 / ART_SCALE);

        if (this.animationKey) {
            this.play(this.animationKey, true);
        }
    }

    update({ paused = false } = {}) {
        if (!this.patrol.length) return;

        if (paused) {
            this.setVelocity(0, 0);
            this.playAnimation('idle');
            return;
        }

        if (this.scene.time.now < this.patrolPauseUntil) {
            this.setVelocity(0, 0);
            this.playAnimation('idle');
            return;
        }

        const destination = this.patrol[this.patrolIndex];
        const dx = destination.x - this.x;
        const dy = destination.y - this.y;
        if (Math.hypot(dx, dy) < 4) {
            this.setPosition(destination.x, destination.y);
            this.setVelocity(0, 0);
            this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
            // The deliberate beat at each corner is the old arcade fighter
            // cadence: advance, plant the stance, then advance again.
            this.patrolPauseUntil = this.scene.time.now + 420;
            this.playAnimation('idle');
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) this.direction = dx < 0 ? 'left' : 'right';
        else this.direction = dy < 0 ? 'up' : 'down';
        this.scene.physics.velocityFromRotation(Math.atan2(dy, dx), this.patrolSpeed, this.body.velocity);
        this.playAnimation('walk');
    }

    playAnimation(state) {
        const prefix = this.texture.key === 'guard' ? 'miyagi' : 'technician';
        const key = `${prefix}-${state}-${this.direction}`;
        if (this.anims?.exists(key)) this.play(key, true);
    }
}
