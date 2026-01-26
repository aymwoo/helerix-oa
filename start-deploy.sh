#!/bin/bash

# Helerix OA - Production Deployment Script
# Usage: ./start-deploy.sh [options]
#   Options:
#     --build    Build before starting (default: skip if .next exists)
#     --port     Specify port (default: 3000)
#     --host     Specify host (default: 0.0.0.0)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PORT=${PORT:-3000}
HOST=${HOST:-0.0.0.0}
FORCE_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║       🚀 Helerix OA Deployment             ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install --production=false
fi

# Create data directory if not exists
if [ ! -d "data" ]; then
    echo -e "${YELLOW}📁 Creating data directory...${NC}"
    mkdir -p data
fi

# Build if needed
if [ "$FORCE_BUILD" = true ] || [ ! -d ".next" ]; then
    echo -e "${YELLOW}🔨 Building application...${NC}"
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Build completed successfully"
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Using existing build (use --build to rebuild)"
fi

# Export environment variables
export PORT=$PORT
export HOSTNAME=$HOST

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Helerix OA Server${NC}"
echo -e "${GREEN}  URL: http://$HOST:$PORT${NC}"
echo -e "${GREEN}  Database: ./data/helerix.db${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

# Start the production server
exec npm run start
