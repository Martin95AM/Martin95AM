import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import WorldScene from './scenes/WorldScene.js';
import StudioScene from './scenes/StudioScene.js';
import MachineRoomScene from './scenes/MachineRoomScene.js';

export default function Game() {
  const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'app',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#111111',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [BootScene, MenuScene, WorldScene, StudioScene, MachineRoomScene],
  };

  return new Phaser.Game(config);
}

Game();
