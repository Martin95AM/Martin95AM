export const PATCH_CHANNELS = [
    { label: 'Voz', color: '#f4b45b' },
    { label: 'Guitarra', color: '#ef7380' },
    { label: 'Batería', color: '#66c7e2' },
    { label: 'Sintetizador', color: '#9cde87' },
    { label: 'Bajo', color: '#bb9cf1' },
    { label: 'Teclado', color: '#f19cce' }
];

export const PATCH_STAGES = [
    { name: 'Prueba de sonido', channels: 4, minCrossings: 2 },
    { name: 'Sesión en vivo', channels: 5, minCrossings: 4 },
    { name: 'Mezcla final', channels: 6, minCrossings: 7 }
];

export function countCrossings(mapping) {
    let crossings = 0;
    for (let left = 0; left < mapping.length; left++) {
        for (let right = left + 1; right < mapping.length; right++) {
            if (mapping[left] > mapping[right]) crossings++;
        }
    }
    return crossings;
}

export function swapPlugs(mapping, first, second) {
    const next = [...mapping];
    [next[first], next[second]] = [next[second], next[first]];
    return next;
}

export function getHintPair(mapping) {
    const target = mapping.findIndex((source, slot) => source !== slot);
    return target < 0 ? null : [target, mapping.indexOf(target)];
}

export function createPatchPuzzle(random = Math.random, size = 4, minCrossings = 2) {
    if (!Number.isInteger(size) || size < 2 || size > PATCH_CHANNELS.length) {
        throw new RangeError('Cantidad de canales inválida');
    }
    const sorted = Array.from({ length: size }, (_, index) => index);
    for (let attempt = 0; attempt < 40; attempt++) {
        const mapping = [...sorted];
        for (let index = size - 1; index > 0; index--) {
            const other = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
            [mapping[index], mapping[other]] = [mapping[other], mapping[index]];
        }
        if (countCrossings(mapping) >= minCrossings) return mapping;
    }
    return sorted.reverse();
}
