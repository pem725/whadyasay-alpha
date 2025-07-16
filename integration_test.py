#!/usr/bin/env python3
"""
Integration test for the complete What Do You Say? system
Tests the web interface, MCP bridge, and MCP server working together
"""

import asyncio
import requests
import time
import subprocess
import sys
import threading
from pathlib import Path

class IntegrationTester:
    def __init__(self):
        self.server_process = None
        self.base_url = "http://localhost:5000"
        
    def start_server(self):
        """Start the server in background"""
        print("🚀 Starting server...")
        self.server_process = subprocess.Popen(
            [sys.executable, 'mcp_bridge.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get(f"{self.base_url}/api/health", timeout=1)
                if response.status_code == 200:
                    print("✅ Server started successfully")
                    return True
            except:
                time.sleep(1)
        
        print("❌ Server failed to start")
        return False
    
    def stop_server(self):
        """Stop the server"""
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()
            print("🛑 Server stopped")
    
    def test_health_check(self):
        """Test server health"""
        print("\n🏥 Testing server health...")
        try:
            response = requests.get(f"{self.base_url}/api/health")
            data = response.json()
            
            assert response.status_code == 200
            assert data['status'] == 'healthy'
            print(f"✅ Server healthy, MCP connected: {data['mcp_connected']}")
            return True
            
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
    
    def test_memory_storage(self):
        """Test storing a memory"""
        print("\n💾 Testing memory storage...")
        try:
            memory_data = {
                "title": "Integration Test Memory",
                "text": "This is a test memory for integration testing",
                "tags": ["test", "integration", "memory"],
                "memory_type": "experience"
            }
            
            response = requests.post(
                f"{self.base_url}/api/memory/store",
                json=memory_data,
                timeout=10
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            
            print("✅ Memory stored successfully")
            return True
            
        except Exception as e:
            print(f"❌ Memory storage failed: {e}")
            return False
    
    def test_conversation_advice(self):
        """Test getting conversation advice"""
        print("\n💡 Testing conversation advice...")
        try:
            advice_request = {
                "situation": "I need to ask my manager for feedback on my recent project performance",
                "context": "work",
                "relationship": "manager",
                "urgency": "medium"
            }
            
            response = requests.post(
                f"{self.base_url}/api/conversation/advice",
                json=advice_request,
                timeout=15
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            assert 'advice' in data
            
            advice = data['advice']
            print(f"✅ Advice received for {advice['situation_analysis']['type']} situation")
            print(f"   Strategy: {advice['strategy'][:50]}...")
            
            return True
            
        except Exception as e:
            print(f"❌ Conversation advice failed: {e}")
            return False
    
    def test_memory_search(self):
        """Test searching memories"""
        print("\n🔍 Testing memory search...")
        try:
            search_request = {
                "query": "test",
                "limit": 5
            }
            
            response = requests.post(
                f"{self.base_url}/api/memory/search",
                json=search_request,
                timeout=10
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] == True
            
            memories = data['memories']
            print(f"✅ Found {len(memories)} memories matching 'test'")
            
            return True
            
        except Exception as e:
            print(f"❌ Memory search failed: {e}")
            return False
    
    def test_web_interface(self):
        """Test web interface accessibility"""
        print("\n🌐 Testing web interface...")
        try:
            # Test main page
            response = requests.get(f"{self.base_url}/")
            assert response.status_code == 200
            assert "What Do You Say?" in response.text
            
            # Test memory page
            response = requests.get(f"{self.base_url}/memory.html")
            assert response.status_code == 200
            assert "Memory Capture" in response.text
            
            # Test static files
            response = requests.get(f"{self.base_url}/coach-styles.css")
            assert response.status_code == 200
            
            response = requests.get(f"{self.base_url}/coach-script.js")
            assert response.status_code == 200
            
            print("✅ Web interface accessible")
            return True
            
        except Exception as e:
            print(f"❌ Web interface test failed: {e}")
            return False
    
    def test_full_workflow(self):
        """Test a complete user workflow"""
        print("\n🔄 Testing complete workflow...")
        try:
            # 1. Store a relevant memory
            memory_data = {
                "title": "Successful team meeting",
                "text": "Led a productive team meeting where we resolved conflicts and aligned on goals",
                "tags": ["work", "leadership", "team", "success"],
                "memory_type": "experience"
            }
            
            response = requests.post(f"{self.base_url}/api/memory/store", json=memory_data)
            assert response.status_code == 200
            
            # 2. Get advice for a related situation
            advice_request = {
                "situation": "I need to lead a difficult team meeting about project delays",
                "context": "work",
                "relationship": "team"
            }
            
            response = requests.post(f"{self.base_url}/api/conversation/advice", json=advice_request)
            assert response.status_code == 200
            
            advice_data = response.json()
            advice = advice_data['advice']
            
            # 3. Verify advice includes personal insights
            has_personal_insights = 'personal_insights' in advice and len(advice['personal_insights']) > 0
            
            print("✅ Complete workflow successful")
            print(f"   Personal insights included: {has_personal_insights}")
            
            return True
            
        except Exception as e:
            print(f"❌ Full workflow test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🧪 Running Integration Tests")
        print("=" * 50)
        
        if not self.start_server():
            return False
        
        try:
            tests = [
                self.test_health_check,
                self.test_memory_storage,
                self.test_conversation_advice,
                self.test_memory_search,
                self.test_web_interface,
                self.test_full_workflow
            ]
            
            passed = 0
            failed = 0
            
            for test in tests:
                try:
                    if test():
                        passed += 1
                    else:
                        failed += 1
                except Exception as e:
                    print(f"❌ Test {test.__name__} crashed: {e}")
                    failed += 1
            
            print(f"\n📊 Test Results:")
            print(f"   ✅ Passed: {passed}")
            print(f"   ❌ Failed: {failed}")
            print(f"   📈 Success Rate: {passed/(passed+failed)*100:.1f}%")
            
            if failed == 0:
                print("\n🎉 All integration tests passed!")
                print("Your What Do You Say? system is ready to use!")
                print(f"Open {self.base_url} in your browser to start.")
                return True
            else:
                print(f"\n⚠️  {failed} tests failed. Check the errors above.")
                return False
                
        finally:
            self.stop_server()

def main():
    """Main test runner"""
    print("🔗 What Do You Say? Integration Test Suite")
    print("=" * 55)
    
    # Check if required files exist
    required_files = [
        'mcp_server.py',
        'mcp_bridge.py', 
        'index.html',
        'memory.html',
        'coach-script.js',
        'script.js'
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing required files: {missing_files}")
        print("Make sure all files are in the current directory.")
        return False
    
    # Run tests
    tester = IntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🚀 Next Steps:")
        print("1. Run: python start_server.py")
        print("2. Open: http://localhost:5000")
        print("3. Try asking for conversation advice")
        print("4. Capture some memories to personalize future advice")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)