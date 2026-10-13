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
const WALL_BASE = [224, 213, 188, 255];
const WALL_WOOD = [91, 48, 29, 255];
const WALL_WOOD_LIGHT = [151, 88, 48, 255];
const WOOD_FLOOR = [132, 72, 43, 255];
const WOOD_FLOOR_DARK = [77, 40, 27, 255];
const WOOD_FLOOR_LIGHT = [178, 107, 62, 255];

const TATAMI_BLACK = [36, 54, 51, 255];
const TATAMI_BLACK_SHADOW = [20, 34, 34, 255];
const TATAMI_RED = [119, 151, 104, 255];
const TATAMI_RED_SHADOW = [80, 112, 76, 255];
const TATAMI_RED_LIGHT = [157, 181, 124, 255];

const SCROLL_BG = [245, 240, 215, 255];
const SCROLL_BORDER = [80, 40, 20, 255];
const INK = [25, 25, 25, 255];

const METAL = [180, 185, 190, 255];
const GOLD = [215, 165, 40, 255];

function getDojoPixel(x, y) {
    // A recessed dark timber ceiling gives the room a clear sense of height.
    if (y < 14) {
        if (y === 0 || y === 13 || x % 80 < 5) return [55, 30, 23, 255];
        return [78, 42, 29, 255];
    }
    // --- WOODEN PILLARS (Left: 15 to 35, Right: 605 to 625) ---
    if ((x >= 15 && x <= 35) || (x >= 605 && x <= 625)) {
        const px = x >= 15 && x <= 35 ? x - 15 : x - 605; // 0 to 20
        if (px === 0 || px === 20) return [60, 30, 15, 255]; // outline
        if (px <= 5) return [150, 85, 45, 255]; // highlight
        if (px >= 14) return [90, 45, 20, 255]; // shadow
        return [120, 60, 30, 255]; // base
    }

    // --- BACK WALL (y: 0 to 110) ---
    if (y <= 110) {
        // Baseboard (y: 100 to 110)
        if (y >= 100) {
            if (y === 100 || y === 110) return [60, 30, 15, 255];
            return WALL_WOOD;
        }

        // Warm paper lanterns, set into the wall rather than floating on it.
        for (const lanternX of [52, 570]) {
            if (x >= lanternX && x <= lanternX + 22 && y >= 25 && y <= 69) {
                const lx = x - lanternX, ly = y - 25;
                if (lx === 0 || lx === 22 || ly === 0 || ly === 43) return [72, 38, 24, 255];
                if (lx === 2 || lx === 20 || ly === 3 || ly === 40) return [191, 119, 51, 255];
                if (ly % 10 === 0) return [229, 174, 86, 255];
                return [248, 211, 129, 255];
            }
        }

        // Shoji windows add depth and cool exterior contrast.
        for (const windowX of [145, 430]) {
            if (x >= windowX && x <= windowX + 94 && y >= 24 && y <= 88) {
                const wx = x - windowX, wy = y - 24;
                if (wx < 4 || wx > 90 || wy < 4 || wy > 60 || wx % 30 < 3 || wy % 20 < 3) return WALL_WOOD;
                if ((wx + wy) % 17 === 0) return [186, 208, 201, 255];
                return [201, 219, 210, 255];
            }
        }

        // Calligraphy Scroll (Shodo), framed as the visual anchor of the room.
        if (x >= 290 && x <= 350 && y >= 15 && y <= 90) {
            // Top/Bottom wooden rollers
            if (y <= 18 || y >= 87) return SCROLL_BORDER;
            // Scroll border
            if (x === 290 || x === 350 || x === 291 || x === 349) return SCROLL_BORDER;
            if (x >= 294 && x <= 346 && y >= 21 && y <= 84 && (x + y) % 23 === 0) return [231, 215, 174, 255];
            // Calligraphy Ink (Kanji-like shapes)
            if (x >= 315 && x <= 325) {
                // Draw some abstract kanji strokes
                if ((y >= 25 && y <= 30) || (y >= 35 && y <= 45) || (y >= 50 && y <= 55) || (y >= 65 && y <= 80)) {
                    return INK;
                }
            }
            if (x >= 308 && x <= 332) {
                if ((y === 28 && x >= 310 && x <= 330) || (y === 40 && x >= 312 && x <= 328) || (y === 70 && x >= 310 && x <= 325)) {
                    return INK;
                }
            }
            return SCROLL_BG;
        }

        // Katana Racks (Left: 75 to 115, Right: 525 to 565, y: 35 to 75)
        if (((x >= 75 && x <= 115) || (x >= 525 && x <= 565)) && y >= 35 && y <= 75) {
            const rx = x >= 75 && x <= 115 ? x - 75 : x - 525; // 0 to 40
            const ry = y - 35; // 0 to 40

            // Rack stands (vertical supports at rx = 8 and rx = 32)
            if ((rx >= 8 && rx <= 11) || (rx >= 29 && rx <= 32)) {
                if (ry >= 10 && ry <= 35) return WALL_WOOD;
            }
            // Katana 1 (y: 45)
            if (ry >= 15 && ry <= 17 && rx >= 4 && rx <= 36) {
                if (rx <= 10) return GOLD; // hilt
                if (rx >= 11 && rx <= 34) return METAL; // blade
                return WALL_WOOD_LIGHT; // scabbard
            }
            // Katana 2 (y: 55)
            if (ry >= 25 && ry <= 27 && rx >= 4 && rx <= 36) {
                if (rx <= 10) return GOLD;
                if (rx >= 11 && rx <= 34) return METAL;
                return WALL_WOOD_LIGHT;
            }
        }

        // Lower rail, plaster texture and vertical timber panels.
        if (y >= 92 && y <= 99) return y === 92 || y === 99 ? [62, 34, 23, 255] : WALL_WOOD_LIGHT;
        if ((x * 3 + y * 5) % 53 === 0) return [215, 202, 174, 255];
        if (x % 80 >= 0 && x % 80 <= 4) {
            return WALL_WOOD;
        }

        return WALL_BASE;
    }

    // --- TATAMI MAT (x: 120 to 520, y: 140 to 500) ---
    if (x >= 120 && x <= 520 && y >= 140 && y <= 500) {
        // Outer Black Border (24 pixels wide)
        if (x <= 144 || x >= 496 || y <= 164 || y >= 476) {
            // Border shading
            if (x === 120 || y === 140) return [10, 10, 15, 255]; // dark outline
            if (x === 144 || x === 496 || y === 164 || y === 476) return TATAMI_BLACK_SHADOW;
            if (x % 16 === 0 || y % 16 === 0) return TATAMI_BLACK_SHADOW; // panel lines
            return TATAMI_BLACK;
        }

        // Woven tatami panels, with a darker cloth seam every panel.
        // Panel lines (grid of 32x32 panels)
        const rx = x - 144;
        const ry = y - 164;
        if (rx % 64 === 0 || ry % 64 === 0) {
            return TATAMI_RED_SHADOW;
        }
        if (rx % 64 === 1 || ry % 64 === 1) {
            return TATAMI_RED_LIGHT;
        }

        // Base red with subtle texture
        if ((x + y) % 9 === 0 || (x - y) % 19 === 0) return TATAMI_RED_LIGHT;
        if ((x - y) % 13 === 0) return TATAMI_RED_SHADOW;
        return TATAMI_RED;
    }

    // --- WOODEN FLOOR (Around the Tatami) ---
    // Horizontal planks, with a restrained grain to keep the play area readable.
    if (y % 24 === 0) {
        return WOOD_FLOOR_DARK;
    }
    // Wood grain texture
    if ((x + y) % 32 === 0) return WOOD_FLOOR_LIGHT;
    if ((x - y) % 48 === 0) return WOOD_FLOOR_DARK;
    return WOOD_FLOOR;
}

const dojoPng = createPng(640, 640, getDojoPixel);

fs.mkdirSync('frontend/public/assets/tiles', { recursive: true });
fs.writeFileSync('frontend/public/assets/tiles/dojo.png', dojoPng);
console.log('Successfully generated 16-bit Dojo background!');
