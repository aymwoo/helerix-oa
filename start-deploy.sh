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
if ! node -v &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js version: $NODE_VERSION"

# Check npm
if ! npm -v &> /dev/null; then
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

# Check for certificates
USE_HTTPS=false
if [ -f "./certs/key.pem" ] && [ -f "./certs/cert.pem" ]; then
    USE_HTTPS=true
    echo -e "${GREEN}✓${NC} Certificates found, enabling HTTPS"
else
    echo -e "${YELLOW}⚠️  Certificates not found in ./certs/, falling back to HTTP${NC}"
fi

# Build if needed
if [ "$FORCE_BUILD" = true ] || [ ! -f ".next/BUILD_ID" ]; then
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

# Set protocol and check certificates
PROTOCOL="https"
USE_HTTPS=false

if [ -f "./certs/key.pem" ] && [ -f "./certs/cert.pem" ]; then
    USE_HTTPS=true
    echo -e "${GREEN}✓${NC} SSL certificates found"
else
    echo -e "${YELLOW}⚠️  SSL certificates not found in ./certs/${NC}"
    echo -e "${YELLOW}   Defaulting to HTTP in server output${NC}"
    PROTOCOL="http"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Helerix OA Production Server${NC}"
echo -e "${GREEN}  URL: ${PROTOCOL}://$HOST:$PORT${NC}"

if [ "$PROTOCOL" = "https" ]; then
    echo -e "${YELLOW}  (Note: Next.js 'start' runs on HTTP locally.)${NC}"
    echo -e "${YELLOW}  (Use Nginx as reverse proxy to terminate SSL at this URL)${NC}"
fi

echo -e "${GREEN}  Database: ./data/helerix.db${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

# Start the production server
# 'next start' only supports HTTP. HTTPS must be handled by a reverse proxy (e.g. Nginx/Caddy).
exec npx next start -H "$HOST" -p "$PORT"
