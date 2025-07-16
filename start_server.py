#!/usr/bin/env python3
"""
Startup script for the What Do You Say? conversation coach system
Starts both the MCP server and web bridge
"""

import subprocess
import sys
import time
import os
import signal
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = ['mcp', 'flask', 'flask_cors']
    missing = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - missing")
            missing.append(package)
    
    if missing:
        print(f"\n🚨 Missing packages: {missing}")
        print("Install with: pip install -r requirements.txt")
        return False
    
    print("✅ All dependencies installed")
    return True

def setup_directories():
    """Create necessary directories"""
    print("📁 Setting up directories...")
    
    directories = ['data', 'uploads', 'logs']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ {directory}/")

def start_system():
    """Start the integrated system"""
    if not check_dependencies():
        return False
    
    setup_directories()
    
    print("\n🚀 Starting What Do You Say? System")
    print("=" * 50)
    
    try:
        # Start the web bridge (which will start the MCP server internally)
        print("🌐 Starting web server and MCP bridge...")
        print("   Web interface: http://localhost:5000")
        print("   API endpoints: http://localhost:5000/api/")
        print("\n💡 Tips:")
        print("   - Open http://localhost:5000 in your browser")
        print("   - Try asking for conversation advice")
        print("   - Capture memories to personalize future advice")
        print("   - Press Ctrl+C to stop the server")
        print("\n" + "=" * 50)
        
        # Run the bridge server
        subprocess.run(['python3', 'mcp_bridge.py'], check=True)
        
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def main():
    """Main entry point"""
    print("💬 What Do You Say? - Personal Conversation Coach")
    print("=" * 55)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--help' or sys.argv[1] == '-h':
            print_help()
            return
        elif sys.argv[1] == '--test':
            run_tests()
            return
        elif sys.argv[1] == '--setup':
            setup_only()
            return
    
    success = start_system()
    sys.exit(0 if success else 1)

def print_help():
    """Print help information"""
    print("""
Usage: python start_server.py [options]

Options:
  --help, -h    Show this help message
  --test        Run system tests before starting
  --setup       Just setup directories and check dependencies

Examples:
  python start_server.py           # Start the system
  python start_server.py --test    # Test then start
  python start_server.py --setup   # Setup only

The system includes:
  - MCP Server: Stores memories and provides conversation advice
  - Web Bridge: HTTP API for the web interface
  - Web Interface: Mobile-friendly conversation coach UI

Once started, open http://localhost:5000 in your browser.
""")

def run_tests():
    """Run tests before starting"""
    print("🧪 Running system tests...")
    
    try:
        # Run basic tests
        result = subprocess.run([sys.executable, 'test_mcp_server.py'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Tests passed!")
            print("\nStarting system...")
            start_system()
        else:
            print("❌ Tests failed!")
            print(result.stdout)
            print(result.stderr)
            
    except FileNotFoundError:
        print("❌ Test file not found. Run: python test_mcp_server.py")

def setup_only():
    """Just setup without starting"""
    print("🔧 Setup mode")
    
    if check_dependencies():
        setup_directories()
        print("\n✅ Setup complete!")
        print("Run 'python start_server.py' to start the system")
    else:
        print("\n❌ Setup incomplete - install missing dependencies")

if __name__ == "__main__":
    main()