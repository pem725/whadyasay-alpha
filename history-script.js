class HistoryManager {
    constructor() {
        this.memories = [];
        this.conversations = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
        this.initializeNavigation();
    }

    initializeElements() {
        this.historyList = document.getElementById('historyList');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.getElementById('searchInput');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        // Stats elements
        this.memoryCount = document.getElementById('memoryCount');
        this.conversationCount = document.getElementById('conversationCount');
        this.totalDays = document.getElementById('totalDays');
        
        // Export buttons
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.exportCsvBtn = document.getElementById('exportCsvBtn');
    }

    bindEvents() {
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderHistory();
        });

        // Filter tabs
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

        // Export buttons
        this.exportJsonBtn.addEventListener('click', () => this.exportAsJson());
        this.exportCsvBtn.addEventListener('click', () => this.exportAsCsv());
    }

    async loadData() {
        try {
            // Load memories from localStorage
            this.memories = this.getStoredMemories();
            
            // Load conversation history from localStorage
            this.conversations = this.getStoredConversations();
            
            this.updateStats();
            this.renderHistory();
        } catch (error) {
            console.error('Error loading history data:', error);
            this.showError('Failed to load history data');
        }
    }

    getStoredMemories() {
        try {
            const memories = JSON.parse(localStorage.getItem('whaddyasay_memories') || '[]');
            return memories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('Error loading memories:', error);
            return [];
        }
    }

    getStoredConversations() {
        try {
            const conversations = JSON.parse(localStorage.getItem('whaddyasay_conversations') || '[]');
            return conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('Error loading conversations:', error);
            return [];
        }
    }

    updateStats() {
        this.memoryCount.textContent = this.memories.length;
        this.conversationCount.textContent = this.conversations.length;
        
        // Calculate total active days
        const allDates = [
            ...this.memories.map(m => new Date(m.created_at).toDateString()),
            ...this.conversations.map(c => new Date(c.created_at).toDateString())
        ];
        const uniqueDates = [...new Set(allDates)];
        this.totalDays.textContent = uniqueDates.length;
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderHistory();
    }

    renderHistory() {
        const allItems = this.getFilteredItems();
        
        if (allItems.length === 0) {
            this.historyList.classList.add('hidden');
            this.emptyState.classList.remove('hidden');
            return;
        }
        
        this.historyList.classList.remove('hidden');
        this.emptyState.classList.add('hidden');
        
        this.historyList.innerHTML = allItems.map(item => this.renderHistoryItem(item)).join('');
        
        // Bind action buttons
        this.bindActionButtons();
    }

    getFilteredItems() {
        let items = [];
        
        // Add memories if filter allows
        if (this.currentFilter === 'all' || this.currentFilter === 'memories') {
            items.push(...this.memories.map(memory => ({
                ...memory,
                type: 'memory'
            })));
        }
        
        // Add conversations if filter allows
        if (this.currentFilter === 'all' || this.currentFilter === 'conversations') {
            items.push(...this.conversations.map(conversation => ({
                ...conversation,
                type: 'conversation'
            })));
        }
        
        // Apply search filter using processed content for better search
        if (this.searchTerm) {
            items = items.filter(item => {
                const searchText = [
                    item.title || '',
                    item.text || '',
                    item.situation || '',
                    item.processed_content?.searchable_content || '',
                    item.processed_content?.content_summary || '',
                    ...(item.tags || []),
                    ...(item.processed_content?.topics?.map(t => t.topic) || []),
                    ...(item.processed_content?.entities?.map(e => e.entity) || []),
                    ...(item.processed_content?.media_descriptions || [])
                ].join(' ').toLowerCase();
                
                return searchText.includes(this.searchTerm);
            });
        }
        
        // Sort by date (newest first)
        return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    renderHistoryItem(item) {
        const isMemory = item.type === 'memory';
        const date = new Date(item.created_at).toLocaleDateString();
        const time = new Date(item.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const title = item.title || (isMemory ? 'Untitled Memory' : 'Conversation Session');
        const content = item.text || item.situation || 'No content';
        const truncatedContent = content.length > 200 ? content.substring(0, 200) + '...' : content;
        
        // Generate attachments
        const attachments = [];
        if (item.audio_data) attachments.push({ type: '🎤', name: 'Audio Recording' });
        if (item.photo_data) attachments.push({ type: '📸', name: item.photo_name || 'Photo' });
        if (item.files_data) {
            item.files_data.forEach(file => {
                attachments.push({ type: '📎', name: file.name });
            });
        }
        
        const attachmentHtml = attachments.length > 0 ? `
            <div class="item-attachments">
                ${attachments.map(att => `
                    <div class="attachment">
                        <span>${att.type}</span>
                        <span>${att.name}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        const tagsHtml = item.tags && item.tags.length > 0 ? `
            <div class="item-tags">
                ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        ` : '';
        
        return `
            <div class="history-item ${isMemory ? 'memory-item' : 'conversation-item'}" data-id="${item.id}" data-type="${item.type}">
                <div class="item-header">
                    <div>
                        <div class="item-title">${title}</div>
                        <div class="item-meta">
                            <span>${isMemory ? '🧠' : '💬'} ${isMemory ? 'Memory' : 'Conversation'}</span>
                            <span>📅 ${date}</span>
                            <span>🕐 ${time}</span>
                        </div>
                    </div>
                </div>
                
                <div class="item-content">${truncatedContent}</div>
                
                ${tagsHtml}
                ${attachmentHtml}
                
                <div class="item-actions">
                    <button class="action-btn view-btn" onclick="historyManager.viewItem('${item.id}', '${item.type}')">
                        👁️ View
                    </button>
                    <button class="action-btn export-btn" onclick="historyManager.exportItem('${item.id}', '${item.type}')">
                        📤 Export
                    </button>
                    <button class="action-btn delete-btn" onclick="historyManager.deleteItem('${item.id}', '${item.type}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    bindActionButtons() {
        // Action buttons are handled via onclick attributes for simplicity
        // This method exists for potential future enhancements
    }

    viewItem(id, type) {
        const item = type === 'memory' 
            ? this.memories.find(m => m.id == id)
            : this.conversations.find(c => c.id == id);
        
        if (!item) {
            alert('Item not found');
            return;
        }
        
        this.showItemDetail(item, type);
    }

    showItemDetail(item, type) {
        const isMemory = type === 'memory';
        const date = new Date(item.created_at).toLocaleString();
        
        let contentHtml = `
            <h3>${item.title || (isMemory ? 'Memory' : 'Conversation')}</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Type:</strong> ${isMemory ? 'Memory' : 'Conversation'}</p>
        `;
        
        if (item.text) {
            contentHtml += `<p><strong>Content:</strong></p><p>${item.text}</p>`;
        }
        
        if (item.situation) {
            contentHtml += `<p><strong>Situation:</strong></p><p>${item.situation}</p>`;
        }
        
        if (item.tags && item.tags.length > 0) {
            contentHtml += `<p><strong>Tags:</strong> ${item.tags.join(', ')}</p>`;
        }
        
        if (item.audio_data) {
            contentHtml += `<p><strong>Audio:</strong> Recording available</p>`;
        }
        
        if (item.photo_data) {
            contentHtml += `<p><strong>Photo:</strong> ${item.photo_name || 'Image attached'}</p>`;
        }
        
        if (item.files_data && item.files_data.length > 0) {
            const fileNames = item.files_data.map(f => f.name).join(', ');
            contentHtml += `<p><strong>Files:</strong> ${fileNames}</p>`;
        }
        
        // Create modal or new page (simple alert for now)
        const popup = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
        popup.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Item Details</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    h3 { color: #333; }
                    p { margin-bottom: 10px; }
                </style>
            </head>
            <body>
                ${contentHtml}
                <button onclick="window.close()">Close</button>
            </body>
            </html>
        `);
    }

    exportItem(id, type) {
        const item = type === 'memory' 
            ? this.memories.find(m => m.id == id)
            : this.conversations.find(c => c.id == id);
        
        if (!item) {
            alert('Item not found');
            return;
        }
        
        const dataStr = JSON.stringify(item, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${type}_${id}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    deleteItem(id, type) {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) {
            return;
        }
        
        try {
            if (type === 'memory') {
                this.memories = this.memories.filter(m => m.id != id);
                localStorage.setItem('whaddyasay_memories', JSON.stringify(this.memories));
            } else {
                this.conversations = this.conversations.filter(c => c.id != id);
                localStorage.setItem('whaddyasay_conversations', JSON.stringify(this.conversations));
            }
            
            this.updateStats();
            this.renderHistory();
            
            console.log(`✅ ${type} deleted:`, id);
        } catch (error) {
            console.error(`❌ Error deleting ${type}:`, error);
            alert(`Failed to delete ${type}`);
        }
    }

    exportAsJson() {
        const exportData = {
            memories: this.memories,
            conversations: this.conversations,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `whaddyasay_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    exportAsCsv() {
        const allItems = [
            ...this.memories.map(m => ({ ...m, type: 'memory' })),
            ...this.conversations.map(c => ({ ...c, type: 'conversation' }))
        ];
        
        if (allItems.length === 0) {
            alert('No data to export');
            return;
        }
        
        const headers = ['Type', 'Title', 'Content', 'Tags', 'Date', 'Has Audio', 'Has Photo', 'File Count'];
        const csvData = [
            headers.join(','),
            ...allItems.map(item => [
                item.type,
                `"${(item.title || '').replace(/"/g, '""')}"`,
                `"${(item.text || item.situation || '').replace(/"/g, '""')}"`,
                `"${(item.tags || []).join('; ')}"`,
                new Date(item.created_at).toISOString(),
                item.audio_data ? 'Yes' : 'No',
                item.photo_data ? 'Yes' : 'No',
                (item.files_data || []).length
            ].join(','))
        ].join('\n');
        
        const dataBlob = new Blob([csvData], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `whaddyasay_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    showError(message) {
        console.error(message);
        // Could implement a toast notification here
        alert('Error: ' + message);
    }

    // Navigation functionality
    initializeNavigation() {
        const coachTab = document.getElementById('coachTab');
        const memoryTab = document.getElementById('memoryTab');
        const historyTab = document.getElementById('historyTab');

        if (coachTab) {
            coachTab.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        if (memoryTab) {
            memoryTab.addEventListener('click', () => {
                window.location.href = 'memory.html';
            });
        }
    }
}

// Initialize the history manager
const historyManager = new HistoryManager();