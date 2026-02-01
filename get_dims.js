const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const signature = Buffer.alloc(8);
    fs.readSync(fd, signature, 0, 8, 0);

    // Check PNG signature
    if (signature.toString('hex') !== '89504e470d0a1a0a') {
        fs.closeSync(fd);
        throw new Error('Not a PNG');
    }

    const ihdr = Buffer.alloc(25);
    fs.readSync(fd, ihdr, 0, 25, 8); // Skip signature, read chunk size (4), type (4), data

    // IHDR data starts at offset 8 (after size 4 + type 4) inside result? 
    // Actually:
    // Offset 8: Start of chunk 1.
    // Length: 4 bytes.
    // Type: 4 bytes (IHDR).
    // Width: 4 bytes.
    // Height: 4 bytes.

    // Let's just read specific bytes for Width/Height
    // File Offset 16 = Width (4 bytes)
    // File Offset 20 = Height (4 bytes)

    const dims = Buffer.alloc(8);
    fs.readSync(fd, dims, 0, 8, 16);

    const width = dims.readUInt32BE(0);
    const height = dims.readUInt32BE(4);

    fs.closeSync(fd);
    return { width, height };
}

const files = [
    'New_maps/background_city.png',
    'New_maps/image.png',       // Normal Room
    'New_maps/image copy.png'   // Entrance
];

files.forEach(f => {
    try {
        const p = path.resolve(__dirname, f);
        const dims = getPngDimensions(p);
        console.log(`${f}: ${dims.width}x${dims.height}`);
    } catch (e) {
        console.error(`${f}: Error ${e.message}`);
    }
});
