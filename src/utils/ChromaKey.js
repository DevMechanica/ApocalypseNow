/**
 * ChromaKey - Background removal utilities
 * Optimized with caching to avoid per-frame processing
 */

// Cache for processed images
const processedCache = new WeakMap();

/**
 * Remove white background from an image
 * Returns a canvas with transparent background
 * @param {HTMLImageElement} img
 * @param {number} threshold - White threshold (0-255)
 * @returns {HTMLCanvasElement}
 */
export function removeWhiteBackground(img, threshold = 220) {
    // Return cached version if available
    if (processedCache.has(img)) {
        return processedCache.get(img);
    }

    // Create processing canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Get and process image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Remove white/near-white pixels
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // Set alpha to 0
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Cache the result
    processedCache.set(img, canvas);

    return canvas;
}

/**
 * Remove white background from a video frame
 * Note: Video frames cannot be cached, must process each frame
 * @param {CanvasRenderingContext2D} tempCtx
 * @param {number} width
 * @param {number} height
 * @param {number} threshold
 */
export function processVideoFrame(tempCtx, width, height, threshold = 220) {
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);
}

/**
 * Remove both white and black backgrounds
 * @param {CanvasRenderingContext2D} tempCtx
 * @param {number} width
 * @param {number} height
 * @param {number} whiteThreshold
 * @param {number} blackThreshold
 */
export function removeWhiteAndBlack(tempCtx, width, height, whiteThreshold = 220, blackThreshold = 40) {
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Remove white
        if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            data[i + 3] = 0;
        }
        // Remove black
        else if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);
}

export default {
    removeWhiteBackground,
    processVideoFrame,
    removeWhiteAndBlack
};
