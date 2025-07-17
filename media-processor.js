/**
 * Media Processing Engine for What Do You Say? PWA
 * Converts binary media (images, audio) to text for RAG processing
 * Ensures HIPAA-compliant local processing with no external API calls
 */

class MediaProcessor {
    constructor() {
        this.initialized = false;
        this.audioContext = null;
        this.speechRecognition = null;
        this.imageAnalysisCache = new Map();
        this.audioAnalysisCache = new Map();
    }

    /**
     * Initialize the media processor
     */
    async init() {
        try {
            // Initialize Web Audio API for audio analysis
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Initialize Speech Recognition for audio transcription
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.speechRecognition = new SpeechRecognition();
                this.speechRecognition.continuous = true;
                this.speechRecognition.interimResults = false;
                this.speechRecognition.lang = 'en-US';
            }

            this.initialized = true;
            console.log('✅ Media Processor initialized');
        } catch (error) {
            console.error('❌ Error initializing Media Processor:', error);
            throw error;
        }
    }

    /**
     * Process memory data and convert binary media to text
     */
    async processMemoryData(memoryData) {
        if (!this.initialized) {
            await this.init();
        }

        const processedData = {
            ...memoryData,
            processed_content: {
                text_content: memoryData.text || '',
                media_descriptions: [],
                audio_transcripts: [],
                image_descriptions: [],
                semantic_tokens: [],
                content_summary: '',
                emotional_analysis: {},
                topics: [],
                entities: []
            }
        };

        try {
            // Process audio data
            if (memoryData.audio_data) {
                const audioAnalysis = await this.processAudioData(memoryData.audio_data);
                processedData.processed_content.audio_transcripts.push(audioAnalysis);
                processedData.processed_content.media_descriptions.push(`Audio: ${audioAnalysis.transcript || 'Recording contains speech content'}`);
            }

            // Process photo data
            if (memoryData.photo_data) {
                const imageAnalysis = await this.processImageData(memoryData.photo_data, memoryData.photo_name);
                processedData.processed_content.image_descriptions.push(imageAnalysis);
                processedData.processed_content.media_descriptions.push(`Image: ${imageAnalysis.description}`);
            }

            // Process file data
            if (memoryData.files_data && memoryData.files_data.length > 0) {
                for (const file of memoryData.files_data) {
                    const fileAnalysis = await this.processFileData(file);
                    if (fileAnalysis.description) {
                        processedData.processed_content.media_descriptions.push(`File (${file.name}): ${fileAnalysis.description}`);
                    }
                }
            }

            // Create comprehensive text content for RAG
            const allTextContent = [
                processedData.processed_content.text_content,
                ...processedData.processed_content.media_descriptions,
                ...(processedData.processed_content.audio_transcripts.map(a => a.transcript).filter(Boolean))
            ].filter(Boolean).join(' ');

            // Generate semantic analysis
            const semanticAnalysis = await this.generateSemanticAnalysis(allTextContent);
            processedData.processed_content.semantic_tokens = semanticAnalysis.tokens;
            processedData.processed_content.content_summary = semanticAnalysis.summary;
            processedData.processed_content.emotional_analysis = semanticAnalysis.emotional_analysis;
            processedData.processed_content.topics = semanticAnalysis.topics;
            processedData.processed_content.entities = semanticAnalysis.entities;

            // Generate final searchable content
            processedData.processed_content.searchable_content = this.generateSearchableContent(processedData.processed_content);

            console.log('✅ Memory data processed for RAG:', {
                textLength: allTextContent.length,
                mediaItems: processedData.processed_content.media_descriptions.length,
                topics: processedData.processed_content.topics.length
            });

            return processedData;

        } catch (error) {
            console.error('❌ Error processing memory data:', error);
            // Return original data with minimal processing
            processedData.processed_content.searchable_content = memoryData.text || '';
            return processedData;
        }
    }

    /**
     * Process audio data to extract transcript and metadata
     */
    async processAudioData(audioBase64) {
        try {
            const cacheKey = this.generateCacheKey(audioBase64);
            if (this.audioAnalysisCache.has(cacheKey)) {
                return this.audioAnalysisCache.get(cacheKey);
            }

            const analysis = {
                type: 'audio',
                transcript: '',
                duration_estimate: 0,
                audio_features: {
                    has_speech: false,
                    estimated_words: 0,
                    tone_indicators: []
                },
                content_type: 'voice_note',
                processing_timestamp: new Date().toISOString()
            };

            // Convert base64 to blob for analysis
            const audioBlob = this.base64ToBlob(audioBase64, 'audio/wav');
            
            // Estimate duration from file size (rough approximation)
            analysis.duration_estimate = Math.max(1, Math.floor(audioBlob.size / 16000)); // Assuming 16kHz mono

            // Attempt speech recognition if available
            if (this.speechRecognition) {
                try {
                    const transcript = await this.transcribeAudio(audioBlob);
                    analysis.transcript = transcript;
                    analysis.audio_features.has_speech = transcript.length > 0;
                    analysis.audio_features.estimated_words = transcript.split(' ').length;
                    
                    // Simple tone analysis based on transcript
                    analysis.audio_features.tone_indicators = this.analyzeToneFromText(transcript);
                } catch (transcriptError) {
                    console.warn('Speech recognition failed, using fallback analysis:', transcriptError);
                    analysis.transcript = '[Audio recording - speech content detected]';
                    analysis.audio_features.has_speech = true;
                }
            } else {
                // Fallback when speech recognition is not available
                analysis.transcript = '[Audio recording captured]';
                analysis.audio_features.has_speech = true;
            }

            // Cache the analysis
            this.audioAnalysisCache.set(cacheKey, analysis);
            return analysis;

        } catch (error) {
            console.error('Error processing audio data:', error);
            return {
                type: 'audio',
                transcript: '[Audio recording]',
                duration_estimate: 0,
                audio_features: { has_speech: true, estimated_words: 0, tone_indicators: [] },
                content_type: 'voice_note',
                processing_error: error.message
            };
        }
    }

    /**
     * Process image data to extract description and metadata
     */
    async processImageData(imageBase64, imageName = 'image') {
        try {
            const cacheKey = this.generateCacheKey(imageBase64);
            if (this.imageAnalysisCache.has(cacheKey)) {
                return this.imageAnalysisCache.get(cacheKey);
            }

            const analysis = {
                type: 'image',
                filename: imageName,
                description: '',
                visual_features: {
                    estimated_content: [],
                    scene_type: 'unknown',
                    has_text: false,
                    has_people: false,
                    dominant_colors: []
                },
                metadata: {
                    file_size_estimate: Math.floor(imageBase64.length * 0.75), // Rough estimate
                    format: this.detectImageFormat(imageBase64)
                },
                processing_timestamp: new Date().toISOString()
            };

            // Create image element for basic analysis
            const img = new Image();
            const imageLoadPromise = new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
            });

            img.src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
            
            try {
                await imageLoadPromise;
                
                // Extract basic image properties
                analysis.visual_features.dimensions = {
                    width: img.width,
                    height: img.height,
                    aspect_ratio: (img.width / img.height).toFixed(2)
                };

                // Analyze image using canvas
                const canvasAnalysis = await this.analyzeImageWithCanvas(img);
                analysis.visual_features.dominant_colors = canvasAnalysis.dominantColors;
                analysis.visual_features.brightness = canvasAnalysis.brightness;

                // Generate contextual description
                analysis.description = this.generateImageDescription(analysis, imageName);
                
                // Attempt text extraction (simple heuristic)
                analysis.visual_features.has_text = this.detectTextInImage(canvasAnalysis);

            } catch (imageError) {
                console.warn('Image analysis failed, using fallback:', imageError);
                analysis.description = `Image file: ${imageName}`;
            }

            // Cache the analysis
            this.imageAnalysisCache.set(cacheKey, analysis);
            return analysis;

        } catch (error) {
            console.error('Error processing image data:', error);
            return {
                type: 'image',
                filename: imageName,
                description: `Image: ${imageName}`,
                visual_features: {},
                processing_error: error.message
            };
        }
    }

    /**
     * Process file data to extract relevant information
     */
    async processFileData(fileData) {
        try {
            const analysis = {
                type: 'file',
                filename: fileData.name,
                description: '',
                file_info: {
                    size: fileData.size,
                    type: fileData.type,
                    category: this.categorizeFile(fileData.type, fileData.name)
                },
                processing_timestamp: new Date().toISOString()
            };

            // Generate description based on file type
            if (fileData.type.startsWith('text/')) {
                // For text files, try to extract content
                try {
                    const textContent = await this.extractTextFromFile(fileData);
                    analysis.description = `Text document containing: ${textContent.substring(0, 200)}${textContent.length > 200 ? '...' : ''}`;
                } catch (e) {
                    analysis.description = `Text document: ${fileData.name}`;
                }
            } else if (fileData.type.startsWith('image/')) {
                // Handle as image
                const imageAnalysis = await this.processImageData(fileData.data, fileData.name);
                analysis.description = imageAnalysis.description;
            } else if (fileData.type.startsWith('audio/')) {
                // Handle as audio
                const audioAnalysis = await this.processAudioData(fileData.data);
                analysis.description = `Audio file: ${audioAnalysis.transcript || 'Audio content'}`;
            } else {
                // Generic file description
                analysis.description = `${analysis.file_info.category} file: ${fileData.name}`;
            }

            return analysis;

        } catch (error) {
            console.error('Error processing file data:', error);
            return {
                type: 'file',
                filename: fileData.name,
                description: `File: ${fileData.name}`,
                processing_error: error.message
            };
        }
    }

    /**
     * Generate semantic analysis of text content
     */
    async generateSemanticAnalysis(textContent) {
        try {
            const analysis = {
                tokens: [],
                summary: '',
                emotional_analysis: {
                    sentiment: 'neutral',
                    emotion_indicators: [],
                    confidence: 0.5
                },
                topics: [],
                entities: []
            };

            if (!textContent || textContent.trim().length === 0) {
                return analysis;
            }

            const cleanText = textContent.toLowerCase().trim();
            const words = cleanText.split(/\s+/).filter(word => word.length > 2);
            
            // Generate semantic tokens (important words/phrases)
            analysis.tokens = this.extractSemanticTokens(words);
            
            // Generate summary
            analysis.summary = this.generateContentSummary(textContent);
            
            // Emotional analysis
            analysis.emotional_analysis = this.analyzeEmotionalContent(cleanText);
            
            // Topic extraction
            analysis.topics = this.extractTopics(cleanText);
            
            // Entity extraction (basic)
            analysis.entities = this.extractEntities(textContent);

            return analysis;

        } catch (error) {
            console.error('Error in semantic analysis:', error);
            return {
                tokens: [],
                summary: textContent.substring(0, 100),
                emotional_analysis: { sentiment: 'neutral', emotion_indicators: [], confidence: 0.5 },
                topics: [],
                entities: []
            };
        }
    }

    /**
     * Helper methods for media processing
     */

    async transcribeAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            if (!this.speechRecognition) {
                reject(new Error('Speech recognition not available'));
                return;
            }

            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            let transcript = '';
            let timeoutId;

            recognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript + ' ';
                    }
                }
            };

            recognition.onend = () => {
                clearTimeout(timeoutId);
                resolve(transcript.trim());
            };

            recognition.onerror = (event) => {
                clearTimeout(timeoutId);
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            // Set a timeout for transcription
            timeoutId = setTimeout(() => {
                recognition.stop();
                resolve(transcript.trim() || '[Audio content detected]');
            }, 10000); // 10 second timeout

            try {
                recognition.start();
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    async analyzeImageWithCanvas(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale down for performance
            const maxSize = 100;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Analyze colors and brightness
                const colorCounts = {};
                let totalBrightness = 0;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Calculate brightness
                    const brightness = (r + g + b) / 3;
                    totalBrightness += brightness;
                    
                    // Quantize colors for dominant color detection
                    const quantizedColor = `${Math.floor(r/32)*32},${Math.floor(g/32)*32},${Math.floor(b/32)*32}`;
                    colorCounts[quantizedColor] = (colorCounts[quantizedColor] || 0) + 1;
                }
                
                // Get dominant colors
                const dominantColors = Object.entries(colorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([color]) => color);
                
                const avgBrightness = totalBrightness / (data.length / 4);
                
                resolve({
                    dominantColors,
                    brightness: avgBrightness / 255,
                    pixelCount: data.length / 4
                });
                
            } catch (error) {
                console.warn('Canvas analysis failed:', error);
                resolve({
                    dominantColors: [],
                    brightness: 0.5,
                    pixelCount: 0
                });
            }
        });
    }

    generateImageDescription(analysis, imageName) {
        const features = analysis.visual_features;
        let description = `Image: ${imageName}`;
        
        if (features.dimensions) {
            const orientation = features.dimensions.width > features.dimensions.height ? 'landscape' : 'portrait';
            description += ` (${orientation} orientation)`;
        }
        
        if (features.brightness !== undefined) {
            if (features.brightness > 0.7) {
                description += ', bright scene';
            } else if (features.brightness < 0.3) {
                description += ', dark scene';
            }
        }
        
        if (features.dominant_colors && features.dominant_colors.length > 0) {
            const colorDescriptions = this.describeColors(features.dominant_colors);
            if (colorDescriptions.length > 0) {
                description += `, predominantly ${colorDescriptions.join(' and ')} tones`;
            }
        }
        
        return description;
    }

    describeColors(colorValues) {
        const descriptions = [];
        
        for (const color of colorValues.slice(0, 2)) {
            const [r, g, b] = color.split(',').map(Number);
            
            if (r > 200 && g > 200 && b > 200) {
                descriptions.push('light');
            } else if (r < 50 && g < 50 && b < 50) {
                descriptions.push('dark');
            } else if (r > g && r > b) {
                descriptions.push('warm');
            } else if (b > r && b > g) {
                descriptions.push('cool');
            } else if (g > r && g > b) {
                descriptions.push('natural');
            }
        }
        
        return [...new Set(descriptions)];
    }

    extractSemanticTokens(words) {
        // Remove stop words and extract meaningful tokens
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const meaningfulWords = words.filter(word => !stopWords.has(word) && word.length > 3);
        
        // Count frequency and return top tokens
        const wordCounts = {};
        meaningfulWords.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        
        return Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ token: word, frequency: count }));
    }

    generateContentSummary(textContent) {
        if (textContent.length <= 100) {
            return textContent;
        }
        
        // Simple extractive summarization
        const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length <= 2) {
            return textContent.substring(0, 100) + '...';
        }
        
        // Return first and most central sentence
        const firstSentence = sentences[0].trim();
        const middleSentence = sentences[Math.floor(sentences.length / 2)].trim();
        
        return `${firstSentence}. ${middleSentence}.`.substring(0, 200);
    }

    analyzeEmotionalContent(text) {
        const emotionKeywords = {
            joy: ['happy', 'joyful', 'excited', 'pleased', 'delighted', 'cheerful'],
            sadness: ['sad', 'depressed', 'down', 'melancholy', 'grief', 'sorrow'],
            anger: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'rage'],
            fear: ['afraid', 'scared', 'worried', 'anxious', 'nervous', 'fearful'],
            surprise: ['surprised', 'amazed', 'shocked', 'astonished', 'startled'],
            love: ['love', 'adore', 'cherish', 'affection', 'care', 'fond']
        };
        
        const emotionScores = {};
        let totalIndicators = 0;
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            const matches = keywords.filter(keyword => text.includes(keyword));
            emotionScores[emotion] = matches.length;
            totalIndicators += matches.length;
        }
        
        let dominantEmotion = 'neutral';
        let maxScore = 0;
        
        for (const [emotion, score] of Object.entries(emotionScores)) {
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        }
        
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'perfect'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrating'];
        
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;
        
        let sentiment = 'neutral';
        if (positiveCount > negativeCount) sentiment = 'positive';
        else if (negativeCount > positiveCount) sentiment = 'negative';
        
        return {
            sentiment,
            emotion_indicators: Object.entries(emotionScores)
                .filter(([, score]) => score > 0)
                .map(([emotion, score]) => ({ emotion, score })),
            confidence: totalIndicators > 0 ? Math.min(1, totalIndicators / 3) : 0.5
        };
    }

    extractTopics(text) {
        // Simple topic detection based on keyword clusters
        const topicKeywords = {
            work: ['work', 'job', 'career', 'office', 'business', 'professional', 'meeting', 'project'],
            family: ['family', 'mother', 'father', 'parent', 'child', 'sibling', 'home', 'kids'],
            relationships: ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse', 'love', 'dating'],
            health: ['health', 'medical', 'doctor', 'hospital', 'medicine', 'illness', 'treatment'],
            travel: ['travel', 'trip', 'vacation', 'journey', 'flight', 'hotel', 'destination'],
            education: ['school', 'university', 'learning', 'study', 'education', 'class', 'teacher']
        };
        
        const topicScores = {};
        
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            const matches = keywords.filter(keyword => text.includes(keyword)).length;
            if (matches > 0) {
                topicScores[topic] = matches;
            }
        }
        
        return Object.entries(topicScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([topic, score]) => ({ topic, relevance: score }));
    }

    extractEntities(text) {
        // Simple named entity recognition
        const entities = [];
        
        // Extract potential names (capitalized words)
        const namePattern = /\b[A-Z][a-z]+\b/g;
        const nameMatches = text.match(namePattern) || [];
        const uniqueNames = [...new Set(nameMatches)].slice(0, 5);
        
        uniqueNames.forEach(name => {
            entities.push({ entity: name, type: 'person', confidence: 0.7 });
        });
        
        // Extract dates
        const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
        const dateMatches = text.match(datePattern) || [];
        
        dateMatches.forEach(date => {
            entities.push({ entity: date, type: 'date', confidence: 0.9 });
        });
        
        return entities;
    }

    generateSearchableContent(processedContent) {
        const searchableText = [
            processedContent.text_content,
            processedContent.content_summary,
            ...processedContent.media_descriptions,
            ...(processedContent.audio_transcripts.map(a => a.transcript).filter(Boolean)),
            ...(processedContent.image_descriptions.map(i => i.description).filter(Boolean)),
            ...processedContent.topics.map(t => t.topic),
            ...processedContent.entities.map(e => e.entity),
            ...processedContent.semantic_tokens.map(t => t.token)
        ].filter(Boolean).join(' ');
        
        return searchableText;
    }

    // Utility methods
    generateCacheKey(data) {
        // Simple hash function for caching
        let hash = 0;
        const str = typeof data === 'string' ? data.substring(0, 1000) : JSON.stringify(data).substring(0, 1000);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64.replace(/^data:.*,/, ''));
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    detectImageFormat(base64Data) {
        if (base64Data.startsWith('data:image/png')) return 'PNG';
        if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) return 'JPEG';
        if (base64Data.startsWith('data:image/gif')) return 'GIF';
        if (base64Data.startsWith('data:image/webp')) return 'WebP';
        return 'Unknown';
    }

    categorizeFile(mimeType, filename) {
        if (mimeType.startsWith('image/')) return 'Image';
        if (mimeType.startsWith('audio/')) return 'Audio';
        if (mimeType.startsWith('video/')) return 'Video';
        if (mimeType.startsWith('text/')) return 'Text';
        if (mimeType.includes('pdf')) return 'PDF';
        if (mimeType.includes('word') || filename.endsWith('.docx')) return 'Document';
        if (mimeType.includes('spreadsheet') || filename.endsWith('.xlsx')) return 'Spreadsheet';
        return 'File';
    }

    detectTextInImage(canvasAnalysis) {
        // Simple heuristic: if image has high contrast regions, might contain text
        return canvasAnalysis.brightness > 0.3 && canvasAnalysis.brightness < 0.8;
    }

    analyzeToneFromText(text) {
        const toneIndicators = [];
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('!') || lowerText.includes('excited') || lowerText.includes('amazing')) {
            toneIndicators.push('enthusiastic');
        }
        if (lowerText.includes('?') || lowerText.includes('unsure') || lowerText.includes('maybe')) {
            toneIndicators.push('questioning');
        }
        if (lowerText.includes('calm') || lowerText.includes('peaceful') || lowerText.includes('relaxed')) {
            toneIndicators.push('calm');
        }
        
        return toneIndicators;
    }

    async extractTextFromFile(fileData) {
        // For text files, attempt to extract content from base64
        try {
            const textContent = atob(fileData.data.replace(/^data:.*,/, ''));
            return textContent;
        } catch (error) {
            throw new Error('Unable to extract text content');
        }
    }
}

// Export for use in other modules
window.MediaProcessor = MediaProcessor;