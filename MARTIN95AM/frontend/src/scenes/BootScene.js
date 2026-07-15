import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {

    constructor() {
        super("BootScene");
    }

    preload() {

        this.load.spritesheet(
            'martin',
            'assets/player/martin.png',
            {
                frameWidth: 32,
                frameHeight: 48
            }
        );

        this.load.image('guard', 'assets/player/guard.png');
        this.load.image('tiles', 'assets/tiles/world.png');
        this.load.tilemapTiledJSON('villa', 'assets/maps/villa_arias.json');

    }

    create() {

        this.createAnimations();
        this.scene.start("MenuScene");

    }

    createAnimations() {

        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('martin', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('martin', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('martin', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('martin', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'idle-down',
            frames: [{ key: 'martin', frame: 0 }]
        });

        this.anims.create({
            key: 'idle-left',
            frames: [{ key: 'martin', frame: 4 }]
        });

        this.anims.create({
            key: 'idle-right',
            frames: [{ key: 'martin', frame: 8 }]
        });

        this.anims.create({
            key: 'idle-up',
            frames: [{ key: 'martin', frame: 12 }]
        });

    }

}
