import Phaser from "phaser";

export default class Inventory {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.visible = false;
        this.panel = null;
        this.key = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.scene.input.keyboard.on("keydown-I", () => this.toggle(), this);
    }

    addItem(item) {
        this.items.push(item);
    }

    toggle() {
        this.visible = !this.visible;

        if (this.panel) {
            this.panel.destroy();
            this.panel = null;
            return;
        }

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        this.panel = this.scene.add.rectangle(width / 2, height / 2, 320, 220, 0x111827, 0.9).setOrigin(0.5);
        this.scene.add.text(width / 2, height / 2 - 70, "Inventario", {
            fontSize: "24px",
            color: "#ffffff",
            fontFamily: "monospace"
        }).setOrigin(0.5);
        this.scene.add.text(width / 2, height / 2, this.items.length ? this.items.join(", ") : "Vacío", {
            fontSize: "18px",
            color: "#fcd34d",
            fontFamily: "monospace",
            wordWrap: { width: 280 }
        }).setOrigin(0.5);
    }
}
