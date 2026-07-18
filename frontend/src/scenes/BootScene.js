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

        this.load.spritesheet(
            'guard',
            'assets/player/guard.png',
            {
                frameWidth: 32,
                frameHeight: 48
            }
        );
        this.load.image('tiles', 'assets/tiles/world.png');
        this.load.image('dojo', 'assets/tiles/dojo.png');
        this.load.image('studio', 'assets/tiles/studio.png');
        this.load.image('weapon_rack', 'assets/tiles/weapon_rack.png');
        this.load.spritesheet('torii', 'assets/tiles/torii.png', {
            frameWidth: 96,
            frameHeight: 96
        });
        this.load.spritesheet('student_yellow', 'assets/player/student_yellow.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_orange', 'assets/player/student_orange.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_green', 'assets/player/student_green.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_blue', 'assets/player/student_blue.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_brown', 'assets/player/student_brown.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('martin_casual', 'assets/player/martin_casual.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('martin_casual_headphones', 'assets/player/martin_casual_headphones.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('braian_casual', 'assets/player/braian_casual.png', { frameWidth: 32, frameHeight: 48 });
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

        this.anims.create({
            key: 'torii-open',
            frames: this.anims.generateFrameNumbers('torii', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: 0
        });

        this.anims.create({
            key: 'martin-pushup',
            frames: this.anims.generateFrameNumbers('martin', { start: 16, end: 17 }),
            frameRate: 4,
            repeat: -1,
            yoyo: true
        });

        this.anims.create({
            key: 'casual-walk-down',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-left',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-right',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-up',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-idle-down',
            frames: [{ key: 'martin_casual', frame: 0 }]
        });

        this.anims.create({
            key: 'casual-idle-left',
            frames: [{ key: 'martin_casual', frame: 4 }]
        });

        this.anims.create({
            key: 'casual-idle-right',
            frames: [{ key: 'martin_casual', frame: 8 }]
        });

        this.anims.create({
            key: 'casual-idle-up',
            frames: [{ key: 'martin_casual', frame: 12 }]
        });

        this.anims.create({
            key: 'headphones-walk-down',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-left',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-right',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-up',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-idle-down',
            frames: [{ key: 'martin_casual_headphones', frame: 0 }]
        });

        this.anims.create({
            key: 'headphones-idle-left',
            frames: [{ key: 'martin_casual_headphones', frame: 4 }]
        });

        this.anims.create({
            key: 'headphones-idle-right',
            frames: [{ key: 'martin_casual_headphones', frame: 8 }]
        });

        this.anims.create({
            key: 'headphones-idle-up',
            frames: [{ key: 'martin_casual_headphones', frame: 12 }]
        });

        const colors = ['yellow', 'orange', 'green', 'blue', 'brown'];
        colors.forEach(color => {
            this.anims.create({
                key: `student-${color}-breath`,
                frames: this.anims.generateFrameNumbers(`student_${color}`, { start: 0, end: 1 }),
                frameRate: 2,
                repeat: -1,
                yoyo: true
            });

            this.anims.create({
                key: `student-${color}-pushup`,
                frames: this.anims.generateFrameNumbers(`student_${color}`, { start: 2, end: 3 }),
                frameRate: 4,
                repeat: -1,
                yoyo: true
            });
        });

    }

}
