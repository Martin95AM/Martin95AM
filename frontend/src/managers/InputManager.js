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

        // Touch target position
        this.targetPosition = null;

        // Listen for pointer down on the scene
        this.scene.input.on('pointerdown', (pointer) => {
            // Only set target if we didn't click on an interactive UI element
            this.targetPosition = { x: pointer.worldX, y: pointer.worldY };
        });

    }

    getInputState() {

        // Check if any keyboard key is pressed to cancel touch movement
        const keyboardActive = this.cursors.up.isDown || this.cursors.down.isDown || 
                             this.cursors.left.isDown || this.cursors.right.isDown ||
                             this.wasd.up.isDown || this.wasd.down.isDown ||
                             this.wasd.left.isDown || this.wasd.right.isDown;

        if (keyboardActive) {
            this.targetPosition = null;
        }

        let touchInput = { up: false, down: false, left: false, right: false };

        // If pointer is actively held down, update target position to current pointer position
        const activePointer = this.scene.input.activePointer;
        if (activePointer.isDown) {
            this.targetPosition = { x: activePointer.worldX, y: activePointer.worldY };
        }

        if (this.targetPosition && this.scene.player) {
            const dx = this.targetPosition.x - this.scene.player.x;
            const dy = this.targetPosition.y - this.scene.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                // Determine direction components
                if (Math.abs(dx) > 8) {
                    if (dx < 0) touchInput.left = true;
                    else touchInput.right = true;
                }
                if (Math.abs(dy) > 8) {
                    if (dy < 0) touchInput.up = true;
                    else touchInput.down = true;
                }
            } else {
                // Reached target
                this.targetPosition = null;
            }
        }

        return {
            up: this.cursors.up.isDown || this.wasd.up.isDown || touchInput.up ? { isDown: true } : { isDown: false },
            down: this.cursors.down.isDown || this.wasd.down.isDown || touchInput.down ? { isDown: true } : { isDown: false },
            left: this.cursors.left.isDown || this.wasd.left.isDown || touchInput.left ? { isDown: true } : { isDown: false },
            right: this.cursors.right.isDown || this.wasd.right.isDown || touchInput.right ? { isDown: true } : { isDown: false },
            run: this.runKey
        };

    }

}
