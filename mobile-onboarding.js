/**
 * Mobile-Friendly AI Onboarding Flow
 * Guides novice users through easy AI setup with no software installation
 */

class MobileOnboarding {
    constructor() {
        this.currentStep = 0;
        this.webllmEngine = null;
        this.selectedModel = null;
        this.onboardingComplete = false;
        this.steps = [
            'welcome',
            'compatibility',
            'model_selection',
            'model_download',
            'completion'
        ];
    }

    /**
     * Start the onboarding process
     */
    async startOnboarding() {
        console.log('🚀 Starting mobile AI onboarding...');
        
        // Check if user has already completed onboarding
        const completed = localStorage.getItem('whaddyasay_onboarding_completed');
        if (completed) {
            console.log('✅ Onboarding already completed');
            return true;
        }

        // Initialize WebLLM engine
        this.webllmEngine = new WebLLMEngine();
        
        // Show onboarding modal
        this.showOnboardingModal();
        
        // Start with first step
        await this.showStep('welcome');
        
        return false; // Not completed yet
    }

    /**
     * Show onboarding modal
     */
    showOnboardingModal() {
        const modalHtml = `
            <div class="onboarding-overlay" id="onboardingOverlay">
                <div class="onboarding-modal">
                    <div class="onboarding-header">
                        <h2 id="onboardingTitle">🤖 AI Setup</h2>
                        <div class="step-indicator" id="stepIndicator">
                            <div class="steps">
                                <span class="step active">1</span>
                                <span class="step">2</span>
                                <span class="step">3</span>
                                <span class="step">4</span>
                                <span class="step">5</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="onboarding-content" id="onboardingContent">
                        <!-- Dynamic content will be inserted here -->
                    </div>
                    
                    <div class="onboarding-footer">
                        <button class="btn-secondary" id="skipBtn" style="display: none;">Skip AI Setup</button>
                        <button class="btn-secondary" id="backBtn" style="display: none;">← Back</button>
                        <button class="btn-primary" id="nextBtn">Next →</button>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Bind events
        this.bindOnboardingEvents();
    }

    /**
     * Bind onboarding events
     */
    bindOnboardingEvents() {
        const nextBtn = document.getElementById('nextBtn');
        const backBtn = document.getElementById('backBtn');
        const skipBtn = document.getElementById('skipBtn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => this.previousStep());
        }
        
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipOnboarding());
        }
    }

    /**
     * Show specific onboarding step
     */
    async showStep(stepName) {
        console.log(`📱 Showing onboarding step: ${stepName}`);
        
        const content = document.getElementById('onboardingContent');
        const title = document.getElementById('onboardingTitle');
        const nextBtn = document.getElementById('nextBtn');
        const backBtn = document.getElementById('backBtn');
        const skipBtn = document.getElementById('skipBtn');
        
        // Update step indicator
        this.updateStepIndicator();
        
        switch (stepName) {
            case 'welcome':
                title.textContent = '🤖 Welcome to AI-Powered Coaching';
                content.innerHTML = `
                    <div class="welcome-content">
                        <div class="feature-icon">🧠</div>
                        <h3>Get Personalized Conversation Advice</h3>
                        <p>Your app can now provide intelligent, personalized conversation coaching using AI that runs completely in your browser.</p>
                        
                        <div class="benefits">
                            <div class="benefit">
                                <span class="benefit-icon">🔒</span>
                                <div>
                                    <strong>100% Private</strong>
                                    <p>AI runs on your device - nothing is sent to external servers</p>
                                </div>
                            </div>
                            <div class="benefit">
                                <span class="benefit-icon">📱</span>
                                <div>
                                    <strong>No Installation</strong>
                                    <p>Works directly in your browser - no apps to download</p>
                                </div>
                            </div>
                            <div class="benefit">
                                <span class="benefit-icon">🚀</span>
                                <div>
                                    <strong>Instant Responses</strong>
                                    <p>Get advice immediately, even when offline</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="setup-time">
                            <small>⏱️ Setup takes 2-3 minutes</small>
                        </div>
                    </div>
                `;
                nextBtn.textContent = 'Get Started →';
                backBtn.style.display = 'none';
                skipBtn.style.display = 'inline-block';
                break;

            case 'compatibility':
                title.textContent = '🔍 Checking Your Device';
                content.innerHTML = '<div class="checking-content">📱 Checking device compatibility...</div>';
                nextBtn.style.display = 'none';
                backBtn.style.display = 'inline-block';
                skipBtn.style.display = 'none';
                
                // Check compatibility
                const support = await WebLLMEngine.checkSupport();
                await this.showCompatibilityResults(support);
                break;

            case 'model_selection':
                title.textContent = '🎯 Choose Your AI Model';
                await this.showModelSelection();
                nextBtn.textContent = 'Download Model →';
                backBtn.style.display = 'inline-block';
                skipBtn.style.display = 'none';
                break;

            case 'model_download':
                title.textContent = '📥 Setting Up AI';
                await this.showModelDownload();
                nextBtn.style.display = 'none';
                backBtn.style.display = 'none';
                skipBtn.style.display = 'none';
                break;

            case 'completion':
                title.textContent = '✅ Setup Complete';
                content.innerHTML = `
                    <div class="completion-content">
                        <div class="success-icon">🎉</div>
                        <h3>AI-Powered Coaching is Ready!</h3>
                        <p>Your personal AI coach is now active and ready to help you with any conversation.</p>
                        
                        <div class="next-steps">
                            <h4>What's Next?</h4>
                            <ul>
                                <li>💬 Try asking for advice on any conversation</li>
                                <li>🎭 Use practice mode to rehearse important talks</li>
                                <li>📝 The AI learns from your communication patterns</li>
                                <li>🔒 Everything stays private on your device</li>
                            </ul>
                        </div>
                        
                        <div class="tip">
                            <strong>💡 Pro Tip:</strong> The AI gets smarter as you use it more!
                        </div>
                    </div>
                `;
                nextBtn.textContent = 'Start Using AI →';
                backBtn.style.display = 'none';
                skipBtn.style.display = 'none';
                break;
        }
    }

    /**
     * Show compatibility check results
     */
    async showCompatibilityResults(support) {
        const content = document.getElementById('onboardingContent');
        const nextBtn = document.getElementById('nextBtn');
        
        if (support.supported) {
            const gpuText = support.webgpu ? '🚀 GPU Acceleration Available' : '⚡ CPU Processing';
            const ramText = `💾 ${support.ram_estimate}GB RAM Detected`;
            const deviceText = support.is_mobile ? '📱 Mobile Device' : '💻 Desktop Device';
            
            content.innerHTML = `
                <div class="compatibility-success">
                    <div class="check-icon">✅</div>
                    <h3>Great! Your Device is Compatible</h3>
                    
                    <div class="device-info">
                        <div class="info-item">
                            <span>${gpuText}</span>
                        </div>
                        <div class="info-item">
                            <span>${ramText}</span>
                        </div>
                        <div class="info-item">
                            <span>${deviceText}</span>
                        </div>
                    </div>
                    
                    <div class="recommendation">
                        <strong>📋 Recommended Model:</strong> ${this.getModelDisplayName(support.recommended_model)}
                    </div>
                    
                    <div class="privacy-note">
                        <span class="privacy-icon">🔒</span>
                        <small>All AI processing happens on your device for complete privacy</small>
                    </div>
                </div>
            `;
            
            nextBtn.style.display = 'inline-block';
            nextBtn.textContent = 'Continue →';
            
            // Store recommended model
            this.selectedModel = support.recommended_model;
            
        } else {
            content.innerHTML = `
                <div class="compatibility-error">
                    <div class="error-icon">❌</div>
                    <h3>Device Not Compatible</h3>
                    <p>Your device doesn't support the AI features, but you can still use the app with enhanced templates.</p>
                    
                    <div class="fallback-info">
                        <h4>📚 Enhanced Templates Available</h4>
                        <p>You'll get structured conversation advice based on proven communication strategies.</p>
                        
                        <div class="template-benefits">
                            <div>✅ Instant responses</div>
                            <div>✅ No downloads required</div>
                            <div>✅ Works on any device</div>
                            <div>✅ Complete privacy</div>
                        </div>
                    </div>
                </div>
            `;
            
            nextBtn.style.display = 'inline-block';
            nextBtn.textContent = 'Continue with Templates →';
        }
    }

    /**
     * Show model selection interface
     */
    async showModelSelection() {
        const content = document.getElementById('onboardingContent');
        
        // Initialize WebLLM engine
        if (!this.webllmEngine.initialized) {
            await this.webllmEngine.init();
        }
        
        const models = this.webllmEngine.getAvailableModels();
        
        content.innerHTML = `
            <div class="model-selection">
                <h3>Choose the AI model that's right for you:</h3>
                
                <div class="models-grid">
                    ${models.map(model => `
                        <div class="model-option ${model.recommended ? 'recommended' : ''}" data-model="${model.id}">
                            <div class="model-header">
                                <h4>${model.name}</h4>
                                ${model.recommended ? '<span class="recommended-badge">👑 Recommended</span>' : ''}
                            </div>
                            
                            <div class="model-info">
                                <div class="model-size">📦 ${model.size}</div>
                                <div class="model-mobile ${model.mobile_optimized ? 'optimized' : 'not-optimized'}">
                                    ${model.mobile_optimized ? '📱 Mobile Optimized' : '💻 Desktop Preferred'}
                                </div>
                            </div>
                            
                            <div class="model-description">
                                <p>${model.description}</p>
                            </div>
                            
                            <div class="model-suitability" id="suitability-${model.id}">
                                <!-- Will be populated by JavaScript -->
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="selection-help">
                    <h4>💡 Not sure which to choose?</h4>
                    <p>The recommended model is selected based on your device's capabilities and provides the best balance of quality and performance.</p>
                </div>
            </div>
        `;
        
        // Add click handlers and suitability checks
        this.bindModelSelection();
    }

    /**
     * Bind model selection events
     */
    bindModelSelection() {
        const modelOptions = document.querySelectorAll('.model-option');
        
        modelOptions.forEach(option => {
            const modelId = option.dataset.model;
            
            // Check if model is suitable for device
            const suitable = this.webllmEngine.isModelSuitableForDevice(modelId);
            const suitabilityEl = document.getElementById(`suitability-${modelId}`);
            
            if (suitable) {
                suitabilityEl.innerHTML = '<span class="suitable">✅ Good for your device</span>';
                option.classList.add('suitable');
            } else {
                suitabilityEl.innerHTML = '<span class="not-suitable">⚠️ May be slow on your device</span>';
                option.classList.add('not-suitable');
            }
            
            // Add click handler
            option.addEventListener('click', () => {
                // Remove selection from others
                modelOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Select this model
                option.classList.add('selected');
                this.selectedModel = modelId;
                
                // Enable next button
                const nextBtn = document.getElementById('nextBtn');
                nextBtn.disabled = false;
            });
        });
        
        // Pre-select recommended model
        if (this.selectedModel) {
            const recommendedOption = document.querySelector(`[data-model="${this.selectedModel}"]`);
            if (recommendedOption) {
                recommendedOption.click();
            }
        }
    }

    /**
     * Show model download progress
     */
    async showModelDownload() {
        const content = document.getElementById('onboardingContent');
        
        content.innerHTML = `
            <div class="download-progress">
                <div class="download-icon">📥</div>
                <h3>Downloading ${this.getModelDisplayName(this.selectedModel)}</h3>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">Starting download...</div>
                </div>
                
                <div class="download-info">
                    <div class="info-item">
                        <span>📦 Size: ${this.webllmEngine.modelConfig[this.selectedModel].size}</span>
                    </div>
                    <div class="info-item">
                        <span>🔒 Downloaded to your device only</span>
                    </div>
                    <div class="info-item">
                        <span>⚡ One-time download - works offline after</span>
                    </div>
                </div>
                
                <div class="download-tips">
                    <h4>💡 While you wait:</h4>
                    <ul>
                        <li>Keep this page open</li>
                        <li>Stay connected to Wi-Fi for faster download</li>
                        <li>The model will be cached for future use</li>
                    </ul>
                </div>
            </div>
        `;
        
        // Start download
        await this.downloadModel();
    }

    /**
     * Download the selected model
     */
    async downloadModel() {
        try {
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            // Start download with progress tracking
            await this.webllmEngine.loadModel(this.selectedModel, (progress) => {
                const percent = Math.round(progress.progress * 100);
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `Downloading... ${percent}%`;
            });
            
            // Download complete
            progressFill.style.width = '100%';
            progressText.textContent = 'Download complete! 🎉';
            
            // Wait a moment, then proceed
            setTimeout(() => {
                this.nextStep();
            }, 1500);
            
        } catch (error) {
            console.error('Download failed:', error);
            
            const content = document.getElementById('onboardingContent');
            content.innerHTML = `
                <div class="download-error">
                    <div class="error-icon">❌</div>
                    <h3>Download Failed</h3>
                    <p>There was an error downloading the AI model. You can try again or continue with enhanced templates.</p>
                    
                    <div class="error-actions">
                        <button class="btn-secondary" onclick="mobileOnboarding.showStep('model_download')">Try Again</button>
                        <button class="btn-primary" onclick="mobileOnboarding.skipOnboarding()">Use Templates</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Go to next step
     */
    async nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.showStep(this.steps[this.currentStep]);
        } else {
            this.completeOnboarding();
        }
    }

    /**
     * Go to previous step
     */
    async previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.showStep(this.steps[this.currentStep]);
        }
    }

    /**
     * Skip onboarding
     */
    skipOnboarding() {
        localStorage.setItem('whaddyasay_onboarding_skipped', 'true');
        this.hideOnboarding();
    }

    /**
     * Complete onboarding
     */
    completeOnboarding() {
        localStorage.setItem('whaddyasay_onboarding_completed', 'true');
        if (this.selectedModel) {
            localStorage.setItem('whaddyasay_selected_model', this.selectedModel);
        }
        this.onboardingComplete = true;
        this.hideOnboarding();
        
        // Refresh AI status
        if (window.conversationCoach) {
            window.conversationCoach.updateAIStatus();
        }
    }

    /**
     * Hide onboarding modal
     */
    hideOnboarding() {
        const overlay = document.getElementById('onboardingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Update step indicator
     */
    updateStepIndicator() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    /**
     * Get display name for model
     */
    getModelDisplayName(modelId) {
        return this.webllmEngine.modelConfig[modelId]?.name || modelId;
    }

    /**
     * Check if onboarding should be shown
     */
    static shouldShowOnboarding() {
        const completed = localStorage.getItem('whaddyasay_onboarding_completed');
        const skipped = localStorage.getItem('whaddyasay_onboarding_skipped');
        return !completed && !skipped;
    }
}

// Export for use in other modules
window.MobileOnboarding = MobileOnboarding;