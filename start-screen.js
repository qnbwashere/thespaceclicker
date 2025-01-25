class SpaceBackground {
  constructor() {
    this.container = document.getElementById('space-background');
    this.createStars();
    this.createFloatingObjects();
  }

  createStars() {
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // Vary star size and opacity
      const size = Math.random() * 3;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.opacity = Math.random();
      
      this.container.appendChild(star);
    }
  }

  createFloatingObjects() {
    const objects = [
      { type: 'asteroid', count: 5 },
      { type: 'planet', count: 3 },
      { type: 'spaceship', count: 2 },
      { type: 'text', count: 1 }
    ];

    objects.forEach(objType => {
      for (let i = 0; i < objType.count; i++) {
        const obj = document.createElement('div');
        obj.classList.add('floating-object', objType.type);
        
        // Randomize position
        obj.style.left = `${Math.random() * 100}%`;
        obj.style.top = `${Math.random() * 100}%`;
        
        // Randomize size
        const size = 50 + Math.random() * 100;
        obj.style.width = `${size}px`;
        obj.style.height = `${size}px`;
        
        // Add text for text object
        if (objType.type === 'text') {
          obj.textContent = 'QnB';
          obj.style.fontSize = '48px';
          obj.style.color = 'white';
          obj.style.display = 'flex';
          obj.style.alignItems = 'center';
          obj.style.justifyContent = 'center';
        }
        
        // Randomize animation
        obj.style.animationDuration = `${30 + Math.random() * 60}s`;
        obj.style.animationDelay = `${Math.random() * 10}s`;
        obj.style.animationDirection = Math.random() > 0.5 ? 'alternate' : 'alternate-reverse';
        
        this.container.appendChild(obj);
      }
    });
  }
}

class DevPanel {
  constructor() {
    this.setupDevPanel();
    this.bindEvents();
  }

  setupDevPanel() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'dev-panel-overlay';
    document.body.appendChild(overlay);

    // Create password prompt
    const passwordPrompt = document.createElement('div');
    passwordPrompt.className = 'dev-panel-password';
    passwordPrompt.innerHTML = `
      <input type="password" id="dev-password" placeholder="Enter Developer Password">
    `;
    document.body.appendChild(passwordPrompt);

    // Create dev panel
    const devPanel = document.createElement('div');
    devPanel.className = 'dev-panel';
    devPanel.innerHTML = `
      <button class="close-panel">&times;</button>
      <h2>Developer Panel</h2>
      
      <div class="dev-section">
        <h3>User Stats</h3>
        <p>Total Registered Users: <span id="total-users-count">0</span></p>
        <p>Active Users: <span id="active-users-count">0</span></p>
      </div>
      
      <div class="dev-section">
        <h3>User Login History</h3>
        <div id="login-history"></div>
      </div>
      
      <div class="dev-section">
        <h3>All-Time Minerals Leaderboard</h3>
        <div id="minerals-leaderboard"></div>
      </div>
    `;
    document.body.appendChild(devPanel);
  }

  bindEvents() {
    const devPanelBtn = document.getElementById('dev-panel-btn');
    const overlay = document.querySelector('.dev-panel-overlay');
    const passwordPrompt = document.querySelector('.dev-panel-password');
    const devPanel = document.querySelector('.dev-panel');
    const closeBtn = document.querySelector('.close-panel');
    const passwordInput = document.getElementById('dev-password');

    devPanelBtn.addEventListener('click', () => {
      overlay.style.display = 'block';
      passwordPrompt.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    });

    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (passwordInput.value === '8211') {
          passwordPrompt.style.display = 'none';
          devPanel.style.display = 'block';
          this.updateDevPanel();
        } else {
          alert('Incorrect password');
        }
      }
    });

    closeBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      devPanel.style.display = 'none';
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        passwordPrompt.style.display = 'none';
        devPanel.style.display = 'none';
      }
    });
  }

  updateDevPanel() {
    const users = JSON.parse(localStorage.getItem('spaceMiningUsers') || '{}');
    
    // Update user stats
    document.getElementById('total-users-count').textContent = Object.keys(users).length;
    
    // Update leaderboard
    const leaderboard = Object.entries(users)
      .map(([username, data]) => ({
        username,
        allTimeMineral: data.gameState?.allTimeMineral || 0
      }))
      .sort((a, b) => b.allTimeMineral - a.allTimeMineral);

    const leaderboardHtml = leaderboard
      .map((entry, index) => `
        <div class="leaderboard-entry">
          <span class="rank">#${index + 1}</span>
          <span class="username">${entry.username}</span>
          <span class="score">${Math.floor(entry.allTimeMineral).toLocaleString()} minerals</span>
        </div>
      `)
      .join('');

    document.getElementById('minerals-leaderboard').innerHTML = leaderboardHtml;

    // Update login history - you might want to implement a login history tracking system
    document.getElementById('login-history').innerHTML = '<p>Login history feature coming soon</p>';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SpaceBackground();
  new DevPanel();
});