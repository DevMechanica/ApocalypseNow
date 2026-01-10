// LEVER FIX - Replace the section starting at line ~1564 in game.js
// This code creates BIGGER levers (25% width), LOWER position (48%), CLOSER spacing (15%)
// With REAL-TIME CANVAS CHROMA KEY to remove white background

// Replace lines 1564-1617 with this:

// Create lever rendering system - canvas with chroma key
const leversContainer = document.getElementById('levers-container');
gameState.leverVideos = [];
gameState.leverCanvases = [];

// MUCH BIGGER (25%), LOWER (48%), and CLOSER (15% spacing)
const leverPositions = [
    { left: '15%', top: '48%' },  // Lever 1
    { left: '30%', top: '48%' },  // Lever 2  
    { left: '45%', top: '48%' },  // Lever 3
    { left: '60%', top: '48%' },  // Lever 4
    { left: '75%', top: '48%' }   // Lever 5
];

leverPositions.forEach((pos, i) => {
    // Hidden video source
    const video = document.createElement('video');
    video.src = 'Maps/Generator_Room_Zoomed/download (55).mp4';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;
    video.style.display = 'none';
    video.currentTime = 0;
    document.body.appendChild(video);

    // Visible canvas with chroma key
    const canvas = document.createElement('canvas');
    canvas.className = 'lever-canvas';
    canvas.dataset.index = i;
    canvas.style.cssText = `
            position: absolute;
            left: ${pos.left};
            top: ${pos.top};
            transform: translate(-50%, -50%);
            width: 25%;
            height: auto;
            cursor: pointer;
            filter: drop-shadow(2px 2px 6px rgba(0,0,0,0.7));
        `;

    // Setup once video loads
    video.addEventListener('loadeddata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        renderLeverFrame(i); // Initial render
    });

    // Click handler
    canvas.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCircuitBreakerWithAnimation(i);
    });

    leversContainer.appendChild(canvas);
    gameState.leverVideos.push(video);
    gameState.leverCanvases.push(canvas);

    video.load();
});

// ALSO ADD THIS NEW FUNCTION (after processVideoChromaKey):

function renderLeverFrame(index) {
    const video = gameState.leverVideos[index];
    const canvas = gameState.leverCanvases[index];
    if (!video || !canvas || !video.videoWidth) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);

    // Apply chroma key to remove white background
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Remove white pixels
        if (r > 200 && g > 200 && b > 200) {
            data[i + 3] = 0;
        }
        // Remove very dark pixels (black borders)
        else if (r < 30 && g < 30 && b < 30) {
            data[i + 3] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// UPDATE animateLeverVideo function to call renderLeverFrame:
function animateLeverVideo(index) {
    const video = gameState.leverVideos[index];
    if (!video) return;

    const isUp = gameState.circuitBreakers[index];
    const targetTime = isUp ? 0.4 : 0;

    // Play animation
    video.currentTime = isUp ? 0 : 0.4; // Start from opposite state  
    video.play().then(() => {
        // Animate frame by frame
        const animateFrame = () => {
            renderLeverFrame(index);
            if (!video.paused) {
                requestAnimationFrame(animateFrame);
            }
        };
        animateFrame();

        // Seek to target frame when short anim is done
        setTimeout(() => {
            video.pause();
            video.currentTime = targetTime;
            renderLeverFrame(index);
        }, 200);
    }).catch(err => {
        // Fallback: just seek without animation
        video.currentTime = targetTime;
        renderLeverFrame(index);
    });
}
