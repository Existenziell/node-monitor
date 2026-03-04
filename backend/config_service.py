#!/usr/bin/env python3
"""
Configuration Service
Centralized service for secure Bitcoin configuration management with enhanced features
"""

import os
import json
import getpass
import base64
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import keyring
from cryptography.fernet import Fernet


class ConfigService:
    """Centralized service for Bitcoin configuration management."""

    def __init__(self):
        """Initialize the configuration service."""
        self.config_dir = Path.home() / ".bitcoin_secure"
        self.config_file = self.config_dir / "config.json"
        self.service_name = "bitcoin-node-rpc"
        self._config_cache: Optional[Dict[str, Any]] = None

    def setup_secure_config(self) -> bool:
        """Setup secure configuration with enhanced validation."""
        print("=" * 40)
        print()

        # Create config directory
        self.config_dir.mkdir(exist_ok=True)

        # Check for cookie authentication first
        cookie_file = self._find_bitcoin_cookie()
        if cookie_file:
            rpc_port = self._get_input("RPC Port [8332]: ").strip() or "8332"
            try:
                rpc_port = int(rpc_port)
                if not 1024 <= rpc_port <= 65535:
                    raise ValueError("Port must be between 1024 and 65535")
            except ValueError as e:
                print(f"❌ Invalid port: {e}")
                return False

            # Store cookie-based config
            config = {
                "rpc_port": rpc_port,
                "rpc_url": f"http://127.0.0.1:{rpc_port}",
                "cookie_file": str(cookie_file),
                "auth_method": "cookie",
                "created_at": self._get_timestamp(),
                "version": "1.1"
            }

            try:
                with open(self.config_file, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2)

                os.chmod(self.config_file, 0o600)
                print("✅ Cookie-based configuration saved")
                print(f"   Config file: {self.config_file}")
                print("   Permissions: 600 (owner read/write only)")
                print()

                self._config_cache = None
                return True

            except Exception as e:
                print(f"❌ Error saving configuration: {e}")
                return False

        # Fall back to username/password authentication
        print("Cookie authentication not found. Using username/password authentication.")
        print("Enter your Bitcoin RPC credentials:")
        rpc_user = self._get_input("RPC Username: ").strip()
        if not rpc_user:
            print("❌ RPC Username is required")
            return False

        rpc_password = getpass.getpass("RPC Password: ")
        if not rpc_password:
            print("❌ RPC Password is required")
            return False

        rpc_port = self._get_input("RPC Port [8332]: ").strip() or "8332"
        try:
            rpc_port = int(rpc_port)
            if not 1024 <= rpc_port <= 65535:
                raise ValueError("Port must be between 1024 and 65535")
        except ValueError as e:
            print(f"❌ Invalid port: {e}")
            return False

        # Store in keyring (most secure)
        try:
            keyring.set_password(self.service_name, rpc_user, rpc_password)
            print("✅ Password stored securely in macOS Keychain")
        except Exception as e:
            print(f"⚠️  Could not store in keyring: {e}")
            print("   Falling back to encrypted local storage...")
            if not self._store_encrypted_config(rpc_user, rpc_password, rpc_port):
                return False

        # Store other config in JSON
        config = {
            "rpc_user": rpc_user,
            "rpc_port": rpc_port,
            "rpc_url": f"http://127.0.0.1:{rpc_port}",
            "use_keyring": True,
            "auth_method": "password",
            "created_at": self._get_timestamp(),
            "version": "1.1"
        }

        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)

            # Set secure permissions
            os.chmod(self.config_file, 0o600)

            print("✅ Configuration saved securely")
            print(f"   Config file: {self.config_file}")
            print("   Permissions: 600 (owner read/write only)")
            print()

            # Clear cache to force reload
            self._config_cache = None
            return True

        except Exception as e:
            print(f"❌ Error saving configuration: {e}")
            return False

    def _store_encrypted_config(self, rpc_user: str, rpc_password: str, rpc_port: int) -> bool:
        """Store encrypted config as fallback."""
        try:
            # Generate or load encryption key
            key_file = self.config_dir / ".key"
            if key_file.exists():
                with open(key_file, 'rb') as f:
                    key = f.read()
            else:
                key = Fernet.generate_key()
                with open(key_file, 'wb') as f:
                    f.write(key)
                os.chmod(key_file, 0o600)

            # Encrypt password
            fernet = Fernet(key)
            encrypted_password = fernet.encrypt(rpc_password.encode())

            config = {
                "rpc_user": rpc_user,
                "rpc_port": rpc_port,
                "rpc_url": f"http://127.0.0.1:{rpc_port}",
                "encrypted_password": base64.b64encode(encrypted_password).decode(),
                "use_keyring": False,
                "created_at": self._get_timestamp(),
                "version": "1.0"
            }

            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)

            os.chmod(self.config_file, 0o600)
            print("✅ Password encrypted and stored locally")
            return True

        except ImportError:
            print("❌ cryptography library not available")
            print("   Install with: pip3 install cryptography")
            return False
        except Exception as e:
            print(f"❌ Error storing encrypted config: {e}")
            return False

    def load_config(self, force_reload: bool = False, silent: bool = False) -> Optional[Dict[str, Any]]:
        """Load secure configuration with caching and validation."""
        if not force_reload and self._config_cache is not None:
            return self._config_cache

        if not self.config_file.exists():
            if not silent:
                print("❌ No secure configuration found")
                print("   Run: python3 backend/config_service.py --setup")
            return None

        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Handle different authentication methods
            if config.get("auth_method") == "cookie":
                # Cookie authentication - no password needed
                if not config.get("cookie_file") or not os.path.exists(config["cookie_file"]):
                    if not silent:
                        print(f"❌ Cookie file not found: {config.get('cookie_file', 'Not specified')}")
                    return None
            elif config.get("use_keyring", False):
                try:
                    password = keyring.get_password(self.service_name, config["rpc_user"])
                    if password:
                        config["rpc_password"] = password
                    else:
                        if not silent:
                            print("❌ Password not found in keyring")
                        return None
                except Exception as e:
                    if not silent:
                        print(f"❌ Error accessing keyring: {e}")
                    return None
            else:
                # Decrypt password
                try:
                    key_file = self.config_dir / ".key"
                    with open(key_file, 'rb') as f:
                        key = f.read()

                    fernet = Fernet(key)
                    encrypted_password = base64.b64decode(config["encrypted_password"])
                    config["rpc_password"] = fernet.decrypt(encrypted_password).decode()

                except Exception as e:
                    if not silent:
                        print(f"❌ Error decrypting password: {e}")
                    return None

            # Validate config before caching
            if not self._validate_config_structure(config, silent=silent):
                return None
            # Cache the config
            self._config_cache = config
            return config

        except Exception as e:
            if not silent:
                print(f"❌ Error loading config: {e}")
            return None

    def get_config_info(self) -> Dict[str, Any]:
        """Get information about current configuration."""
        info = {
            "config_file_exists": self.config_file.exists(),
            "config_dir": str(self.config_dir),
            "service_name": self.service_name
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                info["rpc_user"] = config.get("rpc_user", "Unknown")
                info["rpc_port"] = config.get("rpc_port", "Unknown")
                info["use_keyring"] = config.get("use_keyring", False)
                info["created_at"] = config.get("created_at", "Unknown")
                info["version"] = config.get("version", "Unknown")
            except Exception as e:
                info["config_error"] = str(e)

        return info

    def get_config_status(self) -> Dict[str, Any]:
        """Return safe config status for API (no secrets)."""
        status = {
            "config_exists": self.config_file.exists(),
            "auth_method": None,
            "rpc_host": None,
            "rpc_port": None,
            "rpc_user_masked": None,
            "cookie_file": None,
            "wallet_name": None,
            "node_configured": False,
        }
        if not self.config_file.exists():
            return status
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            status["auth_method"] = config.get("auth_method")
            status["rpc_host"] = config.get("rpc_host", "127.0.0.1")
            status["rpc_port"] = config.get("rpc_port")
            status["cookie_file"] = config.get("cookie_file") if config.get("auth_method") == "cookie" else None
            status["wallet_name"] = config.get("wallet_name")
            rpc_user = config.get("rpc_user")
            if rpc_user:
                status["rpc_user_masked"] = (rpc_user[:2] + "***") if len(rpc_user) > 2 else "***"
            loaded = self.load_config(force_reload=True, silent=True)
            status["node_configured"] = loaded is not None
        except Exception:
            pass
        return status

    def save_wallet_name(self, wallet_name: Optional[str]) -> Tuple[bool, str]:
        """Merge wallet_name into existing config. Use None or '' to clear. Returns (success, error_message)."""
        if not self.config_file.exists():
            return False, "Config not found"
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            name = (wallet_name or "").strip()
            config["wallet_name"] = name if name else None
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            os.chmod(self.config_file, 0o600)
            self._config_cache = None
            return True, ""
        except Exception as e:
            return False, str(e)

    def save_config_from_api(  # pylint: disable=R0914
        self,
        auth_method: str,
        rpc_port: int,
        rpc_host: Optional[str] = None,
        rpc_user: Optional[str] = None,
        rpc_password: Optional[str] = None,
        cookie_file: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Save config from API. Returns (success, error_message). No secrets in error_message."""
        auth_method = (auth_method or "").strip().lower()
        if auth_method not in ("password", "cookie"):
            return False, "auth_method must be 'password' or 'cookie'"
        try:
            rpc_port = int(rpc_port)
            if not 1024 <= rpc_port <= 65535:
                return False, "rpc_port must be between 1024 and 65535"
        except (ValueError, TypeError):
            return False, "rpc_port must be a number"

        host = (rpc_host or "").strip() or "127.0.0.1"
        rpc_url = f"http://{host}:{rpc_port}"

        self.config_dir.mkdir(exist_ok=True)
        existing = self.load_config(force_reload=True, silent=True) if self.config_file.exists() else None

        if auth_method == "cookie":
            cookie_path = (cookie_file or "").strip()
            if not cookie_path:
                return False, "cookie_file is required when auth_method is cookie"
            if not os.path.exists(cookie_path):
                return False, "cookie_file path does not exist"
            # Optionally clear keyring for previous user when switching to cookie
            if existing and existing.get("auth_method") == "password" and existing.get("rpc_user"):
                try:
                    keyring.delete_password(self.service_name, existing["rpc_user"])
                except Exception:
                    pass
            config = {
                "rpc_host": host,
                "rpc_port": rpc_port,
                "rpc_url": rpc_url,
                "cookie_file": cookie_path,
                "auth_method": "cookie",
                "created_at": self._get_timestamp(),
                "version": "1.1",
            }
            if existing and existing.get("wallet_name"):
                config["wallet_name"] = existing["wallet_name"]
        else:
            # password
            user = (rpc_user or "").strip()
            if not user and existing and existing.get("auth_method") == "password":
                user = (existing.get("rpc_user") or "").strip()
            if not user:
                return False, "rpc_user is required when auth_method is password"
            password = (rpc_password or "").strip() if rpc_password else ""
            if not existing:
                if not password:
                    return False, "rpc_password is required for new configuration"
            else:
                if not password and existing.get("auth_method") == "password" and existing.get("rpc_user") == user:
                    # Keep existing password when same user
                    if existing.get("use_keyring"):
                        password = keyring.get_password(self.service_name, existing.get("rpc_user")) or ""
                    elif "encrypted_password" in existing:
                        key_file = self.config_dir / ".key"
                        with open(key_file, 'rb') as f:
                            key = f.read()
                        fernet = Fernet(key)
                        enc = base64.b64decode(existing["encrypted_password"])
                        password = fernet.decrypt(enc).decode()
                    else:
                        password = ""
                    if not password:
                        return False, "rpc_password is required to update (current password not found)"
                elif existing.get("rpc_user") != user and existing.get("use_keyring"):
                    try:
                        keyring.delete_password(self.service_name, existing["rpc_user"])
                    except Exception:
                        pass
                elif not password and existing.get("rpc_user") != user:
                    return False, "rpc_password is required when changing rpc_user"

            use_keyring = True
            try:
                keyring.set_password(self.service_name, user, password)
            except Exception:
                use_keyring = False
                key_file = self.config_dir / ".key"
                try:
                    if key_file.exists():
                        with open(key_file, 'rb') as f:
                            key = f.read()
                    else:
                        key = Fernet.generate_key()
                        with open(key_file, 'wb') as f:
                            f.write(key)
                        os.chmod(key_file, 0o600)
                    fernet = Fernet(key)
                    encrypted_password = fernet.encrypt(password.encode())
                    config = {
                        "rpc_user": user,
                        "rpc_host": host,
                        "rpc_port": rpc_port,
                        "rpc_url": rpc_url,
                        "encrypted_password": base64.b64encode(encrypted_password).decode(),
                        "use_keyring": False,
                        "auth_method": "password",
                        "created_at": self._get_timestamp(),
                        "version": "1.1",
                    }
                    if existing and existing.get("wallet_name"):
                        config["wallet_name"] = existing["wallet_name"]
                    with open(self.config_file, 'w', encoding='utf-8') as f:
                        json.dump(config, f, indent=2)
                    os.chmod(self.config_file, 0o600)
                    self._config_cache = None
                    return True, ""
                except Exception as enc_err:
                    return False, f"Failed to store password: {enc_err}"
            config = {
                "rpc_user": user,
                "rpc_host": host,
                "rpc_port": rpc_port,
                "rpc_url": rpc_url,
                "use_keyring": use_keyring,
                "auth_method": "password",
                "created_at": self._get_timestamp(),
                "version": "1.1",
            }
            if existing and existing.get("wallet_name"):
                config["wallet_name"] = existing["wallet_name"]

        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            os.chmod(self.config_file, 0o600)
            self._config_cache = None
            return True, ""
        except Exception as e:
            return False, str(e)

    def validate_config(self) -> Dict[str, Any]:
        """Validate current configuration."""
        validation = {
            "rpc_config_valid": False,
            "errors": [],
            "warnings": []
        }

        # Validate RPC config
        rpc_config = self.load_config()
        if rpc_config:
            validation["rpc_config_valid"] = True
            # Check if RPC URL is accessible (basic check)
            if not rpc_config.get("rpc_url", "").startswith("http"):
                validation["warnings"].append("RPC URL format may be invalid")
        else:
            validation["errors"].append("RPC configuration not found or invalid")

        return validation

    def clear_cache(self) -> None:
        """Clear configuration cache."""
        self._config_cache = None

    def backup_config(self, backup_path: Optional[str] = None) -> bool:
        """Backup configuration files."""
        if backup_path is None:
            backup_path = str(self.config_dir / "backup")

        backup_dir = Path(backup_path)
        backup_dir.mkdir(exist_ok=True)

        try:
            # Backup RPC config
            if self.config_file.exists():
                import shutil
                shutil.copy2(self.config_file, backup_dir / "config.json")

            print(f"✅ Configuration backed up to: {backup_dir}")
            return True

        except Exception as e:
            print(f"❌ Error backing up configuration: {e}")
            return False

    def _get_input(self, prompt: str) -> str:
        """Get user input with proper handling."""
        try:
            return input(prompt)
        except (EOFError, KeyboardInterrupt):
            return ""

    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()

    def _find_bitcoin_cookie(self) -> Optional[Path]:
        """Find Bitcoin cookie file in common locations."""
        # Common Bitcoin data directory locations (generic paths only)
        possible_dirs = [
            Path.home() / ".bitcoin",
            Path("/var/lib/bitcoin"),
            Path("/opt/bitcoin"),
        ]
        # Optional: add custom datadir from environment
        env_datadir = os.environ.get("BITCOIN_DATADIR")
        if env_datadir:
            possible_dirs.insert(0, Path(env_datadir))

        for data_dir in possible_dirs:
            cookie_file = data_dir / ".cookie"
            if cookie_file.exists():
                return cookie_file

        return None

    def _validate_bitcoin_address(self, address: str) -> bool:
        """Basic Bitcoin address validation."""
        if not address:
            return False

        # Basic checks for common Bitcoin address formats
        if len(address) < 26 or len(address) > 62:
            return False

        # Check for valid characters (Base58)
        valid_chars = set("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
        if not all(c in valid_chars for c in address):
            return False

        return True

    def _validate_config_structure(self, config: Dict[str, Any], silent: bool = False) -> bool:
        """Validate configuration structure and required fields."""
        def _err(msg: str) -> bool:
            if not silent:
                print(f"❌ {msg}")
            return False

        # Different validation based on auth method
        if config.get("auth_method") == "cookie":
            required_fields = ['rpc_port', 'rpc_url', 'cookie_file']
            for field in required_fields:
                if field not in config:
                    return _err(f"Missing required config field: {field}")
        else:
            required_fields = ['rpc_user', 'rpc_port', 'rpc_url']
            for field in required_fields:
                if field not in config:
                    return _err(f"Missing required config field: {field}")

        try:
            port = int(config['rpc_port'])
            if not 1024 <= port <= 65535:
                return _err(f"Invalid RPC port: {port}. Must be between 1024-65535")
        except (ValueError, TypeError):
            return _err(f"Invalid RPC port format: {config['rpc_port']}")

        if not config['rpc_url'].startswith('http'):
            return _err(f"Invalid RPC URL format: {config['rpc_url']}")

        if config.get("auth_method") == "cookie":
            if not os.path.exists(config.get('cookie_file', '')):
                return _err(f"Cookie file not found: {config.get('cookie_file', 'Not specified')}")
        else:
            if not config.get('use_keyring', False) and 'encrypted_password' not in config:
                return _err("No password found in config")

        return True


# Global instance for easy access
config_service = ConfigService()


# Convenience functions for backward compatibility
def load_config() -> Optional[Dict[str, Any]]:
    """Load secure configuration (convenience function)."""
    return config_service.load_config()


def get_config_info() -> Dict[str, Any]:
    """Get configuration information (convenience function)."""
    return config_service.get_config_info()


def validate_config() -> Dict[str, Any]:
    """Validate configuration (convenience function)."""
    return config_service.validate_config()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--setup":
        config_service.setup_secure_config()
    else:
        print("To setup secure configuration, run:")
        print("  python3 backend/config_service.py --setup")
