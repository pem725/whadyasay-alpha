class MemoryCapture {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStartTime = null;
        this.recordingInterval = null;
        this.capturedData = {
            text: '',
            audio: null,
            photo: null,
            files: [],
            tags: [],
            title: '',
            timestamp: null
        };
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Text input
        this.textInput = document.getElementById('textInput');
        
        // Recording elements
        this.recordBtn = document.getElementById('recordBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTime = document.getElementById('recordingTime');
        this.audioPlayback = document.getElementById('audioPlayback');
        
        // Photo elements
        this.cameraBtn = document.getElementById('cameraBtn');
        this.photoInput = document.getElementById('photoInput');
        this.photoPreview = document.getElementById('photoPreview');
        
        // File upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        
        // Metadata elements
        this.tagsInput = document.getElementById('tagsInput');
        this.titleInput = document.getElementById('titleInput');
        
        // Submit button
        this.submitBtn = document.getElementById('submitBtn');
    }

    bindEvents() {
        // Recording events
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        
        // Photo events
        this.cameraBtn.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoCapture(e));
        
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Submit event
        this.submitBtn.addEventListener('click', () => this.submitMemory());
    }

    async toggleRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                this.audioPlayback.src = audioUrl;
                this.audioPlayback.classList.remove('hidden');
                this.capturedData.audio = audioBlob;
            };

            this.mediaRecorder.start();
            this.recordingStartTime = Date.now();
            
            // Update UI
            this.recordBtn.classList.add('recording');
            this.recordBtn.querySelector('.record-text').textContent = 'Stop Recording';
            this.recordingStatus.classList.remove('hidden');
            
            // Start timer
            this.recordingInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                this.recordingTime.textContent = `${minutes}:${seconds}`;
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // Update UI
            this.recordBtn.classList.remove('recording');
            this.recordBtn.querySelector('.record-text').textContent = 'Start Recording';
            this.recordingStatus.classList.add('hidden');
            
            // Clear timer
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }
        }
    }

    handlePhotoCapture(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoPreview.innerHTML = `<img src="${e.target.result}" alt="Captured photo">`;
                this.photoPreview.classList.remove('hidden');
                this.capturedData.photo = file;
            };
            reader.readAsDataURL(file);
        }
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        this.addFilesToList(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(event.dataTransfer.files);
        this.addFilesToList(files);
    }

    addFilesToList(files) {
        files.forEach(file => {
            this.capturedData.files.push(file);
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name} (${this.formatFileSize(file.size)})</span>
                <button class="remove-btn" onclick="memoryCapture.removeFile('${file.name}')">×</button>
            `;
            
            this.fileList.appendChild(fileItem);
        });
    }

    removeFile(fileName) {
        this.capturedData.files = this.capturedData.files.filter(file => file.name !== fileName);
        this.updateFileList();
    }

    updateFileList() {
        this.fileList.innerHTML = '';
        this.capturedData.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name} (${this.formatFileSize(file.size)})</span>
                <button class="remove-btn" onclick="memoryCapture.removeFile('${file.name}')">×</button>
            `;
            this.fileList.appendChild(fileItem);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async submitMemory() {
        // Collect all data
        this.capturedData.text = this.textInput.value.trim();
        this.capturedData.title = this.titleInput.value.trim();
        this.capturedData.tags = this.tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.capturedData.timestamp = new Date().toISOString();

        // Validate that we have some content
        const hasContent = this.capturedData.text || 
                          this.capturedData.audio || 
                          this.capturedData.photo || 
                          this.capturedData.files.length > 0;

        if (!hasContent) {
            alert('Please add some content before saving your memory!');
            return;
        }

        // Disable submit button
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = '💾 Saving...';

        try {
            // Try to send to MCP server
            await this.sendToMCPServer(this.capturedData);
            
            // Success feedback
            this.submitBtn.textContent = '✅ Saved!';
            setTimeout(() => {
                this.resetForm();
            }, 2000);

        } catch (error) {
            console.error('Error saving memory:', error);
            
            // Check if it's a server connection error
            if (error.message.includes('fetch') || error.message.includes('HTTP error')) {
                alert('Unable to connect to server. Your memory has been saved locally and will sync when the server is available.');
                // TODO: Implement local storage fallback
                this.saveToLocalStorage(this.capturedData);
            } else {
                alert('Error saving memory. Please try again.');
            }
            
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = '💾 Save Memory';
        }
    }

    saveToLocalStorage(data) {
        try {
            // Get existing memories from localStorage
            const existingMemories = JSON.parse(localStorage.getItem('pendingMemories') || '[]');
            
            // Add new memory with a temporary ID
            const memoryWithId = {
                ...data,
                localId: Date.now(),
                savedAt: new Date().toISOString(),
                synced: false
            };
            
            existingMemories.push(memoryWithId);
            localStorage.setItem('pendingMemories', JSON.stringify(existingMemories));
            
            console.log('Memory saved to local storage:', memoryWithId);
            
            // Show success feedback
            this.submitBtn.textContent = '✅ Saved Locally!';
            setTimeout(() => {
                this.resetForm();
            }, 2000);
            
        } catch (error) {
            console.error('Error saving to local storage:', error);
            alert('Unable to save memory locally. Please try again.');
        }
    }

    async syncPendingMemories() {
        try {
            const pendingMemories = JSON.parse(localStorage.getItem('pendingMemories') || '[]');
            const unsynced = pendingMemories.filter(memory => !memory.synced);
            
            if (unsynced.length === 0) return;
            
            console.log(`Syncing ${unsynced.length} pending memories...`);
            
            for (const memory of unsynced) {
                try {
                    await this.sendToMCPServer(memory);
                    memory.synced = true;
                    console.log(`Synced memory: ${memory.title || 'Untitled'}`);
                } catch (error) {
                    console.error('Failed to sync memory:', error);
                    break; // Stop syncing if server is still unavailable
                }
            }
            
            // Update localStorage with sync status
            localStorage.setItem('pendingMemories', JSON.stringify(pendingMemories));
            
        } catch (error) {
            console.error('Error syncing memories:', error);
        }
    }

    async sendToMCPServer(data) {
        try {
            // Prepare data for MCP server
            const memoryData = {
                title: data.title,
                text: data.text,
                tags: data.tags,
                memory_type: 'experience',
                timestamp: data.timestamp
            };

            // Convert audio to base64 if present
            if (data.audio) {
                memoryData.audio_data = await this.blobToBase64(data.audio);
            }

            // Convert photo to base64 if present
            if (data.photo) {
                memoryData.photo_data = await this.fileToBase64(data.photo);
            }

            // Handle additional files
            if (data.files && data.files.length > 0) {
                memoryData.files = await Promise.all(
                    data.files.map(async (file) => ({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: await this.fileToBase64(file)
                    }))
                );
            }

            // Send to MCP server via bridge
            const response = await fetch('/api/memory/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memoryData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to store memory');
            }

            return result;

        } catch (error) {
            console.error('Error sending to MCP server:', error);
            throw error;
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    resetForm() {
        // Reset all inputs
        this.textInput.value = '';
        this.titleInput.value = '';
        this.tagsInput.value = '';
        
        // Reset audio
        this.audioPlayback.classList.add('hidden');
        this.audioPlayback.src = '';
        
        // Reset photo
        this.photoPreview.classList.add('hidden');
        this.photoPreview.innerHTML = '';
        
        // Reset files
        this.fileList.innerHTML = '';
        this.fileInput.value = '';
        
        // Reset data
        this.capturedData = {
            text: '',
            audio: null,
            photo: null,
            files: [],
            tags: [],
            title: '',
            timestamp: null
        };

        // Reset submit button
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = '💾 Save Memory';
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

        if (historyTab) {
            historyTab.addEventListener('click', () => {
                alert('History view coming soon!');
            });
        }
    }
}

// Initialize the app
const memoryCapture = new MemoryCapture();
memoryCapture.initializeNavigation();