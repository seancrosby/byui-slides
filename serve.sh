#!/bin/bash

# Configuration
DIST_DIR="dist"
PORT=8080

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "Error: $DIST_DIR directory not found. Run ./build.sh first."
    exit 1
fi

# Determine the command to use for serving
if command -v marp &> /dev/null; then
    echo "Starting Marp server on http://localhost:$PORT..."
    marp --html --server "$DIST_DIR"
elif command -v npx &> /dev/null; then
    echo "Starting local server using npx serve on http://localhost:$PORT..."
    npx serve -l "$PORT" "$DIST_DIR"
else
    echo "Error: Neither 'marp-cli' nor 'npx' (for 'serve') found."
    echo "Please install marp-cli: npm install -g @marp-team/marp-cli"
    exit 1
fi
