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
const CARPET = [45, 40, 55, 255];
const CARPET_DARK = [35, 30, 45, 255];
const WALL_DARK = [30, 30, 35, 255];
const WALL_LIGHT = [50, 50, 55, 255];
const WOOD_DESK = [120, 60, 30, 255];
const WOOD_DESK_DARK = [80, 40, 20, 255];

const GLASS = [150, 220, 240, 255];
const GLASS_SHINE = [220, 245, 255, 255];
const FOAM_PANEL = [60, 60, 65, 255];
const FOAM_PANEL_DARK = [40, 40, 45, 255];

const RED_COUCH = [180, 30, 30, 255];
const RED_COUCH_DARK = [120, 15, 15, 255];

const GOLD = [215, 165, 40, 255];
const METAL = [180, 185, 190, 255];

function getStudioPixel(x, y) {
    // --- BACK WALL (y: 0 to 100) ---
    if (y <= 100) {
        // Baseboard (y: 90 to 100)
        if (y >= 90) return [20, 20, 25, 255];

        // Acoustic Foam Panels (every 60 pixels)
        if (x % 60 >= 10 && x % 60 <= 50 && y >= 15 && y <= 75) {
            const px = (x - 10) % 60;
            const py = y - 15;
            if (px % 8 === 0 || py % 8 === 0) return FOAM_PANEL_DARK;
            return FOAM_PANEL;
        }

        return WALL_DARK;
    }

    // --- VOCAL BOOTH (Top-Left, x: 40 to 220, y: 100 to 260) ---
    if (x >= 40 && x <= 220 && y >= 100 && y <= 260) {
        // Booth Walls (outline)
        if (x <= 46 || x >= 214 || y <= 106 || y >= 254) {
            return WALL_LIGHT;
        }

        // Glass Window (x: 80 to 180, y: 120 to 180)
        if (x >= 80 && x <= 180 && y >= 120 && y <= 180) {
            // Diagonal shine lines on glass
            if (Math.abs((x - 80) - (y - 120)) <= 4 || Math.abs((x - 120) - (y - 120)) <= 4) {
                return GLASS_SHINE;
            }
            return GLASS;
        }

        // Inside Vocal Booth: Microphone on stand (x: 130, y: 190 to 240)
        if (x >= 126 && x <= 134 && y >= 190 && y <= 240) {
            if (y === 190) return [20, 20, 20, 255]; // mic head
            if (y === 191) return METAL; // pop filter
            if (x === 130) return [50, 50, 50, 255]; // stand pole
            if (y >= 236 && x >= 128 && x <= 132) return [30, 30, 30, 255]; // stand base
        }

        // Booth Floor (darker carpet)
        return CARPET_DARK;
    }

    // --- MIXING DESK / CONSOLE (Center-Bottom, x: 180 to 460, y: 420 to 520) ---
    if (x >= 180 && x <= 460 && y >= 420 && y <= 520) {
        // Desk border
        if (x === 180 || x === 460 || y === 420 || y === 520) return WOOD_DESK_DARK;

        // Mixing Console (sliders and knobs)
        if (x >= 200 && x <= 440 && y >= 435 && y <= 505) {
            const cx = x - 200;
            const cy = y - 435;

            // Sliders (vertical lines)
            if (cx % 16 === 0) {
                if (cy >= 10 && cy <= 50) {
                    // Slider knob (red, blue, green)
                    if (cy === 25 || cy === 35 || cy === 40) {
                        if (cx % 48 === 0) return [220, 40, 40, 255]; // red knob
                        if (cx % 48 === 16) return [40, 100, 220, 255]; // blue knob
                        return [40, 180, 60, 255]; // green knob
                    }
                    return [20, 20, 25, 255]; // slider track
                }
            }
            // Knobs (small circles)
            if (cx % 16 >= 6 && cx % 16 <= 10 && cy >= 2 && cy <= 6) {
                return GOLD;
            }
            return [50, 50, 55, 255]; // console metal face
        }

        return WOOD_DESK;
    }

    // --- STUDIO MONITORS (Speakers, Left: 130 to 160, Right: 480 to 510, y: 410 to 470) ---
    if (((x >= 130 && x <= 160) || (x >= 480 && x <= 510)) && y >= 410 && y <= 470) {
        const sx = x >= 130 && x <= 160 ? x - 130 : x - 480; // 0 to 30
        const sy = y - 410; // 0 to 60

        // Speaker cabinet (black)
        if (sx === 0 || sx === 30 || sy === 0 || sy === 60) return [15, 15, 20, 255];

        // Speaker cones (circles)
        const dx = sx - 15;
        const dy1 = sy - 20; // top tweeter
        const dy2 = sy - 42; // bottom woofer
        if (dx * dx + dy1 * dy1 <= 16) return [80, 80, 85, 255];
        if (dx * dx + dy2 * dy2 <= 36) return [180, 185, 190, 255]; // silver cone

        return [35, 35, 40, 255];
    }

    // --- COUCH (Center-Left, x: 80 to 160, y: 300 to 360) ---
    if (x >= 80 && x <= 160 && y >= 300 && y <= 360) {
        const cx = x - 80;
        const cy = y - 300;
        // Couch outline
        if (cx === 0 || cx === 80 || cy === 0 || cy === 60) return RED_COUCH_DARK;
        // Couch cushions
        if (cy >= 15 && cy <= 45 && cx % 26 === 0) return RED_COUCH_DARK;
        if (cy >= 45) return RED_COUCH_DARK; // bottom shadow
        return RED_COUCH;
    }

    // --- SYNTHESIZER KEYBOARD (Top-Right, x: 440 to 580, y: 120 to 180) ---
    if (x >= 440 && x <= 580 && y >= 120 && y <= 180) {
        const kx = x - 440;
        const ky = y - 120;

        // Keyboard stand (legs)
        if ((kx >= 10 && kx <= 14) || (kx >= 126 && kx <= 130)) {
            if (ky >= 20) return [30, 30, 35, 255];
        }

        // Keyboard body
        if (ky <= 20) {
            if (ky === 0 || kx === 0 || kx === 140 || ky === 20) return [20, 20, 25, 255];
            // Keys (white and black)
            if (ky >= 10) {
                if (kx % 6 === 0) return [20, 20, 25, 255]; // key separator
                if (ky <= 15 && (kx % 18 === 2 || kx % 18 === 8 || kx % 18 === 14)) return [20, 20, 25, 255]; // black keys
                return [255, 255, 255, 255]; // white keys
            }
            return [40, 40, 45, 255];
        }
    }

    // --- CARPET FLOOR (Default) ---
    // Subtle carpet pattern
    if ((x + y) % 16 === 0) return CARPET_DARK;
    return CARPET;
}

const studioPng = createPng(640, 640, getStudioPixel);

fs.mkdirSync('frontend/public/assets/tiles', { recursive: true });
fs.writeFileSync('frontend/public/assets/tiles/studio.png', studioPng);
console.log('Successfully generated 16-bit Recording Studio background!');
