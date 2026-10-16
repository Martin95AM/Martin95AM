export const PATCH_CHANNELS = [
    { label: 'Voz', color: '#f4b45b' },
    { label: 'Guitarra', color: '#ef7380' },
    { label: 'Batería', color: '#66c7e2' },
    { label: 'Sintetizador', color: '#9cde87' }
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

export function createPatchPuzzle(random = Math.random) {
    const mapping = PATCH_CHANNELS.map((_, index) => index);
    do {
        for (let index = mapping.length - 1; index > 0; index--) {
            const other = Math.floor(random() * (index + 1));
            [mapping[index], mapping[other]] = [mapping[other], mapping[index]];
        }
    } while (countCrossings(mapping) < 2);
    return mapping;
}
