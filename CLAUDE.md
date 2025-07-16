# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**What Do You Say?** is a secure, personal conversation coach that provides AI-powered advice for difficult conversations. It features end-to-end encryption, local data storage, and learns from personal communication patterns to provide personalized advice.

## Architecture

### Core Components

1. **MCP Server** (`mcp_server.py`)
   - Model Context Protocol server handling conversation advice and memory storage
   - Manages SQLite database with encrypted personal data
   - Provides tools for storing memories, getting advice, and analyzing patterns

2. **HTTP Bridge** (`mcp_bridge.py`)
   - Flask-based REST API connecting web interface to MCP server
   - Handles asynchronous communication between frontend and MCP server
   - Manages file uploads and authentication endpoints

3. **Crypto Manager** (`crypto_manager.py`)
   - Handles AES-256 encryption for all personal data
   - User-controlled master password system
   - Monthly key rotation with secure backup

4. **Web Interface** (`index.html`, `coach.html`, `memory.html`, `auth.html`)
   - Mobile-first responsive design
   - Voice input, photo capture, and file upload support
   - Authentication UI with encryption setup

### Database Schema

- `memories`: Stores encrypted personal experiences and communication patterns
- `conversations`: Tracks conversation advice sessions and outcomes
- `communication_patterns`: Learned patterns about user's communication style

## Common Development Commands

### Starting the System
```bash
# Quick start (recommended)
python start_server.py

# With tests
python start_server.py --test

# Setup only
python start_server.py --setup
```

### Testing
```bash
# Basic functionality tests
python test_mcp_server.py

# MCP protocol tests
python test_client.py

# Interactive testing
python test_client.py --interactive

# Full system integration test
python integration_test.py
```

### Manual Components
```bash
# Start MCP server directly
python mcp_server.py

# Start web bridge only
python mcp_bridge.py

# Dependencies
pip install -r requirements.txt
```

## Security Architecture

### Encryption Flow
1. User sets master password during first-time setup
2. PBKDF2 key derivation (100,000 iterations) creates encryption key
3. AES-256 encryption for all personal data before database storage
4. RSA key pairs provide additional security layer
5. Monthly key rotation recommended with secure backup

### Authentication
- `authenticate_user` tool handles login and first-time setup
- `get_security_status` provides current encryption state
- `rotate_encryption_keys` handles monthly key rotation

## Key Features

### Conversation Advice
- Analyzes situation type (professional, romantic, family, apology, etc.)
- Provides personalized advice based on encrypted user patterns
- Generates helpful phrases and confidence boosters
- Tracks conversation outcomes for learning

### Memory Management
- Multi-modal input (text, voice, photos, files)
- Encrypted storage with user-controlled keys
- Searchable with tags and content filtering
- Pattern recognition for personalized advice

### Privacy & Security
- Zero-knowledge architecture - server cannot read user data
- Local-only storage, no cloud dependencies
- User owns and controls all encryption keys
- Monthly key rotation with secure backup system

## Development Notes

### File Structure
- `data/`: SQLite database and encryption keys (created at runtime)
- `uploads/`: Temporary file storage for photos and audio
- `logs/`: Application logs (created at runtime)

### Error Handling
- Graceful degradation when MCP server is unavailable
- Offline support with local storage fallback
- Authentication required for all encrypted operations

### Testing Strategy
- Unit tests for individual components
- MCP protocol tests for server communication
- Integration tests for full system workflow
- Interactive testing for manual verification

## MCP Tools Available

- `store_memory`: Store encrypted personal memories
- `get_conversation_advice`: Get personalized conversation advice
- `search_memories`: Search through encrypted memories
- `record_conversation_outcome`: Track conversation results
- `analyze_communication_patterns`: Identify communication patterns
- `authenticate_user`: Handle user authentication
- `get_security_status`: Check encryption status
- `rotate_encryption_keys`: Monthly key rotation

## API Endpoints

- `POST /api/conversation/advice`: Get conversation advice
- `POST /api/memory/store`: Store personal memory
- `POST /api/memory/search`: Search memories
- `POST /api/security/authenticate`: User authentication
- `POST /api/security/setup`: First-time encryption setup
- `POST /api/security/rotate`: Key rotation
- `GET /api/security/status`: Security status
- `GET /api/health`: Health check

## Dependencies

- **MCP**: `mcp>=1.0.0` - Model Context Protocol
- **Flask**: `flask>=2.3.0` - Web framework
- **Cryptography**: `cryptography>=41.0.0` - Encryption
- **Flask-CORS**: `flask-cors>=4.0.0` - CORS support

## Important Considerations

- All personal data is encrypted before storage
- Authentication is required for all encrypted operations
- Monthly key rotation is recommended for security
- System works offline with local storage
- No external API dependencies for core functionality