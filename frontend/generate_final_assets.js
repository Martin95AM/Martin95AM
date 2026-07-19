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
const BLACK_RACK = [35, 35, 40, 255];
const BLACK_RACK_LIGHT = [75, 75, 80, 255];
const BLACK_RACK_DARK = [15, 15, 20, 255];

const WOOD_LIGHT = [140, 80, 40, 255];
const METAL_SILVER = [180, 185, 190, 255];
const GOLD = [215, 165, 40, 255];
const TRANSPARENT = [0, 0, 0, 0];

// 1. Generate Black Weapon Rack (64x64)
const weaponRackPng = createPng(64, 64, (x, y) => {
    // Black stand base (y: 52 to 58, x: 6 to 58)
    if (y >= 52 && y <= 56 && x >= 6 && x <= 58) {
        if (y === 52 || x === 6 || x === 58) return BLACK_RACK_DARK;
        return BLACK_RACK;
    }
    // Vertical supports (x: 12 to 16, and x: 48 to 52, y: 12 to 52)
    if (((x >= 12 && x <= 16) || (x >= 48 && x <= 52)) && y >= 12 && y <= 52) {
        if (x === 12 || x === 52 || y === 12) return BLACK_RACK_DARK;
        return BLACK_RACK;
    }
    // Horizontal racks (y: 22 to 25, and y: 38 to 41, x: 8 to 56)
    if (((y >= 22 && y <= 25) || (y >= 38 && y <= 41)) && x >= 8 && x <= 56) {
        if (y === 22 || y === 38 || x === 8 || x === 56) return BLACK_RACK_DARK;
        return BLACK_RACK_LIGHT;
    }

    // --- WEAPONS ---
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
            return BLACK_RACK_DARK;
        }
    }
    // Tonfa handles (vertical, y: 19 to 24, x: 22 and x: 39)
    if (y >= 19 && y <= 24 && (x === 22 || x === 39)) {
        return BLACK_RACK_DARK;
    }

    return TRANSPARENT;
});

// 2. Generate 5 Resting Characters Facing Left (32x48 each)
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

function getLeftFacingRestingPixel(lx, ly, beltColor) {
    // --- HEAD & HAIR (Facing Left) ---
    if (ly >= 4 && ly <= 20 && lx >= 8 && lx <= 23) {
        // Hair (covers top and back/right side)
        if (ly <= 9) {
            if (lx === 8 || lx === 23 || ly === 4) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        // Back hair (right side)
        if (lx >= 16 && ly <= 16) {
            if (lx === 23) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        // Face Skin Area (left side)
        if (lx >= 9 && lx <= 15 && ly <= 19) {
            if (lx === 9 || ly === 19) return SKIN_OUTLINE;
            // Closed eye facing left
            if (ly === 13 && (lx === 11 || lx === 12)) {
                return [45, 20, 10, 255];
            }
            if (ly >= 17) return SKIN_SHADOW;
            return SKIN_BASE;
        }
        // Default skin for the rest of the head
        if (lx >= 9 && lx <= 22 && ly <= 19) {
            if (lx === 22 || ly === 19) return SKIN_OUTLINE;
            return SKIN_SHADOW;
        }
    }

    // --- COLLAR / V-NECK (Facing Left) ---
    if (ly >= 20 && ly <= 24 && lx >= 11 && lx <= 14) {
        if (ly === 20) return SKIN_BASE;
        if (ly === 21 && lx === 12) return SKIN_SHADOW;
    }

    // --- BELT & KNOT (Facing Left) ---
    if (ly >= 28 && ly <= 29 && lx >= 9 && lx <= 21) {
        return beltColor;
    }
    // Belt knot and ends hanging down on the left side (front)
    if (ly >= 30 && ly <= 34 && lx === 10) {
        return beltColor;
    }

    // --- TORSO / SUIT (Facing Left) ---
    // Arms behind back: sleeve goes down and back (towards the right)
    if (ly >= 20 && ly <= 35 && lx >= 9 && lx <= 22) {
        if (lx === 9 || lx === 22 || ly === 20 || ly === 35) return SUIT_OUTLINE;
        // Sleeve fold on the right
        if (lx >= 17 && ly >= 22 && ly <= 28) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    // --- LEGS / PANTS (Facing Left) ---
    if (ly >= 36 && ly <= 43) {
        // Left Leg (closer, x: 8 to 13)
        if (lx >= 8 && lx <= 13) {
            if (lx === 8 || lx === 13 || ly === 43) return SUIT_OUTLINE;
            return SUIT_BASE;
        }
        // Right Leg (further, x: 15 to 20, shaded)
        if (lx >= 15 && lx <= 20) {
            if (lx === 15 || lx === 20 || ly === 43) return SUIT_OUTLINE;
            return SUIT_SHADOW;
        }
    }

    // --- BAREFOOT FEET (Facing Left) ---
    if (ly >= 44 && ly <= 47) {
        // Left Foot (facing left, x: 6 to 12)
        if (lx >= 6 && lx <= 12) {
            if (lx === 6 || ly === 47) return SKIN_OUTLINE;
            return SKIN_BASE;
        }
        // Right Foot (facing left, x: 13 to 19, shaded)
        if (lx >= 13 && lx <= 19) {
            if (lx === 13 || ly === 47) return SKIN_OUTLINE;
            return SKIN_SHADOW;
        }
    }

    return TRANSPARENT;
}

// Generate 5 student PNGs facing left
Object.keys(studentBelts).forEach(colorName => {
    const pngBuf = createPng(32, 48, (x, y) => {
        return getLeftFacingRestingPixel(x, y, studentBelts[colorName]);
    });
    fs.writeFileSync(`frontend/public/assets/player/student_${colorName}.png`, pngBuf);
    console.log(`Created left-facing student_${colorName}.png`);
});

fs.writeFileSync('frontend/public/assets/tiles/weapon_rack.png', weaponRackPng);
console.log('Successfully generated all final assets!');
