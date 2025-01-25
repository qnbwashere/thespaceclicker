export class DevPortal {
  constructor(game) {
    this.game = game;
    this.setupDevPortal();
    this.setupLeaderboard();
  }

  setupDevPortal() {
    const devPortal = document.createElement('div');
    devPortal.id = 'dev-portal';
    devPortal.style.display = 'none';
    
    devPortal.innerHTML = `
      <div class="dev-portal-content">
        <h2>Developer Portal</h2>
        
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

        <button id="close-dev-portal">Close Portal</button>
      </div>
    `;
    
    document.body.appendChild(devPortal);
    
    // Add dev portal password input
    const devPasswordInput = document.createElement('input');
    devPasswordInput.type = 'password';
    devPasswordInput.id = 'dev-password';
    devPasswordInput.placeholder = 'Enter Developer Password';
    document.body.appendChild(devPasswordInput);

    // Handle password input
    devPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (devPasswordInput.value === '8211') {
          devPortal.style.display = 'block';
          devPasswordInput.style.display = 'none';
          this.updateDevPortal();
        }
      }
    });

    // Close button
    document.getElementById('close-dev-portal').addEventListener('click', () => {
      devPortal.style.display = 'none';
      devPasswordInput.style.display = 'block';
      devPasswordInput.value = '';
    });
  }

  updateDevPortal() {
    // Update user stats
    const users = this.game.authManager.getAllUsers();
    document.getElementById('total-users-count').textContent = Object.keys(users).length;
    document.getElementById('active-users-count').textContent = 
      Object.values(this.game.authManager.room.party.peers).length;

    // Update leaderboard
    this.updateLeaderboard();
  }

  updateLeaderboard() {
    const users = this.game.authManager.getAllUsers();
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
  }

  setupLeaderboard() {
    // Update leaderboard every minute
    setInterval(() => {
      if (document.getElementById('dev-portal').style.display === 'block') {
        this.updateDevPortal();
      }
    }, 60000);
  }
}