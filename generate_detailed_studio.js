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
const WOOD_PARQUET = [145, 75, 35, 255];
const WOOD_PARQUET_DARK = [100, 50, 20, 255];
const WOOD_PARQUET_LIGHT = [175, 95, 45, 255];

const WALL_DARK = [30, 30, 35, 255];
const WALL_LIGHT = [50, 50, 55, 255];
const FOAM_PANEL = [55, 55, 60, 255];
const FOAM_PANEL_DARK = [35, 35, 40, 255];

const GLASS = [140, 210, 230, 255];
const GLASS_SHINE = [215, 240, 250, 255];
const SILHOUETTE = [90, 90, 95, 255];

const CONSOLE_BASE = [45, 45, 50, 255];
const CONSOLE_LIGHT = [75, 75, 80, 255];
const CONSOLE_DARK = [25, 25, 30, 255];

const RUG_RED = [170, 25, 25, 255];
const RUG_BEIGE = [230, 215, 185, 255];
const RUG_GOLD = [210, 160, 40, 255];
const RUG_BLUE = [35, 35, 70, 255];

const GOLD = [215, 165, 40, 255];
const METAL = [180, 185, 190, 255];
const LAMP_GLOW = [255, 235, 160, 255];

function getDetailedStudioPixel(x, y) {
    // --- SIDE WALLS (Left: 0 to 50, Right: 590 to 640) ---
    if (x <= 50 || x >= 590) {
        // Wall Lamps (y: 180 to 210, and y: 380 to 410)
        const isLeft = x <= 50;
        const lx = isLeft ? x : 640 - x; // 0 to 50

        if (((y >= 180 && y <= 210) || (y >= 380 && y <= 410)) && lx >= 15 && lx <= 35) {
            const ly = y % 200; // local y
            // Lamp base (gold)
            if (lx >= 22 && lx <= 28 && ly >= 5 && ly <= 15) return GOLD;
            // Glowing bulb
            if (lx >= 18 && lx <= 32 && ly >= 12 && ly <= 25) return LAMP_GLOW;
        }

        // Acoustic panels on side walls
        if (lx >= 5 && lx <= 45 && y % 40 >= 10 && y % 40 <= 30) {
            if (lx % 6 === 0 || y % 8 === 0) return FOAM_PANEL_DARK;
            return FOAM_PANEL;
        }

        return WALL_DARK;
    }

    // --- BACK WALL & VENTANAL (y: 0 to 120) ---
    if (y <= 120) {
        // Baseboard (y: 110 to 120)
        if (y >= 110) return [20, 20, 25, 255];

        // Large Glass Window (x: 160 to 480, y: 15 to 95)
        if (x >= 160 && x <= 480 && y >= 15 && y <= 95) {
            // Silhouettes behind glass (live room)
            // Mic stand silhouette at x = 220, y = 40 to 95
            if (x >= 218 && x <= 222 && y >= 40) {
                return SILHOUETTE;
            }
            // Wooden diffuser panels at x = 380 to 440, y = 25 to 85
            if (x >= 380 && x <= 440 && y >= 25 && y <= 85) {
                if (x % 12 === 0 || y % 12 === 0) return [100, 55, 25, 255];
                return [130, 75, 35, 255];
            }

            // Diagonal glass shine lines
            if (Math.abs((x - 160) - (y - 15)) <= 6 || Math.abs((x - 280) - (y - 15)) <= 6) {
                return GLASS_SHINE;
            }
            return GLASS;
        }

        // Acoustic panels on back wall
        if (((x >= 60 && x <= 140) || (x >= 500 && x <= 580)) && y >= 20 && y <= 90) {
            if (x % 8 === 0 || y % 8 === 0) return FOAM_PANEL_DARK;
            return FOAM_PANEL;
        }

        return WALL_DARK;
    }

    // --- ANALOG EQUIPMENT RACKS (Side walls, x: 51 to 100, and x: 540 to 589, y: 130 to 380) ---
    if (((x >= 51 && x <= 100) || (x >= 540 && x <= 589)) && y >= 130 && y <= 380) {
        const rx = x >= 51 && x <= 100 ? x - 51 : x - 540; // 0 to 49
        const ry = y - 130; // 0 to 250

        // Rack metal frame
        if (rx === 0 || rx === 48 || ry % 24 === 0) return CONSOLE_DARK;

        // LED lights and measurement bars
        const unitY = ry % 24;
        if (unitY >= 4 && unitY <= 20) {
            // LED bars (green/yellow/red)
            if (rx >= 10 && rx <= 30 && unitY >= 8 && unitY <= 12) {
                const barX = rx - 10;
                if (barX <= 12) return [40, 180, 60, 255]; // green LEDs
                if (barX <= 16) return [215, 165, 40, 255]; // yellow LEDs
                return [220, 40, 40, 255]; // red LEDs
            }
            // Small glowing knobs/lights
            if (rx >= 36 && rx <= 42 && (unitY === 6 || unitY === 14)) {
                if (ry % 48 < 24) return [40, 100, 220, 255]; // blue light
                return [220, 40, 40, 255]; // red light
            }
        }

        return CONSOLE_BASE;
    }

    // --- CENTRAL CONSOLE & AUDIO DESK (y: 120 to 240, x: 160 to 480) ---
    if (x >= 160 && x <= 480 && y >= 120 && y <= 240) {
        // Desk border
        if (x === 160 || x === 480 || y === 120 || y === 240) return CONSOLE_DARK;

        // Computer Screen (x: 280 to 360, y: 130 to 175)
        if (x >= 280 && x <= 360 && y >= 130 && y <= 175) {
            if (x === 280 || x === 360 || y === 130 || y === 175) return CONSOLE_DARK;
            // Audio Waveforms (green/yellow lines on black screen)
            const wx = x - 280;
            const wy = y - 130;
            if (wy === 22 + Math.floor(Math.sin(wx / 5) * 8) || wy === 30 + Math.floor(Math.cos(wx / 4) * 6)) {
                if (wx % 2 === 0) return [40, 180, 60, 255]; // green wave
                return [215, 165, 40, 255]; // yellow wave
            }
            return [15, 15, 20, 255]; // black screen
        }
        // Screen stand
        if (x >= 316 && x <= 324 && y >= 175 && y <= 185) return CONSOLE_DARK;

        // Mixing Console (sliders and knobs, x: 180 to 460, y: 185 to 230)
        if (x >= 180 && x <= 460 && y >= 185 && y <= 230) {
            const cx = x - 180;
            const cy = y - 185;
            if (cx % 12 === 0 && cy >= 10 && cy <= 35) {
                // Sliders
                if (cy === 18 || cy === 28) return [220, 40, 40, 255]; // red knob
                return CONSOLE_DARK;
            }
            if (cx % 12 >= 4 && cx % 12 <= 8 && cy >= 2 && cy <= 6) {
                return GOLD; // knobs
            }
            return CONSOLE_BASE;
        }

        // Studio Monitors (Speakers on desk, Left: 190 to 220, Right: 420 to 450, y: 130 to 180)
        if (((x >= 190 && x <= 220) || (x >= 420 && x <= 450)) && y >= 130 && y <= 180) {
            const sx = x >= 190 && x <= 220 ? x - 190 : x - 420;
            const sy = y - 130;
            if (sx === 0 || sx === 30 || sy === 0 || sy === 50) return CONSOLE_DARK;
            // Speaker cones
            const dx = sx - 15;
            const dy1 = sy - 15;
            const dy2 = sy - 35;
            if (dx * dx + dy1 * dy1 <= 9) return [80, 80, 85, 255];
            if (dx * dx + dy2 * dy2 <= 25) return METAL;
            return CONSOLE_BASE;
        }

        return CONSOLE_LIGHT;
    }

    // --- ERGONOMIC OFFICE CHAIR (x: 300 to 340, y: 235 to 275) ---
    if (x >= 300 && x <= 340 && y >= 235 && y <= 275) {
        const cx = x - 300;
        const cy = y - 235;
        // Curved backrest and armrests (black leather)
        if (cx === 0 || cx === 40 || cy === 0 || cy === 40) return [15, 15, 20, 255];
        if (cy >= 30 && cx >= 15 && cx <= 25) return [15, 15, 20, 255]; // chair base pole
        return [35, 35, 40, 255];
    }

    // --- GIANT SPEAKER TOWERS (Baffles, Left: 110 to 150, Right: 490 to 530, y: 130 to 230) ---
    if (((x >= 110 && x <= 150) || (x >= 490 && x <= 530)) && y >= 130 && y <= 230) {
        const sx = x >= 110 && x <= 150 ? x - 110 : x - 490;
        const sy = y - 130;
        if (sx === 0 || sx === 40 || sy === 0 || sy === 100) return [10, 10, 15, 255];
        // Three-way speaker cones
        const dx = sx - 20;
        const dy1 = sy - 20; // tweeter
        const dy2 = sy - 50; // mid-range
        const dy3 = sy - 80; // woofer
        if (dx * dx + dy1 * dy1 <= 16) return [60, 60, 65, 255];
        if (dx * dx + dy2 * dy2 <= 36) return METAL;
        if (dx * dx + dy3 * dy3 <= 64) return [80, 80, 85, 255];
        return [25, 25, 30, 255];
    }

    // --- PERSIAN RUG (Bottom Half, x: 160 to 480, y: 320 to 520) ---
    if (x >= 160 && x <= 480 && y >= 320 && y <= 520) {
        const rx = x - 160;
        const ry = y - 320;

        // Rug border (12 pixels wide)
        if (rx <= 12 || rx >= 308 || ry <= 12 || ry >= 188) {
            // Repeating geometric border pattern (beige and gold)
            if ((rx + ry) % 8 === 0) return RUG_GOLD;
            if ((rx - ry) % 8 === 0) return RUG_BEIGE;
            return RUG_BLUE;
        }

        // Intricate central pattern
        const cx = rx - 160; // center is 160
        const cy = ry - 100; // center is 100
        const distSq = cx * cx + cy * cy;

        // Central medallion (gold and beige)
        if (distSq <= 900) {
            if (distSq <= 100) return RUG_GOLD;
            if ((rx + ry) % 4 === 0) return RUG_BEIGE;
            return RUG_RED;
        }

        // Corner ornaments
        if ((rx < 40 && ry < 40) || (rx > 280 && ry < 40) || (rx < 40 && ry > 160) || (rx > 280 && ry > 160)) {
            return RUG_BEIGE;
        }

        // Base red with subtle pattern
        if ((rx * ry) % 12 === 0) return RUG_GOLD;
        if ((rx + ry) % 16 === 0) return RUG_BLUE;
        return RUG_RED;
    }

    // --- WOODEN PARQUET FLOOR (Default) ---
    // Vertical plank lines every 16 pixels
    if (x % 16 === 0) {
        return WOOD_PARQUET_DARK;
    }
    // Staggered horizontal joints every 48 pixels
    const plankCol = Math.floor(x / 16);
    const jointOffset = (plankCol % 3) * 16;
    if ((y - jointOffset) % 48 === 0) {
        return WOOD_PARQUET_DARK;
    }

    // Wood grain texture
    if ((x + y) % 24 === 0) return WOOD_PARQUET_LIGHT;
    return WOOD_PARQUET;
}

const studioPng = createPng(640, 640, getDetailedStudioPixel);

fs.mkdirSync('frontend/public/assets/tiles', { recursive: true });
fs.writeFileSync('frontend/public/assets/tiles/studio.png', studioPng);
console.log('Successfully generated highly detailed 16-bit Recording Studio background!');
