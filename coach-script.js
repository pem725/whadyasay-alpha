class ConversationCoach {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isListening = false;
        this.currentSituation = '';
        this.currentAdvice = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeSpeechRecognition();
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
        // Call real MCP server via bridge
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
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get advice');
        }

        return data.advice;
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
        // TODO: Implement practice mode
        alert('Practice mode coming soon! This will let you role-play the conversation with AI.');
    }

    async saveAdvice() {
        if (!this.currentAdvice) return;

        try {
            // TODO: Save to MCP server
            const savedData = {
                situation: this.currentSituation,
                advice: this.currentAdvice,
                timestamp: new Date().toISOString(),
                type: 'conversation_advice'
            };

            console.log('Saving advice to MCP server:', savedData);
            
            // Simulate save
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Show success feedback
            const originalText = this.saveAdviceBtn.textContent;
            this.saveAdviceBtn.textContent = '✅ Saved!';
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
                // TODO: Show conversation history
                alert('History view coming soon!');
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
}

// Initialize the conversation coach
const conversationCoach = new ConversationCoach();