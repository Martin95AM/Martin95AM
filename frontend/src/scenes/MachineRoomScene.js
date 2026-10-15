import Phaser from 'phaser';
import Player from '../entities/Player.js';
import InputManager from '../managers/InputManager.js';
import SaveManager from '../managers/SaveManager.js';

export default class MachineRoomScene extends Phaser.Scene {
    constructor() { super('MachineRoomScene'); }

    create(data = {}) {
        this.add.image(0, 0, 'machine_room').setOrigin(0).setDisplaySize(640, 640);
        this.player = new Player(this, data.player?.x ?? 320, data.player?.y ?? 525);
        this.player.setTexture('martin_casual', 0);
        this.physics.world.setBounds(25, 30, 590, 550);
        this.cameras.main.setBounds(0, 0, 640, 640);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor('#061323');
        this.inputManager = new InputManager(this);

        // The workstation is painted into the room art. Its collider leaves a
        // clear approach from the entrance while preventing walking over it.
        const workstation = this.add.rectangle(320, 298, 172, 145, 0, 0);
        this.physics.add.existing(workstation, true);
        this.physics.add.collider(this.player, workstation);

        this.screen = this.add.graphics().setDepth(20);
        this.screenClock = 0;
        this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.pcKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.prompt = this.add.text(320, 455, '', {
            fontSize: '10px', fontFamily: 'monospace', color: '#d8faff',
            backgroundColor: '#071728', padding: { x: 7, y: 4 }
        }).setOrigin(0.5).setDepth(10000).setVisible(false).setInteractive({ useHandCursor: true });
        this.prompt.on('pointerdown', () => this.interact());
        this.exiting = false;
        this.saveGame();
        this.events.on('shutdown', () => this.saveGame());
        this.time.addEvent({ delay: 5000, loop: true, callback: () => this.saveGame() });
    }

    saveGame() {
        if (!this.player || this.exiting) return;
        SaveManager.save({ scene: 'MachineRoomScene', player: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }

    update(time) {
        this.animateScreen(time);
        if (this.exiting) return;
        this.player.update(this.inputManager.getInputState());
        this.player.setDepth(this.player.y);
        const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 565) < 67;
        const nearPc = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 395) < 92;
        this.prompt.setVisible(nearExit || nearPc);
        if (nearExit) this.prompt.setText('E · Volver al estudio').setPosition(320, 490);
        else if (nearPc) this.prompt.setText('P · Examinar PC central').setPosition(320, 355);
        if (nearExit && Phaser.Input.Keyboard.JustDown(this.returnKey)) this.returnToStudio();
        if (nearPc && Phaser.Input.Keyboard.JustDown(this.pcKey)) this.showPcMessage();
    }

    interact() {
        if (this.exiting) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 565) < 67) this.returnToStudio();
        else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 395) < 92) this.showPcMessage();
    }

    showPcMessage() {
        this.prompt.setText('Terminal lista · asistente próximamente').setPosition(320, 355).setVisible(true);
    }

    returnToStudio() {
        this.exiting = true;
        this.player.setVelocity(0, 0);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('StudioScene', { player: { x: 535, y: 175 } });
        });
    }

    animateScreen(time) {
        const g = this.screen;
        g.clear();
        // Central monitor in the 640 × 640 room image.
        g.fillStyle(0x031725, 0.9);
        g.fillRect(260, 235, 119, 37);
        g.lineStyle(1, 0x247d9d, 0.8);
        g.strokeRect(260, 235, 119, 37);
        g.lineStyle(1.5, 0x62edff, 0.95);
        const phase = time * 0.0014;
        g.beginPath();
        for (let x = 264; x <= 333; x += 2) {
            const wave = Math.sin(x * 0.23 + phase) * (5 + 2 * Math.sin(phase * 0.6));
            const y = 253 + wave + Math.sin(x * 0.57 - phase * 1.7) * 1.6;
            if (x === 264) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        for (let i = 0; i < 11; i++) {
            const height = 4 + Math.abs(Math.sin(phase * 1.2 + i * 0.65)) * 17;
            g.fillStyle(i > 7 ? 0x73e5ff : 0x2dbadf, 0.85);
            g.fillRect(337 + i * 2.6, 266 - height, 1.6, height);
        }
        for (let i = 0; i < 3; i++) {
            const radius = 2.2 + Math.sin(phase + i * 1.8) * 0.6;
            g.lineStyle(1, 0x79f1ff, 0.65 + Math.sin(phase + i) * 0.25);
            g.strokeCircle(370 + (i % 2) * 4, 241 + i * 10, radius);
        }
    }
}
