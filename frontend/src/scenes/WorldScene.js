import Phaser from "phaser";
import Player from "../entities/Player.js";
import InputManager from "../managers/InputManager.js";
import NPC from "../npc/NPC.js";
import DialogSystem from "../npc/DialogSystem.js";
import Inventory from "../ui/Inventory.js";
import GameManager from "../managers/GameManager.js";

export default class WorldScene extends Phaser.Scene {

    constructor() {
        super("WorldScene");
    }

    create() {

        const map = this.make.tilemap({ key: 'villa' });

        // Render the beautiful 16-bit Dojo background
        this.add.image(0, 0, 'dojo').setOrigin(0, 0);

        this.player = new Player(this, 320, 380);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor('#3caa46');

        this.inputManager = new InputManager(this);
        this.input.keyboard.enabled = true;

        this.gameManager = new GameManager(this);
        this.inventory = new Inventory(this);
        this.dialogSystem = new DialogSystem(this);

        this.npcs = [
            new NPC(this, 320, 320, 'guard', 'Elias', [
                'Bienvenido al Dojo'
            ], '')
        ];

        this.npcs.forEach((npc) => {
            this.physics.add.collider(this.player, npc);
        });

        // Karate Do Weapon Rack (Interactive Spot 1) - Moved further left to x = 60
        this.weaponRack = this.physics.add.staticSprite(60, 200, 'weapon_rack');
        this.physics.add.collider(this.player, this.weaponRack);

        // Torii Gate Exit Door (Interactive Spot 2) - Lowered slightly to y = 65
        this.toriiGate = this.physics.add.staticSprite(320, 65, 'torii', 0);
        this.physics.add.collider(this.player, this.toriiGate);
        this.toriiOpened = false;

        // Spawn 5 resting students closer together and facing left (towards the tatami)
        this.students = [
            this.physics.add.staticSprite(530, 220, 'student_yellow'),
            this.physics.add.staticSprite(530, 260, 'student_orange'),
            this.physics.add.staticSprite(530, 300, 'student_green'),
            this.physics.add.staticSprite(530, 340, 'student_blue'),
            this.physics.add.staticSprite(530, 380, 'student_brown')
        ];

        this.students.forEach(student => {
            this.physics.add.collider(this.player, student);
        });

        // Play breathing animations
        this.students[0].play('student-yellow-breath', true);
        this.students[1].play('student-orange-breath', true);
        this.students[2].play('student-green-breath', true);
        this.students[3].play('student-blue-breath', true);
        this.students[4].play('student-brown-breath', true);

        // Interaction Prompt (Reverted to previous dark gray/white style)
        this.promptBox = this.add.rectangle(320, 280, 160, 20, 0x111827, 0.9)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0xffffff)
            .setVisible(false)
            .setDepth(10000);
        this.promptText = this.add.text(320, 280, "Pulsa E para hablar con Elias", {
            fontSize: "9px",
            color: "#ffffff",
            fontFamily: "monospace"
        }).setOrigin(0.5).setVisible(false).setDepth(10001);

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

        this.eliasState = 'idle'; // 'idle', 'talked', 'walking_away', 'training'
        this.isDoingPushups = false;
    }

    update() {
        if (this.isDoingPushups) {
            this.player.setVelocity(0, 0);
        } else {
            const keys = this.inputManager.getInputState();
            this.player.update(keys);
        }

        // Y-sorting for depth
        this.player.setDepth(this.player.y);
        this.npcs.forEach(npc => npc.setDepth(npc.y));
        this.weaponRack.setDepth(this.weaponRack.y);
        this.toriiGate.setDepth(this.toriiGate.y);
        this.students.forEach(student => student.setDepth(student.y));

        // Check distance to spots
        const distToElias = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToRack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.weaponRack.x, this.weaponRack.y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);

        let activePrompt = null;
        let promptX = 0;
        let promptY = 0;

        if (distToElias < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa E para hablar con Elias";
            promptX = this.npcs[0].x;
            promptY = this.npcs[0].y - 35;
        } else if (distToRack < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa E para ver armas";
            promptX = this.weaponRack.x;
            promptY = this.weaponRack.y - 30;
        } else if (distToTorii < 80 && !this.dialogSystem.visible && !this.toriiOpened) {
            activePrompt = "Aprieta Q para pasar al otro Mapa";
            promptX = this.toriiGate.x;
            promptY = this.toriiGate.y - 55;
        }

        if (activePrompt) {
            const boxWidth = activePrompt.length * 6.5; // dynamic width based on text length!
            this.promptBox.setSize(boxWidth, 20);
            this.promptBox.setPosition(promptX, promptY).setVisible(true);
            this.promptText.setText(activePrompt).setPosition(promptX, promptY).setVisible(true);
        } else {
            this.promptBox.setVisible(false);
            this.promptText.setVisible(false);
        }

        // Auto-close dialogue if player walks away
        if (this.dialogSystem.visible) {
            if (distToElias >= 60 && distToRack >= 60) {
                this.dialogSystem.hideDialog();
            }
        }

        // Handle P Key Interaction (Martin doing push-ups)
        if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
            this.isDoingPushups = !this.isDoingPushups;
            if (this.isDoingPushups) {
                this.player.setVelocity(0, 0);
                this.player.play('martin-pushup', true);
                
                // Elias shouts: "¡Dale, que los otros van más!"
                this.showFloatingBubble(this.npcs[0].x, this.npcs[0].y, "¡Dale, que los otros van más!");
            } else {
                this.player.play(`idle-${this.player.direction}`, true);
            }
        }

        // Walking away sequence trigger
        if (this.eliasState === 'talked' && distToElias >= 70) {
            this.eliasState = 'walking_away';
            
            // Elias says: "¿A dónde vas, Martin?"
            this.showFloatingBubble(this.npcs[0].x, this.npcs[0].y, "¿A dónde vas, Martin?");
            
            // After 2 seconds, Elias turns right and orders the students
            this.time.delayedCall(2000, () => {
                this.npcs[0].setFrame(8); // Turn right! (Frame 8 is right-facing in our spritesheet)
                this.showFloatingBubble(this.npcs[0].x, this.npcs[0].y, "¡Alumnos, flexiones 3 minutos!");
                
                // After another 2 seconds, students start doing push-ups
                this.time.delayedCall(2000, () => {
                    this.eliasState = 'training';
                    
                    // Start push-ups
                    const colors = ['yellow', 'orange', 'green', 'blue', 'brown'];
                    this.students.forEach((student, idx) => {
                        student.play(`student-${colors[idx]}-pushup`, true);
                    });

                    // Start random complaints timer
                    this.trainingTimer = this.time.addEvent({
                        delay: 4000,
                        callback: this.triggerRandomComplaint,
                        callbackScope: this,
                        loop: true
                    });
                });
            });
        }

        // Handle E Key Interaction
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            if (distToElias < 50) {
                this.dialogSystem.showDialog(this.npcs[0]);
                this.eliasState = 'talked';
            } else if (distToRack < 50) {
                this.dialogSystem.showDialog({
                    dialogLines: ["Armas de Karate Do: Bo (Baston), Sai, Tonfa, Nunchaku."],
                    x: this.weaponRack.x,
                    y: this.weaponRack.y + 15
                });
            }
        }

        // Handle Q Key Interaction (Torii Gate Exit)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            if (distToTorii < 80 && !this.toriiOpened) {
                this.toriiOpened = true;
                this.toriiGate.play('torii-open');
                this.physics.world.disableBody(this.toriiGate.body); // disable collision so player can walk through!
                
                // Camera fade out and transition to StudioScene after 1.5 seconds
                this.cameras.main.fadeOut(1000, 0, 0, 0);
                this.time.delayedCall(1500, () => {
                    this.scene.start('StudioScene');
                });
            }
        }
    }

    interactWithNearestNPC() {
        const nearby = this.npcs.find((npc) => 
            Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 90
        );

        if (!nearby) {
            return;
        }

        this.dialogSystem.showDialog(nearby);
        if (nearby.name === 'Elias') {
            this.eliasState = 'talked';
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

    triggerRandomComplaint() {
        if (this.eliasState !== 'training') return;

        const colors = ['yellow', 'orange', 'green', 'blue', 'brown'];
        const randIdx = Phaser.Math.Between(0, 4);
        const student = this.students[randIdx];
        const color = colors[randIdx];

        // Stop push-ups and play breathing/seiza
        student.play(`student-${color}-breath`, true);

        // Random phrase
        const phrases = ["¡Dale, sigan!", "¿Por qué no haces?", "¡Dale que ya casi termina!"];
        const randPhrase = phrases[Phaser.Math.Between(0, 2)];

        // Show bubble above Elias (the master)
        this.showFloatingBubble(this.npcs[0].x, this.npcs[0].y, randPhrase);

        // Student responds after 600ms
        this.time.delayedCall(600, () => {
            if (this.eliasState === 'training') {
                const responses = [
                    "¡Sí, Mestre!", 
                    "¡Ya voy!", 
                    "¡Entendido!",
                    "¡Oss, Mestre!",
                    "¡No doy más!",
                    "¡Un segundo!",
                    "¡Casi muero!",
                    "¡Fuerza!",
                    "¡Último esfuerzo!"
                ];
                const randResponse = responses[Phaser.Math.Between(0, responses.length - 1)];
                this.showFloatingBubble(student.x, student.y, randResponse);
            }
        });

        // Resume push-ups after 1.8 seconds
        this.time.delayedCall(1800, () => {
            if (this.eliasState === 'training') {
                student.play(`student-${color}-pushup`, true);
            }
        });
    }

}
