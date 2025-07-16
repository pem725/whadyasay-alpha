/**
 * IndexedDB manager for What Do You Say? PWA
 * Handles local storage with encryption
 */

class PWALocalStorage {
  constructor() {
    this.dbName = 'WhaddyaSayDB';
    this.dbVersion = 1;
    this.db = null;
    this.cryptoManager = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init(cryptoManager) {
    this.cryptoManager = cryptoManager;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 Upgrading IndexedDB schema...');

        // Create object stores
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
          memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          memoryStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          memoryStore.createIndex('memory_type', 'memory_type', { unique: false });
          memoryStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
          conversationStore.createIndex('situation_type', 'situation_type', { unique: false });
          conversationStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('patterns')) {
          const patternStore = db.createObjectStore('patterns', { keyPath: 'id', autoIncrement: true });
          patternStore.createIndex('pattern_type', 'pattern_type', { unique: false });
          patternStore.createIndex('context', 'context', { unique: false });
          patternStore.createIndex('confidence_score', 'confidence_score', { unique: false });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('retries', 'retries', { unique: false });
        }
      };
    });
  }

  /**
   * Store a memory with encryption
   */
  async storeMemory(memoryData) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Prepare memory data
      const memory = {
        title: memoryData.title || '',
        content: memoryData.text || memoryData.content || '',
        tags: memoryData.tags || [],
        memory_type: memoryData.memory_type || 'experience',
        timestamp: memoryData.timestamp || new Date().toISOString(),
        created_at: new Date().toISOString(),
        synced: false,
        offline: true
      };

      // Handle file data
      if (memoryData.audio_data) {
        memory.audio_data = memoryData.audio_data;
      }
      if (memoryData.photo_data) {
        memory.photo_data = memoryData.photo_data;
      }
      if (memoryData.files) {
        memory.files_data = JSON.stringify(memoryData.files);
      }

      // Encrypt sensitive data if crypto manager is available
      if (this.cryptoManager && this.cryptoManager.authenticated) {
        const sensitiveData = {
          title: memory.title,
          content: memory.content,
          tags: memory.tags,
          memory_type: memory.memory_type,
          audio_data: memory.audio_data,
          photo_data: memory.photo_data,
          files_data: memory.files_data
        };

        const encryptedData = await this.cryptoManager.encryptData(sensitiveData);
        
        // Store encrypted data
        memory.encrypted_data = encryptedData;
        memory.encrypted = true;
        
        // Clear sensitive fields
        delete memory.title;
        delete memory.content;
        delete memory.tags;
        delete memory.audio_data;
        delete memory.photo_data;
        delete memory.files_data;
      }

      // Store in IndexedDB
      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.add(memory);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const memoryId = request.result;
          console.log('✅ Memory stored locally with ID:', memoryId);
          resolve(memoryId);
        };

        request.onerror = () => {
          console.error('❌ Error storing memory:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ Error storing memory:', error);
      throw error;
    }
  }

  /**
   * Get all memories
   */
  async getMemories(limit = 50) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Newest first

      const memories = [];
      let count = 0;

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          const memory = cursor.value;
          
          // Decrypt if encrypted
          if (memory.encrypted && this.cryptoManager && this.cryptoManager.authenticated) {
            try {
              const decryptedData = await this.cryptoManager.decryptData(memory.encrypted_data);
              Object.assign(memory, decryptedData);
              delete memory.encrypted_data;
              delete memory.encrypted;
            } catch (error) {
              console.error('Failed to decrypt memory:', error);
              memory.decryption_error = true;
            }
          }
          
          memories.push(memory);
          count++;
          cursor.continue();
        } else {
          resolve(memories);
        }
      };

      request.onerror = () => {
        console.error('❌ Error getting memories:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Search memories
   */
  async searchMemories(query, tags = [], memoryType = null, limit = 10) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const memories = await this.getMemories(100); // Get more to search through
    const searchResults = [];

    for (const memory of memories) {
      let matches = true;

      // Text search
      if (query && memory.content) {
        const contentMatch = memory.content.toLowerCase().includes(query.toLowerCase());
        const titleMatch = memory.title && memory.title.toLowerCase().includes(query.toLowerCase());
        if (!contentMatch && !titleMatch) {
          matches = false;
        }
      }

      // Tag filter
      if (tags.length > 0 && memory.tags) {
        const hasMatchingTag = tags.some(tag => 
          memory.tags.some(memoryTag => 
            memoryTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) {
          matches = false;
        }
      }

      // Memory type filter
      if (memoryType && memory.memory_type !== memoryType) {
        matches = false;
      }

      if (matches) {
        searchResults.push(memory);
      }

      if (searchResults.length >= limit) {
        break;
      }
    }

    return searchResults;
  }

  /**
   * Store conversation advice session
   */
  async storeConversation(conversationData) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const conversation = {
        situation: conversationData.situation || '',
        situation_type: conversationData.situation_type || 'general',
        advice_given: JSON.stringify(conversationData.advice || {}),
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        synced: false,
        offline: true
      };

      // Encrypt if crypto manager is available
      if (this.cryptoManager && this.cryptoManager.authenticated) {
        const sensitiveData = {
          situation: conversation.situation,
          advice_given: conversation.advice_given
        };

        const encryptedData = await this.cryptoManager.encryptData(sensitiveData);
        conversation.encrypted_data = encryptedData;
        conversation.encrypted = true;
        
        delete conversation.situation;
        delete conversation.advice_given;
      }

      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.add(conversation);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const conversationId = request.result;
          console.log('✅ Conversation stored locally with ID:', conversationId);
          resolve(conversationId);
        };

        request.onerror = () => {
          console.error('❌ Error storing conversation:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ Error storing conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversations(limit = 20) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Newest first

      const conversations = [];
      let count = 0;

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          const conversation = cursor.value;
          
          // Decrypt if encrypted
          if (conversation.encrypted && this.cryptoManager && this.cryptoManager.authenticated) {
            try {
              const decryptedData = await this.cryptoManager.decryptData(conversation.encrypted_data);
              Object.assign(conversation, decryptedData);
              delete conversation.encrypted_data;
              delete conversation.encrypted;
            } catch (error) {
              console.error('Failed to decrypt conversation:', error);
              conversation.decryption_error = true;
            }
          }
          
          conversations.push(conversation);
          count++;
          cursor.continue();
        } else {
          resolve(conversations);
        }
      };

      request.onerror = () => {
        console.error('❌ Error getting conversations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(type, data) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const syncItem = {
      type: type, // 'memory', 'conversation', etc.
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
      retries: 0,
      synced: false
    };

    const transaction = this.db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.add(syncItem);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get unsynced items
   */
  async getUnsyncedItems() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result.filter(item => !item.synced);
        resolve(items);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Mark item as synced
   */
  async markSynced(itemId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const getRequest = store.get(itemId);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          item.synced_at = new Date().toISOString();
          const putRequest = store.put(item);

          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stores = ['memories', 'conversations', 'patterns', 'sync_queue'];
    const transaction = this.db.transaction(stores, 'readwrite');

    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('✅ All local data cleared');
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    if (!this.db) {
      return { error: 'Database not initialized' };
    }

    try {
      const memories = await this.getMemories(1000);
      const conversations = await this.getConversations(1000);
      const unsynced = await this.getUnsyncedItems();

      return {
        memories: memories.length,
        conversations: conversations.length,
        unsynced: unsynced.length,
        encrypted: memories.filter(m => m.encrypted).length,
        storage_available: navigator.storage ? await navigator.storage.estimate() : null
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Export for use in other modules
window.PWALocalStorage = PWALocalStorage;