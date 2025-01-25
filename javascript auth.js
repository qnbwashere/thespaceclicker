export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.devAccountUsername = 'dev';
    this.devAccountPassword = '8211';
    this.room = new WebsimSocket(); // Initialize WebSocket connection
    
    // Initialize storage if not exists
    if (!localStorage.getItem('spaceMiningUsers')) {
      localStorage.setItem('spaceMiningUsers', JSON.stringify({
        // Pre-create dev account
        dev: {
          password: this.hashPassword('8211'),
          createdAt: new Date().toISOString(),
          gameState: null
        }
      }));
    }

    // Ensure dev account exists in storage
    const users = this.getAllUsers();
    if (!users[this.devAccountUsername]) {
      users[this.devAccountUsername] = {
        password: this.hashPassword('8211'),
        createdAt: new Date().toISOString(),
        gameState: null
      };
      localStorage.setItem('spaceMiningUsers', JSON.stringify(users));
    }
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

  getActiveUsers() {
    if (!this.isDeveloper()) return null;
    return Object.values(this.room.party.peers);
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

  resetUser(username) {
    if (!this.isDeveloper()) return false;
    const users = this.getAllUsers();
    if (users[username]) {
      // Reset game state completely, including all-time minerals
      users[username].gameState = {
        minerals: 0,
        mineralsPerClick: 1,
        mineralsPerSecond: 0,
        multiplier: 1,
        upgrades: {},
        achievements: [],
        ownedStardustUpgrades: [],
        stardust: 0,
        stardustMultiplier: 1,
        mineralMultiplier: 1,
        quantumMiningEnabled: false,
        allTimeMineral: 0 // Reset all-time minerals
      };
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
}