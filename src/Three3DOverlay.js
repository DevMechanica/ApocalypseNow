/**
 * Three3DOverlay.js
 * 
 * Manages a Three.js scene rendered on top of Phaser.
 * Handles GLB model loading, camera sync, and render loop.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Three3DOverlay {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.models = []; // Array for stacked rooms
        this.loader = null;
        this.container = null;
        this.isInitialized = false;

        // Bunker positioning (matches Phaser game layout)
        this.bunkerConfig = {
            floors: 3,
            roomSpacing: 0.35, // Vertical spacing between floors (very close)
            startY: 0.2, // Top floor Y position
            offsetX: 0, // Horizontal offset (centered)
            offsetZ: 0, // Depth offset
            scale: 0.6 // Room scale (bigger)
        };
    }

    /**
     * Initialize the Three.js scene, camera, and renderer.
     * @param {HTMLElement} container - The DOM element to attach the canvas to.
     * @param {number} width - Initial canvas width.
     * @param {number} height - Initial canvas height.
     */
    init(container, width = 720, height = 1280) {
        if (this.isInitialized) {
            console.warn('Three3DOverlay already initialized.');
            return;
        }

        this.container = container;

        // Create Scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        // Create Orthographic Camera for 2D-style alignment with bunker
        const aspect = width / height;
        const frustumSize = 4;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        // Position camera to view from front
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        // Create Renderer with transparency
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.loader = new GLTFLoader();

        this.isInitialized = true;
        console.log('[Three3DOverlay] Initialized successfully.');
    }

    /**
     * Set up scene lighting.
     */
    setupLights() {
        // Maximum ambient light for full illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 6.0);
        this.scene.add(ambientLight);

        // Main directional light from front
        const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
        directionalLight.position.set(0, 2, 10);
        this.scene.add(directionalLight);

        // Top-down fill light
        const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
        topLight.position.set(0, 10, 0);
        this.scene.add(topLight);

        // Side fill lights
        const leftLight = new THREE.DirectionalLight(0xffffff, 1.0);
        leftLight.position.set(-5, 2, 5);
        this.scene.add(leftLight);

        const rightLight = new THREE.DirectionalLight(0xffffff, 1.0);
        rightLight.position.set(5, 2, 5);
        this.scene.add(rightLight);
    }

    /**
     * Load a GLB model and stack it for each floor.
     * @param {string} path - Path to the GLB file.
     * @param {number} floorCount - Number of floors to stack.
     * @returns {Promise<THREE.Group[]>} - Array of loaded models.
     */
    loadAndStackRooms(path, floorCount = 3) {
        return new Promise((resolve, reject) => {
            if (!this.loader) {
                reject(new Error('Loader not initialized. Call init() first.'));
                return;
            }

            this.loader.load(
                path,
                (gltf) => {
                    const originalModel = gltf.scene;

                    // Get bounding box to calculate proper spacing
                    const box = new THREE.Box3().setFromObject(originalModel);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    // Calculate room height for stacking
                    const roomHeight = size.y * this.bunkerConfig.scale;

                    // Clear existing models
                    this.models.forEach(m => this.scene.remove(m));
                    this.models = [];

                    // Create and position each floor
                    for (let i = 0; i < floorCount; i++) {
                        const roomClone = originalModel.clone();

                        // Scale the room
                        roomClone.scale.setScalar(this.bunkerConfig.scale);

                        // Center the room horizontally
                        roomClone.position.x = this.bunkerConfig.offsetX - (center.x * this.bunkerConfig.scale);

                        // Stack vertically (top to bottom like bunker floors)
                        const yPos = this.bunkerConfig.startY - (i * this.bunkerConfig.roomSpacing);
                        roomClone.position.y = yPos - (center.y * this.bunkerConfig.scale);

                        roomClone.position.z = this.bunkerConfig.offsetZ;

                        this.scene.add(roomClone);
                        this.models.push(roomClone);

                        console.log(`[Three3DOverlay] Floor ${i + 1} placed at Y: ${yPos.toFixed(2)}`);
                    }

                    console.log(`[Three3DOverlay] Loaded ${floorCount} floors from: ${path}`);
                    resolve(this.models);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(1);
                        console.log(`[Three3DOverlay] Loading: ${percent}%`);
                    }
                },
                (error) => {
                    console.error('[Three3DOverlay] Failed to load model:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Legacy single model loader (for backwards compatibility).
     */
    loadModel(path) {
        return this.loadAndStackRooms(path, this.bunkerConfig.floors);
    }

    /**
     * Update loop - call from Phaser's update method.
     */
    update(time, delta) {
        if (!this.isInitialized) return;

        // Static rooms - no rotation
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Adjust bunker positioning to match Phaser viewport.
     * @param {object} config - Position configuration.
     */
    setBunkerPosition(config) {
        Object.assign(this.bunkerConfig, config);

        // Reposition existing models
        this.models.forEach((model, i) => {
            model.position.x = this.bunkerConfig.offsetX;
            const yPos = this.bunkerConfig.startY - (i * this.bunkerConfig.roomSpacing);
            model.position.y = yPos;
        });
    }

    /**
     * Resize the renderer to match new dimensions.
     */
    resize(width, height) {
        if (!this.isInitialized) return;

        const aspect = width / height;
        const frustumSize = 4;

        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Get the Three.js scene for external manipulation.
     */
    getScene() {
        return this.scene;
    }

    /**
     * Dispose of all resources.
     */
    dispose() {
        this.models.forEach(model => {
            this.scene.remove(model);
            model.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        this.models = [];

        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }

        this.isInitialized = false;
        console.log('[Three3DOverlay] Disposed.');
    }
}
