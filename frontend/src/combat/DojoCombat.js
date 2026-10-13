import Phaser from 'phaser';
import { STRIKES, DIRECTIONS, canHit, facingTarget } from './rules.mjs';
import { createCombatPoses } from './poses.js';
import { ART_SCALE } from '../art/characters.js';

export default class DojoCombat {
    constructor(scene) {
        this.scene = scene;
        this.player = scene.player;
        this.sensei = scene.npcs[0];
        this.actions = new Map();
        this.readyAt = new Map();
        this.stunnedUntil = 0;
        this.hits = { player: 0, sensei: 0 };
        this.kataStep = -1;
        this.nextKataAt = 0;
        this.stopped = false;
        createCombatPoses(scene);
        this.visuals = new Map([this.player, this.sensei].map(actor => [
            actor, scene.add.sprite(actor.x, actor.y, actor.texture.key, 0).setScale(ART_SCALE).setVisible(false)
        ]));
        this.keys = scene.input.keyboard.addKeys({
            punch: Phaser.Input.Keyboard.KeyCodes.P,
            kick: Phaser.Input.Keyboard.KeyCodes.O,
            sensei: Phaser.Input.Keyboard.KeyCodes.M
        });
        // A separate camera keeps the controls readable while the world camera follows Martín.
        this.hud = scene.add.text(16, 14, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
            backgroundColor: '#111827', padding: { x: 10, y: 8 }, lineSpacing: 5
        }).setScrollFactor(0).setDepth(30000);
        scene.cameras.main.ignore(this.hud);
        this.hudCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
        this.hudCamera.inputEnabled = false;
        this.hudCamera.ignore(scene.children.list.filter(child => child !== this.hud));
        this.ignoreNewObject = child => { if (child !== this.hud) this.hudCamera.ignore(child); };
        scene.events.on('addedtoscene', this.ignoreNewObject);
        this.updateHud();
        scene.events.once('shutdown', () => {
            this.stopped = true;
            this.actions.clear();
            scene.events.off('addedtoscene', this.ignoreNewObject);
        });
    }

    updateHud(message = 'Sensei practica katas. Acercate para entrenar.') {
        const weapon = this.scene.equippedWeapon?.name;
        this.hud.setText([
            `P: ${weapon || 'puño'} · O: patada · M: golpe del Sensei · F: flexiones`,
            `Golpes acertados — Martín: ${this.hits.player} | Sensei: ${this.hits.sensei}`,
            message
        ]);
    }

    get playerBusy() {
        return this.actions.has(this.player) || this.scene.time.now < this.stunnedUntil;
    }

    showPose(actor, pose, direction) {
        const visual = this.visuals.get(actor);
        const character = actor === this.player ? 'martin' : 'guard';
        actor.setVisible(false);
        visual.setTexture(`${character}-${direction}-${pose}`).setVisible(true);
        visual.setPosition(actor.x, actor.y).setDepth(actor.y);
    }

    restore(actor) {
        this.visuals.get(actor).setVisible(false).clearTint();
        actor.setVisible(true);
    }

    strike(actor, target, type, direction) {
        const now = this.scene.time.now;
        if (this.stopped || this.actions.has(actor) || now < (this.readyAt.get(actor) || 0)) return;
        if (actor === this.player && now < this.stunnedUntil) return;
        this.scene.dialogSystem.hideDialog();
        this.scene.isDoingPushups = false;
        this.scene.inputManager.targetPosition = null;
        this.player.anims.stop();
        actor.setVelocity(0, 0);
        const weapon = actor === this.player && type === 'punch' ? this.scene.equippedWeapon : null;
        const strike = weapon
            ? { ...STRIKES.punch, reach: weapon.reach, cooldown: weapon.cooldown, windup: weapon.windup, duration: weapon.duration }
            : STRIKES[type];
        this.actions.set(actor, { target, type, direction, started: now, resolved: false, strike, weapon });
        this.readyAt.set(actor, now + strike.cooldown);
        this.showPose(actor, 'block', direction);
    }

    update() {
        if (this.stopped) return;
        const now = this.scene.time.now;
        // Consume every key press, including when a cooldown rejects it.
        const punch = Phaser.Input.Keyboard.JustDown(this.keys.punch);
        const kick = Phaser.Input.Keyboard.JustDown(this.keys.kick);
        const sensei = Phaser.Input.Keyboard.JustDown(this.keys.sensei);
        if (punch || kick) this.strike(this.player, this.sensei, punch ? 'punch' : 'kick', this.player.direction);
        if (sensei) {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sensei.x, this.sensei.y);
            if (distance <= STRIKES.kick.reach) {
                const type = distance <= STRIKES.punch.reach ? 'punch' : 'kick';
                this.strike(this.sensei, this.player, type, facingTarget(this.sensei, this.player));
                this.updateHud('¡Guardia! El Sensei va a golpear. Podés esquivarlo.');
            } else {
                this.updateHud('Acercate al Sensei y presioná M para pedirle un golpe.');
            }
        }

        for (const [actor, action] of this.actions) {
            const strike = action.strike;
            const elapsed = now - action.started;
            if (!action.resolved && elapsed >= strike.windup) {
                action.resolved = true;
                this.showPose(actor, action.type, action.direction);
                if (canHit(actor, action.target, action.direction, strike.reach)) {
                    this.hit(actor, action.target, action.direction);
                } else {
                    this.updateHud('El golpe no alcanzó. Acercate y mirá hacia tu rival.');
                }
            }
            if (elapsed >= strike.duration) {
                this.restore(actor);
                this.actions.delete(actor);
                if (actor === this.sensei) this.nextKataAt = now + 650;
            }
        }

        if (!this.actions.has(this.sensei) && !this.scene.dialogSystem.visible && now >= this.nextKataAt) {
            const kata = [
                ['left', 'block'], ['left', 'punch'], ['right', 'block'], ['right', 'punch'],
                ['down', 'block'], ['down', 'kick'], ['up', 'block'], ['up', 'punch']
            ];
            this.kataStep = (this.kataStep + 1) % kata.length;
            const [direction, pose] = kata[this.kataStep];
            this.showPose(this.sensei, pose, direction);
            this.nextKataAt = now + 650;
        }
        if (this.scene.dialogSystem.visible && !this.actions.has(this.sensei)) this.restore(this.sensei);
        for (const [actor, visual] of this.visuals) {
            visual.setPosition(actor.x, actor.y).setDepth(actor.y + 1);
        }
    }

    hit(attacker, target, direction) {
        this.hits[attacker === this.player ? 'player' : 'sensei'] += 1;
        target.setTint(0xffb78a);
        this.visuals.get(target).setTint(0xffb78a);
        this.scene.time.delayedCall(180, () => {
            target.clearTint();
            this.visuals.get(target).clearTint();
        });
        if (target === this.player) {
            this.scene.isDoingPushups = false;
            this.actions.delete(this.player);
            this.restore(this.player);
            this.player.anims.stop();
            this.player.setFrame(DIRECTIONS[this.player.direction].frame);
            this.stunnedUntil = this.scene.time.now + 180;
            const vector = DIRECTIONS[direction];
            this.player.setVelocity(vector.x * 110, vector.y * 110);
            this.scene.cameras.main.shake(100, 0.002);
        }
        const weapon = attacker === this.player ? this.actions.get(attacker)?.weapon?.name : null;
        this.updateHud(attacker === this.player
            ? `¡Buen golpe${weapon ? ` con ${weapon}` : ''}, Martín!`
            : '¡El Sensei acertó! Probá alejarte durante su preparación.');
        const flash = this.scene.add.circle(target.x, target.y - 8, 10, 0xffdf80, 0.8).setDepth(20000);
        this.scene.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 180, onComplete: () => flash.destroy() });
    }

    stop() {
        this.stopped = true;
        this.actions.clear();
        for (const actor of this.visuals.keys()) this.restore(actor);
        this.player.setVelocity(0, 0);
    }
}
