# Testing Your MCP Server 🧪

This guide shows you how to test your Conversation Coach MCP server at different levels.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Basic Tests
```bash
python test_mcp_server.py
```

### 3. Test with Real MCP Protocol
```bash
python test_client.py
```

### 4. Interactive Testing
```bash
python test_client.py --interactive
```

## Testing Levels

### Level 1: Unit Tests (Basic Functionality)
Tests individual components without MCP protocol:

```bash
python test_mcp_server.py
```

**What it tests:**
- Database initialization
- Sample data creation
- Basic tool functionality (simulated)
- Dependencies

**Expected output:**
```
🧪 Testing MCP Server Basic Functionality
✅ Memory stored: Memory stored successfully with ID: 1
✅ Advice generated: {"situation_analysis": {"type": "professional"...
✅ Search completed: Found memories
```

### Level 2: MCP Protocol Tests
Tests actual MCP communication:

```bash
python test_client.py
```

**What it tests:**
- Real MCP protocol communication
- Tool calling with proper MCP format
- Resource listing and reading
- Session management

**Expected output:**
```
🔌 Testing MCP Server with Real Protocol
✅ MCP session initialized
✅ Available tools: ['store_memory', 'get_conversation_advice', 'search_memories']
✅ Memory stored: Memory stored successfully with ID: 1
```

### Level 3: Interactive Testing
Manual testing with real scenarios:

```bash
python test_client.py --interactive
```

**What you can test:**
- Store personal memories
- Get conversation advice for real situations
- Search through your stored memories
- Explore available resources

## Testing Scenarios

### Scenario 1: Professional Conversation
```python
# Store relevant experience
{
    "title": "Last performance review",
    "content": "Manager praised my leadership on the Q3 project",
    "tags": ["work", "performance", "leadership"],
    "memory_type": "experience"
}

# Get advice for
{
    "situation": "I want to ask for a promotion to team lead",
    "context": "work",
    "relationship": "manager"
}
```

### Scenario 2: Personal Relationship
```python
# Store relevant memory
{
    "title": "Argument with partner",
    "content": "We resolved our disagreement by listening to each other's concerns",
    "tags": ["relationship", "conflict", "resolution"],
    "memory_type": "conversation"
}

# Get advice for
{
    "situation": "My partner and I disagree about our vacation plans",
    "context": "family",
    "relationship": "partner"
}
```

### Scenario 3: Apology Situation
```python
# Get advice for
{
    "situation": "I made a mistake at work that affected my team's deadline",
    "context": "work",
    "relationship": "team"
}
```

## Troubleshooting

### Common Issues

**1. Import Error: No module named 'mcp'**
```bash
pip install mcp
```

**2. Database Permission Error**
```bash
# Make sure you have write permissions in the current directory
chmod 755 .
```

**3. Server Won't Start**
```bash
# Check if Python path is correct
which python
python --version  # Should be 3.8+
```

**4. MCP Protocol Error**
```bash
# Make sure server script is executable
chmod +x mcp_server.py
```

### Debug Mode

Run with debug output:
```bash
python -u mcp_server.py 2>&1 | tee server.log
```

### Verify Database

Check what's in your database:
```python
import sqlite3
conn = sqlite3.connect('./data/conversation_coach.db')
cursor = conn.cursor()

# List all memories
cursor.execute("SELECT * FROM memories")
print(cursor.fetchall())

# List all conversations
cursor.execute("SELECT * FROM conversations") 
print(cursor.fetchall())

conn.close()
```

## Integration Testing

### Test with Web App

1. **Start the MCP server:**
```bash
python mcp_server.py
```

2. **Update your web app to call MCP endpoints:**
```javascript
// In coach-script.js, update the sendToMCPServer function
async sendToMCPServer(data) {
    const response = await fetch('/mcp/store_memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}
```

3. **Test the full flow:**
   - Open your web app
   - Enter a conversation situation
   - Verify advice is personalized
   - Store memories and see them influence future advice

## Performance Testing

### Load Testing
```python
import asyncio
import time

async def load_test():
    # Test multiple concurrent requests
    tasks = []
    for i in range(10):
        task = test_conversation_advice(f"Test situation {i}")
        tasks.append(task)
    
    start_time = time.time()
    results = await asyncio.gather(*tasks)
    end_time = time.time()
    
    print(f"Processed {len(results)} requests in {end_time - start_time:.2f} seconds")

asyncio.run(load_test())
```

### Memory Usage
```bash
# Monitor memory usage while running
ps aux | grep mcp_server.py
```

## Next Steps

Once your MCP server passes all tests:

1. **Deploy locally** for personal use
2. **Set up automatic backups** of your database
3. **Configure security** (authentication, encryption)
4. **Integrate with your web app**
5. **Add more sophisticated AI** for better advice

## Test Data Cleanup

To reset your test environment:
```bash
rm -rf ./data/
rm -rf ./test_data/
python test_mcp_server.py  # Recreates fresh test data
```

---

**Happy Testing! 🚀**

Your MCP server is the brain of your conversation coach - thorough testing ensures it gives you the best personalized advice.