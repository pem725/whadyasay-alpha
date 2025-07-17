/**
 * WebLLM Engine for Mobile-First AI Processing
 * Runs LLMs directly in browser with no installation required
 * Optimized for mobile devices with privacy-first approach
 */

class WebLLMEngine {
    constructor() {
        this.initialized = false;
        this.engine = null;
        this.currentModel = null;
        this.availableModels = [];
        this.modelCache = new Map();
        this.downloadProgress = null;
        this.onProgressCallback = null;
        this.isDownloading = false;
        this.modelConfig = {
            // Mobile-optimized models (smaller, faster)
            'phi-2': {
                name: 'Phi-2',
                size: '1.4GB',
                description: 'Microsoft\'s efficient 2.7B model, great for mobile',
                model_id: 'microsoft/phi-2',
                recommended: true,
                mobile_optimized: true
            },
            'gemma-2b': {
                name: 'Gemma 2B',
                size: '1.5GB', 
                description: 'Google\'s lightweight model for conversations',
                model_id: 'google/gemma-2b-it',
                recommended: true,
                mobile_optimized: true
            },
            'tinyllama': {
                name: 'TinyLlama',
                size: '637MB',
                description: 'Ultra-small model for basic conversations',
                model_id: 'tinyllama/tinyllama-1.1b-chat',
                recommended: false,
                mobile_optimized: true
            },
            'mistral-7b': {
                name: 'Mistral 7B',
                size: '4.2GB',
                description: 'High-quality model (requires 8GB+ RAM)',
                model_id: 'mistralai/mistral-7b-instruct',
                recommended: false,
                mobile_optimized: false
            }
        };
    }

    /**
     * Initialize WebLLM engine
     */
    async init() {
        try {
            console.log('🌐 Initializing WebLLM Engine for mobile...');
            
            // Check browser compatibility
            if (!this.checkBrowserSupport()) {
                throw new Error('Browser not supported for WebLLM');
            }
            
            // Load WebLLM library if not already loaded
            await this.loadWebLLMLibrary();
            
            // Initialize WebLLM engine
            this.engine = new window.WebLLM.MLCEngine();
            
            // Get available models
            this.availableModels = Object.keys(this.modelConfig);
            
            this.initialized = true;
            console.log('✅ WebLLM Engine initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize WebLLM:', error);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Check if browser supports WebLLM
     */
    checkBrowserSupport() {
        // Check for WebGPU support (preferred)
        if (navigator.gpu) {
            console.log('✅ WebGPU supported - will use GPU acceleration');
            return true;
        }
        
        // Check for WebAssembly support (fallback)
        if (typeof WebAssembly === 'object') {
            console.log('⚠️ WebGPU not available, using WebAssembly fallback');
            return true;
        }
        
        console.error('❌ Browser does not support WebLLM requirements');
        return false;
    }

    /**
     * Load WebLLM library dynamically
     */
    async loadWebLLMLibrary() {
        if (window.WebLLM) {
            console.log('📚 WebLLM already loaded');
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/lib/index.min.js';
            script.onload = () => {
                console.log('📚 WebLLM library loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load WebLLM library');
                reject(new Error('Failed to load WebLLM library'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Get available models optimized for mobile
     */
    getAvailableModels() {
        return this.availableModels.map(modelId => ({
            id: modelId,
            name: this.modelConfig[modelId].name,
            size: this.modelConfig[modelId].size,
            description: this.modelConfig[modelId].description,
            recommended: this.modelConfig[modelId].recommended,
            mobile_optimized: this.modelConfig[modelId].mobile_optimized,
            downloaded: this.modelCache.has(modelId)
        }));
    }

    /**
     * Download and load a model
     */
    async loadModel(modelId, onProgress = null) {
        if (!this.initialized) {
            throw new Error('WebLLM engine not initialized');
        }

        if (this.currentModel === modelId) {
            console.log(`✅ Model ${modelId} already loaded`);
            return true;
        }

        try {
            this.isDownloading = true;
            this.onProgressCallback = onProgress;
            
            const modelConfig = this.modelConfig[modelId];
            if (!modelConfig) {
                throw new Error(`Unknown model: ${modelId}`);
            }

            console.log(`📥 Loading model: ${modelConfig.name} (${modelConfig.size})`);
            
            // Create progress callback
            const progressCallback = (progress) => {
                this.downloadProgress = progress;
                if (this.onProgressCallback) {
                    this.onProgressCallback(progress);
                }
            };

            // Load model with progress tracking
            await this.engine.reload(modelConfig.model_id, {
                initProgressCallback: progressCallback
            });

            // Mark as loaded
            this.currentModel = modelId;
            this.modelCache.set(modelId, true);
            this.isDownloading = false;
            
            console.log(`✅ Model ${modelConfig.name} loaded successfully`);
            return true;
            
        } catch (error) {
            this.isDownloading = false;
            console.error(`❌ Failed to load model ${modelId}:`, error);
            throw error;
        }
    }

    /**
     * Generate conversation advice using loaded model
     */
    async generateAdvice(prompt, options = {}) {
        if (!this.initialized || !this.currentModel) {
            throw new Error('No model loaded');
        }

        try {
            console.log('🤖 Generating advice with WebLLM...');
            
            const response = await this.engine.chat.completions.create({
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 1000,
                stream: false
            });

            const advice = response.choices[0].message.content;
            
            return {
                advice,
                model: this.currentModel,
                model_name: this.modelConfig[this.currentModel].name,
                generated_at: new Date().toISOString(),
                privacy_level: 'complete_privacy',
                processing_location: 'local_browser'
            };
            
        } catch (error) {
            console.error('❌ Error generating advice:', error);
            throw error;
        }
    }

    /**
     * Get recommended model for current device
     */
    getRecommendedModel() {
        // Check available RAM (rough estimate)
        const ramEstimate = navigator.deviceMemory || 4; // GB
        
        if (ramEstimate >= 8) {
            return 'phi-2'; // Best quality for good hardware
        } else if (ramEstimate >= 6) {
            return 'gemma-2b'; // Good balance
        } else {
            return 'tinyllama'; // Lightweight for lower-end devices
        }
    }

    /**
     * Check if model is suitable for current device
     */
    isModelSuitableForDevice(modelId) {
        const modelConfig = this.modelConfig[modelId];
        if (!modelConfig) return false;

        // Check RAM requirements
        const ramEstimate = navigator.deviceMemory || 4;
        const modelSizeGB = parseFloat(modelConfig.size.replace('GB', ''));
        
        // Need at least 2x model size in RAM
        return ramEstimate >= (modelSizeGB * 2);
    }

    /**
     * Get model download progress
     */
    getDownloadProgress() {
        return {
            isDownloading: this.isDownloading,
            progress: this.downloadProgress,
            currentModel: this.currentModel
        };
    }

    /**
     * Unload current model to free memory
     */
    async unloadModel() {
        if (this.currentModel) {
            try {
                // WebLLM doesn't have explicit unload, but we can clear our reference
                this.currentModel = null;
                console.log('✅ Model unloaded');
            } catch (error) {
                console.error('❌ Error unloading model:', error);
            }
        }
    }

    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        if (!this.currentModel) {
            return { used: 0, total: 0, model: null };
        }

        const modelSize = parseFloat(this.modelConfig[this.currentModel].size.replace('GB', ''));
        const totalRAM = navigator.deviceMemory || 4;
        
        return {
            used: modelSize,
            total: totalRAM,
            model: this.currentModel,
            usage_percent: Math.round((modelSize / totalRAM) * 100)
        };
    }

    /**
     * Clear model cache
     */
    clearCache() {
        this.modelCache.clear();
        this.currentModel = null;
        console.log('🧹 Model cache cleared');
    }

    /**
     * Check if WebLLM is supported on this device
     */
    static async checkSupport() {
        try {
            // Basic browser feature detection
            const hasWebGPU = !!navigator.gpu;
            const hasWebAssembly = typeof WebAssembly === 'object';
            const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
            
            // Estimate device capabilities
            const ramEstimate = navigator.deviceMemory || 4;
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            return {
                supported: hasWebAssembly,
                webgpu: hasWebGPU,
                ram_estimate: ramEstimate,
                is_mobile: isMobile,
                shared_array_buffer: hasSharedArrayBuffer,
                recommended_model: ramEstimate >= 8 ? 'phi-2' : ramEstimate >= 6 ? 'gemma-2b' : 'tinyllama'
            };
            
        } catch (error) {
            return {
                supported: false,
                error: error.message
            };
        }
    }
}

// Export for use in other modules
window.WebLLMEngine = WebLLMEngine;