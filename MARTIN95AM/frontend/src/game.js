import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import WorldScene from './scenes/WorldScene.js';

export default function Game() {
  const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'app',
    backgroundColor: '#111111',
    scene: [BootScene, MenuScene, WorldScene],
  };

  return new Phaser.Game(config);
}

Game();
