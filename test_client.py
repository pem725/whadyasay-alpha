#!/usr/bin/env python3
"""
Simple MCP Client for testing the Conversation Coach server
"""

import asyncio
import json
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_mcp_server():
    """Test the MCP server with real MCP protocol"""
    
    print("🔌 Testing MCP Server with Real Protocol")
    print("=" * 45)
    
    # Server parameters
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server.py"],
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                
                # Initialize the session
                await session.initialize()
                print("✅ MCP session initialized")
                
                # List available tools
                tools = await session.list_tools()
                print(f"✅ Available tools: {[tool.name for tool in tools.tools]}")
                
                # Test 1: Store a memory
                print("\n1. Testing store_memory tool...")
                memory_args = {
                    "title": "MCP Test Memory",
                    "content": "Testing the MCP server with a sample memory about communication",
                    "tags": ["test", "mcp", "communication"],
                    "memory_type": "experience"
                }
                
                result = await session.call_tool("store_memory", memory_args)
                print(f"✅ Memory stored: {result.content[0].text}")
                
                # Test 2: Get conversation advice
                print("\n2. Testing get_conversation_advice tool...")
                advice_args = {
                    "situation": "I need to have a difficult conversation with my teammate about their code quality",
                    "context": "work",
                    "relationship": "colleague"
                }
                
                advice_result = await session.call_tool("get_conversation_advice", advice_args)
                advice_data = json.loads(advice_result.content[0].text)
                print(f"✅ Advice received for situation type: {advice_data['situation_analysis']['type']}")
                print(f"   Strategy: {advice_data['strategy']}")
                
                # Test 3: Search memories
                print("\n3. Testing search_memories tool...")
                search_args = {
                    "query": "communication",
                    "limit": 5
                }
                
                search_result = await session.call_tool("search_memories", search_args)
                memories = json.loads(search_result.content[0].text)
                print(f"✅ Found {len(memories)} memories matching 'communication'")
                
                # Test 4: List resources
                print("\n4. Testing resource listing...")
                resources = await session.list_resources()
                print(f"✅ Available resources: {[r.name for r in resources.resources]}")
                
                # Test 5: Read a resource
                print("\n5. Testing resource reading...")
                memory_resource = await session.read_resource("memory://personal-memories")
                print(f"✅ Read personal memories resource (length: {len(memory_resource.contents[0].text)} chars)")
                
                print("\n🎉 All MCP protocol tests passed!")
                
    except Exception as e:
        print(f"❌ MCP test failed: {e}")
        print("Make sure the MCP server is properly configured and dependencies are installed")

async def interactive_test():
    """Interactive testing mode"""
    print("\n🎮 Interactive MCP Testing Mode")
    print("=" * 35)
    print("Commands:")
    print("  1 - Store a memory")
    print("  2 - Get conversation advice") 
    print("  3 - Search memories")
    print("  4 - List resources")
    print("  q - Quit")
    
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server.py"],
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("✅ Connected to MCP server")
                
                while True:
                    command = input("\nEnter command (1-4, q): ").strip()
                    
                    if command == 'q':
                        break
                    elif command == '1':
                        await interactive_store_memory(session)
                    elif command == '2':
                        await interactive_get_advice(session)
                    elif command == '3':
                        await interactive_search(session)
                    elif command == '4':
                        await interactive_list_resources(session)
                    else:
                        print("Invalid command")
                        
    except Exception as e:
        print(f"❌ Interactive test failed: {e}")

async def interactive_store_memory(session):
    """Interactive memory storage"""
    print("\n📝 Store Memory")
    title = input("Title: ")
    content = input("Content: ")
    tags = input("Tags (comma-separated): ").split(',')
    tags = [tag.strip() for tag in tags if tag.strip()]
    
    args = {
        "title": title,
        "content": content,
        "tags": tags,
        "memory_type": "experience"
    }
    
    result = await session.call_tool("store_memory", args)
    print(f"✅ {result.content[0].text}")

async def interactive_get_advice(session):
    """Interactive advice generation"""
    print("\n💡 Get Conversation Advice")
    situation = input("Describe your situation: ")
    context = input("Context (work/family/friends/general): ") or "general"
    
    args = {
        "situation": situation,
        "context": context
    }
    
    result = await session.call_tool("get_conversation_advice", args)
    advice = json.loads(result.content[0].text)
    
    print(f"\n🎯 Advice for {advice['situation_analysis']['type']} situation:")
    print(f"Strategy: {advice['strategy']}")
    print(f"Key Points: {', '.join(advice['key_points'][:3])}")

async def interactive_search(session):
    """Interactive memory search"""
    print("\n🔍 Search Memories")
    query = input("Search query: ")
    
    args = {"query": query, "limit": 5}
    result = await session.call_tool("search_memories", args)
    memories = json.loads(result.content[0].text)
    
    print(f"\n📚 Found {len(memories)} memories:")
    for memory in memories:
        print(f"  • {memory.get('title', 'Untitled')}: {memory.get('content', '')[:50]}...")

async def interactive_list_resources(session):
    """Interactive resource listing"""
    resources = await session.list_resources()
    print(f"\n📋 Available Resources:")
    for resource in resources.resources:
        print(f"  • {resource.name}: {resource.description}")

def main():
    """Main test runner"""
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        asyncio.run(interactive_test())
    else:
        asyncio.run(test_mcp_server())

if __name__ == "__main__":
    main()