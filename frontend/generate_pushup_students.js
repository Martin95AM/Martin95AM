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

// Palette and variants. Keeping the art code here makes every generated sprite
// reproducible instead of relying on hand-edited binary PNGs.
const SUIT_BASE = [236, 239, 235, 255];
const SUIT_LIGHT = [255, 255, 248, 255];
const SUIT_SHADOW = [139, 158, 165, 255];
const SUIT_DEEP = [66, 83, 96, 255];
const SUIT_OUTLINE = [28, 38, 53, 255];
const TRANSPARENT = [0, 0, 0, 0];

const students = {
    yellow: { belt: [233, 196, 42, 255], skin: [237, 180, 139, 255], shade: [185, 121, 88, 255], outline: [84, 53, 45, 255], hair: [67, 43, 36, 255], hairOutline: [27, 30, 41, 255], fringe: 0 },
    orange: { belt: [225, 105, 37, 255], skin: [202, 137, 101, 255], shade: [151, 88, 67, 255], outline: [72, 48, 43, 255], hair: [29, 32, 45, 255], hairOutline: [20, 27, 39, 255], fringe: 2 },
    green: { belt: [43, 149, 76, 255], skin: [126, 77, 58, 255], shade: [83, 47, 39, 255], outline: [49, 36, 38, 255], hair: [19, 23, 30, 255], hairOutline: [16, 23, 34, 255], fringe: 1 },
    blue: { belt: [38, 105, 194, 255], skin: [241, 190, 151, 255], shade: [183, 124, 94, 255], outline: [91, 55, 49, 255], hair: [151, 78, 44, 255], hairOutline: [44, 37, 40, 255], fringe: 3 },
    brown: { belt: [109, 65, 37, 255], skin: [100, 61, 47, 255], shade: [66, 39, 35, 255], outline: [43, 32, 37, 255], hair: [37, 27, 28, 255], hairOutline: [19, 25, 35, 255], fringe: 0 }
};

function getSeizaPixel(lx, ly, isBreathing, style) {
    const shift = isBreathing ? 1 : 0;

    // --- HEAD & HAIR (Facing Left, shifted down) ---
    const headYStart = 14 - shift;
    const headYEnd = 28 - shift;
    if (ly >= headYStart && ly <= headYEnd && lx >= 8 && lx <= 23) {
        if (ly <= headYStart + 5) {
            if (lx === 8 || lx === 23 || ly === headYStart) return style.hairOutline;
            if (ly === headYStart + 4 && lx >= 10 && lx <= 10 + style.fringe) return style.hairOutline;
            return style.hair;
        }
        if (lx >= 16 && ly <= headYStart + 11) {
            if (lx === 23) return style.hairOutline;
            return style.hair;
        }
        if (lx >= 9 && lx <= 15 && ly <= headYEnd - 1) {
            if (lx === 9 || ly === headYEnd - 1) return style.outline;
            if (ly === headYStart + 8 && (lx === 11 || lx === 12)) {
                return [45, 20, 10, 255];
            }
            if (ly >= headYStart + 11) return style.shade;
            return style.skin;
        }
        if (lx >= 9 && lx <= 22 && ly <= headYEnd - 1) {
            if (lx === 22 || ly === headYEnd - 1) return style.outline;
            return style.shade;
        }
    }

    // --- COLLAR / V-NECK ---
    const neckYStart = 29 - shift;
    const neckYEnd = 32 - shift;
    if (ly >= neckYStart && ly <= neckYEnd && lx >= 11 && lx <= 14) {
        if (ly === neckYStart) return style.skin;
        return style.shade;
    }

    // --- BELT & KNOT ---
    const beltYStart = 36 - shift;
    const beltYEnd = 38 - shift;
    if (ly >= beltYStart && ly <= beltYEnd && lx >= 9 && lx <= 21) {
        return style.belt;
    }
    if (ly >= beltYEnd + 1 && ly <= beltYEnd + 4 && lx === 10) {
        return style.belt;
    }

    // --- TORSO / SUIT ---
    const torsoYStart = 29 - shift;
    const torsoYEnd = 42 - shift;
    if (ly >= torsoYStart && ly <= torsoYEnd && lx >= 9 && lx <= 22) {
        if (lx === 9 || lx === 22 || ly === torsoYStart || ly === torsoYEnd) return SUIT_OUTLINE;
        // Gi overlap and sleeve give the compact sprite the same articulated feel
        // as the main cast instead of a flat white block.
        if ((lx === 13 && ly >= torsoYStart + 2) || (lx === 16 && ly >= torsoYStart + 4)) return SUIT_DEEP;
        if (lx >= 17 && ly >= torsoYStart + 2 && ly <= torsoYStart + 8) return SUIT_SHADOW;
        if (lx === 10 && ly >= torsoYStart + 3) return SUIT_LIGHT;
        return SUIT_BASE;
    }

    // --- KNEES / LEGS FOLDED ON THE FLOOR ---
    if (ly >= 43 && ly <= 47 && lx >= 6 && lx <= 25) {
        if (lx === 6 || lx === 25 || ly === 47 || ly === 43) return SUIT_OUTLINE;
        if (lx >= 16) return SUIT_SHADOW;
        if (ly === 44) return SUIT_LIGHT;
        return SUIT_BASE;
    }

    return TRANSPARENT;
}

function getPushupPixel(lx, ly, isUp, style) {
    // isUp: true for Frame 2 (Push-up UP), false for Frame 3 (Push-up DOWN)
    const bodyY = isUp ? 32 : 38; // body is higher when up
    const headY = isUp ? 22 : 28; // head is higher when up

    // --- HEAD & HAIR (Facing Left, horizontal) ---
    if (ly >= headY && ly <= headY + 12 && lx >= 4 && lx <= 16) {
        // Hair (top and back)
        if (ly <= headY + 4) {
            if (lx === 4 || lx === 16 || ly === headY) return style.hairOutline;
            return style.hair;
        }
        // Face Skin (left side)
        if (lx >= 5 && lx <= 11 && ly <= headY + 11) {
            if (lx === 5 || ly === headY + 11) return style.outline;
            if (ly === headY + 7 && (lx === 7 || lx === 8)) return [45, 20, 10, 255]; // closed eye
            return style.skin;
        }
        if (lx >= 5 && lx <= 15 && ly <= headY + 11) {
            if (lx === 15 || ly === headY + 11) return style.outline;
            return style.shade;
        }
    }

    // --- ARMS / SLEEVES (Pushing up) ---
    if (isUp) {
        // Arms straight down to the floor (y: 34 to 47, x: 10 to 13)
        if (ly >= 34 && ly <= 47 && lx >= 10 && lx <= 13) {
            if (ly >= 45) return style.skin; // hands on floor
            if (lx === 10 || lx === 13) return SUIT_OUTLINE;
            return lx === 11 ? SUIT_LIGHT : SUIT_BASE;
        }
    } else {
        // Arms bent (y: 40 to 47, x: 10 to 15)
        if (ly >= 40 && ly <= 47 && lx >= 10 && lx <= 15) {
            if (ly >= 45) return style.skin;
            if (lx === 10 || lx === 15) return SUIT_OUTLINE;
            return SUIT_SHADOW;
        }
    }

    // --- BELT ---
    if (ly >= bodyY + 4 && ly <= bodyY + 6 && lx >= 16 && lx <= 18) {
        return style.belt;
    }

    // --- TORSO & LEGS (Horizontal body) ---
    if (ly >= bodyY && ly <= bodyY + 8 && lx >= 12 && lx <= 28) {
        if (lx === 12 || lx === 28 || ly === bodyY || ly === bodyY + 8) return SUIT_OUTLINE;
        if (ly >= bodyY + 5) return SUIT_SHADOW;
        if (lx === 16 || lx === 17) return SUIT_DEEP;
        return ly === bodyY + 1 ? SUIT_LIGHT : SUIT_BASE;
    }

    // --- FEET (Touching floor at the back) ---
    if (ly >= bodyY + 2 && ly <= bodyY + 7 && lx >= 29 && lx <= 31) {
        return style.shade;
    }

    return TRANSPARENT;
}

// Generate 5 student spritesheets (128x48 - 4 frames of 32x48)
Object.entries(students).forEach(([colorName, style]) => {
    const pngBuf = createPng(128, 48, (x, y) => {
        const frame = Math.floor(x / 32);
        const lx = x % 32;
        const ly = y;

        if (frame === 0) return getSeizaPixel(lx, ly, false, style);
        if (frame === 1) return getSeizaPixel(lx, ly, true, style);
        if (frame === 2) return getPushupPixel(lx, ly, true, style);
        return getPushupPixel(lx, ly, false, style);
    });
    fs.writeFileSync(path.join(__dirname, 'public', 'assets', 'player', `student_${colorName}.png`), pngBuf);
    console.log(`Created 4-frame student_${colorName}.png`);
});

console.log('Successfully generated all push-up breathing assets!');
