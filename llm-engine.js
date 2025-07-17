/**
 * Real LLM Engine for What Do You Say? PWA
 * Supports both local LLMs (Ollama, WebLLM) and cloud APIs
 * Privacy-first: prefers local processing, cloud APIs only with user consent
 */

class LLMEngine {
    constructor() {
        this.initialized = false;
        this.availableModels = new Map();
        this.currentModel = null;
        this.modelType = null; // 'local', 'cloud', 'fallback'
        this.userConsent = {
            cloudAPI: false,
            dataSharing: false
        };
        this.localStorage = null;
    }

    /**
     * Initialize the LLM engine and detect available models
     */
    async init(localStorage) {
        this.localStorage = localStorage;
        
        try {
            console.log('🤖 Initializing LLM Engine...');
            
            // 1. First try to detect local LLM options
            await this.detectLocalModels();
            
            // 2. Check for cloud API configurations
            await this.checkCloudAPIAvailability();
            
            // 3. Select best available model
            await this.selectOptimalModel();
            
            this.initialized = true;
            console.log(`✅ LLM Engine initialized with ${this.modelType} model: ${this.currentModel}`);
            
        } catch (error) {
            console.error('❌ Error initializing LLM Engine:', error);
            // Fall back to enhanced template system
            this.modelType = 'fallback';
            this.initialized = true;
        }
    }

    /**
     * Generate conversation advice using real LLM
     */
    async generateAdvice(situation, context = 'general', relationship = '', urgency = 'medium', userMemories = []) {
        if (!this.initialized) {
            throw new Error('LLM Engine not initialized');
        }

        try {
            // Build comprehensive prompt with user context
            const prompt = await this.buildAdvicePrompt(situation, context, relationship, urgency, userMemories);
            
            let response;
            
            switch (this.modelType) {
                case 'local':
                    response = await this.generateWithLocalModel(prompt);
                    break;
                case 'cloud':
                    response = await this.generateWithCloudAPI(prompt);
                    break;
                case 'fallback':
                default:
                    response = await this.generateWithEnhancedTemplates(situation, context, relationship, urgency, userMemories);
                    break;
            }

            // Parse and structure the response
            const structuredAdvice = await this.parseAdviceResponse(response, situation);
            
            // Add metadata
            structuredAdvice.model_info = {
                type: this.modelType,
                model: this.currentModel,
                generated_at: new Date().toISOString(),
                privacy_level: this.modelType === 'local' ? 'complete' : (this.modelType === 'cloud' ? 'cloud_processed' : 'template_based')
            };

            return structuredAdvice;

        } catch (error) {
            console.error('Error generating advice:', error);
            // Emergency fallback
            return await this.generateWithEnhancedTemplates(situation, context, relationship, urgency, userMemories);
        }
    }

    /**
     * Detect local LLM availability (Ollama, WebLLM, etc.)
     */
    async detectLocalModels() {
        // Check for Ollama (most common local LLM server)
        try {
            const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
                method: 'GET',
                timeout: 2000
            });
            
            if (ollamaResponse.ok) {
                const models = await ollamaResponse.json();
                console.log('🦙 Ollama detected with models:', models);
                
                for (const model of models.models || []) {
                    this.availableModels.set(`ollama:${model.name}`, {
                        type: 'ollama',
                        name: model.name,
                        size: model.size,
                        capabilities: ['conversation', 'reasoning']
                    });
                }
            }
        } catch (error) {
            console.log('Ollama not available:', error.message);
        }

        // Check for WebLLM (browser-based models)
        try {
            if (typeof window !== 'undefined' && 'gpu' in navigator) {
                // Check WebGPU support for WebLLM
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    console.log('🌐 WebGPU detected, WebLLM models available');
                    this.availableModels.set('webllm:phi-3', {
                        type: 'webllm',
                        name: 'Phi-3-mini',
                        size: '2.4GB',
                        capabilities: ['conversation', 'reasoning']
                    });
                }
            }
        } catch (error) {
            console.log('WebLLM not available:', error.message);
        }

        // Check for local OpenAI-compatible endpoints
        try {
            const localAPIResponse = await fetch('http://localhost:8080/v1/models', {
                method: 'GET',
                timeout: 2000
            });
            
            if (localAPIResponse.ok) {
                const models = await localAPIResponse.json();
                console.log('🔧 Local OpenAI-compatible API detected');
                
                for (const model of models.data || []) {
                    this.availableModels.set(`local-api:${model.id}`, {
                        type: 'local-api',
                        name: model.id,
                        capabilities: ['conversation', 'reasoning']
                    });
                }
            }
        } catch (error) {
            console.log('Local API not available:', error.message);
        }
    }

    /**
     * Check for cloud API availability and user consent
     */
    async checkCloudAPIAvailability() {
        // Check stored user preferences
        try {
            const preferences = localStorage.getItem('whaddyasay_llm_preferences');
            if (preferences) {
                const prefs = JSON.parse(preferences);
                this.userConsent = prefs.consent || this.userConsent;
            }
        } catch (error) {
            console.log('No stored LLM preferences');
        }

        // Check for API keys in environment/config
        const cloudAPIs = [
            { name: 'openai', env: 'OPENAI_API_KEY', endpoint: 'https://api.openai.com/v1/models' },
            { name: 'anthropic', env: 'ANTHROPIC_API_KEY', endpoint: 'https://api.anthropic.com/v1/models' },
            { name: 'google', env: 'GOOGLE_API_KEY', endpoint: 'https://generativelanguage.googleapis.com/v1/models' }
        ];

        for (const api of cloudAPIs) {
            // In a real app, you'd check environment variables or config
            // For now, we'll check if user has configured these
            const apiKey = localStorage.getItem(`whaddyasay_${api.name}_key`);
            if (apiKey && this.userConsent.cloudAPI) {
                this.availableModels.set(`${api.name}:default`, {
                    type: 'cloud',
                    provider: api.name,
                    capabilities: ['conversation', 'reasoning', 'advanced_context']
                });
                console.log(`☁️ ${api.name} API available with user consent`);
            }
        }
    }

    /**
     * Select the optimal model based on availability and user preferences
     */
    async selectOptimalModel() {
        // Priority order: Local models > Cloud APIs (with consent) > Fallback
        
        if (this.availableModels.size === 0) {
            console.log('📚 No LLM models available, using enhanced templates');
            this.modelType = 'fallback';
            this.currentModel = 'enhanced-templates';
            return;
        }

        // Prefer local models for privacy
        for (const [modelId, modelInfo] of this.availableModels) {
            if (modelInfo.type === 'ollama' || modelInfo.type === 'webllm' || modelInfo.type === 'local-api') {
                this.currentModel = modelId;
                this.modelType = 'local';
                console.log(`🔒 Selected local model: ${modelId} for maximum privacy`);
                return;
            }
        }

        // Use cloud APIs only with explicit consent
        if (this.userConsent.cloudAPI) {
            for (const [modelId, modelInfo] of this.availableModels) {
                if (modelInfo.type === 'cloud') {
                    this.currentModel = modelId;
                    this.modelType = 'cloud';
                    console.log(`☁️ Selected cloud model: ${modelId} with user consent`);
                    return;
                }
            }
        }

        // Fallback to enhanced templates
        this.modelType = 'fallback';
        this.currentModel = 'enhanced-templates';
        console.log('📚 Using enhanced template system as fallback');
    }

    /**
     * Build comprehensive prompt with user context
     */
    async buildAdvicePrompt(situation, context, relationship, urgency, userMemories) {
        // Get relevant user memories and patterns
        const relevantMemories = await this.getRelevantContext(situation, userMemories);
        const userProfile = await this.getUserProfile();
        
        const prompt = `You are an expert conversation coach helping someone prepare for an important conversation. 

SITUATION:
"${situation}"

CONTEXT:
- Setting: ${context}
- Relationship: ${relationship}
- Urgency: ${urgency}

USER BACKGROUND:
${userProfile ? `Communication style: ${userProfile.style}
Past successes: ${userProfile.strengths.join(', ')}
Areas for growth: ${userProfile.challenges.join(', ')}` : 'No previous conversation history available'}

RELEVANT PAST EXPERIENCES:
${relevantMemories.length > 0 ? relevantMemories.map(m => `- ${m.summary}`).join('\n') : 'No relevant past experiences to reference'}

Please provide specific, actionable conversation advice in this exact JSON format:
{
  "situation_analysis": {
    "type": "professional|romantic|family|friendship|apology|conflict_resolution",
    "complexity": "low|medium|high",
    "emotional_tone": "positive|neutral|negative|anxious",
    "key_challenges": ["challenge1", "challenge2"],
    "success_factors": ["factor1", "factor2"]
  },
  "strategy": "Main approach and mindset for this conversation (2-3 sentences)",
  "key_points": [
    "First key point to remember",
    "Second key point to remember",
    "Third key point to remember"
  ],
  "helpful_phrases": [
    "Exact phrase they could use",
    "Another helpful phrase",
    "Third option for key moments"
  ],
  "pitfalls": [
    "What to avoid saying or doing",
    "Common mistake to watch out for",
    "Timing or approach pitfall"
  ],
  "preparation_steps": [
    "What to do before the conversation",
    "How to prepare mentally/emotionally",
    "What information to gather"
  ],
  "follow_up_considerations": [
    "What to do after the conversation",
    "How to maintain the relationship",
    "Next steps if things go well/poorly"
  ]
}

Make the advice specific to their situation, personalized based on their background, and actionable. Avoid generic platitudes.`;

        return prompt;
    }

    /**
     * Generate advice using local model (Ollama)
     */
    async generateWithLocalModel(prompt) {
        const [provider, modelName] = this.currentModel.split(':');
        
        switch (provider) {
            case 'ollama':
                return await this.callOllama(modelName, prompt);
            case 'webllm':
                return await this.callWebLLM(modelName, prompt);
            case 'local-api':
                return await this.callLocalAPI(modelName, prompt);
            default:
                throw new Error(`Unknown local provider: ${provider}`);
        }
    }

    /**
     * Call Ollama API
     */
    async callOllama(model, prompt) {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 2000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    }

    /**
     * Call WebLLM (browser-based)
     */
    async callWebLLM(model, prompt) {
        // This would require WebLLM library integration
        // For now, return a placeholder that indicates WebLLM processing
        console.log('🌐 WebLLM processing (integration pending)');
        return await this.generateWithEnhancedTemplates(prompt);
    }

    /**
     * Call local OpenAI-compatible API
     */
    async callLocalAPI(model, prompt) {
        const response = await fetch('http://localhost:8080/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer local'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`Local API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Generate advice using cloud API (with user consent)
     */
    async generateWithCloudAPI(prompt) {
        const [provider] = this.currentModel.split(':');
        
        switch (provider) {
            case 'openai':
                return await this.callOpenAI(prompt);
            case 'anthropic':
                return await this.callAnthropic(prompt);
            case 'google':
                return await this.callGoogleAI(prompt);
            default:
                throw new Error(`Unknown cloud provider: ${provider}`);
        }
    }

    /**
     * Enhanced template system (fallback)
     */
    async generateWithEnhancedTemplates(situation, context, relationship, urgency, userMemories) {
        console.log('📚 Using enhanced template system with user context');
        
        // This is much more sophisticated than the original templates
        // It uses user memories and context to personalize responses
        
        const situationType = this.classifySituation(situation);
        const baseTemplate = this.getBaseTemplate(situationType);
        
        // Personalize based on user history and memories
        const personalizedAdvice = await this.personalizeTemplate(baseTemplate, situation, userMemories);
        
        return {
            situation_analysis: {
                type: situationType,
                complexity: this.assessComplexity(situation),
                emotional_tone: this.assessEmotionalTone(situation),
                key_challenges: this.extractChallenges(situation),
                success_factors: this.extractSuccessFactors(situation, userMemories)
            },
            strategy: personalizedAdvice.strategy,
            key_points: personalizedAdvice.key_points,
            helpful_phrases: personalizedAdvice.helpful_phrases,
            pitfalls: personalizedAdvice.pitfalls,
            preparation_steps: personalizedAdvice.preparation_steps,
            follow_up_considerations: personalizedAdvice.follow_up_considerations
        };
    }

    /**
     * Parse LLM response into structured format
     */
    async parseAdviceResponse(response, situation) {
        try {
            // Try to parse as JSON first
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate required fields
                if (parsed.strategy && parsed.key_points && parsed.helpful_phrases) {
                    return parsed;
                }
            }
            
            // If JSON parsing fails, extract information from natural language response
            return await this.extractAdviceFromNaturalLanguage(response, situation);
            
        } catch (error) {
            console.error('Error parsing LLM response:', error);
            // Fallback to basic extraction
            return {
                situation_analysis: {
                    type: this.classifySituation(situation),
                    complexity: "medium",
                    emotional_tone: "neutral"
                },
                strategy: response.substring(0, 200) + "...",
                key_points: ["Consider the other person's perspective", "Be clear about your needs", "Listen actively"],
                helpful_phrases: ["I understand your position", "Can we find a solution that works for both of us?", "I'd like to discuss this further"],
                pitfalls: ["Don't make assumptions", "Avoid emotional reactions", "Don't rush the conversation"],
                preparation_steps: ["Think about your goals", "Consider their perspective", "Choose the right time and place"],
                follow_up_considerations: ["Follow through on commitments", "Check in later", "Be open to ongoing dialogue"]
            };
        }
    }

    /**
     * Get relevant user context and memories
     */
    async getRelevantContext(situation, userMemories) {
        if (!this.localStorage || !userMemories || userMemories.length === 0) {
            return [];
        }

        // Find memories related to the current situation
        const keywords = situation.toLowerCase().split(' ');
        const relevantMemories = [];

        for (const memory of userMemories.slice(0, 5)) { // Limit for performance
            const memoryText = (memory.processed_content?.searchable_content || memory.text || '').toLowerCase();
            const relevance = keywords.filter(keyword => memoryText.includes(keyword)).length;
            
            if (relevance > 0) {
                relevantMemories.push({
                    relevance,
                    summary: memoryText.substring(0, 100),
                    topics: memory.processed_content?.topics || [],
                    emotional_tone: memory.processed_content?.emotional_analysis?.sentiment || 'neutral'
                });
            }
        }

        return relevantMemories.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
    }

    /**
     * Get user communication profile
     */
    async getUserProfile() {
        try {
            const profile = localStorage.getItem('whaddyasay_user_profile');
            return profile ? JSON.parse(profile) : null;
        } catch (error) {
            return null;
        }
    }

    // Helper methods for template system
    classifySituation(situation) {
        const lower = situation.toLowerCase();
        if (lower.includes('work') || lower.includes('boss') || lower.includes('job')) return 'professional';
        if (lower.includes('partner') || lower.includes('relationship') || lower.includes('love')) return 'romantic';
        if (lower.includes('family') || lower.includes('parent') || lower.includes('child')) return 'family';
        if (lower.includes('friend') || lower.includes('buddy')) return 'friendship';
        if (lower.includes('sorry') || lower.includes('apolog')) return 'apology';
        if (lower.includes('conflict') || lower.includes('argument')) return 'conflict_resolution';
        return 'general';
    }

    assessComplexity(situation) {
        const wordCount = situation.split(' ').length;
        const complexIndicators = ['multiple', 'complex', 'complicated', 'several', 'various'];
        const hasComplexIndicators = complexIndicators.some(word => situation.toLowerCase().includes(word));
        
        if (wordCount > 50 || hasComplexIndicators) return 'high';
        if (wordCount < 20) return 'low';
        return 'medium';
    }

    assessEmotionalTone(situation) {
        const lower = situation.toLowerCase();
        const positiveWords = ['excited', 'happy', 'good', 'great', 'wonderful'];
        const negativeWords = ['angry', 'frustrated', 'upset', 'disappointed', 'difficult'];
        const anxiousWords = ['nervous', 'worried', 'scared', 'anxious'];
        
        if (positiveWords.some(word => lower.includes(word))) return 'positive';
        if (negativeWords.some(word => lower.includes(word))) return 'negative';
        if (anxiousWords.some(word => lower.includes(word))) return 'anxious';
        return 'neutral';
    }

    extractChallenges(situation) {
        // Extract potential challenges from the situation description
        const lower = situation.toLowerCase();
        const challenges = [];
        
        if (lower.includes('difficult') || lower.includes('hard')) challenges.push('Managing emotional difficulty');
        if (lower.includes('first time') || lower.includes('never')) challenges.push('Lack of experience with this situation');
        if (lower.includes('important') || lower.includes('critical')) challenges.push('High stakes conversation');
        if (lower.includes('upset') || lower.includes('angry')) challenges.push('Managing emotions');
        
        return challenges.length > 0 ? challenges : ['Communicating clearly', 'Managing expectations'];
    }

    extractSuccessFactors(situation, userMemories) {
        const factors = ['Clear communication', 'Active listening', 'Empathy and understanding'];
        
        // Add personalized factors based on user history
        if (userMemories && userMemories.length > 0) {
            const successfulPatterns = userMemories.filter(m => 
                m.processed_content?.emotional_analysis?.sentiment === 'positive'
            );
            
            if (successfulPatterns.length > 0) {
                factors.push('Building on past successful conversations');
            }
        }
        
        return factors;
    }

    getBaseTemplate(type) {
        const templates = {
            professional: {
                strategy: "Approach this professionally with clear objectives and evidence.",
                key_points: ["Prepare concrete examples", "Focus on business value", "Choose appropriate timing"],
                helpful_phrases: ["I'd like to discuss my role and contributions", "Based on my performance metrics"],
                pitfalls: ["Don't make it personal", "Avoid ultimatums", "Don't compare yourself negatively"],
                preparation_steps: ["Document your achievements", "Research company policies", "Practice your key points"],
                follow_up_considerations: ["Send a follow-up email", "Implement feedback received", "Schedule regular check-ins"]
            },
            // Add other templates...
        };
        
        return templates[type] || templates.professional;
    }

    async personalizeTemplate(template, situation, userMemories) {
        // Use user context to personalize the template
        const personalized = { ...template };
        
        // Add user-specific insights if available
        if (userMemories && userMemories.length > 0) {
            personalized.strategy += " Based on your past experiences, consider building on approaches that have worked well for you before.";
        }
        
        return personalized;
    }

    async extractAdviceFromNaturalLanguage(response, situation) {
        // Extract structured advice from unstructured LLM response
        // This is a simplified version - could be much more sophisticated
        
        const sections = response.split('\n\n');
        
        return {
            situation_analysis: {
                type: this.classifySituation(situation),
                complexity: "medium",
                emotional_tone: "neutral"
            },
            strategy: sections[0] || response.substring(0, 200),
            key_points: this.extractListItems(response, ['key', 'important', 'remember']),
            helpful_phrases: this.extractQuotedText(response),
            pitfalls: this.extractListItems(response, ['avoid', 'don\'t', 'never']),
            preparation_steps: this.extractListItems(response, ['prepare', 'before', 'ready']),
            follow_up_considerations: this.extractListItems(response, ['after', 'follow', 'next'])
        };
    }

    extractListItems(text, keywords) {
        const lines = text.split('\n');
        const items = [];
        
        for (const line of lines) {
            if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
                if (keywords.some(keyword => line.toLowerCase().includes(keyword))) {
                    items.push(line.replace(/^[-*•]\s+|^\d+\.\s+/, '').trim());
                }
            }
        }
        
        return items.length > 0 ? items : ['Be clear and direct', 'Listen actively', 'Stay focused on solutions'];
    }

    extractQuotedText(text) {
        const quotes = text.match(/"([^"]+)"/g) || [];
        return quotes.length > 0 ? quotes.map(q => q.replace(/"/g, '')) : 
               ['I understand your perspective', 'Can we work together on this?', 'What would help make this work for you?'];
    }

    /**
     * Get available models for user selection
     */
    getAvailableModels() {
        return Array.from(this.availableModels.entries()).map(([id, info]) => ({
            id,
            name: info.name || id,
            type: info.type,
            privacy_level: info.type === 'cloud' ? 'cloud_processed' : 'complete_privacy',
            capabilities: info.capabilities || []
        }));
    }

    /**
     * Set user consent for cloud APIs
     */
    async setUserConsent(consent) {
        this.userConsent = { ...this.userConsent, ...consent };
        
        // Save preferences
        localStorage.setItem('whaddyasay_llm_preferences', JSON.stringify({
            consent: this.userConsent,
            updated_at: new Date().toISOString()
        }));
        
        // Re-initialize to pick up new preferences
        if (consent.cloudAPI !== undefined) {
            await this.checkCloudAPIAvailability();
            await this.selectOptimalModel();
        }
    }
}

// Export for use in other modules
window.LLMEngine = LLMEngine;