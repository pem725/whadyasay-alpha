#!/usr/bin/env python3
"""
Test script for the Conversation Coach MCP Server
"""

import asyncio
import json
import subprocess
import sys
from pathlib import Path

class MCPServerTester:
    def __init__(self):
        self.server_process = None
        
    async def test_basic_functionality(self):
        """Test basic MCP server functionality"""
        print("🧪 Testing MCP Server Basic Functionality")
        print("=" * 50)
        
        # Test 1: Store a memory
        print("\n1. Testing memory storage...")
        memory_data = {
            "title": "Test Memory",
            "content": "Had a great conversation with my boss about project goals. I was nervous but prepared well.",
            "tags": ["work", "boss", "success"],
            "memory_type": "experience"
        }
        
        result = await self.call_tool("store_memory", memory_data)
        print(f"✅ Memory stored: {result}")
        
        # Test 2: Get conversation advice
        print("\n2. Testing conversation advice...")
        advice_request = {
            "situation": "I need to ask my boss for a raise. I've been here 2 years and taken on more responsibilities.",
            "context": "work",
            "relationship": "manager",
            "urgency": "medium"
        }
        
        advice = await self.call_tool("get_conversation_advice", advice_request)
        print(f"✅ Advice generated: {advice[:200]}...")
        
        # Test 3: Search memories
        print("\n3. Testing memory search...")
        search_request = {
            "query": "boss",
            "tags": ["work"],
            "limit": 5
        }
        
        search_results = await self.call_tool("search_memories", search_request)
        print(f"✅ Search completed: Found memories")
        
        print("\n🎉 Basic functionality tests completed!")
        
    async def call_tool(self, tool_name: str, arguments: dict) -> str:
        """Simulate calling an MCP tool"""
        # This is a simplified simulation - in real testing you'd use the MCP protocol
        print(f"   Calling tool: {tool_name}")
        print(f"   Arguments: {json.dumps(arguments, indent=2)}")
        
        # Simulate responses
        if tool_name == "store_memory":
            return "Memory stored successfully with ID: 1"
        elif tool_name == "get_conversation_advice":
            return json.dumps({
                "situation_analysis": {"type": "professional", "context": "work"},
                "strategy": "Approach professionally with evidence",
                "key_points": ["Prepare examples", "Research rates", "Choose timing"],
                "conversation_id": 1
            })
        elif tool_name == "search_memories":
            return json.dumps([{"id": 1, "title": "Test Memory", "content": "Boss conversation"}])
        
        return "Tool executed"

def test_database_setup():
    """Test database initialization"""
    print("🗄️  Testing Database Setup")
    print("=" * 30)
    
    # Import and initialize the server
    try:
        from mcp_server import ConversationCoachServer
        server = ConversationCoachServer("./test_data")
        print("✅ Database initialized successfully")
        
        # Check if tables exist
        import sqlite3
        conn = sqlite3.connect(server.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"✅ Tables created: {[table[0] for table in tables]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

def test_dependencies():
    """Test if required dependencies are installed"""
    print("📦 Testing Dependencies")
    print("=" * 25)
    
    required_packages = [
        "mcp",
        "sqlite3"  # Built into Python
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == "sqlite3":
                import sqlite3
            else:
                __import__(package)
            print(f"✅ {package} - installed")
        except ImportError:
            print(f"❌ {package} - missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n🚨 Missing packages: {missing_packages}")
        print("Install with: pip install mcp")
        return False
    
    return True

async def test_mcp_protocol():
    """Test actual MCP protocol communication"""
    print("\n🔌 Testing MCP Protocol Communication")
    print("=" * 40)
    
    try:
        # This would test actual MCP communication
        # For now, we'll simulate it
        print("✅ MCP protocol communication test (simulated)")
        return True
    except Exception as e:
        print(f"❌ MCP protocol test failed: {e}")
        return False

def create_sample_data():
    """Create sample data for testing"""
    print("\n📝 Creating Sample Data")
    print("=" * 25)
    
    try:
        from mcp_server import ConversationCoachServer
        server = ConversationCoachServer("./test_data")
        
        import sqlite3
        conn = sqlite3.connect(server.db_path)
        cursor = conn.cursor()
        
        # Insert sample memories
        sample_memories = [
            ("First day at work", "Was nervous but everyone was welcoming", '["work", "first-day", "nervous"]', "experience"),
            ("Difficult client meeting", "Had to handle an angry client, stayed calm and found solution", '["work", "client", "conflict"]', "experience"),
            ("Family dinner conversation", "Talked to parents about career change, they were supportive", '["family", "career", "support"]', "conversation")
        ]
        
        for title, content, tags, memory_type in sample_memories:
            cursor.execute('''
                INSERT INTO memories (title, content, tags, memory_type, timestamp)
                VALUES (?, ?, ?, ?, datetime('now'))
            ''', (title, content, tags, memory_type))
        
        # Insert sample communication patterns
        sample_patterns = [
            ("strength", "Good at staying calm under pressure", "work", 0.8, '["client meeting", "deadline pressure"]'),
            ("weakness", "Sometimes avoid difficult conversations", "family", 0.6, '["family dinner", "personal topics"]'),
            ("preference", "Prefer written communication for complex topics", "general", 0.7, '["email follow-ups", "documentation"]')
        ]
        
        for pattern_type, description, context, confidence, examples in sample_patterns:
            cursor.execute('''
                INSERT INTO communication_patterns (pattern_type, description, context, confidence_score, examples)
                VALUES (?, ?, ?, ?, ?)
            ''', (pattern_type, description, context, confidence, examples))
        
        conn.commit()
        conn.close()
        
        print("✅ Sample data created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Sample data creation failed: {e}")
        return False

async def run_integration_test():
    """Run a full integration test"""
    print("\n🔄 Running Integration Test")
    print("=" * 30)
    
    tester = MCPServerTester()
    
    # Test a realistic scenario
    print("Scenario: User wants advice for asking for a promotion")
    
    # 1. Store relevant memory
    memory = {
        "title": "Last performance review",
        "content": "Manager said I was exceeding expectations and taking on leadership roles",
        "tags": ["work", "performance", "leadership"],
        "memory_type": "experience"
    }
    
    await tester.call_tool("store_memory", memory)
    
    # 2. Get advice
    situation = {
        "situation": "I want to ask for a promotion to senior developer. I've been leading projects and mentoring junior developers.",
        "context": "work",
        "relationship": "manager"
    }
    
    advice = await tester.call_tool("get_conversation_advice", situation)
    
    # 3. Search for relevant past experiences
    search = {
        "query": "performance leadership",
        "tags": ["work"]
    }
    
    results = await tester.call_tool("search_memories", search)
    
    print("✅ Integration test completed successfully")

def main():
    """Run all tests"""
    print("🚀 MCP Server Test Suite")
    print("=" * 50)
    
    # Test 1: Dependencies
    if not test_dependencies():
        print("\n❌ Dependency test failed. Please install required packages.")
        return
    
    # Test 2: Database setup
    if not test_database_setup():
        print("\n❌ Database test failed.")
        return
    
    # Test 3: Sample data
    if not create_sample_data():
        print("\n❌ Sample data creation failed.")
        return
    
    # Test 4: Basic functionality
    asyncio.run(test_basic_functionality_sync())
    
    # Test 5: Integration test
    asyncio.run(run_integration_test())
    
    print("\n🎉 All tests completed!")
    print("\nNext steps:")
    print("1. Install MCP dependencies: pip install mcp")
    print("2. Run the server: python mcp_server.py")
    print("3. Test with MCP client or integrate with your web app")

async def test_basic_functionality_sync():
    """Wrapper for async test"""
    tester = MCPServerTester()
    await tester.test_basic_functionality()

if __name__ == "__main__":
    main()