/**
 * Apocalypse Bunker Game
 * A 2D game with character movement on a bunker map
 */

// Game configuration
const CONFIG = {
    // Map settings
    mapPath: 'New_maps/bunker_map_composite.png',

    // Character settings
    characterPath: 'characters/Gemini_Generated_Image_mq54v5mq54v5mq54.png',
    characterScale: 0.12,  // Scale down the character sprite
    characterSpeed: 5,

    // Chroma key settings for removing white background
    chromaKeyThreshold: 200,  // Lower threshold to catch light gray edges

    // Mobile 9:16 aspect ratio - will be calculated based on map width
    aspectRatio: 9 / 16
};

// Game state
const gameState = {
    character: {
        x: 400,
        y: 300,
        width: 0,
        height: 0,
        facingRight: true
    },
    camera: {
        x: 0,
        y: 0
    },
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    },
    images: {
        map: null,
        character: null,
        characterProcessed: null
    },
    mapDimensions: {
        width: 0,
        height: 0
    },
    // Resource state
    resources: {
        cash: { current: 12500, max: 0 }, // Max 0 implies no bar cap or special handling
        food: { current: 820, max: 1000 },
        wheat: { current: 470, max: 500 },
        energy: { current: 150, max: 200 }
    }
};

// DOM elements
let canvas, ctx;

/**
 * Remove white background from an image using chroma key with edge cleanup
 */
function removeWhiteBackground(image, threshold = CONFIG.chromaKeyThreshold) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(image, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const width = tempCanvas.width;
    const height = tempCanvas.height;

    // First pass: Remove white/near-white pixels
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate brightness
        const brightness = (r + g + b) / 3;

        // If pixel is white/near-white or very light gray, make it transparent
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // Set alpha to 0
        } else if (brightness > 230) {
            // Fade out light pixels near the edge
            data[i + 3] = Math.max(0, 255 - (brightness - 200) * 3);
        }
    }

    // Second pass: Clean up edge pixels (remove white fringe)
    const cleanedData = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];

            if (alpha > 0 && alpha < 255) {
                // Check if this is an edge pixel next to transparent pixels
                const neighbors = [
                    ((y - 1) * width + x) * 4,
                    ((y + 1) * width + x) * 4,
                    (y * width + (x - 1)) * 4,
                    (y * width + (x + 1)) * 4
                ];

                let transparentNeighbors = 0;
                for (const nIdx of neighbors) {
                    if (data[nIdx + 3] === 0) transparentNeighbors++;
                }

                // If surrounded by transparent pixels, make this more transparent
                if (transparentNeighbors >= 2) {
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    if (brightness > 180) {
                        cleanedData[idx + 3] = 0;
                    }
                }
            }
        }
    }

    tempCtx.putImageData(new ImageData(cleanedData, width, height), 0, 0);
    return tempCanvas;
}

/**
 * Load an image and return a promise
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Initialize the game
 */
async function init() {
    // Get canvas and context
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Load images first to get map dimensions
    // Load images
    console.log('Loading images...');
    try {
        gameState.images.map = await loadImage(CONFIG.mapPath);
        const characterImg = await loadImage(CONFIG.characterPath);

        // Process character image to remove white background
        gameState.images.characterProcessed = removeWhiteBackground(characterImg);

        // Store map dimensions
        gameState.mapDimensions.width = gameState.images.map.width;
        gameState.mapDimensions.height = gameState.images.map.height;

        // Mobile Layout: Set canvas to full map width with 9:16 aspect ratio
        const targetAspectRatio = 9 / 16; // Mobile portrait

        // Set canvas dimensions
        // We want the width to match the map width so we see the full width
        canvas.width = gameState.images.map.width;
        // Height is determined by aspect ratio
        canvas.height = canvas.width / targetAspectRatio;

        // Update viewport config
        CONFIG.viewportWidth = canvas.width;
        CONFIG.viewportHeight = canvas.height;

        console.log(`Canvas set to mobile layout: ${canvas.width}x${canvas.height} (Aspect: ${targetAspectRatio})`);

        // Helper to center the canvas on screen via CSS
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100vh';
        canvas.style.objectFit = 'contain';

        // Calculate character dimensions based on scale
        gameState.character.width = characterImg.width * CONFIG.characterScale;
        gameState.character.height = characterImg.height * CONFIG.characterScale;

        // Position character in the middle of the first room
        gameState.character.x = gameState.mapDimensions.width / 2 - gameState.character.width / 2;
        gameState.character.y = 80; // Adjusted for new scale

        console.log('Images loaded successfully');
        console.log(`Map size: ${gameState.mapDimensions.width}x${gameState.mapDimensions.height}`);
        console.log(`Character size: ${gameState.character.width}x${gameState.character.height}`);

    } catch (error) {
        console.error('Failed to load images:', error);
        return;
    }

    // Set up input handlers
    setupInputHandlers();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

/**
 * Set up keyboard and touch input handlers
 */
function setupInputHandlers() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                gameState.keys.up = true;
                break;
            case 's':
            case 'arrowdown':
                gameState.keys.down = true;
                break;
            case 'a':
            case 'arrowleft':
                gameState.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                gameState.keys.right = true;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                gameState.keys.up = false;
                break;
            case 's':
            case 'arrowdown':
                gameState.keys.down = false;
                break;
            case 'a':
            case 'arrowleft':
                gameState.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                gameState.keys.right = false;
                break;
        }
    });

    // Touch controls for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', () => {
        gameState.keys.up = false;
        gameState.keys.down = false;
        gameState.keys.left = false;
        gameState.keys.right = false;
    });
}

/**
 * Handle touch input for mobile devices
 */
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // Calculate direction based on touch position relative to center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = touchX - centerX;
    const dy = touchY - centerY;

    // Reset all keys
    gameState.keys.up = false;
    gameState.keys.down = false;
    gameState.keys.left = false;
    gameState.keys.right = false;

    // Set direction based on touch position
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) gameState.keys.right = true;
        else if (dx < -30) gameState.keys.left = true;
    } else {
        if (dy > 30) gameState.keys.down = true;
        else if (dy < -30) gameState.keys.up = true;
    }
}

/**
 * Update game state
 */
function update() {
    const speed = CONFIG.characterSpeed;
    let newX = gameState.character.x;
    let newY = gameState.character.y;

    // Handle movement
    if (gameState.keys.up) newY -= speed;
    if (gameState.keys.down) newY += speed;
    if (gameState.keys.left) {
        newX -= speed;
        gameState.character.facingRight = false;
    }
    if (gameState.keys.right) {
        newX += speed;
        gameState.character.facingRight = true;
    }

    // Boundary checking
    const padding = 20;
    newX = Math.max(padding, Math.min(newX, gameState.mapDimensions.width - gameState.character.width - padding));
    newY = Math.max(padding, Math.min(newY, gameState.mapDimensions.height - gameState.character.height - padding));

    gameState.character.x = newX;
    gameState.character.y = newY;

    // Update camera to follow character
    updateCamera();
}

/**
 * Update camera position to follow the character
 */
function updateCamera() {
    // Center camera on character
    let targetX = gameState.character.x + gameState.character.width / 2 - canvas.width / 2;
    let targetY = gameState.character.y + gameState.character.height / 2 - canvas.height / 2;

    // Clamp camera to map boundaries
    targetX = Math.max(0, Math.min(targetX, gameState.mapDimensions.width - canvas.width));
    targetY = Math.max(0, Math.min(targetY, gameState.mapDimensions.height - canvas.height));

    // Smooth camera movement
    gameState.camera.x += (targetX - gameState.camera.x) * 0.1;
    gameState.camera.y += (targetY - gameState.camera.y) * 0.1;
}

/**
 * Render the game
 */
function render() {
    // Clear canvas
    ctx.fillStyle = '#0a1428';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw map
    if (gameState.images.map) {
        ctx.drawImage(
            gameState.images.map,
            -gameState.camera.x,
            -gameState.camera.y
        );
    }

    // Draw character
    if (gameState.images.characterProcessed) {
        ctx.save();

        const drawX = gameState.character.x - gameState.camera.x;
        const drawY = gameState.character.y - gameState.camera.y;

        // Flip character if facing left
        if (!gameState.character.facingRight) {
            ctx.translate(drawX + gameState.character.width, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                gameState.images.characterProcessed,
                0,
                0,
                gameState.character.width,
                gameState.character.height
            );
        } else {
            ctx.drawImage(
                gameState.images.characterProcessed,
                drawX,
                drawY,
                gameState.character.width,
                gameState.character.height
            );
        }

        ctx.restore();
    }

    // Draw simple UI hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Arial';
    ctx.fillText('Use WASD or Arrow Keys to move', 10, 25);
}

/**
 * Update UI elements based on game state
 */
function updateUI() {
    // Helper to format currency
    const formatCurrency = (val) => '$' + val.toLocaleString();

    // Update Cash
    document.querySelector('#res-cash .res-text').textContent = formatCurrency(gameState.resources.cash.current);
    // Cash usually doesn't have a max bar in this context, but let's just leave the bar at 100% or based on some arbitrary goal

    // Update Food
    const food = gameState.resources.food;
    document.querySelector('#res-food .res-text').textContent = `${food.current}/${food.max}`;
    document.querySelector('#res-food .res-fill').style.width = `${(food.current / food.max) * 100}%`;

    // Update Wheat
    const wheat = gameState.resources.wheat;
    document.querySelector('#res-wheat .res-text').textContent = `${wheat.current}/${wheat.max}`;
    document.querySelector('#res-wheat .res-fill').style.width = `${(wheat.current / wheat.max) * 100}%`;

    // Update Energy
    const energy = gameState.resources.energy;
    document.querySelector('#res-energy .res-text').textContent = `${energy.current}/${energy.max}`;
    document.querySelector('#res-energy .res-fill').style.width = `${(energy.current / energy.max) * 100}%`;
}

/**
 * Setup UI Button Handlers
 */
function setupUIHandlers() {
    document.getElementById('build-btn').addEventListener('click', () => {
        console.log('Build button clicked');
        // Add minimal feedback
        const btn = document.getElementById('build-btn');
        btn.style.transform = 'translateY(4px)';
        setTimeout(() => btn.style.transform = '', 100);
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
        console.log('Pause clicked');
        // Toggle pause state here later
    });

    // Sidebar buttons
    const circles = document.querySelectorAll('.circle-btn');
    circles.forEach(btn => {
        btn.addEventListener('click', () => console.log('Sidebar button clicked'));
    });
}

/**
 * Main game loop
 */
function gameLoop() {
    update();
    render();
    updateUI(); // Keep UI in sync
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', async () => {
    await init();
    setupUIHandlers();
});
