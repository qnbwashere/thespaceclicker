import { Upgrades } from './upgrades.js';
import { Achievements } from './achievements.js';
import { createParticles } from './particles.js';
import { AuthManager } from './auth.js';
import { DevPortal } from './dev-portal.js';

class Game {
  constructor() {
    this.authManager = new AuthManager();
    this.devPortal = null;  
    this.canClick = true;
    this.soundEnabled = false;
    this.particlesEnabled = true;
    
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

    document.getElementById('submit-login').addEventListener('click', async () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        await this.authManager.login(username, password);
        startScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        this.init(false);

        // Initialize dev portal only for dev account
        if (this.authManager.isDeveloper()) {
          this.devPortal = new DevPortal(this);
          this.devPortal.show(); // Show dev portal immediately
          alert('Developer mode activated! Use Ctrl + Shift + D to toggle the dev portal.');
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
    // Removed settings-related initialization
    
    // Rest of the init method remains the same
    this.minerals = 0;
    this.mineralsPerClick = 1;
    this.mineralsPerSecond = 0;
    this.multiplier = 1;
    this.mineralsFraction = 0;
  
    // Initialize stardust system
    this.stardust = 0;
    this.stardustMultiplier = 1;
    this.mineralMultiplier = 1;
    this.quantumMiningEnabled = false;
    this.ownedStardustUpgrades = new Set();

    // Initialize upgrades and achievements
    this.upgrades = new Upgrades(this);
    this.achievements = new Achievements(this);

    // Then load saved state if available
    if (!isGuest && this.authManager.getCurrentUser()) {
      const savedState = this.authManager.loadGameState();
      if (savedState) {
        this.loadGameStateFromSaved(savedState);
      }
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

  saveGameState() {
    // Only save if upgrades and achievements are initialized
    if (!this.upgrades || !this.achievements) {
      return;
    }

    const gameState = {
      minerals: this.minerals || 0,
      mineralsPerClick: this.mineralsPerClick || 1,
      mineralsPerSecond: this.mineralsPerSecond || 0,
      multiplier: this.multiplier || 1,
      // Convert Map to Object for storage
      upgrades: Object.fromEntries(this.upgrades.owned || new Map()),
      // Convert Set to Array for storage
      achievements: Array.from(this.achievements.unlocked || new Set()),
      ownedStardustUpgrades: Array.from(this.ownedStardustUpgrades || new Set()),
      stardust: this.stardust || 0,
      stardustMultiplier: this.stardustMultiplier || 1,
      mineralMultiplier: this.mineralMultiplier || 1,
      quantumMiningEnabled: this.quantumMiningEnabled || false,
      allTimeMineral: this.minerals + (this.authManager.getCurrentUser()?.gameState?.allTimeMineral || 0)
    };

    // If logged in, save to auth manager
    if (this.authManager.getCurrentUser()) {
      this.authManager.saveGameState(gameState);
    }
  }

  loadGameStateFromSaved(savedState) {
    this.minerals = savedState.minerals || 0;
    this.mineralsPerClick = savedState.mineralsPerClick || 1;
    this.mineralsPerSecond = savedState.mineralsPerSecond || 0;
    this.multiplier = savedState.multiplier || 1;

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

    // Restore stardust state
    this.stardust = savedState.stardust || 0;
    this.stardustMultiplier = savedState.stardustMultiplier || 1;
    this.mineralMultiplier = savedState.mineralMultiplier || 1;
    this.quantumMiningEnabled = savedState.quantumMiningEnabled || false;
    this.ownedStardustUpgrades = new Set(savedState.ownedStardustUpgrades || []);

    this.updateDisplay();
  }

  setupEventListeners() {
    const asteroid = document.getElementById('asteroid');
    
    // Remove continuous clicking
    asteroid.addEventListener('click', () => {
      if (!this.canClick) return;
      this.canClick = false;
      this.clickAsteroid();
      
      // Prevent rapid clicking
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
    const devTools = document.createElement('div');
    devTools.id = 'dev-tools';
    devTools.innerHTML = `
      <div>Dev Tools</div>
      <button id="toggle-auto-click">Toggle Auto-Click</button>
      <div id="auto-click-status">Auto-Click: Off</div>
    `;
    document.body.appendChild(devTools);

    document.getElementById('toggle-auto-click').addEventListener('click', () => {
      this.toggleAutoClick();
    });
  }

  setupStardustInfo() {
    const info = document.createElement('div');
    info.id = 'stardust-info';
    info.innerHTML = `
      <button class="close-btn">×</button>
      <h3>Coming Soon: Stardust System!</h3>
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

    // Add close button functionality
    const closeBtn = info.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      info.style.display = 'none';
    });
  }

  startGameLoop() {
    const updateGame = (currentTime) => {
      const deltaTime = currentTime - this.lastUpdate;
      this.lastUpdate = currentTime;
      
      const secondsFraction = deltaTime / 1000;
      
      const mineralsToAdd = this.mineralsPerSecond * secondsFraction;
      this.mineralsFraction += mineralsToAdd;
      
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

    if (mineralsEl) mineralsEl.textContent = Math.floor(this.minerals);
    if (stardustEl) stardustEl.textContent = Math.floor(this.stardust);
    
    if (mineralsPerSecondEl) {
      mineralsPerSecondEl.textContent = 
        `${this.mineralsPerSecond.toFixed(1)} per second`;
    }
    
    if (this.upgrades) this.upgrades.updateButtons();
    
    const prestigeBtn = document.getElementById('prestige-btn');
    if (prestigeBtn) {
      prestigeBtn.style.display = this.minerals >= 100000000 ? 'block' : 'none';
    }
    
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
    this.allTimeMineral = 0; // Reset all-time minerals

    // Reset upgrades if exists
    if (this.upgrades) this.upgrades.reset();
  
    // Reset achievements if exists
    if (this.achievements) this.achievements.unlocked = new Set();

    // Save the reset state
    this.saveGameState();
    this.updateDisplay();
  }

  toggleAutoClick() {
    this.autoClickEnabled = !this.autoClickEnabled;
    document.getElementById('auto-click-status').textContent = 
      `Auto-Click: ${this.autoClickEnabled ? 'On' : 'Off'}`;
    
    if (this.autoClickEnabled) {
      this.autoClickInterval = setInterval(() => {
        this.clickAsteroid();
      }, 50);
    } else if (this.autoClickInterval) {
      clearInterval(this.autoClickInterval);
      this.autoClickInterval = null;
    }
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

  addMinerals(amount) {
    this.minerals += amount;
    this.updateDisplay();
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

  createParticles() {
    if (!this.particlesEnabled) return;
  }

  prestige() {
    if (this.minerals < 100000000) return;
    
    const stardustGain = Math.floor(Math.sqrt(this.minerals / 1000000));
    this.stardust += stardustGain;
    
    // Stardust now provides permanent bonuses
    this.applyStardustBonuses();
    
    // Reset progress
    this.minerals = 0;
    this.mineralsPerClick = 1 + (this.stardust * 0.01);  // Each stardust gives 1% bonus
    this.mineralsPerSecond = 0;
    this.multiplier = 1 + (this.stardust * 0.005);  // Each stardust gives 0.5% multiplier
    
    // Reset upgrades
    this.upgrades.reset();
    
    // Visual effect
    this.createParticles();
    
    this.updateDisplay();
  }

  applyStardustBonuses() {
    // Add special stardust-based upgrades or bonuses
    const stardustBonuses = [
      { threshold: 10, bonus: "Unlock basic stardust efficiency" },
      { threshold: 50, bonus: "Improved mineral conversion" },
      { threshold: 100, bonus: "Advanced resource management" },
      { threshold: 500, bonus: "Cosmic resource multipliers" }
    ];

    stardustBonuses.forEach(bonus => {
      if (this.stardust >= bonus.threshold) {
        // Implement bonus logic
        console.log(`Unlocked: ${bonus.bonus}`);
      }
    });
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
}

window.game = new Game();