export function generateIdenticon(seed: string, size = 7): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const r = (((hash >> 16) & 0xff) % 200) + 55;
    const g = (((hash >> 8) & 0xff) % 200) + 55;
    const b = ((hash & 0xff) % 200) + 55;
    const bg = `hsl(${Math.abs(hash) % 360}, 40%, 25%)`;
    const fg = `rgb(${r},${g},${b})`;
    const cells: string[] = [];
    const half = Math.ceil(size / 2);
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < half; col++) {
            const idx = row * size + col;
            const bit = (hash >> (idx % 31)) & 1;
            if (bit) {
                const x1 = col;
                const y1 = row;
                const x2 = size - 1 - col;
                cells.push(`<rect x="${x1}" y="${y1}" width="1" height="1" fill="${fg}"/>`);
                if (x2 !== x1) {
                    cells.push(`<rect x="${x2}" y="${y1}" width="1" height="1" fill="${fg}"/>`);
                }
            }
        }
    }
    return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="80" height="80" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/>${cells.join('')}</svg>`,
    )}`;
}

export function generateAvatarUrl(roleId: string, name: string): string {
    return generateIdenticon(`${roleId}-${name}`);
}
