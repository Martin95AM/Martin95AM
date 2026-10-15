import Phaser from "phaser";
import { ART_SCALE } from '../art/characters.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {

        super(scene, x, y, "martin", 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 0.5);
        this.setScale(ART_SCALE);
        this.body.setSize(20 / ART_SCALE, 32 / ART_SCALE);
        this.body.setOffset(6 / ART_SCALE, 16 / ART_SCALE);

        this.speed = 126;
        this.runSpeed = 196;
        this.direction = "down";

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            run: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

    }

    update(inputs) {

        const keys = inputs || {
            up: this.keys.up,
            down: this.keys.down,
            left: this.keys.left,
            right: this.keys.right,
            run: this.keys.run
        };

        let vx = 0;
        let vy = 0;

        const speed = keys.run?.isDown ? this.runSpeed : this.speed;

        if (keys.left?.isDown) {
            vx = -speed;
            this.direction = "left";
        } else if (keys.right?.isDown) {
            vx = speed;
            this.direction = "right";
        }

        if (keys.up?.isDown) {
            vy = -speed;
            this.direction = "up";
        } else if (keys.down?.isDown) {
            vy = speed;
            this.direction = "down";
        }

        this.setVelocity(vx, vy);

        if (vx !== 0 && vy !== 0) {
            this.body.velocity.normalize().scale(speed);
        }

        this.animate(vx, vy);

    }

    animate(vx, vy) {
        let prefix = '';
        if (this.texture.key === 'martin_casual') {
            prefix = 'casual-';
        } else if (this.texture.key === 'martin_casual_headphones') {
            prefix = 'headphones-';
        }

        if (vx === 0 && vy === 0) {
            this.anims.timeScale = 1;
            if (this.scene.anims.exists(`${prefix}idle-${this.direction}`)) {
                this.anims.play(`${prefix}idle-${this.direction}`, true);
            }
            return;
        }

        if (this.scene.anims.exists(`${prefix}walk-${this.direction}`)) {
            // A quick, readable loop gives the run the punch of 90s action
            // games while the normal walk remains deliberate around NPCs.
            this.anims.play(`${prefix}walk-${this.direction}`, true);
            this.anims.timeScale = (Math.abs(vx) + Math.abs(vy) > this.speed) ? 1.35 : 1;
        }
    }

}
