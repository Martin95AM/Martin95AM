import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';

export default class MenuScene extends Phaser.Scene {

    constructor() {

        super("MenuScene");
        this.selectedIndex = 0;
        this.menuItems = [];

    }

    create() {

        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        this.cameras.main.setBackgroundColor("#2B3A67");

        const panelWidth = 560;
        const panelHeight = 420;
        const panelX = width / 2;
        const panelY = height / 2;

        this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x111827, 0.85)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff);

        this.add.text(
            width / 2,
            panelY - 150,
            "MARTIN QUEST",
            {
                fontSize: "52px",
                color: "#FFFFFF",
                fontFamily: "monospace"
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            panelY - 100,
            "Resume Adventure",
            {
                fontSize: "24px",
                color: "#FFD166"
            }
        ).setOrigin(0.5);

        const labels = ["Nueva Partida", "Continuar", "Opciones"];
        this.menuItems = labels.map((label, index) => {
            const item = this.add.text(
                width / 2,
                panelY - 20 + index * 45,
                label,
                {
                    fontSize: "28px",
                    color: index === 0 ? "#FFFFFF" : "#CCCCCC"
                }
            ).setOrigin(0.5);

            item.setInteractive({ useHandCursor: true });
            item.on("pointerover", () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
            item.on("pointerdown", () => {
                this.selectedIndex = index;
                this.confirmSelection();
            });

            return {
                label,
                item
            };
        });

        const press = this.add.text(
            width / 2,
            panelY + 155,
            "Usa ↑ ↓ o WASD",
            {
                fontSize: "20px",
                color: "#FFFFFF"
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: press,
            alpha: 0.2,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.enabled = true;
        this.input.keyboard.addCapture([
            Phaser.Input.Keyboard.KeyCodes.ENTER,
            Phaser.Input.Keyboard.KeyCodes.SPACE,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.S
        ]);
        this.input.keyboard.on("keydown-UP", this.moveSelectionUp, this);
        this.input.keyboard.on("keydown-W", this.moveSelectionUp, this);
        this.input.keyboard.on("keydown-DOWN", this.moveSelectionDown, this);
        this.input.keyboard.on("keydown-S", this.moveSelectionDown, this);
        this.input.keyboard.on("keydown-ENTER", this.confirmSelection, this);
        this.input.keyboard.on("keydown-SPACE", this.confirmSelection, this);

        this.updateSelection();

    }

    moveSelectionUp() {

        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this.updateSelection();

    }

    moveSelectionDown() {

        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this.updateSelection();

    }

    confirmSelection() {
        if (this.selectedIndex === 0) {
            this.scene.start("WorldScene");
            return;
        }

        this.cameras.main.shake(150, 0.003);
    }

    updateSelection() {

        this.menuItems.forEach((entry, index) => {
            const isSelected = index === this.selectedIndex;
            entry.item.setText(`${isSelected ? "► " : "  "}${entry.label}`);
            entry.item.setColor(isSelected ? "#FFFFFF" : "#CCCCCC");
        });

    }

}
