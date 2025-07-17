/**
 * Local AI Engine for What Do You Say? PWA
 * Provides conversation analysis and advice generation without server dependency
 */

class PWAAIEngine {
  constructor() {
    this.initialized = false;
    this.localStorage = null;
    this.patterns = new Map();
    this.conversationHistory = [];
    this.userProfile = {
      communicationStyle: 'adaptive',
      strengths: [],
      challenges: [],
      preferences: {}
    };
    this.llmEngine = null;
    this.usingRealLLM = false;
  }

  /**
   * Initialize the AI engine with local storage and LLM support
   */
  async init(localStorage) {
    this.localStorage = localStorage;
    await this.loadUserProfile();
    await this.loadCommunicationPatterns();
    
    // Initialize real LLM engine
    await this.initializeLLMEngine();
    
    this.initialized = true;
    console.log(`✅ AI Engine initialized with ${this.usingRealLLM ? 'real LLM' : 'template system'}`);
  }

  /**
   * Initialize the real LLM engine
   */
  async initializeLLMEngine() {
    try {
      if (window.LLMEngine) {
        this.llmEngine = new LLMEngine();
        await this.llmEngine.init(this.localStorage);
        this.usingRealLLM = this.llmEngine.modelType !== 'fallback';
        
        if (this.usingRealLLM) {
          console.log(`🤖 Real LLM activated: ${this.llmEngine.currentModel} (${this.llmEngine.modelType})`);
        } else {
          console.log('📚 Using enhanced template system (no LLM models available)');
        }
      } else {
        console.log('❌ LLMEngine not available, using template fallback');
      }
    } catch (error) {
      console.error('Error initializing LLM engine:', error);
      this.usingRealLLM = false;
    }
  }

  /**
   * Generate conversation advice based on situation
   */
  async generateAdvice(situation, context = 'general', relationship = '', urgency = 'medium') {
    if (!this.initialized) {
      throw new Error('AI Engine not initialized');
    }

    try {
      // Get user memories for context
      const relevantMemories = await this.getRelevantMemories(situation, context);
      
      let advice;
      
      if (this.usingRealLLM && this.llmEngine) {
        console.log('🤖 Generating advice with real LLM');
        // Use real LLM for dynamic, contextual advice
        advice = await this.llmEngine.generateAdvice(
          situation, 
          context, 
          relationship, 
          urgency, 
          relevantMemories
        );
        
        // Add LLM-specific metadata
        advice.generated_with_llm = true;
        advice.model_info = advice.model_info || {};
        
      } else {
        console.log('📚 Generating advice with enhanced templates');
        // Fall back to enhanced template system
        const analysis = await this.analyzeSituation(situation);
        const relevantPatterns = await this.getRelevantPatterns(analysis.type, context);
        
        advice = await this.generatePersonalizedAdvice(
          situation, 
          analysis, 
          context, 
          relationship, 
          urgency,
          relevantPatterns,
          relevantMemories
        );
        
        advice.generated_with_llm = false;
        advice.model_info = {
          type: 'template',
          model: 'enhanced-templates',
          privacy_level: 'complete'
        };
      }

      // Learn from this interaction
      await this.updatePatterns({ type: advice.situation_analysis?.type || 'general' }, advice);

      return advice;

    } catch (error) {
      console.error('Error generating advice:', error);
      // Emergency fallback to simple templates
      return await this.generateEmergencyFallbackAdvice(situation, context, relationship);
    }
  }

  /**
   * Emergency fallback when both LLM and enhanced templates fail
   */
  async generateEmergencyFallbackAdvice(situation, context, relationship) {
    console.log('🚨 Using emergency fallback advice generation');
    
    const situationType = this.classifySituationSimple(situation);
    
    return {
      conversation_id: Date.now(),
      situation_analysis: {
        type: situationType,
        context: context,
        situation: situation,
        complexity: 'medium',
        confidence: 0.3
      },
      strategy: "Take time to listen carefully and express your thoughts clearly. Focus on understanding their perspective while being honest about your own needs.",
      key_points: [
        "Listen actively to understand their viewpoint",
        "Express your thoughts clearly and respectfully",
        "Focus on finding common ground",
        "Be patient and stay calm",
        "Ask questions to clarify understanding"
      ],
      helpful_phrases: [
        "I understand what you're saying...",
        "Can you help me understand your perspective?",
        "I'd like to share my thoughts on this...",
        "How can we work together on this?",
        "What would help make this work for both of us?"
      ],
      pitfalls: [
        "Don't interrupt or dismiss their concerns",
        "Avoid making assumptions about their intentions",
        "Don't let emotions override rational discussion",
        "Avoid bringing up unrelated past issues"
      ],
      generated_with_llm: false,
      model_info: {
        type: 'emergency_fallback',
        model: 'basic-templates',
        privacy_level: 'complete'
      },
      offline: true,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Simple situation classification for emergency fallback
   */
  classifySituationSimple(situation) {
    const lower = situation.toLowerCase();
    if (lower.includes('work') || lower.includes('boss') || lower.includes('job')) return 'professional';
    if (lower.includes('family') || lower.includes('parent')) return 'family';
    if (lower.includes('partner') || lower.includes('relationship')) return 'romantic';
    if (lower.includes('friend')) return 'friendship';
    if (lower.includes('sorry') || lower.includes('apolog')) return 'apology';
    return 'general';
  }

  /**
   * Analyze situation to determine type and key characteristics
   */
  async analyzeSituation(situation) {
    const lowerSit = situation.toLowerCase();
    const words = lowerSit.split(' ');
    
    // Situation type detection
    let type = 'general';
    let confidence = 0.5;
    let keywords = [];
    let emotionalTone = 'neutral';
    let complexity = 'medium';
    
    // Professional situations
    if (this.containsAny(lowerSit, ['boss', 'manager', 'raise', 'promotion', 'work', 'job', 'colleague', 'meeting', 'performance', 'feedback'])) {
      type = 'professional';
      confidence = 0.8;
      keywords = this.extractKeywords(lowerSit, ['boss', 'manager', 'raise', 'promotion', 'work', 'job', 'colleague', 'meeting', 'performance', 'feedback']);
    }
    
    // Romantic relationships
    else if (this.containsAny(lowerSit, ['partner', 'spouse', 'boyfriend', 'girlfriend', 'relationship', 'dating', 'love', 'romantic'])) {
      type = 'romantic';
      confidence = 0.8;
      keywords = this.extractKeywords(lowerSit, ['partner', 'spouse', 'boyfriend', 'girlfriend', 'relationship', 'dating', 'love', 'romantic']);
    }
    
    // Family situations
    else if (this.containsAny(lowerSit, ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'child', 'teenager'])) {
      type = 'family';
      confidence = 0.8;
      keywords = this.extractKeywords(lowerSit, ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'child']);
    }
    
    // Friendship situations
    else if (this.containsAny(lowerSit, ['friend', 'buddy', 'pal', 'friendship', 'social', 'group'])) {
      type = 'friendship';
      confidence = 0.7;
      keywords = this.extractKeywords(lowerSit, ['friend', 'buddy', 'pal', 'friendship', 'social', 'group']);
    }
    
    // Apology situations
    else if (this.containsAny(lowerSit, ['apolog', 'sorry', 'mistake', 'wrong', 'forgive', 'fault', 'error'])) {
      type = 'apology';
      confidence = 0.9;
      keywords = this.extractKeywords(lowerSit, ['apolog', 'sorry', 'mistake', 'wrong', 'forgive', 'fault', 'error']);
    }
    
    // Conflict resolution
    else if (this.containsAny(lowerSit, ['conflict', 'argument', 'fight', 'disagree', 'dispute', 'tension', 'angry', 'upset'])) {
      type = 'conflict_resolution';
      confidence = 0.8;
      keywords = this.extractKeywords(lowerSit, ['conflict', 'argument', 'fight', 'disagree', 'dispute', 'tension', 'angry', 'upset']);
    }

    // Emotional tone analysis
    if (this.containsAny(lowerSit, ['angry', 'mad', 'furious', 'frustrated', 'upset', 'annoyed'])) {
      emotionalTone = 'negative';
    } else if (this.containsAny(lowerSit, ['happy', 'excited', 'positive', 'good', 'great', 'wonderful'])) {
      emotionalTone = 'positive';
    } else if (this.containsAny(lowerSit, ['nervous', 'anxious', 'worried', 'scared', 'afraid', 'stress'])) {
      emotionalTone = 'anxious';
    }

    // Complexity analysis
    if (words.length > 50 || this.containsAny(lowerSit, ['complex', 'complicated', 'multiple', 'several', 'many'])) {
      complexity = 'high';
    } else if (words.length < 20) {
      complexity = 'low';
    }

    return {
      type,
      confidence,
      keywords,
      emotionalTone,
      complexity,
      wordCount: words.length,
      sentiment: this.analyzeSentiment(lowerSit)
    };
  }

  /**
   * Get relevant patterns from past conversations
   */
  async getRelevantPatterns(situationType, context) {
    if (!this.localStorage) return [];

    try {
      const conversations = await this.localStorage.getConversations(100);
      const patterns = [];

      for (const conv of conversations) {
        if (conv.situation_type === situationType) {
          const advice = JSON.parse(conv.advice_given || '{}');
          if (advice.success_rating && advice.success_rating >= 4) {
            patterns.push({
              type: 'successful_strategy',
              situation_type: situationType,
              strategy: advice.strategy,
              success_rating: advice.success_rating
            });
          }
        }
      }

      return patterns;
    } catch (error) {
      console.error('Error getting relevant patterns:', error);
      return [];
    }
  }

  /**
   * Get relevant memories with enhanced search
   */
  async getRelevantMemories(situation, context) {
    if (!this.localStorage) return [];

    try {
      const memories = await this.localStorage.searchMemories(situation, [], null, 10);
      
      // Enhanced memory processing for LLM context
      return memories.map(memory => ({
        content: memory.content,
        processed_content: memory.processed_content,
        tags: memory.tags,
        memory_type: memory.memory_type,
        timestamp: memory.timestamp,
        // Extract key information for LLM context
        summary: memory.processed_content?.content_summary || memory.content?.substring(0, 100),
        topics: memory.processed_content?.topics || [],
        emotional_tone: memory.processed_content?.emotional_analysis?.sentiment || 'neutral',
        entities: memory.processed_content?.entities || []
      }));
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  }

  /**
   * Generate personalized advice
   */
  async generatePersonalizedAdvice(situation, analysis, context, relationship, urgency, patterns, memories) {
    const adviceTemplate = this.getAdviceTemplate(analysis.type);
    
    // Personalize based on patterns and memories
    const personalizedStrategy = this.personalizeStrategy(adviceTemplate.strategy, patterns, memories);
    const personalizedKeyPoints = this.personalizeKeyPoints(adviceTemplate.keyPoints, patterns, analysis);
    const personalizedPhrases = this.personalizeHelpfulPhrases(adviceTemplate.helpfulPhrases, relationship, analysis);
    
    // Generate insights
    const personalInsights = this.generatePersonalInsights(patterns, memories, analysis);
    const confidenceBoosters = this.generateConfidenceBoosters(patterns, analysis);
    
    // Adjust for urgency
    const adjustedAdvice = this.adjustForUrgency(
      {
        strategy: personalizedStrategy,
        keyPoints: personalizedKeyPoints,
        phrases: personalizedPhrases
      },
      urgency
    );

    return {
      conversation_id: Date.now(),
      situation_analysis: {
        type: analysis.type,
        context: context,
        situation: situation,
        emotional_tone: analysis.emotionalTone,
        complexity: analysis.complexity,
        keywords: analysis.keywords,
        confidence: analysis.confidence
      },
      strategy: adjustedAdvice.strategy,
      key_points: adjustedAdvice.keyPoints,
      pitfalls: this.getPitfalls(analysis.type, analysis.emotionalTone),
      helpful_phrases: adjustedAdvice.phrases,
      personal_insights: personalInsights,
      confidence_boosters: confidenceBoosters,
      urgency_considerations: this.getUrgencyConsiderations(urgency),
      follow_up_questions: this.generateFollowUpQuestions(analysis),
      offline: true,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Get advice template by situation type
   */
  getAdviceTemplate(type) {
    const templates = {
      professional: {
        strategy: "Approach this professionally with clear objectives and supporting evidence. Focus on business value and mutual benefit.",
        keyPoints: [
          "Prepare specific examples of your contributions and achievements",
          "Research industry standards and company policies",
          "Choose the right time and setting for maximum impact",
          "Be confident but respectful in your communication",
          "Have a clear ask and be prepared to discuss next steps"
        ],
        helpfulPhrases: [
          "I'd like to discuss my role and contributions to the team",
          "Based on my research and performance metrics",
          "I'm hoping we can find a path forward that benefits both of us",
          "I value this opportunity and want to continue growing here",
          "What would need to happen for us to move forward on this?"
        ]
      },
      romantic: {
        strategy: "Focus on understanding each other's perspectives and finding common ground. Use empathy and active listening.",
        keyPoints: [
          "Use 'I' statements to express your feelings without blame",
          "Listen actively to understand their concerns and needs",
          "Find a calm, private moment when you're both relaxed",
          "Focus on solutions and compromise rather than being right",
          "Show appreciation for their willingness to discuss difficult topics"
        ],
        helpfulPhrases: [
          "I've been thinking about us and wanted to share my feelings",
          "Help me understand your perspective on this situation",
          "I love you and want us to work through this together",
          "What would make you feel more comfortable about this?",
          "How can we find a solution that works for both of us?"
        ]
      },
      apology: {
        strategy: "Take full responsibility without making excuses. Focus on understanding the impact and making amends.",
        keyPoints: [
          "Acknowledge specifically what you did wrong",
          "Express genuine remorse for the impact of your actions",
          "Take full responsibility without making excuses",
          "Explain how you'll prevent this from happening again",
          "Ask what you can do to make things right"
        ],
        helpfulPhrases: [
          "I take full responsibility for what happened",
          "I understand how my actions affected you and I'm truly sorry",
          "I was wrong and there's no excuse for what I did",
          "I'm committed to doing better by changing my approach",
          "What can I do to rebuild your trust and make this right?"
        ]
      },
      conflict_resolution: {
        strategy: "Stay calm and focus on finding mutually acceptable solutions. Address the issue, not the person.",
        keyPoints: [
          "Stay calm and speak in a measured tone",
          "Focus on the specific issue, not personal attacks",
          "Look for common ground and shared goals",
          "Be willing to compromise and find middle ground",
          "Set clear boundaries and expectations going forward"
        ],
        helpfulPhrases: [
          "I can see we have different perspectives on this",
          "Let's focus on finding a solution that works for everyone",
          "I understand you're frustrated, and I want to resolve this",
          "What would it take for us to move forward positively?",
          "Can we agree on some ground rules for handling this?"
        ]
      }
    };

    return templates[type] || templates.professional;
  }

  /**
   * Helper methods
   */
  containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  extractKeywords(text, possibleKeywords) {
    return possibleKeywords.filter(keyword => text.includes(keyword));
  }

  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'frustrated', 'disappointed', 'awful', 'horrible'];
    
    const positiveCount = positiveWords.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  personalizeStrategy(baseStrategy, patterns, memories) {
    // Add personalization based on past successful patterns
    if (patterns.length > 0) {
      const successfulStrategies = patterns.filter(p => p.type === 'successful_strategy');
      if (successfulStrategies.length > 0) {
        return baseStrategy + " Based on your past successes, consider building on strategies that have worked well for you before.";
      }
    }
    return baseStrategy;
  }

  personalizeKeyPoints(basePoints, patterns, analysis) {
    const personalizedPoints = [...basePoints];
    
    // Add points based on emotional tone
    if (analysis.emotionalTone === 'anxious') {
      personalizedPoints.push("Take time to center yourself before the conversation");
    } else if (analysis.emotionalTone === 'negative') {
      personalizedPoints.push("Give yourself time to cool down before addressing this");
    }
    
    return personalizedPoints;
  }

  personalizeHelpfulPhrases(basePhrases, relationship, analysis) {
    const personalizedPhrases = [...basePhrases];
    
    // Add relationship-specific phrases
    if (relationship === 'manager') {
      personalizedPhrases.push("I appreciate your leadership and wanted to discuss...");
    } else if (relationship === 'partner') {
      personalizedPhrases.push("Our relationship means everything to me, so I wanted to talk about...");
    }
    
    return personalizedPhrases;
  }

  generatePersonalInsights(patterns, memories, analysis) {
    const insights = [];
    
    if (patterns.length > 0) {
      insights.push("You've successfully handled similar situations before - trust your experience");
    }
    
    if (memories.length > 0) {
      insights.push("Your past experiences show you're thoughtful about communication");
    }
    
    if (analysis.complexity === 'high') {
      insights.push("This seems like a complex situation - consider breaking it into smaller parts");
    }
    
    if (insights.length === 0) {
      insights.push("This is a new type of situation for you - trust your instincts and stay authentic");
    }
    
    return insights;
  }

  generateConfidenceBoosters(patterns, analysis) {
    const boosters = [
      "You're taking the right step by preparing for this conversation",
      "Most people appreciate honest, respectful communication",
      "The fact that you're thinking about this shows you care about the outcome"
    ];
    
    if (patterns.length > 0) {
      boosters.push("You've handled difficult conversations successfully before");
    }
    
    if (analysis.emotionalTone === 'anxious') {
      boosters.push("It's normal to feel nervous - this shows the conversation matters to you");
    }
    
    return boosters.slice(0, 3);
  }

  getPitfalls(type, emotionalTone) {
    const basePitfalls = {
      professional: [
        "Don't make it personal or emotional",
        "Avoid ultimatums unless you're prepared to follow through",
        "Don't compare yourself negatively to others"
      ],
      romantic: [
        "Don't bring up past grievances",
        "Avoid accusatory language",
        "Don't have this conversation when emotions are running high"
      ],
      apology: [
        "Don't make excuses or justify your actions",
        "Avoid saying 'I'm sorry you feel that way'",
        "Don't expect immediate forgiveness"
      ]
    };
    
    const pitfalls = basePitfalls[type] || basePitfalls.professional;
    
    // Add emotional tone specific pitfalls
    if (emotionalTone === 'negative') {
      pitfalls.push("Don't let your anger control the conversation");
    } else if (emotionalTone === 'anxious') {
      pitfalls.push("Don't let nervousness make you rush through important points");
    }
    
    return pitfalls;
  }

  adjustForUrgency(advice, urgency) {
    if (urgency === 'high') {
      advice.strategy += " Given the urgency, focus on the most critical points and be prepared to address this promptly.";
      advice.keyPoints.unshift("Address this as soon as appropriately possible");
    } else if (urgency === 'low') {
      advice.strategy += " Since this isn't urgent, take time to prepare thoroughly and choose the optimal moment.";
      advice.keyPoints.push("Take time to prepare and choose the right moment");
    }
    
    return advice;
  }

  getUrgencyConsiderations(urgency) {
    const considerations = {
      high: [
        "Don't let urgency cause you to skip important preparation",
        "Focus on the most critical points first",
        "Be ready to follow up if needed"
      ],
      medium: [
        "Balance preparation time with timely action",
        "Consider the other person's schedule and availability",
        "Plan for a follow-up conversation if needed"
      ],
      low: [
        "Use the extra time to prepare thoroughly",
        "Consider multiple approaches and choose the best one",
        "Wait for the optimal moment when conditions are right"
      ]
    };
    
    return considerations[urgency] || considerations.medium;
  }

  generateFollowUpQuestions(analysis) {
    const questions = [
      "How do you think they might respond to this conversation?",
      "What outcome would you consider a success?",
      "Are there any concerns you haven't addressed yet?"
    ];
    
    if (analysis.type === 'professional') {
      questions.push("Have you considered the timing and setting for this conversation?");
    } else if (analysis.type === 'romantic') {
      questions.push("How has communication about this topic gone in the past?");
    }
    
    return questions.slice(0, 3);
  }

  async updatePatterns(analysis, advice) {
    // Learn from the generated advice to improve future recommendations
    try {
      const pattern = {
        situation_type: analysis.type,
        generated_at: new Date().toISOString(),
        used_llm: advice.generated_with_llm || false,
        model_type: advice.model_info?.type || 'unknown',
        success_rating: null // Will be updated when user provides feedback
      };
      
      // Store pattern for future learning
      const existingPatterns = JSON.parse(localStorage.getItem('whaddyasay_advice_patterns') || '[]');
      existingPatterns.push(pattern);
      
      // Keep only last 100 patterns to prevent storage bloat
      if (existingPatterns.length > 100) {
        existingPatterns.splice(0, existingPatterns.length - 100);
      }
      
      localStorage.setItem('whaddyasay_advice_patterns', JSON.stringify(existingPatterns));
      
      console.log('📊 Learning pattern stored:', {
        type: analysis.type,
        used_llm: advice.generated_with_llm,
        model: advice.model_info?.model
      });
    } catch (error) {
      console.error('Error updating patterns:', error);
    }
  }

  /**
   * Get LLM engine status and available models
   */
  getLLMStatus() {
    if (!this.llmEngine) {
      return {
        available: false,
        models: [],
        current_model: null,
        privacy_level: 'complete'
      };
    }
    
    return {
      available: this.usingRealLLM,
      models: this.llmEngine.getAvailableModels(),
      current_model: this.llmEngine.currentModel,
      model_type: this.llmEngine.modelType,
      privacy_level: this.llmEngine.modelType === 'local' ? 'complete' : 
                    (this.llmEngine.modelType === 'cloud' ? 'cloud_processed' : 'template_based')
    };
  }

  /**
   * Set user consent for cloud LLM usage
   */
  async setCloudLLMConsent(consent) {
    if (this.llmEngine) {
      await this.llmEngine.setUserConsent({ cloudAPI: consent });
      this.usingRealLLM = this.llmEngine.modelType !== 'fallback';
      console.log(`🔄 Cloud LLM consent ${consent ? 'granted' : 'revoked'}, using: ${this.llmEngine.currentModel}`);
    }
  }

  async loadUserProfile() {
    // Load user profile from localStorage
    try {
      const profile = localStorage.getItem('whaddyasay_user_profile');
      if (profile) {
        this.userProfile = JSON.parse(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async loadCommunicationPatterns() {
    // Load learned patterns from localStorage
    try {
      const patterns = localStorage.getItem('whaddyasay_patterns');
      if (patterns) {
        this.patterns = new Map(JSON.parse(patterns));
      }
    } catch (error) {
      console.error('Error loading communication patterns:', error);
    }
  }

  async saveUserProfile() {
    try {
      localStorage.setItem('whaddyasay_user_profile', JSON.stringify(this.userProfile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  async saveCommunicationPatterns() {
    try {
      localStorage.setItem('whaddyasay_patterns', JSON.stringify([...this.patterns]));
    } catch (error) {
      console.error('Error saving communication patterns:', error);
    }
  }
}

// Export for use in other modules
window.PWAAIEngine = PWAAIEngine;

// Load LLM Engine if not already loaded
if (typeof window !== 'undefined' && !window.LLMEngine) {
  const script = document.createElement('script');
  script.src = 'llm-engine.js';
  script.async = true;
  document.head.appendChild(script);
}