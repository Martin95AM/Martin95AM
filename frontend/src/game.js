import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import WorldScene from './scenes/WorldScene.js';
import StudioScene from './scenes/StudioScene.js';

export default function Game() {
  const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'app',
    backgroundColor: '#111111',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [BootScene, MenuScene, WorldScene, StudioScene],
  };

  return new Phaser.Game(config);
}

Game();
