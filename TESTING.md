# Testing What Do You Say? PWA Alpha 🧪

## Quick Start Testing (Local)

### 1. **Start the PWA**
```bash
# Option 1: Simple HTTP server (Python 3)
python3 -m http.server 8000

# Option 2: Simple HTTP server (Python 2)
python -m SimpleHTTPServer 8000

# Option 3: Node.js http-server (if you have Node.js)
npx http-server -p 8000

# Option 4: PHP server (if you have PHP)
php -S localhost:8000
```

### 2. **Open in Browser**
- Navigate to: `http://localhost:8000`
- **Mobile Testing**: Use your phone's browser with your computer's IP
- **Desktop Testing**: Use Chrome/Edge for best PWA support

### 3. **Test PWA Installation**
- **Desktop**: Look for install icon in address bar
- **Mobile**: Tap "Add to Home Screen" when prompted
- **Manual**: Browser menu → "Install app" or "Add to Home Screen"

## Alpha Testing Flow

### **Step 1: Authentication Setup**
1. Open the app → redirects to authentication
2. Click "🆕 First Time Setup"
3. Enter a strong password (8+ characters)
4. App creates encryption keys locally
5. Redirects to main interface

### **Step 2: Test Conversation Coach**
1. Click the microphone OR type a situation:
   - "I need to ask my boss for a raise"
   - "My partner and I disagree about vacation plans"
   - "I want to apologize to my friend for being late"

2. Click "✨ Get Advice"
3. Review the personalized advice
4. Test "💾 Save This Advice" button

### **Step 3: Test Memory Capture**
1. Click "🧠 Memories" tab
2. Add a memory with:
   - Text description
   - Voice recording (if supported)
   - Photo (optional)
   - Tags for organization

3. Click "💾 Save Memory"
4. Verify it's stored locally

### **Step 4: Test Offline Functionality**
1. **Turn off WiFi/cellular**
2. App should show "📱 Offline Mode"
3. **Test conversation advice** - should still work
4. **Test memory storage** - should save locally
5. **Turn internet back on** - should sync automatically

### **Step 5: Test PWA Features**
1. **Install as app** (if not already done)
2. **Open from home screen** - should launch like native app
3. **Test in airplane mode** - should work completely offline
4. **Test voice input** - browser should ask for microphone permission
5. **Test camera** - should be able to capture photos

## What to Test & Report

### ✅ **Core Functionality**
- [ ] Authentication setup and login
- [ ] Conversation advice generation
- [ ] Memory capture (text, voice, photo)
- [ ] Offline functionality
- [ ] PWA installation
- [ ] Data persistence between sessions

### ✅ **Security Testing**
- [ ] Password protection works
- [ ] Data is encrypted (can't read raw storage)
- [ ] Logout clears sensitive data
- [ ] Wrong password is rejected

### ✅ **Mobile Experience**
- [ ] Responsive design on different screen sizes
- [ ] Touch interactions work smoothly
- [ ] Voice input functions
- [ ] Camera capture works
- [ ] Installs as PWA on home screen

### ✅ **Edge Cases**
- [ ] Very long conversation descriptions
- [ ] Special characters in passwords
- [ ] Network disconnection during use
- [ ] Browser refresh maintains state
- [ ] Multiple browser tabs

## Known Alpha Limitations

⚠️ **Expected Issues:**
- No server integration yet (fully offline)
- Basic AI advice (will improve with usage data)
- Limited conversation history features
- No sync between devices
- Icons may show as placeholders

## Reporting Issues

### **For Each Bug, Please Include:**
1. **Device/Browser**: "iPhone 14, Safari" or "Windows 11, Chrome"
2. **Steps to reproduce**: Exact sequence of actions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happened
5. **Screenshot/video**: If possible

### **Example Bug Report:**
```
Device: Samsung Galaxy S21, Chrome
Steps: 1. Open app, 2. Click microphone, 3. Speak for 30 seconds
Expected: Voice input should be processed
Actual: Microphone cuts off after 10 seconds
Screenshot: [attached]
```

## Advanced Testing

### **Developer Testing**
```bash
# Open browser developer tools (F12)
# Check these tabs:

# 1. Application tab
- Service Workers → should show "activated"
- Storage → IndexedDB → should show encrypted data
- Manifest → should show PWA config

# 2. Network tab
- Test offline mode
- Verify caching works

# 3. Console tab
- Look for error messages
- Check PWA initialization logs
```

### **Security Testing**
```bash
# Browser Developer Tools → Application → Storage
# Check localStorage and IndexedDB
# Data should be encrypted (unreadable)
```

## Sharing the Alpha

### **Option 1: GitHub Pages (Recommended)**
1. Create GitHub repository
2. Upload all files
3. Enable GitHub Pages
4. Share the URL: `https://yourusername.github.io/whaddyasay`

### **Option 2: Netlify Drop**
1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag and drop your project folder
3. Get instant shareable URL

### **Option 3: Local Network**
```bash
# Start server with your IP address
python3 -m http.server 8000

# Share this URL with testers on same network:
# http://YOUR_IP_ADDRESS:8000
# (Find IP with: ipconfig on Windows, ifconfig on Mac/Linux)
```

## Test Scenarios

### **Scenario 1: Professional Conversation**
- **Input**: "I need to ask my manager for a promotion after working here for 2 years"
- **Expected**: Professional advice with specific talking points
- **Test**: Save advice, then ask similar question to see if it learns

### **Scenario 2: Personal Relationship**
- **Input**: "My partner gets upset when I work late, how do I discuss this?"
- **Expected**: Relationship-focused advice with empathy strategies
- **Test**: Add related memory, then ask follow-up question

### **Scenario 3: Apology Situation**
- **Input**: "I accidentally missed my friend's birthday party, how do I apologize?"
- **Expected**: Apology-specific advice with action steps
- **Test**: Verify it doesn't suggest making excuses

### **Scenario 4: Offline Usage**
- **Setup**: Turn off internet after initial setup
- **Test**: All features should work without network
- **Expected**: Offline indicator shows, but full functionality remains

## Success Metrics

### **Alpha is successful if:**
- ✅ Installs as PWA on mobile devices
- ✅ Works completely offline after initial setup
- ✅ Provides useful conversation advice
- ✅ Stores memories securely with encryption
- ✅ Interface is intuitive and responsive
- ✅ No major crashes or data loss

## Next Steps After Alpha

Based on testing feedback, we'll prioritize:
1. **Server integration** for backup and sync
2. **AI improvements** based on usage patterns
3. **UI/UX refinements** from user feedback
4. **Additional features** requested by testers
5. **Performance optimizations**

---

**Happy Testing! 🚀**

*Your feedback is invaluable for making this the best conversation coach app possible.*