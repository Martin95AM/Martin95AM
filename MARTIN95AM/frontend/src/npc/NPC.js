import Phaser from "phaser";

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x = 0, y = 0, textureKey = "guard", name = "NPC", dialogLines = [], animationKey = "") {
        super(scene, x, y, textureKey);
        this.scene = scene;
        this.name = name;
        this.dialogLines = dialogLines;
        this.animationKey = animationKey;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setImmovable(true);
        this.body.allowGravity = false;
        this.setOrigin(0.5);
        this.body.setSize(24, 24);
        this.body.setOffset(4, 12);

        if (this.animationKey) {
            this.play(this.animationKey, true);
        }
    }
}
