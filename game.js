import { Upgrades } from './upgrades.js';
import { Achievements } from './achievements.js';
import { createParticles } from './particles.js';
import { AuthManager } from './auth.js';
import { DevPortal } from './dev-portal.js';
import { Settings } from './settings.js';

class Game {
  constructor() {
    this.authManager = new AuthManager();
    this.devPortal = null;  
    this.canClick = true;
    this.settings = new Settings(this);
    this.isPaused = false;
    
    // Initialize base properties
    this.minerals = 0;
    this.stardust = 0;
    this.mineralsPerClick = 1;
    this.mineralsPerSecond = 0;
    this.multiplier = 1;
    this.mineralsFraction = 0;
    this.stardustMultiplier = 1;
    this.mineralMultiplier = 1;
    this.quantumMiningEnabled = false;
    this.ownedStardustUpgrades = new Set();
    this.allTimeMineral = 0;
    
    // Wait for DOM to be fully loaded before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initLogin());
    } else {
      this.initLogin();
    }
  }

  initLogin() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const guestBtn = document.getElementById('guest-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game');

    loginBtn.addEventListener('click', () => {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    });

    registerBtn.addEventListener('click', () => {
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
    });

    guestBtn.addEventListener('click', () => {
      startScreen.style.display = 'none';
      gameScreen.style.display = 'block';
      this.init(true);
    });

    document.getElementById('submit-login').addEventListener('click', () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        this.authManager.login(username, password);
        startScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        this.init(false);

        // Initialize dev portal only for dev account
        if (this.authManager.isDeveloper()) {
          this.devPortal = new DevPortal(this);
        }
      } catch (error) {
        alert(error.message);
      }
    });

    document.getElementById('submit-register').addEventListener('click', () => {
      const username = document.getElementById('register-username').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      try {
        this.authManager.register(username, password);
        alert('Registration successful! Please log in.');
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
      } catch (error) {
        alert(error.message);
      }
    });
  }

  init(isGuest = false) {
 
    // Initialize upgrades and achievements BEFORE loading game state
    this.upgrades = new Upgrades(this);
    this.achievements = new Achievements(this);
    this.stardustUpgrades = [
      {
        id: 'stardust-efficiency',
        name: 'Stardust Efficiency',
        cost: 10,
        description: 'Increase stardust gain by 10%',
        effect: () => {
          this.stardustMultiplier *= 1.1;
        }
      },
      {
        id: 'mineral-boost',
        name: 'Mineral Production Boost',
        cost: 25,
        description: 'Increase mineral production by 25%',
        effect: () => {
          this.mineralMultiplier *= 1.25;
        }
      },
      {
        id: 'quantum-mining',
        name: 'Quantum Mining',
        cost: 100,
        description: 'Unlock quantum mining capabilities',
        effect: () => {
          this.quantumMiningEnabled = true;
          this.mineralsPerClick *= 2;
        }
      }
    ];
    
    // Initialize game state properties
    this.minerals = 0;
    this.stardust = 0;
    this.mineralsPerClick = 1;
    this.mineralsPerSecond = 0;
    this.multiplier = 1;
    this.mineralsFraction = 0;

    // Guest mode or logged-in user
    if (!isGuest && this.authManager.getCurrentUser()) {
      const savedState = this.authManager.loadGameState();
      if (savedState) {
        this.loadGameStateFromSaved(savedState);
      }
    } else {
      this.initializeStardustSystem();
    }
    
    this.setupEventListeners();
    this.setupMoonCraters();
    this.setupDevTools();
    this.setupStardustInfo();
    this.startGameLoop();
    this.lastUpdate = performance.now();

    // Save game state periodically
    this.saveInterval = setInterval(() => this.saveGameState(), 30000); // Save every 30 seconds
  }

  pause() {
    this.isPaused = true;
    // Pause animations and game loop
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    document.body.classList.add('game-paused');
  }

  resume() {
    this.isPaused = false;
    // Resume animations and game loop
    this.startGameLoop();
    document.body.classList.remove('game-paused');
  }

  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.autoSaveInterval = setInterval(() => this.saveGameState(), 30000);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  initializeStardustSystem() {
    this.stardustMultiplier = 1;
    this.mineralMultiplier = 1;
    this.quantumMiningEnabled = false;
    this.ownedStardustUpgrades = new Set();
    
    this.updateStardustUpgrades();
  }

  updateStardustUpgrades() {
    const container = document.getElementById('stardust-upgrade-list');
    container.innerHTML = '';
    
    this.stardustUpgrades.forEach(upgrade => {
      const element = document.createElement('div');
      element.className = 'stardust-upgrade';
      if (this.stardust < upgrade.cost) element.classList.add('locked');
      
      element.innerHTML = `
        <h3>${upgrade.name}</h3>
        <p>${upgrade.description}</p>
        <p>Cost: ${upgrade.cost} Stardust</p>
      `;
      
      if (!this.ownedStardustUpgrades.has(upgrade.id) && this.stardust >= upgrade.cost) {
        element.addEventListener('click', () => this.purchaseStardustUpgrade(upgrade));
      }
      
      container.appendChild(element);
    });
    
    // Show/hide stardust upgrades panel
    const panel = document.getElementById('stardust-upgrades');
    panel.style.display = this.stardust > 0 ? 'block' : 'none';
  }

  purchaseStardustUpgrade(upgrade) {
    if (this.stardust >= upgrade.cost && !this.ownedStardustUpgrades.has(upgrade.id)) {
      this.stardust -= upgrade.cost;
      this.ownedStardustUpgrades.add(upgrade.id);
      upgrade.effect();
      this.updateDisplay();
      this.updateStardustUpgrades();
    }
  }

  saveGameState() {
    // Only save if upgrades and achievements are initialized
    if (!this.upgrades || !this.achievements) {
      console.warn('Upgrades or achievements not initialized yet');
      return;
    }

    try {
      const gameState = {
        minerals: this.minerals || 0,
        allTimeMineral: this.allTimeMineral || 0,
        stardust: this.stardust || 0,
        mineralsPerClick: this.mineralsPerClick || 1,
        mineralsPerSecond: this.mineralsPerSecond || 0,
        multiplier: this.multiplier || 1,
        upgrades: Object.fromEntries(this.upgrades?.owned || new Map()),
        achievements: Array.from(this.achievements?.unlocked || new Set()),
        ownedStardustUpgrades: Array.from(this.ownedStardustUpgrades || new Set()),
        stardustMultiplier: this.stardustMultiplier || 1,
        mineralMultiplier: this.mineralMultiplier || 1,
        quantumMiningEnabled: this.quantumMiningEnabled || false
      };

      // If logged in, save to auth manager
      if (this.authManager.getCurrentUser()) {
        this.authManager.saveGameState(gameState);
      }
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }

  loadGameStateFromSaved(savedState) {
    this.minerals = savedState.minerals || 0;
    this.allTimeMineral = savedState.allTimeMineral || 0;
    this.stardust = savedState.stardust || 0;
    this.mineralsPerClick = savedState.mineralsPerClick || 1;
    this.mineralsPerSecond = savedState.mineralsPerSecond || 0;
    this.multiplier = savedState.multiplier || 1;
    this.ownedStardustUpgrades = new Set(savedState.ownedStardustUpgrades || []);
    this.stardustMultiplier = savedState.stardustMultiplier || 1;
    this.mineralMultiplier = savedState.mineralMultiplier || 1;
    this.quantumMiningEnabled = savedState.quantumMiningEnabled || false;
    
    // Restore upgrades
    if (savedState.upgrades && this.upgrades) {
      this.upgrades.reset();
      
      Object.entries(savedState.upgrades).forEach(([upgradeId, count]) => {
        const upgrade = this.upgrades.upgrades.find(u => u.id === upgradeId);
        if (upgrade) {
          for (let i = 0; i < count; i++) {
            this.upgrades.purchase(upgrade, true);
          }
        }
      });
    }

    // Restore achievements
    if (savedState.achievements && this.achievements) {
      this.achievements.unlocked = new Set(savedState.achievements);
    }

    // Re-apply effects of owned upgrades
    this.ownedStardustUpgrades.forEach(upgradeId => {
      const upgrade = this.stardustUpgrades.find(u => u.id === upgradeId);
      if (upgrade) upgrade.effect();
    });
    
    this.updateDisplay();
    this.updateStardustUpgrades();
  }

  setupEventListeners() {
    const asteroid = document.getElementById('asteroid');
  
    // Remove continuous clicking
    asteroid.addEventListener('click', () => {
      if (!this.canClick) return;
      this.canClick = false;
      this.clickAsteroid();
      
      // Prevent rapid clicking by adding a small cooldown
      setTimeout(() => {
        this.canClick = true;
      }, 100);  // 100ms cooldown between clicks
    });
    
    const prestigeBtn = document.getElementById('prestige-btn');
    prestigeBtn.addEventListener('click', () => this.prestige());
  }

  setupMoonCraters() {
    const asteroid = document.getElementById('asteroid');
    const craterCount = 8;
    
    for (let i = 0; i < craterCount; i++) {
      const crater = document.createElement('div');
      crater.className = 'crater';
      
      const size = 10 + Math.random() * 30;
      crater.style.width = `${size}px`;
      crater.style.height = `${size}px`;
      
      crater.style.left = `${Math.random() * 80}%`;
      crater.style.top = `${Math.random() * 80}%`;
      
      asteroid.appendChild(crater);
    }
  }

  setupDevTools() {
    // Remove the dev tools corner display - this function is now empty
    // We'll keep developer functions in the proper dev portal only
  }

  setupStardustInfo() {
    const info = document.createElement('div');
    info.id = 'stardust-info';
    info.innerHTML = `
      <h3> Coming Soon: Stardust System!</h3>
      <p>When you reach 100M minerals, you'll be able to perform a Prestige reset!</p>
      <ul>
        <li>Convert your progress into powerful Stardust</li>
        <li>Each Stardust provides +1% to all resource generation</li>
        <li>Unlock special Stardust-only upgrades</li>
        <li>Access new game mechanics and features</li>
        <li>Earn special achievements and rewards</li>
      </ul>
      <p class="progress">Progress to Stardust: <span>0</span>%</p>
    `;
    document.body.appendChild(info);
  }

  startGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    
    const updateGame = (currentTime) => {
      if (this.isPaused) return;
      
      const deltaTime = currentTime - this.lastUpdate;
      this.lastUpdate = currentTime;
      
      // Convert deltaTime from milliseconds to seconds
      const secondsFraction = deltaTime / 1000;
      
      // Calculate minerals to add this frame
      const mineralsToAdd = this.mineralsPerSecond * secondsFraction;
      this.mineralsFraction += mineralsToAdd;
      
      // Only add whole numbers of resources
      if (this.mineralsFraction >= 1) {
        const wholeMineral = Math.floor(this.mineralsFraction);
        this.minerals += wholeMineral;
        this.mineralsFraction -= wholeMineral;
      }
      
      this.updateDisplay();
      requestAnimationFrame(updateGame);
    };
    
    requestAnimationFrame(updateGame);
  }

  updateDisplay() {
    const mineralsEl = document.querySelector('#minerals span');
    const stardustEl = document.querySelector('#stardust span');
    const mineralsPerSecondEl = document.querySelector('#minerals-per-second');
    const allTimeMineralsEl = document.querySelector('#all-time-minerals span');

    if (mineralsEl) mineralsEl.textContent = Math.floor(this.minerals);
    if (stardustEl) stardustEl.textContent = Math.floor(this.stardust);
    if (allTimeMineralsEl) allTimeMineralsEl.textContent = Math.floor(this.allTimeMineral);
    
    // Update minerals per second display
    if (mineralsPerSecondEl) {
      mineralsPerSecondEl.textContent = 
        `${this.mineralsPerSecond.toFixed(1)} per second`;
    }
    
    // Update upgrade buttons
    if (this.upgrades) this.upgrades.updateButtons();
    
    // Show/hide prestige button
    const prestigeBtn = document.getElementById('prestige-btn');
    if (prestigeBtn) {
      prestigeBtn.style.display = this.minerals >= 100000000 ? 'block' : 'none';
    }
    
    // Update stardust progress
    const progressEl = document.querySelector('#stardust-info .progress span');
    if (progressEl) {
      const progress = Math.min(100, (this.minerals / 1000000));
      progressEl.textContent = progress.toFixed(2);
    }
  }

  resetToDefaultState() {
    this.minerals = 0;
    this.stardust = 0;
    this.mineralsPerClick = 1;
    this.mineralsPerSecond = 0;
    this.multiplier = 1;
    
    // Reset upgrades if exists
    if (this.upgrades) this.upgrades.reset();
    
    // Reset achievements if exists
    if (this.achievements) this.achievements.unlocked = new Set();
  }

  updateLeaderboard() {
    const users = this.authManager.getAllUsers();
    const leaderboard = Object.entries(users)
      .map(([username, data]) => ({
        username,
        allTimeMineral: data.gameState?.allTimeMineral || 0
      }))
      .sort((a, b) => b.allTimeMineral - a.allTimeMineral)
      .slice(0, 100);

    const container = document.getElementById('leaderboard-list');
    container.innerHTML = leaderboard.map((entry, index) => `
      <div class="leaderboard-item">
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-name">${entry.username}</span>
        <span class="leaderboard-score">${Math.floor(entry.allTimeMineral).toLocaleString()} minerals</span>
      </div>
    `).join('');
  }

  addMinerals(amount) {
    this.minerals += amount;
    this.allTimeMineral += amount;
    this.updateDisplay();
  }

  clickAsteroid() {
    const gain = this.mineralsPerClick * this.multiplier;
    this.addMinerals(gain);
    
    // Visual feedback
    this.createClickEffect();
    this.createCrack();
    
    // Check achievements
    this.achievements.check();
  }

  createClickEffect() {
    const container = document.getElementById('click-effects');
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = `+${this.mineralsPerClick * this.multiplier}`;
    
    const rect = document.getElementById('asteroid').getBoundingClientRect();
    effect.style.left = `${Math.random() * rect.width}px`;
    effect.style.top = `${Math.random() * rect.height}px`;
    
    container.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  }

  createCrack() {
    const cracks = document.getElementById('cracks');
    const crack = document.createElement('div');
    crack.className = 'crack';
    
    const angle = Math.random() * 360;
    const length = 20 + Math.random() * 30;
    
    crack.style.width = `${length}px`;
    crack.style.transform = `rotate(${angle}deg)`;
    crack.style.left = `${Math.random() * 100}%`;
    crack.style.top = `${Math.random() * 100}%`;
    
    cracks.appendChild(crack);
    setTimeout(() => crack.remove(), 2000);
  }

  prestige() {
    if (this.minerals < 100000000) return;
    
    const stardustGain = Math.floor(Math.sqrt(this.minerals / 1000000) * this.stardustMultiplier);
    this.stardust += stardustGain;
    
    // Reset progress but maintain stardust upgrades
    this.minerals = 0;
    this.mineralsPerClick = 1 * this.mineralMultiplier;
    this.mineralsPerSecond = 0;
  
    // Reset upgrades
    this.upgrades.reset();
    
    // Visual effect
    createParticles();
    
    this.updateDisplay();
    this.updateStardustUpgrades();
  }
}

window.game = new Game();