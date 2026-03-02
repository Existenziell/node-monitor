#!/usr/bin/env python3
"""
Error Service
Centralized service for error handling, logging, and user-friendly error messages
"""

import traceback
from typing import Dict, Any, List
from datetime import datetime

class ErrorService:
    """Centralized service for Bitcoin error handling and management."""

    def __init__(self):
        """Initialize the error service."""
        self.error_log: List[Dict[str, Any]] = []
        self.max_log_entries = 100

    def handle_rpc_error(self, response: Dict[str, Any], operation: str = "RPC call") -> bool:
        """Handle RPC errors and return True if successful."""
        if "error" in response and response["error"]:
            error_msg = response["error"]
            if isinstance(error_msg, dict):
                error_text = error_msg.get("message", str(error_msg))
                error_code = error_msg.get("code", "Unknown")
                print(f"❌ {operation} failed (Code {error_code}): {error_text}")
            else:
                print(f"❌ {operation} failed: {error_msg}")

            self._log_error(operation, error_msg, "RPC_ERROR")
            return False
        return True

    def handle_connection_error(self, operation: str = "Connection") -> None:
        """Handle connection errors with consistent messaging."""
        print(f"❌ {operation} failed!")
        print("   Make sure Bitcoin node is running and configured properly")
        self._log_error(operation, "Connection failed", "CONNECTION_ERROR")

    def handle_config_error(self) -> None:
        """Handle configuration errors."""
        print("❌ No secure configuration found!")
        print("   Run: python3 backend/config_service.py --setup")
        self._log_error("Configuration", "No secure configuration found", "CONFIG_ERROR")

    def handle_api_error(self, api_name: str, error: Exception) -> None:
        """Handle API errors with consistent messaging."""
        print(f"⚠️  {api_name} API failed: {error}")
        self._log_error(f"{api_name} API", str(error), "API_ERROR")

    def handle_file_error(self, filename: str, operation: str, error: Exception) -> None:
        """Handle file operation errors."""
        print(f"❌ File {operation} failed for {filename}: {error}")
        self._log_error(f"File {operation}", f"{filename}: {error}", "FILE_ERROR")

    def handle_validation_error(self, field: str, value: Any, expected_type: str) -> None:
        """Handle data validation errors."""
        print(f"❌ Validation error: {field} must be {expected_type}, got {type(value).__name__}")
        self._log_error("Validation", f"{field}: {value} (expected {expected_type})", "VALIDATION_ERROR")

    def handle_permission_error(self, operation: str) -> None:
        """Handle permission errors."""
        print(f"❌ Permission denied: {operation}")
        print("   Check file permissions and try running with appropriate privileges")
        self._log_error("Permission", operation, "PERMISSION_ERROR")

    def handle_timeout_error(self, operation: str, timeout_seconds: int) -> None:
        """Handle timeout errors."""
        print(f"⏰ {operation} timed out after {timeout_seconds} seconds")
        self._log_error("Timeout", f"{operation} ({timeout_seconds}s)", "TIMEOUT_ERROR")

    def handle_import_error(self, module_name: str) -> None:
        """Handle import errors."""
        print(f"❌ Missing dependency: {module_name}")
        print(f"   Install with: pip install {module_name}")
        self._log_error("Import", module_name, "IMPORT_ERROR")

    def handle_network_error(self, operation: str, error: Exception) -> None:
        """Handle network-related errors."""
        print(f"❌ Network error during {operation}: {error}")
        print("   Check your internet connection and try again")
        self._log_error("Network", f"{operation}: {error}", "NETWORK_ERROR")

    def handle_critical_error(self, operation: str, error: Exception) -> None:
        """Handle critical errors that require immediate attention."""
        print(f"💥 CRITICAL ERROR in {operation}: {error}")
        print("   This may require manual intervention")
        self._log_error("Critical", f"{operation}: {error}", "CRITICAL_ERROR")

    def handle_warning(self, message: str, context: str = "") -> None:
        """Handle warnings with consistent formatting."""
        if context:
            print(f"⚠️  Warning ({context}): {message}")
        else:
            print(f"⚠️  Warning: {message}")
        self._log_error("Warning", message, "WARNING")

    def handle_info(self, message: str, context: str = "") -> None:
        """Handle informational messages."""
        if context:
            print(f"ℹ️  Info ({context}): {message}")
        else:
            print(f"ℹ️  Info: {message}")

    def handle_success(self, operation: str, details: str = "") -> None:
        """Handle success messages."""
        if details:
            print(f"✓ {operation}: {details}")
        else:
            print(f"✓ {operation} completed successfully")

    def _log_error(self, operation: str, error_message: str, error_type: str) -> None:
        """Log error to internal log."""
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "error_message": error_message,
            "error_type": error_type
        }

        self.error_log.append(error_entry)

        # Keep only the most recent errors
        if len(self.error_log) > self.max_log_entries:
            self.error_log = self.error_log[-self.max_log_entries:]

    def get_error_log(self) -> List[Dict[str, Any]]:
        """Get the error log."""
        return self.error_log.copy()

    def get_error_summary(self) -> Dict[str, int]:
        """Get a summary of error types."""
        summary = {}
        for error in self.error_log:
            error_type = error["error_type"]
            summary[error_type] = summary.get(error_type, 0) + 1
        return summary

    def clear_error_log(self) -> None:
        """Clear the error log."""
        self.error_log.clear()

    def get_recent_errors(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get the most recent errors."""
        return self.error_log[-count:] if self.error_log else []

    def has_errors(self) -> bool:
        """Check if there are any errors in the log."""
        return len(self.error_log) > 0

    def get_critical_errors(self) -> List[Dict[str, Any]]:
        """Get all critical errors."""
        return [error for error in self.error_log if error["error_type"] == "CRITICAL_ERROR"]

    def print_error_summary(self) -> None:
        """Print a summary of recent errors."""
        if not self.error_log:
            print("✓ No errors in log")
            return

        print("\nError Summary:")
        print(f"Total errors: {len(self.error_log)}")

        summary = self.get_error_summary()
        for error_type, count in summary.items():
            print(f"  {error_type}: {count}")

        # Show recent errors
        recent = self.get_recent_errors(5)
        if recent:
            print("\nRecent errors:")
            for error in recent:
                print(f"  {error['timestamp']}: {error['operation']} - {error['error_type']}")

    def handle_exception(self, operation: str, exception: Exception) -> None:
        """Handle uncaught exceptions with full traceback."""
        print(f"💥 Unhandled exception in {operation}: {exception}")
        print("Traceback:")
        traceback.print_exc()

        self._log_error(operation, f"Unhandled exception: {exception}", "UNHANDLED_EXCEPTION")

    def set_max_log_entries(self, max_entries: int) -> None:
        """Set maximum number of error log entries."""
        self.max_log_entries = max_entries
        if len(self.error_log) > max_entries:
            self.error_log = self.error_log[-max_entries:]

    def export_error_log(self, filename: str) -> bool:
        """Export error log to file."""
        try:
            import json
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.error_log, f, indent=2)
            return True
        except Exception as e:
            print(f"Failed to export error log: {e}")
            return False


# Global instance for easy access
error_service = ErrorService()


# Convenience functions for backward compatibility
def handle_rpc_error(response: Dict[str, Any], operation: str = "RPC call") -> bool:
    """Handle RPC errors (convenience function)."""
    return error_service.handle_rpc_error(response, operation)


def handle_connection_error(operation: str = "Connection") -> None:
    """Handle connection errors (convenience function)."""
    error_service.handle_connection_error(operation)


def handle_config_error() -> None:
    """Handle configuration errors (convenience function)."""
    error_service.handle_config_error()


def handle_critical_error(operation: str, error: Exception) -> None:
    """Handle critical errors (convenience function)."""
    error_service.handle_critical_error(operation, error)
