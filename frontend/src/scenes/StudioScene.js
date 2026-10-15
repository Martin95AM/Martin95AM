import Phaser from "phaser";
import Player from "../entities/Player.js";
import InputManager from "../managers/InputManager.js";
import NPC from "../npc/NPC.js";
import DialogSystem from "../npc/DialogSystem.js";
import PianoPanel from "../ui/PianoPanel.js";
import DrumPanel from "../ui/DrumPanel.js";
import SaveManager from '../managers/SaveManager.js';

export default class StudioScene extends Phaser.Scene {

    constructor() {
        super("StudioScene");
    }

    create(data = {}) {
        // The illustrated room is scaled to the existing 640x640 game world.
        this.add.image(0, 0, 'studio_cozy_drums').setOrigin(0, 0).setDisplaySize(640, 640);
        this.createStudioAtmosphere();

        // Spawn Martin (the player) at (320, 320)
        const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null;
        const start = data.player ?? (preview === 'studio' ? { x: 470, y: 395 } : preview === 'drums' ? { x: 215, y: 435 } : { x: 320, y: 320 });
        this.player = new Player(this, start.x, start.y);
        this.player.setTexture('martin_casual', 0);

        this.physics.world.setBounds(0, 0, 640, 640);
        this.cameras.main.setBounds(0, 0, 640, 640);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor('#2d2837');

        this.inputManager = new InputManager(this);
        this.input.keyboard.enabled = true;

        this.dialogSystem = new DialogSystem(this);
        this.pianoPanel = new PianoPanel();
        this.drumPanel = new DrumPanel();
        this.events.on('shutdown', () => this.saveGame());
        this.time.addEvent({ delay: 5000, loop: true, callback: () => this.saveGame() });
        this.createPianoCorner();
        this.createDrumCorner();
        this.createMachineRoomDoor();

        // The technician visits each workstation once before reshuffling the
        // order. Every target stays in walkable floor space beside its prop.
        this.npcs = [
            new NPC(this, 320, 420, 'tecnico_casual', 'Técnico', [
                '¡Hola, Martin! Bienvenido a mi estudio de grabación.',
                'Aquí es donde ocurre la magia de la música.'
            ], '', [
                { x: 320, y: 267, facing: 'up', sit: true, wait: 4200 },
                { x: 500, y: 360, facing: 'right', wait: 2600 },
                { x: 194, y: 434, facing: 'left', wait: 3000 },
                { x: 511, y: 458, facing: 'right', wait: 2800 }
            ]).setPatrolMode('shuffle')
        ];

        this.npcs.forEach((npc) => {
            this.physics.add.collider(this.player, npc);
        });

        // Torii Gate Exit Door (Interactive Spot) - Placed at the bottom center (320, 580)
        this.toriiGate = this.physics.add.staticSprite(320, 580, 'torii', 0);
        this.physics.add.collider(this.player, this.toriiGate);
        this.toriiOpened = false;

        // Interaction Prompt (Dynamic Width)
        this.promptBox = this.add.rectangle(320, 280, 160, 20, 0x111827, 0.9)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0xffffff)
            .setVisible(false)
            .setDepth(10000);
        this.promptBox.setInteractive({ useHandCursor: true });
        this.promptBox.on('pointerdown', () => {
            this.handleInteraction();
        });
        this.promptText = this.add.text(320, 280, "", {
            fontSize: "9px",
            color: "#ffffff",
            fontFamily: "monospace"
        }).setOrigin(0.5).setVisible(false).setDepth(10001);

        // Spotify UI Overlay (Centered on the computer screen at 320, 152.5)
        this.spotifyUI = this.add.container(320, 152.5).setVisible(false).setDepth(500);
        
        const spotifyBg = this.add.rectangle(0, 0, 78, 43, 0x121212, 1)
            .setStrokeStyle(1, 0x1db954); // Spotify green border!
        
        const spotifyHeader = this.add.text(0, -15, "Spotify", {
            fontSize: "6px",
            color: "#1db954",
            fontFamily: "monospace",
            fontWeight: "bold"
        }).setOrigin(0.5);
        
        const song1 = this.add.text(-34, -6, "1. Martin Quest", { fontSize: "4px", color: "#ffffff", fontFamily: "monospace" });
        const song2 = this.add.text(-34, 0, "2. Dojo Beats", { fontSize: "4px", color: "#b3b3b3", fontFamily: "monospace" });
        const song3 = this.add.text(-34, 6, "3. Kanto Retro", { fontSize: "4px", color: "#b3b3b3", fontFamily: "monospace" });
        
        const progressBarBg = this.add.rectangle(0, 15, 68, 2, 0x535353, 1);
        const progressBarFill = this.add.rectangle(-17, 15, 34, 2, 0x1db954, 1); // half filled
        
        this.spotifyUI.add([spotifyBg, spotifyHeader, song1, song2, song3, progressBarBg, progressBarFill]);

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.lKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.exiting = false;
        this.hasHeadphones = false;

        // Sound Waves Graphics for vibrating speakers
        this.soundWaves = this.add.graphics().setDepth(100);

        // Listen to close-headphones event from HTML close button
        this.boundCloseHeadphones = () => {
            if (this.hasHeadphones) {
                this.hasHeadphones = false;
                this.player.setTexture('martin_casual', 0);
                this.spotifyUI.setVisible(false);
                this.soundWaves.clear();
                this.showFloatingBubble(this.player.x, this.player.y, "Auriculares quitados.");
            }
        };
        window.addEventListener('close-headphones', this.boundCloseHeadphones);

        this.events.once('shutdown', () => {
            window.removeEventListener('close-headphones', this.boundCloseHeadphones);
            this.pianoPanel.destroy();
            this.drumPanel.destroy();
        });
        this.saveGame();
    }

    saveGame() {
        if (!this.player) return;
        SaveManager.save({ scene: 'StudioScene', player: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }

    createStudioAtmosphere() {
        // Small animated recording indicator on the wood trim below the window.
        this.add.rectangle(320, 103, 74, 15, 0x25382f)
            .setStrokeStyle(1, 0xd0aa69).setDepth(2);
        this.add.text(320, 103, 'SALA A · REC', {
            fontSize: '8px', color: '#ffdb9e', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(3);
        const liveLight = this.add.circle(362, 103, 2, 0xef675f).setDepth(3);
        this.tweens.add({ targets: liveLight, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    }

    createPianoCorner() {
        // Both instruments are painted into the room asset; only their physics
        // zones and interaction points need to be added to the scene.
        this.pianoPosition = { x: 532, y: 366 };
        this.pianoCollider = this.add.rectangle(550, 350, 62, 124, 0x000000, 0);
        this.physics.add.existing(this.pianoCollider, true);
        this.physics.add.collider(this.player, this.pianoCollider);
    }

    createDrumCorner() {
        this.drumPosition = { x: 173, y: 436 };
        this.drumCollider = this.add.rectangle(134, 437, 73, 93, 0x000000, 0);
        this.physics.add.existing(this.drumCollider, true);
        this.physics.add.collider(this.player, this.drumCollider);
    }

    createMachineRoomDoor() {
        // Blue service door on the studio's right wall, above the piano.
        this.machineDoorPosition = { x: 604, y: 250 };
        const door = this.add.container(604, 250).setDepth(4);
        const glow = this.add.rectangle(0, 0, 38, 62, 0x41c9ee, 0.22);
        const frame = this.add.rectangle(0, 0, 31, 55, 0x102b43).setStrokeStyle(3, 0x5adcf7);
        const center = this.add.rectangle(0, 1, 20, 43, 0x0a192f).setStrokeStyle(1, 0x2299c4);
        const light = this.add.rectangle(0, -17, 13, 3, 0x87f3ff);
        const label = this.add.text(0, 39, 'MÁQUINAS', { fontSize: '7px', fontFamily: 'monospace', color: '#9bedff', backgroundColor: '#102638' }).setOrigin(0.5);
        door.add([glow, frame, center, light, label]);
        this.tweens.add({ targets: glow, alpha: 0.45, duration: 1000, yoyo: true, repeat: -1 });
    }

    update() {
        this.npcs.forEach(npc => npc.update({
            paused: this.exiting || this.pianoPanel.opened || this.drumPanel.opened || this.dialogSystem.visible
        }));
        if (this.exiting || this.pianoPanel.opened || this.drumPanel.opened) {
            this.player.setVelocity(0, 0);
            return;
        }

        const keys = this.inputManager.getInputState();
        this.player.update(keys);

        // Y-sorting for depth
        this.player.setDepth(this.player.y);
        this.npcs.forEach(npc => npc.setDepth(npc.y));
        this.toriiGate.setDepth(this.toriiGate.y);

        // Check distance to spots
        const distToTecnico = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);
        const distToComputer = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 180);
        const distToPiano = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pianoPosition.x, this.pianoPosition.y);
        const distToDrums = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.drumPosition.x, this.drumPosition.y);
        const distToMachineDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.machineDoorPosition.x, this.machineDoorPosition.y);

        let activePrompt = null;
        let promptX = 0;
        let promptY = 0;

        if (distToMachineDoor < 90 && !this.dialogSystem.visible) {
            activePrompt = 'Pulsa M para entrar al cuarto de máquinas';
            promptX = 510;
            promptY = 195;
        } else if (distToPiano < 90 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa P para tocar el piano";
            promptX = this.pianoPosition.x;
            promptY = this.pianoPosition.y - 75;
        } else if (distToDrums < 82 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa B para tocar la batería";
            promptX = this.drumPosition.x;
            promptY = this.drumPosition.y - 78;
        } else if (distToTecnico < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa E para hablar con Técnico";
            promptX = this.npcs[0].x;
            promptY = this.npcs[0].y - 35;
        } else if (distToComputer < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa L para usar Auriculares / Spotify";
            promptX = 320;
            promptY = 180 - 35;
        } else if (distToTorii < 80 && !this.dialogSystem.visible && !this.toriiOpened) {
            activePrompt = "Q: ir al Dojo · golpes P/O · Miyagi M";
            promptX = this.toriiGate.x;
            promptY = this.toriiGate.y - 55;
        }

        if (activePrompt) {
            const boxWidth = activePrompt.length * 6.5; // dynamic width!
            this.promptBox.setSize(boxWidth, 20);
            this.promptBox.setPosition(promptX, promptY).setVisible(true);
            this.promptText.setText(activePrompt).setPosition(promptX, promptY).setVisible(true);
        } else {
            this.promptBox.setVisible(false);
            this.promptText.setVisible(false);
        }

        // Auto-close dialogue if player walks away
        if (this.dialogSystem.visible) {
            if (distToTecnico >= 60) {
                this.dialogSystem.hideDialog();
            }
        }

        // Handle E Key Interaction (Talk to the technician)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.handleInteraction('npc');
        }

        // Handle L Key Interaction (Toggle Headphones & Spotify)
        if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
            this.handleInteraction('computer');
        }

        // Handle Q Key Interaction (Torii Gate Exit)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.handleInteraction('exit');
        }
        if (Phaser.Input.Keyboard.JustDown(this.pKey) && distToPiano < 90 && !this.dialogSystem.visible) {
            this.handleInteraction('piano');
        }
        if (Phaser.Input.Keyboard.JustDown(this.bKey) && distToDrums < 82 && !this.dialogSystem.visible) {
            this.handleInteraction('drums');
        }
        if (Phaser.Input.Keyboard.JustDown(this.mKey) && distToMachineDoor < 90 && !this.dialogSystem.visible) {
            this.handleInteraction('machine-room');
        }
    }

    handleInteraction(action = 'auto') {
        const distToPiano = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pianoPosition.x, this.pianoPosition.y);
        const distToDrums = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.drumPosition.x, this.drumPosition.y);
        const distToTecnico = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);
        const distToComputer = Phaser.Math.Distance.Between(this.player.x, this.player.y, 320, 180);
        const distToMachineDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.machineDoorPosition.x, this.machineDoorPosition.y);

        if ((action === 'machine-room' || action === 'auto') && distToMachineDoor < 90 && !this.dialogSystem.visible) {
            this.exiting = true;
            this.inputManager.targetPosition = null;
            this.player.setVelocity(0, 0);
            const spotifyDiv = document.getElementById('spotify-player');
            if (spotifyDiv) spotifyDiv.style.display = 'none';
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('MachineRoomScene'));
        } else if ((action === 'piano' || action === 'auto') && distToPiano < 90 && !this.dialogSystem.visible) {
            this.inputManager.targetPosition = null;
            this.pianoPanel.open();
            this.promptBox.setVisible(false);
            this.promptText.setVisible(false);
        } else if ((action === 'drums' || action === 'auto') && distToDrums < 82 && !this.dialogSystem.visible) {
            this.inputManager.targetPosition = null;
            this.drumPanel.open();
            this.promptBox.setVisible(false);
            this.promptText.setVisible(false);
        } else if ((action === 'npc' || action === 'auto') && distToTecnico < 50) {
            this.dialogSystem.showDialog(this.npcs[0]);
        } else if ((action === 'computer' || action === 'auto') && distToComputer < 50) {
            this.toggleSpotify();
        } else if ((action === 'exit' || action === 'auto') && distToTorii < 80 && !this.toriiOpened) {
            this.toriiOpened = true;
            this.toriiGate.play('torii-open');
            this.physics.world.disableBody(this.toriiGate.body); // disable collision so player can walk through!
            
            // Hide real Spotify player on exit!
            const spotifyDiv = document.getElementById('spotify-player');
            if (spotifyDiv) spotifyDiv.style.display = 'none';
            
            // Camera fade out and transition back to WorldScene after 1.5 seconds
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.time.delayedCall(1500, () => {
                this.scene.start('WorldScene');
            });
        }
    }

    toggleSpotify() {
        this.hasHeadphones = !this.hasHeadphones;
        const spotifyDiv = document.getElementById('spotify-player');
        if (this.hasHeadphones) {
            this.player.setTexture('martin_casual_headphones', 0);
            this.spotifyUI.setVisible(true);
            if (spotifyDiv) spotifyDiv.style.display = 'block'; // Show real Spotify player!
            this.showFloatingBubble(this.player.x, this.player.y, "🎧 Escuchando Dojo Beats...");
        } else {
            this.player.setTexture('martin_casual', 0);
            this.spotifyUI.setVisible(false);
            if (spotifyDiv) spotifyDiv.style.display = 'none'; // Hide real Spotify player!
            this.showFloatingBubble(this.player.x, this.player.y, "Auriculares quitados.");
        }
    }

    showFloatingBubble(x, y, text) {
        const bubble = this.add.rectangle(x, y - 35, 150, 24, 0xffffff, 1)
            .setOrigin(0.5)
            .setStrokeStyle(1.5, 0x000000)
            .setDepth(20000);
        const tail = this.add.triangle(x, y - 23, 0, 0, 6, 0, 3, 4, 0xffffff)
            .setOrigin(0.5)
            .setDepth(20001);
        const tailOutline = this.add.triangle(x, y - 22, -1, -1, 7, -1, 3, 5, 0x000000)
            .setOrigin(0.5)
            .setDepth(19999);
        const bubbleText = this.add.text(x, y - 35, text, {
            fontSize: '8px',
            color: '#000000',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5).setDepth(20002);

        this.time.delayedCall(2000, () => {
            bubble.destroy();
            tail.destroy();
            tailOutline.destroy();
            bubbleText.destroy();
        });
    }
}
