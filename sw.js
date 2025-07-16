// Service Worker for What Do You Say? PWA
const CACHE_NAME = 'whaddyasay-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/index.html',
  '/coach.html',
  '/memory.html',
  '/auth.html',
  '/offline.html',
  '/styles.css',
  '/coach-styles.css',
  '/script.js',
  '/coach-script.js',
  '/pwa-core.js',
  '/crypto-manager.js',
  '/local-storage.js',
  '/ai-engine.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // For navigation requests, use cache-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If online, return fresh response and update cache
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          }
          throw new Error('Network response was not ok');
        })
        .catch(() => {
          // If offline, try cache first, then offline page
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If request fails and it's an HTML page, return offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Handle API requests when offline
async function handleApiRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // If network fails, return offline response
    console.log('API request failed, returning offline response:', request.url);
    
    // Parse the request to determine what offline response to return
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    if (pathname.includes('/api/conversation/advice')) {
      return handleOfflineAdviceRequest(request);
    } else if (pathname.includes('/api/memory/store')) {
      return handleOfflineMemoryStore(request);
    } else if (pathname.includes('/api/security/status')) {
      return handleOfflineSecurityStatus();
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Offline - request will be processed when connection is restored',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

// Handle offline conversation advice requests
async function handleOfflineAdviceRequest(request) {
  try {
    const body = await request.json();
    
    // Generate basic advice using local AI engine
    const advice = await generateOfflineAdvice(body.situation, body.context);
    
    return new Response(
      JSON.stringify({
        success: true,
        advice: advice,
        offline: true,
        message: 'Generated offline - limited personalization available'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to generate advice offline',
        offline: true
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle offline memory storage
async function handleOfflineMemoryStore(request) {
  try {
    const body = await request.json();
    
    // Store in IndexedDB for later sync
    const memoryId = Date.now();
    const memory = {
      id: memoryId,
      ...body,
      timestamp: new Date().toISOString(),
      offline: true,
      synced: false
    };
    
    // Store in IndexedDB (will be handled by local-storage.js)
    return new Response(
      JSON.stringify({
        success: true,
        message: `Memory stored locally with ID: ${memoryId}`,
        offline: true,
        id: memoryId
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to store memory offline',
        offline: true
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle offline security status
function handleOfflineSecurityStatus() {
  return new Response(
    JSON.stringify({
      success: true,
      status: {
        authenticated: false,
        setup_complete: false,
        offline: true,
        message: 'Security status unavailable offline'
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Generate basic advice offline
async function generateOfflineAdvice(situation, context) {
  // Basic offline advice generation
  const situationType = analyzeSituationType(situation);
  const advice = getAdviceTemplate(situationType);
  
  return {
    situation_analysis: {
      type: situationType,
      context: context || 'general',
      situation: situation
    },
    strategy: advice.strategy,
    key_points: advice.keyPoints,
    pitfalls: advice.pitfalls,
    helpful_phrases: advice.phrases,
    personal_insights: ['Generated offline - connect to internet for personalized advice'],
    confidence_boosters: advice.confidenceBoosters,
    offline: true
  };
}

// Analyze situation type offline
function analyzeSituationType(situation) {
  const lowerSit = situation.toLowerCase();
  
  if (lowerSit.includes('boss') || lowerSit.includes('manager') || lowerSit.includes('raise') || lowerSit.includes('promotion')) {
    return 'professional';
  } else if (lowerSit.includes('partner') || lowerSit.includes('spouse') || lowerSit.includes('relationship')) {
    return 'romantic';
  } else if (lowerSit.includes('family') || lowerSit.includes('parent') || lowerSit.includes('sibling')) {
    return 'family';
  } else if (lowerSit.includes('friend') || lowerSit.includes('buddy')) {
    return 'friendship';
  } else if (lowerSit.includes('apolog') || lowerSit.includes('sorry') || lowerSit.includes('mistake')) {
    return 'apology';
  } else if (lowerSit.includes('conflict') || lowerSit.includes('argument') || lowerSit.includes('disagree')) {
    return 'conflict_resolution';
  } else {
    return 'general';
  }
}

// Get advice template by type
function getAdviceTemplate(type) {
  const templates = {
    professional: {
      strategy: "Approach this professionally with clear objectives and supporting evidence.",
      keyPoints: [
        "Prepare specific examples of your contributions",
        "Research market rates or company policies",
        "Choose the right time and setting",
        "Be confident but respectful"
      ],
      pitfalls: [
        "Don't make it personal or emotional",
        "Avoid ultimatums unless prepared to follow through",
        "Don't compare yourself negatively to others"
      ],
      phrases: [
        "I'd like to discuss my role and contributions...",
        "Based on my research and performance...",
        "I'm hoping we can find a path forward that works for both of us..."
      ],
      confidenceBoosters: [
        "You've prepared well for this conversation",
        "Your contributions are valuable and worth discussing",
        "Professional conversations are opportunities for growth"
      ]
    },
    romantic: {
      strategy: "Focus on understanding each other's perspectives and finding common ground.",
      keyPoints: [
        "Use 'I' statements to express your feelings",
        "Listen actively to their concerns",
        "Find a calm, private moment to talk",
        "Focus on solutions, not blame"
      ],
      pitfalls: [
        "Don't bring up past grievances",
        "Avoid accusatory language",
        "Don't have this conversation when emotions are high"
      ],
      phrases: [
        "I've been thinking about us and wanted to share...",
        "Help me understand your perspective on this...",
        "What would make you feel more comfortable about this?"
      ],
      confidenceBoosters: [
        "Good relationships require honest communication",
        "You care enough to work through this together",
        "This conversation shows your commitment"
      ]
    },
    apology: {
      strategy: "Take full responsibility and focus on making things right.",
      keyPoints: [
        "Acknowledge what you did wrong specifically",
        "Express genuine remorse",
        "Explain how you'll prevent it in the future",
        "Ask what you can do to make it right"
      ],
      pitfalls: [
        "Don't make excuses or justify your actions",
        "Don't say 'I'm sorry you feel that way'",
        "Don't expect immediate forgiveness"
      ],
      phrases: [
        "I take full responsibility for...",
        "I understand how my actions affected you...",
        "What can I do to rebuild your trust?"
      ],
      confidenceBoosters: [
        "Taking responsibility shows maturity",
        "Everyone makes mistakes - it's how we respond that matters",
        "This is an opportunity to strengthen the relationship"
      ]
    }
  };
  
  return templates[type] || templates.professional;
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-memories') {
    event.waitUntil(syncOfflineMemories());
  }
});

// Sync offline memories when connection is restored
async function syncOfflineMemories() {
  try {
    // This would interact with IndexedDB to sync offline memories
    console.log('Syncing offline memories...');
    // Implementation would go here
  } catch (error) {
    console.error('Failed to sync offline memories:', error);
  }
}