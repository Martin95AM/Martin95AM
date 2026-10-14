// Shared high-resolution art with six-head proportions and articulated limbs.
// Render at 3x resolution while preserving the existing world-space footprint.
export const ART_SCALE = 1 / 3;
export const FRAME_WIDTH = 96;
export const FRAME_HEIGHT = 144;

const palettes = {
    guard: { cloth: '#e4e4d9', light: '#fffbed', shade: '#919ba4', deep: '#525e72', hair: '#30323b', skin: '#c59370', skinLight: '#e0b18a', accent: '#bf9b56' },
    martin: { cloth: '#e7edf2', light: '#ffffff', shade: '#9dafc3', deep: '#526785', hair: '#493125', skin: '#cb9068', skinLight: '#edbb90', accent: '#b74143' },
    technician: { cloth: '#237a7c', light: '#4caba7', shade: '#164d59', deep: '#142e3c', hair: '#202331', skin: '#ac7558', skinLight: '#d49d75', accent: '#f3a14c' }
};

const studentPalettes = {
    yellow: { cloth: '#e8ece9', light: '#fffdf3', shade: '#91a1aa', deep: '#455467', hair: '#49352f', skin: '#d49770', skinLight: '#efba8f', accent: '#e1bd34' },
    orange: { cloth: '#e4e9e8', light: '#fffdf3', shade: '#899ca8', deep: '#405064', hair: '#252938', skin: '#b97959', skinLight: '#dca17b', accent: '#df6d2e' },
    green: { cloth: '#e6ebe7', light: '#fffdf3', shade: '#8da09f', deep: '#43545e', hair: '#1d2028', skin: '#895840', skinLight: '#b27656', accent: '#329557' },
    blue: { cloth: '#e7ebed', light: '#fffdf3', shade: '#91a1ad', deep: '#435267', hair: '#985b36', skin: '#d9a078', skinLight: '#f0bd91', accent: '#356fbe' },
    brown: { cloth: '#e3e8e6', light: '#fffdf3', shade: '#87999f', deep: '#3f4d5b', hair: '#30262a', skin: '#6f493b', skinLight: '#976753', accent: '#76482d' }
};

export function drawCharacter(ctx, character, direction = 'down', pose = 'idle', step = 0) {
    const casual = character.includes('casual');
    const technician = character === 'tecnico_casual';
    const sensei = character === 'guard';
    const studentColor = character.startsWith('student_') ? character.replace('student_', '') : null;
    const student = Boolean(studentColor);
    const martin = character === 'martin' || character.startsWith('martin_');
    const p = studentColor ? studentPalettes[studentColor]
        : technician ? palettes.technician : sensei ? palettes.guard : palettes.martin;
    const clothed = casual || technician;
    const side = direction === 'left' || direction === 'right';
    const back = direction === 'up';
    const fighting = ['block', 'punch', 'kick'].includes(pose);
    // Four deliberately distinct gait phases keep the feet from appearing to
    // slide: rear contact, passing position, front contact, then recovery.
    // These coordinates live in the high-resolution canvas and are scaled down
    // to the established 32×48 world footprint below.
    const gait = pose === 'walk'
        ? [[-7, 7], [-2, 2], [7, -7], [2, -2]][step % 4]
        : [0, 0];
    const rearStride = gait[0];
    const frontStride = gait[1];
    const armStride = rearStride;
    const outline = '#1c2332';
    ctx.save();
    if (direction === 'left') { ctx.translate(96, 0); ctx.scale(-1, 1); }
    const poly = (points, fill, stroke = outline, width = 1.5) => {
        ctx.beginPath(); ctx.moveTo(...points[0]);
        for (const point of points.slice(1)) ctx.lineTo(...point);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); }
    };
    const line = (points, color, width = 1.5) => {
        ctx.beginPath(); ctx.moveTo(...points[0]);
        for (const point of points.slice(1)) ctx.lineTo(...point);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
    };
    const segment = (a, b, w1, w2, fill, highlight) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
        poly([[a[0]+nx*w1/2,a[1]+ny*w1/2],[b[0]+nx*w2/2,b[1]+ny*w2/2],
            [b[0]-nx*w2/2,b[1]-ny*w2/2],[a[0]-nx*w1/2,a[1]-ny*w1/2]], fill);
        if (highlight) line([[a[0]-nx*w1/4,a[1]-ny*w1/4],[b[0]-nx*w2/4,b[1]-ny*w2/4]], highlight, 2);
    };
    const hand = ([x,y]) => {
        poly([[x-3,y-3],[x+3,y-4],[x+5,y],[x+3,y+5],[x-3,y+4]], p.skin);
        line([[x-1,y-1],[x+3,y-1]], p.skinLight, 2);
    };
    const foot = ([x,y], rear = false) => {
        poly([[x-4,y-2],[x+3,y-2],[x+8,y+3],[x+8,y+6],[x-5,y+6]], clothed ? '#232b3b' : rear ? p.skin : p.skinLight);
        line([[x-3,y+5],[x+7,y+5]], clothed ? '#91a1ae' : p.skin, 1.5);
    };
    const trousers = clothed ? '#303e53' : p.cloth;
    const trouserShade = clothed ? '#1f293d' : p.shade;
    const trouserLight = clothed ? '#536078' : p.light;

    if (pose === 'pushup') {
        const y = step % 2 ? 116 : 104;
        segment([31,y], [63,y+7], 17, 13, p.cloth, p.light);
        segment([63,y+7], [82,130], 12, 6, trouserShade, trouserLight);
        segment([32,y+3], [24,y+14], 10, 7, p.shade, p.light);
        segment([24,y+14], [29,132], 7, 6, p.cloth, p.light); hand([29,134]);
        poly([[15,y-15],[27,y-17],[33,y-9],[30,y+3],[19,y+4],[14,y-3]], p.skin);
        poly([[15,y-15],[27,y-17],[33,y-9],[25,y-10],[19,y-3],[14,y-3]], p.hair);
        line([[18,y-2],[21,y-2]], outline, 2); foot([84,130]);
        segment([58,y+4],[56,y+13],4,4,outline);
        ctx.restore(); return;
    }

    const leftHip = [side ? 45 : 40, 81], rightHip = [side ? 52 : 55, 81];
    let rearKnee = [side ? 40 + rearStride * 0.7 : 36, 105 + rearStride * 0.45],
        rearAnkle = [side ? 34 + rearStride : 34 - rearStride * 0.28, 130 + rearStride * 0.18];
    let frontKnee = [side ? 56 + frontStride * 0.7 : 59, 105 + frontStride * 0.45],
        frontAnkle = [side ? 61 + frontStride : 62 - frontStride * 0.28, 130 + frontStride * 0.18];
    if (fighting) {
        rearKnee = [31,105]; rearAnkle = [22,130]; frontKnee = [65,107]; frontAnkle = [74,130];
    }
    if (pose === 'kick') {
        frontKnee = side ? [78,76] : [63,back ? 65 : 98];
        frontAnkle = side ? [121,67] : [70,back ? 41 : 130];
    }
    segment(leftHip,rearKnee,15,11,trouserShade,trouserLight);
    segment(rearKnee,rearAnkle,11,7,trouserShade,trouserLight); foot(rearAnkle,true);
    segment(rightHip,frontKnee,16,12,trousers,trouserLight);
    segment(frontKnee,frontAnkle,12,7,trousers,trouserLight); foot(frontAnkle);
    line([[frontKnee[0]-3,frontKnee[1]-3],[frontKnee[0]+4,frontKnee[1]]],p.deep);

    const shoulders = side ? [[42,44],[54,44]] : [[33,44],[61,44]];
    let rearElbow = [side ? 33 : 26,64+armStride*0.55], rearHand = [side ? 35-armStride : 27,82+armStride*0.55];
    let frontElbow = [side ? 62 : 68,64-armStride*0.55], frontHand = [side ? 62+armStride : 67,82-armStride*0.55];
    if (fighting) { rearElbow = [30,61]; rearHand = [40,51]; frontElbow = [70,60]; frontHand = [67,36]; }
    if (pose === 'punch') {
        frontElbow = side ? [81,46] : [65,back ? 32 : 65];
        frontHand = side ? [111,43] : [66,back ? 13 : 86];
    }
    if (pose === 'block') { frontElbow = [73,42]; frontHand = [64,21]; }
    const arm = (shoulder, elbow, wrist, rear) => {
        const fill = rear ? p.shade : clothed && !technician ? '#344d6a' : p.cloth;
        segment(shoulder,elbow,12,9,fill,p.light);
        segment(elbow,wrist,9,6,fill,p.light);
        line([[elbow[0]-3,elbow[1]],[elbow[0]+3,elbow[1]+2]],p.deep); hand(wrist);
    };
    arm(shoulders[0],rearElbow,rearHand,true);
    poly([[shoulders[0][0]-2,43],[41,37],[54,37],[shoulders[1][0]+3,43],[59,64],[58,82],[36,82],[35,64]],
        clothed ? (technician ? p.cloth : '#344d6a') : p.cloth);
    poly([[53,40],[63,44],[57,80],[49,80],[53,60]], clothed ? '#193944' : p.shade,null);
    if (!back) {
        poly([[42,36],[53,36],[51,46],[46,51],[40,42]],p.skin);
        if (!clothed) {
            poly([[39,38],[48,48],[56,40],[59,45],[47,59],[35,43]],p.light);
            line([[39,39],[48,49],[42,71]],p.deep,2);
            line([[56,41],[47,55],[43,76]],p.shade,2);
            line([[55,53],[58,53],[56,59],[59,59]],p.accent,1.8);
        } else {
            poly([[42,41],[48,46],[54,40],[55,78],[42,78]],'#1b2433');
            line([[39,44],[40,77]],p.light,1);
            line([[58,46],[56,77]],p.light,1);
            poly([[32,53],[39,53],[39,62],[33,61]],technician ? p.shade : '#293b53');
        }
    } else {
        line([[40,43],[48,47],[56,43]],p.shade,2);
        line([[48,48],[49,72]],p.shade,1.2);
    }
    for (const fold of [[[36,62],[42,67]],[[58,65],[52,70]],[[36,77],[42,75]]]) line(fold,p.deep,1);
    if (!clothed) {
        const beltColor = (martin || student) ? p.accent : '#20232d';
        // Red for Martín, rank colors for the students, and black for Sensei.
        // This is deliberately a broad, high-contrast shape so it survives the
        // final 1/3 display scale of the maps.
        poly([[35,77],[59,77],[59,83],[35,83]],beltColor);
        line([[36,78],[58,78]],p.light,0.9);
        if (!back) {
            const tailShade = (martin || student) ? beltColor : '#232737';
            poly([[46,78],[51,80],[49,85],[45,84]],'#101725');
            poly([[46,83],[49,84],[46,100],[42,98]],tailShade);
            poly([[49,83],[52,83],[57,95],[53,97]],tailShade);
            line([[44,94],[46,94]],martin || student ? p.light : p.accent,1.4);
        }
    }

    // Visible neck, brows, nose and jaw; Sensei has stubble and silver temples.
    poly([[43,31],[53,31],[54,40],[48,44],[42,38]],p.skin);
    const face = side ? [[42,15],[54,14],[57,20],[60,25],[56,27],[55,33],[48,37],[41,30]]
        : [[39,16],[44,12],[52,12],[57,16],[56,29],[52,35],[45,35],[40,29]];
    poly(face,back ? p.hair : p.skin);
    if (!back) {
        poly(side ? [[48,18],[54,18],[55,25],[52,30],[47,31]] : [[43,18],[51,16],[53,24],[49,30],[44,29]],p.skinLight,null);
        line(side ? [[51,21],[55,21]] : [[42,21],[46,21]],outline,1.7);
        if (!side) line([[51,21],[54,21]],outline,1.7);
        line(side ? [[55,23],[57,26],[54,26]] : [[49,23],[48,27],[50,27]],'#885b4b',1);
        line(side ? [[52,30],[55,30]] : [[46,31],[51,31]],'#794f48',1.2);
        if (sensei) line([[42,28],[45,33],[51,34],[55,29]],'#705b56',2);
        if (martin || technician) {
            // Short boxed beard and moustache: compact enough to stay readable
            // at 32px while matching the approved character concept for Martín
            // and the bearded studio technician.
            poly(side ? [[48,26],[56,26],[55,31],[51,34],[47,30]] : [[43,26],[53,26],[52,32],[48,35],[43,31]], '#35251f', null);
            line(side ? [[50,25],[55,25]] : [[45,25],[51,25]], '#35251f', 1.6);
        }
    }
    poly([[39,24],[37,18],[39,11],[43,8],[54,9],[58,14],[56,19],[51,16],[46,17],[42,15],[42,24]],p.hair);
    line([[41,13],[47,11],[54,13]],sensei ? '#6f737b' : '#765142',2);
    if (technician && !back) {
        // Compact glasses distinguish the sound engineer from the dojo cast.
        line([[40,21],[46,21],[47,23],[41,23],[40,21]],'#0b1522',1);
        line([[51,21],[56,21],[56,23],[51,23],[51,21]],'#0b1522',1);
        line([[47,22],[51,22]],'#0b1522',1);
    }
    if (sensei) { line([[39,19],[41,26]],'#aaa9a3',2.5); if (!side) line([[56,19],[55,26]],'#aaa9a3',2); }
    if (back) poly([[40,20],[55,20],[55,30],[51,34],[44,33],[40,28]],p.hair);
    arm(shoulders[1],frontElbow,frontHand,false);

    if (technician || character === 'martin_casual_headphones') {
        const onHead = !technician;
        line(onHead ? [[37,24],[37,12],[42,6],[53,6],[59,13],[59,24]] : [[37,37],[37,44],[43,49],[54,48],[59,40]],'#1a2030',4);
        for (const x of [onHead ? 36 : 37,onHead ? 57 : 55]) {
            const y = onHead ? 20 : 40;
            poly([[x-2,y],[x+3,y],[x+3,y+9],[x-2,y+9]],p.accent);
            line([[x,y+2],[x,y+7]],'#ffe1a6',1);
        }
    }
    ctx.restore();
}

export function createCharacterTextures(scene) {
    for (const key of ['martin','guard','martin_casual','martin_casual_headphones','tecnico_casual']) {
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const texture = scene.textures.createCanvas(key, FRAME_WIDTH * 4, FRAME_HEIGHT * 5);
        for (let frame = 0; frame < 20; frame++) {
            const x = frame % 4 * FRAME_WIDTH, y = Math.floor(frame / 4) * FRAME_HEIGHT;
            texture.context.save(); texture.context.translate(x,y);
            // The movement sheets use a full four-frame walk, rather than an
            // idle frame followed by three near-identical steps. Idle animations
            // still use frame 0, whose planted pose reads cleanly when stationary.
            drawCharacter(texture.context,key,['down','left','right','up'][Math.floor(frame / 4)] || 'left',frame >= 16 ? 'pushup' : 'walk',frame % 4);
            texture.context.restore();
            texture.add(frame,0,x,y,FRAME_WIDTH,FRAME_HEIGHT);
        }
        texture.refresh();
    }

    // Students use the same high-resolution renderer, proportions and lighting as
    // Martín and Sensei. Their four-frame sheet keeps the existing scene API:
    // two calm stance frames followed by two push-up frames.
    for (const color of Object.keys(studentPalettes)) {
        const key = `student_${color}`;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const texture = scene.textures.createCanvas(key, FRAME_WIDTH * 4, FRAME_HEIGHT);
        for (let frame = 0; frame < 4; frame++) {
            texture.context.save();
            texture.context.translate(frame * FRAME_WIDTH, frame === 1 ? -1 : 0);
            drawCharacter(texture.context, key, 'left', frame < 2 ? 'idle' : 'pushup', frame);
            texture.context.restore();
            texture.add(frame, 0, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT);
        }
        texture.refresh();
    }
}
