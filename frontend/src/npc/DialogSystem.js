import Phaser from 'phaser';

export default class DialogSystem {
    constructor(scene) {
        this.scene = scene;
        this.box = null;
        this.text = null;
        this.tail = null;
        this.tailOutline = null;
        this.visible = false;
        this.currentIndex = 0;
        this.currentLines = [];
    }

    showDialog(npc) {
        if (this.visible) return;

        this.visible = true;
        this.currentLines = npc.dialogLines;
        this.currentIndex = 0;

        // Position the speech bubble above the NPC's head! (Shrunk)
        const bubbleX = npc.x;
        const bubbleY = npc.y - 40;

        // Speech bubble background (white with black border)
        this.box = this.scene.add.rectangle(bubbleX, bubbleY, 130, 26, 0xffffff, 1)
            .setOrigin(0.5)
            .setStrokeStyle(1.5, 0x000000)
            .setDepth(20000);

        // Speech bubble tail (triangle pointing down to the NPC)
        this.tail = this.scene.add.triangle(
            bubbleX, bubbleY + 13,
            0, 0,
            8, 0,
            4, 5,
            0xffffff
        ).setOrigin(0.5).setDepth(20001);
        
        // Add a black outline to the tail
        this.tailOutline = this.scene.add.triangle(
            bubbleX, bubbleY + 14,
            -1, -1,
            9, -1,
            4, 6,
            0x000000
        ).setOrigin(0.5).setDepth(19999);

        this.text = this.scene.add.text(bubbleX, bubbleY, '', {
            fontSize: '10px',
            color: '#000000',
            fontFamily: 'monospace',
            wordWrap: { width: 110 },
            align: 'center'
        }).setOrigin(0.5).setDepth(20002);

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
        if (this.tail) this.tail.destroy();
        if (this.tailOutline) this.tailOutline.destroy();
        this.box = null;
        this.text = null;
        this.tail = null;
        this.tailOutline = null;
        this.visible = false;
    }
}
