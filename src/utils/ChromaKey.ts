/**
 * ChromaKey - Utilities for removing white/black backgrounds from images/videos
 */

/**
 * Remove white background from an image, returns a canvas with transparency
 */
export function removeWhiteBackground(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  threshold = 220
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || 1;
    canvas.height = source.videoHeight || 1;
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.width || 1;
    canvas.height = source.height || 1;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }
  
  if (canvas.width === 0 || canvas.height === 0) {
    return canvas;
  }
  
  ctx.drawImage(source, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Remove white pixels
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Remove both white and black backgrounds
 */
export function removeBackground(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  whiteThreshold = 220,
  blackThreshold = 40
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || 1;
    canvas.height = source.videoHeight || 1;
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.width || 1;
    canvas.height = source.height || 1;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }
  
  if (canvas.width === 0 || canvas.height === 0) {
    return canvas;
  }
  
  ctx.drawImage(source, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Remove white pixels
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
      data[i + 3] = 0;
    }
    // Remove black pixels
    else if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
      data[i + 3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Process video frame with cropping and chroma key
 */
export function processVideoFrame(
  video: HTMLVideoElement,
  cropPercentX = 0,
  cropPercentY = 0,
  whiteThreshold = 220
): HTMLCanvasElement {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  
  const cropX = vw * cropPercentX;
  const cropY = vh * cropPercentY;
  const cropWidth = vw * (1 - cropPercentX * 2);
  const cropHeight = vh * (1 - cropPercentY * 2);
  
  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d')!;
  
  ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  
  const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
      data[i + 3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
