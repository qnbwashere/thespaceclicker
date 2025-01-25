export class Settings {
  constructor(game) {
    this.game = game;
    
    // Default settings
    this.settings = {
      audio: {
        musicVolume: 100,
        sfxVolume: 100,
        enabled: true
      },
      graphics: {
        effects: true,
        brightness: 100
      },
      gameplay: {
        autoSave: true
      }
    };

    this.hasUnsavedChanges = false;
    
    // Initialize settings after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initSettings());
    } else {
      this.initSettings();
    }
  }

  async initSettings() {
    this.setupSettingsUI();
    this.loadSettings();
  }

  setupSettingsUI() {
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.innerHTML = `
      <svg id="settings-icon" viewBox="0 0 24 24">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
      </svg>
    `;
    settingsButton.title = 'Settings';
    document.body.appendChild(settingsButton);

    const overlay = document.createElement('div');
    overlay.id = 'settings-overlay';
    
    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.innerHTML = `
      <h2 id="settings-title">Settings</h2>
      
      <div class="settings-section">
        <h3>Audio</h3>
        <div class="setting-item">
          <label class="setting-label">Music Volume</label>
          <input type="range" class="slider" id="music-volume" min="0" max="100" value="100">
        </div>
        <div class="setting-item">
          <label class="setting-label">SFX Volume</label>
          <input type="range" class="slider" id="sfx-volume" min="0" max="100" value="100">
        </div>
        <div class="setting-item">
          <label class="setting-label">Audio Enabled</label>
          <label class="toggle-switch">
            <input type="checkbox" id="audio-enabled" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3>Graphics</h3>
        <div class="setting-item">
          <label class="setting-label">Particle Effects</label>
          <label class="toggle-switch">
            <input type="checkbox" id="effects" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <label class="setting-label">Brightness</label>
          <input type="range" class="slider" id="brightness" min="0" max="100" value="100">
        </div>
      </div>

      <div class="settings-section">
        <h3>Gameplay</h3>
        <div class="setting-item">
          <label class="setting-label">Auto-Save</label>
          <label class="toggle-switch">
            <input type="checkbox" id="auto-save" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-buttons">
        <button id="reset-progress">Reset Game Progress</button>
        <button id="apply-close">Apply & Close</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    this.bindEvents();
  }

  bindEvents() {
    const settingsButton = document.getElementById('settings-button');
    const overlay = document.getElementById('settings-overlay');
    const panel = document.getElementById('settings-panel');
    const applyClose = document.getElementById('apply-close');
    const resetProgress = document.getElementById('reset-progress');

    settingsButton.addEventListener('click', () => this.openSettings());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.checkUnsavedChanges();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.style.display === 'block') {
        this.checkUnsavedChanges();
      }
    });

    applyClose.addEventListener('click', () => {
      this.saveSettings();
      this.closeSettings();
    });

    resetProgress.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all game progress? This cannot be undone.')) {
        this.game.resetToDefaultState();
        this.closeSettings();
      }
    });

    const inputs = panel.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.hasUnsavedChanges = true;
      });
    });
  }

  openSettings() {
    const overlay = document.getElementById('settings-overlay');
    const panel = document.getElementById('settings-panel');
    
    overlay.style.display = 'block';
    panel.style.display = 'block';
    
    panel.offsetHeight;
    
    overlay.style.opacity = '1';
    panel.classList.add('visible');
    
    this.game.pause();
  }

  closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    const panel = document.getElementById('settings-panel');
    
    overlay.style.opacity = '0';
    panel.classList.remove('visible');
    
    setTimeout(() => {
      overlay.style.display = 'none';
      panel.style.display = 'none';
    }, 500);
    
    this.hasUnsavedChanges = false;
    this.game.resume();
  }

  checkUnsavedChanges() {
    if (this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save them before closing?')) {
        this.saveSettings();
      }
    }
    this.closeSettings();
  }

  saveSettings() {
    this.settings.audio.musicVolume = parseInt(document.getElementById('music-volume').value);
    this.settings.audio.sfxVolume = parseInt(document.getElementById('sfx-volume').value);
    this.settings.audio.enabled = document.getElementById('audio-enabled').checked;
    this.settings.graphics.effects = document.getElementById('effects').checked;
    this.settings.graphics.brightness = parseInt(document.getElementById('brightness').value);
    this.settings.gameplay.autoSave = document.getElementById('auto-save').checked;

    localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    this.hasUnsavedChanges = false;
    this.applySettings();
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
      this.updateUI();
      this.applySettings();
    }
  }

  updateUI() {
    document.getElementById('music-volume').value = this.settings.audio.musicVolume;
    document.getElementById('sfx-volume').value = this.settings.audio.sfxVolume;
    document.getElementById('audio-enabled').checked = this.settings.audio.enabled;
    document.getElementById('effects').checked = this.settings.graphics.effects;
    document.getElementById('brightness').value = this.settings.graphics.brightness;
    document.getElementById('auto-save').checked = this.settings.gameplay.autoSave;
  }

  applySettings() {
    if (this.game.audio) {
      this.game.audio.setMusicVolume(this.settings.audio.musicVolume / 100);
      this.game.audio.setSFXVolume(this.settings.audio.sfxVolume / 100);
    }

    document.body.style.filter = `brightness(${this.settings.graphics.brightness}%)`;
    this.game.particlesEnabled = this.settings.graphics.effects;

    if (this.settings.gameplay.autoSave) {
      this.game.startAutoSave();
    } else {
      this.game.stopAutoSave();
    }
  }
}