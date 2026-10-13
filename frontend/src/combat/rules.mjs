export const STRIKES = {
    punch: { reach: 54, windup: 150, duration: 380, cooldown: 480 },
    kick: { reach: 70, windup: 230, duration: 560, cooldown: 720 }
};

export const DIRECTIONS = {
    down: { x: 0, y: 1, frame: 0 },
    left: { x: -1, y: 0, frame: 4 },
    right: { x: 1, y: 0, frame: 8 },
    up: { x: 0, y: -1, frame: 12 }
};

export function facingTarget(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}

export function canHit(from, to, direction, reach) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const facing = DIRECTIONS[direction];
    return distance > 0 && distance <= reach && (dx * facing.x + dy * facing.y) / distance >= 0.5;
}
