class ConversationCoach {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isListening = false;
        this.isPracticingVoice = false;
        this.currentSituation = '';
        this.currentAdvice = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeSpeechRecognition();
        this.initializeAIStatus();
    }

    initializeElements() {
        // Main sections
        this.promptSection = document.getElementById('promptSection');
        this.analysisSection = document.getElementById('analysisSection');
        this.practiceSection = document.getElementById('practiceSection');
        
        // Input elements
        this.voiceBtn = document.getElementById('voiceBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.situationInput = document.getElementById('situationInput');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        
        // Navigation elements
        this.backBtn = document.getElementById('backBtn');
        this.backToPlanBtn = document.getElementById('backToPlanBtn');
        
        // Action buttons
        this.practiceBtn = document.getElementById('practiceBtn');
        this.saveAdviceBtn = document.getElementById('saveAdviceBtn');
        this.newSituationBtn = document.getElementById('newSituationBtn');
        
        // Content areas
        this.adviceContent = document.getElementById('adviceContent');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Navigation tabs
        this.coachTab = document.getElementById('coachTab');
        this.memoryTab = document.getElementById('memoryTab');
        this.historyTab = document.getElementById('historyTab');
        
        // AI Status elements
        this.aiStatus = document.getElementById('aiStatus');
        this.aiIndicator = document.getElementById('aiIndicator');
        this.aiStatusText = document.getElementById('aiStatusText');
        this.aiSettingsBtn = document.getElementById('aiSettingsBtn');
        this.aiSettingsModal = document.getElementById('aiSettingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.refreshModelsBtn = document.getElementById('refreshModelsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.allowCloudAPI = document.getElementById('allowCloudAPI');
    }

    bindEvents() {
        // Voice input
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        
        // Text analysis
        this.analyzeBtn.addEventListener('click', () => this.analyzeSituation());
        this.situationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.analyzeSituation();
            }
        });
        
        // Navigation
        this.backBtn.addEventListener('click', () => this.showPromptSection());
        this.backToPlanBtn.addEventListener('click', () => this.showAnalysisSection());
        
        // Action buttons
        this.practiceBtn.addEventListener('click', () => this.startPracticeMode());
        this.saveAdviceBtn.addEventListener('click', () => this.saveAdvice());
        this.newSituationBtn.addEventListener('click', () => this.resetToNewSituation());
        
        // Tab navigation
        this.coachTab.addEventListener('click', () => this.switchTab('coach'));
        this.memoryTab.addEventListener('click', () => this.switchTab('memory'));
        this.historyTab.addEventListener('click', () => this.switchTab('history'));
        
        // AI Settings modal
        if (this.aiSettingsBtn) {
            this.aiSettingsBtn.addEventListener('click', () => this.showAISettings());
        }
        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', () => this.hideAISettings());
        }
        if (this.refreshModelsBtn) {
            this.refreshModelsBtn.addEventListener('click', () => this.refreshAIModels());
        }
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => this.saveAISettings());
        }
        
        // Close modal on overlay click
        if (this.aiSettingsModal) {
            this.aiSettingsModal.addEventListener('click', (e) => {
                if (e.target === this.aiSettingsModal) {
                    this.hideAISettings();
                }
            });
        }
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    this.situationInput.value += finalTranscript + ' ';
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopVoiceInput();
            };

            this.recognition.onend = () => {
                this.stopVoiceInput();
            };
        }
    }

    toggleVoiceInput() {
        if (!this.isListening) {
            this.startVoiceInput();
        } else {
            this.stopVoiceInput();
        }
    }

    startVoiceInput() {
        if (this.recognition) {
            try {
                this.recognition.start();
                this.isListening = true;
                this.voiceBtn.classList.add('listening');
                this.voiceBtn.querySelector('.voice-text').textContent = 'Stop Listening';
                this.voiceStatus.classList.remove('hidden');
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                alert('Could not access microphone. Please check permissions.');
            }
        } else {
            alert('Speech recognition not supported in this browser.');
        }
    }

    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.voiceBtn.classList.remove('listening');
        this.voiceBtn.querySelector('.voice-text').textContent = 'Speak your situation';
        this.voiceStatus.classList.add('hidden');
    }

    async analyzeSituation() {
        const situation = this.situationInput.value.trim();
        if (!situation) {
            alert('Please describe your situation first.');
            return;
        }

        this.currentSituation = situation;
        this.showLoading('Analyzing your situation...');

        try {
            // Simulate API call to get advice
            const advice = await this.getConversationAdvice(situation);
            this.currentAdvice = advice;
            this.displayAdvice(advice);
            this.showAnalysisSection();
        } catch (error) {
            console.error('Error analyzing situation:', error);
            alert('Sorry, there was an error analyzing your situation. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async getConversationAdvice(situation) {
        try {
            // Initialize AI engine if not available
            if (!window.aiEngine) {
                await this.initializeAIEngine();
            }

            // Try PWA AI engine first (preferred for privacy and speed)
            if (window.aiEngine && window.aiEngine.initialized) {
                console.log('🤖 Using local AI engine for advice generation');
                console.log('🔍 AI Engine status:', window.aiEngine.getLLMStatus());
                const advice = await window.aiEngine.generateAdvice(
                    situation,
                    this.detectContext(situation),
                    this.detectRelationship(situation),
                    'medium'
                );
                
                // Mark as locally generated
                advice.source = 'local_ai';
                advice.privacy_level = 'complete';
                console.log('✅ Generated advice:', advice);
                return advice;
            } else {
                console.log('⚠️ AI Engine not available or not initialized');
                console.log('AI Engine exists:', !!window.aiEngine);
                console.log('AI Engine initialized:', window.aiEngine?.initialized);
            }

            // Fall back to MCP server if online (enhanced features)
            if (navigator.onLine) {
                console.log('🌐 Attempting MCP server for enhanced advice');
                try {
                    const response = await fetch('/api/conversation/advice', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            situation: situation,
                            context: this.detectContext(situation),
                            relationship: this.detectRelationship(situation),
                            urgency: 'medium'
                        }),
                        timeout: 5000 // 5 second timeout
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            data.advice.source = 'mcp_server';
                            data.advice.privacy_level = 'encrypted';
                            console.log('✅ MCP server advice retrieved');
                            return data.advice;
                        }
                    }
                } catch (serverError) {
                    console.warn('MCP server unavailable, using local fallback:', serverError.message);
                }
            }

            // Final fallback to built-in advice
            console.log('📚 Using built-in advice templates');
            const mockAdvice = this.generateMockAdvice(situation);
            mockAdvice.source = 'builtin';
            mockAdvice.privacy_level = 'complete';
            return mockAdvice;

        } catch (error) {
            console.error('Error getting advice:', error);
            // Emergency fallback
            const emergencyAdvice = this.generateMockAdvice(situation);
            emergencyAdvice.source = 'emergency_fallback';
            emergencyAdvice.privacy_level = 'complete';
            emergencyAdvice.error_recovery = true;
            return emergencyAdvice;
        }
    }

    async initializeAIEngine() {
        try {
            if (!window.aiEngine && window.PWAAIEngine) {
                window.aiEngine = new PWAAIEngine();
                
                // Initialize with local storage if available
                if (window.localStorage) {
                    await window.aiEngine.init(window.localStorage);
                } else {
                    await window.aiEngine.init(null);
                }
                
                console.log('✅ AI Engine initialized for conversation coaching');
            }
        } catch (error) {
            console.error('❌ Error initializing AI engine:', error);
        }
    }

    detectContext(situation) {
        const lowerSit = situation.toLowerCase();
        if (lowerSit.includes('work') || lowerSit.includes('boss') || lowerSit.includes('job') || lowerSit.includes('colleague')) {
            return 'work';
        } else if (lowerSit.includes('family') || lowerSit.includes('parent') || lowerSit.includes('sibling')) {
            return 'family';
        } else if (lowerSit.includes('friend') || lowerSit.includes('buddy')) {
            return 'friends';
        } else if (lowerSit.includes('partner') || lowerSit.includes('spouse') || lowerSit.includes('relationship')) {
            return 'romantic';
        }
        return 'general';
    }

    detectRelationship(situation) {
        const lowerSit = situation.toLowerCase();
        if (lowerSit.includes('boss') || lowerSit.includes('manager')) {
            return 'manager';
        } else if (lowerSit.includes('colleague') || lowerSit.includes('coworker')) {
            return 'colleague';
        } else if (lowerSit.includes('partner') || lowerSit.includes('spouse')) {
            return 'partner';
        } else if (lowerSit.includes('friend')) {
            return 'friend';
        } else if (lowerSit.includes('family') || lowerSit.includes('parent')) {
            return 'family';
        }
        return 'other';
    }

    generateMockAdvice(situation) {
        // Mock advice generation based on situation analysis
        const advice = {
            situation: situation,
            analysis: this.analyzeSituationType(situation),
            strategy: this.generateStrategy(situation),
            keyPoints: this.generateKeyPoints(situation),
            pitfalls: this.generatePitfalls(situation),
            phrases: this.generateHelpfulPhrases(situation)
        };
        return advice;
    }

    analyzeSituationType(situation) {
        const lowerSit = situation.toLowerCase();
        if (lowerSit.includes('boss') || lowerSit.includes('raise') || lowerSit.includes('promotion')) {
            return 'Professional advancement conversation';
        } else if (lowerSit.includes('partner') || lowerSit.includes('relationship') || lowerSit.includes('argue')) {
            return 'Personal relationship discussion';
        } else if (lowerSit.includes('apolog') || lowerSit.includes('sorry')) {
            return 'Apology and reconciliation';
        } else if (lowerSit.includes('feedback') || lowerSit.includes('criticism')) {
            return 'Constructive feedback delivery';
        } else {
            return 'General communication challenge';
        }
    }

    generateStrategy(situation) {
        const strategies = [
            "Start with empathy and acknowledge their perspective before presenting your own.",
            "Use 'I' statements to express your feelings without sounding accusatory.",
            "Focus on specific behaviors rather than character judgments.",
            "Listen actively and ask clarifying questions to understand their viewpoint.",
            "Find common ground and shared goals before addressing differences."
        ];
        return strategies[Math.floor(Math.random() * strategies.length)];
    }

    generateKeyPoints(situation) {
        return [
            "Be clear about your desired outcome",
            "Stay calm and composed throughout",
            "Listen more than you speak",
            "Ask open-ended questions",
            "Acknowledge their concerns"
        ];
    }

    generatePitfalls(situation) {
        return [
            "Don't make it personal or attack their character",
            "Avoid bringing up past grievances",
            "Don't interrupt or dismiss their feelings",
            "Resist the urge to be defensive",
            "Don't make ultimatums unless absolutely necessary"
        ];
    }

    generateHelpfulPhrases(situation) {
        return [
            "I understand this might be difficult to hear...",
            "Help me understand your perspective on this...",
            "What would need to happen for us to move forward?",
            "I appreciate you taking the time to discuss this...",
            "How can we work together to solve this?"
        ];
    }

    displayAdvice(advice) {
        // Handle both mock and real MCP server response formats
        const situationAnalysis = advice.situation_analysis || { type: advice.analysis, situation: advice.situation };
        const strategy = advice.strategy;
        const keyPoints = advice.key_points || advice.keyPoints || [];
        const pitfalls = advice.pitfalls || [];
        const phrases = advice.helpful_phrases || advice.phrases || [];
        const personalInsights = advice.personal_insights || [];
        const confidenceBoosters = advice.confidence_boosters || [];

        let adviceHTML = `
            <div class="advice-section">
                <h4>🎯 Situation Analysis</h4>
                <p><strong>Type:</strong> ${situationAnalysis.type}</p>
                <p><strong>Context:</strong> ${situationAnalysis.context || 'General'}</p>
                <p><strong>Your situation:</strong> "${situationAnalysis.situation || this.currentSituation}"</p>
            </div>

            <div class="advice-section">
                <h4>🗺️ Recommended Strategy</h4>
                <p>${strategy}</p>
            </div>

            <div class="advice-section">
                <h4>✅ Key Points to Remember</h4>
                <ul>
                    ${keyPoints.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>

            <div class="warning-box">
                <h5>⚠️ Pitfalls to Avoid</h5>
                <ul>
                    ${pitfalls.map(pitfall => `<li>${pitfall}</li>`).join('')}
                </ul>
            </div>

            <div class="tip-box">
                <h5>💡 Helpful Phrases</h5>
                <ul>
                    ${phrases.map(phrase => `<li>"${phrase}"</li>`).join('')}
                </ul>
            </div>
        `;

        // Add personal insights if available
        if (personalInsights.length > 0) {
            adviceHTML += `
                <div class="advice-section">
                    <h4>🧠 Personal Insights</h4>
                    <ul>
                        ${personalInsights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Add confidence boosters if available
        if (confidenceBoosters.length > 0) {
            adviceHTML += `
                <div class="tip-box">
                    <h5>💪 Confidence Boosters</h5>
                    <ul>
                        ${confidenceBoosters.map(booster => `<li>${booster}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        this.adviceContent.innerHTML = adviceHTML;
    }

    showPromptSection() {
        this.promptSection.classList.remove('hidden');
        this.analysisSection.classList.add('hidden');
        this.practiceSection.classList.add('hidden');
    }

    showAnalysisSection() {
        this.promptSection.classList.add('hidden');
        this.analysisSection.classList.remove('hidden');
        this.practiceSection.classList.add('hidden');
    }

    showPracticeSection() {
        this.promptSection.classList.add('hidden');
        this.analysisSection.classList.add('hidden');
        this.practiceSection.classList.remove('hidden');
    }

    startPracticeMode() {
        if (!this.currentAdvice || !this.currentSituation) {
            alert('Please get advice for a situation first.');
            return;
        }

        this.setupPracticeScenario();
        this.showPracticeSection();
    }

    setupPracticeScenario() {
        const scenarioSetup = document.getElementById('scenarioSetup');
        const practiceControls = document.querySelector('.practice-controls');
        
        scenarioSetup.innerHTML = `
            <div class="scenario-info">
                <h4>🎭 Practice Scenario</h4>
                <p><strong>Situation:</strong> ${this.currentSituation}</p>
                <p><strong>Context:</strong> ${this.detectContext(this.currentSituation)}</p>
                <p><strong>Relationship:</strong> ${this.detectRelationship(this.currentSituation)}</p>
            </div>
            
            <div class="practice-tips">
                <h5>💡 Key Points to Practice</h5>
                <ul>
                    ${(this.currentAdvice.key_points || this.currentAdvice.keyPoints || []).map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
            
            <div class="practice-area">
                <h5>🎤 Practice Your Approach</h5>
                <textarea id="practiceInput" placeholder="Start typing what you would say in this situation, or use the voice practice button below..."></textarea>
                
                <div class="practice-buttons">
                    <button id="voicePracticeBtn" class="voice-practice-btn">
                        🎤 Voice Practice
                    </button>
                    <button id="getFeedbackBtn" class="feedback-btn">
                        💭 Get Feedback
                    </button>
                    <button id="tryAgainBtn" class="try-again-btn">
                        🔄 Try Again
                    </button>
                </div>
                
                <div id="practiceStatus" class="practice-status hidden">
                    <span class="pulse">🔴</span> Recording your practice...
                </div>
                
                <div id="practiceFeedback" class="practice-feedback hidden">
                    <!-- Feedback will be displayed here -->
                </div>
            </div>
        `;
        
        // Bind practice mode events
        this.bindPracticeEvents();
    }

    bindPracticeEvents() {
        const voicePracticeBtn = document.getElementById('voicePracticeBtn');
        const getFeedbackBtn = document.getElementById('getFeedbackBtn');
        const tryAgainBtn = document.getElementById('tryAgainBtn');
        const practiceInput = document.getElementById('practiceInput');
        
        if (voicePracticeBtn) {
            voicePracticeBtn.addEventListener('click', () => this.toggleVoicePractice());
        }
        
        if (getFeedbackBtn) {
            getFeedbackBtn.addEventListener('click', () => this.provideFeedback());
        }
        
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => this.resetPractice());
        }
    }

    toggleVoicePractice() {
        const voicePracticeBtn = document.getElementById('voicePracticeBtn');
        const practiceStatus = document.getElementById('practiceStatus');
        
        if (!this.isPracticingVoice) {
            this.startVoicePractice();
        } else {
            this.stopVoicePractice();
        }
    }

    startVoicePractice() {
        if (this.recognition) {
            try {
                this.recognition.start();
                this.isPracticingVoice = true;
                
                const voicePracticeBtn = document.getElementById('voicePracticeBtn');
                const practiceStatus = document.getElementById('practiceStatus');
                
                voicePracticeBtn.textContent = '⏹️ Stop Recording';
                voicePracticeBtn.classList.add('recording');
                practiceStatus.classList.remove('hidden');
                
                console.log('🎤 Voice practice started');
            } catch (error) {
                console.error('Error starting voice practice:', error);
                alert('Could not access microphone. Please check permissions.');
            }
        } else {
            alert('Speech recognition not supported in this browser.');
        }
    }

    stopVoicePractice() {
        if (this.recognition && this.isPracticingVoice) {
            this.recognition.stop();
        }
        
        this.isPracticingVoice = false;
        
        const voicePracticeBtn = document.getElementById('voicePracticeBtn');
        const practiceStatus = document.getElementById('practiceStatus');
        
        if (voicePracticeBtn) {
            voicePracticeBtn.textContent = '🎤 Voice Practice';
            voicePracticeBtn.classList.remove('recording');
        }
        
        if (practiceStatus) {
            practiceStatus.classList.add('hidden');
        }
        
        console.log('🎤 Voice practice stopped');
    }

    async provideFeedback() {
        const practiceInput = document.getElementById('practiceInput');
        const practiceFeedback = document.getElementById('practiceFeedback');
        
        const practiceText = practiceInput.value.trim();
        if (!practiceText) {
            alert('Please enter or speak what you would say first.');
            return;
        }
        
        this.showLoading('Analyzing your practice...');
        
        try {
            const feedback = await this.generatePracticeFeedback(practiceText);
            this.displayPracticeFeedback(feedback);
            practiceFeedback.classList.remove('hidden');
        } catch (error) {
            console.error('Error generating feedback:', error);
            alert('Error generating feedback. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async generatePracticeFeedback(practiceText) {
        // Analyze the practice text against the advice
        const keyPoints = this.currentAdvice.key_points || this.currentAdvice.keyPoints || [];
        const pitfalls = this.currentAdvice.pitfalls || [];
        const phrases = this.currentAdvice.helpful_phrases || this.currentAdvice.phrases || [];
        
        const feedback = {
            strengths: [],
            improvements: [],
            suggestions: [],
            score: 0
        };
        
        // Simple analysis based on keywords and patterns
        let score = 50; // Base score
        
        // Check for positive elements
        if (practiceText.toLowerCase().includes('understand')) {
            feedback.strengths.push('Shows empathy by expressing understanding');
            score += 10;
        }
        
        if (practiceText.toLowerCase().includes('i feel') || practiceText.toLowerCase().includes('i think')) {
            feedback.strengths.push('Uses "I" statements effectively');
            score += 10;
        }
        
        if (practiceText.toLowerCase().includes('how') || practiceText.toLowerCase().includes('what')) {
            feedback.strengths.push('Asks questions to engage the other person');
            score += 10;
        }
        
        // Check for potential issues
        if (practiceText.toLowerCase().includes('you always') || practiceText.toLowerCase().includes('you never')) {
            feedback.improvements.push('Avoid absolute statements like "always" or "never"');
            score -= 10;
        }
        
        if (practiceText.toLowerCase().includes('but')) {
            feedback.improvements.push('Consider replacing "but" with "and" to sound less dismissive');
            score -= 5;
        }
        
        // Generate suggestions
        feedback.suggestions = [
            'Try incorporating more of the helpful phrases from your advice',
            'Practice speaking slowly and clearly',
            'Make eye contact and use open body language'
        ];
        
        feedback.score = Math.max(0, Math.min(100, score));
        
        return feedback;
    }

    displayPracticeFeedback(feedback) {
        const practiceFeedback = document.getElementById('practiceFeedback');
        
        const scoreColor = feedback.score >= 80 ? '#28a745' : feedback.score >= 60 ? '#ffc107' : '#dc3545';
        
        practiceFeedback.innerHTML = `
            <h5>📊 Practice Feedback</h5>
            
            <div class="feedback-score" style="color: ${scoreColor}; font-size: 24px; font-weight: bold; text-align: center; margin: 15px 0;">
                ${feedback.score}/100
            </div>
            
            ${feedback.strengths.length > 0 ? `
                <div class="feedback-section strengths">
                    <h6>✅ Strengths</h6>
                    <ul>
                        ${feedback.strengths.map(strength => `<li>${strength}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${feedback.improvements.length > 0 ? `
                <div class="feedback-section improvements">
                    <h6>🔧 Areas for Improvement</h6>
                    <ul>
                        ${feedback.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="feedback-section suggestions">
                <h6>💡 Suggestions</h6>
                <ul>
                    ${feedback.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    resetPractice() {
        const practiceInput = document.getElementById('practiceInput');
        const practiceFeedback = document.getElementById('practiceFeedback');
        
        if (practiceInput) {
            practiceInput.value = '';
        }
        
        if (practiceFeedback) {
            practiceFeedback.classList.add('hidden');
        }
        
        this.stopVoicePractice();
    }

    async saveAdvice() {
        if (!this.currentAdvice) return;

        try {
            const conversationData = {
                id: Date.now(),
                situation: this.currentSituation,
                advice: this.currentAdvice,
                created_at: new Date().toISOString(),
                type: 'conversation_advice',
                context: this.detectContext(this.currentSituation),
                relationship: this.detectRelationship(this.currentSituation)
            };

            // Save to local storage
            await this.saveConversationLocally(conversationData);
            
            // Show success feedback
            const originalText = this.saveAdviceBtn.textContent;
            this.saveAdviceBtn.textContent = '✅ Saved Locally!';
            this.saveAdviceBtn.disabled = true;
            
            setTimeout(() => {
                this.saveAdviceBtn.textContent = originalText;
                this.saveAdviceBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Error saving advice:', error);
            alert('Error saving advice. Please try again.');
        }
    }

    resetToNewSituation() {
        this.situationInput.value = '';
        this.currentSituation = '';
        this.currentAdvice = null;
        this.showPromptSection();
    }

    switchTab(tab) {
        // Remove active class from all tabs
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        switch(tab) {
            case 'coach':
                this.coachTab.classList.add('active');
                // Already on coach interface
                break;
            case 'memory':
                this.memoryTab.classList.add('active');
                window.location.href = 'memory.html';
                break;
            case 'history':
                this.historyTab.classList.add('active');
                window.location.href = 'history.html';
                break;
        }
    }

    showLoading(message = 'Loading...') {
        this.loadingOverlay.querySelector('p').textContent = message;
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    /**
     * Initialize AI Status Display
     */
    async initializeAIStatus() {
        try {
            // Initial status
            this.updateAIStatusDisplay('⚠️', 'AI Initializing...', 'template');
            
            // Wait for AI engine to initialize, then check periodically
            setTimeout(async () => {
                await this.updateAIStatus();
                // Check again in a few seconds in case WebLLM is loading
                setTimeout(async () => {
                    await this.updateAIStatus();
                }, 5000);
            }, 2000); // Give time for AI engine initialization
            
        } catch (error) {
            console.error('Error initializing AI status:', error);
            this.updateAIStatusDisplay('❌', 'AI Error', 'template');
        }
    }

    /**
     * Update AI status display
     */
    async updateAIStatus() {
        if (!window.aiEngine) {
            console.log('⚠️ AI Engine not available yet');
            this.updateAIStatusDisplay('⚠️', 'AI Initializing...', 'template');
            return;
        }

        try {
            const status = window.aiEngine.getLLMStatus();
            console.log('🔍 AI Status:', status);
            
            if (status.available && status.model_type === 'local') {
                const modelName = status.current_model || 'Local AI';
                this.updateAIStatusDisplay('🤖', `Local AI: ${modelName}`, 'local');
                console.log('✅ Local AI active:', modelName);
            } else if (status.available && status.model_type === 'cloud') {
                this.updateAIStatusDisplay('☁️', `Cloud AI: ${status.current_model?.split(':')[0] || 'Active'}`, 'cloud');
                console.log('✅ Cloud AI active');
            } else {
                this.updateAIStatusDisplay('📚', 'Enhanced Templates', 'template');
                console.log('📚 Using template system, LLM not available');
            }
        } catch (error) {
            console.error('Error updating AI status:', error);
            this.updateAIStatusDisplay('📚', 'Template System', 'template');
        }
    }

    /**
     * Update AI status display elements
     */
    updateAIStatusDisplay(indicator, text, type) {
        if (this.aiIndicator) this.aiIndicator.textContent = indicator;
        if (this.aiStatusText) this.aiStatusText.textContent = text;
        
        // Update status styling
        if (this.aiStatus) {
            this.aiStatus.className = `ai-status ai-${type}`;
        }
    }

    /**
     * Show AI Settings Modal
     */
    async showAISettings() {
        if (!this.aiSettingsModal) return;
        
        // Update modal content
        await this.updateAISettingsModal();
        
        // Show modal
        this.aiSettingsModal.classList.remove('hidden');
    }

    /**
     * Hide AI Settings Modal
     */
    hideAISettings() {
        if (this.aiSettingsModal) {
            this.aiSettingsModal.classList.add('hidden');
        }
    }

    /**
     * Update AI Settings Modal Content
     */
    async updateAISettingsModal() {
        try {
            const status = window.aiEngine ? window.aiEngine.getLLMStatus() : { available: false, models: [], current_model: null };
            
            // Update current status
            const currentEngine = document.getElementById('currentEngine');
            const currentModel = document.getElementById('currentModel');
            const privacyLevel = document.getElementById('privacyLevel');
            
            if (currentEngine) {
                currentEngine.textContent = status.available ? 
                    (status.model_type === 'local' ? 'Local LLM' : status.model_type === 'cloud' ? 'Cloud API' : 'Template System') :
                    'Template System';
            }
            
            if (currentModel) {
                currentModel.textContent = status.current_model || 'Enhanced Templates';
            }
            
            if (privacyLevel) {
                const privacyText = {
                    'complete': '🔒 Complete Privacy (Local Processing)',
                    'cloud_processed': '☁️ Cloud Processed',
                    'template_based': '📚 Template Based (Complete Privacy)'
                };
                privacyLevel.textContent = privacyText[status.privacy_level] || 'Unknown';
            }
            
            // Update available models
            this.updateModelsListDisplay(status.models || []);
            
            // Update privacy settings
            const preferences = JSON.parse(localStorage.getItem('whaddyasay_llm_preferences') || '{}');
            if (this.allowCloudAPI) {
                this.allowCloudAPI.checked = preferences.consent?.cloudAPI || false;
            }
            
        } catch (error) {
            console.error('Error updating AI settings modal:', error);
        }
    }

    /**
     * Update models list display
     */
    updateModelsListDisplay(models) {
        const modelsList = document.getElementById('modelsList');
        if (!modelsList) return;
        
        if (models.length === 0) {
            modelsList.innerHTML = `
                <div class="no-models">
                    <p>No LLM models detected.</p>
                    <p>Install <a href="https://ollama.ai" target="_blank">Ollama</a> for local AI processing.</p>
                </div>
            `;
            return;
        }
        
        modelsList.innerHTML = models.map(model => `
            <div class="model-item" data-model-id="${model.id}">
                <div class="model-name">${model.name}</div>
                <div class="model-type">Type: ${model.type}</div>
                <div class="model-privacy ${model.privacy_level === 'cloud_processed' ? 'cloud' : ''}">
                    ${model.privacy_level === 'complete_privacy' ? '🔒 Complete Privacy' : '☁️ Cloud Processed'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Refresh AI Models
     */
    async refreshAIModels() {
        if (!window.aiEngine?.llmEngine) {
            alert('AI Engine not available for refresh');
            return;
        }
        
        try {
            // Re-detect models
            await window.aiEngine.llmEngine.detectLocalModels();
            await window.aiEngine.llmEngine.selectOptimalModel();
            
            // Update display
            await this.updateAIStatus();
            await this.updateAISettingsModal();
            
            console.log('🔄 AI models refreshed');
        } catch (error) {
            console.error('Error refreshing AI models:', error);
            alert('Error refreshing models: ' + error.message);
        }
    }

    /**
     * Save AI Settings
     */
    async saveAISettings() {
        try {
            const cloudConsent = this.allowCloudAPI ? this.allowCloudAPI.checked : false;
            
            // Save to AI engine if available
            if (window.aiEngine) {
                await window.aiEngine.setCloudLLMConsent(cloudConsent);
            }
            
            // Update AI status
            await this.updateAIStatus();
            
            // Close modal
            this.hideAISettings();
            
            console.log('💾 AI settings saved');
        } catch (error) {
            console.error('Error saving AI settings:', error);
            alert('Error saving settings: ' + error.message);
        }
    }

    async saveConversationLocally(conversationData) {
        try {
            // Use PWA local storage if available for encryption
            if (window.localStorage && window.cryptoManager) {
                const conversationId = await window.localStorage.storeConversation(conversationData);
                console.log('✅ Conversation saved to encrypted local storage with ID:', conversationId);
                return conversationId;
            } else {
                // Fallback to browser localStorage (unencrypted)
                const existingConversations = JSON.parse(localStorage.getItem('whaddyasay_conversations') || '[]');
                
                const conversationWithId = {
                    ...conversationData,
                    encrypted: false
                };
                
                existingConversations.push(conversationWithId);
                localStorage.setItem('whaddyasay_conversations', JSON.stringify(existingConversations));
                
                console.log('✅ Conversation saved to browser localStorage:', conversationWithId.id);
                return conversationWithId.id;
            }
        } catch (error) {
            console.error('❌ Error saving conversation to local storage:', error);
            throw error;
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
}

// Initialize the conversation coach with onboarding
async function initializeApp() {
    // Initialize AI engine first
    console.log('🤖 Initializing AI engine...');
    if (!window.aiEngine && window.PWAAIEngine) {
        window.aiEngine = new PWAAIEngine();
        await window.aiEngine.init(window.localStorage);
        console.log('✅ AI engine initialized');
        
        // Debug: Check AI engine status
        const status = window.aiEngine.getLLMStatus();
        console.log('🔍 Initial AI status:', status);
        
        // Test WebLLM availability
        console.log('🔍 WebLLM availability check:');
        console.log('- WebLLMEngine exists:', !!window.WebLLMEngine);
        console.log('- MobileOnboarding exists:', !!window.MobileOnboarding);
        
        if (window.WebLLMEngine) {
            try {
                const support = await WebLLMEngine.checkSupport();
                console.log('📱 WebLLM support:', support);
            } catch (error) {
                console.error('❌ WebLLM support check failed:', error);
            }
        }
    }
    
    // Check if onboarding should be shown
    console.log('🔍 Should show onboarding?', MobileOnboarding.shouldShowOnboarding());
    console.log('🔍 Onboarding completed:', localStorage.getItem('whaddyasay_onboarding_completed'));
    console.log('🔍 Onboarding skipped:', localStorage.getItem('whaddyasay_onboarding_skipped'));
    console.log('🔍 Selected model:', localStorage.getItem('whaddyasay_selected_model'));
    
    if (MobileOnboarding.shouldShowOnboarding()) {
        console.log('🚀 Starting mobile onboarding flow...');
        const onboarding = new MobileOnboarding();
        await onboarding.startOnboarding();
    } else {
        console.log('⏭️ Onboarding skipped - user has already completed or skipped it');
    }
    
    // Initialize the conversation coach
    window.conversationCoach = new ConversationCoach();
}

// Start the app
initializeApp();