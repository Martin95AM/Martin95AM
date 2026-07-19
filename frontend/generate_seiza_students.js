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
const SKIN_BASE = [255, 219, 172, 255];
const SKIN_SHADOW = [224, 172, 135, 255];
const SKIN_OUTLINE = [141, 85, 36, 255];
const HAIR_BASE = [90, 50, 30, 255];
const HAIR_OUTLINE = [45, 20, 10, 255];
const SUIT_BASE = [245, 245, 250, 255];
const SUIT_SHADOW = [185, 195, 210, 255];
const SUIT_OUTLINE = [110, 125, 145, 255];
const TRANSPARENT = [0, 0, 0, 0];

const studentBelts = {
    yellow: [235, 210, 40, 255],
    orange: [235, 120, 30, 255],
    green: [40, 160, 60, 255],
    blue: [30, 100, 210, 255],
    brown: [110, 65, 30, 255]
};

function getSeizaPixel(lx, ly, isBreathing, beltColor) {
    // In Seiza, the character is sitting down, so the head and body are shifted down.
    // If isBreathing is true (Frame 1), we shift the head and torso UP by 1 pixel.
    const shift = isBreathing ? 1 : 0;

    // --- HEAD & HAIR (Facing Left, shifted down) ---
    const headYStart = 14 - shift;
    const headYEnd = 28 - shift;
    if (ly >= headYStart && ly <= headYEnd && lx >= 8 && lx <= 23) {
        // Hair
        if (ly <= headYStart + 5) {
            if (lx === 8 || lx === 23 || ly === headYStart) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        // Back hair (right side)
        if (lx >= 16 && ly <= headYStart + 11) {
            if (lx === 23) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        // Face Skin Area (left side)
        if (lx >= 9 && lx <= 15 && ly <= headYEnd - 1) {
            if (lx === 9 || ly === headYEnd - 1) return SKIN_OUTLINE;
            // Closed eye
            if (ly === headYStart + 8 && (lx === 11 || lx === 12)) {
                return [45, 20, 10, 255];
            }
            if (ly >= headYStart + 11) return SKIN_SHADOW;
            return SKIN_BASE;
        }
        // Default skin
        if (lx >= 9 && lx <= 22 && ly <= headYEnd - 1) {
            if (lx === 22 || ly === headYEnd - 1) return SKIN_OUTLINE;
            return SKIN_SHADOW;
        }
    }

    // --- COLLAR / V-NECK ---
    const neckYStart = 29 - shift;
    const neckYEnd = 32 - shift;
    if (ly >= neckYStart && ly <= neckYEnd && lx >= 11 && lx <= 14) {
        if (ly === neckYStart) return SKIN_BASE;
        return SKIN_SHADOW;
    }

    // --- BELT & KNOT ---
    const beltYStart = 36 - shift;
    const beltYEnd = 38 - shift;
    if (ly >= beltYStart && ly <= beltYEnd && lx >= 9 && lx <= 21) {
        return beltColor;
    }
    // Belt knot hanging down
    if (ly >= beltYEnd + 1 && ly <= beltYEnd + 4 && lx === 10) {
        return beltColor;
    }

    // --- TORSO / SUIT ---
    const torsoYStart = 29 - shift;
    const torsoYEnd = 42 - shift;
    if (ly >= torsoYStart && ly <= torsoYEnd && lx >= 9 && lx <= 22) {
        if (lx === 9 || lx === 22 || ly === torsoYStart || ly === torsoYEnd) return SUIT_OUTLINE;
        if (lx >= 17 && ly >= torsoYStart + 2 && ly <= torsoYStart + 8) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    // --- KNEES / LEGS FOLDED ON THE FLOOR (y: 43 to 47, x: 6 to 25 - No shift!) ---
    if (ly >= 43 && ly <= 47 && lx >= 6 && lx <= 25) {
        if (lx === 6 || lx === 25 || ly === 47 || ly === 43) return SUIT_OUTLINE;
        if (lx >= 16) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    return TRANSPARENT;
}

// Generate 5 student spritesheets (64x48 - 2 frames of 32x48)
Object.keys(studentBelts).forEach(colorName => {
    const pngBuf = createPng(64, 48, (x, y) => {
        const frame = Math.floor(x / 32);
        const lx = x % 32;
        const ly = y;
        const isBreathing = frame === 1;
        return getSeizaPixel(lx, ly, isBreathing, studentBelts[colorName]);
    });
    fs.writeFileSync(`frontend/public/assets/player/student_${colorName}.png`, pngBuf);
    console.log(`Created seiza student_${colorName}.png`);
});

console.log('Successfully generated all seiza breathing assets!');
