import Phaser from 'phaser';
import Player from '../entities/Player.js';
import InputManager from '../managers/InputManager.js';
import SaveManager from '../managers/SaveManager.js';
import AssistantPanel from '../ui/AssistantPanel.js';
import SolderPanel from '../ui/SolderPanel.js';
import FleetPanel from '../ui/FleetPanel.js';
import MarketPhonePanel from '../ui/MarketPhonePanel.js';

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
        this.assistantPanel = new AssistantPanel(this.input.keyboard);
        this.solderPanel = new SolderPanel(() => this.lampGlow.setVisible(true));
        this.marketPhonePanel = new MarketPhonePanel(this.input.keyboard);
        this.lampGlow = this.add.circle(522, 103, 35, 0xffca69, 0.25)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(5).setVisible(this.solderPanel.completed);

        // The workstation is painted into the room art. Its collider leaves a
        // clear approach from the entrance while preventing walking over it.
        const workstation = this.add.rectangle(320, 298, 172, 145, 0, 0);
        this.physics.add.existing(workstation, true);
        this.physics.add.collider(this.player, workstation);
        // The electronics bench and lamp are painted in the upper-right corner.
        const electronicsBench = this.add.rectangle(480, 140, 150, 86, 0, 0);
        this.physics.add.existing(electronicsBench, true);
        this.physics.add.collider(this.player, electronicsBench);
        // Fleet radar workstation in the upper-left corner.
        const radarDesk = this.add.rectangle(130, 132, 140, 82, 0, 0);
        this.physics.add.existing(radarDesk, true);
        this.physics.add.collider(this.player, radarDesk);
        this.radarScreen = this.add.graphics().setDepth(8);
        this.add.text(113, 99, 'FLOTA INTL.', {
            fontSize: '6px', fontFamily: 'monospace', fontStyle: 'bold', color: '#b9fff4'
        }).setOrigin(0.5).setDepth(10);
        this.radarButton = this.add.rectangle(113, 87, 48, 34, 0, 0)
            .setDepth(12).setInteractive({ useHandCursor: true });
        this.radarButton.on('pointerdown', () => this.openFleet());
        // Align the click target and subtle highlight with the phone in the room art.
        this.phoneButton = this.add.rectangle(241, 308, 17, 28, 0x64e7d8, 0.12)
            .setStrokeStyle(1, 0x89e6dc, 0.65).setDepth(22).setInteractive({ useHandCursor: true });
        this.phoneButton.on('pointerover', () => this.phoneButton.setFillStyle(0x64e7d8, 0.27));
        this.phoneButton.on('pointerout', () => this.phoneButton.setFillStyle(0x64e7d8, 0.12));
        this.phoneButton.on('pointerdown', () => this.openPhone());

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
        this.events.on('shutdown', () => {
            this.saveGame();
            this.assistantPanel.destroy();
            this.solderPanel.destroy();
            this.marketPhonePanel.destroy();
        });
        this.time.addEvent({ delay: 5000, loop: true, callback: () => this.saveGame() });
    }

    saveGame() {
        if (!this.player || this.exiting) return;
        SaveManager.save({ scene: 'MachineRoomScene', player: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }

    update(time) {
        this.animateScreen(time);
        this.animateRadar(time);
        if (this.exiting) return;
        if (this.assistantPanel.opened || this.solderPanel.opened || this.marketPhonePanel.opened || FleetPanel.active?.opened) {
            this.player.setVelocity(0, 0);
            this.prompt.setVisible(false);
            return;
        }
        this.player.update(this.inputManager.getInputState());
        this.player.setDepth(this.player.y);
        const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 565) < 67;
        const nearPc = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 395) < 92;
        const nearBench = Phaser.Math.Distance.Between(this.player.x, this.player.y, 480, 205) < 70;
        const nearRadar = Phaser.Math.Distance.Between(this.player.x, this.player.y, 145, 190) < 75;
        const nearPhone = Phaser.Math.Distance.Between(this.player.x, this.player.y, 211, 345) < 67;
        this.prompt.setVisible(nearExit || nearPc || nearBench || nearRadar || nearPhone);
        if (nearExit) this.prompt.setText('E · Volver al estudio').setPosition(320, 490);
        else if (nearPhone) this.prompt.setText('E · Tomar celular financiero').setPosition(215, 326);
        else if (nearPc) this.prompt.setText('P · Examinar PC central').setPosition(320, 355);
        else if (nearBench) this.prompt.setText('E · Soldar componentes').setPosition(480, 177);
        else if (nearRadar) this.prompt.setText('E · Flota internacional').setPosition(145, 164);
        if (nearExit && Phaser.Input.Keyboard.JustDown(this.returnKey)) this.returnToStudio();
        if (nearPc && Phaser.Input.Keyboard.JustDown(this.pcKey)) this.openAssistant();
        if (nearPhone && Phaser.Input.Keyboard.JustDown(this.returnKey)) this.openPhone();
        if (nearBench && Phaser.Input.Keyboard.JustDown(this.returnKey)) this.openSolder();
        if (nearRadar && Phaser.Input.Keyboard.JustDown(this.returnKey)) this.openFleet();
    }

    interact() {
        if (this.exiting) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 565) < 67) this.returnToStudio();
        else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 211, 345) < 67) this.openPhone();
        else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 395) < 92) this.openAssistant();
        else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 480, 205) < 70) this.openSolder();
        else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 145, 190) < 75) this.openFleet();
    }

    openAssistant() {
        this.player.setVelocity(0, 0);
        this.assistantPanel.open();
    }

    openSolder() {
        this.player.setVelocity(0, 0);
        this.inputManager.targetPosition = null;
        this.solderPanel.open();
    }

    openFleet() {
        this.player.setVelocity(0, 0);
        this.inputManager.targetPosition = null;
        FleetPanel.active?.open();
    }

    openPhone() {
        this.player.setVelocity(0, 0);
        this.inputManager.targetPosition = null;
        this.marketPhonePanel.open();
    }

    returnToStudio() {
        this.exiting = true;
        this.player.setVelocity(0, 0);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('StudioScene', { player: { x: 500, y: 175 } });
        });
    }

    animateScreen(time) {
        const g = this.screen;
        g.clear();
        // Central monitor in the 640 × 640 room image.
        g.fillStyle(0x031725, 0.9);
        g.fillRect(262, 231, 117, 45);
        g.lineStyle(1, 0x247d9d, 0.8);
        g.strokeRect(262, 231, 117, 45);
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

    animateRadar(time) {
        const g = this.radarScreen;
        g.clear();
        g.fillStyle(0x031b29, 0.96);
        g.fillRoundedRect(91, 72, 44, 31, 2);
        g.lineStyle(0.7, 0x44dccc, 0.6);
        g.strokeCircle(113, 83, 10);
        g.strokeCircle(113, 83, 5);
        g.lineBetween(103, 83, 123, 83);
        g.lineBetween(113, 73, 113, 93);
        const angle = time * 0.0016;
        g.lineStyle(1.7, 0x9cfff2, 0.9);
        g.lineBetween(113, 83, 113 + Math.cos(angle) * 10, 83 + Math.sin(angle) * 10);
        for (const [x, y] of [[107, 80], [119, 88], [114, 76]]) {
            g.fillStyle(0xa5fff1, 0.5 + Math.sin(time * 0.004 + x) * 0.3);
            g.fillCircle(x, y, 1.2);
        }
    }
}
