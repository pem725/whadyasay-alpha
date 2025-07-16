#!/usr/bin/env python3
"""
Personal Conversation Coach MCP Server
Stores personal memories and provides conversation advice
"""

import asyncio
import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pathlib import Path

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
import mcp.types as types
from crypto_manager import PersonalCryptoManager

class ConversationCoachServer:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.db_path = self.data_dir / "conversation_coach.db"
        self.crypto_manager = PersonalCryptoManager(data_dir)
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Memories table - stores personal experiences and communication patterns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                content TEXT,
                audio_path TEXT,
                photo_path TEXT,
                files_data TEXT,  -- JSON array of file info
                tags TEXT,        -- JSON array of tags
                memory_type TEXT, -- 'experience', 'conversation', 'reflection', etc.
                timestamp TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Conversations table - stores conversation advice sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                situation TEXT NOT NULL,
                situation_type TEXT,
                advice_given TEXT,  -- JSON of advice structure
                outcome TEXT,       -- How it went (if provided later)
                success_rating INTEGER, -- 1-5 rating
                lessons_learned TEXT,
                timestamp TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Communication patterns table - learned patterns about user's style
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS communication_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type TEXT,  -- 'strength', 'weakness', 'preference', 'trigger'
                description TEXT,
                context TEXT,       -- work, family, friends, etc.
                confidence_score REAL, -- how confident we are in this pattern
                examples TEXT,      -- JSON array of supporting examples
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()

# Initialize the server
server = Server("conversation-coach")
coach_server = ConversationCoachServer()

@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """List available resources"""
    return [
        Resource(
            uri="memory://personal-memories",
            name="Personal Memories",
            description="Access to stored personal memories and experiences",
            mimeType="application/json",
        ),
        Resource(
            uri="conversation://advice-history", 
            name="Conversation Advice History",
            description="History of conversation coaching sessions",
            mimeType="application/json",
        ),
        Resource(
            uri="patterns://communication-patterns",
            name="Communication Patterns",
            description="Learned communication patterns and preferences",
            mimeType="application/json",
        )
    ]

@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """Read resource content"""
    conn = sqlite3.connect(coach_server.db_path)
    cursor = conn.cursor()
    
    try:
        if uri == "memory://personal-memories":
            cursor.execute("SELECT * FROM memories ORDER BY created_at DESC LIMIT 50")
            memories = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            result = [dict(zip(columns, row)) for row in memories]
            return json.dumps(result, indent=2)
            
        elif uri == "conversation://advice-history":
            cursor.execute("SELECT * FROM conversations ORDER BY created_at DESC LIMIT 50")
            conversations = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            result = [dict(zip(columns, row)) for row in conversations]
            return json.dumps(result, indent=2)
            
        elif uri == "patterns://communication-patterns":
            cursor.execute("SELECT * FROM communication_patterns ORDER BY confidence_score DESC")
            patterns = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            result = [dict(zip(columns, row)) for row in patterns]
            return json.dumps(result, indent=2)
            
        else:
            raise ValueError(f"Unknown resource: {uri}")
            
    finally:
        conn.close()

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="store_memory",
            description="Store a personal memory or experience",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title for the memory"},
                    "content": {"type": "string", "description": "Text content of the memory"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags for categorization"},
                    "memory_type": {"type": "string", "description": "Type of memory (experience, conversation, reflection)"},
                    "audio_data": {"type": "string", "description": "Base64 encoded audio data (optional)"},
                    "photo_data": {"type": "string", "description": "Base64 encoded photo data (optional)"},
                    "files": {"type": "array", "description": "Array of file objects (optional)"}
                },
                "required": ["content"]
            }
        ),
        Tool(
            name="get_conversation_advice",
            description="Get personalized conversation advice based on situation and personal patterns",
            inputSchema={
                "type": "object", 
                "properties": {
                    "situation": {"type": "string", "description": "Description of the conversation situation"},
                    "context": {"type": "string", "description": "Context (work, family, friends, etc.)"},
                    "relationship": {"type": "string", "description": "Relationship to the other person"},
                    "urgency": {"type": "string", "enum": ["low", "medium", "high"], "description": "How urgent this conversation is"}
                },
                "required": ["situation"]
            }
        ),
        Tool(
            name="record_conversation_outcome",
            description="Record how a conversation went after following advice",
            inputSchema={
                "type": "object",
                "properties": {
                    "conversation_id": {"type": "integer", "description": "ID of the original conversation advice"},
                    "outcome": {"type": "string", "description": "How the conversation went"},
                    "success_rating": {"type": "integer", "minimum": 1, "maximum": 5, "description": "Success rating 1-5"},
                    "lessons_learned": {"type": "string", "description": "What was learned from this experience"}
                },
                "required": ["conversation_id", "outcome", "success_rating"]
            }
        ),
        Tool(
            name="analyze_communication_patterns",
            description="Analyze stored data to identify communication patterns",
            inputSchema={
                "type": "object",
                "properties": {
                    "context": {"type": "string", "description": "Context to analyze (work, family, all, etc.)"}
                }
            }
        ),
        Tool(
            name="search_memories",
            description="Search through personal memories",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Filter by tags"},
                    "memory_type": {"type": "string", "description": "Filter by memory type"},
                    "limit": {"type": "integer", "default": 10, "description": "Maximum results to return"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="authenticate_user",
            description="Authenticate user with master password to access encrypted data",
            inputSchema={
                "type": "object",
                "properties": {
                    "master_password": {"type": "string", "description": "User's master password"},
                    "setup_new": {"type": "boolean", "default": False, "description": "Set up new encryption (first time)"}
                },
                "required": ["master_password"]
            }
        ),
        Tool(
            name="get_security_status",
            description="Get current security and authentication status",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="rotate_encryption_keys",
            description="Rotate encryption keys (recommended monthly)",
            inputSchema={
                "type": "object",
                "properties": {
                    "current_password": {"type": "string", "description": "Current master password"},
                    "new_password": {"type": "string", "description": "New master password (optional)"}
                },
                "required": ["current_password"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """Handle tool calls"""
    conn = sqlite3.connect(coach_server.db_path)
    cursor = conn.cursor()
    
    try:
        if name == "store_memory":
            # Check if user is authenticated
            if not coach_server.crypto_manager.authenticated:
                return [types.TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Authentication required",
                        "message": "Please authenticate with your master password first"
                    })
                )]
            
            # Store a personal memory with encryption
            title = arguments.get("title", "")
            content = arguments.get("content", "")
            tags = arguments.get("tags", [])
            memory_type = arguments.get("memory_type", "experience")
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Prepare sensitive data for encryption
            sensitive_data = {
                "title": title,
                "content": content,
                "tags": tags,
                "memory_type": memory_type,
                "timestamp": timestamp,
                "audio_path": arguments.get("audio_path"),
                "photo_path": arguments.get("photo_path"),
                "files_data": arguments.get("files")
            }
            
            # Encrypt the sensitive data
            try:
                encrypted_data = coach_server.crypto_manager.encrypt_data(sensitive_data)
                
                # Store only encrypted data and non-sensitive metadata
                cursor.execute('''
                    INSERT INTO memories (title, content, tags, memory_type, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                ''', ("ENCRYPTED", encrypted_data, "ENCRYPTED", "encrypted", timestamp))
                
                memory_id = cursor.lastrowid
                conn.commit()
                
                return [types.TextContent(
                    type="text",
                    text=f"Memory stored securely with ID: {memory_id}"
                )]
                
            except Exception as e:
                return [types.TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Encryption failed",
                        "message": str(e)
                    })
                )]
            
        elif name == "get_conversation_advice":
            # Get personalized conversation advice
            situation = arguments.get("situation", "")
            context = arguments.get("context", "general")
            relationship = arguments.get("relationship", "")
            
            # Analyze situation type
            situation_type = analyze_situation_type(situation)
            
            # Get relevant past experiences
            cursor.execute('''
                SELECT * FROM memories 
                WHERE content LIKE ? OR tags LIKE ?
                ORDER BY created_at DESC LIMIT 5
            ''', (f"%{context}%", f"%{context}%"))
            
            relevant_memories = cursor.fetchall()
            
            # Get communication patterns for this context
            cursor.execute('''
                SELECT * FROM communication_patterns 
                WHERE context = ? OR context = 'general'
                ORDER BY confidence_score DESC LIMIT 10
            ''', (context,))
            
            patterns = cursor.fetchall()
            
            # Generate personalized advice
            advice = generate_personalized_advice(
                situation, situation_type, context, relationship, 
                relevant_memories, patterns
            )
            
            # Store this conversation for learning
            cursor.execute('''
                INSERT INTO conversations (situation, situation_type, advice_given, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (situation, situation_type, json.dumps(advice), 
                  datetime.now(timezone.utc).isoformat()))
            
            conversation_id = cursor.lastrowid
            conn.commit()
            
            advice["conversation_id"] = conversation_id
            
            return [types.TextContent(
                type="text", 
                text=json.dumps(advice, indent=2)
            )]
            
        elif name == "search_memories":
            # Search through memories
            query = arguments.get("query", "")
            tags_filter = arguments.get("tags", [])
            memory_type = arguments.get("memory_type")
            limit = arguments.get("limit", 10)
            
            sql = "SELECT * FROM memories WHERE content LIKE ?"
            params = [f"%{query}%"]
            
            if tags_filter:
                for tag in tags_filter:
                    sql += " AND tags LIKE ?"
                    params.append(f"%{tag}%")
                    
            if memory_type:
                sql += " AND memory_type = ?"
                params.append(memory_type)
                
            sql += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(sql, params)
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            memories = [dict(zip(columns, row)) for row in results]
            
            return [types.TextContent(
                type="text",
                text=json.dumps(memories, indent=2)
            )]
            
        elif name == "authenticate_user":
            # Authenticate user with master password
            master_password = arguments.get("master_password", "")
            setup_new = arguments.get("setup_new", False)
            
            if setup_new:
                success = coach_server.crypto_manager.setup_first_time(master_password)
            else:
                success = coach_server.crypto_manager.authenticate(master_password)
            
            if success:
                return [types.TextContent(
                    type="text",
                    text=json.dumps({
                        "authenticated": True,
                        "message": "Authentication successful",
                        "security_status": coach_server.crypto_manager.get_security_status()
                    })
                )]
            else:
                return [types.TextContent(
                    type="text",
                    text=json.dumps({
                        "authenticated": False,
                        "message": "Authentication failed - invalid password"
                    })
                )]
        
        elif name == "get_security_status":
            # Get current security status
            status = coach_server.crypto_manager.get_security_status()
            return [types.TextContent(
                type="text",
                text=json.dumps(status, indent=2)
            )]
        
        elif name == "rotate_encryption_keys":
            # Rotate encryption keys
            current_password = arguments.get("current_password", "")
            new_password = arguments.get("new_password")
            
            success = coach_server.crypto_manager.rotate_keys(current_password, new_password)
            
            return [types.TextContent(
                type="text",
                text=json.dumps({
                    "success": success,
                    "message": "Key rotation completed" if success else "Key rotation failed"
                })
            )]
            
        else:
            return [types.TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]
            
    finally:
        conn.close()

def analyze_situation_type(situation: str) -> str:
    """Analyze the type of conversation situation"""
    situation_lower = situation.lower()
    
    if any(word in situation_lower for word in ['boss', 'manager', 'raise', 'promotion', 'work', 'job']):
        return 'professional'
    elif any(word in situation_lower for word in ['partner', 'spouse', 'relationship', 'dating']):
        return 'romantic'
    elif any(word in situation_lower for word in ['family', 'parent', 'sibling', 'child']):
        return 'family'
    elif any(word in situation_lower for word in ['friend', 'buddy', 'pal']):
        return 'friendship'
    elif any(word in situation_lower for word in ['apolog', 'sorry', 'mistake', 'wrong']):
        return 'apology'
    elif any(word in situation_lower for word in ['conflict', 'argument', 'fight', 'disagree']):
        return 'conflict_resolution'
    else:
        return 'general'

def generate_personalized_advice(situation: str, situation_type: str, context: str, 
                               relationship: str, memories: list, patterns: list) -> dict:
    """Generate personalized conversation advice"""
    
    # Base advice templates by situation type
    advice_templates = {
        'professional': {
            'strategy': "Approach this professionally with clear objectives and supporting evidence.",
            'key_points': [
                "Prepare specific examples of your contributions",
                "Research market rates or company policies",
                "Choose the right time and setting",
                "Be confident but respectful"
            ],
            'pitfalls': [
                "Don't make it personal or emotional",
                "Avoid ultimatums unless you're prepared to follow through",
                "Don't compare yourself negatively to others"
            ]
        },
        'romantic': {
            'strategy': "Focus on understanding each other's perspectives and finding common ground.",
            'key_points': [
                "Use 'I' statements to express your feelings",
                "Listen actively to their concerns",
                "Find a calm, private moment to talk",
                "Focus on solutions, not blame"
            ],
            'pitfalls': [
                "Don't bring up past grievances",
                "Avoid accusatory language",
                "Don't have this conversation when emotions are high"
            ]
        },
        'apology': {
            'strategy': "Take full responsibility and focus on making things right.",
            'key_points': [
                "Acknowledge what you did wrong specifically",
                "Express genuine remorse",
                "Explain how you'll prevent it in the future",
                "Ask what you can do to make it right"
            ],
            'pitfalls': [
                "Don't make excuses or justify your actions",
                "Don't say 'I'm sorry you feel that way'",
                "Don't expect immediate forgiveness"
            ]
        }
    }
    
    # Get base template
    base_advice = advice_templates.get(situation_type, advice_templates['professional'])
    
    # Personalize based on patterns and memories
    personalized_advice = {
        'situation_analysis': {
            'type': situation_type,
            'context': context,
            'situation': situation
        },
        'strategy': base_advice['strategy'],
        'key_points': base_advice['key_points'],
        'pitfalls': base_advice['pitfalls'],
        'helpful_phrases': generate_helpful_phrases(situation_type),
        'personal_insights': generate_personal_insights(memories, patterns, situation_type),
        'confidence_boosters': generate_confidence_boosters(patterns)
    }
    
    return personalized_advice

def generate_helpful_phrases(situation_type: str) -> list:
    """Generate helpful phrases based on situation type"""
    phrases = {
        'professional': [
            "I'd like to discuss my role and contributions...",
            "Based on my research and performance...",
            "I'm hoping we can find a path forward that works for both of us...",
            "I value this opportunity and want to continue growing here..."
        ],
        'romantic': [
            "I've been thinking about us and wanted to share...",
            "Help me understand your perspective on this...",
            "I love you and want us to work through this together...",
            "What would make you feel more comfortable about this?"
        ],
        'apology': [
            "I take full responsibility for...",
            "I understand how my actions affected you...",
            "I'm committed to doing better by...",
            "What can I do to rebuild your trust?"
        ]
    }
    
    return phrases.get(situation_type, [
        "I appreciate you taking the time to discuss this...",
        "Help me understand your thoughts on this...",
        "What would be the best outcome for both of us?",
        "I'm open to hearing your perspective..."
    ])

def generate_personal_insights(memories: list, patterns: list, situation_type: str) -> list:
    """Generate insights based on personal history"""
    insights = []
    
    if memories:
        insights.append(f"Based on your past experiences, you tend to handle {situation_type} situations well when you prepare in advance.")
    
    if patterns:
        for pattern in patterns[:3]:  # Top 3 patterns
            if pattern[1] == 'strength':
                insights.append(f"Your strength in {pattern[2]} situations: {pattern[3]}")
            elif pattern[1] == 'weakness':
                insights.append(f"Watch out for your tendency to {pattern[3]} in {pattern[2]} contexts")
    
    if not insights:
        insights.append("This is a new type of situation for you - trust your instincts and stay authentic.")
    
    return insights

def generate_confidence_boosters(patterns: list) -> list:
    """Generate confidence boosters based on past successes"""
    boosters = [
        "You've handled difficult conversations before and can do this too",
        "Remember that most people appreciate honest, respectful communication",
        "The worst outcome is usually not as bad as we imagine",
        "You're taking the right step by preparing for this conversation"
    ]
    
    # Add personalized boosters based on patterns
    for pattern in patterns:
        if pattern[1] == 'strength' and pattern[4]:  # Has confidence score
            boosters.append(f"You're particularly good at {pattern[3]} - lean into that strength")
            break
    
    return boosters[:3]  # Return top 3

async def main():
    # Run the server using stdin/stdout streams
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="conversation-coach",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())