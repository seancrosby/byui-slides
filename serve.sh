#!/bin/bash

# Configuration
DIST_DIR="dist"
DEFAULT_PORT=8080
PORT=${1:-$DEFAULT_PORT}

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "Error: $DIST_DIR directory not found. Run ./build.sh first."
    exit 1
fi

# Ensure PORT is a number
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: Port must be a number. Received: $PORT"
    echo "Usage: $0 [port]"
    exit 1
fi

# Determine the command to use for serving
if command -v npx &> /dev/null; then
    echo "Starting local server using npx serve on http://localhost:$PORT..."
    npx -y serve -l "$PORT" "$DIST_DIR"
elif command -v python3 &> /dev/null; then
    echo "Starting local server using python3 http.server on http://localhost:$PORT..."
    python3 -m http.server "$PORT" --directory "$DIST_DIR"
elif command -v marp &> /dev/null; then
    echo "Starting Marp server on http://localhost:$PORT..."
    # Note: Marp server is best for .md files, but can serve the directory
    marp --server "$DIST_DIR" --html --port "$PORT"
else
    echo "Error: Neither 'npx', 'python3', nor 'marp-cli' found."
    exit 1
fi
