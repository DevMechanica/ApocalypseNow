const fs = require('fs');
const path = require('path');

const files = [
    'New_maps/bunker_map_composite.png',
    'New_maps/Gemini_Generated_Image_d0xhhqd0xhhqd0xh.png',
    // Assuming these are the ones used based on naming conventions or size
    // The previous script referenced specific files, let's try to guess or just read all in dir
];

// Helper to read 32-bit big-endian int at offset
function readUInt32BE(buffer, offset) {
    return (buffer[offset] << 24) + (buffer[offset + 1] << 16) + (buffer[offset + 2] << 8) + buffer[offset + 3];
}

function getPngDims(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(24);
        fs.readSync(fd, buffer, 0, 24, 0);
        fs.closeSync(fd);

        // PNG Width at 16, Height at 20
        const width = readUInt32BE(buffer, 16);
        const height = readUInt32BE(buffer, 20);
        return { width, height };
    } catch (e) {
        return null;
    }
}

// Read all pngs in New_maps to be sure
const dir = 'New_maps';
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.png')) {
        const dims = getPngDims(path.join(dir, file));
        if (dims) console.log(`${file}: ${dims.width}x${dims.height}`);
    }
});
