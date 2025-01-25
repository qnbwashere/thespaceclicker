export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.devAccountUsername = 'dev';
    this.devAccountPassword = '8211';
    this.room = new WebsimSocket(); // Initialize WebSocket connection
    
    // Initialize storage if not exists AND ensure dev account exists
    if (!localStorage.getItem('spaceMiningUsers')) {
      localStorage.setItem('spaceMiningUsers', JSON.stringify({
        // Pre-create dev account
        dev: {
          password: this.hashPassword('8211'),
          createdAt: new Date().toISOString(),
          gameState: null
        }
      }));
    } else {
      // Ensure dev account exists even if storage exists
      const users = JSON.parse(localStorage.getItem('spaceMiningUsers'));
      if (!users.dev) {
        users.dev = {
          password: this.hashPassword('8211'),
          createdAt: new Date().toISOString(),
          gameState: null
        };
        localStorage.setItem('spaceMiningUsers', JSON.stringify(users));
      }
    }

    // Subscribe to user events
    this.room.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'user_login') {
        this.handleUserLogin(data);
      } else if (data.type === 'user_logout') {
        this.handleUserLogout(data);
      }
    };
  }

  register(username, password) {
    // Prevent registering as 'dev'
    if (username.toLowerCase() === 'dev') {
      throw new Error('This username is not allowed');
    }

    // Get existing users
    let existingUsers = this.getAllUsers();

    // Check if username already exists
    if (existingUsers[username]) {
      throw new Error('Username already exists');
    }

    // Store user
    existingUsers[username] = {
      password: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      gameState: null
    };

    localStorage.setItem('spaceMiningUsers', JSON.stringify(existingUsers));
    return true;
  }

  async login(username, password) {
    // Special dev account check
    if (username.toLowerCase() === this.devAccountUsername && 
        password === this.devAccountPassword) {
      this.currentUser = this.devAccountUsername;
      // Send login event to WebSocket
      this.room.send({
        type: 'developer_login',
        username: username
      });
      return true;
    }

    // Get existing users
    const existingUsers = this.getAllUsers();
    const user = existingUsers[username];

    if (!user) {
      throw new Error('User not found');
    }

    // Check password
    if (this.verifyPassword(password, user.password)) {
      this.currentUser = username;
      // Send login event to WebSocket
      this.room.send({
        type: 'user_login',
        username: username
      });
      return true;
    }

    throw new Error('Invalid password');
  }

  logout() {
    if (this.currentUser) {
      // Send logout event
      this.room.send({
        type: 'user_logout',
        username: this.currentUser
      });
    }
    this.currentUser = null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getAllUsers() {
    const users = localStorage.getItem('spaceMiningUsers');
    return users ? JSON.parse(users) : {};
  }

  hashPassword(password) {
    // Simple obfuscation - do NOT use in production!
    return btoa(password);
  }

  verifyPassword(inputPassword, storedPassword) {
    return btoa(inputPassword) === storedPassword;
  }

  saveGameState(gameState) {
    if (!this.currentUser) {
      console.warn('No user logged in');
      return;
    }

    // Get all users
    const users = this.getAllUsers();
    
    // If user doesn't exist yet, create their entry
    if (!users[this.currentUser]) {
      users[this.currentUser] = {
        password: '',  // Will be set during registration
        createdAt: new Date().toISOString(),
        gameState: {}
      };
    }

    // Update game state
    users[this.currentUser].gameState = gameState;
    
    // Save back to localStorage
    localStorage.setItem('spaceMiningUsers', JSON.stringify(users));
  }

  loadGameState() {
    if (!this.currentUser) {
      console.warn('No user logged in');
      return null;
    }

    const users = this.getAllUsers();
    const user = users[this.currentUser];
    
    if (!user || !user.gameState) {
      return null;
    }

    return user.gameState;
  }

  isDeveloper() {
    return this.currentUser === this.devAccountUsername;
  }

  handleUserLogin(data) {
    if (this.isDeveloper()) {
      console.log(`User logged in: ${data.username}`);
      // Update active users list if dev portal is open
      const devPortal = document.getElementById('dev-portal');
      if (devPortal && devPortal.style.display !== 'none') {
        this.updateActiveUsersList();
      }
    }
  }

  handleUserLogout(data) {
    if (this.isDeveloper()) {
      console.log(`User logged out: ${data.username}`);
      // Update active users list if dev portal is open
      const devPortal = document.getElementById('dev-portal');
      if (devPortal && devPortal.style.display !== 'none') {
        this.updateActiveUsersList();
      }
    }
  }

  getActiveUsers() {
    if (!this.isDeveloper()) return null;
    return Object.values(this.room.party.peers);
  }

  resetUser(username) {
    if (!this.isDeveloper()) return false;
    const users = this.getAllUsers();
    if (users[username]) {
      users[username].gameState = null;
      localStorage.setItem('spaceMiningUsers', JSON.stringify(users));
      return true;
    }
    return false;
  }

  getUserStats() {
    if (!this.isDeveloper()) return null;
    const users = this.getAllUsers();
    return {
      totalUsers: Object.keys(users).length,
      activeUsers: Object.values(this.room.party.peers).length
    };
  }

  subscribeToUserPresence(callback) {
    return this.room.party.subscribe((peers) => {
      const users = Object.values(peers).map(peer => ({
        username: peer.username,
        avatarUrl: peer.avatarUrl
      }));
      callback(users);
    });
  }

  updateActiveUsersList() {
    // This method was not defined in the original code, 
    // so I'm assuming it should update the active users list in the dev portal
    const activeUsers = this.getActiveUsers();
    const activeUsersList = document.getElementById('active-users-list');
    if (activeUsersList) {
      activeUsersList.innerHTML = '';
      activeUsers.forEach(user => {
        const listItem = document.createElement('li');
        listItem.textContent = user.username;
        activeUsersList.appendChild(listItem);
      });
    }
  }

  exportUserData() {
    if (!this.isDeveloper()) return null;
    
    const users = this.getAllUsers();
    const exportData = {
      totalUsers: Object.keys(users).length,
      users: Object.entries(users).map(([username, data]) => ({
        username,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin || 'Never',
        gameState: data.gameState || null
      }))
    };
    
    return exportData;
  }
}