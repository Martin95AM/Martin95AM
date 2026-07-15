import Phaser from 'phaser';

export default class DialogSystem {
    constructor(scene) {
        this.scene = scene;
        this.box = null;
        this.text = null;
        this.visible = false;
        this.currentIndex = 0;
        this.currentLines = [];
    }

    showDialog(npc) {
        if (this.visible) return;

        this.visible = true;
        this.currentLines = npc.dialogLines;
        this.currentIndex = 0;

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.box = this.scene.add.rectangle(width / 2, height - 90, width - 60, 120, 0x111827, 0.9).setOrigin(0.5);
        this.text = this.scene.add.text(width / 2, height - 100, '', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'monospace',
            wordWrap: { width: width - 100 }
        }).setOrigin(0.5);

        this.box.setInteractive();
        this.box.on('pointerdown', () => this.nextLine());
        this.text.setInteractive();
        this.text.on('pointerdown', () => this.nextLine());

        this.nextLine();
    }

    nextLine() {
        if (this.currentIndex >= this.currentLines.length) {
            this.hideDialog();
            return;
        }

        this.text.setText(`${this.currentLines[this.currentIndex]}`);
        this.currentIndex += 1;
    }

    hideDialog() {
        if (this.box) this.box.destroy();
        if (this.text) this.text.destroy();
        this.box = null;
        this.text = null;
        this.visible = false;
    }
}
