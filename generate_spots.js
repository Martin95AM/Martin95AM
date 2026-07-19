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
const METAL_DARK = [100, 105, 110, 255];
const TRANSPARENT = [0, 0, 0, 0];

// 1. Generate Karate Do Weapon Rack (48x48)
const weaponRackPng = createPng(48, 48, (x, y) => {
    // Wooden stand base (y: 40 to 45, x: 4 to 44)
    if (y >= 40 && y <= 43 && x >= 4 && x <= 44) {
        if (y === 40 || x === 4 || x === 44) return WOOD_DARK;
        return WOOD_LIGHT;
    }
    // Vertical supports (x: 8 to 11, and x: 36 to 39, y: 10 to 40)
    if (((x >= 8 && x <= 11) || (x >= 36 && x <= 39)) && y >= 10 && y <= 40) {
        if (x === 8 || x === 39 || y === 10) return WOOD_DARK;
        return WOOD_LIGHT;
    }
    // Horizontal racks (y: 18 to 20, and y: 30 to 32, x: 6 to 42)
    if (((y >= 18 && y <= 20) || (y >= 30 && y <= 32)) && x >= 6 && x <= 42) {
        if (y === 18 || y === 30 || x === 6 || x === 42) return WOOD_DARK;
        return WOOD_LIGHT;
    }

    // --- WEAPONS ---
    // Bo Staff (diagonal wooden staff, y = x - 4, from x = 10 to 38)
    const boY = x + 4;
    if (Math.abs(y - boY) <= 1 && x >= 8 && x <= 36) {
        return [180, 110, 50, 255]; // Bo staff color
    }

    // Sai 1 (left side, y: 24 to 28, x: 14 to 18)
    if (x >= 14 && x <= 18 && y >= 23 && y <= 29) {
        if (x === 16) return METAL_SILVER; // main blade
        if (y === 27 && (x === 15 || x === 17)) return METAL_SILVER; // prongs
        if (y === 29 && x === 16) return GOLD = [215, 165, 40, 255]; // hilt
    }
    // Sai 2 (right side, y: 24 to 28, x: 30 to 34)
    if (x >= 30 && x <= 34 && y >= 23 && y <= 29) {
        if (x === 32) return METAL_SILVER;
        if (y === 27 && (x === 31 || x === 33)) return METAL_SILVER;
        if (y === 29 && x === 32) return [215, 165, 40, 255];
    }

    // Tonfas (y: 14 to 16, x: 12 to 22, and x: 26 to 36)
    if (y >= 14 && y <= 16) {
        if ((x >= 12 && x <= 22) || (x >= 26 && x <= 36)) {
            if (y === 15) return WOOD_LIGHT;
            return WOOD_DARK;
        }
    }
    // Tonfa handles (vertical, y: 16 to 20, x: 15 and x: 29)
    if (y >= 16 && y <= 20 && (x === 15 || x === 29)) {
        return WOOD_DARK;
    }

    return TRANSPARENT;
});

// 2. Generate Torii Gate Spritesheet (256x64 - 4 frames of 64x64)
const toriiPng = createPng(256, 64, (x, y) => {
    const frame = Math.floor(x / 64);
    const lx = x % 64;
    const ly = y;

    // --- TORII GATE STRUCTURE (Same for all frames) ---
    // Left Pillar (lx: 10 to 16, ly: 12 to 63)
    if (lx >= 10 && lx <= 16 && ly >= 12 && ly <= 63) {
        if (lx === 10) return RED_TORII_SHADOW;
        if (lx === 11) return RED_TORII_LIGHT;
        if (lx === 16) return RED_TORII_SHADOW;
        return RED_TORII;
    }
    // Right Pillar (lx: 47 to 53, ly: 12 to 63)
    if (lx >= 47 && lx <= 53 && ly >= 12 && ly <= 63) {
        if (lx === 47) return RED_TORII_SHADOW;
        if (lx === 48) return RED_TORII_LIGHT;
        if (lx === 53) return RED_TORII_SHADOW;
        return RED_TORII;
    }
    // Top Curved Beam (ly: 2 to 10, lx: 4 to 59)
    // Let's make a curved top beam
    const curve = Math.floor(Math.pow(lx - 31.5, 2) / 120); // curve up at the ends
    const beamY = 6 + curve;
    if (ly >= beamY && ly <= beamY + 4 && lx >= 4 && lx <= 59) {
        if (ly === beamY) return BLACK_BEAM_LIGHT;
        if (ly === beamY + 4) return BLACK_BEAM;
        return BLACK_BEAM;
    }
    // Middle Horizontal Beam (ly: 16 to 20, lx: 8 to 55)
    if (ly >= 16 && ly <= 20 && lx >= 8 && lx <= 55) {
        if (ly === 16) return RED_TORII_LIGHT;
        if (ly === 20) return RED_TORII_SHADOW;
        return RED_TORII;
    }

    // --- SLIDING DOOR INSIDE THE GATE (Changes per frame) ---
    // Door opening area: lx from 17 to 46, ly from 21 to 63
    if (lx >= 17 && lx <= 46 && ly >= 21 && ly <= 63) {
        const doorWidth = 15; // each door is 15 pixels wide (left door: 17 to 31, right door: 32 to 46)
        let slideOffset = 0;
        if (frame === 1) slideOffset = 4;
        if (frame === 2) slideOffset = 9;
        if (frame === 3) slideOffset = 15; // fully open

        // Left Door (originally 17 to 31, slides left by slideOffset)
        const leftDoorStart = 17 - slideOffset;
        const leftDoorEnd = 31 - slideOffset;
        if (lx >= leftDoorStart && lx <= leftDoorEnd) {
            // Draw Shoji grid
            const dlx = lx - leftDoorStart;
            const dly = ly - 21;
            if (dlx === 0 || dlx === 14 || dly === 0 || dly === 41 || dlx % 4 === 0 || dly % 8 === 0) {
                return SHOJI_WOOD;
            }
            if ((dlx + dly) % 4 === 0) return SHOJI_PAPER_SHADOW;
            return SHOJI_PAPER;
        }

        // Right Door (originally 32 to 46, slides right by slideOffset)
        const rightDoorStart = 32 + slideOffset;
        const rightDoorEnd = 46 + slideOffset;
        if (lx >= rightDoorStart && lx <= rightDoorEnd) {
            // Draw Shoji grid
            const dlx = lx - rightDoorStart;
            const dly = ly - 21;
            if (dlx === 0 || dlx === 14 || dly === 0 || dly === 41 || dlx % 4 === 0 || dly % 8 === 0) {
                return SHOJI_WOOD;
            }
            if ((dlx + dly) % 4 === 0) return SHOJI_PAPER_SHADOW;
            return SHOJI_PAPER;
        }

        // If the doors have slid open, show the dark exit path behind them!
        return [15, 15, 20, 255]; // dark interior
    }

    return TRANSPARENT;
});

// Write files
fs.mkdirSync('frontend/public/assets/tiles', { recursive: true });
fs.writeFileSync('frontend/public/assets/tiles/weapon_rack.png', weaponRackPng);
fs.writeFileSync('frontend/public/assets/tiles/torii.png', toriiPng);
console.log('Successfully generated 16-bit spots assets!');
