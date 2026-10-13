import Phaser from "phaser";
import { ART_SCALE } from '../art/characters.js';

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x = 0, y = 0, textureKey = "guard", name = "NPC", dialogLines = [], animationKey = "") {
        super(scene, x, y, textureKey, 0);
        this.scene = scene;
        this.name = name;
        this.dialogLines = dialogLines;
        this.animationKey = animationKey;

        scene.add.existing(this);
        scene.physics.add.existing(this);
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
}
