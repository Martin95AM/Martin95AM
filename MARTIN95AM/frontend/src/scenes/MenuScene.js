import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {

    constructor() {

        super("MenuScene");
        this.selectedIndex = 0;
        this.menuItems = [];

    }

    create() {

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

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
        this.input.keyboard.on("keydown-UP", this.moveSelectionUp, this);
        this.input.keyboard.on("keydown-W", this.moveSelectionUp, this);
        this.input.keyboard.on("keydown-DOWN", this.moveSelectionDown, this);
        this.input.keyboard.on("keydown-S", this.moveSelectionDown, this);
        this.input.keyboard.on("keydown-ENTER", this.confirmSelection, this);
        this.input.keyboard.on("keydown-SPACE", this.confirmSelection, this);

        this.boundHandleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
        window.addEventListener("keydown", this.boundHandleGlobalKeyDown, true);
        this.events.once("shutdown", this.removeGlobalKeyDown, this);
        this.events.once("destroy", this.removeGlobalKeyDown, this);

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
        if (this.selectedIndex === 0 || this.selectedIndex === 1) {
            this.scene.start("WorldScene");
            return;
        }

        this.cameras.main.shake(150, 0.003);
    }

    handleGlobalKeyDown(event) {
        const key = event.key;

        if (key === "Enter" || key === " " || key === "Spacebar") {
            event.preventDefault();
            event.stopPropagation();
            this.confirmSelection();
        }
    }

    removeGlobalKeyDown() {
        if (this.boundHandleGlobalKeyDown) {
            window.removeEventListener("keydown", this.boundHandleGlobalKeyDown, true);
        }
    }

    updateSelection() {

        this.menuItems.forEach((entry, index) => {
            const isSelected = index === this.selectedIndex;
            entry.item.setText(`${isSelected ? "► " : "  "}${entry.label}`);
            entry.item.setColor(isSelected ? "#FFFFFF" : "#CCCCCC");
        });

    }

}
