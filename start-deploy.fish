#!/usr/bin/env fish

# Helerix OA - Production Deployment Script (Fish Shell)
# Usage: ./start-deploy.fish [options]
#   Options:
#     --build    Build before starting (default: skip if .next exists)
#     --port     Specify port (default: 3000)
#     --host     Specify host (default: 0.0.0.0)

# Default values
set -q PORT; or set PORT 3000
set -q HOST; or set HOST "0.0.0.0"
set FORCE_BUILD false

# Parse arguments
set -l i 1
while test $i -le (count $argv)
    switch $argv[$i]
        case --build
            set FORCE_BUILD true
        case --port
            set i (math $i + 1)
            set PORT $argv[$i]
        case --host
            set i (math $i + 1)
            set HOST $argv[$i]
        case '*'
            set_color red
            echo "Unknown option: $argv[$i]"
            set_color normal
            exit 1
    end
    set i (math $i + 1)
end

# Colors
set_color blue
echo "╔════════════════════════════════════════════╗"
echo "║       🚀 Helerix OA Deployment             ║"
echo "╚════════════════════════════════════════════╝"
set_color normal

# Get script directory and cd to it
set SCRIPT_DIR (dirname (status filename))
cd $SCRIPT_DIR

# Check Node.js
if not command -v node &>/dev/null
    set_color red
    echo "❌ Node.js is not installed. Please install Node.js first."
    set_color normal
    exit 1
end

set NODE_VERSION (node -v)
set_color green; echo -n "✓"; set_color normal
echo " Node.js version: $NODE_VERSION"

# Check npm
if not command -v npm &>/dev/null
    set_color red
    echo "❌ npm is not installed."
    set_color normal
    exit 1
end

# Install dependencies if node_modules doesn't exist
if not test -d "node_modules"
    set_color yellow
    echo "📦 Installing dependencies..."
    set_color normal
    npm install --production=false
end

# Create data directory if not exists
if not test -d "data"
    set_color yellow
    echo "📁 Creating data directory..."
    set_color normal
    mkdir -p data
end

# Build if needed
if test "$FORCE_BUILD" = true; or not test -d ".next"
    set_color yellow
    echo "🔨 Building application..."
    set_color normal
    
    npm run build
    
    if test $status -eq 0
        set_color green; echo -n "✓"; set_color normal
        echo " Build completed successfully"
    else
        set_color red
        echo "❌ Build failed"
        set_color normal
        exit 1
    end
else
    set_color green; echo -n "✓"; set_color normal
    echo " Using existing build (use --build to rebuild)"
end

# Export environment variables
set -gx PORT $PORT
set -gx HOSTNAME $HOST

echo ""
set_color green
echo "════════════════════════════════════════════"
echo "  Starting Helerix OA Server"
echo "  URL: http://$HOST:$PORT"
echo "  Database: ./data/helerix.db"
echo "════════════════════════════════════════════"
set_color normal
echo ""

# Start the production server
exec npm run start
