#!/bin/bash

# AvatarHumanCapital DigitalOcean Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment to DigitalOcean..."

# Configuration
APP_NAME="avatarhc"
DOCKER_IMAGE="avatarhc-app"
CONTAINER_NAME="avatarhc-container"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with your environment variables"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build -t $DOCKER_IMAGE:latest .
echo -e "${GREEN}✓ Docker image built${NC}"

echo -e "${YELLOW}Step 3: Stopping existing container (if any)...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✓ Old container removed${NC}"

echo -e "${YELLOW}Step 4: Starting new container...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  $DOCKER_IMAGE:latest

echo -e "${GREEN}✓ Container started${NC}"

echo -e "${YELLOW}Step 5: Checking container health...${NC}"
sleep 5
if docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✓ Container is running${NC}"
    echo ""
    echo "📊 Container Status:"
    docker ps | grep $CONTAINER_NAME
    echo ""
    echo "📝 Recent Logs:"
    docker logs --tail 20 $CONTAINER_NAME
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🌐 Application should be available at: http://localhost:5000"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:      docker logs -f $CONTAINER_NAME"
    echo "  Stop app:       docker stop $CONTAINER_NAME"
    echo "  Restart app:    docker restart $CONTAINER_NAME"
    echo "  Remove app:     docker rm -f $CONTAINER_NAME"
else
    echo -e "${RED}❌ Container failed to start${NC}"
    echo "Checking logs..."
    docker logs $CONTAINER_NAME
    exit 1
fi
