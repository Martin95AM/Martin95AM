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

const TSHIRT_BASE = [35, 35, 40, 255]; // Black t-shirt
const TSHIRT_SHADOW = [20, 20, 25, 255];
const TSHIRT_OUTLINE = [10, 10, 15, 255];

const JEANS_BASE = [45, 85, 175, 255]; // Blue jeans
const JEANS_SHADOW = [30, 55, 120, 255];
const JEANS_OUTLINE = [15, 25, 60, 255];

const SNEAKER_BASE = [245, 245, 250, 255]; // White sneakers
const SNEAKER_RED = [220, 40, 40, 255];
const SNEAKER_OUTLINE = [80, 80, 85, 255];

const EYE_WHITE = [255, 255, 255, 255];
const EYE_PUPIL = [20, 20, 30, 255];
const BLUSH = [255, 170, 170, 255];
const TRANSPARENT = [0, 0, 0, 0];

const HEADPHONES_BAND = [180, 185, 190, 255]; // Silver band
const HEADPHONES_CUP = [30, 30, 35, 255]; // Black ear cups

function getCasualHeadphonesPixel(lx, ly, direction, walkStep) {
    const isStep = walkStep === 1 || walkStep === 3;
    const shift = isStep ? 1 : 0;

    // --- HEADPHONES OVERLAY ---
    // Headphones band over the cap (y: 3 to 5, x: 11 to 20)
    const bandY = 4 + shift;
    if (ly === bandY && lx >= 11 && lx <= 20) {
        return HEADPHONES_BAND;
    }
    // Headphones ear cups on the sides of the head (y: 11 to 15, x: 7 to 8, and x: 23 to 24)
    const cupYStart = 11 + shift;
    const cupYEnd = 15 + shift;
    if (ly >= cupYStart && ly <= cupYEnd) {
        if (direction === 'down' || direction === 'up') {
            if (lx === 7 || lx === 8 || lx === 23 || lx === 24) {
                return HEADPHONES_CUP;
            }
        } else if (direction === 'left') {
            // Only right ear cup is visible from side view
            if (lx === 23 || lx === 24) return HEADPHONES_CUP;
        } else if (direction === 'right') {
            // Only left ear cup is visible from side view
            if (lx === 7 || lx === 8) return HEADPHONES_CUP;
        }
    }

    // --- CAP (y: 4 to 9, x: 8 to 23) ---
    const capColor = [220, 40, 40, 255]; // Red cap
    const capYStart = 4 + shift;
    const capYEnd = 9 + shift;
    if (ly >= capYStart && ly <= capYEnd && lx >= 8 && lx <= 23) {
        if (lx >= 10 && lx <= 22 && ly <= capYEnd - 1) {
            if (lx === 10 || lx === 22 || ly === capYStart) return [capColor[0] - 40, capColor[1] - 40, capColor[2] - 40, 255];
            return capColor;
        }
        if (ly === capYEnd) {
            if (direction === 'down' && lx >= 10 && lx <= 22) return capColor;
            if (direction === 'left' && lx >= 6 && lx <= 14) return capColor;
            if (direction === 'right' && lx >= 18 && lx <= 26) return capColor;
            if (direction === 'up' && lx >= 11 && lx <= 21) return [capColor[0] - 40, capColor[1] - 40, capColor[2] - 40, 255];
        }
    }

    // --- HEAD & HAIR (y: 10 to 20, x: 8 to 23) ---
    const headYStart = 10 + shift;
    const headYEnd = 20 + shift;
    const hairColor = [90, 50, 30, 255];
    if (ly >= headYStart && ly <= headYEnd && lx >= 8 && lx <= 23) {
        if (ly <= headYStart + 2) {
            return hairColor;
        }
        if (direction === 'down' || direction === 'up') {
            if ((lx === 8 || lx === 9 || lx === 22 || lx === 23) && ly <= headYStart + 6) {
                return hairColor;
            }
        } else if (direction === 'left') {
            if (lx >= 18 && ly <= headYStart + 7) return hairColor;
        } else if (direction === 'right') {
            if (lx <= 13 && ly <= headYStart + 7) return hairColor;
        }

        if (direction === 'up') {
            if (lx === 8 || lx === 23 || ly === headYEnd) return [45, 20, 10, 255];
            return hairColor;
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

    // --- BLACK T-SHIRT (Torso, y: 20 to 35) ---
    const torsoYStart = 20 + shift;
    const torsoYEnd = 35 + shift;
    if (ly >= torsoYStart && ly <= torsoYEnd && lx >= 7 && lx <= 24) {
        if (lx === 7 || lx === 24 || ly === torsoYStart || ly === torsoYEnd) return TSHIRT_OUTLINE;
        if (lx >= 19 || ly >= torsoYStart + 12) return TSHIRT_SHADOW;
        return TSHIRT_BASE;
    }

    // --- SLEEVES & ARMS ---
    const sleeveYStart = 21 + shift;
    const sleeveYEnd = 27 + shift;
    if (ly >= sleeveYStart && ly <= sleeveYEnd) {
        if (direction === 'down' || direction === 'up') {
            if (lx >= 5 && lx <= 6) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                if (lx === 5) return TSHIRT_OUTLINE;
                return TSHIRT_BASE;
            }
            if (lx >= 25 && lx <= 26) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                if (lx === 26) return TSHIRT_OUTLINE;
                return TSHIRT_SHADOW;
            }
        } else if (direction === 'left') {
            if (lx >= 5 && lx <= 6) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                return TSHIRT_BASE;
            }
        } else if (direction === 'right') {
            if (lx >= 25 && lx <= 26) {
                if (ly === sleeveYEnd) return SKIN_OUTLINE;
                if (ly === sleeveYEnd - 1) return SKIN_BASE;
                return TSHIRT_SHADOW;
            }
        }
    }

    // --- JEANS (Legs, y: 36 to 44) ---
    let leftLegXStart = 8;
    let leftLegXEnd = 14;
    let leftLegYMax = 44;
    let rightLegXStart = 17;
    let rightLegXEnd = 23;
    let rightLegYMax = 44;

    if (walkStep === 1) {
        leftLegXStart = 10;
        leftLegXEnd = 15;
        leftLegYMax = 42;
        rightLegXStart = 16;
        rightLegXEnd = 21;
    } else if (walkStep === 3) {
        leftLegXStart = 9;
        leftLegXEnd = 14;
        rightLegXStart = 15;
        rightLegXEnd = 20;
        rightLegYMax = 42;
    }

    if (ly >= 36 && ly <= leftLegYMax && lx >= leftLegXStart && lx <= leftLegXEnd) {
        if (lx === leftLegXStart || lx === leftLegXEnd || ly === leftLegYMax) return JEANS_OUTLINE;
        if (lx === leftLegXEnd - 1) return JEANS_SHADOW;
        return JEANS_BASE;
    }
    if (ly >= 36 && ly <= rightLegYMax && lx >= rightLegXStart && lx <= rightLegXEnd) {
        if (lx === rightLegXStart || lx === rightLegXEnd || ly === rightLegYMax) return JEANS_OUTLINE;
        return JEANS_SHADOW;
    }

    // --- SNEAKERS (y: 45 to 47) ---
    if (ly >= 45 && ly <= 47 && lx >= leftLegXStart && lx <= leftLegXEnd - 1) {
        if (ly <= leftLegYMax + 5) {
            if (lx === leftLegXStart || lx === leftLegXEnd - 1 || ly === 47) return SNEAKER_OUTLINE;
            if (ly === 46) return SNEAKER_RED;
            return SNEAKER_BASE;
        }
    }
    if (ly >= 45 && ly <= 47 && lx >= rightLegXStart + 1 && lx <= rightLegXEnd) {
        if (ly <= rightLegYMax + 5) {
            if (lx === rightLegXStart + 1 || lx === rightLegXEnd || ly === 47) return SNEAKER_OUTLINE;
            if (ly === 46) return SNEAKER_RED;
            return SNEAKER_BASE;
        }
    }

    return TRANSPARENT;
}

// Generate Martin Casual with Headphones Spritesheet (128x192)
const martinCasualHeadphonesPng = createPng(128, 192, (x, y) => {
    const col = Math.floor(x / 32);
    const row = Math.floor(y / 48);
    const lx = x % 32;
    const ly = y % 48;

    const directions = ['down', 'left', 'right', 'up'];
    const direction = directions[row];
    const walkStep = col;

    return getCasualHeadphonesPixel(lx, ly, direction, walkStep);
});

fs.writeFileSync('frontend/public/assets/player/martin_casual_headphones.png', martinCasualHeadphonesPng);
console.log('Successfully generated casual headphones outfit for Martin!');
