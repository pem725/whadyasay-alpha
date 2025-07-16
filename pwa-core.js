/**
 * PWA Core functionality for What Do You Say?
 * Handles PWA installation, service worker registration, and offline functionality
 */

class PWACore {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOffline = !navigator.onLine;
    this.cryptoManager = null;
    this.localStorage = null;
    this.aiEngine = null;
    this.updateAvailable = false;
    
    this.init();
  }

  /**
   * Initialize PWA functionality
   */
  async init() {
    console.log('🚀 Initializing PWA Core...');
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Initialize core components
    await this.initializeCoreComponents();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check installation status
    this.checkInstallationStatus();
    
    // Show installation prompt if appropriate
    this.setupInstallationPrompt();
    
    // Handle offline/online status
    this.handleConnectionStatus();
    
    console.log('✅ PWA Core initialized');
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        });
        
        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Initialize core components
   */
  async initializeCoreComponents() {
    try {
      // Initialize crypto manager
      this.cryptoManager = new PWACryptoManager();
      
      // Initialize local storage
      this.localStorage = new PWALocalStorage();
      await this.localStorage.init(this.cryptoManager);
      
      // Initialize AI engine
      this.aiEngine = new PWAAIEngine();
      await this.aiEngine.init(this.localStorage);
      
      // Make components globally available
      window.pwaCore = this;
      window.cryptoManager = this.cryptoManager;
      window.localStorage = this.localStorage;
      window.aiEngine = this.aiEngine;
      
      console.log('✅ Core components initialized');
    } catch (error) {
      console.error('❌ Failed to initialize core components:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showSuccessMessage('App installed successfully!');
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.handleOffline();
    });

    // Page visibility for sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.syncOfflineData();
      }
    });
  }

  /**
   * Check if app is already installed
   */
  checkInstallationStatus() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('✅ PWA is installed (standalone mode)');
    }
    
    // Check if running in PWA context
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('✅ PWA is installed (iOS standalone)');
    }
  }

  /**
   * Set up installation prompt
   */
  setupInstallationPrompt() {
    // Create install button if not already installed
    if (!this.isInstalled) {
      this.createInstallButton();
    }
  }

  /**
   * Create install button
   */
  createInstallButton() {
    const existingButton = document.getElementById('pwa-install-button');
    if (existingButton) return;

    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-button';
    installButton.className = 'install-button hidden';
    installButton.innerHTML = '📱 Install App';
    installButton.onclick = () => this.installApp();

    // Add to header or create floating button
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) {
      header.appendChild(installButton);
    } else {
      installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        background: #16213e;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(installButton);
    }
  }

  /**
   * Show install button
   */
  showInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.classList.remove('hidden');
    }
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.classList.add('hidden');
    }
  }

  /**
   * Install the PWA
   */
  async installApp() {
    if (!this.deferredPrompt) {
      this.showInstallInstructions();
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }
      
      // Clear the prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
      
    } catch (error) {
      console.error('❌ Error during installation:', error);
      this.showInstallInstructions();
    }
  }

  /**
   * Show manual install instructions
   */
  showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = `
        <div class="install-instructions">
          <h3>Install on iOS:</h3>
          <ol>
            <li>Tap the Share button <span style="font-size: 1.2em;">⬆️</span></li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to install</li>
          </ol>
        </div>
      `;
    } else if (isAndroid) {
      instructions = `
        <div class="install-instructions">
          <h3>Install on Android:</h3>
          <ol>
            <li>Tap the menu button <span style="font-size: 1.2em;">⋮</span></li>
            <li>Select "Add to Home Screen" or "Install App"</li>
            <li>Tap "Install" to confirm</li>
          </ol>
        </div>
      `;
    } else {
      instructions = `
        <div class="install-instructions">
          <h3>Install on Desktop:</h3>
          <ol>
            <li>Look for the install icon in your browser's address bar</li>
            <li>Click it and select "Install"</li>
            <li>Or use your browser's menu to find "Install App"</li>
          </ol>
        </div>
      `;
    }
    
    this.showModal('Install What Do You Say?', instructions);
  }

  /**
   * Handle going online
   */
  handleOnline() {
    console.log('🌐 Back online');
    this.hideOfflineIndicator();
    this.syncOfflineData();
    this.showSuccessMessage('Back online! Syncing your data...');
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('📴 Gone offline');
    this.showOfflineIndicator();
    this.showInfoMessage('You\'re offline. Don\'t worry - the app still works!');
  }

  /**
   * Show offline indicator
   */
  showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.innerHTML = '📴 Offline Mode';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f39c12;
        color: white;
        text-align: center;
        padding: 8px;
        font-size: 14px;
        z-index: 10000;
        animation: slideDown 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }
  }

  /**
   * Hide offline indicator
   */
  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Sync offline data
   */
  async syncOfflineData() {
    if (!this.localStorage || this.isOffline) return;

    try {
      const unsyncedItems = await this.localStorage.getUnsyncedItems();
      
      if (unsyncedItems.length > 0) {
        console.log(`🔄 Syncing ${unsyncedItems.length} offline items...`);
        
        for (const item of unsyncedItems) {
          try {
            // Attempt to sync each item
            await this.syncSingleItem(item);
            await this.localStorage.markSynced(item.id);
          } catch (error) {
            console.error('Failed to sync item:', item.id, error);
          }
        }
        
        console.log('✅ Offline sync completed');
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  /**
   * Sync a single item
   */
  async syncSingleItem(item) {
    const data = JSON.parse(item.data);
    
    switch (item.type) {
      case 'memory':
        await this.syncMemory(data);
        break;
      case 'conversation':
        await this.syncConversation(data);
        break;
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  /**
   * Sync memory to server
   */
  async syncMemory(memoryData) {
    const response = await fetch('/api/memory/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Sync conversation to server
   */
  async syncConversation(conversationData) {
    // Implementation depends on your server API
    console.log('Syncing conversation:', conversationData);
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span>🔄 New version available!</span>
        <button onclick="pwaCore.updateApp()" class="update-btn">Update</button>
        <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">×</button>
      </div>
    `;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #16213e;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Update the app
   */
  async updateApp() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show info message
   */
  showInfoMessage(message) {
    this.showToast(message, 'info');
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Show modal dialog
   */
  showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'pwa-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${title}</h3>
            <button onclick="this.closest('.pwa-modal').remove()" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Get PWA status
   */
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      isOffline: this.isOffline,
      updateAvailable: this.updateAvailable,
      serviceWorkerRegistered: 'serviceWorker' in navigator,
      pushSupported: 'PushManager' in window,
      notificationSupported: 'Notification' in window
    };
  }
}

// Initialize PWA Core when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaCore = new PWACore();
  });
} else {
  window.pwaCore = new PWACore();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
    10% { opacity: 1; transform: translateX(-50%) translateY(0); }
    90% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
  
  .hidden { display: none !important; }
  
  .pwa-modal .modal-overlay {
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .pwa-modal .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .pwa-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .pwa-modal .modal-body {
    padding: 20px;
  }
  
  .pwa-modal .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }
  
  .install-instructions ol {
    padding-left: 20px;
  }
  
  .install-instructions li {
    margin: 10px 0;
    line-height: 1.5;
  }
  
  .update-notification .update-content {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .update-notification .update-btn {
    background: #27ae60;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .update-notification .dismiss-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    margin-left: auto;
  }
`;
document.head.appendChild(style);