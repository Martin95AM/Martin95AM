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
        const tileset = map.addTilesetImage('world', 'tiles');

        const ground = map.createLayer('Ground', tileset, 0, 0);
        const objects = map.createLayer('Objects', tileset, 0, 0);

        objects.setCollisionByExclusion([-1]);

        this.player = new Player(this, 1000, 1000);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);

        this.inputManager = new InputManager(this);
        this.input.keyboard.enabled = true;

        this.gameManager = new GameManager(this);
        this.inventory = new Inventory(this);
        this.dialogSystem = new DialogSystem(this);

        this.npcs = [
            new NPC(this, 980, 900, 'guard', 'Guardia', [
                '¡Bienvenido a la villa!',
                'Pulsa E para hablar conmigo.'
            ], 'talk')
        ];

        this.npcs.forEach((npc) => {
            this.physics.add.collider(this.player, npc);
        });

        this.physics.add.collider(this.player, objects);

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.input.keyboard.on('keydown-E', this.interactWithNearestNPC, this);
    }

    update() {
        const keys = this.inputManager.getInputState();
        this.player.update(keys);

        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.interactWithNearestNPC();
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
    }

}
