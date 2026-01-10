/**
 * UIManager - Handles HUD, messages, and action buttons
 */

import { eventBus, Events } from '../core/EventBus.js';

export class UIManager {
    constructor() {
        // Get DOM elements
        this.posDisplay = document.getElementById('pos-display');
        this.statusDisplay = document.getElementById('status-display');
        this.clickIndicator = document.getElementById('click-indicator');
        this.actionButton = document.getElementById('action-button');
        
        this.messageBox = null;
        this.currentZone = null;

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on(Events.MESSAGE_SHOW, (data) => {
            this.showMessage(data.text);
        });

        eventBus.on(Events.ACTION_BUTTON_UPDATE, (data) => {
            this.updateActionButton(data.icon, data.action);
        });

        eventBus.on(Events.ACTION_BUTTON_HIDE, () => {
            this.hideActionButton();
        });
    }

    /**
     * Update position display
     * @param {number} x
     * @param {number} y
     */
    updatePosition(x, y) {
        if (this.posDisplay) {
            this.posDisplay.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        }
    }

    /**
     * Update status display
     * @param {string} status
     */
    updateStatus(status) {
        if (this.statusDisplay) {
            this.statusDisplay.textContent = status;
        }
    }

    /**
     * Show click indicator at position
     * @param {number} clientX
     * @param {number} clientY
     */
    showClickIndicator(clientX, clientY) {
        if (!this.clickIndicator) return;

        this.clickIndicator.style.left = clientX + 'px';
        this.clickIndicator.style.top = clientY + 'px';
        this.clickIndicator.classList.add('show-click');

        setTimeout(() => {
            this.clickIndicator.classList.remove('show-click');
        }, 600);
    }

    /**
     * Update action button
     * @param {string} icon
     * @param {string} action
     */
    updateActionButton(icon, action) {
        if (!this.actionButton) return;

        const iconEl = this.actionButton.querySelector('.icon');
        const textEl = this.actionButton.querySelector('span:last-child');

        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = action;
        
        this.actionButton.classList.add('visible');
    }

    /**
     * Hide action button
     */
    hideActionButton() {
        if (this.actionButton) {
            this.actionButton.classList.remove('visible');
        }
    }

    /**
     * Show/hide action button based on zone
     * @param {Object|null} zone
     */
    setCurrentZone(zone) {
        if (zone && zone !== this.currentZone) {
            this.currentZone = zone;
            this.updateActionButton(zone.icon, zone.action);
        } else if (!zone && this.currentZone) {
            this.currentZone = null;
            this.hideActionButton();
        }
    }

    /**
     * Get current zone
     * @returns {Object|null}
     */
    getCurrentZone() {
        return this.currentZone;
    }

    /**
     * Show message popup
     * @param {string} text
     * @param {number} duration - Duration in ms
     */
    showMessage(text, duration = 3000) {
        if (!this.messageBox) {
            this.messageBox = document.createElement('div');
            this.messageBox.id = 'message-box';
            this.messageBox.style.cssText = `
                position: fixed;
                bottom: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px 30px;
                border-radius: 16px;
                border: 2px solid rgba(255, 217, 61, 0.5);
                font-size: 16px;
                max-width: 80%;
                text-align: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(this.messageBox);
        }

        this.messageBox.textContent = text;
        this.messageBox.style.opacity = '1';

        setTimeout(() => {
            this.messageBox.style.opacity = '0';
        }, duration);
    }

    /**
     * Set action button click handler
     * @param {Function} callback
     */
    onActionButtonClick(callback) {
        if (this.actionButton) {
            this.actionButton.addEventListener('click', callback);
        }
    }
}

export default UIManager;
