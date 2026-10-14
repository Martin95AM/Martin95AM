// Small, readable silhouettes based on the approved dojo arsenal sheet.
// All points are relative to the fighter's facing direction, so the same
// details work in the world and in the equipment menu.
export function drawWeapon(graphics, key, x, y, direction = 'right', attacking = false, scale = 1, handAnchors = null) {
    const facing = {
        right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1]
    }[direction] || [1, 0];
    const side = [-facing[1], facing[0]];
    const primaryHand = direction === 'left' ? -1 : 1;
    const paired = key === 'sai' || key === 'tonfa' || key === 'kamas';
    const attachedToFists = handAnchors !== null;
    let anchorX = x, anchorY = y;
    let activeFacing = facing, activeSide = side;
    const holdInHand = hand => {
        if (!attachedToFists) return;
        const grip = typeof handAnchors === 'number'
            ? { x: hand * handAnchors, y: 0 } : handAnchors[hand];
        anchorX = x + grip.x;
        anchorY = y + grip.y;
        // Paired weapons have separate trajectories, so the rear weapon does
        // not visually merge with the one thrust from the leading hand.
        activeFacing = paired && hand !== primaryHand ? {
            right: [0.65, -0.76], left: [-0.65, -0.76],
            up: [-0.45, -0.89], down: [-0.45, 0.89]
        }[direction] : facing;
        activeSide = [-activeFacing[1], activeFacing[0]];
    };
    const resetAnchor = () => {
        anchorX = x; anchorY = y;
        activeFacing = facing; activeSide = side;
    };
    const point = (forward, sideways) => ({
        x: anchorX + (activeFacing[0] * forward + activeSide[0] * sideways) * scale,
        y: anchorY + (activeFacing[1] * forward + activeSide[1] * sideways) * scale
    });
    const line = (coords, width, color, alpha = 1) => {
        graphics.lineStyle(Math.max(1, width * scale), color, alpha);
        graphics.beginPath();
        coords.forEach(([forward, sideways], index) => {
            const p = point(forward, sideways);
            if (index === 0) graphics.moveTo(p.x, p.y);
            else graphics.lineTo(p.x, p.y);
        });
        graphics.strokePath();
    };
    const shape = (coords, fill, outline = 0x27343d) => {
        const points = coords.map(([forward, sideways]) => point(forward, sideways));
        graphics.fillStyle(fill, 1);
        graphics.lineStyle(Math.max(1, scale), outline, 1);
        graphics.fillPoints(points, true);
        graphics.strokePoints(points, true);
    };
    const grip = (from, to, lateral, width = 4) => {
        line([[from, lateral], [to, lateral]], width + 2, 0x382a27);
        line([[from, lateral], [to, lateral]], width, 0x875537);
        for (let i = from + 2; i < to - 1; i += 3) {
            line([[i, lateral - width / 2], [i + 1, lateral + width / 2]], 1.5, 0xb83439);
        }
    };
    const arc = (coords, width = 2) => line(coords, width, 0xffd36c, 0.9);
    // The fighter occupies 32×48 world pixels. Except for the deliberately
    // long bō, a held weapon stays within roughly half that height.
    const push = attacking ? 4 : 0;

    switch (key) {
    case 'bo': {
        // Long wooden staff, warm grain, red bands and brass end caps.
        holdInHand(direction === 'left' ? -1 : 1);
        const lateral = attachedToFists ? 0 : 6;
        line([[-17, lateral], [31 + push, lateral]], 6, 0x493020);
        line([[-16, lateral], [30 + push, lateral]], 4, 0x9a6337);
        line([[-14, lateral - 1], [28 + push, lateral - 1]], 1, 0xc99454);
        for (const at of [-10, 22 + push]) {
            line([[at, lateral - 3], [at + 2, lateral + 3]], 2, 0xa82e35);
            line([[at + 2, lateral - 3], [at + 4, lateral + 3]], 1, 0xe67760);
        }
        for (const at of [-17, 31 + push]) {
            line([[at, lateral - 3], [at, lateral + 3]], 3, 0xd6a94c);
        }
        if (attacking) arc([[19, -9], [29, -7], [37, 0], [39, 10]], 3);
        break;
    }
    case 'sai': {
        for (const hand of [-1, 1]) {
            holdInHand(hand);
            const lateral = attachedToFists ? 0 : hand * 8;
            grip(1, 9, lateral, 3);
            line([[8, lateral], [21 + push, lateral]], 3, 0x53616d);
            line([[9, lateral - 1], [20 + push, lateral - 1]], 1, 0xe4eef3);
            shape([[20 + push, lateral - 2], [24 + push, lateral], [20 + push, lateral + 2]], 0xf4f8f7);
            for (const wing of [-1, 1]) {
                line([[9, lateral], [12, lateral + wing * 4], [16, lateral + wing * 4]], 2, 0xaab8c2);
                line([[14, lateral + wing * 4], [17, lateral + wing * 3]], 1, 0xf4f8f7);
            }
        }
        resetAnchor();
        if (attacking) arc([[26, -4], [31, 0], [26, 4]], 2);
        break;
    }
    case 'tonfa': {
        for (const hand of [-1, 1]) {
            holdInHand(hand);
            const lateral = attachedToFists ? 0 : hand * 8;
            line([[0, lateral], [20 + push, lateral]], 6, 0x3b2b24);
            line([[1, lateral], [19 + push, lateral]], 4, 0x805238);
            line([[2, lateral - 1], [18 + push, lateral - 1]], 1, 0xbd8250);
            // The perpendicular handles make the pair unmistakably tonfa.
            const outward = side[0] === -1 ? -hand : hand;
            line([[8, lateral], [8, lateral + outward * 7]], 4, 0x3b2b24);
            line([[8, lateral + outward * 2], [8, lateral + outward * 6]], 2, 0xa86b42);
            line([[4, lateral - 2], [6, lateral + 2]], 2, 0xa83237);
            line([[7, lateral - 2], [9, lateral + 2]], 1, 0xe36b58);
        }
        resetAnchor();
        if (attacking) arc([[20, -12], [28, -9], [31, 0], [28, 9], [20, 12]], 2);
        break;
    }
    case 'nunchaku': {
        holdInHand(direction === 'left' ? -1 : 1);
        const lateral = attachedToFists ? 0 : 3;
        grip(1, 12, lateral, 4);
        line([[11, lateral], [15, lateral + 1], [18, lateral + 3], [20, lateral + 4]], 2, 0x42515b);
        line([[12, lateral - 1], [16, lateral], [19, lateral + 2], [21, lateral + 3]], 1, 0xdce6ea);
        const end = attacking ? [[20, lateral + 4], [30, lateral - 4]]
            : [[20, lateral + 4], [29, lateral + 10]];
        line(end, 6, 0x402d25);
        line(end, 4, 0x9c653b);
        line([[end[1][0] - 3, end[1][1] - (attacking ? -2 : 2)], end[1]], 2, 0xa82e35);
        line([[2, lateral - 3], [4, lateral + 3]], 2, 0xc49a55);
        if (attacking) arc([[17, -11], [26, -11], [34, -4], [36, 5], [31, 13]], 2);
        break;
    }
    case 'kamas': {
        for (const hand of [-1, 1]) {
            holdInHand(hand);
            const lateral = attachedToFists ? 0 : hand * 10;
            const outward = side[0] === -1 ? -hand : hand;
            grip(1, 14 + push, lateral, 3);
            line([[13 + push, lateral - 2], [13 + push, lateral + 2]], 2, 0xd0ad66);
            // Broad steel crescent with an inward cutting edge, not a V-shaped line.
            shape([
                [13 + push, lateral], [18 + push, lateral + outward * 2],
                [21 + push, lateral + outward * 7], [19 + push, lateral + outward * 12],
                [15 + push, lateral + outward * 14], [17 + push, lateral + outward * 9],
                [17 + push, lateral + outward * 4]
            ], 0xc4d1d8, 0x596d76);
            line([[16 + push, lateral + outward * 3], [19 + push, lateral + outward * 8],
                [17 + push, lateral + outward * 11]], 1, 0xf6fbf7);
        }
        resetAnchor();
        if (attacking) {
            arc([[16, -16], [24, -10], [30, -1]], 2);
            arc([[16, 16], [24, 10], [30, 1]], 2);
        }
        break;
    }
    default:
        break;
    }
}
