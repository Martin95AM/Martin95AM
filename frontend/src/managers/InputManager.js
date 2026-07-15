import Phaser from "phaser";

export default class InputManager {

    constructor(scene) {

        this.scene = scene;
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.runKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

    }

    getInputState() {

        return {
            up: this.cursors.up.isDown ? this.cursors.up : this.wasd.up,
            down: this.cursors.down.isDown ? this.cursors.down : this.wasd.down,
            left: this.cursors.left.isDown ? this.cursors.left : this.wasd.left,
            right: this.cursors.right.isDown ? this.cursors.right : this.wasd.right,
            run: this.runKey
        };

    }

}
