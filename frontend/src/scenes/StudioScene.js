import Phaser from "phaser";
import Player from "../entities/Player.js";
import InputManager from "../managers/InputManager.js";
import NPC from "../npc/NPC.js";
import DialogSystem from "../npc/DialogSystem.js";

export default class StudioScene extends Phaser.Scene {

    constructor() {
        super("StudioScene");
    }

    create() {
        // Render the beautiful 16-bit Recording Studio background
        this.add.image(0, 0, 'studio').setOrigin(0, 0);

        // Spawn Martin (the player) at (320, 320)
        this.player = new Player(this, 320, 320);
        this.player.setTexture('martin_casual');

        this.physics.world.setBounds(0, 0, 640, 640);
        this.cameras.main.setBounds(0, 0, 640, 640);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor('#2d2837');

        this.inputManager = new InputManager(this);
        this.input.keyboard.enabled = true;

        this.dialogSystem = new DialogSystem(this);

        // Spawn Braian (NPC) in the center of the Persian rug (320, 420)
        this.npcs = [
            new NPC(this, 320, 420, 'braian_casual', 'Braian', [
                '¡Hola, Martin! Bienvenido a mi estudio de grabación.',
                'Aquí es donde ocurre la magia de la música.'
            ], '')
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
        this.exiting = false;
        this.hasHeadphones = false;

        // Sound Waves Graphics for vibrating speakers
        this.soundWaves = this.add.graphics().setDepth(100);

        // Listen to close-headphones event from HTML close button
        this.boundCloseHeadphones = () => {
            if (this.hasHeadphones) {
                this.hasHeadphones = false;
                this.player.setTexture('martin_casual');
                this.spotifyUI.setVisible(false);
                this.soundWaves.clear();
                this.showFloatingBubble(this.player.x, this.player.y, "Auriculares quitados.");
            }
        };
        window.addEventListener('close-headphones', this.boundCloseHeadphones);

        this.events.once('shutdown', () => {
            window.removeEventListener('close-headphones', this.boundCloseHeadphones);
        });
    }

    update() {
        if (this.exiting) return;

        const keys = this.inputManager.getInputState();
        this.player.update(keys);

        // Y-sorting for depth
        this.player.setDepth(this.player.y);
        this.npcs.forEach(npc => npc.setDepth(npc.y));
        this.toriiGate.setDepth(this.toriiGate.y);

        // Check distance to spots
        const distToBraian = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);

        let activePrompt = null;
        let promptX = 0;
        let promptY = 0;

        if (distToBraian < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa E para hablar con Braian";
            promptX = this.npcs[0].x;
            promptY = this.npcs[0].y - 35;
        } else if (distToTorii < 80 && !this.dialogSystem.visible && !this.toriiOpened) {
            activePrompt = "Aprieta Q para pasar al otro Mapa";
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
            if (distToBraian >= 60) {
                this.dialogSystem.hideDialog();
            }
        }

        // Handle E Key Interaction (Talk to Braian)
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            if (distToBraian < 50) {
                this.dialogSystem.showDialog(this.npcs[0]);
            }
        }

        // Handle L Key Interaction (Toggle Headphones & Spotify)
        if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
            this.hasHeadphones = !this.hasHeadphones;
            const spotifyDiv = document.getElementById('spotify-player');
            if (this.hasHeadphones) {
                this.player.setTexture('martin_casual_headphones');
                this.spotifyUI.setVisible(true);
                if (spotifyDiv) spotifyDiv.style.display = 'block'; // Show real Spotify player!
                this.showFloatingBubble(this.player.x, this.player.y, "🎧 Escuchando Dojo Beats...");
            } else {
                this.player.setTexture('martin_casual');
                this.spotifyUI.setVisible(false);
                if (spotifyDiv) spotifyDiv.style.display = 'none'; // Hide real Spotify player!
                this.showFloatingBubble(this.player.x, this.player.y, "Auriculares quitados.");
            }
        }

        // Handle Q Key Interaction (Torii Gate Exit)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            if (distToTorii < 80 && !this.toriiOpened) {
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
