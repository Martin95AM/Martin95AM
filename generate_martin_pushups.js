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
const HAIR_HIGHLIGHT = [150, 100, 70, 255];
const HAIR_OUTLINE = [45, 20, 10, 255];

const SUIT_BASE = [245, 245, 250, 255];
const SUIT_SHADOW = [185, 195, 210, 255];
const SUIT_HIGHLIGHT = [255, 255, 255, 255];
const SUIT_OUTLINE = [110, 125, 145, 255];

const BLACK_BELT_BASE = [45, 45, 50, 255];
const BLACK_BELT_HIGHLIGHT = [110, 115, 125, 255];
const BLACK_BELT_OUTLINE = [15, 15, 20, 255];

const EYE_WHITE = [255, 255, 255, 255];
const EYE_PUPIL = [20, 20, 30, 255];
const BLUSH = [255, 170, 170, 255];
const TRANSPARENT = [0, 0, 0, 0];

function getDynamicWalkingPixel(lx, ly, direction, walkStep) {
    const isStep = walkStep === 1 || walkStep === 3;
    const shift = isStep ? 1 : 0;

    // --- HEAD & HAIR (y: 4 to 20, x: 8 to 23) ---
    const headYStart = 4 + shift;
    const headYEnd = 20 + shift;
    if (ly >= headYStart && ly <= headYEnd && lx >= 8 && lx <= 23) {
        if (ly <= headYStart + 5) {
            if (lx === 8 || lx === 23 || ly === headYStart) return HAIR_OUTLINE;
            if (ly === headYStart + 3 && lx >= 11 && lx <= 20) return HAIR_HIGHLIGHT;
            return HAIR_BASE;
        }
        if (direction === 'down' || direction === 'up') {
            if ((lx === 8 || lx === 9 || lx === 22 || lx === 23) && ly <= headYStart + 10) {
                if (lx === 8 || lx === 23) return HAIR_OUTLINE;
                return HAIR_BASE;
            }
        } else if (direction === 'left') {
            if (lx >= 18 && ly <= headYStart + 11) {
                if (lx === 23) return HAIR_OUTLINE;
                return HAIR_BASE;
            }
        } else if (direction === 'right') {
            if (lx <= 13 && ly <= headYStart + 11) {
                if (lx === 8) return HAIR_OUTLINE;
                return HAIR_BASE;
            }
        }

        if (direction === 'up') {
            if (lx === 8 || lx === 23 || ly === headYEnd) return HAIR_OUTLINE;
            return HAIR_BASE;
        }

        if (lx >= 9 && lx <= 22 && ly <= headYEnd - 1) {
            if (lx === 9 || lx === 22 || ly === headYEnd - 1) return SKIN_OUTLINE;
            if (ly === headYStart + 9 || ly === headYStart + 10) {
                if (direction === 'down') {
                    if (lx === 12) return EYE_WHITE;
                    if (lx === 13) return EYE_PUPIL;
                    if (lx === 19) return EYE_WHITE;
                    if (lx === 18) return EYE_PUPIL;
                } else if (direction === 'left') {
                    if (lx === 11) return EYE_WHITE;
                    if (lx === 12) return EYE_PUPIL;
                } else if (direction === 'right') {
                    if (lx === 20) return EYE_WHITE;
                    if (lx === 19) return EYE_PUPIL;
                }
            }
            if (ly === headYStart + 11 && (lx === 11 || lx === 20) && direction === 'down') {
                return BLUSH;
            }
            if (ly >= headYStart + 13 || lx >= 19) return SKIN_SHADOW;
            return SKIN_BASE;
        }
    }

    // --- COLLAR / V-NECK ---
    const neckYStart = 20 + shift;
    const neckYEnd = 24 + shift;
    if (direction === 'down' && ly >= neckYStart && ly <= neckYEnd && lx >= 14 && lx <= 17) {
        if (ly === neckYStart) return SKIN_BASE;
        if (ly === neckYStart + 1 && lx >= 15 && lx <= 16) return SKIN_BASE;
        if (ly === neckYStart + 2 && lx === 15) return SKIN_SHADOW;
    }

    // --- BELT & KNOT ---
    const beltYStart = 28 + shift;
    const beltYEnd = 30 + shift;
    if (ly >= beltYStart && ly <= beltYEnd && lx >= 8 && lx <= 23) {
        if (lx === 8 || lx === 23 || ly === beltYStart) return BLACK_BELT_OUTLINE;
        if (ly === beltYStart + 1 && (lx === 11 || lx === 12 || lx === 19 || lx === 20)) return BLACK_BELT_HIGHLIGHT;
        return BLACK_BELT_BASE;
    }
    if (direction === 'down') {
        if (ly === beltYEnd + 1 && lx >= 14 && lx <= 17) {
            if (lx === 15) return BLACK_BELT_HIGHLIGHT;
            return BLACK_BELT_BASE;
        }
        if (ly >= beltYEnd + 2 && ly <= beltYEnd + 6 && lx === 14) {
            if (ly === beltYEnd + 6) return BLACK_BELT_OUTLINE;
            return BLACK_BELT_BASE;
        }
        if (ly >= beltYEnd + 2 && ly <= beltYEnd + 5 && lx === 16) {
            if (ly === beltYEnd + 5) return BLACK_BELT_OUTLINE;
            return BLACK_BELT_BASE;
        }
    }

    // --- TORSO / JUDOGI JACKET ---
    const torsoYStart = 20 + shift;
    const torsoYEnd = 35 + shift;
    if (ly >= torsoYStart && ly <= torsoYEnd && lx >= 7 && lx <= 24) {
        if (lx === 7 || lx === 24 || ly === torsoYStart || ly === torsoYEnd) return SUIT_OUTLINE;
        if (lx === 10 || lx === 17 || ly === torsoYStart + 2) return SUIT_HIGHLIGHT;
        if (lx >= 19 || ly >= torsoYStart + 12) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    // --- SLEEVES & HANDS ---
    const sleeveYStart = 21 + shift;
    const sleeveYEnd = 27 + shift;
    if (ly >= sleeveYStart && ly <= sleeveYEnd) {
        if (direction === 'down' || direction === 'up') {
            if (lx >= 5 && lx <= 6) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                if (lx === 5) return SUIT_OUTLINE;
                return SUIT_BASE;
            }
            if (lx >= 25 && lx <= 26) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                if (lx === 26) return SUIT_OUTLINE;
                return SUIT_SHADOW;
            }
        } else if (direction === 'left') {
            if (lx >= 5 && lx <= 6) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                return SUIT_BASE;
            }
        } else if (direction === 'right') {
            if (lx >= 25 && lx <= 26) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                return SUIT_SHADOW;
            }
        }
    }

    // --- LEGS & FEET ---
    let leftLegXStart = 8;
    let leftLegXEnd = 14;
    let leftLegYMax = 43;
    let rightLegXStart = 17;
    let rightLegXEnd = 23;
    let rightLegYMax = 43;

    if (walkStep === 1) {
        leftLegXStart = 10;
        leftLegXEnd = 15;
        leftLegYMax = 41;
        rightLegXStart = 16;
        rightLegXEnd = 21;
    } else if (walkStep === 3) {
        leftLegXStart = 9;
        leftLegXEnd = 14;
        rightLegXStart = 15;
        rightLegXEnd = 20;
        rightLegYMax = 41;
    }

    if (ly >= 36 && ly <= leftLegYMax && lx >= leftLegXStart && lx <= leftLegXEnd) {
        if (lx === leftLegXStart || lx === leftLegXEnd || ly === leftLegYMax) return SUIT_OUTLINE;
        if (lx === leftLegXEnd - 1) return SUIT_SHADOW;
        return SUIT_BASE;
    }
    if (ly >= 36 && ly <= rightLegYMax && lx >= rightLegXStart && lx <= rightLegXEnd) {
        if (lx === rightLegXStart || lx === rightLegXEnd || ly === rightLegYMax) return SUIT_OUTLINE;
        return SUIT_SHADOW;
    }
    if (ly >= 44 && ly <= 47 && lx >= leftLegXStart && lx <= leftLegXEnd - 1) {
        if (ly <= leftLegYMax + 4) {
            if (lx === leftLegXStart || lx === leftLegXEnd - 1 || ly === 47) return SKIN_OUTLINE;
            if (ly === 46 && (lx === leftLegXStart + 1 || lx === leftLegXStart + 3)) return SKIN_SHADOW;
            return SKIN_BASE;
        }
    }
    if (ly >= 44 && ly <= 47 && lx >= rightLegXStart + 1 && lx <= rightLegXEnd) {
        if (ly <= rightLegYMax + 4) {
            if (lx === rightLegXStart + 1 || lx === rightLegXEnd || ly === 47) return SKIN_OUTLINE;
            if (ly === 46 && (lx === rightLegXStart + 2 || lx === rightLegXStart + 4)) return SKIN_SHADOW;
            return SKIN_SHADOW;
        }
    }

    return TRANSPARENT;
}

function getPushupPixel(lx, ly, isUp) {
    const bodyY = isUp ? 32 : 38;
    const headY = isUp ? 22 : 28;

    // Head & Hair (Facing Left, horizontal)
    if (ly >= headY && ly <= headY + 12 && lx >= 4 && lx <= 16) {
        if (ly <= headY + 4) {
            if (lx === 4 || lx === 16 || ly === headY) return HAIR_OUTLINE;
            return HAIR_BASE;
        }
        if (lx >= 5 && lx <= 11 && ly <= headY + 11) {
            if (lx === 5 || ly === headY + 11) return SKIN_OUTLINE;
            if (ly === headY + 7 && (lx === 7 || lx === 8)) return [45, 20, 10, 255];
            return SKIN_BASE;
        }
        if (lx >= 5 && lx <= 15 && ly <= headY + 11) {
            if (lx === 15 || ly === headY + 11) return SKIN_OUTLINE;
            return SKIN_SHADOW;
        }
    }

    // Arms / Sleeves
    if (isUp) {
        if (ly >= 34 && ly <= 47 && lx >= 10 && lx <= 13) {
            if (ly >= 45) return SKIN_BASE;
            if (lx === 10 || lx === 13) return SUIT_OUTLINE;
            return SUIT_BASE;
        }
    } else {
        if (ly >= 40 && ly <= 47 && lx >= 10 && lx <= 15) {
            if (ly >= 45) return SKIN_BASE;
            if (lx === 10 || lx === 15) return SUIT_OUTLINE;
            return SUIT_SHADOW;
        }
    }

    // Belt (Black Belt)
    if (ly >= bodyY + 4 && ly <= bodyY + 6 && lx >= 16 && lx <= 18) {
        return BLACK_BELT_BASE;
    }

    // Torso & Legs
    if (ly >= bodyY && ly <= bodyY + 8 && lx >= 12 && lx <= 28) {
        if (lx === 12 || lx === 28 || ly === bodyY || ly === bodyY + 8) return SUIT_OUTLINE;
        if (ly >= bodyY + 5) return SUIT_SHADOW;
        return SUIT_BASE;
    }

    // Feet
    if (ly >= bodyY + 2 && ly <= bodyY + 7 && lx >= 29 && lx <= 31) {
        return SKIN_SHADOW;
    }

    return TRANSPARENT;
}

// Generate Martin Spritesheet (128x240 - 5 rows of 48 pixels high)
const martinPng = createPng(128, 240, (x, y) => {
    const col = Math.floor(x / 32);
    const row = Math.floor(y / 48);
    const lx = x % 32;
    const ly = y % 48;

    if (row <= 3) {
        const directions = ['down', 'left', 'right', 'up'];
        const direction = directions[row];
        const walkStep = col;
        return getDynamicWalkingPixel(lx, ly, direction, walkStep);
    }

    // Row 4: Push-up animation (Frame 16: Push-up UP, Frame 17: Push-up DOWN)
    const isUp = col === 0 || col === 2;
    return getPushupPixel(lx, ly, isUp);
});

fs.writeFileSync('frontend/public/assets/player/martin.png', martinPng);
console.log('Successfully generated expanded spritesheet for Martin with push-up frames!');
