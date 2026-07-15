import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.add.text(20, 20, 'UI ready', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
  }
}
