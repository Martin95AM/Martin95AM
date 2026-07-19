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
const WALL_BASE = [235, 225, 200, 255];
const WALL_WOOD = [110, 55, 25, 255];
const WALL_WOOD_LIGHT = [140, 75, 35, 255];
const WOOD_FLOOR = [150, 80, 40, 255];
const WOOD_FLOOR_DARK = [110, 55, 25, 255];
const WOOD_FLOOR_LIGHT = [175, 100, 50, 255];

const TATAMI_BLACK = [35, 35, 40, 255];
const TATAMI_BLACK_SHADOW = [20, 20, 25, 255];
const TATAMI_RED = [195, 35, 35, 255];
const TATAMI_RED_SHADOW = [150, 25, 25, 255];
const TATAMI_RED_LIGHT = [220, 60, 60, 255];

const SCROLL_BG = [245, 240, 215, 255];
const SCROLL_BORDER = [80, 40, 20, 255];
const INK = [25, 25, 25, 255];

const METAL = [180, 185, 190, 255];
const GOLD = [215, 165, 40, 255];

function getDojoPixel(x, y) {
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

        // Calligraphy Scroll (Shodo) (x: 290 to 350, y: 15 to 90)
        if (x >= 290 && x <= 350 && y >= 15 && y <= 90) {
            // Top/Bottom wooden rollers
            if (y <= 18 || y >= 87) return SCROLL_BORDER;
            // Scroll border
            if (x === 290 || x === 350 || x === 291 || x === 349) return SCROLL_BORDER;
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

        // Vertical wooden wall panels (every 80 pixels)
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

        // Inner Red Area
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
        if ((x + y) % 8 === 0) return TATAMI_RED_LIGHT;
        if ((x - y) % 12 === 0) return TATAMI_RED_SHADOW;
        return TATAMI_RED;
    }

    // --- WOODEN FLOOR (Around the Tatami) ---
    // Horizontal planks (every 24 pixels)
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
