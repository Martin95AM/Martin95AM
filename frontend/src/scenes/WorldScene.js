import Phaser from "phaser";
import Player from "../entities/Player.js";
import InputManager from "../managers/InputManager.js";
import NPC from "../npc/NPC.js";
import DialogSystem from "../npc/DialogSystem.js";
import Inventory from "../ui/Inventory.js";
import GameManager from "../managers/GameManager.js";
import DojoCombat from "../combat/DojoCombat.js";
import { ART_SCALE } from "../art/characters.js";
import { drawWeapon } from "../art/weapons.js";
import { combatHandOffsets } from "../combat/poses.js";

export default class WorldScene extends Phaser.Scene {

    constructor() {
        super("WorldScene");
    }

    create() {

        const map = this.make.tilemap({ key: 'villa' });

        // Render the beautiful 16-bit Dojo background
        this.add.image(0, 0, 'dojo').setOrigin(0, 0);
        this.createDojoAtmosphere();

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
            new NPC(this, 320, 320, 'guard', 'Sensei', [
                'Bienvenido al Dojo'
            ], '')
        ];

        this.npcs.forEach((npc) => {
            this.physics.add.collider(this.player, npc);
        });

        // Interactive arsenal: the painted rack gets a physical interaction zone.
        this.weaponRack = this.physics.add.staticSprite(60, 200, 'weapon_rack');
        this.physics.add.collider(this.player, this.weaponRack);
        this.equippedWeapon = null;
        this.weaponMenuOpen = false;
        this.weaponGraphics = this.add.graphics().setDepth(1000);
        this.createWeaponMenu();

        // Torii Gate Exit Door (Interactive Spot 2) - Lowered slightly to y = 65
        this.toriiGate = this.physics.add.staticSprite(320, 65, 'torii', 0);
        this.physics.add.collider(this.player, this.toriiGate);
        this.toriiOpened = false;

        // A compact seiza group facing the tatami. Two rows make the dojo feel
        // occupied while preserving a clear path for the player on the left.
        const studentSetup = [
            { x: 500, y: 234, key: 'student_yellow' },
            { x: 548, y: 234, key: 'student_orange' },
            { x: 596, y: 234, key: 'student_green' },
            { x: 524, y: 278, key: 'student_blue' },
            { x: 572, y: 278, key: 'student_brown' }
        ];
        this.studentShadows = studentSetup.map(({ x, y }) => this.add.ellipse(x, y + 21, 29, 7, 0x182233, 0.24)
            .setDepth(y - 1));
        this.students = studentSetup.map(({ x, y, key }) => this.physics.add.staticSprite(x, y, key)
            .setScale(ART_SCALE).refreshBody());

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
        this.promptBox.setInteractive({ useHandCursor: true });
        this.promptBox.on('pointerdown', () => {
            this.handleInteraction();
        });
        this.promptText = this.add.text(320, 280, "Pulsa E para hablar con Sensei", {
            fontSize: "9px",
            color: "#ffffff",
            fontFamily: "monospace"
        }).setOrigin(0.5).setVisible(false).setDepth(10001);

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.weaponKeys = this.input.keyboard.addKeys({
            bo: Phaser.Input.Keyboard.KeyCodes.ONE,
            sai: Phaser.Input.Keyboard.KeyCodes.TWO,
            tonfa: Phaser.Input.Keyboard.KeyCodes.THREE,
            nunchaku: Phaser.Input.Keyboard.KeyCodes.FOUR,
            kamas: Phaser.Input.Keyboard.KeyCodes.FIVE
        });

        this.eliasState = 'idle'; // 'idle', 'talked', 'walking_away', 'training'
        this.isDoingPushups = false;
        this.combat = new DojoCombat(this);
    }

    update() {
        this.combat.update();
        if (this.weaponMenuOpen) {
            this.player.setVelocity(0, 0);
            this.handleWeaponSelection();
        } else if (this.combat.playerBusy || this.toriiOpened) {
            // Combat controls attack recovery and the brief hit recoil.
        } else if (this.isDoingPushups) {
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
        this.studentShadows.forEach((shadow, index) => shadow.setDepth(this.students[index].y - 1));
        this.drawEquippedWeapon();

        // Check distance to spots
        const distToElias = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToRack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.weaponRack.x, this.weaponRack.y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);

        let activePrompt = null;
        let promptX = 0;
        let promptY = 0;

        if (distToElias < 50 && !this.dialogSystem.visible) {
            activePrompt = "Pulsa E para hablar con Sensei";
            promptX = this.npcs[0].x;
            promptY = this.npcs[0].y - 35;
        } else if (distToRack < 62 && !this.dialogSystem.visible && !this.weaponMenuOpen) {
            activePrompt = this.equippedWeapon
                ? `E: arsenal · Equipada: ${this.equippedWeapon.name}`
                : "Pulsa E para abrir el arsenal";
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

        // F preserves push-ups; P and O are now combat controls.
        if (Phaser.Input.Keyboard.JustDown(this.fKey) && !this.combat.playerBusy && !this.toriiOpened && !this.weaponMenuOpen) {
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
        if (Phaser.Input.Keyboard.JustDown(this.eKey) && !this.weaponMenuOpen) {
            this.handleInteraction();
        }

        // Handle Q Key Interaction (Torii Gate Exit)
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.handleInteraction();
        }
    }

    handleInteraction() {
        if (this.combat.playerBusy || this.toriiOpened) return;
        const distToElias = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcs[0].x, this.npcs[0].y);
        const distToRack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.weaponRack.x, this.weaponRack.y);
        const distToTorii = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.toriiGate.x, this.toriiGate.y);

        if (distToElias < 50) {
            this.dialogSystem.showDialog(this.npcs[0]);
            this.eliasState = 'talked';
        } else if (distToRack < 62) {
            this.openWeaponMenu();
        } else if (distToTorii < 80 && !this.toriiOpened) {
            this.combat.stop();
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

    createDojoAtmosphere() {
        const plaque = this.add.rectangle(320, 104, 106, 17, 0x25382f)
            .setStrokeStyle(1, 0xd2ae72).setDepth(2);
        this.add.text(320, 104, 'DOJO MARTIN · 稽古', {
            fontSize: '8px', color: '#ffe1a3', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(3);
        const lights = [64, 582].map(x => this.add.circle(x, 49, 15, 0xffd47a, 0.09).setDepth(2));
        this.tweens.add({ targets: lights, alpha: 0.17, scale: 1.12, duration: 1300, yoyo: true, repeat: -1 });
        plaque.setAlpha(0.96);
    }

    createWeaponMenu() {
        this.weaponMenu = this.add.container(150, 205).setVisible(false).setDepth(25000);
        const shadow = this.add.rectangle(3, 4, 222, 128, 0x081018, 0.45);
        const bg = this.add.rectangle(0, 0, 222, 128, 0x111827, 0.97)
            .setStrokeStyle(2, 0xd2ae72);
        const title = this.add.text(0, -49, 'ARSENAL DEL DOJO', {
            fontSize: '10px', color: '#ffe1a3', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);
        const options = this.add.text(-76, -35,
            '1  BŌ         alcance largo\n2  SAI        doble estocada\n3  TONFA      defensa sólida\n4  NUNCHAKU   combo veloz\n5  KAMAS      corte cruzado', {
                fontSize: '8px', color: '#e7edf2', fontFamily: 'monospace', lineSpacing: 5
            });
        const icons = this.add.graphics();
        ['bo', 'sai', 'tonfa', 'nunchaku', 'kamas'].forEach((key, index) => {
            drawWeapon(icons, key, -99, -31 + index * 14, 'right', false, 0.55);
        });
        const hint = this.add.text(0, 51, '1–5 equipar  ·  ESC cerrar', {
            fontSize: '7px', color: '#9dafc3', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.weaponMenu.add([shadow, bg, title, icons, options, hint]);
    }

    openWeaponMenu() {
        this.weaponMenuOpen = true;
        this.player.setVelocity(0, 0);
        this.weaponMenu.setVisible(true);
        this.promptBox.setVisible(false);
        this.promptText.setVisible(false);
        this.combat.updateHud('Elegí un arma del arsenal con 1, 2, 3, 4 o 5.');
    }

    closeWeaponMenu() {
        this.weaponMenuOpen = false;
        this.weaponMenu.setVisible(false);
    }

    handleWeaponSelection() {
        const arsenal = {
            bo: { name: 'Bo', color: 0xb9783d, reach: 76, cooldown: 500, windup: 150, duration: 400 },
            sai: { name: 'Sai', color: 0xd7e0e5, reach: 50, cooldown: 330, windup: 95, duration: 280 },
            tonfa: { name: 'Tonfa', color: 0x704225, reach: 46, cooldown: 390, windup: 110, duration: 320 },
            nunchaku: { name: 'Nunchaku', color: 0xc88b43, reach: 61, cooldown: 360, windup: 120, duration: 330 },
            kamas: { name: 'Kamas', color: 0xd4dde7, reach: 58, cooldown: 410, windup: 105, duration: 350 }
        };
        for (const [key, keyObject] of Object.entries(this.weaponKeys)) {
            if (!Phaser.Input.Keyboard.JustDown(keyObject)) continue;
            this.equippedWeapon = { key, ...arsenal[key] };
            this.closeWeaponMenu();
            this.showFloatingBubble(this.player.x, this.player.y, `${this.equippedWeapon.name} equipada · P para usar`);
            this.combat.updateHud(`${this.equippedWeapon.name} equipada. P: arma · O: patada.`);
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) this.closeWeaponMenu();
    }

    drawEquippedWeapon() {
        const g = this.weaponGraphics.clear();
        if (!this.equippedWeapon || this.toriiOpened) return;
        const { x, y } = this.player;
        const action = this.combat.actions.get(this.player);
        const armedAction = action?.type === 'punch' ? action : null;
        const direction = armedAction?.direction || this.player.direction;
        const scale = {
            bo: 0.72, sai: 0.70, tonfa: 0.70, nunchaku: 0.67, kamas: 0.62
        }[this.equippedWeapon.key];
        const grips = armedAction ? combatHandOffsets(direction, armedAction.phase) : 9;
        drawWeapon(g, this.equippedWeapon.key, x, armedAction ? y : y + 2,
            direction, armedAction?.phase === 'strike', scale, grips);
        g.setDepth(y + 3);
    }

    interactWithNearestNPC() {
        const nearby = this.npcs.find((npc) => 
            Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 90
        );

        if (!nearby) {
            return;
        }

        this.dialogSystem.showDialog(nearby);
        if (nearby.name === 'Sensei') {
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
