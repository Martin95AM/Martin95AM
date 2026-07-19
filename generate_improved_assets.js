const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) {
            c = 0xedb88320 ^ (c >>> 1);
        } else {
            c = c >>> 1;
        }
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
}

function createPng(width, height, pixelFunc) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type (RGBA)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdrChunk = createChunk('IHDR', ihdrData);

    const rowSize = 1 + width * 4;
    const imgData = Buffer.alloc(height * rowSize);
    for (let y = 0; y < height; y++) {
        imgData[y * rowSize] = 0; // filter type 0
        for (let x = 0; x < width; x++) {
            const idx = y * rowSize + 1 + x * 4;
            const color = pixelFunc(x, y);
            imgData[idx] = color[0];     // R
            imgData[idx + 1] = color[1]; // G
            imgData[idx + 2] = color[2]; // B
            imgData[idx + 3] = color[3]; // A
        }
    }

    const compressed = zlib.deflateSync(imgData);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Colors
const RED_TORII = [200, 30, 30, 255];
const RED_TORII_SHADOW = [120, 15, 15, 255];
const RED_TORII_LIGHT = [240, 80, 80, 255];
const BLACK_BEAM = [30, 30, 35, 255];
const BLACK_BEAM_LIGHT = [70, 70, 75, 255];

const SHOJI_WOOD = [130, 70, 30, 255];
const SHOJI_PAPER = [245, 240, 220, 255];
const SHOJI_PAPER_SHADOW = [210, 205, 185, 255];

const WOOD_DARK = [80, 40, 20, 255];
const WOOD_LIGHT = [140, 80, 40, 255];
const METAL_SILVER = [180, 185, 190, 255];
const GOLD = [215, 165, 40, 255];
const TRANSPARENT = [0, 0, 0, 0];

// 1. Generate Larger Torii Gate (384x96 - 4 frames of 96x96)
const toriiPng = createPng(384, 96, (x, y) => {
    const frame = Math.floor(x / 96);
    const lx = x % 96;
    const ly = y;

    // Left Pillar (lx: 16 to 24, ly: 16 to 95)
    if (lx >= 16 && lx <= 24 && ly >= 16 && ly <= 95) {
        if (lx === 16) return RED_TORII_SHADOW;
        if (lx === 17) return RED_TORII_LIGHT;
        if (lx === 24) return RED_TORII_SHADOW;
        return RED_TORII;
    }
    // Right Pillar (lx: 71 to 79, ly: 16 to 95)
    if (lx >= 71 && lx <= 79 && ly >= 16 && ly <= 95) {
        if (lx === 71) return RED_TORII_SHADOW;
        if (lx === 72) return RED_TORII_LIGHT;
        if (lx === 79) return RED_TORII_SHADOW;
        return RED_TORII;
    }
    // Top Curved Beam (ly: 4 to 14, lx: 6 to 89)
    const curve = Math.floor(Math.pow(lx - 47.5, 2) / 240);
    const beamY = 8 + curve;
    if (ly >= beamY && ly <= beamY + 6 && lx >= 6 && lx <= 89) {
        if (ly === beamY) return BLACK_BEAM_LIGHT;
        if (ly === beamY + 6) return BLACK_BEAM;
        return BLACK_BEAM;
    }
    // Middle Horizontal Beam (ly: 24 to 30, lx: 12 to 83)
    if (ly >= 24 && ly <= 30 && lx >= 12 && lx <= 83) {
        if (ly === 24) return RED_TORII_LIGHT;
        if (ly === 30) return RED_TORII_SHADOW;
        return RED_TORII;
    }

    // Sliding Doors (lx: 25 to 70, ly: 31 to 95)
    if (lx >= 25 && lx <= 70 && ly >= 31 && ly <= 95) {
        const doorWidth = 23; // each door is 23 pixels wide
        let slideOffset = 0;
        if (frame === 1) slideOffset = 7;
        if (frame === 2) slideOffset = 15;
        if (frame === 3) slideOffset = 23; // fully open

        // Left Door (slides left)
        const leftDoorStart = 25 - slideOffset;
        const leftDoorEnd = 47 - slideOffset;
        if (lx >= leftDoorStart && lx <= leftDoorEnd) {
            const dlx = lx - leftDoorStart;
            const dly = ly - 31;
            if (dlx === 0 || dlx === 22 || dly === 0 || dly === 64 || dlx % 5 === 0 || dly % 10 === 0) {
                return SHOJI_WOOD;
            }
            if ((dlx + dly) % 4 === 0) return SHOJI_PAPER_SHADOW;
            return SHOJI_PAPER;
        }

        // Right Door (slides right)
        const rightDoorStart = 48 + slideOffset;
        const rightDoorEnd = 70 + slideOffset;
        if (lx >= rightDoorStart && lx <= rightDoorEnd) {
            const dlx = lx - rightDoorStart;
            const dly = ly - 31;
            if (dlx === 0 || dlx === 22 || dly === 0 || dly === 64 || dlx % 5 === 0 || dly % 10 === 0) {
                return SHOJI_WOOD;
            }
            if ((dlx + dly) % 4 === 0) return SHOJI_PAPER_SHADOW;
            return SHOJI_PAPER;
        }

        return [15, 15, 20, 255]; // dark interior
    }

    return TRANSPARENT;
});

// 2. Generate More Detailed Weapon Rack (64x64)
const weaponRackPng = createPng(64, 64, (x, y) => {
    // Wooden stand base (y: 52 to 58, x: 6 to 58)
    if (y >= 52 && y <= 56 && x >= 6 && x <= 58) {
        if (y === 52 || x === 6 || x === 58) return WOOD_DARK;
        return WOOD_LIGHT;
    }
    // Vertical supports (x: 12 to 16, and x: 48 to 52, y: 12 to 52)
    if (((x >= 12 && x <= 16) || (x >= 48 && x <= 52)) && y >= 12 && y <= 52) {
        if (x === 12 || x === 52 || y === 12) return WOOD_DARK;
        return WOOD_LIGHT;
    }
    // Horizontal racks (y: 22 to 25, and y: 38 to 41, x: 8 to 56)
    if (((y >= 22 && y <= 25) || (y >= 38 && y <= 41)) && x >= 8 && x <= 56) {
        if (y === 22 || y === 38 || x === 8 || x === 56) return WOOD_DARK;
        return WOOD_LIGHT;
    }

    // --- WEAPONS (1/4 of character size, approx 12-16 pixels) ---
    // Bo Staff (diagonal, length 16 pixels, from x = 14 to 30, y = x + 10)
    const boY = x + 10;
    if (Math.abs(y - boY) <= 1 && x >= 12 && x <= 28) {
        return [180, 110, 50, 255];
    }

    // Sai 1 (left side, length 12 pixels, y: 28 to 39, x: 20 to 24)
    if (x >= 20 && x <= 24 && y >= 28 && y <= 39) {
        if (x === 22) return METAL_SILVER; // blade
        if (y === 35 && (x === 21 || x === 23)) return METAL_SILVER; // prongs
        if (y === 38 && x === 22) return GOLD; // hilt
    }
    // Sai 2 (right side, length 12 pixels, y: 28 to 39, x: 40 to 44)
    if (x >= 40 && x <= 44 && y >= 28 && y <= 39) {
        if (x === 42) return METAL_SILVER;
        if (y === 35 && (x === 41 || x === 43)) return METAL_SILVER;
        if (y === 38 && x === 42) return GOLD;
    }

    // Tonfas (length 12 pixels, y: 16 to 19, x: 18 to 29, and x: 35 to 46)
    if (y >= 16 && y <= 19) {
        if ((x >= 18 && x <= 29) || (x >= 35 && x <= 46)) {
            if (y === 17) return WOOD_LIGHT;
            return WOOD_DARK;
        }
    }
    // Tonfa handles (vertical, y: 19 to 24, x: 22 and x: 39)
    if (y >= 19 && y <= 24 && (x === 22 || x === 39)) {
        return WOOD_DARK;
    }

    return TRANSPARENT;
});

// 3. Generate 5 Resting Characters (32x48 each)
const SKIN_BASE = [255, 219, 172, 255];
const SKIN_SHADOW = [224, 172, 135, 255];
const SKIN_OUTLINE = [141, 85, 36, 255];
const HAIR_BASE = [90, 50, 30, 255];
const HAIR_OUTLINE = [45, 20, 10, 255];
const SUIT_BASE = [245, 245, 250, 255];
const SUIT_SHADOW = [185, 195, 210, 255];
const SUIT_OUTLINE = [110, 125, 145, 255];

const studentBelts = {
    yellow: [235, 210, 40, 255],
    orange: [235, 120, 30, 255],
    green: [40, 160, 60, 255],
    blue: [30, 100, 210, 255],
    brown: [110, 65, 30, 255]
};

function getRestingPixel(lx, ly, beltColor) {
    // Head & Hair (y: 4 to 20, x: 8 to 23)
    if (ly >= 4 && ly <= 20 && lx >= 8 && lx <= 23) {
        if (ly <= 9) {
            if (lx === 8 || lx === 23 || ly === 4) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        if ((lx === 8 || lx === 9 || lx === 22 || lx === 23) && ly <= 14) {
            if (lx === 8 || lx === 23) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        if (lx >= 9 && lx <= 22 && ly <= 19) {
            if (lx === 9 || lx === 22 || ly === 19) return SKIN_OUTLINE;
            // Eyes (closed/resting eyes: horizontal lines)
            if (ly === 13 && (lx === 12 || lx === 13 || lx === 18 || lx === 19)) {
                return [45, 20, 10, 255];
            }
            if (ly >= 17 || lx >= 19) return SKIN_SHADOW;
            return SKIN_BASE;
        }
    }

    // V-Neck (y: 20 to 24)
    if (ly >= 20 && ly <= 24 && lx >= 14 && lx <= 17) {
        if (ly === 20) return SKIN_BASE;
        if (ly === 21 && lx >= 15 && lx <= 16) return SKIN_BASE;
        if (ly === 22 && lx === 15) return SKIN_SHADOW;
    }

    // Belt (y: 28 to 30)
    if (ly >= 28 && ly <= 29 && lx >= 8 && lx <= 23) {
        return beltColor;
    }
    // Belt knot
    if (ly === 30 && lx >= 14 && lx <= 16) {
        return beltColor;
    }

    // Torso / Suit (y: 20 to 35, x: 8 to 23)
    // Hands behind back: arms go straight down and back, no hands visible on the sides!
    if (ly >= 20 && ly <= 35 && lx >= 8 && lx <= 23) {
        if (lx === 8 || lx === 23 || ly === 20 || ly === 35) return SUIT_OUTLINE;
        if (lx >= 19 || ly >= 32) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    // Legs / Pants (y: 36 to 43) - Standing slightly apart
    if (ly >= 36 && ly <= 43) {
        // Left Leg (x: 7 to 12)
        if (lx >= 7 && lx <= 12) {
            if (lx === 7 || lx === 12 || ly === 43) return SUIT_OUTLINE;
            return SUIT_BASE;
        }
        // Right Leg (x: 19 to 24)
        if (lx >= 19 && lx <= 24) {
            if (lx === 19 || lx === 24 || ly === 43) return SUIT_OUTLINE;
            return SUIT_SHADOW;
        }
    }

    // Barefoot Feet (y: 44 to 47)
    if (ly >= 44 && ly <= 47) {
        // Left Foot
        if (lx >= 7 && lx <= 11) {
            if (lx === 7 || lx === 11 || ly === 47) return SKIN_OUTLINE;
            return SKIN_BASE;
        }
        // Right Foot
        if (lx >= 20 && lx <= 24) {
            if (lx === 20 || lx === 24 || ly === 47) return SKIN_OUTLINE;
            return SKIN_SHADOW;
        }
    }

    return TRANSPARENT;
}

// Generate 5 student PNGs
Object.keys(studentBelts).forEach(colorName => {
    const pngBuf = createPng(32, 48, (x, y) => {
        return getRestingPixel(x, y, studentBelts[colorName]);
    });
    fs.writeFileSync(`frontend/public/assets/player/student_${colorName}.png`, pngBuf);
    console.log(`Created student_${colorName}.png`);
});

fs.writeFileSync('frontend/public/assets/tiles/torii.png', toriiPng);
fs.writeFileSync('frontend/public/assets/tiles/weapon_rack.png', weaponRackPng);
console.log('Successfully generated all improved assets!');
