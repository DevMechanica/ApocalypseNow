/**
 * AssetLoader - Centralized asset loading with caching
 * Handles images, videos, and tracks loading progress
 */

class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.loading = new Map();
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    /**
     * Load an image
     * @param {string} src - Image source path
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(src) {
        // Return cached if available
        if (this.cache.has(src)) {
            return Promise.resolve(this.cache.get(src));
        }

        // Return pending promise if already loading
        if (this.loading.has(src)) {
            return this.loading.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.cache.set(src, img);
                this.loading.delete(src);
                this.loadedAssets++;
                resolve(img);
            };

            img.onerror = () => {
                this.loading.delete(src);
                reject(new Error(`Failed to load image: ${src}`));
            };

            img.src = src;
        });

        this.loading.set(src, promise);
        this.totalAssets++;
        return promise;
    }

    /**
     * Load a video element
     * @param {string} src - Video source path
     * @param {Object} options - Video options
     * @returns {Promise<HTMLVideoElement>}
     */
    loadVideo(src, options = {}) {
        const {
            loop = true,
            muted = true,
            autoplay = false,
            playsInline = true,
            hidden = true
        } = options;

        // Return cached if available
        if (this.cache.has(src)) {
            return Promise.resolve(this.cache.get(src));
        }

        // Return pending promise if already loading
        if (this.loading.has(src)) {
            return this.loading.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = src;
            video.loop = loop;
            video.muted = muted;
            video.playsInline = playsInline;
            video.preload = 'auto';

            // Hide video element if requested (for background processing)
            if (hidden) {
                video.style.position = 'absolute';
                video.style.top = '-9999px';
                video.style.left = '-9999px';
                video.style.width = '1px';
                video.style.height = '1px';
                video.style.pointerEvents = 'none';
                document.body.appendChild(video);
            }

            video.addEventListener('loadeddata', () => {
                this.cache.set(src, video);
                this.loading.delete(src);
                this.loadedAssets++;
                
                if (autoplay) {
                    video.play().catch(e => console.warn('Video autoplay prevented:', e));
                }
                
                resolve(video);
            }, { once: true });

            video.addEventListener('error', () => {
                this.loading.delete(src);
                reject(new Error(`Failed to load video: ${src}`));
            }, { once: true });

            video.load();
        });

        this.loading.set(src, promise);
        this.totalAssets++;
        return promise;
    }

    /**
     * Load multiple assets
     * @param {Array<{type: string, src: string, options?: Object}>} assets
     * @returns {Promise<Map<string, any>>}
     */
    async loadAll(assets) {
        const results = new Map();

        const promises = assets.map(async ({ type, src, options }) => {
            try {
                let asset;
                if (type === 'image') {
                    asset = await this.loadImage(src);
                } else if (type === 'video') {
                    asset = await this.loadVideo(src, options);
                }
                results.set(src, asset);
            } catch (error) {
                console.error(`Failed to load ${type}: ${src}`, error);
            }
        });

        await Promise.all(promises);
        return results;
    }

    /**
     * Get loading progress (0-1)
     * @returns {number}
     */
    getProgress() {
        if (this.totalAssets === 0) return 1;
        return this.loadedAssets / this.totalAssets;
    }

    /**
     * Check if all assets are loaded
     * @returns {boolean}
     */
    isComplete() {
        return this.loading.size === 0 && this.totalAssets === this.loadedAssets;
    }

    /**
     * Get cached asset
     * @param {string} src
     * @returns {any}
     */
    get(src) {
        return this.cache.get(src);
    }

    /**
     * Clear cache
     */
    clear() {
        // Cleanup video elements
        this.cache.forEach((asset, src) => {
            if (asset instanceof HTMLVideoElement) {
                asset.pause();
                asset.src = '';
                asset.remove();
            }
        });
        
        this.cache.clear();
        this.loading.clear();
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }
}

// Singleton instance
export const assetLoader = new AssetLoader();
export default AssetLoader;
