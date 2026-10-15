import Phaser from 'phaser';
import { createIllustratedTextures, WALK_START, WALK_FRAMES } from '../art/illustrated.js';

// Files copied from public/ keep stable names. Adding the deployment SHA makes
// browsers fetch the matching art after every GitHub Pages release.
const asset = path => `${path}?v=${__APP_VERSION__}`;

export default class BootScene extends Phaser.Scene {

    constructor() {
        super("BootScene");
    }

    preload() {

        for (const name of ['martin', 'sensei', 'technician', 'student']) {
            this.load.image(`art-${name}`, asset(`assets/character-art/${name}.png`));
        }
        for (const name of ['martin-studio', 'martin-studio-headphones']) {
            this.load.image(`art-${name}`, asset(`assets/character-art/${name}.png`));
        }

        this.load.spritesheet(
            'martin',
            asset('assets/player/martin.png'),
            {
                frameWidth: 32,
                frameHeight: 48
            }
        );

        this.load.spritesheet(
            'guard',
            asset('assets/player/guard.png'),
            {
                frameWidth: 32,
                frameHeight: 48
            }
        );
        this.load.image('tiles', asset('assets/tiles/world.png'));
        this.load.image('dojo', asset('assets/tiles/dojo.png'));
        this.load.image('studio', asset('assets/tiles/studio.png'));
        this.load.image('studio_cozy_drums', asset('assets/tiles/studio_cozy_drums.png'));
        this.load.image('weapon_rack', asset('assets/tiles/weapon_rack.png'));
        this.load.spritesheet('torii', asset('assets/tiles/torii.png'), {
            frameWidth: 96,
            frameHeight: 96
        });
        this.load.spritesheet('student_yellow', asset('assets/player/student_yellow.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_orange', asset('assets/player/student_orange.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_green', asset('assets/player/student_green.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_blue', asset('assets/player/student_blue.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('student_brown', asset('assets/player/student_brown.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('martin_casual', asset('assets/player/martin_casual.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('martin_casual_headphones', asset('assets/player/martin_casual_headphones.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('tecnico_casual', asset('assets/player/tecnico_casual.png'), { frameWidth: 32, frameHeight: 48 });
        this.load.tilemapTiledJSON('villa', asset('assets/maps/villa_arias.json'));

    }

    create() {

        createIllustratedTextures(this);
        this.createAnimations();
        // The studio is now the game's home scene; preview modes still use their
        // dedicated spawn locations inside it.
        this.scene.start('StudioScene');

    }

    createAnimations() {

        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('martin', { start: WALK_START, end: WALK_START + WALK_FRAMES - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('martin', { start: WALK_START + WALK_FRAMES, end: WALK_START + WALK_FRAMES * 2 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('martin', { start: WALK_START + WALK_FRAMES * 2, end: WALK_START + WALK_FRAMES * 3 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('martin', { start: WALK_START + WALK_FRAMES * 3, end: WALK_START + WALK_FRAMES * 4 - 1 }),
            frameRate: 16,
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

        // Shared eight-frame cadence for the NPCs. The snappy 11 fps loop and
        // planted first frame are intentionally closer to 90s arcade sprites
        // than the floaty top-down RPG walk they replaced.
        this.createCharacterMovementAnimations('miyagi', 'guard', 11);
        this.createCharacterMovementAnimations('technician', 'tecnico_casual', 9);
        this.anims.create({
            key: 'technician-sit',
            frames: [{ key: 'tecnico_casual', frame: WALK_START + WALK_FRAMES * 4 }]
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
            frames: this.anims.generateFrameNumbers('martin_casual', { start: WALK_START, end: WALK_START + WALK_FRAMES - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-left',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: WALK_START + WALK_FRAMES, end: WALK_START + WALK_FRAMES * 2 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-right',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: WALK_START + WALK_FRAMES * 2, end: WALK_START + WALK_FRAMES * 3 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'casual-walk-up',
            frames: this.anims.generateFrameNumbers('martin_casual', { start: WALK_START + WALK_FRAMES * 3, end: WALK_START + WALK_FRAMES * 4 - 1 }),
            frameRate: 16,
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
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: WALK_START, end: WALK_START + WALK_FRAMES - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-left',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: WALK_START + WALK_FRAMES, end: WALK_START + WALK_FRAMES * 2 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-right',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: WALK_START + WALK_FRAMES * 2, end: WALK_START + WALK_FRAMES * 3 - 1 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'headphones-walk-up',
            frames: this.anims.generateFrameNumbers('martin_casual_headphones', { start: WALK_START + WALK_FRAMES * 3, end: WALK_START + WALK_FRAMES * 4 - 1 }),
            frameRate: 16,
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

    createCharacterMovementAnimations(prefix, texture, frameRate) {
        const directions = { down: 0, left: 1, right: 2, up: 3 };
        for (const [direction, index] of Object.entries(directions)) {
            const start = WALK_START + index * WALK_FRAMES;
            this.anims.create({
                key: `${prefix}-walk-${direction}`,
                frames: this.anims.generateFrameNumbers(texture, { start, end: start + WALK_FRAMES - 1 }),
                frameRate,
                repeat: -1
            });
            this.anims.create({
                key: `${prefix}-idle-${direction}`,
                frames: [{ key: texture, frame: index * 4 }],
                frameRate: 1
            });
        }
    }

}
