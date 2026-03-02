#!/usr/bin/env python3
"""
Simple web server to serve the Bitcoin blockchain dashboard
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Add backend to path for shared constants
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from constants import DASHBOARD_PORT  # pyright: ignore[reportMissingImports]

def start_server(port=None):
    """Start the web server"""
    if port is None:
        port = DASHBOARD_PORT
    # Change to the chain-monitor directory (two levels up from frontend)
    os.chdir(Path(__file__).parent.parent)

    # Create a custom handler that serves files from the current directory
    class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        """Custom HTTP request handler with CORS support."""
        def end_headers(self):
            # Add CORS headers to allow local file access
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()

    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            httpd.serve_forever()

    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Please free it up and try again.")
            print(f"   Kill process: sudo lsof -ti:{port} | xargs kill -9")
        else:
            print(f"❌ Error starting server: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    start_server()
