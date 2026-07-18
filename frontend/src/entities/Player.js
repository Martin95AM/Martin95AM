import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {

        super(scene, x, y, "martin", 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 0.5);
        this.body.setSize(20, 32);
        this.body.setOffset(6, 16);

        this.speed = 120;
        this.runSpeed = 180;
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
            if (this.anims && this.anims.exists(`${prefix}idle-${this.direction}`)) {
                this.anims.play(`${prefix}idle-${this.direction}`, true);
            }
            return;
        }

        if (this.anims && this.anims.exists(`${prefix}walk-${this.direction}`)) {
            this.anims.play(`${prefix}walk-${this.direction}`, true);
        }
    }

}
