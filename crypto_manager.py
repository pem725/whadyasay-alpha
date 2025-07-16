#!/usr/bin/env python3
"""
Personal Data Encryption Manager
Provides end-to-end encryption for personal conversation data
User owns and controls all encryption keys
"""

import os
import json
import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import getpass

class PersonalCryptoManager:
    """
    Manages encryption for personal conversation data
    - User-controlled master password
    - Monthly key rotation (recommended)
    - Local key storage only
    - No cloud dependencies
    """
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.keys_dir = self.data_dir / "keys"
        self.keys_dir.mkdir(exist_ok=True, mode=0o700)  # Restricted permissions
        
        self.master_key_file = self.keys_dir / "master.key"
        self.auth_file = self.keys_dir / "auth.json"
        self.current_key = None
        self.authenticated = False
        
    def setup_first_time(self, master_password: str) -> bool:
        """
        First-time setup: create master key and authentication
        """
        try:
            print("🔐 Setting up your personal encryption...")
            
            # Generate salt for password derivation
            salt = os.urandom(32)
            
            # Derive key from password
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
            
            # Create Fernet cipher
            fernet = Fernet(key)
            
            # Generate RSA key pair for additional security
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Serialize keys
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_key = private_key.public_key()
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Encrypt the private key with Fernet
            encrypted_private_key = fernet.encrypt(private_pem)
            
            # Store master key info
            master_data = {
                "salt": base64.b64encode(salt).decode(),
                "encrypted_private_key": base64.b64encode(encrypted_private_key).decode(),
                "public_key": base64.b64encode(public_pem).decode(),
                "created_at": datetime.now().isoformat(),
                "key_rotation_due": (datetime.now() + timedelta(days=30)).isoformat()
            }
            
            with open(self.master_key_file, 'w') as f:
                json.dump(master_data, f, indent=2)
            
            # Set restrictive permissions
            os.chmod(self.master_key_file, 0o600)
            
            # Create auth tracking
            auth_data = {
                "last_auth": datetime.now().isoformat(),
                "auth_count": 1,
                "setup_complete": True
            }
            
            with open(self.auth_file, 'w') as f:
                json.dump(auth_data, f, indent=2)
            
            os.chmod(self.auth_file, 0o600)
            
            self.current_key = fernet
            self.authenticated = True
            
            print("✅ Personal encryption setup complete!")
            print("🔑 Your data is now encrypted and only you have the key")
            print("📅 Key rotation recommended in 30 days")
            
            return True
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False
    
    def authenticate(self, master_password: str) -> bool:
        """
        Authenticate user and load encryption keys
        """
        try:
            if not self.master_key_file.exists():
                print("🔐 First time setup required")
                return self.setup_first_time(master_password)
            
            # Load master key data
            with open(self.master_key_file, 'r') as f:
                master_data = json.load(f)
            
            # Derive key from password
            salt = base64.b64decode(master_data["salt"])
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            
            try:
                key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
                fernet = Fernet(key)
                
                # Test decryption to verify password
                encrypted_private_key = base64.b64decode(master_data["encrypted_private_key"])
                private_pem = fernet.decrypt(encrypted_private_key)
                
                # If we get here, password is correct
                self.current_key = fernet
                self.authenticated = True
                
                # Update auth tracking
                self._update_auth_tracking()
                
                # Check if key rotation is due
                self._check_key_rotation(master_data)
                
                print("✅ Authentication successful")
                return True
                
            except Exception:
                print("❌ Invalid password")
                return False
                
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False
    
    def encrypt_data(self, data: Dict[Any, Any]) -> str:
        """
        Encrypt personal data
        """
        if not self.authenticated:
            raise Exception("Not authenticated - call authenticate() first")
        
        # Convert to JSON and encrypt
        json_data = json.dumps(data, default=str)
        encrypted_data = self.current_key.encrypt(json_data.encode())
        
        # Return base64 encoded for storage
        return base64.b64encode(encrypted_data).decode()
    
    def decrypt_data(self, encrypted_data: str) -> Dict[Any, Any]:
        """
        Decrypt personal data
        """
        if not self.authenticated:
            raise Exception("Not authenticated - call authenticate() first")
        
        try:
            # Decode and decrypt
            encrypted_bytes = base64.b64decode(encrypted_data)
            decrypted_bytes = self.current_key.decrypt(encrypted_bytes)
            
            # Parse JSON
            return json.loads(decrypted_bytes.decode())
            
        except Exception as e:
            raise Exception(f"Decryption failed: {e}")
    
    def rotate_keys(self, master_password: str, new_password: Optional[str] = None) -> bool:
        """
        Rotate encryption keys (recommended monthly)
        """
        try:
            print("🔄 Rotating encryption keys...")
            
            if not self.authenticate(master_password):
                return False
            
            # Use new password if provided, otherwise keep current
            password_to_use = new_password if new_password else master_password
            
            # Create backup of current keys
            backup_file = self.keys_dir / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.key"
            if self.master_key_file.exists():
                import shutil
                shutil.copy2(self.master_key_file, backup_file)
                os.chmod(backup_file, 0o600)
            
            # Generate new keys
            success = self.setup_first_time(password_to_use)
            
            if success:
                print("✅ Key rotation complete")
                print("🔒 Old keys backed up securely")
                return True
            else:
                print("❌ Key rotation failed")
                return False
                
        except Exception as e:
            print(f"❌ Key rotation error: {e}")
            return False
    
    def _update_auth_tracking(self):
        """Update authentication tracking"""
        try:
            auth_data = {}
            if self.auth_file.exists():
                with open(self.auth_file, 'r') as f:
                    auth_data = json.load(f)
            
            auth_data.update({
                "last_auth": datetime.now().isoformat(),
                "auth_count": auth_data.get("auth_count", 0) + 1
            })
            
            with open(self.auth_file, 'w') as f:
                json.dump(auth_data, f, indent=2)
                
        except Exception as e:
            print(f"Warning: Could not update auth tracking: {e}")
    
    def _check_key_rotation(self, master_data: Dict):
        """Check if key rotation is recommended"""
        try:
            rotation_due = datetime.fromisoformat(master_data["key_rotation_due"])
            if datetime.now() > rotation_due:
                print("⚠️  Key rotation recommended!")
                print("   Your encryption keys are over 30 days old")
                print("   Consider running: crypto_manager.rotate_keys()")
                
        except Exception:
            pass  # Non-critical
    
    def get_security_status(self) -> Dict[str, Any]:
        """Get current security status"""
        status = {
            "authenticated": self.authenticated,
            "setup_complete": False,
            "last_auth": None,
            "auth_count": 0,
            "key_rotation_due": None,
            "days_until_rotation": None
        }
        
        try:
            if self.auth_file.exists():
                with open(self.auth_file, 'r') as f:
                    auth_data = json.load(f)
                status.update(auth_data)
            
            if self.master_key_file.exists():
                with open(self.master_key_file, 'r') as f:
                    master_data = json.load(f)
                
                rotation_due = datetime.fromisoformat(master_data["key_rotation_due"])
                status["key_rotation_due"] = master_data["key_rotation_due"]
                status["days_until_rotation"] = (rotation_due - datetime.now()).days
                
        except Exception:
            pass
        
        return status