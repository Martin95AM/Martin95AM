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
        this.kataAction = null;
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

    updateHud(message = 'Miyagi practica katas. Acercate para entrenar.') {
        const weapon = this.scene.equippedWeapon?.name;
        this.hud.setText([
            `P: ${weapon || 'puño'} · O: patada · M: golpe de Miyagi · F: flexiones`,
            `Golpes acertados — Martín: ${this.hits.player} | Miyagi: ${this.hits.sensei}`,
            message
        ]);
    }

    get playerBusy() {
        return this.actions.has(this.player) || this.scene.time.now < this.stunnedUntil;
    }

    showPose(actor, pose, direction, phase = 'strike') {
        const visual = this.visuals.get(actor);
        const character = actor === this.player ? 'martin' : 'guard';
        actor.setVisible(false);
        actor.anims.stop();
        visual.setTexture(`${character}-${direction}-${pose}-${phase}`).setVisible(true);
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
        actor.anims.stop();
        if (actor === this.sensei) this.kataAction = null;
        actor.setVelocity(0, 0);
        const weapon = actor === this.player && type === 'punch' ? this.scene.equippedWeapon : null;
        const strike = weapon
            ? { ...STRIKES.punch, reach: weapon.reach, cooldown: weapon.cooldown, windup: weapon.windup, duration: weapon.duration }
            : STRIKES[type];
        this.actions.set(actor, { target, type, direction, started: now, resolved: false,
            phase: 'windup', strike, weapon });
        this.readyAt.set(actor, now + strike.cooldown);
        this.showPose(actor, type, direction, 'windup');
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
                this.updateHud('¡Guardia! Miyagi va a golpear. Podés esquivarlo.');
            } else {
                this.updateHud('Acercate a Miyagi y presioná M para pedirle un golpe.');
            }
        }

        for (const [actor, action] of this.actions) {
            const strike = action.strike;
            const elapsed = now - action.started;
            if (action.phase === 'windup' && elapsed >= strike.windup * 0.48) {
                action.phase = 'chamber';
                this.showPose(actor, action.type, action.direction, 'chamber');
            }
            if (!action.resolved && elapsed >= strike.windup) {
                action.resolved = true;
                action.phase = 'strike';
                this.showPose(actor, action.type, action.direction, 'strike');
                if (canHit(actor, action.target, action.direction, strike.reach)) {
                    this.hit(actor, action.target, action.direction);
                } else {
                    this.updateHud('El golpe no alcanzó. Acercate y mirá hacia tu rival.');
                }
            }
            if (action.phase === 'strike' && elapsed >= strike.windup + 65) {
                action.phase = 'follow';
                this.showPose(actor, action.type, action.direction, 'follow');
            }
            const recoveryAt = Math.max(strike.windup + 110, strike.duration - 140);
            if (action.phase === 'follow' && elapsed >= recoveryAt) {
                action.phase = 'recover';
                this.showPose(actor, action.type, action.direction, 'recover');
            }
            if (elapsed >= strike.duration) {
                this.restore(actor);
                this.actions.delete(actor);
                if (actor === this.sensei) this.nextKataAt = now + 900;
            }
        }

        const playerNearby = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sensei.x, this.sensei.y) < 125;
        // Short, jointed demonstrations are separated by actual patrol steps.
        // The old kata pose remained visible indefinitely and NPC.update()
        // treated any visible pose as a permanent reason to stop walking.
        if (this.kataAction && (this.scene.dialogSystem.visible || this.actions.has(this.sensei))) {
            this.kataAction = null;
            if (!this.actions.has(this.sensei)) this.restore(this.sensei);
        }
        if (!this.kataAction && !this.actions.has(this.sensei) && playerNearby &&
            !this.scene.dialogSystem.visible && now >= this.nextKataAt) {
            const sequence = ['block', 'punch', 'block', 'kick'];
            this.kataStep = (this.kataStep + 1) % sequence.length;
            this.kataAction = {
                started: now, type: sequence[this.kataStep],
                direction: facingTarget(this.sensei, this.player), phase: null
            };
            this.sensei.setVelocity(0, 0);
            this.nextKataAt = now + 2150;
        }
        if (this.kataAction) {
            const elapsed = now - this.kataAction.started;
            if (elapsed >= 520) {
                this.restore(this.sensei);
                this.kataAction = null;
            } else {
                const phase = elapsed < 100 ? 'windup' : elapsed < 205 ? 'chamber'
                    : elapsed < 295 ? 'strike' : elapsed < 370 ? 'follow' : 'recover';
                if (phase !== this.kataAction.phase) {
                    this.kataAction.phase = phase;
                    this.showPose(this.sensei, this.kataAction.type, this.kataAction.direction, phase);
                }
            }
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
        const activeWeapon = attacker === this.player ? this.actions.get(attacker)?.weapon : null;
        const weapon = activeWeapon?.name;
        this.updateHud(attacker === this.player
            ? `¡Buen golpe${weapon ? ` con ${weapon}` : ''}, Martín!`
            : '¡Miyagi acertó! Probá alejarte durante su preparación.');
        this.createImpactEffect(target, activeWeapon?.key);
    }

    createImpactEffect(target, weaponKey) {
        const colors = {
            bo: 0xf7c764,
            sai: 0xdceaf6,
            tonfa: 0xe39a55,
            nunchaku: 0xffd35c,
            kamas: 0xffd36c
        };
        const color = colors[weaponKey] || 0xffdf80;
        const flash = this.scene.add.circle(target.x, target.y - 8, weaponKey ? 8 : 7, color, 0.82).setDepth(20000);
        const marks = this.scene.add.graphics().setPosition(target.x, target.y - 8).setScale(0.65).setDepth(20001);
        marks.lineStyle(weaponKey === 'bo' ? 3 : 2, color, 0.95);
        const x = 0, y = 0;
        if (weaponKey === 'kamas') {
            marks.beginPath().moveTo(x - 17, y - 14).lineTo(x - 5, y - 8).lineTo(x + 15, y + 14)
                .moveTo(x - 17, y + 14).lineTo(x - 5, y + 8).lineTo(x + 15, y - 14).strokePath();
            marks.lineStyle(1, 0xffffff, 0.95).beginPath()
                .moveTo(x - 11, y - 12).lineTo(x + 12, y + 11)
                .moveTo(x - 11, y + 12).lineTo(x + 12, y - 11).strokePath();
        } else if (weaponKey === 'nunchaku') {
            marks.strokeCircle(x, y, 15);
            marks.lineStyle(1, 0xffffff, 0.9).strokeCircle(x, y, 11);
        } else if (weaponKey === 'sai') {
            marks.beginPath().moveTo(x - 19, y - 6).lineTo(x + 15, y - 6)
                .moveTo(x - 19, y + 6).lineTo(x + 15, y + 6)
                .moveTo(x + 12, y - 11).lineTo(x + 18, y - 6).lineTo(x + 12, y - 1)
                .moveTo(x + 12, y + 1).lineTo(x + 18, y + 6).lineTo(x + 12, y + 11).strokePath();
        } else if (weaponKey === 'tonfa') {
            marks.strokeRect(x - 10, y - 10, 20, 20);
            marks.lineStyle(1, 0xffffff, 0.9).strokeRect(x - 7, y - 7, 14, 14);
        } else {
            marks.beginPath().moveTo(x - 19, y - 12).lineTo(x - 4, y - 13)
                .lineTo(x + 16, y - 5).lineTo(x + 21, y + 5)
                .lineTo(x + 15, y + 13).strokePath();
        }
        this.scene.tweens.add({
            targets: [flash, marks], alpha: 0, scaleX: 1.05, scaleY: 1.05, duration: 190,
            onComplete: () => { flash.destroy(); marks.destroy(); }
        });
    }

    stop() {
        this.stopped = true;
        this.actions.clear();
        this.kataAction = null;
        for (const actor of this.visuals.keys()) this.restore(actor);
        this.player.setVelocity(0, 0);
    }
}
