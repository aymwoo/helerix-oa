#!/bin/bash

# Helerix OA Development Start Script

echo "╔════════════════════════════════════════════╗"
echo "║       🛠️  Helerix OA Development Mode       ║"
echo "╚════════════════════════════════════════════╝"

# Check Node.js
if ! node -v &> /dev/null; then
    echo "Error: Node.js is not found or not working."
    echo "Current PATH: $PATH"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Ensure data directory exists
if [ ! -d "data" ]; then
    mkdir -p data
    echo "✓ Created data directory"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  Starting Development Server (HTTPS)..."
echo "  The app will be available at https://0.0.0.0:3000"
echo "  (Use your LAN IP for other devices)"
echo "  Edit files to see changes instantly."
echo "════════════════════════════════════════════"
echo ""

# Start Next.js in development mode
# Using exec to replace the shell process with the next process
exec npm run dev
