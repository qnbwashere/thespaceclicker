export class DevPortal {
  constructor(game) {
    this.game = game;
    this.setupDevPortal();
    this.initializeAnalytics();
  }

  setupDevPortal() {
    const devPortal = document.createElement('div');
    devPortal.id = 'dev-portal';
    devPortal.style.display = 'none';
    devPortal.innerHTML = `
      <div class="dev-portal-content">
        <h2>Developer Portal</h2>
        <div class="dev-section">
          <h3>User Analytics</h3>
          <div id="active-users">
            <h4>Active Users</h4>
            <table id="active-users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody id="active-users-list">
              </tbody>
            </table>
          </div>
          <div id="total-users">
            <h4>Total Registered Users: <span>0</span></h4>
            <button id="export-users">Export User Data</button>
          </div>
        </div>

        <div class="dev-section">
          <h3>Game Testing</h3>
          <button id="add-minerals">Add 1M Minerals</button>
          <button id="add-stardust">Add 100 Stardust</button>
          <button id="unlock-all">Unlock All Content</button>
          <button id="reset-game">Reset Game State</button>
        </div>

        <div class="dev-section">
          <h3>User Management</h3>
          <button id="reset-selected-user">Reset Selected User</button>
          <button id="ban-user">Ban User</button>
        </div>

        <button id="close-dev-portal">Close Portal</button>
      </div>
    `;
    
    document.body.appendChild(devPortal);
    this.setupEventListeners();
  }

  initializeAnalytics() {
    // Subscribe to user presence changes from WebSocket
    if (this.game.authManager.isDeveloper()) {
      this.game.authManager.subscribeToUserPresence(users => {
        this.updateActiveUsersList(users);
      });

      // Update total users count
      this.updateTotalUsersCount();

      // Subscribe to user events (login/logout)
      this.game.authManager.room.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'user_login' || data.type === 'user_logout') {
          this.updateActiveUsersList(this.game.authManager.getActiveUsers());
        }
      };
    }
  }

  updateActiveUsersList(users) {
    const usersList = document.getElementById('active-users-list');
    if (!usersList || !this.game.authManager.isDeveloper()) return;

    usersList.innerHTML = users.map(user => `
      <tr>
        <td>${user.username}</td>
        <td>${user.ip || 'Hidden'}</td>
        <td>Online</td>
        <td>${new Date().toLocaleTimeString()}</td>
      </tr>
    `).join('');
  }

  updateTotalUsersCount() {
    if (!this.game.authManager.isDeveloper()) return;
    
    const totalUsers = Object.keys(this.game.authManager.getAllUsers()).length;
    const totalUsersSpan = document.querySelector('#total-users span');
    if (totalUsersSpan) {
      totalUsersSpan.textContent = totalUsers;
    }
  }

  setupEventListeners() {
    // Game testing
    document.getElementById('add-minerals').addEventListener('click', () => {
      this.game.minerals += 1_000_000;
      this.game.updateDisplay();
    });

    document.getElementById('add-stardust').addEventListener('click', () => {
      this.game.stardust += 100;
      this.game.updateDisplay();
    });

    document.getElementById('unlock-all').addEventListener('click', () => {
      this.game.upgrades.upgrades.forEach(upgrade => {
        this.game.upgrades.purchase(upgrade, true);
      });
      this.game.updateDisplay();
    });

    document.getElementById('reset-game').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all progress?')) {
        this.game.resetToDefaultState();
        this.game.saveGameState();
        location.reload();
      }
    });

    // User management
    document.getElementById('reset-selected-user').addEventListener('click', () => {
      // Add logic to reset selected user
    });

    document.getElementById('ban-user').addEventListener('click', () => {
      // Add logic to ban user
    });

    // Close button
    document.getElementById('close-dev-portal').addEventListener('click', () => {
      this.hide();
    });

    // Add keyboard shortcut to open dev portal (Ctrl + Shift + D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D' && this.game.authManager.isDeveloper()) {
        this.togglePortal();
      }
    });
  }

  show() {
    if (!this.game.authManager.isDeveloper()) return;
    document.getElementById('dev-portal').style.display = 'block';
  }

  hide() {
    document.getElementById('dev-portal').style.display = 'none';
  }

  togglePortal() {
    if (!this.game.authManager.isDeveloper()) return;
    const portal = document.getElementById('dev-portal');
    if (portal.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
}