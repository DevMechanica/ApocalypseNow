/**
 * CombatSystem - Handles combat, damage, and health
 */

import { eventBus, Events } from '../core/EventBus.js';
import { CONFIG } from '../config/GameConfig.js';

export class CombatSystem {
    constructor() {
        this.playerHealth = CONFIG.player.initialHealth;
        this.playerMaxHealth = CONFIG.player.maxHealth;
        this.inCombat = false;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for enemy attacks
        eventBus.on(Events.ENEMY_ATTACKED, (data) => {
            this.damagePlayer(data.damage);
        });
    }

    /**
     * Damage the player
     * @param {number} amount
     */
    damagePlayer(amount) {
        this.playerHealth -= amount;
        console.log(`🧟 Player takes ${amount} damage! Health: ${this.playerHealth}`);

        eventBus.emit(Events.PLAYER_DAMAGED, {
            damage: amount,
            health: this.playerHealth,
            maxHealth: this.playerMaxHealth
        });

        if (this.playerHealth <= 0) {
            this.playerHealth = 0;
            this.handlePlayerDeath();
        }
    }

    /**
     * Handle player death
     */
    handlePlayerDeath() {
        console.log('💀 Player defeated!');
        eventBus.emit(Events.PLAYER_DIED);
        eventBus.emit(Events.GAME_OVER);
    }

    /**
     * Heal the player
     * @param {number} amount
     */
    healPlayer(amount) {
        this.playerHealth = Math.min(
            this.playerHealth + amount,
            this.playerMaxHealth
        );
    }

    /**
     * Try to attack an enemy
     * @param {Character} character
     * @param {Array<Enemy>} enemies
     * @param {number} clickX
     * @param {number} clickY
     * @returns {boolean} Whether an attack was made
     */
    tryAttack(character, enemies, clickX, clickY) {
        const punchRange = 100;

        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;

            // Check if clicked on enemy
            const dx = clickX - enemy.x;
            const dy = clickY - enemy.y;
            const clickDist = Math.sqrt(dx * dx + dy * dy);

            if (clickDist < enemy.size / 2) {
                // Check if close enough to punch
                const distToEnemy = character.distanceTo(enemy);

                if (distToEnemy < punchRange) {
                    // Determine direction
                    const direction = enemy.x < character.x ? 'left' : 'right';
                    
                    // Execute punch
                    character.punch(direction);
                    enemy.takeDamage(CONFIG.character.punchDamage);
                    
                    return true;
                } else {
                    console.log('Too far to punch! Get closer.');
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * Get player health percentage
     * @returns {number}
     */
    getHealthPercent() {
        return this.playerHealth / this.playerMaxHealth;
    }

    /**
     * Reset combat state
     */
    reset() {
        this.playerHealth = CONFIG.player.initialHealth;
        this.inCombat = false;
    }
}

export default CombatSystem;
