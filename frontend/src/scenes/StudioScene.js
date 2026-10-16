import Phaser from "phaser";
import Player from "../entities/Player.js";
import InputManager from "../managers/InputManager.js";
import NPC from "../npc/NPC.js";
import DialogSystem from "../npc/DialogSystem.js";
import PianoPanel from "../ui/PianoPanel.js";
import DrumPanel from "../ui/DrumPanel.js";
import PatchBayPanel from "../ui/PatchBayPanel.js";
import SaveManager from '../managers/SaveManager.js';

export default class StudioScene extends Phaser.Scene {

    constructor() {
        super("StudioScene");
    }

    create(data = {}) {
        // The illustrated room is scaled to the existing 640x640 game world.
        this.add.image(0, 0, 'studio_cozy_drums').setOrigin(0, 0).setDisplaySize(640, 640);

        // Spawn Martin (the player) at (320, 320)
        const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null;
        const start = data.player ?? (preview === 'studio' ? { x: 470, y: 395 } : preview === 'drums' ? { x: 285, y: 470 } : { x: 320, y: 320 });
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
        this.patchBayPanel = new PatchBayPanel();
        this.events.on('shutdown', () => this.saveGame());
        this.time.addEvent({ delay: 5000, loop: true, callback: () => this.saveGame() });
        this.createPianoCorner();
        this.createDrumCorner();
        this.createSofaCollider();
        this.createConsoleColliders();
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
            { x: 285, y: 475, facing: 'left', wait: 3000 },
                { x: 511, y: 458, facing: 'right', wait: 2800 }
            ]).setPatrolMode('shuffle')
        ];

        this.npcs.forEach((npc) => {
            this.physics.add.collider(this.player, npc);
        });

        // The two exits are painted into the upper wall of the room.
        this.createAcademyDoor();
        this.academyOpened = false;

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
        const song2 = this.add.text(-34, 0, "2. Academia Beats", { fontSize: "4px", color: "#b3b3b3", fontFamily: "monospace" });
        const song3 = this.add.text(-34, 6, "3. Kanto Retro", { fontSize: "4px", color: "#b3b3b3", fontFamily: "monospace" });
        
        const progressBarBg = this.add.rectangle(0, 15, 68, 2, 0x535353, 1);
        const progressBarFill = this.add.rectangle(-17, 15, 34, 2, 0x1db954, 1); // half filled
        
        this.spotifyUI.add([spotifyBg, spotifyHeader, song1, song2, song3, progressBarBg, progressBarFill]);

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.lKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
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
            this.patchBayPanel.destroy();
        });
        this.saveGame();
    }

    saveGame() {
        if (!this.player) return;
        SaveManager.save({ scene: 'StudioScene', player: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }

    createPianoCorner() {
        // Both instruments are painted into the room asset; only their physics
        // zones and interaction points need to be added to the scene.
        this.pianoPosition = { x: 525, y: 360 };
        this.pianoCollider = this.add.rectangle(570, 360, 78, 145, 0x000000, 0);
        this.physics.add.existing(this.pianoCollider, true);
        this.physics.add.collider(this.player, this.pianoCollider);
    }

    createDrumCorner() {
        this.drumPosition = { x: 278, y: 470 };
        this.drumColliders = [
            this.add.rectangle(130, 452, 100, 90, 0x000000, 0),
            this.add.rectangle(190, 534, 145, 140, 0x000000, 0)
        ];
        for (const obstacle of this.drumColliders) {
            this.physics.add.existing(obstacle, true);
            this.physics.add.collider(this.player, obstacle);
        }
    }

    createSofaCollider() {
        this.sofaCollider = this.add.rectangle(94, 344, 88, 134, 0x000000, 0);
        this.physics.add.existing(this.sofaCollider, true);
        this.physics.add.collider(this.player, this.sofaCollider);
    }

    createConsoleColliders() {
        // The upper wall keeps the player in front of the doors and window.
        // The painted console and monitor form one solid workstation; the
        // chair extends into the room and needs its own collision shape.
        this.upperWallCollider = this.add.rectangle(320, 58, 640, 116, 0x000000, 0);
        this.consoleCollider = this.add.rectangle(320, 180, 300, 120, 0x000000, 0);
        this.chairCollider = this.add.rectangle(320, 260, 50, 66, 0x000000, 0);
        for (const obstacle of [this.upperWallCollider, this.consoleCollider, this.chairCollider]) {
            this.physics.add.existing(obstacle, true);
            this.physics.add.collider(this.player, obstacle);
        }
        // Approach the PC from the open floor to the right of the chair.
        this.computerPosition = { x: 385, y: 257 };
        // The cable-filled patch bay is painted at the right end of the mixer.
        // Approach it from the open floor beside the console.
        this.patchBayPosition = { x: 445, y: 245 };
    }

    createMachineRoomDoor() {
        this.machineDoorPosition = { x: 522, y: 94 };
    }

    createAcademyDoor() {
        this.academyDoorPosition = { x: 110, y: 94 };
    }

    update() {
        this.npcs.forEach(npc => npc.update({
            paused: this.exiting || this.pianoPanel.opened || this.drumPanel.opened || this.patchBayPanel.opened || this.dialogSystem.visible
        }));
        if (this.exiting || this.pianoPanel.opened || this.drumPanel.opened || this.patchBayPanel.opened) {
            this.player.setVelocity(0, 0);
            return;
        }

        const keys = this.inputManager.getInputState();
        this.player.update(keys);

        // Y-sorting for depth
        this.player.setDepth(this.player.y);
        this.npcs.forEach(npc => npc.setDepth(npc.y));

        // Check distance to spots
        const distToTecnico = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToAcademyDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.academyDoorPosition.x, this.academyDoorPosition.y);
        const distToComputer = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.computerPosition.x, this.computerPosition.y);
        const distToPiano = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pianoPosition.x, this.pianoPosition.y);
        const distToDrums = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.drumPosition.x, this.drumPosition.y);
        const distToMachineDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.machineDoorPosition.x, this.machineDoorPosition.y);
        const distToPatchBay = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.patchBayPosition.x, this.patchBayPosition.y);

        let activePrompt = null;
        let promptX = 0;
        let promptY = 0;

        if (distToMachineDoor < 110 && !this.dialogSystem.visible) {
            activePrompt = 'Pulsa M para entrar al cuarto de máquinas';
            promptX = 455;
            promptY = 145;
        } else if (distToPatchBay < 60 && !this.dialogSystem.visible) {
            activePrompt = 'Pulsa C para desenredar la patch bay';
            promptX = 465;
            promptY = 203;
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
            promptX = 385;
            promptY = 230;
        } else if (distToAcademyDoor < 110 && !this.dialogSystem.visible && !this.academyOpened) {
            activePrompt = "Pulsa Q para entrar a la Academia";
            promptX = 175;
            promptY = 145;
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
        if (Phaser.Input.Keyboard.JustDown(this.cKey) && distToPatchBay < 60 && !this.dialogSystem.visible) {
            this.handleInteraction('patch-bay');
        }
        if (Phaser.Input.Keyboard.JustDown(this.mKey) && distToMachineDoor < 110 && !this.dialogSystem.visible) {
            this.handleInteraction('machine-room');
        }
    }

    handleInteraction(action = 'auto') {
        const distToPiano = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pianoPosition.x, this.pianoPosition.y);
        const distToDrums = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.drumPosition.x, this.drumPosition.y);
        const distToTecnico = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToAcademyDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.academyDoorPosition.x, this.academyDoorPosition.y);
        const distToComputer = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.computerPosition.x, this.computerPosition.y);
        const distToMachineDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.machineDoorPosition.x, this.machineDoorPosition.y);
        const distToPatchBay = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.patchBayPosition.x, this.patchBayPosition.y);

        if ((action === 'machine-room' || action === 'auto') && distToMachineDoor < 110 && !this.dialogSystem.visible) {
            this.exiting = true;
            this.inputManager.targetPosition = null;
            this.player.setVelocity(0, 0);
            const spotifyDiv = document.getElementById('spotify-player');
            if (spotifyDiv) spotifyDiv.style.display = 'none';
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('MachineRoomScene'));
        } else if ((action === 'patch-bay' || action === 'auto') && distToPatchBay < 60 && !this.dialogSystem.visible) {
            this.inputManager.targetPosition = null;
            this.patchBayPanel.open();
            this.promptBox.setVisible(false);
            this.promptText.setVisible(false);
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
        } else if ((action === 'exit' || action === 'auto') && distToAcademyDoor < 110 && !this.academyOpened) {
            this.academyOpened = true;
            
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
            this.showFloatingBubble(this.player.x, this.player.y, "🎧 Escuchando Academia Beats...");
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
