"""Startup script with auto port detection."""
import socket
import os
import uvicorn


def find_available_port(start_port: int, max_attempts: int = 20) -> int:
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))
                return port
            except OSError:
                print(f"Port {port} is in use, trying {port + 1}...")
    raise RuntimeError(f"No available port found between {start_port} and {start_port + max_attempts - 1}")


if __name__ == "__main__":
    preferred = int(os.environ.get("PORT", "8000"))
    port = find_available_port(preferred)

    if port != preferred:
        print(f"Port {preferred} was unavailable. Using port {port} instead.")

    print(f"Starting optimization engine on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port)
