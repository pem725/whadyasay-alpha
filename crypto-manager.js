/**
 * Client-side encryption manager for What Do You Say? PWA
 * Uses Web Crypto API for secure encryption
 */

class PWACryptoManager {
  constructor() {
    this.authenticated = false;
    this.currentKey = null;
    this.masterKey = null;
    this.keyVersion = 1;
    this.iterations = 100000; // PBKDF2 iterations
  }

  /**
   * Initialize or authenticate with master password
   */
  async authenticate(masterPassword, setupNew = false) {
    try {
      if (setupNew) {
        return await this.setupFirstTime(masterPassword);
      } else {
        return await this.login(masterPassword);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * First-time setup with master password
   */
  async setupFirstTime(masterPassword) {
    try {
      console.log('🔐 Setting up client-side encryption...');

      // Generate salt for key derivation
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Derive key from password using PBKDF2
      const keyMaterial = await this.deriveKeyFromPassword(masterPassword, salt);
      
      // Generate additional encryption key
      const encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Export the encryption key to encrypt it with the master key
      const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
      
      // Encrypt the encryption key with the master key
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        keyMaterial,
        exportedKey
      );

      // Store encrypted key data
      const keyData = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        encryptedKey: Array.from(new Uint8Array(encryptedKey)),
        keyVersion: this.keyVersion,
        created: new Date().toISOString(),
        keyRotationDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      // Store in localStorage (encrypted)
      localStorage.setItem('whaddyasay_keydata', JSON.stringify(keyData));

      // Store auth info
      const authData = {
        lastAuth: new Date().toISOString(),
        authCount: 1,
        setupComplete: true
      };
      localStorage.setItem('whaddyasay_auth', JSON.stringify(authData));

      // Set current keys
      this.masterKey = keyMaterial;
      this.currentKey = encryptionKey;
      this.authenticated = true;

      console.log('✅ Client-side encryption setup complete!');
      return true;

    } catch (error) {
      console.error('❌ Setup failed:', error);
      return false;
    }
  }

  /**
   * Login with existing master password
   */
  async login(masterPassword) {
    try {
      const keyDataStr = localStorage.getItem('whaddyasay_keydata');
      if (!keyDataStr) {
        console.log('🔐 First time setup required');
        return await this.setupFirstTime(masterPassword);
      }

      const keyData = JSON.parse(keyDataStr);
      
      // Derive master key from password
      const salt = new Uint8Array(keyData.salt);
      const masterKey = await this.deriveKeyFromPassword(masterPassword, salt);

      // Decrypt the encryption key
      const iv = new Uint8Array(keyData.iv);
      const encryptedKey = new Uint8Array(keyData.encryptedKey);
      
      try {
        const decryptedKeyData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          masterKey,
          encryptedKey
        );

        // Import the decrypted key
        const encryptionKey = await crypto.subtle.importKey(
          'raw',
          decryptedKeyData,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        // Set current keys
        this.masterKey = masterKey;
        this.currentKey = encryptionKey;
        this.authenticated = true;

        // Update auth tracking
        this.updateAuthTracking();

        // Check if key rotation is due
        this.checkKeyRotation(keyData);

        console.log('✅ Authentication successful');
        return true;

      } catch (decryptError) {
        console.log('❌ Invalid password');
        return false;
      }

    } catch (error) {
      console.error('❌ Login failed:', error);
      return false;
    }
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKeyFromPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data
   */
  async encryptData(data) {
    if (!this.authenticated || !this.currentKey) {
      throw new Error('Not authenticated - call authenticate() first');
    }

    try {
      const encoder = new TextEncoder();
      const jsonData = JSON.stringify(data);
      const dataBuffer = encoder.encode(jsonData);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.currentKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encryptedData.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encryptedData), iv.length);

      // Return as base64 string
      return btoa(String.fromCharCode(...result));

    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedDataStr) {
    if (!this.authenticated || !this.currentKey) {
      throw new Error('Not authenticated - call authenticate() first');
    }

    try {
      // Convert from base64
      const encryptedData = new Uint8Array(
        atob(encryptedDataStr).split('').map(c => c.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = encryptedData.slice(0, 12);
      const data = encryptedData.slice(12);

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.currentKey,
        data
      );

      // Convert back to JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      return JSON.parse(jsonString);

    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(currentPassword, newPassword = null) {
    try {
      console.log('🔄 Rotating encryption keys...');

      if (!await this.login(currentPassword)) {
        return false;
      }

      const passwordToUse = newPassword || currentPassword;

      // Create backup of current keys
      const currentKeyData = localStorage.getItem('whaddyasay_keydata');
      const backupKey = `whaddyasay_backup_${Date.now()}`;
      localStorage.setItem(backupKey, currentKeyData);

      // Set up new keys
      const success = await this.setupFirstTime(passwordToUse);

      if (success) {
        console.log('✅ Key rotation complete');
        console.log('🔒 Old keys backed up securely');
        return true;
      } else {
        console.log('❌ Key rotation failed');
        return false;
      }

    } catch (error) {
      console.error('❌ Key rotation error:', error);
      return false;
    }
  }

  /**
   * Update authentication tracking
   */
  updateAuthTracking() {
    try {
      const authData = JSON.parse(localStorage.getItem('whaddyasay_auth') || '{}');
      authData.lastAuth = new Date().toISOString();
      authData.authCount = (authData.authCount || 0) + 1;
      localStorage.setItem('whaddyasay_auth', JSON.stringify(authData));
    } catch (error) {
      console.warn('Could not update auth tracking:', error);
    }
  }

  /**
   * Check if key rotation is due
   */
  checkKeyRotation(keyData) {
    try {
      const rotationDue = new Date(keyData.keyRotationDue);
      if (new Date() > rotationDue) {
        console.warn('⚠️  Key rotation recommended!');
        console.warn('   Your encryption keys are over 30 days old');
        console.warn('   Consider rotating keys for better security');
      }
    } catch (error) {
      // Non-critical
    }
  }

  /**
   * Get current security status
   */
  getSecurityStatus() {
    const status = {
      authenticated: this.authenticated,
      setupComplete: false,
      lastAuth: null,
      authCount: 0,
      keyRotationDue: null,
      daysUntilRotation: null
    };

    try {
      // Get auth data
      const authData = JSON.parse(localStorage.getItem('whaddyasay_auth') || '{}');
      Object.assign(status, authData);

      // Get key rotation info
      const keyData = JSON.parse(localStorage.getItem('whaddyasay_keydata') || '{}');
      if (keyData.keyRotationDue) {
        status.keyRotationDue = keyData.keyRotationDue;
        const rotationDate = new Date(keyData.keyRotationDue);
        const daysUntil = Math.ceil((rotationDate - new Date()) / (1000 * 60 * 60 * 24));
        status.daysUntilRotation = daysUntil;
      }

    } catch (error) {
      console.error('Error getting security status:', error);
    }

    return status;
  }

  /**
   * Clear all stored data (logout)
   */
  logout() {
    this.authenticated = false;
    this.currentKey = null;
    this.masterKey = null;
    console.log('🔐 Logged out - encryption keys cleared from memory');
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Test encryption/decryption
   */
  async testEncryption() {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    const testData = {
      message: 'Hello, World!',
      timestamp: new Date().toISOString(),
      number: 42
    };

    try {
      const encrypted = await this.encryptData(testData);
      const decrypted = await this.decryptData(encrypted);
      
      const success = JSON.stringify(testData) === JSON.stringify(decrypted);
      console.log('🧪 Encryption test:', success ? 'PASSED' : 'FAILED');
      return success;
    } catch (error) {
      console.error('🧪 Encryption test FAILED:', error);
      return false;
    }
  }
}

// Export for use in other modules
window.PWACryptoManager = PWACryptoManager;