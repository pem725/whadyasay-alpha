#!/usr/bin/env python3
"""
HTTP Bridge for MCP Server
Provides REST API endpoints for the web interface
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import asyncio
import json
import base64
import os
from pathlib import Path
import threading
import time
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

app = Flask(__name__)
CORS(app)  # Enable CORS for web app

class MCPBridge:
    def __init__(self):
        self.mcp_session = None
        self.server_params = StdioServerParameters(
            command="python3",
            args=["mcp_server.py"],
        )
        self.loop = None
        self.thread = None
        self.start_mcp_session()
    
    def start_mcp_session(self):
        """Start MCP session in background thread"""
        def run_session():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._maintain_session())
        
        self.thread = threading.Thread(target=run_session, daemon=True)
        self.thread.start()
        
        # Wait a moment for session to initialize
        time.sleep(2)
    
    async def _maintain_session(self):
        """Maintain persistent MCP session"""
        while True:
            try:
                async with stdio_client(self.server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        self.mcp_session = session
                        print("✅ MCP session established")
                        
                        # Keep session alive
                        while True:
                            await asyncio.sleep(1)
                            
            except Exception as e:
                print(f"❌ MCP session error: {e}")
                self.mcp_session = None
                await asyncio.sleep(5)  # Retry after 5 seconds
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Call MCP tool safely"""
        if not self.mcp_session:
            raise Exception("MCP session not available")
        
        result = await self.mcp_session.call_tool(tool_name, arguments)
        return result.content[0].text

# Global bridge instance
bridge = MCPBridge()

@app.route('/')
def serve_index():
    """Serve the main coach interface"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/api/conversation/advice', methods=['POST'])
def get_conversation_advice():
    """Get personalized conversation advice"""
    try:
        data = request.json
        situation = data.get('situation', '')
        context = data.get('context', 'general')
        relationship = data.get('relationship', '')
        urgency = data.get('urgency', 'medium')
        
        if not situation:
            return jsonify({'error': 'Situation is required'}), 400
        
        # Call MCP server asynchronously
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('get_conversation_advice', {
                'situation': situation,
                'context': context,
                'relationship': relationship,
                'urgency': urgency
            }),
            bridge.loop
        )
        
        result = future.result(timeout=30)  # 30 second timeout
        advice = json.loads(result)
        
        return jsonify({
            'success': True,
            'advice': advice
        })
        
    except Exception as e:
        print(f"Error getting advice: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/memory/store', methods=['POST'])
def store_memory():
    """Store a personal memory"""
    try:
        data = request.json
        
        # Handle file uploads (base64 encoded)
        audio_path = None
        photo_path = None
        
        if data.get('audio_data'):
            audio_path = save_base64_file(data['audio_data'], 'audio', '.wav')
        
        if data.get('photo_data'):
            photo_path = save_base64_file(data['photo_data'], 'photo', '.jpg')
        
        memory_data = {
            'title': data.get('title', ''),
            'content': data.get('text', ''),
            'tags': data.get('tags', []),
            'memory_type': data.get('memory_type', 'experience'),
            'audio_path': audio_path,
            'photo_path': photo_path
        }
        
        # Call MCP server
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('store_memory', memory_data),
            bridge.loop
        )
        
        result = future.result(timeout=10)
        
        return jsonify({
            'success': True,
            'message': result
        })
        
    except Exception as e:
        print(f"Error storing memory: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/memory/search', methods=['POST'])
def search_memories():
    """Search through stored memories"""
    try:
        data = request.json
        query = data.get('query', '')
        tags = data.get('tags', [])
        memory_type = data.get('memory_type')
        limit = data.get('limit', 10)
        
        search_args = {
            'query': query,
            'tags': tags,
            'limit': limit
        }
        
        if memory_type:
            search_args['memory_type'] = memory_type
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('search_memories', search_args),
            bridge.loop
        )
        
        result = future.result(timeout=10)
        memories = json.loads(result)
        
        return jsonify({
            'success': True,
            'memories': memories
        })
        
    except Exception as e:
        print(f"Error searching memories: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversation/outcome', methods=['POST'])
def record_outcome():
    """Record how a conversation went"""
    try:
        data = request.json
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('record_conversation_outcome', {
                'conversation_id': data.get('conversation_id'),
                'outcome': data.get('outcome'),
                'success_rating': data.get('success_rating'),
                'lessons_learned': data.get('lessons_learned', '')
            }),
            bridge.loop
        )
        
        result = future.result(timeout=10)
        
        return jsonify({
            'success': True,
            'message': result
        })
        
    except Exception as e:
        print(f"Error recording outcome: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/patterns/analyze', methods=['POST'])
def analyze_patterns():
    """Analyze communication patterns"""
    try:
        data = request.json
        context = data.get('context', 'all')
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('analyze_communication_patterns', {
                'context': context
            }),
            bridge.loop
        )
        
        result = future.result(timeout=15)
        
        return jsonify({
            'success': True,
            'patterns': json.loads(result) if result else []
        })
        
    except Exception as e:
        print(f"Error analyzing patterns: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/security/status', methods=['GET'])
def get_security_status():
    """Get security and authentication status"""
    try:
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('get_security_status', {}),
            bridge.loop
        )
        
        result = future.result(timeout=10)
        status = json.loads(result)
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/security/authenticate', methods=['POST'])
def authenticate_user():
    """Authenticate user with master password"""
    try:
        data = request.json
        master_password = data.get('master_password', '')
        
        if not master_password:
            return jsonify({
                'success': False,
                'message': 'Master password required'
            }), 400
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('authenticate_user', {
                'master_password': master_password,
                'setup_new': False
            }),
            bridge.loop
        )
        
        result = future.result(timeout=15)
        auth_result = json.loads(result)
        
        return jsonify({
            'success': True,
            'authenticated': auth_result.get('authenticated', False),
            'message': auth_result.get('message', ''),
            'security_status': auth_result.get('security_status', {})
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Authentication error: {str(e)}'
        }), 500

@app.route('/api/security/setup', methods=['POST'])
def setup_encryption():
    """First-time encryption setup"""
    try:
        data = request.json
        master_password = data.get('master_password', '')
        
        if not master_password:
            return jsonify({
                'success': False,
                'message': 'Master password required'
            }), 400
        
        if len(master_password) < 8:
            return jsonify({
                'success': False,
                'message': 'Master password must be at least 8 characters'
            }), 400
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('authenticate_user', {
                'master_password': master_password,
                'setup_new': True
            }),
            bridge.loop
        )
        
        result = future.result(timeout=20)
        setup_result = json.loads(result)
        
        return jsonify({
            'success': setup_result.get('authenticated', False),
            'message': setup_result.get('message', ''),
            'security_status': setup_result.get('security_status', {})
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Setup error: {str(e)}'
        }), 500

@app.route('/api/security/rotate', methods=['POST'])
def rotate_keys():
    """Rotate encryption keys"""
    try:
        data = request.json
        current_password = data.get('current_password', '')
        new_password = data.get('new_password')
        
        if not current_password:
            return jsonify({
                'success': False,
                'message': 'Current password required'
            }), 400
        
        future = asyncio.run_coroutine_threadsafe(
            bridge.call_tool('rotate_encryption_keys', {
                'current_password': current_password,
                'new_password': new_password
            }),
            bridge.loop
        )
        
        result = future.result(timeout=30)
        rotation_result = json.loads(result)
        
        return jsonify(rotation_result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Key rotation error: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'mcp_connected': bridge.mcp_session is not None,
        'timestamp': time.time()
    })

def save_base64_file(base64_data: str, file_type: str, extension: str) -> str:
    """Save base64 encoded file to disk"""
    try:
        # Create uploads directory
        uploads_dir = Path('./uploads')
        uploads_dir.mkdir(exist_ok=True)
        
        # Generate filename
        timestamp = int(time.time())
        filename = f"{file_type}_{timestamp}{extension}"
        filepath = uploads_dir / filename
        
        # Decode and save
        file_data = base64.b64decode(base64_data.split(',')[1])  # Remove data:type;base64, prefix
        with open(filepath, 'wb') as f:
            f.write(file_data)
        
        return str(filepath)
        
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

if __name__ == '__main__':
    print("🚀 Starting MCP Bridge Server")
    print("Web interface: http://localhost:5000")
    print("API endpoints: http://localhost:5000/api/")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)